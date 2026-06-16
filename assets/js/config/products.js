/* Second Scoop — products.js
   Exported from the Backend on 17/06/2026, 03:57:19.
   Replace the matching file in assets/js/config/ to publish. */

window.SS_CATEGORIES = [
  {
    "id": "scoopie",
    "name": "The OG Scoopie"
  },
  {
    "id": "chunkies",
    "name": "Chunkies"
  },
  {
    "id": "doughiginals",
    "name": "The Doughiginals"
  },
  {
    "id": "secret",
    "name": "Secret Scoops"
  }
];

window.SS_PRODUCTS = [
  {
    "id": "og-scoopie",
    "name": "The OG Scoopie",
    "category": "scoopie",
    "tagline": "The cookie you were never supposed to stop eating.",
    "description": "A super soft, gooey, scoopable cookie baked in a tin and built to be eaten warm with a spoon.",
    "longDescription": "This is the one. A molten-centred cookie baked low and slow in its own tin so the middle stays impossibly gooey. Microwave it for 15 seconds, grab a spoon, and go straight in. Crisp edges, a warm pull-apart middle, and pools of melting chocolate in every scoop. There's a reason the first scoop is never enough.",
    "images": [
      "552a571d-95d8-44ec-821d-e0ec4a47c7e9-mqa4qdfx.png"
    ],
    "badge": "best-seller",
    "featured": true,
    "hero": true,
    "secret": false,
    "hidden": false,
    "reviews": {
      "rating": 0,
      "count": 0
    },
    "regions": {
      "pakistan": {
        "status": "available",
        "price": 850,
        "inventory": 60,
        "deliveryNotes": "Best eaten warm — microwave 15-30s before serving."
      }
    }
  },
  {
    "id": "chunkie-choc-chip",
    "name": "The Classic Chunkie — Chocolate Chip",
    "category": "chunkies",
    "tagline": "Thick. Soft-centred. Loaded.",
    "description": "Our bakery-style flagship cookie: thick, soft in the middle, and packed wall-to-wall with chocolate.",
    "longDescription": "A proper bakery-style Chunkie — thick-cut, soft-centred and stacked with melting chocolate in every bite. Crisp at the edge, soft and chewy through the middle.",
    "images": [
      "f93f77a6-358b-49b9-89b6-daf8bdd5fb33-mqa4s3c2.png"
    ],
    "badge": "best-seller",
    "featured": true,
    "hero": false,
    "secret": false,
    "hidden": false,
    "reviews": {
      "rating": 0,
      "count": 0
    },
    "regions": {
      "pakistan": {
        "status": "preorder",
        "price": 450,
        "inventory": 80,
        "deliveryNotes": "",
        "sizes": [
          {
            "label": "1 cookie",
            "price": 450
          },
          {
            "label": "4 Cookies",
            "price": 1700
          },
          {
            "label": "6 Cookies",
            "price": 2550
          }
        ]
      }
    }
  },
  {
    "id": "chunkie-seasonal",
    "name": "Chunkie — Seasonal Drop",
    "category": "chunkies",
    "tagline": "Here for a good time, not a long time.",
    "description": "A rotating limited-edition Chunkie. When it's gone, it's gone.",
    "longDescription": "Our test kitchen's current obsession, released in tiny batches. The flavour rotates with the season and never sticks around long. Follow @secondscoop so you don't miss the next one.",
    "images": [
      "chunkies.jpg"
    ],
    "badge": "limited",
    "featured": false,
    "secret": false,
    "hidden": true,
    "reviews": {
      "rating": 4.9,
      "count": 76
    },
    "regions": {
      "pakistan": {
        "status": "coming-soon",
        "price": 1100,
        "inventory": 0,
        "deliveryNotes": "Next drop announced soon."
      },
      "toronto": {
        "status": "closing",
        "price": 13,
        "inventory": 12,
        "deliveryNotes": "Final batch of the season."
      }
    }
  },
  {
    "id": "doughiginal-classic",
    "name": "The Doughiginal — Classic Chocolate Chip",
    "category": "doughiginals",
    "tagline": "Egg-free. Safe to eat raw. Dangerously good.",
    "description": "Our signature edible cookie dough tub. Egg-free, heat-treated flour, ready to eat by the spoon.",
    "longDescription": "The original tub that started the dough obsession. Made egg-free with heat-treated flour so it's completely safe to eat raw - made with real vanilla beans, and loaded with Callebaut chocolate. Eat it straight from the tub. Leave at room temperature for 15-20 mins, or dig in chilled.",
    "images": [
      "5e01e517-9a0f-4b02-a645-500bdd0fa61f-mqa4rjbw.png"
    ],
    "badge": "best-seller",
    "featured": true,
    "hero": false,
    "secret": false,
    "hidden": false,
    "reviews": {
      "rating": 0,
      "count": 0
    },
    "regions": {
      "pakistan": {
        "status": "preorder",
        "price": 1600,
        "inventory": 70,
        "deliveryNotes": "Keep refrigerated.",
        "sizes": [
          {
            "label": "200g",
            "price": 1600
          },
          {
            "label": "500g",
            "price": 3100
          }
        ]
      }
    }
  },
  {
    "id": "doughiginal-brownie-batter",
    "name": "The Doughiginal — Brownie Batter",
    "category": "doughiginals",
    "tagline": "All the batter. None of the guilt.",
    "description": "Deep, fudgy brownie-batter edible cookie dough. Egg-free and safe to eat raw.",
    "longDescription": "For the brownie-batter scrapers. Deep cocoa, fudgy texture and chocolate chunks throughout — egg-free and safe to eat raw, straight from the tub.",
    "images": [
      "doughiginal.jpg"
    ],
    "badge": "new",
    "featured": false,
    "secret": false,
    "hidden": true,
    "reviews": {
      "rating": 4.8,
      "count": 118
    },
    "regions": {
      "pakistan": {
        "status": "available",
        "price": 1150,
        "inventory": 45,
        "deliveryNotes": "Keep refrigerated."
      },
      "toronto": {
        "status": "available",
        "price": 13.5,
        "inventory": 38,
        "deliveryNotes": "Keep refrigerated."
      }
    }
  },
  {
    "id": "doughiginal-milk-cookies",
    "name": "The Doughiginal — Milk & Cookies",
    "category": "doughiginals",
    "tagline": "Cookies, in your cookie dough.",
    "description": "Vanilla milk dough folded with crushed cookie pieces. Egg-free and safe to eat raw.",
    "longDescription": "A creamy vanilla 'milk' dough folded with crunchy crushed cookie pieces — like dunking cookies in milk, in tub form. Egg-free and safe to eat raw.",
    "images": [
      "doughiginal.jpg"
    ],
    "badge": null,
    "featured": false,
    "secret": false,
    "hidden": true,
    "reviews": {
      "rating": 4.7,
      "count": 89
    },
    "regions": {
      "pakistan": {
        "status": "available",
        "price": 1150,
        "inventory": 40,
        "deliveryNotes": "Keep refrigerated."
      },
      "toronto": {
        "status": "available",
        "price": 13.5,
        "inventory": 30,
        "deliveryNotes": "Keep refrigerated."
      }
    }
  },
  {
    "id": "secret-salted-caramel-scoopie",
    "name": "Salted Caramel Stuffed Scoopie",
    "category": "secret",
    "tagline": "A Vault exclusive. Molten caramel, sea salt, no rules.",
    "description": "The OG Scoopie, stuffed with a molten salted-caramel core. Vault members only.",
    "longDescription": "Our gooey signature Scoopie, hiding a molten salted-caramel centre that erupts the moment you break in. Finished with flaky sea salt. Only ever sold through The Vault, in tiny numbers.",
    "images": [
      "af5dc175-bc11-4198-a75f-c33d31f8d6a6-mqa4sww9.png"
    ],
    "badge": "limited",
    "featured": false,
    "hero": false,
    "secret": true,
    "hidden": false,
    "reviews": {
      "rating": 0,
      "count": 0
    },
    "regions": {
      "pakistan": {
        "status": "available",
        "price": 1050,
        "inventory": 25,
        "deliveryNotes": "Vault exclusive — limited batch."
      }
    }
  },
  {
    "id": "secret-churro-scoopie",
    "name": "Stuffed Churro Scoopie",
    "category": "secret",
    "tagline": "Cinnamon-sugar chaos. Vault exclusive.",
    "description": "A churro-spiced Scoopie rolled in cinnamon sugar with a dulce-style core. Vault members only.",
    "longDescription": "Warm cinnamon-sugar Scoopie with a soft dulce-style centre — churros and cookies in one tin. A rotating Vault exclusive that disappears fast.",
    "images": [
      "og-scoopie.jpg"
    ],
    "badge": "limited",
    "featured": false,
    "secret": true,
    "hidden": true,
    "reviews": {
      "rating": 5,
      "count": 33
    },
    "regions": {
      "pakistan": {
        "status": "available",
        "price": 1500,
        "inventory": 20,
        "deliveryNotes": "Vault exclusive — limited batch."
      },
      "toronto": {
        "status": "coming-soon",
        "price": 17,
        "inventory": 0,
        "deliveryNotes": "Dropping in the Vault soon."
      }
    }
  }
];
