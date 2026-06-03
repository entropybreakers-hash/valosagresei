/* =========================================================================
   Valóság Résein — kliens-oldali konfiguráció
   Itt állítsd be a Worker címét és az árat. Más fájlt nem kell módosítani.
   ========================================================================= */
window.VR_CONFIG = {
  // A Cloudflare Worker publikus címe (lásd README). Pl.:
  // "https://valosagresei-shop.<felhasznalonev>.workers.dev"
  // vagy saját aldomain: "https://shop.valosagresei.com"
  WORKER_URL: "https://valosagresei-shop.example.workers.dev",

  // Megjelenített ár — CSAK a kirakathoz. A tényleges összeget a Stripe
  // ár (Price) határozza meg a Workerben, ezt ott állítsd (README).
  PRICE_LABEL: "4 990 Ft",

  // Az ebook címe — több helyen használjuk.
  BOOK_TITLE: "Valóság Résein",
};
