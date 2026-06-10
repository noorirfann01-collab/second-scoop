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
    instagram: "secondscoop",
    instagramUrl: "https://instagram.com/secondscoop",
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
  },

  /* ---- ADMIN -------------------------------------------------------
     Simple gate for the dashboard. Change this passcode.             */
  admin: {
    passcode: "scoop-admin-2026",
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
  recentlySold: [
    "Ayesha in Lahore", "Bilal in Karachi", "Sara in Toronto",
    "Hamza in Islamabad", "Maya in Mississauga", "Zoya in Lahore",
    "Daniyal in Karachi", "Priya in Scarborough",
  ],
};
