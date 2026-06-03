/* =========================================================================
   Valóság Rései — Cloudflare Worker (kassza + biztonságos letöltés)

   Végpontok:
     POST /api/checkout            → Stripe Checkout munkamenet létrehozása
     GET  /api/download?session_id → fizetés ellenőrzése, aláírt letöltő-link
     GET  /api/file?token=…        → a PDF kiszolgálása R2-ből, ha a token él

   Biztonság:
     - A /api/download CSAK akkor ad linket, ha a Stripe szerint a munkamenet
       ki van fizetve (payment_status === "paid").
     - A kapott link egy HMAC-aláírt, rövid életű (alapból 15 perc) tokent
       tartalmaz. Lejárat után érvénytelen, és nem hamisítható a titok nélkül.
     - A PDF privát R2 bucketben van, közvetlenül soha nem elérhető.

   Szükséges kötések / titkok (lásd wrangler.toml + README):
     BOOK_BUCKET (R2), STRIPE_SECRET_KEY, STRIPE_PRICE_ID, DOWNLOAD_SECRET,
     ALLOWED_ORIGIN, SITE_URL, EBOOK_KEY, EBOOK_FILENAME
   ========================================================================= */

const LINK_TTL_SECONDS = 15 * 60; // a letöltő-link élettartama

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    // CORS előellenőrzés
    if (request.method === "OPTIONS") {
      return cors(env, new Response(null, { status: 204 }));
    }

    try {
      if (pathname === "/api/checkout" && request.method === "POST") {
        return cors(env, await handleCheckout(env));
      }
      if (pathname === "/api/download" && request.method === "GET") {
        return cors(env, await handleDownload(request, env, url));
      }
      if (pathname === "/api/file" && request.method === "GET") {
        // A fájl-letöltésnél nem kell CORS — közvetlen böngésző-navigáció.
        return await handleFile(env, url);
      }
      return cors(env, json({ error: "not_found" }, 404));
    } catch (err) {
      console.error("worker error", err && err.stack ? err.stack : err);
      return cors(env, json({ error: "server_error" }, 500));
    }
  },
};

/* ----------------------------- /api/checkout ---------------------------- */
async function handleCheckout(env) {
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("line_items[0][price]", env.STRIPE_PRICE_ID);
  body.set("line_items[0][quantity]", "1");
  body.set("success_url", `${env.SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`);
  body.set("cancel_url", `${env.SITE_URL}/cancel.html`);
  // E-mailes nyugta + későbbi e-mailes kézbesítéshez hasznos:
  body.set("billing_address_collection", "auto");

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("stripe checkout error", data);
    return json({ error: "stripe_error" }, 502);
  }
  return json({ url: data.url });
}

/* ----------------------------- /api/download ---------------------------- */
async function handleDownload(request, env, url) {
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) return json({ error: "missing_session" }, 400);

  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } }
  );
  const session = await res.json();
  if (!res.ok) {
    console.error("stripe retrieve error", session);
    return json({ error: "stripe_error" }, 502);
  }

  if (session.payment_status !== "paid") {
    return json({ error: "not_paid" }, 403);
  }

  const token = await makeToken(env, LINK_TTL_SECONDS);
  const origin = new URL(request.url).origin;
  return json({ url: `${origin}/api/file?token=${encodeURIComponent(token)}` });
}

/* ------------------------------- /api/file ------------------------------ */
async function handleFile(env, url) {
  const token = url.searchParams.get("token");
  if (!token || !(await verifyToken(env, token))) {
    return new Response("A letöltési link lejárt vagy érvénytelen.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const object = await env.BOOK_BUCKET.get(env.EBOOK_KEY);
  if (!object) {
    return new Response("Az ebook jelenleg nem elérhető.", { status: 404 });
  }

  const filename = env.EBOOK_FILENAME || "valosag-resei.pdf";
  return new Response(object.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/* ------------------------- HMAC token segédfüggvények -------------------- */
async function makeToken(env, ttlSeconds) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = await hmac(env.DOWNLOAD_SECRET, String(exp));
  return `${exp}.${sig}`;
}

async function verifyToken(env, token) {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Math.floor(Date.now() / 1000)) {
    return false; // lejárt
  }
  const expected = await hmac(env.DOWNLOAD_SECRET, exp);
  return timingSafeEqual(sig, expected);
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const buf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ------------------------------- válaszok ------------------------------- */
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function cors(env, res) {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", env.ALLOWED_ORIGIN || "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Vary", "Origin");
  return new Response(res.body, { status: res.status, headers });
}
