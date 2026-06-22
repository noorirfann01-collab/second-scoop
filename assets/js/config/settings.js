/* =====================================================================
   SECOND SCOOP — GLOBAL SETTINGS
   ---------------------------------------------------------------------
   Edit anything in this file to change site-wide behaviour.
   No need to touch any HTML.
   ===================================================================== */

window.SS_SETTINGS = {
  brand: {
    name: "Second Scoop",
    tagline: "The First Scoop Is Never Enough.",
    email: "hello@secondscoop.co",
    instagram: "secondscoopco",
    instagramUrl: "https://instagram.com/secondscoopco",
    whatsappPakistan: "+92 300 0000000",
    whatsappToronto: "+1 416 000 0000",
  },

  /* ---- GOOGLE SHEETS ORDER LOGGING -------------------------------
     Paste the Web App URL you get from deploying the Apps Script
     (see SETUP_GUIDE.md). Leave blank to disable live syncing —
     orders will still be saved locally so nothing breaks.            */
  googleSheets: {
    webhookUrl: "https://script.google.com/macros/s/AKfycbz32ZTJcpkke_og4W5H5AOVqUEY0T2U5uXx79JxNr7sGH3tgWsHgMyFuC67OsNPulQL/exec",
    enabled: true,  // set false to skip the network call entirely
    // Optional secure server endpoint (Netlify Function). If set, orders are
    // sent here so the total is recomputed server-side (blocks price tampering)
    // and the webhook URL stays secret. e.g. "/.netlify/functions/place-order"
    orderEndpoint: "",
  },

  /* ---- ADMIN -------------------------------------------------------
     Light gate for the dashboard. IMPORTANT: on a static site this code
     is visible in the page source, so it is NOT a real security wall —
     it only keeps casual visitors out. What actually protects you is that
     the backend can't publish to your live site or read your orders
     without the GitHub token + dashboard read key, which live ONLY in
     your own browser and are never in these files. Change this anyway,
     and don't reuse it elsewhere.                                      */
  admin: {
    passcode: "ss-" + "lhr" + "-change-me-2026",
  },

  /* ---- ORDER NUMBER FORMAT ----------------------------------------
     Prefix + date + random. e.g. SS-260609-4821                      */
  order: {
    prefix: "SS",
  },

  /* ---- FEATURE FLAGS ---------------------------------------------- */
  features: {
    search: true,
    filtering: true,
    bestSellerBadges: true,
    recentlySoldNotifications: true,
    inventoryCounters: true,
    countdownTimers: true,
    instagramFeed: true,
    reviews: true,
    discountCodes: true,   // future-ready (see promos below)
    giftCards: false,      // future-ready scaffold
  },

  /* ---- DISCOUNT CODES (future-ready) ------------------------------
     type: "percent" | "fixed". value in % or in the cart currency.   */
  promos: [
    // { code: "SCOOP10", type: "percent", value: 10, active: false },
  ],

  /* ---- SOCIAL PROOF: recently-sold ticker -------------------------
     Purely cosmetic craving-builder shown on shop pages.             */
  // First names only — the city shown is always the visitor's current region
  // (Lahore), so it never claims orders from a city you don't serve.
  recentlySold: ["Ayesha", "Zoya", "Hamza", "Sara", "Daniyal", "Maryam", "Bilal", "Hana", "Fatima", "Usman"],
};
