/* =====================================================================
   SECOND SCOOP — REGION CONFIG
   ---------------------------------------------------------------------
   Two independent storefronts. Edit pricing currency, delivery fees,
   pickup info, delivery info and the announcement bar per region here.
   ===================================================================== */

window.SS_REGIONS = {
  pakistan: {
    id: "pakistan",
    name: "Pakistan",
    flag: "🇵🇰",
    currency: "PKR",
    currencySymbol: "Rs",
    currencyPosition: "before",        // "Rs 1,200"
    locale: "en-PK",

    // Shown in the announcement bar at the top of every page.
    announcement: {
      enabled: true,
      text: "Nationwide pre-orders are OPEN — pre-orders close Thursday at midnight.",
      style: "preorder",               // available | preorder | closing | sold-out | coming-soon
    },

    delivery: {
      available: true,
      fee: 250,                        // flat delivery fee in PKR
      freeOver: 5000,                  // free delivery over this subtotal (0 = never)
      etaText: "Same-day in Lahore, 2–3 days nationwide.",
      cities: ["Lahore", "Karachi", "Islamabad", "Rawalpindi"],
      notes: "Delivered chilled in insulated packaging.",
    },

    pickup: {
      available: true,
      address: "Second Scoop Studio, Gulberg III, Lahore",
      hours: "Daily 2pm – 10pm",
      notes: "We'll text you when your order is ready for pickup.",
    },

    contact: {
      whatsapp: "+92 300 0000000",
      email: "pk@secondscoop.co",
    },
  },

  toronto: {
    id: "toronto",
    name: "Toronto",
    flag: "🇨🇦",
    currency: "CAD",
    currencySymbol: "$",
    currencyPosition: "before",        // "$14.00"
    locale: "en-CA",

    announcement: {
      enabled: true,
      text: "GTA weekend drop is LIVE — order by Friday 6pm for Saturday delivery.",
      style: "available",
    },

    delivery: {
      available: true,
      fee: 7,
      freeOver: 60,
      etaText: "Weekend delivery across the GTA.",
      cities: ["Toronto", "Mississauga", "Scarborough", "North York", "Brampton"],
      notes: "Delivered cold. Keep refrigerated on arrival.",
    },

    pickup: {
      available: true,
      address: "Second Scoop — Pickup Point, Downtown Toronto",
      hours: "Fri–Sun 12pm – 8pm",
      notes: "Pickup window details sent by text after you order.",
    },

    contact: {
      whatsapp: "+1 416 000 0000",
      email: "to@secondscoop.co",
    },
  },
};

window.SS_DEFAULT_REGION = "pakistan";
