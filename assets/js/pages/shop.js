/* =====================================================================
   SHOP PAGE — region-aware listing, search, category filter
   ===================================================================== */
(function () {
  SSApp.mount();

  const region = SS.getRegion();
  const r = SS.region();
  const products = SS.productsForRegion(region).map(p => SS.productView(p, region));

  // header copy
  document.getElementById("shop-eyebrow").textContent = `${r.flag} ${r.name} · ${r.currency}`;
  document.getElementById("shop-title").textContent = `Shop ${r.name}`;
  document.getElementById("shop-sub").textContent =
    `${r.delivery.etaText} Pickup available — ${r.pickup.address}.`;
  document.title = `Shop ${r.name} — Second Scoop`;

  // filters
  let activeCat = "all";
  let query = "";
  const cats = [{ id: "all", name: "All" }].concat(
    SS_CATEGORIES.filter(c => c.id !== "secret" && products.some(p => p.category === c.id))
  );
  const filtersEl = document.getElementById("shop-filters");
  if (SS_SETTINGS.features.filtering) {
    filtersEl.innerHTML = cats.map(c =>
      `<button class="ss-chip${c.id === "all" ? " is-active" : ""}" data-cat="${c.id}">${c.name}</button>`).join("");
    filtersEl.addEventListener("click", e => {
      const b = e.target.closest("[data-cat]"); if (!b) return;
      activeCat = b.getAttribute("data-cat");
      filtersEl.querySelectorAll(".ss-chip").forEach(c => c.classList.toggle("is-active", c === b));
      render();
    });
  }

  const searchEl = document.getElementById("shop-search");
  if (SS_SETTINGS.features.search) {
    searchEl.addEventListener("input", () => { query = searchEl.value.toLowerCase().trim(); render(); });
  } else { searchEl.parentNode.style.display = "none"; }

  function render() {
    const list = products.filter(p => {
      const okCat = activeCat === "all" || p.category === activeCat;
      const okQ = !query || p.name.toLowerCase().includes(query) ||
                  p.description.toLowerCase().includes(query) ||
                  SS.categoryName(p.category).toLowerCase().includes(query);
      return okCat && okQ;
    });
    // sort: buyable first, then featured, then by badge
    list.sort((a, b) => (b.buyable - a.buyable) || (b.featured - a.featured));
    const grid = document.getElementById("shop-grid");
    const empty = document.getElementById("shop-empty");
    grid.innerHTML = list.map(p => SSApp.productCard(p)).join("");
    empty.style.display = list.length ? "none" : "block";
  }
  render();
})();
