/* =====================================================================
   BUNDLES PAGE — pre-set bundles & boxes for the current region
   ===================================================================== */
(function () {
  SSApp.mount();

  const region = SS.getRegion();
  const r = SS.region();
  const bundles = SS.productsForRegion(region)
    .map(p => SS.productView(p, region))
    .filter(p => p && p.bundle)
    .sort((a, b) => (b.buyable - a.buyable) || (b.featured - a.featured));

  const C = SS.getContent();
  const copy = (C.pages && C.pages.bundles) || {};
  const eyebrow = document.getElementById("bundles-eyebrow");
  const title = document.getElementById("bundles-title");
  const sub = document.getElementById("bundles-sub");
  if (eyebrow && copy.eyebrow) eyebrow.textContent = copy.eyebrow;
  if (title && copy.title) title.textContent = copy.title;
  sub.textContent = copy.sub || `Curated boxes for ${r.name} — set price, ready to share. ${r.delivery.etaText}`;
  document.title = "Bundles & Boxes — Second Scoop";

  const grid = document.getElementById("bundles-grid");
  const empty = document.getElementById("bundles-empty");
  grid.innerHTML = bundles.map(p => SSApp.productCard(p)).join("");
  empty.style.display = bundles.length ? "none" : "block";
  if (SSApp.initTilt) SSApp.initTilt(grid);
})();
