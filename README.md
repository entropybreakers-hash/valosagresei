# Valóság Rései — ebook oldal

Spirituális ebook eladó oldal: szép, statikus landing oldal (GitHub Pages) +
Stripe fizetés + **automatikus, biztonságos letöltés** fizetés után (Cloudflare
Worker, lejáró aláírt linkkel). A PDF privát tárolóban (R2) marad, fizetés
nélkül senki nem fér hozzá.

```
valosagresei/
├── index.html          ← landing oldal (magyar, brand-dizájn)
├── success.html        ← fizetés után: lekéri a letöltő-linket a Workertől
├── cancel.html         ← megszakított fizetés
├── aszf.html           ← ÁSZF (kitöltendő)
├── adatkezeles.html    ← Adatkezelési tájékoztató (kitöltendő)
├── CNAME               ← saját domain (valosagresei.com)
├── assets/
│   ├── styles.css      ← dizájn-rendszer
│   ├── config.js       ← ⚙️ ITT állítod a Worker címét + árat
│   ├── main.js         ← kassza-indítás
│   └── cover-placeholder.svg
└── worker/             ← Cloudflare Worker (a „háttér”)
    ├── src/index.js    ← checkout + fizetés-ellenőrzés + letöltés
    └── wrangler.toml   ← Worker konfiguráció
```

## Hogyan működik (a folyamat)

1. A látogató a landing oldalon a **„Megszerzem”** gombra kattint.
2. A böngésző szól a Workernek → a Worker létrehoz egy **Stripe Checkout**
   munkamenetet, és átirányít a Stripe biztonságos fizetőoldalára.
3. Sikeres fizetés után a Stripe visszairányít a `success.html`-re egy
   `session_id`-val.
4. A `success.html` megkérdezi a Workert: „ki van fizetve ez a munkamenet?”.
   A Worker a Stripe-tól **ellenőrzi**, és ha igen, ad egy **15 percig élő,
   aláírt letöltő-linket**.
5. A letöltő-link a Workeren keresztül szolgálja ki a PDF-et a privát R2
   bucketből. A link lejár, és nem hamisítható → nem osztható meg.

---

## Beállítás lépésről lépésre

### 0. Ami kell
- Stripe fiók (megvan ✅)
- Cloudflare fiók (ingyenes) — a Workerhez és az R2-höz
- A saját domain (pl. `valosagresei.com`)
- Node.js a gépeden (a Worker telepítéséhez)

### 1. Stripe — termék és ár
1. Stripe Dashboard → **Products** → *Add product*.
2. Név: „Valóság Rései – ebook”, ár: pl. **4990 HUF**, egyszeri fizetés.
3. Mentés után másold ki a **Price ID**-t (így néz ki: `price_123…`).
4. Developers → API keys → másold a **Secret key**-t (`sk_live_…` vagy
   teszteléshez `sk_test_…`).

### 2. Cloudflare R2 — a privát PDF tárolása
1. Cloudflare Dashboard → **R2** → *Create bucket*, név: `valosagresei-ebook`.
2. Töltsd fel a kész PDF-et **`valosag-resei.pdf`** néven (vagy állítsd át az
   `EBOOK_KEY`-t a `worker/wrangler.toml`-ban).
   > A bucket maradjon **privát** — ne adj neki nyilvános hozzáférést.

### 3. A Worker telepítése
A `worker/` mappában:

```bash
cd worker
npm install
npx wrangler login            # böngészőben bejelentkezés Cloudflare-be

# titkok beállítása (NEM kerülnek a repóba):
npx wrangler secret put STRIPE_SECRET_KEY    # beilleszted: sk_live_…
npx wrangler secret put STRIPE_PRICE_ID      # beilleszted: price_…
npx wrangler secret put DOWNLOAD_SECRET      # egy hosszú véletlen jelszó*

npx wrangler deploy
```

\* `DOWNLOAD_SECRET`: bármilyen hosszú véletlen szöveg, pl. generálj egyet:
`openssl rand -hex 32`. Ez írja alá a letöltő-linkeket.

A `deploy` végén kapsz egy URL-t, pl.
`https://valosagresei-shop.<felhasznalonev>.workers.dev`.

A `worker/wrangler.toml`-ban a `[vars]` alatt állítsd be a saját domained:
`SITE_URL` és `ALLOWED_ORIGIN` = `https://valosagresei.com` (éles), majd
`npx wrangler deploy` újra.

### 4. A statikus oldal összekötése a Workerrel
Nyisd meg `assets/config.js`-t, és írd be a Worker URL-jét:

```js
window.VR_CONFIG = {
  WORKER_URL: "https://valosagresei-shop.<felhasznalonev>.workers.dev",
  PRICE_LABEL: "4 990 Ft",
  BOOK_TITLE: "Valóság Rései",
};
```

### 5. GitHub Pages + domain
1. GitHub repo → **Settings → Pages** → Source: a `claude/zen-feynman-L1PM6`
   (vagy `main`, miután mergelted) branch, mappa: `/ (root)`.
2. A `CNAME` fájl már tartalmazza a `valosagresei.com`-ot — a domain
   DNS-ében állíts be egy `CNAME`/`A` rekordot a GitHub Pages felé
   (GitHub útmutató szerint).

### 6. Teszt
- Először **teszt módban** (`sk_test_…` + Stripe teszt-kártya `4242 4242
  4242 4242`). Kattints a „Megszerzem”-re → fizetés → vissza a `success.html`-re
  → a letöltésnek el kell indulnia.
- Ha működik, válts éles kulcsokra (`sk_live_…`, éles `price_…`) és deployolj
  újra.

---

## Még hiányzik / TODO (Bettina)
- [ ] A valódi **ebook PDF** feltöltése R2-be
- [ ] Valódi **borító** (`assets/cover.jpg`) az SVG placeholder helyett
- [ ] A landing oldal **szövegei** (fejezetek, leírás) — a `<!-- TODO -->`-knál
- [ ] **ÁSZF** és **Adatkezelési** oldalak kitöltése valós cégadatokkal
- [ ] (Opcionális) E-mailes kézbesítés is — ha kell, ezt utólag hozzáadjuk a
      Workerhez (Stripe webhook + e-mail szolgáltató).

## Költség
Kis forgalomnál mindez **ingyenes**: GitHub Pages ingyenes, a Cloudflare Worker
és az R2 is bőven a díjmentes kvótán belül van. Stripe csak a tranzakciók után
von le jutalékot.
