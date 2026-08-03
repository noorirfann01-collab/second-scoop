/* =====================================================================
   REVIEWS PAGE — all customer reviews, aggregate rating, filter + form
   ===================================================================== */
(function () {
  SSApp.mount({ recentlySold: false });
  const region = SS.getRegion();
  const grid = document.getElementById("rev-grid");
  const summaryEl = document.getElementById("rev-summary");
  const filtersEl = document.getElementById("rev-filters");
  const subEl = document.getElementById("rev-sub");
  document.title = "Reviews — Second Scoop";

  const productNames = SS.productsForRegion(region).map(p => p.name);
  let all = [];
  let activeProduct = "all";

  // leave-a-review form
  (function () {
    const toggle = document.getElementById("rev-toggle");
    const formWrap = document.getElementById("rev-form");
    if (!toggle || !formWrap || !window.SSReviews) return;
    toggle.onclick = () => {
      const open = formWrap.style.display === "none";
      formWrap.style.display = open ? "block" : "none";
      if (open && !formWrap.dataset.ready) {
        SSReviews.renderForm(formWrap, { products: productNames, region: region, onDone: load });
        formWrap.dataset.ready = "1";
        formWrap.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
  })();

  function stars(n) { n = Math.round(n) || 0; return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n); }

  function renderSummary(list) {
    const count = list.length;
    const avg = count ? (list.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count) : 0;
    subEl.textContent = count ? `${count} review${count > 1 ? "s" : ""} and counting — the first scoop is never enough.` : "Be the first to leave a review. 🍪";
    if (!count) { summaryEl.innerHTML = ""; return; }
    summaryEl.innerHTML = `
      <div class="ss-rev-avg">
        <div class="ss-rev-avg-num">${avg.toFixed(1)}</div>
        <div><div class="ss-rev-avg-stars">${stars(avg)}</div>
        <div class="ss-rev-avg-count">from ${count} scooper review${count > 1 ? "s" : ""}</div></div>
      </div>`;
  }

  function renderFilters(list) {
    const products = Array.from(new Set(list.map(r => (r.product || "").trim()).filter(Boolean))).sort();
    if (!products.length) { filtersEl.innerHTML = ""; return; }
    const cats = [["all", "All reviews"]].concat(products.map(p => [p, p]));
    filtersEl.innerHTML = cats.map(([id, label]) =>
      `<button class="ss-chip${id === activeProduct ? " is-active" : ""}" data-p="${String(id).replace(/"/g, "&quot;")}">${label}</button>`).join("");
    filtersEl.onclick = e => {
      const b = e.target.closest("[data-p]"); if (!b) return;
      activeProduct = b.getAttribute("data-p");
      filtersEl.querySelectorAll(".ss-chip").forEach(c => c.classList.toggle("is-active", c === b));
      renderGrid();
    };
  }

  function renderGrid() {
    let list = all.slice();
    if (activeProduct !== "all") list = list.filter(r => (r.product || "").toLowerCase() === activeProduct.toLowerCase());
    list.sort((a, b) => new Date(b.ts) - new Date(a.ts));
    if (!list.length) { grid.innerHTML = `<p class="ss-empty" style="grid-column:1/-1">No reviews here yet — be the first. 🍪</p>`; return; }
    grid.innerHTML = list.map(r => SSReviews.reviewCard(r)).join("");
  }

  function load() {
    if (!window.SSReviews || !SSReviews.enabled()) {
      grid.innerHTML = `<p class="ss-empty" style="grid-column:1/-1">Reviews aren't connected yet.</p>`;
      subEl.textContent = ""; return;
    }
    grid.innerHTML = `<p class="ss-seed">Loading reviews…</p>`;
    SSReviews.fetchPublic().then(list => {
      all = list || [];
      renderSummary(all);
      renderFilters(all);
      renderGrid();
    }).catch(() => { grid.innerHTML = `<p class="ss-empty" style="grid-column:1/-1">Couldn't load reviews right now.</p>`; });
  }
  load();
})();
