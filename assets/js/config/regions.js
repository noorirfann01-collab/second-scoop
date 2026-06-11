/* Second Scoop — regions.js
   Exported from the Backend on 12/06/2026, 03:33:02.
   Replace the matching file in assets/js/config/ to publish. */

window.SS_REGIONS = {
  "pakistan": {
    "id": "pakistan",
    "name": "Pakistan",
    "flag": "🇵🇰",
    "currency": "PKR",
    "currencySymbol": "Rs",
    "currencyPosition": "before",
    "locale": "en-PK",
    "announcement": {
      "enabled": true,
      "text": "Lahore pre-orders are OPEN — pre-orders close Thursday at midnight.",
      "style": "preorder"
    },
    "delivery": {
      "available": true,
      "fee": 600,
      "freeOver": 0,
      "etaText": "Delivery time 2–3 days",
      "cities": [
        "Lahore"
      ],
      "notes": "Delivered chilled in insulated packaging."
    },
    "pickup": {
      "available": true,
      "address": "Second Scoop Studio, Gulberg III, Lahore",
      "hours": "Daily 2pm – 10pm",
      "notes": "We'll text you when your order is ready for pickup."
    },
    "contact": {
      "whatsapp": "+92 3332403900",
      "email": "pk@secondscoop.co"
    },
    "hidden": false
  },
  "toronto": {
    "id": "toronto",
    "name": "Toronto",
    "flag": "🇨🇦",
    "currency": "CAD",
    "currencySymbol": "$",
    "currencyPosition": "before",
    "locale": "en-CA",
    "announcement": {
      "enabled": false,
      "text": "GTA weekend drop is LIVE — order by Friday 6pm for Saturday delivery.",
      "style": "available"
    },
    "delivery": {
      "available": true,
      "fee": 7,
      "freeOver": 60,
      "etaText": "Weekend delivery across the GTA.",
      "cities": [
        "Toronto",
        "Mississauga",
        "Scarborough",
        "North York",
        "Brampton"
      ],
      "notes": "Delivered cold. Keep refrigerated on arrival."
    },
    "pickup": {
      "available": true,
      "address": "Second Scoop — Pickup Point, Downtown Toronto",
      "hours": "Fri–Sun 12pm – 8pm",
      "notes": "Pickup window details sent by text after you order."
    },
    "contact": {
      "whatsapp": "+1 416 000 0000",
      "email": "to@secondscoop.co"
    },
    "hidden": true
  }
};

window.SS_DEFAULT_REGION = "pakistan";
