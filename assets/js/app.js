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
  const NAV = [
    { label: "Home", href: "index.html" },
    { label: "Shop PK", href: "shop.html?region=pakistan" },
    { label: "Shop Toronto", href: "shop.html?region=toronto" },
    { label: "The Vault", href: "vault.html", vault: true },
    { label: "Pre-Orders", href: "preorders.html" },
    { label: "About", href: "about.html" },
    { label: "FAQ", href: "faq.html" },
    { label: "Contact", href: "contact.html" },
  ];

  function headerHTML() {
    const r = SS.region();
    const here = location.pathname.split("/").pop() || "index.html";
    const links = NAV.map(n => {
      const active = here === n.href.split("?")[0] ? " is-active" : "";
      const vault = n.vault ? " ss-nav-vault" : "";
      return `<a class="ss-nav-link${active}${vault}" href="${n.href}">${n.label}</a>`;
    }).join("");

    const center = headerOpts().logoAlign === "center";
    return `
    <header class="ss-header${center ? " ss-header--center" : ""}" id="ss-header">
      <div class="ss-header-inner">
        ${logoHTML({})}
        <nav class="ss-nav" aria-label="Primary">${links}</nav>
        <div class="ss-header-actions">
          <div class="ss-region-switch" title="Choose your region">
            <button class="ss-region-btn" id="ss-region-btn" aria-haspopup="true" aria-expanded="false">
              <span class="ss-region-flag">${r.flag}</span><span class="ss-region-name">${r.name}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
            </button>
            <div class="ss-region-menu" id="ss-region-menu" role="menu">
              ${Object.values(SS_REGIONS).map(rg => `
                <button role="menuitem" data-region="${rg.id}" class="ss-region-item${rg.id===r.id?' is-active':''}">
                  <span>${rg.flag}</span> ${rg.name} <em>${rg.currency}</em></button>`).join("")}
            </div>
          </div>
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
    return `
    <footer class="ss-footer">
      <div class="ss-footer-grid">
        <div class="ss-footer-brand">
          ${logoHTML({ size: 30, dark: true })}
          <p class="ss-footer-tag">${s.tagline}</p>
          <a class="ss-ig" href="${s.instagramUrl}" target="_blank" rel="noopener">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg>
            @${s.instagram}
          </a>
        </div>
        <div class="ss-footer-col">
          <h4>Shop</h4>
          <a href="shop.html?region=pakistan">Shop Pakistan</a>
          <a href="shop.html?region=toronto">Shop Toronto</a>
          <a href="vault.html">The Vault</a>
          <a href="preorders.html">How Pre-Orders Work</a>
        </div>
        <div class="ss-footer-col">
          <h4>Company</h4>
          <a href="about.html">About</a>
          <a href="faq.html">FAQ</a>
          <a href="contact.html">Contact</a>
        </div>
        <div class="ss-footer-col ss-footer-signup">
          <h4>Unlock Future Scoops</h4>
          <p>Secret drops, restocks &amp; launches — straight to you.</p>
          <form id="ss-footer-signup" class="ss-foot-form">
            <input type="email" name="email" placeholder="Your email" required>
            <button type="submit">Join</button>
          </form>
          <small id="ss-footer-signup-msg"></small>
        </div>
      </div>
      <div class="ss-footer-bottom">
        <span>© ${new Date().getFullYear()} Second Scoop. ${r.flag} ${r.name} · ${r.currency}</span>
        <span>${s.footerNote || "Made with too much chocolate."}</span>
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
      ? `<img src="${img}" alt="${pv.name}" loading="lazy" onerror="this.parentNode.classList.add('ss-noimg')">`
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
        ${topBadge(pv)}
        ${statusBadge(pv)}
      </a>
      <div class="ss-card-body">
        <div class="ss-card-cat">${SS.categoryName(pv.category)}</div>
        <h3 class="ss-card-title"><a href="product.html?id=${pv.id}">${pv.name}</a></h3>
        <p class="ss-card-desc">${pv.description}</p>
        <div class="ss-card-meta">${reviews}${lowStock(pv)}</div>
        <div class="ss-card-foot">
          <span class="ss-card-price">${SS.money(pv.price)}</span>
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
    const names = SS_SETTINGS.recentlySold;
    const prods = SS.productsForRegion();
    if (!names.length || !prods.length) return;
    function ping() {
      const who = names[Math.floor(Math.random() * names.length)];
      const p = SS.productView(prods[Math.floor(Math.random() * prods.length)]);
      const el = document.createElement("div");
      el.className = "ss-recent";
      el.innerHTML = `<span class="ss-recent-dot"></span><div><strong>${who}</strong><br>just ordered ${p.name}</div>`;
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
    if (rbtn) {
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
      const targets = document.querySelectorAll(".ss-sec, .ss-card, .ss-step, .ss-review, .ss-value, .ss-kpi, .ss-hero-copy, .ss-hero-media, .ss-vault-teaser, .ss-signup");
      targets.forEach((el, i) => { el.classList.add("reveal"); el.style.transitionDelay = Math.min((i % 4) * 60, 180) + "ms"; });
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
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
    if (opts.recentlySold !== false) startRecentlySold();
    setTimeout(() => { initScrollFX(); initTilt(); }, 60);   // after page scripts inject content
  }

  window.SSApp = { mount, productCard, toast, logoHTML, logoMarkSVG, wordmarkImg, refreshCartCount, statusBadge, topBadge, applyTheme, initScrollFX, initTilt };
})();
