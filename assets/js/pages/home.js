/* =====================================================================
   HOMEPAGE — dynamic sections (region-aware)
   ===================================================================== */
(function () {
  SSApp.mount();

  // ---- apply editable copy from content config (Backend → Content) ----
  const C = SS.getContent();
  if (C.hero) {
    const wm = document.querySelector(".ss-hero-wordmark");
    if (wm && C.hero.showWordmark === false) wm.style.display = "none";
    const tag = document.getElementById("hero-tagline");
    if (tag && C.hero.tagline) tag.textContent = C.hero.tagline;
    const h1 = document.querySelector(".ss-hero-copy h1");
    if (h1 && C.hero.headline) h1.innerHTML = C.hero.headline;
    const sub = document.querySelector(".ss-hero-sub");
    if (sub && C.hero.sub) sub.innerHTML = C.hero.sub;
    const trust = document.querySelector(".ss-hero-trust");
    if (trust && Array.isArray(C.hero.trust)) trust.innerHTML = C.hero.trust.map(t => `<span>${t}</span>`).join("");
  }
  if (Array.isArray(C.howItWorks)) {
    const steps = document.querySelector(".ss-steps");
    if (steps) steps.innerHTML = C.howItWorks.map((s, i) =>
      `<div class="ss-step"><div class="ss-step-num">${i + 1}</div><h3>${s.title}</h3><p>${s.text}</p></div>`).join("");
  }

  const region = SS.getRegion();
  const all = SS.productsForRegion(region).map(p => SS.productView(p, region));

  // --- region selector cards ---
  const rc = document.getElementById("region-cards");
  if (rc) {
    rc.innerHTML = Object.values(SS_REGIONS).map(r => {
      const active = r.id === region;
      return `<a class="ss-region-card${active ? " is-active" : ""}" href="shop.html?region=${r.id}">
        <span class="ss-region-card-flag">${r.flag}</span>
        <div><strong>Shop ${r.name}</strong><span>${r.currency} · ${r.delivery.etaText}</span></div>
        <span class="ss-region-card-arrow">→</span>
      </a>`;
    }).join("");
  }

  // --- featured (OG hero first) ---
  const featured = all.filter(p => p.featured)
    .sort((a, b) => (b.hero ? 1 : 0) - (a.hero ? 1 : 0));
  renderGrid("featured-grid", featured.length ? featured : all.slice(0, 4), true);
  const fl = document.getElementById("featured-shoplink");
  if (fl) fl.href = `shop.html?region=${region}`;

  // --- best sellers ---
  const best = all.filter(p => p.badge === "best-seller");
  renderGrid("bestseller-grid", best.length ? best : all.slice(0, 3));

  // --- limited drops ---
  const limited = all.filter(p => p.badge === "limited" || p.status === "closing" || p.status === "coming-soon");
  renderGrid("limited-grid", limited.length ? limited : all.slice(-3));

  // --- countdown (next Thursday midnight) for limited drops ---
  startCountdown("drop-countdown");

  // --- photo carousel ---
  (function () {
    const g = (C.gallery) || {};
    const sec = document.getElementById("home-carousel-sec");
    const wrap = document.getElementById("home-carousel");
    if (!sec || !wrap || g.enabled === false) return;
    const imgs = (g.images || []).filter(Boolean);
    if (!imgs.length) return;                       // nothing to show → keep hidden
    sec.style.display = "block";
    if (g.eyebrow) document.getElementById("carousel-eyebrow").textContent = g.eyebrow;
    if (g.title) document.getElementById("carousel-title").textContent = g.title;
    wrap.innerHTML = `
      <div class="ss-carousel">
        <div class="ss-carousel-track">
          ${imgs.map(src => `<div class="ss-carousel-slide"><img src="${SS.imgSrc(src)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('ss-noimg');this.remove();this.parentNode.textContent='Second Scoop'"></div>`).join("")}
        </div>
        ${imgs.length > 1 ? `<button class="ss-carousel-arrow prev" aria-label="Previous">‹</button>
        <button class="ss-carousel-arrow next" aria-label="Next">›</button>
        <div class="ss-carousel-dots">${imgs.map((_, i) => `<span class="ss-carousel-dot${i === 0 ? " on" : ""}" data-i="${i}"></span>`).join("")}</div>` : ""}
      </div>`;
    const track = wrap.querySelector(".ss-carousel-track");
    const dots = wrap.querySelectorAll(".ss-carousel-dot");
    let idx = 0, timer = null;
    function go(i) {
      idx = (i + imgs.length) % imgs.length;
      track.style.transform = `translateX(-${idx * 100}%)`;
      dots.forEach((d, k) => d.classList.toggle("on", k === idx));
    }
    const prev = wrap.querySelector(".prev"), next = wrap.querySelector(".next");
    if (prev) prev.onclick = () => { go(idx - 1); restart(); };
    if (next) next.onclick = () => { go(idx + 1); restart(); };
    dots.forEach(d => d.onclick = () => { go(+d.getAttribute("data-i")); restart(); });
    function restart() { if (timer) clearInterval(timer); if (g.autoplay !== false && imgs.length > 1) timer = setInterval(() => go(idx + 1), 4500); }
    restart();
  })();

  // --- instagram tiles ---
  const ig = document.getElementById("ig-grid");
  if (ig && SS_SETTINGS.features.instagramFeed) {
    const emojis = ["🍪", "🥄", "🍫", "🧁", "✨", "🔥"];
    ig.innerHTML = Array.from({ length: 6 }).map((_, i) =>
      `<a class="ss-ig-tile" href="${SS_SETTINGS.brand.instagramUrl}" target="_blank" rel="noopener">
        <img src="assets/img/ig-${i + 1}.jpg" alt="" onerror="this.remove()">${emojis[i]}
      </a>`).join("");
  }

  // --- live customer reviews ---
  (function () {
    const list = document.getElementById("home-reviews-list");
    const formWrap = document.getElementById("home-review-form");
    const toggle = document.getElementById("home-review-toggle");
    if (!list || !window.SSReviews) return;
    const productNames = SS.productsForRegion(region).map(p => p.name);
    if (toggle && formWrap) {
      toggle.onclick = () => {
        const open = formWrap.style.display === "none";
        formWrap.style.display = open ? "block" : "none";
        if (open && !formWrap.dataset.ready) {
          SSReviews.renderForm(formWrap, { products: productNames, region: region, onDone: load });
          formWrap.dataset.ready = "1";
          formWrap.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      };
    }
    function load() {
      if (!SSReviews.enabled()) return;            // keep static fallback if not configured
      SSReviews.fetchPublic().then(reviews => {
        if (reviews && reviews.length) SSReviews.renderList(list, reviews, { limit: 9 });
      }).catch(() => {});
    }
    load();
  })();

  // --- signup ---
  const f = document.getElementById("home-signup");
  if (f) f.addEventListener("submit", e => {
    e.preventDefault();
    SS.addSignup({ name: f.name.value, email: f.email.value, phone: f.phone.value, source: "home" });
    f.reset();
    document.getElementById("home-signup-msg").textContent = "You're in. Watch your inbox for the next drop. 🍪";
  });

  function renderGrid(id, list, heroFirst) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!list.length) { el.innerHTML = `<p class="ss-empty">Nothing here yet — check back soon.</p>`; return; }
    el.innerHTML = list.map((p, i) => {
      // mark the OG Scoopie as a wide hero card in the featured grid
      if (heroFirst && i === 0) p = Object.assign({}, p, { hero: true });
      return SSApp.productCard(p);
    }).join("");
  }

  function startCountdown(id) {
    const el = document.getElementById(id);
    if (!el || !SS_SETTINGS.features.countdownTimers) return;
    function nextThu() {
      const d = new Date();
      const day = d.getDay();
      let add = (4 - day + 7) % 7; // Thursday = 4
      if (add === 0) add = 7;
      const t = new Date(d); t.setDate(d.getDate() + add); t.setHours(0, 0, 0, 0);
      return t;
    }
    const target = nextThu();
    function tick() {
      const diff = Math.max(0, target - new Date());
      const dd = Math.floor(diff / 86400000);
      const hh = Math.floor(diff % 86400000 / 3600000);
      const mm = Math.floor(diff % 3600000 / 60000);
      const ss = Math.floor(diff % 60000 / 1000);
      el.innerHTML = `<div class="ss-countdown">
        ${box(dd, "days")}${box(hh, "hrs")}${box(mm, "min")}${box(ss, "sec")}
      </div>`;
    }
    function box(n, l) { return `<div class="ss-cd-box"><b>${String(n).padStart(2, "0")}</b><span>${l}</span></div>`; }
    tick(); setInterval(tick, 1000);
  }
})();
