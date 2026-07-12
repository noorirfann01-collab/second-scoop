/* Second Scoop — products.js
   Exported from the Backend on 13/07/2026, 03:11:58.
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
    "id": "bundles",
    "name": "Bundles & Boxes"
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
    "optionLabel": "Size",
    "bundle": false,
    "includes": [],
    "tagline": "The cookie you were never supposed to stop eating.",
    "description": "A super soft, gooey, scoopable cookie baked in a tin and built to be eaten warm with a spoon.",
    "longDescription": "This is the one. A molten-centred cookie baked low and slow in its own tin so the middle stays impossibly gooey. Microwave it for 15 seconds, grab a spoon, and go straight in. Crisp edges, a warm pull-apart middle, and pools of melting chocolate in every scoop. There's a reason the first scoop is never enough.",
    "images": [
      "chatgpt-image-jul-12-2026-09-34-00-pm-mri0mxuh.jpg"
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
        "status": "closing",
        "price": 850,
        "inventory": 5,
        "deliveryNotes": "Best eaten warm — microwave 15-30s before serving.",
        "sizes": [
          {
            "label": "200g",
            "price": 850
          },
          {
            "label": "700g",
            "price": 2700
          }
        ]
      }
    }
  },
  {
    "id": "chunkie-choc-chip",
    "name": "The Classic Chunkie — Chocolate Chip",
    "category": "chunkies",
    "bundle": false,
    "includes": [],
    "tagline": "Thick. Soft-centred. Loaded.",
    "description": "Our bakery-style flagship cookie: thick, soft in the middle, and packed wall-to-wall with chocolate.",
    "longDescription": "A proper bakery-style Chunkie — thick-cut, soft-centred and stacked with melting chocolate in every bite. Crisp at the edge, soft and chewy through the middle.",
    "images": [
      "chatgpt-image-jul-13-2026-01-48-13-am-mri9mokg.jpg"
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
        "status": "closing",
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
    "bundle": false,
    "includes": [],
    "tagline": "Egg-free. Safe to eat raw. Dangerously good.",
    "description": "Our signature edible cookie dough tub. Egg-free, heat-treated flour, ready to eat by the spoon.",
    "longDescription": "The original tub that started the dough obsession. Made egg-free with heat-treated flour so it's completely safe to eat raw - made with real vanilla beans, and loaded with Callebaut chocolate. Eat it straight from the tub. Leave at room temperature for 15-20 mins, or dig in chilled.",
    "images": [
      "chatgpt-image-jul-12-2026-09-27-30-pm-mri0os9l.jpg"
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
        "status": "closing",
        "price": 1650,
        "inventory": 5,
        "deliveryNotes": "Keep refrigerated.",
        "sizes": [
          {
            "label": "200g",
            "price": 1650
          },
          {
            "label": "500g",
            "price": 3200
          }
        ]
      }
    }
  },
  {
    "id": "doughiginal-brownie-batter",
    "name": "The Doughiginal — Brownie Batter",
    "category": "doughiginals",
    "optionLabel": "Size",
    "bundle": false,
    "includes": [],
    "tagline": "All the batter. None of the guilt.",
    "description": "Deep, fudgy brownie-batter edible cookie dough. Egg-free and safe to eat raw.",
    "longDescription": "For the brownie-batter scrapers. Deep cocoa, fudgy texture and chocolate chunks throughout — egg-free and safe to eat raw, straight from the tub.",
    "images": [
      "chatgpt-image-jul-13-2026-02-55-49-am-mrichph2.jpg"
    ],
    "badge": "new",
    "featured": false,
    "hero": false,
    "secret": false,
    "hidden": false,
    "reviews": {
      "rating": 5,
      "count": 1
    },
    "regions": {
      "pakistan": {
        "status": "coming-soon",
        "price": 1650,
        "inventory": 10,
        "deliveryNotes": "Keep refrigerated.",
        "sizes": [
          {
            "label": "200g",
            "price": 1650
          },
          {
            "label": "500g",
            "price": 3200
          }
        ]
      }
    }
  },
  {
    "id": "doughiginal-milk-cookies",
    "name": "The Doughiginal — Milk & Cookies",
    "category": "doughiginals",
    "optionLabel": "Size",
    "bundle": false,
    "includes": [],
    "tagline": "Cookies, in your cookie dough.",
    "description": "Vanilla milk dough folded with crushed cookie pieces. Egg-free and safe to eat raw.",
    "longDescription": "A creamy vanilla 'milk' dough folded with crunchy crushed cookie pieces — like dunking cookies in milk, in tub form. Egg-free and safe to eat raw.",
    "images": [
      "chatgpt-image-jul-13-2026-03-05-24-am-mricjg1y.jpg"
    ],
    "badge": null,
    "featured": false,
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
        "price": 1650,
        "inventory": 10,
        "deliveryNotes": "Keep refrigerated.",
        "sizes": [
          {
            "label": "200g",
            "price": 1650
          },
          {
            "label": "500g",
            "price": 3200
          }
        ]
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
  },
  {
    "id": "the-second-scoop-sampler",
    "name": "The Second Scoop Sampler",
    "category": "bundles",
    "bundle": true,
    "includes": [
      "1x OG Scoopies",
      "1x 200g Doughiginal tub",
      "1x Chunky cookie"
    ],
    "tagline": "Your first bite into the Second Scoop world.",
    "description": "A little bit of everything: Scoopies, dough, and a Chunky. Perfect for first-timers.",
    "longDescription": "Not sure where to start? This is the box that introduces you to the full Second Scoop experience. You get our warm, gooey Scoopies, a mini Doughiginal tub for spooning straight from the fridge, and a Chunky cookie for the classic cookie craving. It’s made for first-timers, indecisive dessert lovers, and anyone who wants to try the best of Second Scoop in one box.",
    "images": [
      "chatgpt-image-jul-13-2026-12-31-37-am-mri9k91z.jpg"
    ],
    "badge": null,
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
        "status": "coming-soon",
        "price": 2950,
        "inventory": 0,
        "deliveryNotes": ""
      }
    }
  },
  {
    "id": "the-night-in-box",
    "name": "The Night-In Box",
    "category": "bundles",
    "bundle": true,
    "includes": [
      "1x 700g OG Scoopie Tin",
      "1x 500g Doughiginal tub",
      "Optional add-on: chocolate/ salted caramel drizzle"
    ],
    "tagline": "Dessert plans, sorted.",
    "description": "The ultimate movie night, girls’ night, or “I deserve this” dessert box.",
    "longDescription": "The Night-In Box is made for staying in, getting cozy, and turning dessert into the main event. With warm-ready Scoopies and a full Doughiginal tub, this box is perfect for sharing with friends, serving after dinner, or keeping all to yourself for a proper Second Scoop night. Warm the Scoopies, grab a spoon, add ice cream if you want, and make it a whole moment.",
    "images": [
      "chatgpt-image-jul-13-2026-01-40-04-am-mri9crtx.jpg"
    ],
    "badge": null,
    "featured": false,
    "hero": false,
    "secret": false,
    "hidden": false,
    "reviews": {
      "rating": 0,
      "count": 0
    },
    "regions": {
      "pakistan": {
        "status": "coming-soon",
        "price": 5900,
        "inventory": 0,
        "deliveryNotes": ""
      }
    }
  },
  {
    "id": "the-dough-dealer-box",
    "name": "The Dough Dealer Box",
    "category": "bundles",
    "bundle": true,
    "includes": [
      "1x 200g Chocolate Chip Doughiginal tub",
      "1x 200g Brownie Batter Doughiginal tub",
      "1x 200g Milk & Cookies Doughiginal tub"
    ],
    "tagline": "For people who eat cookie dough like it’s a personality trait.",
    "description": "Three Doughiginal tubs. Three flavours. One very serious cookie dough situation.",
    "longDescription": "This one is for the edible cookie dough obsessed. The Dough Dealer Box brings together three Doughiginal tubs so you can spoon, share, gift, or hide them in the back of the fridge for later. It’s the easiest way to try multiple flavours and find your favourite Second Scoop tub.",
    "images": [
      "chatgpt-image-jul-13-2026-01-45-26-am-mri9jjb4.jpg"
    ],
    "badge": null,
    "featured": false,
    "hero": false,
    "secret": false,
    "hidden": false,
    "reviews": {
      "rating": 0,
      "count": 0
    },
    "regions": {
      "pakistan": {
        "status": "coming-soon",
        "price": 4950,
        "inventory": 0,
        "deliveryNotes": ""
      }
    }
  }
];
