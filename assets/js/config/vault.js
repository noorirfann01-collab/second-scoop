/* =====================================================================
   SECOND SCOOP — THE VAULT CONFIG
   ---------------------------------------------------------------------
   Secret codes unlock secret products. Codes are region-specific.

   HOW IT WORKS
   ------------
   • A customer enters a code on /vault.html
   • If it matches a code below for the CURRENT region, the matching
     secret products are revealed and the unlock is remembered locally.
   • Wrong code → "Not this scoop. Try again."

   TO ADD A SECRET DROP
   --------------------
   1. Add the product in products.js with  secret: true
   2. Add an entry below linking a code → that product id(s)
   3. Codes are case-insensitive and trimmed.

   You can have multiple codes, each revealing one or more products,
   and different codes per region.
   ===================================================================== */

window.SS_VAULT = {
  // Message shown when a code does not match.
  wrongCodeMessage: "Not this scoop. Try again.",

  // Teaser copy shown on the locked screen.
  teaser: {
    title: "THE VAULT",
    subtitle: "Secret scoops. Invite-only flavours. Enter the code.",
    hint: "Codes drop to our list and on @secondscoopco.",
  },

  /* Region-specific codes.
     code      → the secret phrase (case-insensitive)
     products  → array of product ids (must exist & be secret in products.js)
     label     → optional friendly name for the drop                       */
  codes: {
    pakistan: [
      { code: "FIRSTSCOOP", products: ["secret-salted-caramel-scoopie"], label: "Founder's Drop" },
      { code: "CHURRO",     products: ["secret-churro-scoopie"],          label: "Churro Drop"   },
      { code: "VAULT",      products: ["secret-salted-caramel-scoopie", "secret-churro-scoopie"], label: "Full Vault" },
    ],
    toronto: [
      { code: "FIRSTSCOOP", products: ["secret-salted-caramel-scoopie"], label: "Founder's Drop" },
      { code: "VAULT6IX",   products: ["secret-salted-caramel-scoopie", "secret-churro-scoopie"], label: "The 6ix Vault" },
    ],
  },
};
