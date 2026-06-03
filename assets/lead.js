/* =========================================================================
   Valóság Rései — feliratkozás (lead magnet: ingyenes első fejezet)
   - Validálja az e-mailt.
   - Ha a configban van LEAD_ENDPOINT, oda POST-olja az e-mailt (JSON).
   - Ha nincs (most "csak a látvány"), demó-módban mutatja a köszönő-állapotot.
   A valós bekötés egyetlen helyen történik: assets/config.js → LEAD_ENDPOINT.
   ========================================================================= */
(function () {
  "use strict";

  var cfg = window.VR_CONFIG || {};
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function showSuccess(email) {
    var form = document.querySelector("[data-signup]");
    var success = document.getElementById("signup-success");
    if (!success) return;

    // Ha van azonnali letöltő-link, mutassuk a gombot
    var dl = document.getElementById("free-download");
    if (dl) {
      if (cfg.FREE_CHAPTER_URL) {
        dl.href = cfg.FREE_CHAPTER_URL;
        dl.classList.remove("hidden");
      } else {
        dl.classList.add("hidden");
      }
    }
    if (form) form.classList.add("hidden");
    var note = document.querySelector(".form-note");
    if (note) note.classList.add("hidden");
    success.classList.remove("hidden");
    success.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handle(form) {
    var input = form.querySelector('input[type="email"]');
    var errorEl = form.querySelector(".form-error");
    var btn = form.querySelector("button");
    var email = (input.value || "").trim();

    if (errorEl) errorEl.textContent = "";

    if (!EMAIL_RE.test(email)) {
      if (errorEl) errorEl.textContent = "Kérlek adj meg egy érvényes e-mail címet.";
      input.focus();
      return;
    }

    var original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Küldés…";

    // Demó-mód: nincs bekötött végpont
    if (!cfg.LEAD_ENDPOINT) {
      setTimeout(function () {
        btn.disabled = false;
        btn.textContent = original;
        showSuccess(email);
      }, 600);
      return;
    }

    // Éles mód: POST a beállított végpontra
    fetch(cfg.LEAD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email }),
    })
      .then(function (r) {
        if (!r.ok) throw new Error("subscribe " + r.status);
        return r.json().catch(function () { return {}; });
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = original;
        showSuccess(email);
      })
      .catch(function (err) {
        console.error(err);
        btn.disabled = false;
        btn.textContent = original;
        if (errorEl)
          errorEl.textContent =
            "Most nem sikerült elküldeni. Kérlek próbáld újra kicsit később.";
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.querySelector("[data-signup]");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        handle(form);
      });
    }
    // Ár-felirat (ha van az oldalon) — a fő main.js nélkül is működjön
    if (cfg.PRICE_LABEL) {
      document.querySelectorAll("[data-price]").forEach(function (el) {
        el.textContent = cfg.PRICE_LABEL;
      });
    }
  });
})();
