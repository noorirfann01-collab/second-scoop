/* =====================================================================
   PRODUCT DETAIL PAGE
   ===================================================================== */
(function () {
  SSApp.mount();

  const region = SS.getRegion();
  const id = new URLSearchParams(location.search).get("id");
  const base = SS.getProduct(id);
  const root = document.getElementById("pdp-root");

  // Secret products only render here if unlocked in this region.
  const isSecretLocked = base && base.secret && !SS.isUnlocked(id, region);
  const pv = base ? SS.productView(base, region) : null;

  if (!base || !pv || isSecretLocked) {
    root.innerHTML = `<div class="ss-empty" style="padding:90px 20px">
      <h2>This scoop is hiding.</h2>
      <p>It might be sold out, in another region, or locked in The Vault.</p>
      <a class="ss-btn" href="shop.html?region=${region}">Back to shop</a>
      ${base && base.secret ? `<a class="ss-btn ss-btn--ghost" href="vault.html" style="margin-left:8px">Enter The Vault</a>` : ""}
    </div>`;
    return;
  }

  document.title = `${pv.name} — Second Scoop`;
  const img = pv.image ? SS.imgSrc(pv.image) : "";
  const imgEl = img
    ? `<img src="${img}" alt="${pv.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
       <div class="ss-card-fallback" style="display:none">${pv.name}</div>`
    : `<div class="ss-card-fallback" style="display:flex">${pv.name}</div>`;

  const reviews = pv.reviews && pv.reviews.count
    ? `<div class="ss-card-rating" style="font-size:1rem;margin:.4em 0">★ ${pv.reviews.rating} <em>· ${pv.reviews.count} reviews</em></div>` : "";

  const buyBlock = pv.buyable ? `
      <div class="ss-pdp-buy">
        <div class="ss-qty" id="pdp-qty">
          <button data-step="-1" aria-label="Decrease">−</button>
          <span id="pdp-qnum">1</span>
          <button data-step="1" aria-label="Increase">+</button>
        </div>
        <button class="ss-btn ss-btn--lg" id="pdp-add">Add to Cart · <span id="pdp-add-price"></span></button>
      </div>`
    : `<div class="ss-pdp-buy"><button class="ss-btn ss-btn--ghost ss-btn--lg" disabled>${pv.status === "coming-soon" ? "Coming Soon" : "Sold Out"}</button></div>`;

  root.innerHTML = `
    <div class="ss-breadcrumb" style="padding-top:20px">
      <a href="index.html">Home</a> / <a href="shop.html?region=${region}">Shop</a> / ${pv.name}
    </div>
    <div class="ss-pdp">
      <div class="ss-pdp-media">${imgEl}
        ${SSApp.topBadge(pv)}${SSApp.statusBadge(pv)}
      </div>
      <div class="ss-pdp-info">
        <div class="ss-card-cat">${SS.categoryName(pv.category)}${pv.secret ? " · 🔓 Vault Unlocked" : ""}</div>
        <h1>${pv.name}</h1>
        <p class="ss-pdp-tag">${pv.tagline || ""}</p>
        ${reviews}
        <div class="ss-pdp-price">${SS.money(pv.price)}</div>
        <p class="ss-pdp-long">${pv.longDescription || pv.description}</p>
        ${buyBlock}
        ${pv.deliveryNotes ? `<div class="ss-pdp-notes">🥄 <span>${pv.deliveryNotes}</span></div>` : ""}
        <div class="ss-pdp-trust">
          <span>★ ${pv.reviews ? pv.reviews.rating : "4.9"} rated</span>
          <span>🚚 ${SS.region().delivery.etaText}</span>
          <span>📍 Pickup available</span>
        </div>
      </div>
    </div>`;

  // qty + add
  let qty = 1;
  function priceLabel() {
    const el = document.getElementById("pdp-add-price");
    if (el) el.textContent = SS.money(pv.price * qty);
  }
  const qwrap = document.getElementById("pdp-qty");
  if (qwrap) {
    qwrap.addEventListener("click", e => {
      const b = e.target.closest("[data-step]"); if (!b) return;
      qty = Math.max(1, Math.min((pv.inventory || 999), qty + Number(b.getAttribute("data-step"))));
      document.getElementById("pdp-qnum").textContent = qty;
      priceLabel();
    });
    priceLabel();
    document.getElementById("pdp-add").addEventListener("click", () => {
      if (SS.addToCart(pv.id, qty)) { SSApp.refreshCartCount(); SSApp.toast(`Added ${qty} × ${pv.name} 🍪`, "ok"); }
    });
  }

  // related
  const related = SS.productsForRegion(region)
    .map(p => SS.productView(p, region))
    .filter(p => p.id !== pv.id && p.category === pv.category)
    .concat(SS.productsForRegion(region).map(p => SS.productView(p, region)).filter(p => p.id !== pv.id && p.category !== pv.category))
    .slice(0, 4);
  document.getElementById("pdp-related").innerHTML = related.map(p => SSApp.productCard(p)).join("");

  // --- live reviews for this product ---
  (function () {
    if (!window.SSReviews || !SSReviews.enabled()) return;
    const sec = document.getElementById("pdp-reviews-sec");
    const listEl = document.getElementById("pdp-reviews-list");
    const formWrap = document.getElementById("pdp-review-form");
    const toggle = document.getElementById("pdp-review-toggle");
    sec.style.display = "block";
    document.getElementById("pdp-reviews-title").textContent = `What scoopers say about ${pv.name}`;
    toggle.onclick = () => {
      const open = formWrap.style.display === "none";
      formWrap.style.display = open ? "block" : "none";
      if (open && !formWrap.dataset.ready) {
        SSReviews.renderForm(formWrap, { product: pv.name, region: region, onDone: load });
        formWrap.dataset.ready = "1";
      }
    };
    function load() {
      SSReviews.fetchPublic().then(reviews => {
        const has = SSReviews.renderList(listEl, reviews, { product: pv.name, limit: 12,
          emptyHtml: `<p class="ss-empty" style="grid-column:1/-1">No reviews yet — be the first! 🍪</p>` });
      }).catch(() => { listEl.innerHTML = ""; });
    }
    load();
  })();
})();
