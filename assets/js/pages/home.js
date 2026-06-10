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

  // --- instagram tiles ---
  const ig = document.getElementById("ig-grid");
  if (ig && SS_SETTINGS.features.instagramFeed) {
    const emojis = ["🍪", "🥄", "🍫", "🧁", "✨", "🔥"];
    ig.innerHTML = Array.from({ length: 6 }).map((_, i) =>
      `<a class="ss-ig-tile" href="${SS_SETTINGS.brand.instagramUrl}" target="_blank" rel="noopener">
        <img src="assets/img/ig-${i + 1}.jpg" alt="" onerror="this.remove()">${emojis[i]}
      </a>`).join("");
  }

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
