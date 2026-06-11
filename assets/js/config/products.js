/* =====================================================================
   SECOND SCOOP — PRODUCT CATALOG  (SINGLE SOURCE OF TRUTH)
   ---------------------------------------------------------------------
   This is the ONLY place products live. Every page reads from here.

   HOW TO MANAGE PRODUCTS
   ----------------------
   • ADD a product .......... copy a block, give it a new unique `id`.
   • REMOVE a product ....... delete its block (or set hidden:true).
   • HIDE a product ......... hidden: true
   • CHANGE price ........... edit regions.<region>.price
   • CHANGE description ..... edit `description` / `longDescription`
   • CHANGE images .......... edit `images` (filenames in /assets/img/)
   • AVAILABILITY ........... regions.<region>.status:
        "available" | "preorder" | "closing" | "sold-out" | "coming-soon"
   • MARK SOLD OUT .......... status: "sold-out"
   • MARK COMING SOON ....... status: "coming-soon"
   • FEATURE on homepage .... featured: true
   • SECRET (Vault only) .... secret: true  (also list it in vault.js)
   • BADGE .................. badge: "best-seller" | "limited" | "new" | null

   STATUS MEANINGS
   ----------------
     available    → buy now
     preorder     → buy now, fulfilled on the next drop
     closing      → preorder window closing soon
     sold-out     → cannot add to cart
     coming-soon  → teaser only, cannot add to cart

   CATEGORIES: "scoopie" | "chunkies" | "doughiginals" | "secret"
   ===================================================================== */

window.SS_CATEGORIES = [
  { id: "scoopie",      name: "The OG Scoopie" },
  { id: "chunkies",     name: "Chunkies" },
  { id: "doughiginals", name: "The Doughiginals" },
  { id: "secret",       name: "Secret Scoops" },
];

window.SS_PRODUCTS = [

  /* ============================ HERO ============================== */
  {
    id: "og-scoopie",
    name: "The OG Scoopie",
    category: "scoopie",
    tagline: "The cookie you were never supposed to stop eating.",
    description: "A super soft, gooey, scoopable cookie baked in a tin and built to be eaten warm with a spoon.",
    longDescription:
      "This is the one. A molten-centred cookie baked low and slow in its own tin so the middle stays impossibly gooey. " +
      "Microwave it for 15 seconds, grab a spoon, and go straight in. Crisp edges, a warm pull-apart middle, and pools of " +
      "melting chocolate in every scoop. There's a reason the first scoop is never enough.",
    images: ["og-scoopie.jpg"],
    badge: "best-seller",
    featured: true,
    hero: true,
    secret: false,
    hidden: false,
    reviews: { rating: 4.9, count: 318 },
    regions: {
      pakistan: { status: "preorder", price: 1200, inventory: 60, deliveryNotes: "Best eaten warm — microwave 15s before serving." },
      toronto:  { status: "available", price: 14,  inventory: 40, deliveryNotes: "Reheat 15s for the full gooey experience." },
    },
  },

  /* ========================== CHUNKIES =========================== */
  {
    id: "chunkie-choc-chip",
    name: "Chunkie — Chocolate Chip",
    category: "chunkies",
    tagline: "Thick. Soft-centred. Loaded.",
    description: "Our bakery-style flagship cookie: thick, soft in the middle, and packed wall-to-wall with chocolate.",
    longDescription:
      "A proper bakery-style Chunkie — thick-cut, soft-centred and stacked with melting chocolate in every bite. " +
      "Crisp at the edge, dense and chewy through the middle. Sold in a pack so you don't have to share (you can, but you won't want to).",
    images: ["chunkies.jpg"],
    badge: "best-seller",
    featured: true,
    secret: false,
    hidden: false,
    reviews: { rating: 4.8, count: 204 },
    regions: {
      pakistan: { status: "available", price: 900, inventory: 80, deliveryNotes: "Pack of 4." },
      toronto:  { status: "available", price: 12,  inventory: 55, deliveryNotes: "Pack of 4." },
    },
  },
  {
    id: "chunkie-seasonal",
    name: "Chunkie — Seasonal Drop",
    category: "chunkies",
    tagline: "Here for a good time, not a long time.",
    description: "A rotating limited-edition Chunkie. When it's gone, it's gone.",
    longDescription:
      "Our test kitchen's current obsession, released in tiny batches. The flavour rotates with the season and never sticks " +
      "around long. Follow @secondscoop so you don't miss the next one.",
    images: ["chunkies.jpg"],
    badge: "limited",
    featured: false,
    secret: false,
    hidden: false,
    reviews: { rating: 4.9, count: 76 },
    regions: {
      pakistan: { status: "coming-soon", price: 1100, inventory: 0, deliveryNotes: "Next drop announced soon." },
      toronto:  { status: "closing",     price: 13,   inventory: 12, deliveryNotes: "Final batch of the season." },
    },
  },

  /* ======================= THE DOUGHIGINALS ====================== */
  {
    id: "doughiginal-classic",
    name: "The Doughiginal — Classic Chocolate Chip",
    category: "doughiginals",
    tagline: "Egg-free. Safe to eat raw. Dangerously good.",
    description: "Our signature edible cookie dough tub. Egg-free, heat-treated flour, ready to eat by the spoon.",
    longDescription:
      "The original tub that started the dough obsession. Made egg-free with heat-treated flour so it's completely safe " +
      "to eat raw — rich, fudgy and loaded with chocolate chips. Eat it straight from the tub, chilled.",
    images: ["doughiginal.jpg"],
    badge: "best-seller",
    featured: true,
    secret: false,
    hidden: false,
    reviews: { rating: 4.9, count: 261 },
    regions: {
      pakistan: { status: "available", price: 1100, inventory: 70, deliveryNotes: "Keep refrigerated." },
      toronto:  { status: "available", price: 13,   inventory: 50, deliveryNotes: "Keep refrigerated." },
    },
  },
  {
    id: "doughiginal-brownie-batter",
    name: "The Doughiginal — Brownie Batter",
    category: "doughiginals",
    tagline: "All the batter. None of the guilt.",
    description: "Deep, fudgy brownie-batter edible cookie dough. Egg-free and safe to eat raw.",
    longDescription:
      "For the brownie-batter scrapers. Deep cocoa, fudgy texture and chocolate chunks throughout — egg-free and safe " +
      "to eat raw, straight from the tub.",
    images: ["doughiginal.jpg"],
    badge: "new",
    featured: false,
    secret: false,
    hidden: false,
    reviews: { rating: 4.8, count: 118 },
    regions: {
      pakistan: { status: "available", price: 1150, inventory: 45, deliveryNotes: "Keep refrigerated." },
      toronto:  { status: "available", price: 13.5, inventory: 38, deliveryNotes: "Keep refrigerated." },
    },
  },
  {
    id: "doughiginal-milk-cookies",
    name: "The Doughiginal — Milk & Cookies",
    category: "doughiginals",
    tagline: "Cookies, in your cookie dough.",
    description: "Vanilla milk dough folded with crushed cookie pieces. Egg-free and safe to eat raw.",
    longDescription:
      "A creamy vanilla 'milk' dough folded with crunchy crushed cookie pieces — like dunking cookies in milk, in tub form. " +
      "Egg-free and safe to eat raw.",
    images: ["doughiginal.jpg"],
    badge: null,
    featured: false,
    secret: false,
    hidden: false,
    reviews: { rating: 4.7, count: 89 },
    regions: {
      pakistan: { status: "available", price: 1150, inventory: 40, deliveryNotes: "Keep refrigerated." },
      toronto:  { status: "available", price: 13.5, inventory: 30, deliveryNotes: "Keep refrigerated." },
    },
  },

  /* ========================= SECRET SCOOPS ======================= */
  /* These never appear anywhere until unlocked in The Vault.
     Keep secret:true AND list the code in assets/js/config/vault.js  */
  {
    id: "secret-salted-caramel-scoopie",
    name: "Salted Caramel Stuffed Scoopie",
    category: "secret",
    tagline: "A Vault exclusive. Molten caramel, sea salt, no rules.",
    description: "The OG Scoopie, stuffed with a molten salted-caramel core. Vault members only.",
    longDescription:
      "Our gooey signature Scoopie, hiding a molten salted-caramel centre that erupts the moment you break in. " +
      "Finished with flaky sea salt. Only ever sold through The Vault, in tiny numbers.",
    images: ["og-scoopie.jpg"],
    badge: "limited",
    featured: false,
    secret: true,
    hidden: false,
    reviews: { rating: 5.0, count: 41 },
    regions: {
      pakistan: { status: "available", price: 1500, inventory: 25, deliveryNotes: "Vault exclusive — limited batch." },
      toronto:  { status: "available", price: 17,   inventory: 18, deliveryNotes: "Vault exclusive — limited batch." },
    },
  },
  {
    id: "secret-churro-scoopie",
    name: "Stuffed Churro Scoopie",
    category: "secret",
    tagline: "Cinnamon-sugar chaos. Vault exclusive.",
    description: "A churro-spiced Scoopie rolled in cinnamon sugar with a dulce-style core. Vault members only.",
    longDescription:
      "Warm cinnamon-sugar Scoopie with a soft dulce-style centre — churros and cookies in one tin. " +
      "A rotating Vault exclusive that disappears fast.",
    images: ["og-scoopie.jpg"],
    badge: "limited",
    featured: false,
    secret: true,
    hidden: false,
    reviews: { rating: 5.0, count: 33 },
    regions: {
      pakistan: { status: "available",   price: 1500, inventory: 20, deliveryNotes: "Vault exclusive — limited batch." },
      toronto:  { status: "coming-soon", price: 17,   inventory: 0,  deliveryNotes: "Dropping in the Vault soon." },
    },
  },

];
