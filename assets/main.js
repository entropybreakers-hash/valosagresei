/* =========================================================================
   Valóság Rései — kassza-indítás
   A "Megszerzem" gombra kattintva a Worker létrehoz egy Stripe Checkout
   munkamenetet, és átirányít a Stripe biztonságos fizetőoldalára.
   ========================================================================= */
(function () {
  "use strict";

  var cfg = window.VR_CONFIG || {};

  function startCheckout(btn) {
    var original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Átirányítás…";

    fetch(cfg.WORKER_URL.replace(/\/$/, "") + "/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(function (r) {
        if (!r.ok) throw new Error("checkout " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (data && data.url) {
          window.location.href = data.url;
        } else {
          throw new Error("nincs url");
        }
      })
      .catch(function (err) {
        console.error(err);
        btn.disabled = false;
        btn.textContent = original;
        alert(
          "Sajnos most nem sikerült elindítani a fizetést. Kérlek próbáld újra néhány másodperc múlva."
        );
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var buttons = document.querySelectorAll("[data-checkout]");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        startCheckout(btn);
      });
    });

    // Ár felirat behelyettesítése a configból
    if (cfg.PRICE_LABEL) {
      document.querySelectorAll("[data-price]").forEach(function (el) {
        el.textContent = cfg.PRICE_LABEL;
      });
    }
  });
})();
