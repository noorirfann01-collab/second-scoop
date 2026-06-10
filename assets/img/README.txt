SECOND SCOOP — IMAGE DROP-IN GUIDE
==================================

The site works out of the box with premium styled placeholders.
To use your REAL photos, just drop image files into THIS folder
(assets/img/) using the exact filenames below. No code changes needed.

PRODUCT PHOTOS (referenced in assets/js/config/products.js)
-----------------------------------------------------------
  og-scoopie.jpg      → The OG Scoopie (your tin/spoon shot)
  chunkies.jpg        → Chunkies (the stacked cookies shot)
  doughiginal.jpg     → The Doughiginals (the dough tub shot)

  Recommended: 1200 x 900px (4:3), JPG or WebP, under ~300KB each.
  To give a product more than one image, list extra filenames in its
  `images: [...]` array in products.js, e.g. ["og-scoopie.jpg","og-2.jpg"].

YOUR LOGO (optional — site uses a clean SVG logo by default)
------------------------------------------------------------
  logo-mark.png       → the SS scoop monogram
  logo-wordmark.png   → the "Second Scoop." wordmark
  Then open assets/js/app.js and set:  useImageLogo = true

INSTAGRAM TILES (optional)
--------------------------
  ig-1.jpg ... ig-6.jpg  → homepage Instagram strip
  (edit the list in assets/js/pages/home.js if you want different names)

That's it. Refresh the page and your photos appear everywhere
automatically — shop, homepage, product pages, cart and checkout.
