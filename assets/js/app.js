/* =====================================================================
   SECOND SCOOP — SHARED APP SHELL
   ---------------------------------------------------------------------
   Renders the announcement bar, header (with region switcher + cart),
   footer, toast system and reusable product-card component.
   Every page includes this and calls SSApp.mount().
   ===================================================================== */

(function () {
  "use strict";

  /* ----------------------------------------------------- logo ------ */
  // Uses the real Second Scoop cookie "SS" mark (PNG) + a clean wordmark.
  // Header/footer use the compact mark + text (the full stacked wordmark
  // image is too tall to read at header size). The big wordmark image is
  // used in larger spots via SSApp.wordmarkImg(). If a PNG is ever missing
  // the inline SVG mark + text take over automatically.
  const markImg = "assets/img/logo-mark.png";        // tan mark (light bgs)
  const markImgDark = "assets/img/logo-mark-cream.png"; // cream mark (dark bgs)

  // Fallback inline cookie monogram, in case images are missing.
  function logoMarkSVG(size) {
    size = size || 34;
    return `<svg class="ss-mark" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
      <g transform="rotate(-12 60 60)">
        <g fill="none" stroke="var(--choc)" stroke-width="15" stroke-linecap="round" stroke-linejoin="round">
          <path d="M70 26c-9-9-30-8-34 4-3 10 9 14 18 17"/>
          <path d="M54 47c10 3 24 7 21 19-3 11-25 12-34 3"/>
          <path d="M78 58c-9-9-30-8-34 4-3 10 9 14 18 17"/>
          <path d="M62 79c10 3 24 7 21 19-4 11-26 11-35 2"/>
        </g>
      </g>
      <circle cx="94" cy="92" r="11" fill="var(--cookie)" stroke="var(--choc)" stroke-width="5"/>
      <circle cx="90" cy="89" r="1.6" fill="var(--choc)"/>
      <circle cx="97" cy="92" r="1.6" fill="var(--choc)"/>
      <circle cx="93" cy="95" r="1.4" fill="var(--choc)"/>
    </svg>`;
  }

  function headerOpts() {
    try { return (SS.getContent().header) || {}; } catch (e) { return {}; }
  }
  function logoHTML(opts) {
    opts = opts || {};
    const h = headerOpts();
    const size = opts.size || h.logoSize || 34;
    const dark = !!opts.dark;
    const src = dark ? markImgDark : markImg;
    const wordColor = dark ? "var(--cream)" : "var(--choc)";
    const showWord = opts.forceWord || h.showWordmark !== false;
    return `<a class="ss-logo" href="index.html" aria-label="Second Scoop home">
      <img class="ss-logo-mark-img" src="${src}" alt="" style="height:${Math.round(size * 1.3)}px"
           onerror="this.style.display='none'">
      ${showWord ? `<span class="ss-logo-word" style="color:${wordColor}">Second Scoop<span style="color:var(--caramel)">.</span></span>` : ""}
    </a>`;
  }
  // Full stacked wordmark image, for hero / large brand moments.
  function wordmarkImg(maxw) {
    return `<img class="ss-wordmark-img" src="assets/img/logo-wordmark.png"
      alt="Second Scoop" style="max-width:${maxw || 320}px;width:100%;height:auto"
      onerror="this.style.display='none'">`;
  }

  /* ------------------------------------------------- announcement -- */
  function announcementHTML() {
    const r = SS.region();
    const a = r.announcement;
    if (!a || !a.enabled) return "";
    return `<div class="ss-announce ss-announce--${a.style}" role="status">
      <span class="ss-announce-dot"></span>${a.text}
    </div>`;
  }

  /* -------------------------------------------------------- header - */
  // Region lives in the flag dropdown (right side), not as menu links — so it
  // never has to be repeated in the bar. Toggle any link in Backend → Menu & Regions.
  const NAV = [
    { key: "home", label: "Home", href: "index.html" },
    { key: "shop", label: "Shop", href: "shop.html" },
    { key: "bundles", label: "Bundles", href: "bundles.html" },
    { key: "vault", label: "The Vault", href: "vault.html", vault: true },
    { key: "popups", label: "Popups", href: "popups.html" },
    { key: "preorders", label: "Pre-Orders", href: "preorders.html" },
    { key: "about", label: "About", href: "about.html" },
    { key: "faq", label: "FAQ", href: "faq.html" },
    { key: "contact", label: "Contact", href: "contact.html" },
  ];
  function navOpts() { try { return (SS.getContent().nav) || {}; } catch (e) { return {}; } }

  function headerHTML() {
    const r = SS.region();
    const navCfg = navOpts();
    const here = location.pathname.split("/").pop() || "index.html";
    const links = NAV.filter(n => navCfg[n.key] !== false).map(n => {
      const active = here === n.href.split("?")[0] ? " is-active" : "";
      const vault = n.vault ? " ss-nav-vault" : "";
      return `<a class="ss-nav-link${active}${vault}" href="${n.href}">${n.label}</a>`;
    }).join("");

    const regions = SS.availableRegions();
    const multi = regions.length > 1;
    const regionSwitch = `
      <div class="ss-region-switch${multi ? "" : " ss-region-switch--single"}" title="${multi ? "Switch country" : r.name}">
        <button class="ss-region-btn" id="ss-region-btn" aria-haspopup="true" aria-expanded="false"${multi ? "" : " disabled"}>
          <span class="ss-region-flag">${r.flag}</span><span class="ss-region-name">${r.name}</span>
          ${multi ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>` : ""}
        </button>
        ${multi ? `<div class="ss-region-menu" id="ss-region-menu" role="menu">
          ${regions.map(rg => `
            <button role="menuitem" data-region="${rg.id}" class="ss-region-item${rg.id === r.id ? ' is-active' : ''}${rg.comingSoon ? ' is-soon' : ''}">
              <span>${rg.flag}</span> ${rg.name} <em>${rg.comingSoon ? 'Coming soon' : rg.currency}</em></button>`).join("")}
        </div>` : ""}
      </div>`;

    const center = headerOpts().logoAlign === "center";
    return `
    <header class="ss-header${center ? " ss-header--center" : ""}" id="ss-header">
      <div class="ss-header-inner">
        ${logoHTML({})}
        <nav class="ss-nav" aria-label="Primary">${links}</nav>
        <div class="ss-header-actions">
          ${regionSwitch}
          <a class="ss-cart-btn" href="cart.html" aria-label="Cart">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 7h13l-1.2 9.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 7Zm0 0L5.2 4H3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.5" cy="20.5" r="1.3" fill="currentColor"/><circle cx="16" cy="20.5" r="1.3" fill="currentColor"/></svg>
            <span class="ss-cart-count" id="ss-cart-count">0</span>
          </a>
          <button class="ss-menu-toggle" id="ss-menu-toggle" aria-label="Menu" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
      <div class="ss-mobile-nav" id="ss-mobile-nav">${links}</div>
    </header>`;
  }

  /* -------------------------------------------------------- footer - */
  function footerHTML() {
    const s = (SS.getContent && SS.getContent().brand) || SS_SETTINGS.brand;
    const r = SS.region();
    const igUrl = s.instagramUrl || ("https://instagram.com/" + (s.instagram || "secondscoop"));
    const email = s.email || "hello@secondscoop.co";
    return `
    <footer class="ss-foot2">
      <div class="wrap">
        <div class="ss-foot2-top">
          <div class="ss-foot2-news">
            ${logoHTML({ size: 30, dark: true })}
            <h3 style="margin-top:.7rem">Join the scoop list</h3>
            <p>${s.tagline || "Secret drops, restocks & launches — straight to you."}</p>
            <form id="ss-footer-signup" class="ss-foot2-form">
              <input type="email" name="email" placeholder="you@email.com" required>
              <button type="submit" aria-label="Subscribe">→</button>
            </form>
            <small id="ss-footer-signup-msg" class="ss-foot2-msg"></small>
            <div class="ss-foot2-social">
              <a href="${igUrl}" target="_blank" rel="noopener" aria-label="Instagram">📸</a>
              <a href="mailto:${email}" aria-label="Email">✉️</a>
              <a href="vault.html" aria-label="The Vault">🔒</a>
            </div>
          </div>
          <div class="ss-foot2-col">
            <h4>Shop</h4>
            <a href="shop.html?region=pakistan">Shop Pakistan 🇵🇰</a>
            <a href="shop.html?region=toronto">Shop Toronto 🇨🇦</a>
            <a href="vault.html">The Vault</a>
            <a href="preorders.html">How Pre-Orders Work</a>
          </div>
          <div class="ss-foot2-col">
            <h4>Company</h4>
            <a href="about.html">About</a>
            <a href="faq.html">FAQ</a>
            <a href="contact.html">Contact</a>
            <p style="margin-top:.8rem;opacity:.7">${r.flag} ${r.name} · ${r.currency}</p>
            <a href="mailto:${email}">${email}</a>
          </div>
        </div>
        <div class="ss-foot2-bot">
          <span>© ${new Date().getFullYear()} Second Scoop. All rights reserved.</span>
          <span>${s.footerNote || "Made with too much chocolate."}</span>
        </div>
      </div>
    </footer>`;
  }

  /* --------------------------------------------------- product card */
  function statusBadge(pv) {
    const map = {
      "available":   "",
      "preorder":    `<span class="ss-status ss-status--preorder">Pre-Order</span>`,
      "closing":     `<span class="ss-status ss-status--closing">Closing Soon</span>`,
      "sold-out":    `<span class="ss-status ss-status--sold">Sold Out</span>`,
      "coming-soon": `<span class="ss-status ss-status--coming">Coming Soon</span>`,
    };
    return map[pv.status] || "";
  }
  function topBadge(pv) {
    if (!SS_SETTINGS.features.bestSellerBadges) return "";
    const map = {
      "best-seller": `<span class="ss-badge ss-badge--best">★ Best Seller</span>`,
      "limited":     `<span class="ss-badge ss-badge--limited">Limited</span>`,
      "new":         `<span class="ss-badge ss-badge--new">New</span>`,
    };
    return pv.badge ? (map[pv.badge] || "") : "";
  }
  function lowStock(pv) {
    if (!SS_SETTINGS.features.inventoryCounters) return "";
    if (pv.buyable && pv.inventory > 0 && pv.inventory <= 10)
      return `<span class="ss-lowstock">Only ${pv.inventory} left</span>`;
    return "";
  }

  function productCard(pv, opts) {
    opts = opts || {};
    const img = pv.imageSrc || (pv.image ? SS.imgSrc(pv.image) : "");
    const imgEl = img
      ? `<img src="${img}" alt="${pv.name}" loading="lazy" decoding="async" onerror="this.parentNode.classList.add('ss-noimg')">`
      : "";
    const reviews = pv.reviews && pv.reviews.count
      ? `<span class="ss-card-rating">★ ${pv.reviews.rating} <em>(${pv.reviews.count})</em></span>` : "";
    const cta = pv.buyable
      ? `<button class="ss-btn ss-btn--add" data-add="${pv.id}">Add to Cart</button>`
      : `<button class="ss-btn ss-btn--ghost" disabled>${pv.status === "coming-soon" ? "Coming Soon" : "Sold Out"}</button>`;
    return `
    <article class="ss-card${pv.hero ? " ss-card--hero" : ""}" data-cat="${pv.category}" data-name="${pv.name.toLowerCase()}">
      <a class="ss-card-media" href="product.html?id=${pv.id}">
        <div class="ss-card-img ${img ? "" : "ss-noimg"}" data-cat="${pv.category}">${imgEl}
          <span class="ss-card-fallback">${pv.name}</span>
        </div>
        ${pv.bundle ? `<span class="ss-badge ss-badge--bundle">🎁 Bundle</span>` : topBadge(pv)}
        ${statusBadge(pv)}
      </a>
      <div class="ss-card-body">
        <div class="ss-card-cat">${SS.categoryName(pv.category)}</div>
        <h3 class="ss-card-title"><a href="product.html?id=${pv.id}">${pv.name}</a></h3>
        <p class="ss-card-desc">${pv.description}</p>
        ${pv.bundle && pv.includes && pv.includes.length ? `<ul class="ss-bundle-list">${pv.includes.map(i => `<li>${i}</li>`).join("")}</ul>` : ""}
        <div class="ss-card-meta">${reviews}${lowStock(pv)}</div>
        <div class="ss-card-foot">
          <span class="ss-card-price">${pv.sizes && pv.sizes.length ? `<small style="font-weight:600;color:var(--ink-60)">from </small>` : ""}${SS.money(pv.price)}</span>
          ${cta}
        </div>
      </div>
    </article>`;
  }

  /* -------------------------------------------------------- toast -- */
  function toast(msg, kind) {
    let wrap = document.getElementById("ss-toasts");
    if (!wrap) { wrap = document.createElement("div"); wrap.id = "ss-toasts"; document.body.appendChild(wrap); }
    const t = document.createElement("div");
    t.className = "ss-toast" + (kind ? " ss-toast--" + kind : "");
    t.textContent = msg;
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2600);
  }

  /* ------------------------------------------ recently-sold ticker - */
  function startRecentlySold() {
    if (!SS_SETTINGS.features.recentlySoldNotifications) return;
    // Names only — the city is always the CURRENT region (e.g. Lahore), so it
    // can never show a city you don't serve.
    const names = (SS_SETTINGS.recentlySold || []).map(n => String(n).split(/\s+in\s+/i)[0].trim()).filter(Boolean);
    const prods = SS.productsForRegion();
    if (!names.length || !prods.length) return;
    const cityName = (SS.region() && SS.region().name) || "";
    function ping() {
      const who = names[Math.floor(Math.random() * names.length)];
      const p = SS.productView(prods[Math.floor(Math.random() * prods.length)]);
      const el = document.createElement("div");
      el.className = "ss-recent";
      el.innerHTML = `<span class="ss-recent-dot"></span><div><strong>${who}${cityName ? " in " + cityName : ""}</strong><br>just ordered ${p.name}</div>`;
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add("show"));
      setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 400); }, 4200);
    }
    setTimeout(ping, 6000);
    setInterval(ping, 22000);
  }

  /* ------------------------------------------------- wire up shell - */
  function refreshCartCount() {
    const el = document.getElementById("ss-cart-count");
    if (!el) return;
    const n = SS.cartCount();
    el.textContent = n;
    el.classList.toggle("has", n > 0);
  }

  function bindShell() {
    // region menu
    const rbtn = document.getElementById("ss-region-btn");
    const rmenu = document.getElementById("ss-region-menu");
    if (rbtn && rmenu) {
      rbtn.addEventListener("click", e => {
        e.stopPropagation();
        const open = rmenu.classList.toggle("open");
        rbtn.setAttribute("aria-expanded", open);
      });
      document.addEventListener("click", () => rmenu.classList.remove("open"));
      rmenu.querySelectorAll("[data-region]").forEach(b => {
        b.addEventListener("click", () => {
          const id = b.getAttribute("data-region");
          SS.setRegion(id);
          // Keep shop context if on a shop/product page.
          const page = location.pathname.split("/").pop();
          if (page === "shop.html") location.href = `shop.html?region=${id}`;
          else location.reload();
        });
      });
    }
    // mobile menu
    const mt = document.getElementById("ss-menu-toggle");
    const mn = document.getElementById("ss-mobile-nav");
    if (mt) mt.addEventListener("click", () => {
      const open = mn.classList.toggle("open");
      mt.classList.toggle("open", open);
      mt.setAttribute("aria-expanded", open);
    });
    // sticky shadow
    const header = document.getElementById("ss-header");
    window.addEventListener("scroll", () => header && header.classList.toggle("scrolled", window.scrollY > 8));

    // global add-to-cart delegation
    document.addEventListener("click", e => {
      const add = e.target.closest("[data-add]");
      if (add) {
        const id = add.getAttribute("data-add");
        if (SS.addToCart(id, 1)) { refreshCartCount(); bump(add); toast("Added to cart 🍪", "ok"); }
        else toast("Sorry — that one isn't available.", "err");
      }
    });

    // footer signup
    const fs = document.getElementById("ss-footer-signup");
    if (fs) fs.addEventListener("submit", e => {
      e.preventDefault();
      SS.addSignup({ email: fs.email.value, source: "footer" });
      fs.reset();
      const m = document.getElementById("ss-footer-signup-msg");
      if (m) m.textContent = "You're on the list. 🍪";
    });

    document.addEventListener("ss:cart", refreshCartCount);
  }
  function bump(btn) { btn.classList.add("bump"); setTimeout(() => btn.classList.remove("bump"), 250); }

  /* ----------------------------------------------------- mount ----- */
  /* ---------------------------------------------- theme + effects -- */
  function content() { try { return SS.getContent() || {}; } catch (e) { return {}; } }

  // Apply editable colours by setting CSS variables on :root.
  function applyTheme() {
    const t = content().theme; if (!t) return;
    const root = document.documentElement;
    const map = { choc: "--choc", caramel: "--caramel", cookie: "--cookie", cream: "--cream", blush: "--blush", gold: "--gold" };
    Object.keys(map).forEach(k => { if (t[k]) root.style.setProperty(map[k], t[k]); });
    // a couple of derived tints so backgrounds stay cohesive
    if (t.cream) { root.style.setProperty("--cream-2", shade(t.cream, -6)); root.style.setProperty("--cream-3", shade(t.cream, -12)); }
    if (t.blush) root.style.setProperty("--blush-soft", shade(t.blush, 8));
  }
  function shade(hex, pct) {
    try {
      const n = parseInt(hex.replace("#", ""), 16);
      let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      const f = 1 + pct / 100;
      r = Math.max(0, Math.min(255, Math.round(r * f)));
      g = Math.max(0, Math.min(255, Math.round(g * f)));
      b = Math.max(0, Math.min(255, Math.round(b * f)));
      return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    } catch (e) { return hex; }
  }

  // Scroll-reveal + hero parallax. Tags sections, animates on entry.
  function initScrollFX() {
    const fx = content().effects || {};
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    if (fx.scrollReveal !== false && "IntersectionObserver" in window) {
      const targets = document.querySelectorAll(".ss-sec, .ss-card, .ss-step, .ss-review, .ss-value, .ss-kpi, .ss-hero-copy, .ss-hero-media, .ss-vault-teaser, .ss-signup, .ss-page-head, .ss-acc, .ss-shop-toolbar, .ss-about-value, .ss-pdp-trust");
      targets.forEach((el, i) => { el.classList.add("reveal"); el.style.transitionDelay = Math.min((i % 4) * 60, 180) + "ms"; });
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          const t = e.target; t.classList.add("in"); io.unobserve(t);
          // once the entrance finishes, drop the classes so the 3D hover-tilt
          // (inline transform) isn't overridden by the finished CSS animation
          setTimeout(() => t.classList.remove("reveal", "in"), 820);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
      targets.forEach(el => io.observe(el));
    }
    if (fx.heroParallax !== false) {
      const media = document.querySelector(".ss-hero-media");
      const blobs = document.querySelectorAll(".ss-hero-blob, .ss-hero-float");
      if (media || blobs.length) {
        let ticking = false;
        window.addEventListener("scroll", () => {
          if (ticking) return; ticking = true;
          requestAnimationFrame(() => {
            const y = window.scrollY;
            if (media && y < 900) media.style.transform = `translateY(${y * 0.06}px)`;
            blobs.forEach((b, i) => { if (y < 900) b.style.transform = `translateY(${y * (0.04 + i * 0.02)}px)`; });
            ticking = false;
          });
        }, { passive: true });
      }
    }
  }

  // Scroll-and-swap big titles: as a heading scrolls into view its text rolls
  // up and a duplicate rolls in from below — a playful vertical swap.
  function initSwapTitles() {
    const fx = content().effects || {};
    if (fx.swapTitles === false) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const targets = document.querySelectorAll(".ss-sec-head h2, .ss-about-head h2, .ss-vault-teaser h2, .ss-vault-hero h2, .ss-shop-hero h2, .ss-page-head h1, [data-swap-title]");
    const items = [];
    targets.forEach(h => {
      if (h.dataset.swap) return;
      h.dataset.swap = "1";
      const txt = h.textContent;
      h.innerHTML = `<span class="ss-swap"><span class="ss-swap-layer ss-swap-a">${txt}</span><span class="ss-swap-layer ss-swap-b">${txt}</span></span>`;
      items.push({ h, a: h.querySelector(".ss-swap-a"), b: h.querySelector(".ss-swap-b") });
    });
    if (!items.length) return;
    let ticking = false;
    function frame() {
      ticking = false;
      const vh = window.innerHeight;
      items.forEach(it => {
        const rect = it.h.getBoundingClientRect();
        let p = (vh * 0.85 - rect.top) / (vh * 0.40);
        p = p < 0 ? 0 : p > 1 ? 1 : p;
        it.a.style.transform = `translateY(${(-100 * p).toFixed(2)}%)`;
        it.b.style.transform = `translateY(${(100 * (1 - p)).toFixed(2)}%)`;
      });
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    frame();
  }

  // Subtle 3D hover-tilt on cards & images (hover-capable devices only).
  function initTilt(root) {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hover = !window.matchMedia || window.matchMedia("(hover: hover)").matches;
    if (reduce || !hover) return;
    (root || document).querySelectorAll(".ss-card, .ss-tilt, .ss-carousel-slide").forEach(el => {
      if (el.dataset.tilt) return; el.dataset.tilt = "1";
      el.style.transformStyle = "preserve-3d";
      el.addEventListener("mousemove", e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg) translateY(-5px)`;
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });
  }

  /* ------------------------------------------- editable text engine -
     Any element with data-edit="path.to.field" gets its text (or an
     attribute via data-edit-attr) filled from the content config. Works on
     every page, and on content injected later (cart, checkout, etc.) via a
     MutationObserver. This is what makes ALL site copy editable in the
     Backend → Pages & Text tab.                                          */
  function editResolve(C, path) {
    const roots = [C, C && C.sections, C && C.pages];
    for (let i = 0; i < roots.length; i++) {
      let v = roots[i]; if (!v) continue;
      const parts = path.split("."); let ok = true;
      for (let j = 0; j < parts.length; j++) {
        if (v && typeof v === "object" && parts[j] in v) v = v[parts[j]];
        else { ok = false; break; }
      }
      if (ok && typeof v === "string") return v;
    }
    return undefined;
  }
  function applyText(root) {
    let C; try { C = SS.getContent() || {}; } catch (e) { return; }
    const list = [];
    if (root && root.nodeType === 1 && root.matches && root.matches("[data-edit]")) list.push(root);
    const scope = (root && root.querySelectorAll) ? root : document;
    scope.querySelectorAll("[data-edit]").forEach(e => list.push(e));
    list.forEach(el => {
      const v = editResolve(C, el.getAttribute("data-edit"));
      if (typeof v !== "string" || !v.length) return;
      const attr = el.getAttribute("data-edit-attr");
      if (attr) el.setAttribute(attr, v); else el.textContent = v;
    });
  }
  function startTextObserver() {
    if (window.__ssTextObs || !("MutationObserver" in window)) return;
    window.__ssTextObs = new MutationObserver(muts => {
      for (const m of muts) for (const n of m.addedNodes) {
        if (n.nodeType === 1 && (n.matches("[data-edit]") || (n.querySelector && n.querySelector("[data-edit]")))) applyText(n);
      }
    });
    window.__ssTextObs.observe(document.documentElement, { childList: true, subtree: true });
  }

  /* --------------------------------------------- region choice gate */
  function regionGateHTML() {
    const regions = SS.availableRegions();
    return `<div class="ss-gate" id="ss-gate">
      <span class="ss-gate-blob ss-gate-blob--1"></span><span class="ss-gate-blob ss-gate-blob--2"></span>
      <div class="ss-gate-inner">
        ${logoHTML({ size: 42, forceWord: true, dark: true })}
        <h2 class="ss-gate-title">Where are we scooping?</h2>
        <p class="ss-gate-sub">Pick your store — the menu, pricing and drops are different in each. You can switch anytime from the top bar.</p>
        <div class="ss-gate-cards">
          ${regions.map(rg => {
            const cs = !!rg.comingSoon;
            return `<button class="ss-gate-card${cs ? " is-soon" : ""}" data-region="${rg.id}">
              ${cs ? `<span class="ss-gate-badge">Coming soon</span>` : ""}
              <span class="ss-gate-flag">${rg.flag}</span>
              <strong>${cs ? rg.name : "Shop " + rg.name}</strong>
              <span class="ss-gate-meta">${cs ? "Launching soon — take a peek" : rg.currency + (rg.delivery && rg.delivery.etaText ? " · " + rg.delivery.etaText : "")}</span>
              <span class="ss-gate-go">${cs ? "Have a look →" : "Enter →"}</span>
            </button>`;
          }).join("")}
        </div>
      </div>
    </div>`;
  }
  function showRegionGate(force) {
    if (SS.inBackend && SS.inBackend()) return;   // never gate the control panel
    if (!force) {
      if (SS.regionChosen()) return;
      if (SS.availableRegions().length < 2) { try { localStorage.setItem("ss_region_chosen", "1"); } catch (e) {} return; }
    }
    // let the opening intro finish first
    const intro = document.getElementById("ss-intro");
    if (intro && intro.isConnected && !intro.classList.contains("is-done")) { setTimeout(() => showRegionGate(force), 300); return; }
    if (document.getElementById("ss-gate")) return;
    const holder = document.createElement("div"); holder.innerHTML = regionGateHTML();
    const gate = holder.firstElementChild;
    document.body.appendChild(gate);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => gate.classList.add("is-in"));
    function choose(id) {
      SS.setRegion(id);
      gate.classList.add("is-out");
      document.body.style.overflow = "";
      setTimeout(() => { gate.remove(); location.reload(); }, 480);
    }
    gate.querySelectorAll("[data-region]").forEach(b => b.addEventListener("click", () => choose(b.getAttribute("data-region"))));
  }

  /* ------------------------------------------------ preview banner */
  function showPreviewBanner() {
    if (!SS.previewMode() || SS.inBackend()) return;
    if (document.getElementById("ss-preview-bar")) return;
    const bar = document.createElement("div");
    bar.id = "ss-preview-bar"; bar.className = "ss-preview-bar";
    bar.innerHTML = `<span>👁️ Preview — showing your unpublished draft, not the live site.</span>
      <a href="?preview=0">Exit preview</a>`;
    document.body.appendChild(bar);
    document.body.classList.add("ss-has-preview-bar");
  }

  function mount(opts) {
    opts = opts || {};
    applyTheme();
    const ann = document.getElementById("ss-announcement");
    if (ann) ann.innerHTML = announcementHTML();
    const hdr = document.getElementById("ss-header-slot");
    if (hdr) hdr.innerHTML = headerHTML();
    const ftr = document.getElementById("ss-footer-slot");
    if (ftr) ftr.innerHTML = footerHTML();
    bindShell();
    refreshCartCount();
    applyText(document);          // fill all editable text on this page
    startTextObserver();          // and any text injected later (cart, checkout…)
    showPreviewBanner();
    if (opts.recentlySold !== false) startRecentlySold();
    setTimeout(() => { initScrollFX(); initTilt(); initSwapTitles(); }, 60);   // after page scripts inject content
    if (opts.regionGate !== false) setTimeout(() => showRegionGate(), 150);     // first-visit country pick
  }

  window.SSApp = { mount, productCard, toast, logoHTML, logoMarkSVG, wordmarkImg, refreshCartCount, statusBadge, topBadge, applyTheme, initScrollFX, initTilt, initSwapTitles, showRegionGate, applyText };
})();
