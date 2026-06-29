/* Second Scoop — regions.js
   Exported from the Backend on 29/06/2026, 14:38:06.
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
      "text": "Lahore pre-orders are OPEN - Deliveries will be available from Monday June 22, 2026",
      "style": "preorder"
    },
    "delivery": {
      "available": true,
      "fee": 200,
      "freeOver": 0,
      "etaText": "Delivery time 2–3 days",
      "cities": [
        "Lahore"
      ],
      "notes": "Delivered chilled in insulated packaging.",
      "zones": [
        {
          "name": "Gulberg",
          "fee": 600
        },
        {
          "name": "Lake City",
          "fee": 200
        },
        {
          "name": "DHA Ph 1-6",
          "fee": 500
        },
        {
          "name": "DHA Ph 8 - Paragon City",
          "fee": 750
        },
        {
          "name": "Cantt",
          "fee": 600
        }
      ]
    },
    "pickup": {
      "available": true,
      "address": "Lake City, Lahore",
      "hours": "Daily 2pm – 10pm",
      "notes": "We'll text you when your order is ready for pickup."
    },
    "contact": {
      "whatsapp": "+92 3332403900",
      "email": "-"
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
      "notes": "Delivered cold. Keep refrigerated on arrival.",
      "zones": []
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
