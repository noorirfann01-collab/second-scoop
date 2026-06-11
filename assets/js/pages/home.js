/* =====================================================================
   HOMEPAGE — dynamic sections (region-aware)
   ===================================================================== */
(function () {
  SSApp.mount();

  // ---- apply editable copy from content config (Backend → Content) ----
  const C = SS.getContent();

  // (Editable text is applied globally by SSApp. Just point the IG link.)
  (function () {
    const ig = (C.brand && C.brand.instagramUrl) || (SS_SETTINGS.brand && SS_SETTINGS.brand.instagramUrl);
    if (ig) { const a = document.getElementById("ig-follow"); if (a) a.href = ig; }
  })();

  // ---- liquid morphing intro splash ----
  (function () {
    const intro = document.getElementById("ss-intro");
    if (!intro) return;
    const cfg = C.intro || {};
    const t1 = document.getElementById("ss-intro-t1"), t2 = document.getElementById("ss-intro-t2");
    function finish() { intro.classList.add("is-done"); document.body.style.overflow = ""; setTimeout(() => { if (intro.parentNode) intro.remove(); }, 800); }
    function kill() { document.body.style.overflow = ""; intro.remove(); }
    if (cfg.enabled === false || !t1 || !t2) { kill(); return; }
    if (cfg.oncePerSession !== false) { try { if (sessionStorage.getItem("ss_intro_seen")) { kill(); return; } sessionStorage.setItem("ss_intro_seen", "1"); } catch (e) {} }
    const words = (cfg.words && cfg.words.length) ? cfg.words.slice() : ["Warm.", "Gooey.", "Scoopable."];
    if (words.length < 2) words.push(words[0]);
    const logoEnding = cfg.logoEnding !== false;
    const logoWrap = document.getElementById("ss-intro-logo");
    const morphEl = document.getElementById("ss-intro-morph");
    if (logoWrap && cfg.logo) { const src = SS.imgSrc(cfg.logo); logoWrap.querySelectorAll("img").forEach(im => im.src = src); }
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.body.style.overflow = "hidden";
    intro.addEventListener("click", () => { cancelAnimationFrame(raf); finish(); });
    if (reduce) { t1.textContent = words[words.length - 1]; t1.style.opacity = "100%"; setTimeout(finish, 1000); return; }

    // SS logo plays as the final beat, then splits open to reveal the site
    function playLogoEnding() {
      t1.textContent = words[words.length - 1]; t1.style.opacity = "100%"; t1.style.filter = "none"; t2.style.opacity = "0%";
      setTimeout(() => {
        if (morphEl) morphEl.classList.add("is-hidden");
        if (logoWrap) logoWrap.classList.add("is-shown");
        setTimeout(() => { if (logoWrap) logoWrap.classList.add("is-split"); finish(); }, 820);
      }, 480);
    }

    const morphTime = 1.0, cooldownTime = 0.42;
    let idx = 0, morph = 0, cool = 0, transitions = 0, last = performance.now(), raf;
    function setStyles(frac) {
      t2.style.filter = `blur(${Math.min(8 / frac - 8, 100)}px)`; t2.style.opacity = `${Math.pow(frac, 0.4) * 100}%`;
      const inv = 1 - frac;
      t1.style.filter = `blur(${Math.min(8 / inv - 8, 100)}px)`; t1.style.opacity = `${Math.pow(inv, 0.4) * 100}%`;
      t1.textContent = words[idx % words.length]; t2.textContent = words[(idx + 1) % words.length];
    }
    function doMorph() { morph -= cool; cool = 0; let f = morph / morphTime; if (f > 1) { cool = cooldownTime; f = 1; } setStyles(f); if (f === 1) { idx++; transitions++; } }
    function doCool() { morph = 0; t2.style.filter = "none"; t2.style.opacity = "100%"; t1.style.filter = "none"; t1.style.opacity = "0%"; }
    function loop(now) {
      raf = requestAnimationFrame(loop);
      const dt = (now - last) / 1000; last = now; cool -= dt;
      if (transitions >= words.length - 1) {
        cancelAnimationFrame(raf);
        if (logoEnding) { playLogoEnding(); return; }
        t1.textContent = words[words.length - 1]; t1.style.opacity = "100%"; t1.style.filter = "none"; t2.style.opacity = "0%";
        setTimeout(finish, 650); return;
      }
      if (cool <= 0) doMorph(); else doCool();
    }
    raf = requestAnimationFrame(loop);
    setTimeout(() => { if (intro.isConnected && !intro.classList.contains("is-done")) { cancelAnimationFrame(raf); finish(); } }, 6500); // safety cap
  })();
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
    if (C.hero.image) {
      const hm = document.getElementById("hero-media"), himg = hm && hm.querySelector("img");
      if (himg) { himg.src = SS.imgSrc(C.hero.image); himg.style.display = ""; hm.classList.remove("ss-noimg"); }
    }
  }
  // ---- scroll-expand video hero ----
  (function () {
    const sec = document.getElementById("ss-xhero");
    if (!sec) return;
    const media = document.getElementById("xhero-media");
    const video = document.getElementById("xhero-video");
    const bg = document.getElementById("xhero-bg");
    const titles = document.getElementById("xhero-titles");
    const w1 = document.getElementById("xhero-w1"), w2 = document.getElementById("xhero-w2");
    const hint = document.getElementById("xhero-hint");
    const cta = document.getElementById("xhero-cta");
    // allow a custom hero video via content (Backend can set hero.video / hero.videoPoster)
    if (C.hero && C.hero.video && video) { video.querySelector("source").src = SS.imgSrc(C.hero.video); video.load(); }
    if (C.hero && C.hero.videoPoster && video) video.poster = SS.imgSrc(C.hero.videoPoster);
    if (C.hero && C.hero.tagline) { const t = document.getElementById("hero-tagline"); if (t) t.textContent = C.hero.tagline; }

    // ---- video playback: autoplay everywhere (muted), phones included ----
    (function () {
      if (!video) return;
      const playBtn = document.getElementById("xhero-play");
      const isMobile = window.matchMedia && window.matchMedia("(max-width: 767px)").matches;
      const mobileMode = (C.hero && C.hero.mobileMode) || "auto";
      function showPlay(on) { if (playBtn) playBtn.style.display = on ? "flex" : "none"; }
      // muted + playsinline is required for silent autoplay on iOS/Android.
      video.muted = true; video.defaultMuted = true;
      video.setAttribute("muted", ""); video.setAttribute("playsinline", "");
      function attempt() { const pr = video.play(); return pr && pr.then ? pr : Promise.resolve(); }

      if (isMobile && mobileMode === "tap") {        // optional: owner chose a play button
        showPlay(true);
        if (playBtn) playBtn.addEventListener("click", () => { attempt().then(() => showPlay(false)).catch(() => {}); });
        video.addEventListener("click", () => { if (video.paused) attempt().then(() => showPlay(false)).catch(() => {}); });
        return;
      }

      // "auto" (default): keep trying to autoplay; if a phone blocks it, the very first
      // user gesture (scroll/tap/touch) kicks it off silently — no visible button.
      showPlay(false);
      attempt().catch(() => {});
      video.addEventListener("canplay", () => { attempt().catch(() => {}); }, { once: true });
      function kick() { if (video.paused) attempt().catch(() => {}); else cleanup(); }
      function cleanup() {
        ["touchstart", "scroll", "click", "pointerdown", "keydown"].forEach(ev =>
          window.removeEventListener(ev, kick, { passive: true }));
      }
      ["touchstart", "scroll", "click", "pointerdown", "keydown"].forEach(ev =>
        window.addEventListener(ev, kick, { passive: true }));
      // a couple of delayed retries cover slow-loading / low-power-mode phones
      setTimeout(() => attempt().catch(() => {}), 400);
      setTimeout(() => attempt().catch(() => {}), 1200);
      // Safari on iOS pauses the video when you leave the tab / close the app.
      // Re-start it whenever the page is shown again or the tab becomes visible.
      function resume() { if (video.paused) { video.muted = true; attempt().catch(() => {}); } }
      window.addEventListener("pageshow", resume);                // bfcache / app reopen
      document.addEventListener("visibilitychange", () => { if (!document.hidden) resume(); });
      window.addEventListener("focus", resume);
    })();

    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;   // CSS shows a clean static stacked version

    let ticking = false;
    function frame() {
      ticking = false;
      const rect = sec.getBoundingClientRect();
      const total = sec.offsetHeight - window.innerHeight;
      const p = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOutQuad
      const mob = window.innerWidth < 768;
      const w = (mob ? 66 : 40) + e * (mob ? 30 : 56);   // vw
      const h = (mob ? 40 : 48) + e * (mob ? 48 : 40);   // vh
      media.style.width = w + "vw";
      media.style.height = h + "vh";
      media.style.borderRadius = (28 - e * 22) + "px";
      bg.style.opacity = (1 - e).toFixed(3);
      const tx = e * (mob ? 44 : 46);
      w1.style.transform = "translateX(-" + tx + "vw)";
      w2.style.transform = "translateX(" + tx + "vw)";
      titles.style.opacity = p < 0.7 ? "1" : Math.max(0, 1 - (p - 0.7) / 0.25).toFixed(3);
      hint.style.opacity = Math.max(0, 1 - p * 2.2).toFixed(3);
      const cp = p > 0.78 ? (p - 0.78) / 0.22 : 0;
      cta.style.opacity = Math.min(1, cp).toFixed(3);
      cta.style.pointerEvents = p > 0.92 ? "auto" : "none";
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    frame();
  })();

  // ---- homepage section visibility (Backend → Homepage) ----
  (function () {
    const cfg = (C.home && C.home.sections) || {};
    document.querySelectorAll("[data-sec]").forEach(el => {
      const key = el.getAttribute("data-sec");
      if (cfg[key] === false) el.remove();   // remove disabled sections entirely
    });
  })();

  // ---- About Second Scoop ----
  (function () {
    const sec = document.getElementById("about-sec");
    const a = C.about;
    if (!sec || !a) return;
    const set = (id, v, html) => { const el = document.getElementById(id); if (el && v != null) { html ? el.innerHTML = v : el.textContent = v; } };
    set("about-eyebrow", a.eyebrow);
    set("about-title", a.title);
    set("about-lead", a.lead);
    if (a.cta) { set("about-cta-title", a.cta.title); set("about-cta-text", a.cta.text); }
    const vWrap = document.getElementById("about-values");
    if (vWrap && Array.isArray(a.values)) {
      vWrap.innerHTML = a.values.map(v =>
        `<div class="ss-about-value"><span class="ss-about-value-ico">${v.emoji || "🍪"}</span>
          <div><strong>${v.title}</strong><p>${v.text}</p></div></div>`).join("");
    }
    const sWrap = document.getElementById("about-stats");
    if (sWrap && Array.isArray(a.stats)) {
      sWrap.innerHTML = a.stats.map((s, i) =>
        `<div class="ss-about-stat"><b data-i="${i}">0</b><span>${s.label}</span></div>`).join("");
      const nums = sWrap.querySelectorAll("b");
      let ran = false;
      function run() {
        if (ran) return; ran = true;
        a.stats.forEach((s, i) => {
          const el = nums[i]; if (!el) return;
          const dec = s.decimals || 0, end = s.value, suf = s.suffix || "", dur = 1400;
          const t0 = performance.now();
          (function step(now) {
            const p = Math.min(1, (now - t0) / dur);
            const e = 1 - Math.pow(1 - p, 3);
            el.textContent = (end * e).toFixed(dec) + (p === 1 ? suf : "");
            if (p < 1) requestAnimationFrame(step);
          })(t0);
        });
      }
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(es => { es.forEach(en => { if (en.isIntersecting) { run(); io.disconnect(); } }); }, { threshold: 0.4 });
        io.observe(sWrap);
      } else run();
    }
  })();

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

  // --- instagram feed (embed widget OR uploaded tiles) ---
  (function () {
    const ig = document.getElementById("ig-grid");
    if (!ig) return;
    const igUrl = (C.brand && C.brand.instagramUrl) || (SS_SETTINGS.brand && SS_SETTINGS.brand.instagramUrl) || "#";
    const follow = document.getElementById("ig-follow"); if (follow) follow.href = igUrl;
    const f = C.instagramFeed || {};
    const tiles = (f.tiles || []).filter(Boolean);
    if (f.mode === "embed" && f.embedHtml && f.embedHtml.trim()) {
      ig.classList.add("ss-ig-embed");                 // full-width embed, not a tile grid
      ig.innerHTML = f.embedHtml;
      return;
    }
    if (tiles.length) {                                 // uploaded photo tiles
      ig.innerHTML = tiles.map(src =>
        `<a class="ss-ig-tile" href="${igUrl}" target="_blank" rel="noopener">
          <img src="${SS.imgSrc(src)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('ss-noimg');this.remove()">
        </a>`).join("");
      return;
    }
    if (SS_SETTINGS.features.instagramFeed !== false) { // branded placeholder until connected
      const emojis = ["🍪", "🥄", "🍫", "🧁", "✨", "🔥"];
      ig.innerHTML = emojis.map(e =>
        `<a class="ss-ig-tile ss-noimg" href="${igUrl}" target="_blank" rel="noopener">${e}</a>`).join("");
    }
  })();

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
      if (!SSReviews.enabled()) return;            // keep static placeholders only if not configured
      SSReviews.fetchPublic().then(reviews => {
        // real reviews only — show what's been submitted, else an invite
        SSReviews.renderList(list, reviews || [], {
          limit: 9,
          emptyHtml: `<p class="ss-empty" style="grid-column:1/-1">No reviews yet — be the first to leave one. 🍪</p>`,
        });
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
