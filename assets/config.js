/* =========================================================================
   Valóság Rései — kliens-oldali konfiguráció
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
  BOOK_TITLE: "Valóság Rései",

  // --- Lead magnet (ingyenes első fejezet) ---
  // Ide jön majd a feliratkozást fogadó végpont. Amíg üres (""), az űrlap
  // csak demózik (nem küld sehova), de a köszönő-állapotot megmutatja.
  // Később pl.: WORKER_URL + "/api/subscribe" (MailerLite / saját Worker).
  LEAD_ENDPOINT: "",

  // Ha azonnali letöltést szeretnél a feliratkozás után, ide tedd az
  // ingyenes fejezet linkjét. Ha üres, csak "nézd meg a postafiókod" üzenet jön.
  FREE_CHAPTER_URL: "",
};
