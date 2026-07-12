/* =====================================================================
   SECOND SCOOP — UNIFIED BACKEND
   ---------------------------------------------------------------------
   One private control room: Dashboard, Orders, Products, The Vault,
   Content & Copy, Announcements, Settings, Save & Export.
   Passcode-gated. Not linked anywhere on the public site.
   ===================================================================== */
(function () {
  "use strict";
  const root = document.getElementById("backend-root");
  const drawer = document.getElementById("mgr-drawer");
  const overlay = document.getElementById("mgr-overlay");
  const AUTH = "ss_admin_ok";

  const clone = o => JSON.parse(JSON.stringify(o == null ? null : o));
  const REGION_IDS = Object.keys(SS_REGIONS);
  const STATUSES = ["available", "preorder", "closing", "sold-out", "coming-soon"];
  const STATUS_LABEL = { available: "Available", preorder: "Pre-Order", closing: "Closing Soon", "sold-out": "Sold Out", "coming-soon": "Coming Soon" };
  const BADGES = [["", "None"], ["best-seller", "Best Seller"], ["limited", "Limited"], ["new", "New"]];
  const ORDER_STATUSES = ["New", "Confirmed", "Paid", "Preparing", "Ready", "Delivered", "Cancelled"];
  const PAY_STATUSES = ["Pending", "Paid", "Refunded"];

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "orders", label: "Orders", icon: "🧾" },
    { id: "mailing", label: "Mailing List", icon: "📨" },
    { id: "messages", label: "Messages", icon: "💬" },
    { id: "reviews", label: "Reviews", icon: "⭐" },
    { id: "products", label: "Products", icon: "🍪" },
    { id: "bundles", label: "Bundles", icon: "🎁" },
    { id: "vault", label: "The Vault", icon: "🔒" },
    { id: "homepage", label: "Home Page", icon: "🏠" },
    { id: "about", label: "About Page", icon: "📖" },
    { id: "faq", label: "FAQ Page", icon: "❓" },
    { id: "contact", label: "Contact Page", icon: "✉️" },
    { id: "preorders", label: "Pre-orders Page", icon: "⏳" },
    { id: "popups", label: "Popups Page", icon: "📍" },
    { id: "shoptext", label: "Shop & Checkout", icon: "🛒" },
    { id: "design", label: "Design (theme/logo)", icon: "🎨" },
    { id: "menu", label: "Navigation & Regions", icon: "🧭" },
    { id: "announce", label: "Announcements", icon: "📣" },
    { id: "settings", label: "Brand & Settings", icon: "⚙️" },
    { id: "export", label: "Publish & Backup", icon: "💾" },
  ];
  // Page-based grouping — each page owns its content, no overlaps.
  const NAV_GROUPS = [
    { label: "Store", items: ["dashboard", "orders", "mailing", "messages", "reviews"] },
    { label: "Catalog", items: ["products", "bundles", "vault"] },
    { label: "Pages", items: ["homepage", "about", "faq", "contact", "preorders", "popups", "shoptext"] },
    { label: "Look & setup", items: ["design", "menu", "announce", "settings", "export"] },
  ];

  // working copies (edited in memory, persisted on save)
  let cat, vault, content, settings, announce, regionView;
  let zoneState = {};   // working copy of delivery zones per region (Settings tab)
  let section = (location.hash.replace("#", "") || "dashboard");
  let productSearch = "", orderFilters = { region: "all", status: "all", q: "" };

  /* ----------- live orders pulled from the Google Sheet -------------- */
  let remoteOrders = null;      // array once loaded
  let remoteState = "idle";     // idle | loading | ok | error
  let remoteErr = "";

  function remoteConfigured() {
    const url = (SS.getSettings().googleSheets || {}).webhookUrl;
    return !!(url && SS.read("ss_orders_key", ""));
  }
  // The orders the dashboard/Orders tab use: live sheet data if loaded,
  // otherwise whatever is saved on this device.
  function dataOrders() { return Array.isArray(remoteOrders) ? remoteOrders : SS.getOrders(); }

  function jsonpOrders() {
    return new Promise((resolve, reject) => {
      const url = (SS.getSettings().googleSheets || {}).webhookUrl;
      const key = SS.read("ss_orders_key", "");
      if (!url || !key) return reject("not configured");
      const cb = "sscb_" + Math.random().toString(36).slice(2);
      const sep = url.indexOf("?") > -1 ? "&" : "?";
      const s = document.createElement("script");
      s.src = url + sep + "action=orders&key=" + encodeURIComponent(key) + "&callback=" + cb;
      let done = false;
      window[cb] = (data) => { done = true; cleanup(); (data && data.ok) ? resolve(data.orders || []) : reject((data && data.error) || "error"); };
      s.onerror = () => { if (!done) { cleanup(); reject("network"); } };
      function cleanup() { try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); }
      document.body.appendChild(s);
      setTimeout(() => { if (!done) { cleanup(); reject("timeout"); } }, 15000);
    });
  }
  // Statuses you can set on a live (sheet) order.
  const SHEET_PAY = ["PENDING", "PAID", "COMP", "CANCELLED", "REFUNDED"];
  const SHEET_ORDER = ["New", "Confirmed", "Preparing", "Ready", "Delivered", "Cancelled"];

  // Write a status back to the sheet for one order (via JSONP).
  // field = "payment" (Payment Status col) or "order" (Order Status col).
  function setRemoteStatus(orderNumber, status, field) {
    return new Promise((resolve, reject) => {
      const url = (SS.getSettings().googleSheets || {}).webhookUrl;
      const key = SS.read("ss_orders_key", "");
      if (!url || !key) return reject("not configured");
      const cb = "ssset_" + Math.random().toString(36).slice(2);
      const sep = url.indexOf("?") > -1 ? "&" : "?";
      const s = document.createElement("script");
      s.src = url + sep + "action=setstatus&field=" + encodeURIComponent(field || "payment") +
        "&order=" + encodeURIComponent(orderNumber) +
        "&status=" + encodeURIComponent(status) + "&key=" + encodeURIComponent(key) + "&callback=" + cb;
      let done = false;
      window[cb] = (data) => { done = true; cleanup(); (data && data.ok) ? resolve() : reject((data && data.error) || "error"); };
      s.onerror = () => { if (!done) { cleanup(); reject("network"); } };
      function cleanup() { try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); }
      document.body.appendChild(s);
      setTimeout(() => { if (!done) { cleanup(); reject("timeout"); } }, 15000);
    });
  }

  function loadRemote() {
    return jsonpOrders()
      .then(list => { remoteOrders = normalizeRemote(list); remoteState = "ok"; remoteErr = ""; })
      .catch(err => { remoteState = "error"; remoteErr = String(err); if (!Array.isArray(remoteOrders)) remoteOrders = null; });
  }
  function refreshRemote(then) { remoteState = "idle"; remoteOrders = null; (then || renderSection)(); }

  // Convert sheet rows → order objects the dashboard understands.
  // Delivery charge for an order — from a "Delivery Fee" cell if present, else
  // parsed from the "Preferred Method" text e.g. "Delivery (Rs.600…)" / "($7)".
  function feeFromMethod(method, feeCell) {
    const f = Number(feeCell); if (isFinite(f) && f > 0) return f;
    const m = String(method || "").match(/(?:rs\.?|₨|\$)\s*([\d.,]+)/i);
    return m ? (Number(m[1].replace(/,/g, "")) || 0) : 0;
  }
  function normalizeRemote(rows) {
    return (rows || []).map(o => {
      const lines = parseProducts(o.products);
      const lineSum = lines.reduce((s, l) => s + l.lineTotal, 0);
      // Trust the sheet's revenue cell ONLY if it's a sane number. If it's
      // negative, non-numeric, or absurdly large (a corrupt/mis-typed cell),
      // fall back to the real total from the product breakdown.
      let subtotal = Number(o.revenue);
      if (!isFinite(subtotal) || subtotal < 0 || subtotal > 100000000) subtotal = lineSum;
      if (!isFinite(subtotal) || subtotal < 0) subtotal = 0;
      const sheetOrderStatus = (o.orderStatus || "").trim();
      const cancelled = /cancel/i.test(o.paymentStatus || "") || /cancel/i.test(sheetOrderStatus);
      return {
        orderNumber: o.orderNumber || "(no #)",
        timestamp: o.submissionDate || "",
        region: o.region || "pakistan",
        currency: o.currency || "PKR",
        customer: {
          name: ((o.firstName || "") + " " + (o.lastName || "")).trim() || "(no name)",
          firstName: o.firstName || "", lastName: o.lastName || "",
          phone: o.phone || "", email: o.email || "", instagram: o.instagram || "",
          address: "", address2: "",
          fulfilment: /pick ?up/i.test(o.preferredMethod || "") ? "pickup" : "delivery",
          preferredDate: o.preferredDate || "", notes: "",
        },
        lines, subtotal, deliveryFee: feeFromMethod(o.preferredMethod, o.deliveryFee), grandTotal: subtotal,
        orderStatus: sheetOrderStatus || (cancelled ? "Cancelled" : "New"),
        paymentStatus: o.paymentStatus || "Pending",
        vaultProducts: "", _remote: true,
      };
    });
  }
  function parseProducts(str) {
    const lines = [];
    String(str || "").split(/\n|\r/).forEach(line => {
      const m = line.match(/^(.*?)\s*\(Amount:\s*([\d,.]+).*?Quantity:\s*(\d+)\)/i);
      if (m) {
        const name = m[1].trim();
        const price = parseFloat(m[2].replace(/,/g, "")) || 0;
        const qty = parseInt(m[3], 10) || 0;
        lines.push({ id: slug(name), name, qty, price, lineTotal: price * qty, secret: false });
      }
    });
    return lines;
  }

  // Standard "loading" / "needs setup" panels for dashboard & orders.
  function remoteGate(renderFn) {
    if (remoteConfigured() && remoteState === "idle") {
      remoteState = "loading";
      body().innerHTML = `<div class="ss-panel" style="text-align:center;padding:40px"><div class="ss-pub-dot" style="margin:0 auto 12px;border-color:var(--caramel);border-top-color:transparent;animation:spin .7s linear infinite"></div><p style="color:var(--ink-60)">Loading live orders from your Google Sheet…</p></div>`;
      loadRemote().finally(renderFn);
      return true;
    }
    return false;
  }
  function sourceBanner() {
    if (!remoteConfigured()) {
      return `<div class="ss-livebar" style="background:var(--cream-3);color:var(--caramel)">📋 Showing only orders from <strong>this device</strong>. To see <strong>all</strong> customer orders &amp; revenue here, set up the live link in <a href="#settings" data-gosettings>Settings → Live orders</a>.</div>`;
    }
    if (remoteState === "error") {
      return `<div class="ss-livebar" style="background:#f5d9d2;color:var(--err)">⚠️ Couldn't load live orders (${esc(remoteErr)}). Check your read key in Settings, or that the Apps Script was re-deployed. Showing device orders for now.</div>`;
    }
    if (remoteState === "ok") {
      return `<div class="ss-livebar">🟢 Live: showing <strong>all ${remoteOrders.length} order(s)</strong> from your Google Sheet. <a href="#" data-refresh>Refresh</a></div>`;
    }
    return "";
  }
  function wireBanner() {
    const gs = body().querySelector("[data-gosettings]"); if (gs) gs.onclick = e => { e.preventDefault(); go("settings"); };
    const rf = body().querySelector("[data-refresh]"); if (rf) rf.onclick = e => { e.preventDefault(); refreshRemote(); };
  }

  /* ----------------------------------------------------------- gate - */
  if (sessionStorage.getItem(AUTH) === "1") boot(); else gate();

  function passcode() { return (SS.getSettings().admin || {}).passcode || SS_SETTINGS.admin.passcode; }
  function gate() {
    root.innerHTML = `<div class="ss-backend-gate-wrap"><div class="ss-admin-gate">
      <div style="font-size:2.2rem">🔐</div>
      <h2>Second Scoop Backend</h2>
      <p style="color:var(--ink-60);font-size:.9rem">Private. Enter your passcode.</p>
      <input class="ss-field" id="b-pass" type="password" placeholder="Passcode">
      <button class="ss-btn ss-btn--block" id="b-login">Enter</button>
      <p id="b-err" style="color:var(--err);font-size:.85rem;min-height:1.2em;margin-top:.6em"></p>
    </div></div>`;
    const go = () => {
      if (document.getElementById("b-pass").value === passcode()) { sessionStorage.setItem(AUTH, "1"); boot(); }
      else document.getElementById("b-err").textContent = "Wrong passcode.";
    };
    document.getElementById("b-login").onclick = go;
    document.getElementById("b-pass").onkeydown = e => { if (e.key === "Enter") go(); };
  }

  // Strip any stale embedded images (data: URLs) — these used to bloat
  // localStorage and break saving. Everything now lives on GitHub as a
  // filename, so any data: URL is leftover junk safe to drop. Returns count.
  function stripDataUrls(obj) {
    let n = 0;
    (function walk(o) {
      if (!o || typeof o !== "object") return;
      Object.keys(o).forEach(k => {
        const v = o[k];
        if (typeof v === "string" && v.slice(0, 5) === "data:" && v.length > 512) { o[k] = ""; n++; }
        else if (v && typeof v === "object") walk(v);
      });
    })(obj);
    return n;
  }

  /* ----------------------------------------------------------- boot - */
  function boot() {
    cat = clone(SS.getCatalog());
    vault = clone(SS.getVault());
    content = clone(SS.getContent());
    settings = clone(SS.getSettings());
    // auto-heal: clear any old embedded-image bloat so saving always works
    const cleaned = stripDataUrls(content) + stripDataUrls(cat);
    if (cleaned) {
      SS.saveContent(content); SS.saveCatalog(cat);
      setTimeout(() => { if (window.SSApp && SSApp.toast) SSApp.toast("Cleared " + cleaned + " old embedded image(s) that were blocking saves. Re-upload any photo that's now missing.", "ok"); }, 800);
    }
    announce = {}; regionView = {};
    REGION_IDS.forEach(rid => {
      announce[rid] = clone(SS.getAnnounce(rid) || { enabled: false, style: "available", text: "" });
      regionView[rid] = clone(SS.regionById(rid));
    });
    if (window.SSApp && SSApp.applyTheme) SSApp.applyTheme();   // preview saved colours
    renderShell();
  }

  function persistCatalog() { stripDataUrls(cat); return SS.saveCatalog(cat); }
  function persistVault() { SS.saveVault(vault); }
  function persistAnnounce() { REGION_IDS.forEach(rid => SS.saveAnnounce(rid, announce[rid])); }
  function persistContent() { stripDataUrls(content); return SS.saveContent(content); }
  function persistSettings() { SS.saveSettings(settings); }

  /* ---------------------------------------------------------- shell - */
  function renderShell() {
    root.innerHTML = `
      <div class="ss-bk">
        <aside class="ss-bk-side">
          <a class="ss-bk-brand" href="#dashboard">${SSApp.logoMarkSVG(30)}<span>Second Scoop<small>Store admin</small></span></a>
          <nav class="ss-bk-nav">
            ${NAV_GROUPS.map(g => `<div class="ss-bk-navgroup">
              <span class="ss-bk-navlabel">${g.label}</span>
              ${g.items.map(id => { const n = NAV.find(x => x.id === id); return n ? `<button class="ss-bk-link${section === n.id ? " is-active" : ""}" data-sec="${n.id}"><span class="ss-bk-ico">${n.icon}</span>${n.label}</button>` : ""; }).join("")}
            </div>`).join("")}
          </nav>
          <div class="ss-bk-side-foot">
            <a class="ss-bk-link" href="index.html?preview=1" target="_blank">👁️ Preview draft</a>
            <a class="ss-bk-link" href="index.html" target="_blank">🌐 View live site</a>
            <button class="ss-bk-link" id="bk-logout">🚪 Log out</button>
          </div>
        </aside>
        <main class="ss-bk-main">
          <div class="ss-bk-topbar">
            <button class="ss-bk-burger" id="bk-burger">☰</button>
            <h2 id="bk-title">${(NAV.find(n => n.id === section) || NAV[0]).label}</h2>
            <span class="ss-bk-live" id="bk-live"></span>
            <a class="ss-btn ss-btn--sm ss-btn--ghost ss-bk-preview" href="index.html?preview=1" target="_blank" rel="noopener">👁️ Preview</a>
            <button class="ss-btn ss-btn--sm ss-bk-publish" id="bk-publish">⤴ Publish to live site</button>
          </div>
          <div class="ss-bk-body" id="bk-body"></div>
        </main>
      </div>`;
    root.querySelectorAll("[data-sec]").forEach(b => b.onclick = () => go(b.getAttribute("data-sec")));
    document.getElementById("bk-logout").onclick = () => { sessionStorage.removeItem(AUTH); gate(); };
    document.getElementById("bk-burger").onclick = () => root.querySelector(".ss-bk-side").classList.toggle("open");
    document.getElementById("bk-publish").onclick = doPublish;
    updateLiveBadge();
    renderSection();
  }
  function go(sec) { section = sec; location.hash = sec; renderShell(); }
  function updateLiveBadge() {
    const live = SS.hasOverride() || ["ss_vault_override", "ss_announce_override", "ss_content_override", "ss_settings_override", "ss_region_overrides"].some(k => localStorage.getItem(k));
    const el = document.getElementById("bk-live");
    if (el) el.innerHTML = live ? `🟢 Live preview — unsaved to files <a href="#export" data-sec="export">Export</a>` : "";
    if (el) el.querySelectorAll("[data-sec]").forEach(b => b.onclick = e => { e.preventDefault(); go("export"); });
  }
  function body() { return document.getElementById("bk-body"); }

  // True in-browser phone preview: an iframe at phone width renders the mobile
  // layout (media queries respond to the iframe's own width).
  function openMobilePreview(url) {
    url = url || "index.html?preview=1";
    const old = document.getElementById("ss-mobprev"); if (old) old.remove();
    const m = document.createElement("div");
    m.id = "ss-mobprev"; m.className = "ss-mobprev";
    m.innerHTML = `<div class="ss-mobprev-bd"></div>
      <div class="ss-mobprev-inner">
        <div class="ss-mobprev-bar"><strong>📱 Mobile preview</strong>
          <span style="flex:1"></span>
          <a href="${url}" target="_blank" rel="noopener" class="ss-chip">Open full tab</a>
          <button class="ss-chip" id="mobprev-close">✕ Close</button></div>
        <div class="ss-phone"><div class="ss-phone-notch"></div><iframe src="${url}" title="Mobile preview"></iframe></div>
      </div>`;
    document.body.appendChild(m);
    m.querySelector(".ss-mobprev-bd").onclick = () => m.remove();
    m.querySelector("#mobprev-close").onclick = () => m.remove();
  }

  function renderSection() {
    const map = { dashboard: renderDashboard, orders: renderOrders, mailing: renderMailing, messages: renderMessages, reviews: renderReviews, products: renderProducts,
       homepage: renderHomepage, about: renderAbout, faq: renderFaq, contact: renderContact, preorders: renderPreorders,
       popups: renderPopups, shoptext: renderShopText, menu: renderMenu, vault: renderVault, design: renderDesign, announce: renderAnnounce,
       bundles: renderBundles, settings: renderSettings, export: renderExport };
    const fn = map[section] || renderDashboard;
    try {
      fn();
    } catch (err) {
      // never leave a blank screen — show what went wrong so it can be fixed
      const b = body();
      if (b) b.innerHTML = `<div class="ss-panel"><h3>⚠️ This tab hit an error</h3>
        <p style="color:var(--ink-60)">Something in this section's saved data couldn't load. Your other tabs and your live site are unaffected.</p>
        <pre style="white-space:pre-wrap;background:var(--cream-2);padding:10px;border-radius:8px;font-size:.8rem">${String(err && err.stack || err)}</pre>
        <p style="color:var(--ink-60);font-size:.9rem">If this persists, your <code>backend.html</code> or <code>assets/js/pages/backend.js</code> may not have copied over completely — re-copy the full file and hard-refresh (⌘⇧R).</p></div>`;
      try { console.error("renderSection error:", err); } catch (e) {}
    }
  }

  /* ===================================================== DASHBOARD == */
  // Robustly parse the many date shapes a sheet can hold (ISO, "YYYY-MM-DD
  // HH:MM:SS", date-only, and DD/MM/YYYY) as LOCAL time, so month/week buckets
  // never drift across a timezone or a flipped day/month.
  function parseOrderDate(ts) {
    if (ts instanceof Date) return ts;
    const s = String(ts == null ? "" : ts).trim();
    if (!s) return new Date(NaN);
    // Bucket by the date AS WRITTEN — take the calendar Y-M-D (and time) from the
    // string literally, with NO timezone conversion, so a 30 June order can never
    // slide into July because of the viewer's timezone.
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6] || 0);
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);   // DD/MM/YYYY (PK) — default day-first
    if (m) { let a = +m[1], b = +m[2], y = +m[3], day = a, mon = b; if (a > 12 && b <= 12) { day = a; mon = b; } else if (b > 12 && a <= 12) { day = b; mon = a; } return new Date(y, mon - 1, day); }
    return new Date(s);
  }
  // TRUEST order date: the order number (SS-YYMMDD-####) is stamped in the
  // customer's local time the instant they order, so it never drifts across
  // timezones the way a sheet timestamp can. Use it first; fall back to the
  // submission timestamp only when the number can't be read.
  function orderDateOf(o) {
    const num = String((o && o.orderNumber) || "");
    const m = num.match(/(\d{2})(\d{2})(\d{2})-\d+\s*$/);   // …-YYMMDD-####
    if (m) {
      const d = new Date(2000 + +m[1], +m[2] - 1, +m[3]);
      if (!isNaN(d) && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31) return d;
    }
    return parseOrderDate(o && o.timestamp);
  }
  function inRange(ts, kind) {
    const d = parseOrderDate(ts); if (isNaN(d)) return false;
    const now = new Date();
    if (kind === "today") return d.toDateString() === now.toDateString();
    if (kind === "week") { const wk = new Date(now); wk.setHours(0, 0, 0, 0); wk.setDate(wk.getDate() - 6); return d >= wk; }
    if (kind === "month") { const m0 = new Date(now.getFullYear(), now.getMonth(), 1); return d >= m0; }   // 1st of this month → now
    if (kind === "lastmonth") { const m0 = new Date(now.getFullYear(), now.getMonth() - 1, 1); const m1 = new Date(now.getFullYear(), now.getMonth(), 1); return d >= m0 && d < m1; }
    if (kind === "year") { const y0 = new Date(now.getFullYear(), 0, 1); return d >= y0; }
    return true;
  }
  // An order is CANCELLED (ignore entirely) or non-revenue (COMP / REFUND):
  // counted as fulfilled but excluded from revenue.
  function isCancelled(o) { return o.orderStatus === "Cancelled" || /cancel/i.test(o.paymentStatus || ""); }
  function isComped(o) { return /comp/i.test(o.paymentStatus || ""); }
  function noRevenue(o) { return isCancelled(o) || isComped(o) || /refund/i.test(o.paymentStatus || ""); }

  function compute(orders) {
    const valid = orders.filter(o => !isCancelled(o));        // active (made) orders
    const rev = orders.filter(o => !noRevenue(o));            // revenue-earning orders
    const comped = orders.filter(o => isComped(o) && !isCancelled(o));
    const byRegion = { pakistan: [], toronto: [] }, revByRegion = { pakistan: [], toronto: [] };
    valid.forEach(o => { if (byRegion[o.region]) byRegion[o.region].push(o); });
    rev.forEach(o => { if (revByRegion[o.region]) revByRegion[o.region].push(o); });
    const prodAgg = {}, catAgg = {};
    valid.forEach(o => o.lines.forEach(l => {
      const earns = !noRevenue(o);
      const k = o.region + "|" + l.id;
      if (!prodAgg[k]) prodAgg[k] = { region: o.region, id: l.id, name: l.name, qty: 0, revenue: 0 };
      prodAgg[k].qty += l.qty; if (earns) prodAgg[k].revenue += l.lineTotal;
      const p = SS.getProduct(l.id), cat2 = p ? p.category : "other", ck = o.region + "|" + cat2;
      if (!catAgg[ck]) catAgg[ck] = { region: o.region, cat: cat2, revenue: 0, qty: 0 };
      catAgg[ck].qty += l.qty; if (earns) catAgg[ck].revenue += l.lineTotal;
    }));
    return { valid, rev, comped, byRegion, revByRegion, prodAgg, catAgg, revenue: a => a.reduce((s, o) => s + o.grandTotal, 0) };
  }
  function inventoryRows() {
    const rows = [];
    SS.getCatalog().forEach(p => Object.keys(p.regions || {}).forEach(rid =>
      rows.push({ name: p.name, region: rid, status: p.regions[rid].status, inv: p.regions[rid].inventory })));
    return rows;
  }
  function kpi(label, value, sub, accent) {
    return `<div class="ss-kpi${accent ? " ss-kpi--accent" : ""}"><div class="ss-kpi-label">${label}</div>
      <div class="ss-kpi-value">${value}</div>${sub ? `<div class="ss-kpi-sub">${sub}</div>` : ""}</div>`;
  }
  function revLabel(list) {
    const p = list.filter(o => o.region === "pakistan").reduce((s, o) => s + o.grandTotal, 0);
    const t = list.filter(o => o.region === "toronto").reduce((s, o) => s + o.grandTotal, 0);
    const parts = []; if (p) parts.push(SS.money(p, "pakistan")); if (t) parts.push(SS.money(t, "toronto"));
    return parts.length ? parts.join(" + ") : SS.money(0, "pakistan");
  }
  // Delivery charges collected (kept separate from product revenue).
  function delLabel(list) {
    const p = list.filter(o => o.region === "pakistan").reduce((s, o) => s + (Number(o.deliveryFee) || 0), 0);
    const t = list.filter(o => o.region === "toronto").reduce((s, o) => s + (Number(o.deliveryFee) || 0), 0);
    const parts = []; if (p) parts.push(SS.money(p, "pakistan")); if (t) parts.push(SS.money(t, "toronto"));
    return parts.length ? parts.join(" + ") : SS.money(0, "pakistan");
  }
  function blendedAOV(byRegion) {
    const parts = [];
    REGION_IDS.forEach(rid => { const a = byRegion[rid]; if (a && a.length) parts.push(SS.money(a.reduce((s, o) => s + o.grandTotal, 0) / a.length, rid)); });
    return parts.length ? parts.join(" / ") : SS.money(0, "pakistan");
  }

  function renderDashboard() {
    if (remoteGate(renderDashboard)) return;
    const orders = dataOrders();
    if (!orders.length) {
      body().innerHTML = sourceBanner() + `<div class="ss-admin-gate" style="max-width:520px;margin:30px auto">
        <div style="font-size:2.4rem">📊</div><h2>No orders yet</h2>
        <p style="color:var(--ink-60)">${remoteConfigured() ? "No orders in your sheet yet. They'll appear here as customers order." : "Real orders appear here once your store is live. Want to explore the analytics now?"}</p>
        ${remoteConfigured() ? "" : `<button class="ss-btn ss-btn--block" id="seed">Load demo orders</button>
        <p class="ss-seed" style="margin-top:1em">Adds sample orders locally. Remove anytime with “Clear demo data”.</p>`}</div>`;
      const sb = document.getElementById("seed"); if (sb) sb.onclick = () => { seedDemo(); updateLiveBadge(); renderDashboard(); };
      wireBanner();
      return;
    }
    const c = compute(orders), customers = remoteConfigured() ? remoteCustomers(orders) : SS.getCustomers();
    const today = c.rev.filter(o => inRange(orderDateOf(o), "today"));
    const week = c.rev.filter(o => inRange(orderDateOf(o), "week"));
    const month = c.rev.filter(o => inRange(orderDateOf(o), "month"));
    const lastMonth = c.rev.filter(o => inRange(orderDateOf(o), "lastmonth"));
    const year = c.rev.filter(o => inRange(orderDateOf(o), "year"));
    const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const nowM = new Date().getMonth();
    const thisMonName = MON[nowM], lastMonName = MON[(nowM + 11) % 12];
    const monthKeyOf = o => { const d = orderDateOf(o); return isNaN(d) ? null : d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };
    const monthLabel = k => { const p = String(k).split("-"); return MON[+p[1] - 1] + " " + p[0]; };
    const monthKeys = Array.from(new Set(c.rev.map(o => monthKeyOf(o)).filter(Boolean))).sort().reverse();
    const statusCount = {}; orders.forEach(o => statusCount[o.orderStatus] = (statusCount[o.orderStatus] || 0) + 1);
    const pending = (statusCount.New || 0) + (statusCount.Confirmed || 0) + (statusCount.Preparing || 0) + (statusCount.Ready || 0);
    const compedValue = c.comped.reduce((s, o) => s + o.grandTotal, 0);

    const prodList = Object.values(c.prodAgg).reduce((acc, p) => {
      const e = acc.find(a => a.id === p.id); if (e) e.qty += p.qty; else acc.push({ id: p.id, name: p.name, qty: p.qty }); return acc;
    }, []).sort((a, b) => b.qty - a.qty);
    const best = prodList.slice(0, 5), lowest = prodList.slice().reverse().slice(0, 5);
    const cust = Object.values(customers);
    const inv = inventoryRows();
    const lowStock = inv.filter(r => (r.status === "available" || r.status === "preorder") && r.inv > 0 && r.inv <= 10);
    const soldOut = inv.filter(r => r.status === "sold-out");

    body().innerHTML = `
      ${sourceBanner()}
      <div class="ss-bk-actionbar">
        <button class="ss-chip" id="d-refresh">↻ ${remoteConfigured() ? "Refresh from sheet" : "Refresh"}</button>
        <button class="ss-chip" id="d-export">⤓ Export orders CSV</button>
        ${orders.some(o => o._demo) ? `<button class="ss-chip ss-chip--danger" id="d-clear">✕ Clear demo data</button>` : ""}
      </div>
      <h3 class="ss-bk-h">Revenue</h3>
      <div class="ss-kpi-grid">
        ${kpi("Today", revLabel(today), today.length + " orders")}
        ${kpi("This Week", revLabel(week), week.length + " orders")}
        ${kpi("This Month · " + thisMonName, revLabel(month), month.length + " orders")}
        ${kpi("Last Month · " + lastMonName, revLabel(lastMonth), lastMonth.length + " orders")}
        ${kpi("This Year", revLabel(year), year.length + " paid orders", true)}
      </div>
      <div class="ss-kpi-grid">
        ${kpi("Total Orders", orders.length, c.valid.length + " active · " + (orders.length - c.valid.length) + " cancelled")}
        ${kpi("Pending", pending, "in progress")}
        ${kpi("Completed", statusCount.Delivered || 0, "delivered")}
        ${kpi("Comped", c.comped.length, compedValue ? SS.money(compedValue, "pakistan") + " given free" : "free orders")}
        ${kpi("Avg Order Value", blendedAOV(c.revByRegion), "products only")}
      </div>
      <div class="ss-kpi-grid">
        ${kpi("Delivery Charges", delLabel(c.rev), "collected (separate from products)", true)}
        ${kpi("This Month — Delivery", delLabel(month), "delivery fees this month")}
        ${kpi("This Year — Delivery", delLabel(year), "delivery fees this year")}
      </div>

      <div class="ss-panel" style="margin-bottom:0"><h3>📅 Browse a specific month</h3>
        <p style="color:var(--ink-60);font-size:.9rem">Pick any month to see its revenue, delivery charges, orders — and units sold of each product.</p>
        <select class="ss-field" id="dash-month" style="max-width:240px">
          ${monthKeys.length ? monthKeys.map(k => `<option value="${k}">${monthLabel(k)}</option>`).join("") : `<option value="">No dated orders yet</option>`}
        </select>
        <div id="dash-month-out" style="margin-top:14px"></div>
      </div>

      <div class="ss-admin-cols">
        <div class="ss-panel"><h3>Regional Performance <span class="ss-seed">(revenue excludes comp/cancelled)</span></h3>
          <table class="ss-table"><tr><th>Region</th><th>Orders</th><th>Revenue</th><th>AOV</th></tr>
          ${REGION_IDS.map(rid => regionRow(rid, c.byRegion[rid] || [], c.revByRegion[rid] || [])).join("")}</table></div>
        <div class="ss-panel"><h3>Revenue by Category</h3>${catBars(c)}</div>
      </div>
      <div class="ss-admin-cols">
        <div class="ss-panel"><h3>Best Sellers <span class="ss-seed">(units)</span></h3>${rankBars(best, prodList[0] ? prodList[0].qty : 1)}</div>
        <div class="ss-panel"><h3>Lowest Sellers</h3>${rankBars(lowest, prodList[0] ? prodList[0].qty : 1)}</div>
      </div>
      <div class="ss-admin-cols">
        <div class="ss-panel"><h3>Customers</h3><div class="ss-kpi-grid" style="margin:0">
          ${kpi("Returning", cust.filter(x => x.orders > 1).length, "2+ orders")}
          ${kpi("New", cust.filter(x => x.orders === 1).length, "first order")}
          ${kpi("Pickup", c.valid.filter(o => o.customer.fulfilment === "pickup").length, "orders")}
          ${kpi("Delivery", c.valid.filter(o => o.customer.fulfilment === "delivery").length, "orders")}
        </div></div>
        <div class="ss-panel"><h3>Inventory</h3>
          <div class="ss-summary-row"><span>Low stock alerts</span><span class="${lowStock.length ? "ss-low-alert" : ""}">${lowStock.length}</span></div>
          <div class="ss-summary-row"><span>Sold-out lines</span><span>${soldOut.length}</span></div>
          ${lowStock.length ? `<div style="margin-top:10px;font-size:.82rem">${lowStock.map(r => `⚠️ <strong>${r.name}</strong> — ${SS_REGIONS[r.region].name}: ${r.inv} left`).join("<br>")}</div>` : ""}
        </div>
      </div>
      <div class="ss-panel"><h3>Monthly Revenue <span class="ss-seed">(comp &amp; cancelled excluded)</span></h3>${monthlyRevenue(c.rev)}</div>
      <div class="ss-panel"><h3>Revenue by Product</h3>
        <table class="ss-table"><tr><th>Product</th><th>Region</th><th>Units</th><th>Revenue</th></tr>
        ${Object.values(c.prodAgg).sort((a, b) => b.revenue - a.revenue).map(p =>
          `<tr><td>${p.name}</td><td>${SS_REGIONS[p.region].flag} ${SS_REGIONS[p.region].name}</td><td>${p.qty}</td><td>${SS.money(p.revenue, p.region)}</td></tr>`).join("")}</table></div>`;
    document.getElementById("d-refresh").onclick = () => remoteConfigured() ? refreshRemote(renderDashboard) : renderDashboard();
    document.getElementById("d-export").onclick = exportCSV;
    const dc = document.getElementById("d-clear");
    if (dc) dc.onclick = () => { clearDemo(); updateLiveBadge(); renderDashboard(); };

    // month picker: revenue + delivery + units per product for the chosen month
    const mSel = document.getElementById("dash-month");
    if (mSel) {
      const showMonth = () => {
        const k = mSel.value, out = document.getElementById("dash-month-out");
        if (!k) { out.innerHTML = `<p class="ss-seed">No dated orders yet.</p>`; return; }
        const list = c.rev.filter(o => monthKeyOf(o) === k);
        // units + revenue per product for this month
        const agg = {};
        list.forEach(o => o.lines.forEach(l => {
          const key = o.region + "|" + l.name;
          if (!agg[key]) agg[key] = { name: l.name, region: o.region, qty: 0, revenue: 0 };
          agg[key].qty += Number(l.qty) || 0; agg[key].revenue += Number(l.lineTotal) || 0;
        }));
        const rows = Object.values(agg).sort((a, b) => b.qty - a.qty);
        out.innerHTML = `
          <div class="ss-kpi-grid" style="margin:0 0 14px">
            ${kpi("Revenue", revLabel(list), list.length + " paid orders")}
            ${kpi("Delivery charges", delLabel(list), "collected")}
            ${kpi("Orders", list.length, monthLabel(k))}
          </div>
          <table class="ss-table"><tr><th>Product</th><th>Region</th><th>Units sold</th><th>Revenue</th></tr>
          ${rows.length ? rows.map(p => `<tr><td>${esc(p.name)}</td><td>${SS_REGIONS[p.region] ? SS_REGIONS[p.region].flag + " " + SS_REGIONS[p.region].name : p.region}</td><td><strong>${p.qty}</strong></td><td>${SS.money(p.revenue, p.region)}</td></tr>`).join("") : `<tr><td colspan="4" style="text-align:center;color:var(--ink-40);padding:16px">No paid orders in ${monthLabel(k)}.</td></tr>`}
          </table>`;
      };
      mSel.onchange = showMonth; showMonth();
    }
    wireBanner();
  }

  // Month-by-month revenue table (per region), newest first.
  function monthlyRevenue(valid) {
    const byMonth = {};
    valid.forEach(o => {
      const d = orderDateOf(o); if (isNaN(d)) return;
      const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      byMonth[key] = byMonth[key] || { pakistan: 0, toronto: 0, count: 0 };
      byMonth[key][o.region] = (byMonth[key][o.region] || 0) + o.grandTotal;
      byMonth[key].count++;
    });
    const keys = Object.keys(byMonth).sort().reverse();
    if (!keys.length) return `<p class="ss-seed">No dated orders yet.</p>`;
    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `<table class="ss-table"><tr><th>Month</th><th>Orders</th><th>Pakistan</th><th>Toronto</th></tr>` +
      keys.map(k => {
        const m = byMonth[k]; const [y, mo] = k.split("-");
        return `<tr><td><strong>${MON[+mo - 1]} ${y}</strong></td><td>${m.count}</td>
          <td>${m.pakistan ? SS.money(m.pakistan, "pakistan") : "—"}</td>
          <td>${m.toronto ? SS.money(m.toronto, "toronto") : "—"}</td></tr>`;
      }).join("") + `</table>`;
  }

  // Build customer metrics from the live orders (by email).
  function remoteCustomers(orders) {
    const map = {};
    orders.forEach(o => {
      const k = (o.customer.email || o.customer.phone || o.orderNumber).toLowerCase();
      if (!map[k]) map[k] = { name: o.customer.name, region: o.region, orders: 0 };
      map[k].orders++;
    });
    return map;
  }
  function regionRow(rid, allArr, revArr) {
    revArr = revArr || allArr;
    const rev = revArr.reduce((s, o) => s + o.grandTotal, 0), aov = revArr.length ? rev / revArr.length : 0, r = SS_REGIONS[rid];
    return `<tr><td>${r.flag} ${r.name}</td><td>${allArr.length}</td><td>${SS.money(rev, rid)}</td><td>${SS.money(aov, rid)}</td></tr>`;
  }
  function catBars(c) {
    const agg = {}; Object.values(c.catAgg).forEach(x => agg[x.cat] = (agg[x.cat] || 0) + x.qty);
    const entries = Object.entries(agg).sort((a, b) => b[1] - a[1]); const max = entries.length ? entries[0][1] : 1;
    if (!entries.length) return `<p class="ss-seed">No sales yet.</p>`;
    return entries.map(([cat2, qty]) => `<div class="ss-bar-row"><span>${SS.categoryName(cat2)}</span>
      <div class="ss-bar-track"><div class="ss-bar-fill" style="width:${Math.round(qty / max * 100)}%"></div></div><span>${qty}</span></div>`).join("");
  }
  function rankBars(list, max) {
    if (!list.length) return `<p class="ss-seed">No sales yet.</p>`;
    return list.map(p => `<div class="ss-bar-row"><span>${p.name}</span>
      <div class="ss-bar-track"><div class="ss-bar-fill" style="width:${Math.round(p.qty / (max || 1) * 100)}%"></div></div><span>${p.qty}</span></div>`).join("");
  }

  /* ======================================================== ORDERS == */
  function renderOrders() {
    if (remoteGate(renderOrders)) return;
    const all = dataOrders();
    const f = orderFilters;
    const list = all.filter(o => {
      if (f.region !== "all" && o.region !== f.region) return false;
      if (f.status !== "all" && o.orderStatus !== f.status) return false;
      if (f.q) { const blob = (o.orderNumber + " " + o.customer.name + " " + o.customer.phone + " " + o.customer.email).toLowerCase(); if (!blob.includes(f.q)) return false; }
      return true;
    }).slice().reverse();

    const isRemote = Array.isArray(remoteOrders);
    body().innerHTML = `
      ${sourceBanner()}
      <div class="ss-bk-actionbar">
        <div class="ss-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="m20 20-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <input id="o-q" type="search" placeholder="Search name, phone, order #…" value="${esc(f.q)}"></div>
        <select class="ss-field ss-field--sm" id="o-region" style="width:auto"><option value="all">All regions</option>${REGION_IDS.map(rid => `<option value="${rid}" ${f.region === rid ? "selected" : ""}>${SS_REGIONS[rid].name}</option>`).join("")}</select>
        ${isRemote ? `<button class="ss-chip" id="o-refresh">↻ Refresh from sheet</button>` : `<select class="ss-field ss-field--sm" id="o-status" style="width:auto"><option value="all">All statuses</option>${ORDER_STATUSES.map(s => `<option ${f.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>`}
        <button class="ss-chip" id="o-export">⤓ CSV</button>
        ${(isRemote || all.some(o => o._demo)) ? "" : `<button class="ss-chip" id="o-seed">＋ Demo data</button>`}
      </div>
      <div class="ss-panel" style="padding:0;overflow:hidden"><div style="overflow-x:auto">
      <table class="ss-table"><tr><th>Order #</th><th>Date</th><th>Customer</th><th>Region</th><th>Items</th><th>Total</th><th>Type</th><th>Pickup/Delivery date</th><th>Status</th><th>Payment</th></tr>
      ${list.length ? list.map(orderRow).join("") : `<tr><td colspan="10" style="text-align:center;padding:30px;color:var(--ink-40)">No orders match.</td></tr>`}
      </table></div></div>
      <p class="ss-seed" style="margin-top:10px">${list.length} order(s) shown. ${isRemote ? "Change the <strong>Payment</strong> dropdown to update that order right in your Google Sheet." : "Change a status from the dropdowns — it updates instantly and feeds the dashboard."}</p>`;

    const q = document.getElementById("o-q");
    q.oninput = () => { orderFilters.q = q.value.toLowerCase().trim(); const p = q.selectionStart; renderOrders(); const n = document.getElementById("o-q"); n.focus(); n.setSelectionRange(p, p); };
    document.getElementById("o-region").onchange = e => { orderFilters.region = e.target.value; renderOrders(); };
    const os = document.getElementById("o-status"); if (os) os.onchange = e => { orderFilters.status = e.target.value; renderOrders(); };
    const orf = document.getElementById("o-refresh"); if (orf) orf.onclick = () => refreshRemote(renderOrders);
    // editable Order Status + Payment for live (sheet) orders → writes back to the sheet
    body().querySelectorAll("select.ss-status-edit").forEach(sel => {
      let prev = sel.value;
      const field = sel.getAttribute("data-field");
      sel.onchange = () => {
        const num = sel.getAttribute("data-remote-order"), value = sel.value;
        sel.disabled = true; SSApp.toast("Saving to sheet…");
        setRemoteStatus(num, value, field).then(() => {
          const o = (remoteOrders || []).find(o => o.orderNumber === num);
          if (o) { if (field === "payment") o.paymentStatus = value; else o.orderStatus = value; }
          prev = value; sel.disabled = false;
          SSApp.toast("Updated in your sheet ✓", "ok");
        }).catch(err => { sel.value = prev; sel.disabled = false; SSApp.toast("Couldn't update: " + err, "err"); });
      };
    });
    document.getElementById("o-export").onclick = exportCSV;
    const sd = document.getElementById("o-seed"); if (sd) sd.onclick = () => { seedDemo(); updateLiveBadge(); renderOrders(); };
    wireBanner();
    body().querySelectorAll("select[data-order]").forEach(sel => sel.onchange = () => {
      SS.updateOrderStatus(sel.getAttribute("data-order"), sel.getAttribute("data-field"), sel.value);
      SSApp.toast("Status updated", "ok"); renderOrders();
    });
  }
  function orderRow(o) {
    const d = orderDateOf(o), r = SS_REGIONS[o.region] || SS_REGIONS.pakistan;
    const items = o.lines.map(l => `${l.qty}× ${l.name}`).join(", ");
    const dateStr = isNaN(d) ? esc(String(o.timestamp || "")) : d.toLocaleDateString();
    const pd = o.customer.preferredDate || o.preferredDate || "";
    const pdd = parseOrderDate(pd);
    const pdStr = pd && !isNaN(pdd) ? pdd.toLocaleDateString() : (pd ? esc(String(pd)) : "—");
    let statusCell;
    if (o._remote) {
      const payOpts = SHEET_PAY.slice();
      if (o.paymentStatus && payOpts.indexOf(o.paymentStatus) < 0) payOpts.unshift(o.paymentStatus);
      const ordOpts = SHEET_ORDER.slice();
      if (o.orderStatus && ordOpts.indexOf(o.orderStatus) < 0) ordOpts.unshift(o.orderStatus);
      statusCell = `<td><select class="ss-status-edit" data-remote-order="${esc(o.orderNumber)}" data-field="order">${ordOpts.map(s => `<option ${s === o.orderStatus ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></td>
         <td><select class="ss-status-edit" data-remote-order="${esc(o.orderNumber)}" data-field="payment">${payOpts.map(s => `<option ${s === o.paymentStatus ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></td>`;
    } else {
      statusCell = `<td><select data-order="${o.orderNumber}" data-field="orderStatus">${ORDER_STATUSES.map(s => `<option ${s === o.orderStatus ? "selected" : ""}>${s}</option>`).join("")}</select></td>
         <td><select data-order="${o.orderNumber}" data-field="paymentStatus">${PAY_STATUSES.map(s => `<option ${s === o.paymentStatus ? "selected" : ""}>${s}</option>`).join("")}</select></td>`;
    }
    return `<tr>
      <td><strong>${esc(o.orderNumber)}</strong></td>
      <td>${dateStr}</td>
      <td>${esc(o.customer.name)}<br><span class="ss-seed">${esc(o.customer.phone || "")}</span></td>
      <td>${r.flag} ${r.name}</td>
      <td style="max-width:200px;font-size:.8rem">${esc(items)}${o.vaultProducts ? ` <span class="ss-tag ss-tag--gold">🔒</span>` : ""}</td>
      <td>${SS.money(o.grandTotal, o.region)}</td>
      <td style="text-transform:capitalize">${o.customer.fulfilment}</td>
      <td>${pdStr}</td>
      ${statusCell}
    </tr>`;
  }
  function exportCSV() {
    const orders = dataOrders();
    if (!orders.length) { SSApp.toast("No orders to export", "err"); return; }
    const cols = ["orderNumber", "submissionDate", "region", "firstName", "lastName", "phone", "email", "instagram", "fulfilment", "addressLine1", "addressLine2", "productsFormatted", "preferredMethod", "revenue", "deliveryFee", "grandTotal", "currency", "paymentStatus", "orderStatus", "notes", "vaultProduct"];
    const rows = orders.map(o => { const fl = SS.flattenForSheet(o); return cols.map(k => `"${String(fl[k] ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`).join(","); });
    download("second-scoop-orders.csv", cols.join(",") + "\n" + rows.join("\n"), "text/csv");
  }

  /* ================================================== MAILING LIST == */
  function jsonpSignups() {
    return new Promise((resolve, reject) => {
      const url = (SS.getSettings().googleSheets || {}).webhookUrl;
      const key = SS.read("ss_orders_key", "");
      if (!url || !key) return reject("not configured");
      const cb = "sssig_" + Math.random().toString(36).slice(2);
      const sep = url.indexOf("?") > -1 ? "&" : "?";
      const s = document.createElement("script");
      s.src = url + sep + "action=signups&key=" + encodeURIComponent(key) + "&callback=" + cb;
      let done = false;
      window[cb] = (data) => { done = true; cleanup(); (data && data.ok) ? resolve(data.signups || []) : reject((data && data.error) || "error"); };
      s.onerror = () => { if (!done) { cleanup(); reject("network"); } };
      function cleanup() { try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); }
      document.body.appendChild(s);
      setTimeout(() => { if (!done) { cleanup(); reject("timeout"); } }, 15000);
    });
  }
  // Generic JSONP call to the Apps Script webhook for a mailing/campaign action.
  function jsonpML(params) {
    return new Promise((resolve, reject) => {
      const url = (SS.getSettings().googleSheets || {}).webhookUrl;
      const key = SS.read("ss_orders_key", "");
      if (!url || !key) return reject("not configured");
      const cb = "ssml_" + Math.random().toString(36).slice(2);
      const sep = url.indexOf("?") > -1 ? "&" : "?";
      const qs = Object.keys(params).map(k => k + "=" + encodeURIComponent(params[k])).join("&");
      const s = document.createElement("script");
      s.src = url + sep + "key=" + encodeURIComponent(key) + "&" + qs + "&callback=" + cb;
      let done = false;
      window[cb] = (data) => { done = true; cleanup(); (data && data.ok) ? resolve(data) : reject((data && data.error) || "error"); };
      s.onerror = () => { if (!done) { cleanup(); reject("network"); } };
      function cleanup() { try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); }
      document.body.appendChild(s);
      setTimeout(() => { if (!done) { cleanup(); reject("timeout"); } }, 120000);   // sends can take a while
    });
  }

  // Absolute URL for an image path so it renders inside email clients.
  function absUrl(path) {
    const p = String(path || "");
    if (!p) return "";
    if (/^https?:|^data:/.test(p)) return p;
    return location.origin + "/" + p.replace(/^\//, "");
  }
  function mlProducts() {
    try { return (SS.getCatalog() || []).map(p => ({ id: p.id, name: p.name, image: p.image })); }
    catch (e) { return []; }
  }
  // Prefill templates. {product} is swapped for the chosen product name.
  const ML_TEMPLATES = {
    restock: { label: "🍪 Restock", subject: "It’s back — {product} just restocked", headline: "{product} is back in stock",
      body: "Good news — {product} is back and ready to scoop.\n\nThese sell out fast, so grab yours before it disappears again.", cta: "Order now", path: "shop.html" },
    drop: { label: "🚨 New drop", subject: "New drop: {product} is live", headline: "Fresh drop — {product}",
      body: "We just dropped something new.\n\n{product} is live right now — limited batch. Remember: the first scoop is never enough.", cta: "Shop the drop", path: "shop.html" },
    vault: { label: "🔓 Vault unlock", subject: "A new Vault scoop just unlocked", headline: "Something new in The Vault",
      body: "A secret scoop just landed in The Vault.\n\nMembers only — tap in with your code before it’s gone.", cta: "Enter The Vault", path: "vault.html" },
    custom: { label: "✍️ Custom", subject: "", headline: "", body: "", cta: "Shop now", path: "shop.html" }
  };

  // Build the same branded HTML we send, for the live preview.
  function mlPreviewHtml(f, sampleName) {
    const e = s => esc(String(s == null ? "" : s));
    const first = String(sampleName || "there").split(/\s+/)[0] || "there";
    const bodyHtml = e(f.body).replace(/\n/g, "<br>");
    const img = f.imageUrl ? `<div style="padding:0 0 22px"><img src="${e(f.imageUrl)}" alt="" style="width:100%;max-width:536px;border-radius:14px;display:block"></div>` : "";
    const cta = (f.ctaText && f.ctaUrl) ? `<div style="padding:6px 0 4px"><a href="#" style="background:#b06a2c;color:#fff;text-decoration:none;font-weight:700;padding:14px 30px;border-radius:999px;display:inline-block;font-size:15px">${e(f.ctaText)}</a></div>` : "";
    return `<div style="background:#f4ece0;padding:22px 10px;font-family:Georgia,serif;color:#33241a">
      <div style="max-width:600px;margin:0 auto;background:#fffaf3;border-radius:20px;overflow:hidden;border:1px solid #ecdfcc">
        <div style="background:#33241a;padding:20px;text-align:center"><span style="color:#f4ece0;font-size:22px;font-weight:700">Second Scoop<span style="color:#e0a15e">.</span></span></div>
        <div style="padding:32px 32px 8px">
          <div style="font-size:13px;color:#b06a2c;letter-spacing:2px;text-transform:uppercase;padding-bottom:6px">Hey ${e(first)} 👋</div>
          <div style="font-size:26px;line-height:1.2;font-weight:700;padding-bottom:16px">${e(f.headline) || "<span style='color:#c9b8a1'>Your headline…</span>"}</div>
          ${img}
          <div style="font-size:16px;line-height:1.65;color:#5a4636;padding-bottom:24px">${bodyHtml || "<span style='color:#c9b8a1'>Your message…</span>"}</div>
          ${cta}
        </div>
        <div style="padding:24px 32px 28px;border-top:1px solid #f0e6d6;font-size:12px;color:#9a8871;line-height:1.6">You’re getting this because you joined the Second Scoop list. 🍪<br><span style="text-decoration:underline">Unsubscribe</span></div>
      </div></div>`;
  }

  function renderMailing(prefillArg) {
    const prefill = prefillArg || mlPrefill; mlPrefill = null;
    const products = mlProducts();
    body().innerHTML = `
      <div class="ss-panel">
        <div class="ss-bk-actionbar">
          <h3 style="margin:0">📨 Mailing list <span id="ml-count" class="ss-tag" style="background:#e8dcc8;color:#6b5544"></span></h3>
          <span style="flex:1"></span>
          <button class="ss-btn ss-btn--sm ss-btn--ghost" id="ml-refresh">↻ Refresh</button>
          <button class="ss-btn ss-btn--sm" id="ml-csv">⬇ Export CSV</button>
        </div>
        <p style="color:var(--ink-60);font-size:.9rem">Everyone who joins your list lands here. Compose an announcement below and it emails your subscribers through Brevo — restocks, new drops and Vault unlocks.</p>
        <div id="ml-emailwarn"></div>
        <details style="margin-top:8px">
          <summary style="cursor:pointer;color:var(--caramel);font-weight:700;font-size:.9rem">🔌 How to connect Brevo (one-time)</summary>
          <ol style="color:var(--ink-60);font-size:.88rem;line-height:1.6;margin:.6em 0 0;padding-left:1.2em">
            <li>Make a free account at <b>brevo.com</b>. Under <b>Senders, Domains &amp; Dedicated IPs</b>, add &amp; verify your sender email.</li>
            <li>Go to <b>Settings → SMTP &amp; API → API Keys</b> and create a key.</li>
            <li>Open your Google Apps Script, run the <b>setupEmail()</b> function once, pasting your key + verified sender email.</li>
            <li>Re-deploy the Apps Script as a <b>New version</b>. Send a test below to confirm. ✅</li>
          </ol>
        </details>
        <label class="ss-switch ss-switch--chip" style="margin-top:10px"><input type="checkbox" id="ml-autoannounce"><span>Offer to announce restocks &amp; new drops when I publish</span></label>
      </div>

      <div class="ss-panel" id="ml-compose-panel">
        <h3 style="margin-top:0">✉️ Send an announcement</h3>
        <div class="ss-form-grid" style="gap:14px">
          <div style="grid-column:1/-1">
            <label class="ss-label">Template</label>
            <div class="ss-bk-actionbar" id="ml-tpls" style="gap:8px;flex-wrap:wrap">
              ${Object.keys(ML_TEMPLATES).map(k => `<button type="button" class="ss-chip" data-tpl="${k}">${ML_TEMPLATES[k].label}</button>`).join("")}
            </div>
          </div>
          <div>
            <label class="ss-label">Feature a product <span style="color:var(--ink-40);font-weight:500">(optional — fills name, image &amp; link)</span></label>
            <select class="ss-field" id="ml-product"><option value="">— none —</option>
              ${products.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}</select>
          </div>
          <div>
            <label class="ss-label">Audience</label>
            <select class="ss-field" id="ml-audience">
              <option value="all">Everyone</option>
              <option value="pakistan">Pakistan only</option>
              <option value="toronto">Toronto only</option>
            </select>
            <small style="color:var(--ink-60)" id="ml-aud-count">—</small>
          </div>
          <div style="grid-column:1/-1"><label class="ss-label">Subject line</label>
            <input class="ss-field" id="ml-subject" maxlength="180" placeholder="It’s back — The OG Scoopie just restocked"></div>
          <div style="grid-column:1/-1"><label class="ss-label">Headline (big text in the email)</label>
            <input class="ss-field" id="ml-headline" maxlength="120" placeholder="The OG Scoopie is back in stock"></div>
          <div style="grid-column:1/-1"><label class="ss-label">Message</label>
            <textarea class="ss-field" id="ml-msg" rows="5" maxlength="800" placeholder="Write your announcement…"></textarea></div>
          <div><label class="ss-label">Button text</label>
            <input class="ss-field" id="ml-cta" maxlength="40" placeholder="Order now"></div>
          <div><label class="ss-label">Button link</label>
            <input class="ss-field" id="ml-ctaurl" placeholder="${location.origin}/shop.html"></div>
          <div style="grid-column:1/-1"><label class="ss-label">Image URL <span style="color:var(--ink-40);font-weight:500">(optional)</span></label>
            <input class="ss-field" id="ml-img" placeholder="https://second-scoop.com/assets/img/…"></div>
        </div>
        <div class="ss-bk-actionbar" style="margin-top:16px;gap:10px;flex-wrap:wrap">
          <input class="ss-field" id="ml-test-email" placeholder="your@email.com" style="max-width:220px">
          <button class="ss-btn ss-btn--sm ss-btn--ghost" id="ml-test">Send test to me</button>
          <span style="flex:1"></span>
          <button class="ss-btn ss-btn--lg" id="ml-send">Send to <span id="ml-send-n">list</span> →</button>
        </div>
      </div>

      <div class="ss-panel">
        <h3 style="margin-top:0">👀 Live preview</h3>
        <div id="ml-preview" style="border-radius:14px;overflow:hidden;border:1px solid var(--line)"></div>
      </div>

      <div class="ss-panel">
        <h3 style="margin-top:0">📜 Sent campaigns</h3>
        <div id="ml-history"><p class="ss-seed">Loading…</p></div>
      </div>

      <div class="ss-panel">
        <div class="ss-bk-actionbar"><h3 style="margin:0">👥 Subscribers</h3></div>
        <div id="ml-body"><p class="ss-seed">Loading…</p></div>
      </div>`;

    let rows = [];
    const $ = id => document.getElementById(id);

    function fields() {
      return { subject: $("ml-subject").value.trim(), headline: $("ml-headline").value.trim(),
        body: $("ml-msg").value, ctaText: $("ml-cta").value.trim(), ctaUrl: $("ml-ctaurl").value.trim(),
        imageUrl: $("ml-img").value.trim(), preheader: $("ml-headline").value.trim(), audience: $("ml-audience").value };
    }
    function drawPreview() { $("ml-preview").innerHTML = mlPreviewHtml(fields(), (rows[0] && rows[0].name) || "Sana"); }
    function audienceCount() {
      const a = $("ml-audience").value;
      const match = s => a === "all" || (a === "pakistan" ? /pakistan|lahore/i.test(s.region || "") : /toronto|canada/i.test(s.region || ""));
      const n = rows.filter(s => s.subscribed !== false && match(s)).length;
      $("ml-aud-count").textContent = n + " subscriber" + (n === 1 ? "" : "s");
      $("ml-send-n").textContent = n + " " + (n === 1 ? "person" : "people");
      return n;
    }
    function curProduct() { return products.find(p => p.id === $("ml-product").value); }
    function applyTemplate(k) {
      const t = ML_TEMPLATES[k]; if (!t) return;
      const p = curProduct(), pname = p ? p.name : "our scoops";
      const sub = s => String(s).replace(/\{product\}/g, pname);
      $("ml-subject").value = sub(t.subject); $("ml-headline").value = sub(t.headline);
      $("ml-msg").value = sub(t.body); $("ml-cta").value = t.cta;
      $("ml-ctaurl").value = (p && k !== "vault") ? `${location.origin}/product.html?id=${encodeURIComponent(p.id)}` : `${location.origin}/${t.path}`;
      if (p && p.image) $("ml-img").value = absUrl(p.image);
      drawPreview();
    }

    ["ml-subject", "ml-headline", "ml-msg", "ml-cta", "ml-ctaurl", "ml-img"].forEach(id => $(id).addEventListener("input", drawPreview));
    $("ml-audience").addEventListener("change", audienceCount);
    $("ml-tpls").addEventListener("click", e => { const b = e.target.closest("[data-tpl]"); if (b) applyTemplate(b.getAttribute("data-tpl")); });
    $("ml-product").addEventListener("change", () => { const p = curProduct(); if (p && p.image) $("ml-img").value = absUrl(p.image); if (p) $("ml-ctaurl").value = `${location.origin}/product.html?id=${encodeURIComponent(p.id)}`; drawPreview(); });

    async function doSend(testEmail) {
      const f = fields();
      if (!testEmail && !(f.subject && f.headline && f.body)) return SSApp.toast("Add a subject, headline and message first.", "err");
      const btn = testEmail ? $("ml-test") : $("ml-send");
      const label = btn.innerHTML;
      if (!testEmail && !confirm(`Send this to ${audienceCount()} ${$("ml-audience").value === "all" ? "" : $("ml-audience").value + " "}subscriber(s)?`)) return;
      btn.disabled = true; btn.textContent = testEmail ? "Sending test…" : "Sending…";
      try {
        const params = { action: "sendcampaign", subject: f.subject, audience: f.audience, headline: f.headline,
          body: f.body.slice(0, 800), ctaText: f.ctaText, ctaUrl: f.ctaUrl, imageUrl: f.imageUrl, preheader: f.preheader };
        if (testEmail) params.test = testEmail;
        const res = await jsonpML(params);
        if (testEmail) SSApp.toast(res.sent ? "Test sent — check your inbox 📬" : "Test failed. Check your Brevo key/sender.", res.sent ? "ok" : "err");
        else { SSApp.toast(`Sent to ${res.sent} of ${res.recipients || res.sent} 🎉${res.failed ? " · " + res.failed + " failed" : ""}`, "ok"); loadHistory(); }
      } catch (err) { SSApp.toast("Couldn't send (" + esc(String(err)) + "). Re-deploy your Apps Script as a NEW version.", "err"); }
      btn.disabled = false; btn.innerHTML = label;
    }
    $("ml-send").onclick = () => doSend(null);
    $("ml-test").onclick = () => { const em = $("ml-test-email").value.trim(); if (!/\S+@\S+\.\S+/.test(em)) return SSApp.toast("Enter your email for the test.", "err"); doSend(em); };

    function table(list) {
      if (!list.length) return `<p class="ss-empty">No signups yet. When someone joins your list, they'll appear here. 🍪</p>`;
      return `<div class="ss-table-wrap"><table class="ss-table">
        <thead><tr><th>Date</th><th>Name</th><th>Email</th><th>Phone</th><th>Region</th><th>Status</th></tr></thead>
        <tbody>${list.map(s => `<tr>
          <td>${esc((s.ts || "").slice(0, 10))}</td>
          <td>${esc(s.name || "")}</td>
          <td><a href="mailto:${esc(s.email)}">${esc(s.email || "")}</a></td>
          <td>${esc(s.phone || "")}</td>
          <td>${esc((SS_REGIONS[s.region] && SS_REGIONS[s.region].name) || s.region || "")}</td>
          <td>${s.subscribed === false ? '<span style="color:var(--ink-40)">unsubscribed</span>' : '<span style="color:#2e7d32">subscribed</span>'}</td></tr>`).join("")}</tbody></table></div>`;
    }
    function bindGo() { body().querySelectorAll("[data-gosettings]").forEach(a => a.onclick = e => { e.preventDefault(); go("settings"); }); }
    function load() {
      const mb = $("ml-body");
      if (!remoteConfigured()) { mb.innerHTML = `<div class="ss-livebar" style="background:var(--cream-3);color:var(--caramel)">Connect your Google Sheet first — set the Sheets URL + read key in <a href="#settings" data-gosettings>Settings</a>. Then re-deploy your Apps Script as a NEW version so it has the email features.</div>`; bindGo(); return; }
      mb.innerHTML = `<p class="ss-seed">Loading…</p>`;
      jsonpSignups().then(list => {
        rows = (list || []).slice().reverse();
        const subs = rows.filter(s => s.subscribed !== false).length;
        $("ml-count").textContent = subs + " subscribed / " + rows.length + " total";
        mb.innerHTML = table(rows);
        audienceCount(); drawPreview();
      }).catch(err => { mb.innerHTML = `<p class="ss-empty">Couldn't load (${esc(String(err))}). If you just added this, re-deploy your Apps Script as a NEW version.</p>`; });
    }
    function loadHistory() {
      const h = $("ml-history"); if (!remoteConfigured()) { h.innerHTML = `<p class="ss-seed">Connect your sheet to see history.</p>`; return; }
      jsonpML({ action: "campaigns" }).then(res => {
        if (res.emailReady === false) $("ml-emailwarn").innerHTML = `<div class="ss-livebar" style="background:#fff4e5;color:#8a5a00">⚠️ Brevo isn’t connected yet. In your Apps Script, run <b>setupEmail()</b> once with your Brevo API key + verified sender. Until then, sends won’t go out.</div>`;
        const c = res.campaigns || [];
        h.innerHTML = c.length ? `<div class="ss-table-wrap"><table class="ss-table"><thead><tr><th>Sent</th><th>Subject</th><th>Audience</th><th>Delivered</th><th>Failed</th></tr></thead><tbody>${c.map(x => `<tr><td>${esc((x.ts || "").slice(0, 10))}</td><td>${esc(x.subject)}</td><td>${esc(x.audience)}</td><td>${x.delivered}</td><td>${x.failed || 0}</td></tr>`).join("")}</tbody></table></div>` : `<p class="ss-empty">No campaigns sent yet.</p>`;
      }).catch(() => { h.innerHTML = `<p class="ss-empty">Couldn’t load history.</p>`; });
    }
    $("ml-refresh").onclick = () => { load(); loadHistory(); };
    $("ml-csv").onclick = () => {
      if (!rows.length) return SSApp.toast("Nothing to export yet.", "err");
      const head = ["Date", "Name", "Email", "Phone", "Region", "Source", "Subscribed"];
      const b = rows.map(s => [s.ts, s.name, s.email, s.phone, s.region, s.source, s.subscribed === false ? "no" : "yes"].map(v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`).join(","));
      download("second-scoop-mailing-list.csv", head.join(",") + "\n" + b.join("\n"), "text/csv");
    };

    const aa = $("ml-autoannounce");
    aa.checked = SS.read("ss_ml_autoannounce", true) !== false;
    aa.onchange = () => SS.write("ss_ml_autoannounce", aa.checked);

    drawPreview(); load(); loadHistory();
    if (prefill) { applyTemplate(prefill.tpl || "custom"); if (prefill.productId) { $("ml-product").value = prefill.productId; applyTemplate(prefill.tpl || "custom"); } document.getElementById("ml-compose-panel").scrollIntoView({ behavior: "smooth" }); }
  }

  /* ===================================================== MESSAGES == */
  function jsonpMessages() {
    return new Promise((resolve, reject) => {
      const url = (SS.getSettings().googleSheets || {}).webhookUrl;
      const key = SS.read("ss_orders_key", "");
      if (!url || !key) return reject("not configured");
      const cb = "ssmsg_" + Math.random().toString(36).slice(2);
      const sep = url.indexOf("?") > -1 ? "&" : "?";
      const s = document.createElement("script");
      s.src = url + sep + "action=messages&key=" + encodeURIComponent(key) + "&callback=" + cb;
      let done = false;
      window[cb] = (data) => { done = true; cleanup(); (data && data.ok) ? resolve(data.messages || []) : reject((data && data.error) || "error"); };
      s.onerror = () => { if (!done) { cleanup(); reject("network"); } };
      function cleanup() { try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); }
      document.body.appendChild(s);
      setTimeout(() => { if (!done) { cleanup(); reject("timeout"); } }, 15000);
    });
  }
  function renderMessages() {
    body().innerHTML = `
      <div class="ss-panel">
        <div class="ss-bk-actionbar">
          <h3 style="margin:0">💬 Contact messages <span id="msg-count" class="ss-tag" style="background:#e8dcc8;color:#6b5544"></span></h3>
          <span style="flex:1"></span>
          <button class="ss-btn ss-btn--sm ss-btn--ghost" id="msg-refresh">↻ Refresh</button>
          <button class="ss-btn ss-btn--sm" id="msg-csv">⬇ Export CSV</button>
        </div>
        <p style="color:var(--ink-60);font-size:.9rem">Everything sent through your Contact page lands here. Pulled live from your sheet's “Messages” tab.</p>
        <div id="msg-body"><p class="ss-seed">Loading…</p></div>
      </div>`;
    let rows = [];
    function load() {
      const mb = document.getElementById("msg-body");
      if (!remoteConfigured()) { mb.innerHTML = `<div class="ss-livebar" style="background:var(--cream-3);color:var(--caramel)">Connect your Google Sheet first (Brand &amp; Settings), and re-deploy your Apps Script so it has the new “messages” feature.</div>`; return; }
      mb.innerHTML = `<p class="ss-seed">Loading…</p>`;
      jsonpMessages().then(list => {
        rows = (list || []).slice().reverse();
        document.getElementById("msg-count").textContent = rows.length + " messages";
        mb.innerHTML = rows.length ? rows.map(m => `<div class="ss-panel" style="margin:0 0 10px;background:var(--cream-2)">
          <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><strong>${esc(m.name || "Anonymous")}</strong><span class="ss-seed">${esc((m.ts || "").slice(0, 10))}</span></div>
          <div style="font-size:.85rem;color:var(--caramel)"><a href="mailto:${esc(m.email)}">${esc(m.email || "")}</a></div>
          <p style="margin:.5em 0 0;white-space:pre-wrap">${esc(m.message || "")}</p></div>`).join("")
          : `<p class="ss-empty">No messages yet.</p>`;
      }).catch(err => { mb.innerHTML = `<p class="ss-empty">Couldn't load (${esc(String(err))}). If you just added this feature, re-deploy your Apps Script as a NEW version.</p>`; });
    }
    document.getElementById("msg-refresh").onclick = load;
    document.getElementById("msg-csv").onclick = () => {
      if (!rows.length) return SSApp.toast("Nothing to export yet.", "err");
      const head = ["Date", "Name", "Email", "Region", "Message"];
      const b = rows.map(m => [m.ts, m.name, m.email, m.region, m.message].map(v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`).join(","));
      download("second-scoop-messages.csv", head.join(",") + "\n" + b.join("\n"), "text/csv");
    };
    load();
  }

  /* ====================================================== REVIEWS == */
  function renderReviews() {
    if (!window.SSReviews || !remoteConfigured()) {
      body().innerHTML = `<div class="ss-livebar" style="background:var(--cream-3);color:var(--caramel)">Reviews need the live link. Set your Google Sheets URL + read key in <a href="#settings" data-gosettings>Settings</a> first.</div>`;
      wireBanner(); return;
    }
    body().innerHTML = `<div class="ss-panel" style="text-align:center;padding:40px"><div class="ss-pub-dot" style="margin:0 auto 12px;border-color:var(--caramel);border-top-color:transparent;animation:spin .7s linear infinite"></div><p style="color:var(--ink-60)">Loading reviews…</p></div>`;
    const key = SS.read("ss_orders_key", "");
    SSReviews.fetchAll(key).then(reviews => {
      reviews.sort((a, b) => new Date(b.ts) - new Date(a.ts));
      const live = reviews.filter(r => r.status === "visible").length;
      body().innerHTML = `
        <div class="ss-bk-actionbar"><button class="ss-chip" id="r-refresh">↻ Refresh</button>
          <span class="ss-seed">${live} live · ${reviews.length - live} hidden</span></div>
        <div class="ss-panel" style="padding:0;overflow:hidden"><div style="overflow-x:auto">
        <table class="ss-table"><tr><th>Date</th><th>Name</th><th>Rating</th><th>Product</th><th>Review</th><th>Status</th><th></th></tr>
        ${reviews.length ? reviews.map(reviewRow).join("") : `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--ink-40)">No reviews yet.</td></tr>`}
        </table></div></div>
        <p class="ss-seed" style="margin-top:10px">Delete removes a review from the website right away (it's kept in your sheet marked “hidden”).</p>`;
      document.getElementById("r-refresh").onclick = renderReviews;
      body().querySelectorAll("[data-delrev]").forEach(b => b.onclick = () => {
        if (!confirm("Hide this review from the website?")) return;
        b.disabled = true; b.textContent = "…";
        SSReviews.del(b.getAttribute("data-delrev"), key).then(ok => {
          SSApp.toast(ok ? "Review hidden" : "Failed", ok ? "ok" : "err"); renderReviews();
        });
      });
    }).catch(err => {
      body().innerHTML = `<div class="ss-livebar" style="background:#f5d9d2;color:var(--err)">⚠️ Couldn't load reviews (${esc(String(err))}). Re-deploy the Apps Script (with the reviews update) and check your read key in Settings.</div>`;
    });
  }
  function reviewRow(r) {
    const region = SS_REGIONS[r.region] ? SS_REGIONS[r.region].name : "";
    const d = new Date(r.ts);
    return `<tr style="${r.status !== "visible" ? "opacity:.5" : ""}">
      <td>${isNaN(d) ? esc(r.ts) : d.toLocaleDateString()}</td>
      <td>${esc(r.name)}</td>
      <td style="color:var(--gold);white-space:nowrap">${SSReviews.stars(r.rating)}</td>
      <td>${esc(r.product || "—")}<br><span class="ss-seed">${esc(region)}</span></td>
      <td style="max-width:320px;font-size:.85rem">${esc(r.review)}</td>
      <td>${r.status === "visible" ? '<span class="ss-pill ss-pill--Paid">live</span>' : '<span class="ss-pill ss-pill--Cancelled">hidden</span>'}</td>
      <td>${r.status === "visible" ? `<button class="ss-chip ss-chip--sm ss-chip--danger" data-delrev="${esc(r.id)}">Delete</button>` : ""}</td>
    </tr>`;
  }

  /* ======================================================= BUNDLES == */
  function renderBundles() {
    const list = cat.filter(p => p.bundle || p.category === "bundles");
    body().innerHTML = `
      <div class="ss-panel" style="margin-bottom:14px"><h3 style="margin-top:0">🎁 Bundles &amp; Boxes</h3>
        <p style="color:var(--ink-60);font-size:.9rem">Pre-set boxes sold at a fixed price — e.g. a sampler, a sharing box, a movie-night bundle. Each shows its contents on the card and product page, and adds to cart as one line. Bundles also appear on your homepage, a dedicated Bundles page, and in the Shop.</p>
        <button class="ss-btn" id="b-add">+ New bundle</button>
      </div>
      <div class="ss-panel" style="padding:0;overflow:hidden"><div style="overflow-x:auto"><table class="ss-table ss-mgr-table">
        <tr><th></th><th>Bundle</th><th>Includes</th><th>Flags</th>${REGION_IDS.map(rid => `<th>${SS_REGIONS[rid].flag} ${SS_REGIONS[rid].name}</th>`).join("")}<th>Actions</th></tr>
        ${list.map(bundleRow).join("") || `<tr><td colspan="${5 + REGION_IDS.length}" style="text-align:center;padding:30px;color:var(--ink-40)">No bundles yet. Press <strong>+ New bundle</strong> to create one.</td></tr>`}
      </table></div></div>`;
    document.getElementById("b-add").onclick = () => openEditor(null, { category: "bundles" });
    body().querySelectorAll("[data-act]").forEach(b => b.onclick = () => action(b.getAttribute("data-act"), b.getAttribute("data-id")));
  }
  function bundleRow(p) {
    const thumb = (p.images && p.images[0]) ? `<img class="ss-mgr-thumb" src="${SS.imgSrc(p.images[0])}" onerror="this.style.visibility='hidden'">` : `<div class="ss-mgr-thumb ss-mgr-thumb--empty">🎁</div>`;
    const inc = (p.includes && p.includes.length) ? `<ul style="margin:0;padding-left:1.1em;font-size:.82rem;color:var(--ink-60)">${p.includes.map(i => `<li>${esc(i)}</li>`).join("")}</ul>` : `<span class="ss-seed">No contents set</span>`;
    const flags = [p.hidden ? `<span class="ss-tag ss-tag--off">Hidden</span>` : "", p.featured ? `<span class="ss-tag">Featured</span>` : "", p.badge ? `<span class="ss-tag ss-tag--blush">${(BADGES.find(b => b[0] === p.badge) || ["", p.badge])[1]}</span>` : ""].join("");
    const cells = REGION_IDS.map(rid => { const r = p.regions && p.regions[rid]; if (!r) return `<td><span class="ss-tag ss-tag--off">—</span></td>`; return `<td><strong>${SS.money(r.price, rid)}</strong><br><span class="ss-statusdot ss-statusdot--${r.status}">${STATUS_LABEL[r.status]}</span><br><span class="ss-seed">${r.inventory} stock</span></td>`; }).join("");
    return `<tr><td>${thumb}</td><td><strong>${esc(p.name || "(untitled)")}</strong><br><span class="ss-seed">${esc(p.id)}</span></td>
      <td style="max-width:240px">${inc}</td><td><div class="ss-tags">${flags || "—"}</div></td>${cells}
      <td><div class="ss-mgr-actions">
        <button class="ss-chip ss-chip--sm" data-act="edit" data-id="${p.id}">Edit</button>
        <button class="ss-chip ss-chip--sm" data-act="dup" data-id="${p.id}">Duplicate</button>
        <button class="ss-chip ss-chip--sm" data-act="hide" data-id="${p.id}">${p.hidden ? "Show" : "Hide"}</button>
        <button class="ss-chip ss-chip--sm ss-chip--danger" data-act="del" data-id="${p.id}">Delete</button>
      </div></td></tr>`;
  }

  /* ====================================================== PRODUCTS == */
  function renderProducts() {
    const list = cat.filter(p => !productSearch || (p.name + " " + p.id + " " + p.category).toLowerCase().includes(productSearch));
    const hasEdits = SS.hasOverride();
    body().innerHTML = `
      ${hasEdits
        ? `<div class="ss-livebar">📝 You have <strong>unpublished product edits</strong> (saved as a preview on this device). They go live for customers when you press <strong>⤴ Publish to live site</strong>. <a href="#" data-discard>Discard preview edits</a></div>`
        : `<div class="ss-livebar" style="background:#e6f4ea;border-color:#b7e0c4;color:#2a6b43">✓ Products match what's published live.</div>`}
      <div class="ss-bk-actionbar">
        <div class="ss-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="m20 20-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <input id="p-q" type="search" placeholder="Search products…" value="${esc(productSearch)}"></div>
        <button class="ss-btn" id="p-add">+ Add product</button>
      </div>
      <div class="ss-panel" style="padding:0;overflow:hidden"><div style="overflow-x:auto"><table class="ss-table ss-mgr-table">
        <tr><th></th><th>Product</th><th>Category</th><th>Flags</th>${REGION_IDS.map(rid => `<th>${SS_REGIONS[rid].flag} ${SS_REGIONS[rid].name}</th>`).join("")}<th>Actions</th></tr>
        ${list.map(productRow).join("") || `<tr><td colspan="${5 + REGION_IDS.length}" style="text-align:center;padding:30px;color:var(--ink-40)">No products.</td></tr>`}
      </table></div></div>`;
    const s = document.getElementById("p-q");
    s.oninput = () => { productSearch = s.value.toLowerCase().trim(); const p = s.selectionStart; renderProducts(); const n = document.getElementById("p-q"); n.focus(); n.setSelectionRange(p, p); };
    document.getElementById("p-add").onclick = () => openEditor(null);
    const disc = body().querySelector("[data-discard]");
    if (disc) disc.onclick = e => {
      e.preventDefault();
      if (confirm("Discard your local product edits and reload what's currently published live?")) {
        SS.resetCatalog(); cat = clone(SS.getCatalog()); renderProducts(); SSApp.toast("Reverted to published products", "ok");
      }
    };
    body().querySelectorAll("[data-act]").forEach(b => b.onclick = () => action(b.getAttribute("data-act"), b.getAttribute("data-id")));
  }
  function productRow(p) {
    const thumb = (p.images && p.images[0]) ? `<img class="ss-mgr-thumb" src="${SS.imgSrc(p.images[0])}" onerror="this.style.visibility='hidden'">` : `<div class="ss-mgr-thumb ss-mgr-thumb--empty" data-cat="${p.category}">🍪</div>`;
    const flags = [p.hidden ? `<span class="ss-tag ss-tag--off">Hidden</span>` : "", p.featured ? `<span class="ss-tag">Featured</span>` : "", p.secret ? `<span class="ss-tag ss-tag--gold">Secret</span>` : "", p.badge ? `<span class="ss-tag ss-tag--blush">${(BADGES.find(b => b[0] === p.badge) || ["", p.badge])[1]}</span>` : ""].join("");
    const cells = REGION_IDS.map(rid => { const r = p.regions && p.regions[rid]; if (!r) return `<td><span class="ss-tag ss-tag--off">—</span></td>`; let priceTxt; if (r.sizes && r.sizes.length) { const paid = r.sizes.map(s => Number(s.price) || 0).filter(p => p > 0); const lo = paid.length ? Math.min.apply(null, paid) : (r.price || 0); priceTxt = `${SS.money(lo, rid)}+ <span class="ss-seed">(${r.sizes.length} sizes)</span>`; } else { priceTxt = `${SS.money(r.price, rid)}`; } return `<td><strong>${priceTxt}</strong><br><span class="ss-statusdot ss-statusdot--${r.status}">${STATUS_LABEL[r.status]}</span><br><span class="ss-seed">${r.inventory} stock</span></td>`; }).join("");
    return `<tr><td>${thumb}</td><td><strong>${esc(p.name || "(untitled)")}</strong><br><span class="ss-seed">${esc(p.id)}</span></td>
      <td>${SS.categoryName(p.category)}</td><td><div class="ss-tags">${flags || "—"}</div></td>${cells}
      <td><div class="ss-mgr-actions">
        <button class="ss-chip ss-chip--sm" data-act="edit" data-id="${p.id}">Edit</button>
        <button class="ss-chip ss-chip--sm" data-act="dup" data-id="${p.id}">Duplicate</button>
        <button class="ss-chip ss-chip--sm" data-act="hide" data-id="${p.id}">${p.hidden ? "Show" : "Hide"}</button>
        <button class="ss-chip ss-chip--sm ss-chip--danger" data-act="del" data-id="${p.id}">Delete</button>
      </div></td></tr>`;
  }
  function action(act, id) {
    const i = cat.findIndex(p => p.id === id); if (i < 0) return;
    if (act === "edit") return openEditor(i);
    if (act === "hide") { cat[i].hidden = !cat[i].hidden; persistCatalog(); updateLiveBadge(); renderSection(); SSApp.toast(cat[i].hidden ? "Hidden" : "Visible", "ok"); }
    if (act === "dup") { const c2 = clone(cat[i]); c2.id = uniqueId(cat[i].id + "-copy"); c2.name = cat[i].name + " (copy)"; c2.hero = false; cat.splice(i + 1, 0, c2); persistCatalog(); updateLiveBadge(); renderSection(); SSApp.toast("Duplicated", "ok"); }
    if (act === "del") { if (confirm(`Delete "${cat[i].name}"?`)) { cat.splice(i, 1); persistCatalog(); updateLiveBadge(); renderSection(); SSApp.toast("Deleted", "ok"); } }
  }
  function blankProduct(preset) {
    const regions = {}; REGION_IDS.forEach(rid => regions[rid] = { status: "available", price: 0, inventory: 0, deliveryNotes: "" });
    const category = (preset && preset.category) || (SS_CATEGORIES[1] || SS_CATEGORIES[0]).id;
    return { id: "", name: "", category, optionLabel: "Size", tagline: "", description: "", longDescription: "", includes: [], bundle: category === "bundles", images: [], badge: null, featured: false, hero: false, secret: false, hidden: false, reviews: { rating: 0, count: 0 }, regions };
  }
  function openEditor(index, preset) {
    const isNew = index === null;
    const p = isNew ? blankProduct(preset) : clone(cat[index]);
    drawer.innerHTML = `
      <div class="ss-drawer-head"><h3>${isNew ? "Add product" : "Edit product"}</h3><button class="ss-icon-btn" id="m-close">✕</button></div>
      <div class="ss-drawer-body">
        <div class="ss-fieldset"><label class="ss-label">Product name</label>
          <input class="ss-field" id="f-name" value="${esc(p.name)}" placeholder="e.g. The OG Scoopie">
          <label class="ss-label" style="margin-top:12px">Product ID (URL key)</label>
          <input class="ss-field" id="f-id" value="${esc(p.id)}" placeholder="auto from name">
          <small class="ss-seed">Unique, lowercase. ${isNew ? "Leave blank to auto-generate." : ""}</small></div>
        <div class="ss-grid2">
          <div><label class="ss-label">Category</label><select class="ss-field" id="f-cat">${SS_CATEGORIES.map(c => `<option value="${c.id}" ${p.category === c.id ? "selected" : ""}>${c.name}</option>`).join("")}</select></div>
          <div><label class="ss-label">Badge</label><select class="ss-field" id="f-badge">${BADGES.map(b => `<option value="${b[0]}" ${(p.badge || "") === b[0] ? "selected" : ""}>${b[1]}</option>`).join("")}</select></div>
        </div>
        <label class="ss-label" style="margin-top:12px">Option type <span style="color:var(--ink-40);font-weight:500">— what the choice below is called</span></label>
        <input class="ss-field" id="f-optlabel" value="${esc(p.optionLabel || "Size")}" placeholder="e.g. Flavour, Size, Filling" list="optlabel-list">
        <datalist id="optlabel-list"><option>Flavour</option><option>Size</option><option>Filling</option></datalist>
        <small class="ss-seed">Shown to customers as "Choose your <b>${esc((p.optionLabel || "size")).toLowerCase()}</b>". Add the choices &amp; prices under each region below.</small>
        <label class="ss-label" style="margin-top:12px">Tagline</label><input class="ss-field" id="f-tag" value="${esc(p.tagline)}">
        <label class="ss-label" style="margin-top:12px">Short description (cards)</label><textarea class="ss-field" id="f-desc" style="min-height:64px">${esc(p.description)}</textarea>
        <label class="ss-label" style="margin-top:12px">Long description (product page)</label><textarea class="ss-field" id="f-long" style="min-height:90px">${esc(p.longDescription)}</textarea>
        <div class="ss-fieldset" id="f-includes-wrap" style="margin-top:12px${p.category === "bundles" ? "" : ";display:none"}">
          <label class="ss-label">🎁 Bundle contents — what's inside (one per line)</label>
          <textarea class="ss-field" id="f-includes" style="min-height:80px" placeholder="2 × The OG Scoopie&#10;1 × Chunkie — Chocolate Chip&#10;1 × Doughiginal tub">${esc((p.includes || []).join("\n"))}</textarea>
          <small class="ss-seed">Shown on the bundle's card and product page. Set the box price below.</small></div>
        <div class="ss-toggles">${chk("f-featured", "Featured", p.featured)}${chk("f-hero", "Hero (big card)", p.hero)}${chk("f-secret", "Secret (Vault only)", p.secret)}${chk("f-hidden", "Hidden", p.hidden)}</div>
        <div class="ss-grid2"><div><label class="ss-label">Rating (0–5)</label><input class="ss-field" id="f-rating" type="number" step="0.1" min="0" max="5" value="${p.reviews ? p.reviews.rating : 0}"></div>
          <div><label class="ss-label"># reviews</label><input class="ss-field" id="f-rcount" type="number" min="0" value="${p.reviews ? p.reviews.count : 0}"></div></div>
        <div class="ss-fieldset" style="margin-top:16px"><label class="ss-label">Images</label>
          <div id="f-images" class="ss-img-list"></div>
          <div class="ss-img-add"><button class="ss-chip" id="f-upload-btn">⬆ Upload image</button><input type="file" id="f-upload" accept="image/*" multiple hidden><button class="ss-chip" id="f-url-btn">+ Filename / URL</button></div>
          <small class="ss-seed">Upload embeds the image for testing. For production, save files in assets/img/ and reference the filename.</small></div>
        <h4 style="margin:20px 0 8px">Regions, pricing &amp; availability</h4>
        ${REGION_IDS.map(rid => regionEditor(rid, p)).join("")}
      </div>
      <div class="ss-drawer-foot"><button class="ss-btn ss-btn--ghost" id="m-cancel">Cancel</button><button class="ss-btn" id="m-save">${isNew ? "Add product" : "Save changes"}</button></div>`;
    openDrawer();
    let images = (p.images || []).slice();
    function drawImages() {
      const wrap = document.getElementById("f-images");
      wrap.innerHTML = images.length ? images.map((src, i) => `<div class="ss-img-item"><img src="${SS.imgSrc(src)}" onerror="this.style.opacity=.2">
        <input class="ss-field ss-field--sm" data-img="${i}" value="${esc(src.startsWith("data:") ? "(uploaded image)" : src)}" ${src.startsWith("data:") ? "readonly" : ""}>
        <button class="ss-icon-btn" data-imgdel="${i}">✕</button></div>`).join("") : `<p class="ss-seed">No images — a styled placeholder shows.</p>`;
      wrap.querySelectorAll("[data-img]").forEach(inp => inp.onchange = () => { images[+inp.getAttribute("data-img")] = inp.value.trim(); drawImages(); });
      wrap.querySelectorAll("[data-imgdel]").forEach(b => b.onclick = () => { images.splice(+b.getAttribute("data-imgdel"), 1); drawImages(); });
    }
    drawImages();
    document.getElementById("f-upload-btn").onclick = () => document.getElementById("f-upload").click();
    document.getElementById("f-upload").onchange = async e => {
      const files = [...e.target.files]; e.target.value = "";
      const btn = document.getElementById("f-upload-btn");
      for (const file of files) {
        btn.disabled = true; btn.textContent = "Uploading…";
        try {
          const name = await uploadImageToGitHub(file);   // → assets/img, returns filename
          images.push(name); drawImages();
          SSApp.toast("Uploaded " + name + " — live after next deploy ✓", "ok");
        } catch (err) {
          // fall back to a temporary in-browser preview if GitHub isn't connected
          if (String(err).indexOf("Connect GitHub") === 0) {
            const rd = new FileReader(); rd.onload = () => { images.push(rd.result); drawImages(); }; rd.readAsDataURL(file);
            SSApp.toast("Connect GitHub publishing to upload real photos. Added a temporary preview for now.", "err");
          } else SSApp.toast(String(err), "err");
        }
        btn.disabled = false; btn.textContent = "⬆ Upload image";
      }
    };
    document.getElementById("f-url-btn").onclick = () => { const v = prompt("Image filename (in assets/img/) or full URL:"); if (v && v.trim()) { images.push(v.trim()); drawImages(); } };
    REGION_IDS.forEach(rid => { const t = document.getElementById("rg-on-" + rid), fields = document.getElementById("rg-fields-" + rid); const sync = () => fields.style.display = t.checked ? "block" : "none"; t.onchange = sync; sync(); });

    // structured size + price editor (per region)
    const sizeState = {};
    REGION_IDS.forEach(rid => { sizeState[rid] = (((p.regions || {})[rid] || {}).sizes || []).map(s => ({ label: s.label || "", price: Number(s.price) || 0 })); });
    function drawSizes(rid) {
      const wrap = document.getElementById("rg-sizes-list-" + rid); if (!wrap) return;
      const arr = sizeState[rid], R = SS_REGIONS[rid];
      wrap.innerHTML = arr.length ? arr.map((s, i) => `<div class="ss-size-row" data-i="${i}">
        <input class="ss-field ss-field--sm" data-sk="label" value="${esc(s.label || "")}" placeholder="Choice name (e.g. Salted Caramel)">
        <input class="ss-field ss-field--sm" data-sk="price" type="number" min="0" step="${R.currency === "PKR" ? 1 : 0.01}" value="${s.price || 0}" placeholder="Price (${R.currency})">
        <button class="ss-icon-btn" type="button" data-sdel="${i}">✕</button></div>`).join("") : `<p class="ss-seed">No sizes — the single price above is used.</p>`;
      wrap.querySelectorAll(".ss-size-row").forEach(row => {
        const i = +row.getAttribute("data-i");
        row.querySelectorAll("[data-sk]").forEach(inp => inp.oninput = () => { const k = inp.getAttribute("data-sk"); arr[i][k] = k === "price" ? (Number(inp.value) || 0) : inp.value; });
        row.querySelector("[data-sdel]").onclick = () => { arr.splice(i, 1); drawSizes(rid); };
      });
    }
    REGION_IDS.forEach(rid => {
      drawSizes(rid);
      const ab = document.getElementById("rg-size-add-" + rid);
      if (ab) ab.onclick = () => { sizeState[rid].push({ label: "", price: 0 }); drawSizes(rid); };
    });

    const catSel = document.getElementById("f-cat");
    if (catSel) catSel.onchange = () => { const w = document.getElementById("f-includes-wrap"); if (w) w.style.display = catSel.value === "bundles" ? "block" : "none"; };
    document.getElementById("m-close").onclick = closeDrawer;
    document.getElementById("m-cancel").onclick = closeDrawer;
    document.getElementById("m-save").onclick = () => saveProduct(index, isNew, images, sizeState);
  }
  function regionEditor(rid, p) {
    const has = !!(p.regions && p.regions[rid]); const r = has ? p.regions[rid] : { status: "available", price: 0, inventory: 0, deliveryNotes: "" }; const R = SS_REGIONS[rid];
    return `<div class="ss-region-edit"><label class="ss-switch"><input type="checkbox" id="rg-on-${rid}" ${has ? "checked" : ""}><span>${R.flag} Sell in ${R.name} (${R.currency})</span></label>
      <div id="rg-fields-${rid}" class="ss-region-fields"><div class="ss-grid2">
        <div><label class="ss-label">Price (${R.currency}) — used only if no sizes below</label><input class="ss-field" id="rg-price-${rid}" type="number" step="${R.currency === "PKR" ? 1 : 0.01}" min="0" value="${r.price || 0}"></div>
        <div><label class="ss-label">Inventory</label><input class="ss-field" id="rg-inv-${rid}" type="number" min="0" value="${r.inventory}"></div></div>
        <label class="ss-label" style="margin-top:10px">Choices &amp; prices (optional) — flavours, sizes, etc.</label>
        <div class="ss-sizes-edit" id="rg-sizes-list-${rid}"></div>
        <button class="ss-chip" type="button" id="rg-size-add-${rid}" style="margin-top:6px">+ Add a choice</button>
        <small class="ss-seed">Each choice (e.g. a flavour like "Salted Caramel", or a size like "Large") has its own price. Customers pick one and the price updates — and the <b>cheapest choice shows as the product's starting price</b>. Leave empty to use the single price above.</small>
        <label class="ss-label" style="margin-top:10px">Availability</label><select class="ss-field" id="rg-status-${rid}">${STATUSES.map(s => `<option value="${s}" ${r.status === s ? "selected" : ""}>${STATUS_LABEL[s]}</option>`).join("")}</select>
        <label class="ss-label" style="margin-top:10px">Delivery / product note</label><input class="ss-field" id="rg-notes-${rid}" value="${esc(r.deliveryNotes || "")}"></div></div>`;
  }
  function saveProduct(index, isNew, images, sizeState) {
    sizeState = sizeState || {};
    const name = val("f-name").trim(); if (!name) { SSApp.toast("Add a product name.", "err"); return; }
    let id = val("f-id").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, ""); if (!id) id = slug(name);
    if (cat.some((p, i) => p.id === id && i !== index)) id = uniqueId(id);
    const regions = {};
    REGION_IDS.forEach(rid => {
      if (!document.getElementById("rg-on-" + rid).checked) return;
      const reg = { status: val("rg-status-" + rid), price: Number(val("rg-price-" + rid)) || 0, inventory: Math.max(0, parseInt(val("rg-inv-" + rid), 10) || 0), deliveryNotes: val("rg-notes-" + rid).trim() };
      const sizes = (sizeState[rid] || []).map(s => ({ label: String(s.label || "").trim(), price: Number(s.price) || 0 })).filter(s => s.label);
      if (sizes.length) {
        reg.sizes = sizes;
        const valid = sizes.map(s => s.price).filter(p => p > 0);   // cheapest paid size = main price
        reg.price = valid.length ? Math.min.apply(null, valid) : (Number(val("rg-price-" + rid)) || 0);
      }
      regions[rid] = reg;
    });
    if (!Object.keys(regions).length) { SSApp.toast("Enable at least one region.", "err"); return; }
    const category = val("f-cat");
    const includes = val("f-includes").split("\n").map(s => s.trim()).filter(Boolean);
    const product = { id, name, category, optionLabel: (val("f-optlabel").trim() || "Size"), bundle: category === "bundles", includes, tagline: val("f-tag").trim(), description: val("f-desc").trim(), longDescription: val("f-long").trim(), images: images.slice(), badge: val("f-badge") || null, featured: chkd("f-featured"), hero: chkd("f-hero"), secret: chkd("f-secret"), hidden: chkd("f-hidden"), reviews: { rating: clampNum(val("f-rating"), 0, 5), count: Math.max(0, parseInt(val("f-rcount"), 10) || 0) }, regions };
    const prevCat = cat.slice();
    if (isNew) cat.push(product); else cat[index] = product;
    const ok = persistCatalog();
    if (!ok) {
      // storage full — almost always an uploaded image is too large to save
      cat = prevCat;   // roll back so we don't show an unsaved state
      SSApp.toast("Couldn't save — an uploaded image is too large. Use a smaller photo, or save it as a file in assets/img/ and reference the filename.", "err");
      return;
    }
    closeDrawer(); updateLiveBadge(); renderSection();
    SSApp.toast(isNew ? "Saved (preview). Press Publish to go live 🍪" : "Saved (preview). Press Publish to go live 🍪", "ok");
  }

  /* ========================================================= VAULT == */
  function renderVault() {
    const secrets = cat.filter(p => p.secret);
    body().innerHTML = `
      <div class="ss-panel" style="margin-bottom:16px"><h3>Vault settings</h3>
        <div class="ss-grid2"><div><label class="ss-label">Wrong-code message</label><input class="ss-field" id="v-wrong" value="${esc(vault.wrongCodeMessage || "")}"></div>
          <div><label class="ss-label">Teaser title</label><input class="ss-field" id="v-title" value="${esc(vault.teaser.title || "")}"></div></div>
        <label class="ss-label" style="margin-top:10px">Teaser subtitle</label><input class="ss-field" id="v-sub" value="${esc(vault.teaser.subtitle || "")}">
        <label class="ss-label" style="margin-top:10px">Teaser hint</label><input class="ss-field" id="v-hint" value="${esc(vault.teaser.hint || "")}"></div>
      ${secrets.length ? "" : `<div class="ss-livebar" style="background:var(--cream-3);color:var(--caramel)">Tip: mark a product as <strong>Secret</strong> in Products first, then link a code here.</div>`}
      ${REGION_IDS.map(rid => vaultRegion(rid, secrets)).join("")}
      <div style="margin-top:16px"><button class="ss-btn" id="v-save">Save Vault (go live)</button></div>`;
    body().querySelectorAll("[data-vadd]").forEach(b => b.onclick = () => { const rid = b.getAttribute("data-vadd"); vault.codes[rid] = vault.codes[rid] || []; vault.codes[rid].push({ code: "", products: [], label: "" }); syncVaultFromForm(); renderVault(); });
    body().querySelectorAll("[data-vdel]").forEach(b => b.onclick = () => { const [rid, i] = b.getAttribute("data-vdel").split("|"); syncVaultFromForm(); vault.codes[rid].splice(+i, 1); renderVault(); });
    document.getElementById("v-save").onclick = () => { syncVaultFromForm(); persistVault(); updateLiveBadge(); SSApp.toast("Vault saved — live 🔒", "ok"); };
  }
  function vaultRegion(rid, secrets) {
    const R = SS_REGIONS[rid]; const codes = (vault.codes && vault.codes[rid]) || [];
    return `<div class="ss-panel" style="margin-bottom:14px"><h3>${R.flag} ${R.name} codes</h3>
      ${codes.length ? codes.map((c, i) => `<div class="ss-vault-row" data-vrow="${rid}|${i}">
        <input class="ss-field ss-field--sm" data-vfield="code" value="${esc(c.code)}" placeholder="CODE">
        <input class="ss-field ss-field--sm" data-vfield="label" value="${esc(c.label || "")}" placeholder="Drop name">
        <div class="ss-vault-products">${secrets.map(s => `<label class="ss-checkpill"><input type="checkbox" data-vprod="${s.id}" ${(c.products || []).includes(s.id) ? "checked" : ""}>${esc(s.name)}</label>`).join("") || `<span class="ss-seed">No secret products yet.</span>`}</div>
        <button class="ss-icon-btn" data-vdel="${rid}|${i}">✕</button></div>`).join("") : `<p class="ss-seed">No codes yet.</p>`}
      <button class="ss-chip" data-vadd="${rid}" style="margin-top:8px">+ Add code</button></div>`;
  }
  function syncVaultFromForm() {
    if (document.getElementById("v-wrong")) { vault.wrongCodeMessage = val("v-wrong"); vault.teaser.title = val("v-title"); vault.teaser.subtitle = val("v-sub"); vault.teaser.hint = val("v-hint"); }
    body().querySelectorAll("[data-vrow]").forEach(row => { const [rid, i] = row.getAttribute("data-vrow").split("|"); const e = vault.codes[rid][+i]; e.code = row.querySelector('[data-vfield="code"]').value.trim(); e.label = row.querySelector('[data-vfield="label"]').value.trim(); e.products = [...row.querySelectorAll("[data-vprod]")].filter(c => c.checked).map(c => c.getAttribute("data-vprod")); });
  }

  /* ======================================================= CONTENT == */
  // Every editable homepage heading/blurb. [key, nice name, [fields...]]
  const SECTION_TEXT = [
    ["featured", "Featured Scoops", [["eyebrow", "Eyebrow"], ["title", "Title"], ["link", "Link text"]]],
    ["bestSellers", "Best Sellers", [["eyebrow", "Eyebrow"], ["title", "Title"]]],
    ["limited", "Limited Drops", [["eyebrow", "Eyebrow"], ["title", "Title"]]],
    ["vaultTeaser", "Vault teaser", [["eyebrow", "Eyebrow"], ["title", "Title"], ["text", "Paragraph"], ["button", "Button"]]],
    ["howItWorks", "How It Works", [["eyebrow", "Eyebrow"], ["title", "Title"]]],
    ["reviews", "Reviews", [["eyebrow", "Eyebrow"], ["title", "Title"], ["button", "Button"]]],
    ["instagram", "Instagram", [["eyebrow", "Eyebrow"], ["title", "Title"], ["link", "Link text"]]],
    ["signup", "Email signup", [["eyebrow", "Eyebrow"], ["title", "Title"], ["text", "Paragraph"]]],
  ];
  // Editable text on every OTHER page. [pageKey, nice name, [[field,label,multiline?]]]
  const PAGE_TEXT = [
    ["faq", "FAQ page", [["eyebrow", "Eyebrow"], ["title", "Title"], ["intro", "Intro", 1]]],
    ["contact", "Contact page", [["eyebrow", "Eyebrow"], ["title", "Title"], ["intro", "Intro", 1],
      ["formTitle", "Form heading"], ["nameLabel", "Name label"], ["emailLabel", "Email label"], ["messageLabel", "Message label"], ["sendButton", "Send button"],
      ["followTitle", "Follow heading"], ["followText", "Follow text", 1]]],
    ["preorders", "Pre-orders page", [["eyebrow", "Eyebrow"], ["title", "Title"], ["intro", "Intro", 1],
      ["step1Title", "Step 1 title"], ["step1Text", "Step 1 text", 1], ["step2Title", "Step 2 title"], ["step2Text", "Step 2 text", 1],
      ["step3Title", "Step 3 title"], ["step3Text", "Step 3 text", 1], ["step4Title", "Step 4 title"], ["step4Text", "Step 4 text", 1],
      ["statusesTitle", "Statuses heading"], ["statusesIntro", "Statuses intro", 1]]],
    ["vault", "Vault page", [["codePlaceholder", "Code box placeholder"], ["unlockButton", "Unlock button"],
      ["welcomeEyebrow", "Unlocked eyebrow"], ["welcomeTitle", "Unlocked title"], ["welcomeText", "Unlocked text", 1], ["addMore", "Add-another button"]]],
    ["shop", "Shop page", [["searchPlaceholder", "Search box placeholder"]]],
    ["cart", "Cart page", [["eyebrow", "Eyebrow"], ["title", "Title"]]],
    ["checkout", "Checkout page", [["eyebrow", "Eyebrow"], ["title", "Title"]]],
    ["confirmation", "Order confirmation (after checkout)", [["eyebrow", "Eyebrow"], ["heading", "Heading (use {name} for first name)"], ["message", "Message", 1], ["moreButton", "“Order more” button"], ["homeButton", "“Back home” button"]]],
  ];
  // shared: render a page's text fields (from PAGE_TEXT) and save them
  function pageTextPanel(pageKey, heading) {
    const entry = PAGE_TEXT.find(p => p[0] === pageKey); if (!entry) return "";
    const C = content; C.pages = C.pages || {};
    return `<div class="ss-panel" style="margin-bottom:14px"><h3>${heading || entry[1]}</h3>
      <p style="color:var(--ink-60);font-size:.9rem">Blank = keep the built-in wording.</p>
      <div class="ss-grid2">
        ${entry[2].map(([f, label, ml]) => { const v = esc(((C.pages[pageKey] || {})[f]) || "");
          return ml ? `<div style="grid-column:1/-1"><label class="ss-label">${label}</label><textarea class="ss-field" id="c-pg-${pageKey}-${f}" style="min-height:54px">${v}</textarea></div>`
                    : `<div><label class="ss-label">${label}</label><input class="ss-field" id="c-pg-${pageKey}-${f}" value="${v}"></div>`; }).join("")}
      </div></div>`;
  }
  function savePageText(pageKey) {
    const entry = PAGE_TEXT.find(p => p[0] === pageKey); if (!entry) return;
    content.pages = content.pages || {}; content.pages[pageKey] = content.pages[pageKey] || {};
    entry[2].forEach(([f]) => { const v = val("c-pg-" + pageKey + "-" + f).trim(); if (v) content.pages[pageKey][f] = v; });
  }

  /* ====================================================== ABOUT ===== */
  function renderAbout() {
    const C = content; C.about = C.about || {};
    body().innerHTML = `
      <p style="color:var(--ink-60);margin:0 0 14px">Your brand story — shows on the <b>About page</b> AND the “About” block on the home page.</p>
      <div class="ss-panel" style="margin-bottom:14px"><h3>About story</h3>
        <div class="ss-grid2"><div><label class="ss-label">Eyebrow</label><input class="ss-field" id="c-a-eye" value="${esc(C.about.eyebrow || "")}"></div>
          <div><label class="ss-label">Title</label><input class="ss-field" id="c-a-title" value="${esc(C.about.title || "")}"></div></div>
        <label class="ss-label" style="margin-top:10px">Lead line</label><input class="ss-field" id="c-a-lead" value="${esc(C.about.lead || "")}">
        <label class="ss-label" style="margin-top:10px">Paragraphs (blank line between each)</label><textarea class="ss-field" id="c-a-paras" style="min-height:130px">${esc((C.about.paragraphs || []).join("\n\n"))}</textarea>
        <label class="ss-label" style="margin-top:10px">Value cards</label><div id="c-vals"></div>
      </div>
      <button class="ss-btn" id="a-save">Save About (go live)</button>`;
    drawList("c-vals", C.about.values || (C.about.values = []), (item, i) => `
      <div class="ss-list-row" data-i="${i}" style="grid-template-columns:50px 1fr 1.6fr 34px"><input class="ss-field ss-field--sm" data-k="emoji" value="${esc(item.emoji || "")}" placeholder="🥄">
      <input class="ss-field ss-field--sm" data-k="title" value="${esc(item.title || "")}" placeholder="Title">
      <input class="ss-field ss-field--sm" data-k="text" value="${esc(item.text || "")}" placeholder="Text"><button class="ss-icon-btn" data-del>✕</button></div>`, () => ({ emoji: "✨", title: "", text: "" }), "+ Add value");
    document.getElementById("a-save").onclick = () => {
      C.about.eyebrow = val("c-a-eye"); C.about.title = val("c-a-title"); C.about.lead = val("c-a-lead");
      C.about.paragraphs = val("c-a-paras").split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
      persistContent(); updateLiveBadge(); SSApp.toast("About saved — live ✍️", "ok");
    };
  }

  /* ======================================================= FAQ ====== */
  function renderFaq() {
    const C = content; C.faq = C.faq || [];
    body().innerHTML = `
      ${pageTextPanel("faq", "FAQ page header")}
      <div class="ss-panel" style="margin-bottom:14px"><h3>Questions &amp; answers</h3><div id="c-faq"></div></div>
      <button class="ss-btn" id="faq-save">Save FAQ (go live)</button>`;
    drawList("c-faq", C.faq, (item, i) => `
      <div class="ss-list-row ss-list-row--stack" data-i="${i}"><input class="ss-field ss-field--sm" data-k="q" value="${esc(item.q || "")}" placeholder="Question">
      <textarea class="ss-field ss-field--sm" data-k="a" placeholder="Answer">${esc(item.a || "")}</textarea><button class="ss-icon-btn" data-del>✕</button></div>`, () => ({ q: "", a: "" }), "+ Add question");
    document.getElementById("faq-save").onclick = () => { savePageText("faq"); persistContent(); updateLiveBadge(); SSApp.toast("FAQ saved — live ✍️", "ok"); };
  }

  /* ==================================================== CONTACT ===== */
  function renderContact() {
    body().innerHTML = `${pageTextPanel("contact", "Contact page")}<button class="ss-btn" id="ct-save">Save Contact (go live)</button>`;
    document.getElementById("ct-save").onclick = () => { savePageText("contact"); persistContent(); updateLiveBadge(); SSApp.toast("Contact saved — live ✍️", "ok"); };
  }

  /* ================================================== PRE-ORDERS ==== */
  function renderPreorders() {
    body().innerHTML = `${pageTextPanel("preorders", "Pre-orders page")}<button class="ss-btn" id="pre-save">Save Pre-orders (go live)</button>`;
    document.getElementById("pre-save").onclick = () => { savePageText("preorders"); persistContent(); updateLiveBadge(); SSApp.toast("Pre-orders saved — live ✍️", "ok"); };
  }

  /* ============================================== SHOP & CHECKOUT === */
  function renderShopText() {
    const C = content; C.payment = C.payment || {}; C.fulfilment = C.fulfilment || {}; C.allergy = C.allergy || {};
    const P = C.payment, F = C.fulfilment, A = C.allergy;
    body().innerHTML = `
      <p style="color:var(--ink-60);margin:0 0 14px">Wording on your Shop, Vault, Cart, Checkout and the thank-you page customers see after ordering.</p>

      <div class="ss-panel" style="margin-bottom:14px"><h3>📅 Delivery / pickup dates</h3>
        <p style="color:var(--ink-60);font-size:.9rem">Control which dates customers can pick at checkout — so you can streamline fulfilment to dates after pre-orders close.</p>
        <div class="ss-grid2">
          <div><label class="ss-label">Earliest date allowed</label><input class="ss-field" type="date" id="ff-earliest" value="${esc(F.earliest || "")}">
            <small class="ss-seed">e.g. the day pre-orders close. Blank = from tomorrow.</small></div>
          <div><label class="ss-label">Note shown under the date</label><input class="ss-field" id="ff-note" value="${esc(F.note || "")}"></div>
        </div>
        <label class="ss-label" style="margin-top:14px">Blocked-out dates — tap a day to close it</label>
        <div class="ss-cal" id="ff-cal"></div>
        <div class="ss-cal-chips" id="ff-chips" style="margin-top:10px"></div>
        <small class="ss-seed">Tap any day to block it (closed days, holidays, sold-out slots). Tap again to reopen. Blocked days are cherry-red; customers can't pick them at checkout.</small>
      </div>

      <div class="ss-panel" style="margin-bottom:14px"><h3>💳 Payment &amp; bank transfer</h3>
        <p style="color:var(--ink-60);font-size:.9rem">Shown at checkout AND on the thank-you page. Use <code>{order}</code> in the share message to auto-insert the order number.</p>
        <label class="ss-switch ss-switch--chip"><input type="checkbox" id="pay-on" ${P.enabled !== false ? "checked" : ""}><span>Show payment / bank details</span></label>
        <label class="ss-label" style="margin-top:10px">Heading</label><input class="ss-field" id="pay-head" value="${esc(P.heading || "")}">
        <label class="ss-label" style="margin-top:10px">Intro line</label><input class="ss-field" id="pay-intro" value="${esc(P.intro || "")}">
        <div class="ss-grid2" style="margin-top:6px">
          <div><label class="ss-label">Bank name</label><input class="ss-field" id="pay-bank" value="${esc(P.bankName || "")}"></div>
          <div><label class="ss-label">Account title</label><input class="ss-field" id="pay-title" value="${esc(P.accountTitle || "")}"></div>
          <div><label class="ss-label">Account number</label><input class="ss-field" id="pay-acct" value="${esc(P.accountNumber || "")}"></div>
          <div><label class="ss-label">IBAN</label><input class="ss-field" id="pay-iban" value="${esc(P.iban || "")}"></div>
        </div>
        <label class="ss-label" style="margin-top:10px">Share-screenshot instructions</label>
        <textarea class="ss-field" id="pay-share" style="min-height:80px">${esc(P.shareText || "")}</textarea>
      </div>

      <div class="ss-panel" style="margin-bottom:14px"><h3>🥜 Allergy note</h3>
        <p style="color:var(--ink-60);font-size:.9rem">Shown at checkout and on every product page. Keep it honest — it protects you and your customers.</p>
        <label class="ss-switch ss-switch--chip"><input type="checkbox" id="alg-on" ${A.enabled !== false ? "checked" : ""}><span>Show allergy note</span></label>
        <label class="ss-label" style="margin-top:10px">Title</label><input class="ss-field" id="alg-title" value="${esc(A.title || "Allergy information")}">
        <label class="ss-label" style="margin-top:10px">Note</label>
        <textarea class="ss-field" id="alg-text" style="min-height:100px">${esc(A.text || "")}</textarea>
      </div>

      ${pageTextPanel("shop", "Shop page")}
      ${pageTextPanel("vault", "Vault page")}
      ${pageTextPanel("cart", "Cart page")}
      ${pageTextPanel("checkout", "Checkout page")}
      <div class="ss-panel ss-pub-hero" style="margin-bottom:14px"><h3>🎉 After-checkout “Thank you” page</h3>
        <p style="color:var(--ink-60)">What customers see right after ordering. Edit below, then preview with a sample order.</p>
        <a class="ss-btn ss-btn--sm" href="confirmation.html?preview=1" target="_blank" rel="noopener">👁️ Preview thank-you page</a>
      </div>
      ${pageTextPanel("confirmation", "Thank-you page text")}
      <button class="ss-btn" id="sc-save">Save (go live)</button>`;

    // --- click-to-block delivery calendar ---
    let blocked = (F.blocked || []).map(s => String(s).trim()).filter(Boolean);
    const calRef = new Date(); calRef.setDate(1); calRef.setHours(0, 0, 0, 0);
    const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const fmtD = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    function drawChips() {
      const el = document.getElementById("ff-chips"); if (!el) return;
      const sorted = blocked.slice().sort();
      el.innerHTML = sorted.length
        ? sorted.map(ds => `<span class="ss-chip ss-chip--sm ss-chip--blocked">${ds} <b data-rm="${ds}" title="Reopen this day">✕</b></span>`).join("")
        : `<span class="ss-seed">No blocked dates — customers can pick any available day.</span>`;
      el.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { const i = blocked.indexOf(b.getAttribute("data-rm")); if (i > -1) blocked.splice(i, 1); drawChips(); drawCal(); });
    }
    function drawCal() {
      const wrap = document.getElementById("ff-cal"); if (!wrap) return;
      const y = calRef.getFullYear(), m = calRef.getMonth();
      const startDay = new Date(y, m, 1).getDay();
      const days = new Date(y, m + 1, 0).getDate();
      const today = new Date(); today.setHours(0, 0, 0, 0);
      let cells = "";
      for (let i = 0; i < startDay; i++) cells += `<span class="ss-cal-cell ss-cal-empty"></span>`;
      for (let d = 1; d <= days; d++) {
        const date = new Date(y, m, d), ds = fmtD(date), past = date < today, on = blocked.indexOf(ds) > -1;
        cells += `<button type="button" class="ss-cal-cell${on ? " is-blocked" : ""}${past ? " is-past" : ""}" data-d="${ds}" ${past ? "disabled" : ""}>${d}</button>`;
      }
      wrap.innerHTML = `<div class="ss-cal-head"><button type="button" class="ss-icon-btn" id="ff-prev">‹</button><strong>${MON[m]} ${y}</strong><button type="button" class="ss-icon-btn" id="ff-next">›</button></div>
        <div class="ss-cal-dow"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>
        <div class="ss-cal-grid">${cells}</div>`;
      document.getElementById("ff-prev").onclick = () => { calRef.setMonth(m - 1); drawCal(); };
      document.getElementById("ff-next").onclick = () => { calRef.setMonth(m + 1); drawCal(); };
      wrap.querySelectorAll("[data-d]").forEach(b => b.onclick = () => { const ds = b.getAttribute("data-d"), i = blocked.indexOf(ds); if (i > -1) blocked.splice(i, 1); else blocked.push(ds); drawChips(); drawCal(); });
    }
    drawCal(); drawChips();

    document.getElementById("sc-save").onclick = () => {
      P.enabled = chkd("pay-on"); P.heading = val("pay-head"); P.intro = val("pay-intro");
      P.bankName = val("pay-bank"); P.accountTitle = val("pay-title"); P.accountNumber = val("pay-acct"); P.iban = val("pay-iban");
      P.shareText = val("pay-share");
      A.enabled = chkd("alg-on"); A.title = val("alg-title"); A.text = val("alg-text");
      F.earliest = val("ff-earliest").trim();
      F.note = val("ff-note");
      F.blocked = blocked.slice().sort();
      ["shop", "vault", "cart", "checkout", "confirmation"].forEach(savePageText);
      persistContent(); updateLiveBadge(); SSApp.toast("Saved — live ✍️", "ok");
    };
  }
  // generic repeatable list editor bound to an array (syncs on change)
  function drawList(containerId, arr, rowHtml, blank, addLabel) {
    const wrap = document.getElementById(containerId);
    function render() {
      wrap.innerHTML = arr.map((item, i) => rowHtml(item, i)).join("") + `<button class="ss-chip" data-add style="margin-top:6px">${addLabel}</button>`;
      wrap.querySelectorAll(".ss-list-row").forEach(row => {
        const i = +row.getAttribute("data-i");
        row.querySelectorAll("[data-k]").forEach(inp => inp.oninput = () => { arr[i][inp.getAttribute("data-k")] = inp.value; });
        const del = row.querySelector("[data-del]"); if (del) del.onclick = () => { arr.splice(i, 1); render(); };
      });
      wrap.querySelector("[data-add]").onclick = () => { arr.push(blank()); render(); };
    }
    render();
  }

  /* ==================================================== HOMEPAGE ==== */
  const HOME_SECTIONS = [
    ["featured", "Featured Scoops", "Your signature / featured products"],
    ["bestSellers", "Best Sellers", "Crowd-favourite products"],
    ["limited", "Limited Drops", "Limited / closing-soon items + countdown"],
    ["vault", "The Vault teaser", "Invite-only secret-code block"],
    ["about", "About Second Scoop", "Story, values & animated stats"],
    ["howItWorks", "How It Works", "The 4-step explainer"],
    ["reviews", "Customer Reviews", "Live reviews + “leave a review”"],
    ["carousel", "Photo Carousel", "Your photo gallery slider"],
    ["instagram", "Instagram Feed", "The @handle tile grid"],
    ["signup", "Email / SMS Signup", "“Unlock future scoops” form"],
  ];
  function renderHomepage() {
    const C = content;
    C.home = C.home || {}; C.home.sections = C.home.sections || {};
    C.hero = C.hero || {}; C.intro = C.intro || {}; C.sections = C.sections || {};
    C.howItWorks = C.howItWorks || []; C.gallery = C.gallery || { images: [] };
    C.instagramFeed = C.instagramFeed || { mode: "tiles", embedHtml: "", tiles: [] };
    const sec = C.home.sections, mob = C.hero.mobileMode || "auto", intro = C.intro, g = C.gallery, igf = C.instagramFeed;
    const localPreviews = {};
    body().innerHTML = `
      <p style="color:var(--ink-60);margin:0 0 14px">Everything on your <b>home page</b> lives here — top to bottom, exactly as it appears.</p>
      ${folderPanelHTML()}

      <div class="ss-panel" style="margin-bottom:14px"><h3>1 · Opening intro animation</h3>
        <p style="color:var(--ink-60);font-size:.9rem">A full-screen splash that morphs through words, then melts to reveal the site.</p>
        <label class="ss-switch ss-switch--chip"><input type="checkbox" id="in-on" ${intro.enabled !== false ? "checked" : ""}><span>Show the opening intro</span></label>
        <label class="ss-switch ss-switch--chip" style="margin-top:8px"><input type="checkbox" id="in-once" ${intro.oncePerSession !== false ? "checked" : ""}><span>Only the first visit each session</span></label>
        <label class="ss-label" style="margin-top:10px">Words to morph through (one per line — SS logo plays last)</label>
        <textarea class="ss-field" id="in-words" style="min-height:80px">${esc((intro.words || ["Warm.", "Gooey.", "Scoopable."]).join("\n"))}</textarea>
      </div>

      <div class="ss-panel" style="margin-bottom:14px"><h3>2 · Hero — words</h3>
        <label class="ss-label">Tagline (small, above headline)</label><input class="ss-field" id="c-h-tag" value="${esc(C.hero.tagline || "")}">
        <label class="ss-label" style="margin-top:10px">Headline (HTML ok — wrap a word in &lt;span class="accent"&gt;…&lt;/span&gt; to colour it)</label><textarea class="ss-field" id="c-h-head" style="min-height:60px">${esc(C.hero.headline || "")}</textarea>
        <label class="ss-label" style="margin-top:10px">Sub-text (HTML ok)</label><textarea class="ss-field" id="c-h-sub" style="min-height:60px">${esc(C.hero.sub || "")}</textarea>
        <label class="ss-label" style="margin-top:10px">Trust badges (one per line)</label><textarea class="ss-field" id="c-h-trust" style="min-height:64px">${esc((C.hero.trust || []).join("\n"))}</textarea>
        <label class="ss-switch ss-switch--chip" style="margin-top:10px"><input type="checkbox" id="c-h-wm" ${C.hero.showWordmark !== false ? "checked" : ""}><span>Show logo wordmark in hero</span></label>
      </div>

      <div class="ss-panel" style="margin-bottom:14px"><h3>3 · Hero — video</h3>
        <div class="ss-img-up">
          <div class="ss-img-up-prev" id="hvid-prev" style="width:90px;height:130px">${(C.hero && C.hero.video) ? `<video src="${SS.imgSrc(C.hero.video)}" muted autoplay loop playsinline style="width:100%;height:100%;object-fit:cover"></video>` : "No video"}</div>
          <div>
            <button class="ss-chip" id="hvid-up-btn">⬆ Upload hero video</button>
            <input type="file" id="hvid-up" accept="video/mp4,video/*" hidden>
            <label class="ss-label" style="margin-top:8px">…or path / URL</label>
            <input class="ss-field ss-field--sm" id="hvid-src" value="${esc((C.hero && C.hero.video) || "")}" placeholder="assets/video/hero.mp4" style="width:240px">
          </div>
        </div>
        <p style="color:var(--ink-60);font-size:.85rem;margin-top:10px">Desktop autoplays. On phones:</p>
        <label class="ss-switch ss-switch--chip" style="margin-bottom:8px"><input type="radio" name="hmob" value="tap" ${mob === "tap" ? "checked" : ""}><span><strong>Tap to play</strong> — phones show the poster + a play button</span></label>
        <label class="ss-switch ss-switch--chip"><input type="radio" name="hmob" value="auto" ${mob === "auto" ? "checked" : ""}><span><strong>Try autoplay</strong> (recommended)</span></label>
        <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">
          <a class="ss-chip" href="index.html?preview=1" target="_blank" rel="noopener">🖥️ Preview (new tab)</a>
          <button class="ss-chip" id="hp-mobprev" type="button">📱 Preview on phone</button>
        </div>
      </div>

      <div class="ss-panel" style="margin-bottom:14px"><h3>4 · Hero — fallback image</h3>
        <p style="color:var(--ink-60);font-size:.9rem">Shown if the video can't play.</p>
        <div class="ss-img-up">
          <div class="ss-img-up-prev" id="hero-prev">${C.hero && C.hero.image ? `<img src="${SS.imgSrc(C.hero.image)}" alt="">` : "No image"}</div>
          <div><button class="ss-chip" id="hero-up-btn">⬆ Upload hero photo</button>
            <input type="file" id="hero-up" accept="image/*" hidden>
            <label class="ss-label" style="margin-top:8px">…or filename / URL</label>
            <input class="ss-field ss-field--sm" id="hero-img" value="${esc((C.hero && C.hero.image) || "")}" placeholder="e.g. hero.jpg"></div>
        </div>
      </div>

      <div class="ss-panel" style="margin-bottom:14px"><h3>5 · Which sections show</h3>
        <p style="color:var(--ink-60);font-size:.9rem">Tick the blocks you want on the home page (top-to-bottom matches the page).</p>
        <div class="ss-home-toggles">
          ${HOME_SECTIONS.map(([k, label, desc]) => `
            <label class="ss-home-toggle"><input type="checkbox" id="hs-${k}" ${sec[k] !== false ? "checked" : ""}>
              <span class="ss-home-toggle-box"></span><span class="ss-home-toggle-txt"><strong>${label}</strong><small>${desc}</small></span></label>`).join("")}
        </div>
        <p class="ss-seed" style="margin-top:8px">The “About” block uses your story from the <b>About</b> tab. Edit its text there.</p>
      </div>

      <div class="ss-panel" style="margin-bottom:14px"><h3>6 · Section headings &amp; blurbs</h3>
        <p style="color:var(--ink-60);font-size:.9rem">The wording above each homepage block. Blank = built-in default.</p>
        ${SECTION_TEXT.map(([key, name, fields]) => `
          <div class="ss-subpanel"><h4>${name}</h4><div class="ss-grid2">
            ${fields.map(([f, label]) => { const v = esc(((C.sections[key] || {})[f]) || ""); return f === "text"
              ? `<div style="grid-column:1/-1"><label class="ss-label">${label}</label><textarea class="ss-field" id="c-sec-${key}-${f}" style="min-height:54px">${v}</textarea></div>`
              : `<div><label class="ss-label">${label}</label><input class="ss-field" id="c-sec-${key}-${f}" value="${v}"></div>`; }).join("")}
          </div></div>`).join("")}
      </div>

      <div class="ss-panel" style="margin-bottom:14px"><h3>7 · “How It Works” steps</h3><div id="c-how"></div></div>

      <div class="ss-panel" style="margin-bottom:14px"><h3>8 · Photo carousel</h3>
        <label class="ss-switch ss-switch--chip"><input type="checkbox" id="g-on" ${g.enabled !== false ? "checked" : ""}><span>Show the carousel</span></label>
        <div class="ss-grid2" style="margin-top:10px">
          <div><label class="ss-label">Eyebrow</label><input class="ss-field" id="g-eye" value="${esc(g.eyebrow || "")}"></div>
          <div><label class="ss-label">Title</label><input class="ss-field" id="g-title" value="${esc(g.title || "")}"></div>
        </div>
        <label class="ss-switch ss-switch--chip" style="margin-top:8px"><input type="checkbox" id="g-auto" ${g.autoplay !== false ? "checked" : ""}><span>Auto-advance slides</span></label>
        <div id="g-thumbs" class="ss-thumbs" style="margin-top:12px"></div>
        <div style="margin-top:10px"><button class="ss-chip" id="g-up-btn">⬆ Upload high-quality photos</button><input type="file" id="g-up" accept="image/*" multiple hidden></div>
        <details style="margin-top:10px"><summary style="cursor:pointer;font-size:.85rem;color:var(--ink-60)">Advanced: edit filenames / URLs</summary>
          <textarea class="ss-field" id="g-imgs" style="min-height:80px;margin-top:8px">${esc((g.images || []).join("\n"))}</textarea></details>
      </div>

      <div class="ss-panel" style="margin-bottom:14px"><h3>9 · Instagram feed</h3>
        <p style="color:var(--ink-60);font-size:.9rem">Connect <strong>@${esc((C.brand && C.brand.instagram) || "secondscoopco")}</strong>:</p>
        <label class="ss-switch ss-switch--chip" style="margin-bottom:8px"><input type="radio" name="igmode" value="tiles" ${igf.mode !== "embed" ? "checked" : ""}><span><strong>Photo tiles</strong> — upload your favourite posts (most reliable)</span></label>
        <label class="ss-switch ss-switch--chip"><input type="radio" name="igmode" value="embed" ${igf.mode === "embed" ? "checked" : ""}><span><strong>Live widget</strong> — paste an embed that auto-shows your real feed</span></label>
        <div style="margin-top:12px"><label class="ss-label">Photo tiles (filename or URL — one per line)</label>
          <textarea class="ss-field" id="ig-tiles" style="min-height:80px">${esc((igf.tiles || []).join("\n"))}</textarea>
          <div style="margin-top:8px"><button class="ss-chip" id="ig-up-btn">⬆ Upload Instagram photos</button><input type="file" id="ig-up" accept="image/*" multiple hidden></div></div>
        <label class="ss-label" style="margin-top:14px">Live widget embed code (optional)</label>
        <textarea class="ss-field" id="ig-embed" style="min-height:70px;font-family:monospace;font-size:.8rem" placeholder="<iframe src='https://lightwidget.com/widgets/...'></iframe>">${esc(igf.embedHtml || "")}</textarea>
        <small class="ss-seed">Free widget at lightwidget.com / behold.so — connect Instagram, copy the embed, paste here, pick “Live widget”.</small>
      </div>

      <button class="ss-btn" id="home-save">Save home page (go live)</button>`;

    wireFolderConnect(renderHomepage);
    const hpMob = document.getElementById("hp-mobprev"); if (hpMob) hpMob.onclick = () => openMobilePreview("index.html?preview=1");

    // how it works editor (auto-syncs to C.howItWorks)
    drawList("c-how", C.howItWorks, (item, i) => `
      <div class="ss-list-row" data-i="${i}"><input class="ss-field ss-field--sm" data-k="title" value="${esc(item.title || "")}" placeholder="Step title">
      <input class="ss-field ss-field--sm" data-k="text" value="${esc(item.text || "")}" placeholder="Step text"><button class="ss-icon-btn" data-del>✕</button></div>`, () => ({ title: "", text: "" }), "+ Add step");

    // carousel thumbnails
    function renderThumbs() {
      const ta = document.getElementById("g-imgs"), wrap = document.getElementById("g-thumbs"); if (!ta || !wrap) return;
      const list = ta.value.split("\n").map(s => s.trim()).filter(Boolean);
      wrap.innerHTML = list.length ? list.map((src, i) =>
        `<div class="ss-thumb"><img src="${localPreviews[src] || SS.imgSrc(src)}" alt="" onerror="this.parentNode.classList.add('bad')"><button class="ss-thumb-x" data-i="${i}" title="Remove">✕</button></div>`).join("")
        : `<p class="ss-seed">No photos yet.</p>`;
      wrap.querySelectorAll("[data-i]").forEach(b => b.onclick = () => { const arr = ta.value.split("\n").map(s => s.trim()).filter(Boolean); arr.splice(+b.getAttribute("data-i"), 1); ta.value = arr.join("\n"); renderThumbs(); });
    }
    renderThumbs();

    // hero image upload
    const heroBtn = document.getElementById("hero-up-btn"), heroIn = document.getElementById("hero-up");
    heroBtn.onclick = () => heroIn.click();
    heroIn.onchange = async e => { const file = e.target.files[0]; e.target.value = ""; if (!file) return; heroBtn.disabled = true; heroBtn.textContent = "Uploading…";
      try { const name = await uploadImageToGitHub(file); document.getElementById("hero-img").value = name; document.getElementById("hero-prev").innerHTML = `<img src="${URL.createObjectURL(file)}" alt="">`; }
      catch (err) { SSApp.toast(String(err), "err"); } heroBtn.disabled = false; heroBtn.textContent = "⬆ Upload hero photo"; };
    // hero video upload
    const hvBtn = document.getElementById("hvid-up-btn"), hvIn = document.getElementById("hvid-up");
    hvBtn.onclick = () => hvIn.click();
    hvIn.onchange = async e => { const file = e.target.files[0]; e.target.value = ""; if (!file) return; hvBtn.disabled = true; hvBtn.textContent = "Uploading…";
      try { const path = await uploadVideoToGitHub(file); document.getElementById("hvid-src").value = path; document.getElementById("hvid-prev").innerHTML = `<video src="${URL.createObjectURL(file)}" muted autoplay loop playsinline style="width:100%;height:100%;object-fit:cover"></video>`; }
      catch (err) { SSApp.toast(String(err), "err"); } hvBtn.disabled = false; hvBtn.textContent = "⬆ Upload hero video"; };
    // carousel upload
    const gBtn = document.getElementById("g-up-btn"), gIn = document.getElementById("g-up");
    gBtn.onclick = () => gIn.click();
    gIn.onchange = async e => { const files = [...e.target.files]; e.target.value = ""; const ta = document.getElementById("g-imgs");
      for (const file of files) { gBtn.disabled = true; gBtn.textContent = "Uploading…";
        try { const name = await uploadImageToGitHub(file); localPreviews[name] = URL.createObjectURL(file); ta.value = (ta.value.trim() ? ta.value.trim() + "\n" : "") + name; renderThumbs(); }
        catch (err) { SSApp.toast(String(err), "err"); } }
      gBtn.disabled = false; gBtn.textContent = "⬆ Upload high-quality photos"; };
    // instagram upload
    const igBtn = document.getElementById("ig-up-btn"), igIn = document.getElementById("ig-up");
    igBtn.onclick = () => igIn.click();
    igIn.onchange = async e => { const files = [...e.target.files]; e.target.value = ""; const ta = document.getElementById("ig-tiles");
      for (const file of files) { igBtn.disabled = true; igBtn.textContent = "Uploading…";
        try { const name = await uploadImageToGitHub(file); ta.value = (ta.value.trim() ? ta.value.trim() + "\n" : "") + name; SSApp.toast("Added " + name, "ok"); }
        catch (err) { SSApp.toast(String(err), "err"); } }
      igBtn.disabled = false; igBtn.textContent = "⬆ Upload Instagram photos"; };

    document.getElementById("home-save").onclick = () => {
      // sections shown
      HOME_SECTIONS.forEach(([k]) => { C.home.sections[k] = chkd("hs-" + k); });
      // hero words + media
      C.hero.tagline = val("c-h-tag"); C.hero.headline = val("c-h-head"); C.hero.sub = val("c-h-sub");
      C.hero.trust = val("c-h-trust").split("\n").map(s => s.trim()).filter(Boolean); C.hero.showWordmark = chkd("c-h-wm");
      C.hero.image = val("hero-img").trim(); C.hero.video = val("hvid-src").trim();
      const r = document.querySelector('input[name="hmob"]:checked'); C.hero.mobileMode = r ? r.value : "auto";
      // intro
      C.intro.enabled = chkd("in-on"); C.intro.oncePerSession = chkd("in-once");
      C.intro.words = val("in-words").split("\n").map(s => s.trim()).filter(Boolean);
      // section headings
      SECTION_TEXT.forEach(([key, , fields]) => { C.sections[key] = C.sections[key] || {}; fields.forEach(([f]) => { const v = val("c-sec-" + key + "-" + f).trim(); if (v) C.sections[key][f] = v; }); });
      // carousel
      C.gallery.enabled = chkd("g-on"); C.gallery.eyebrow = val("g-eye"); C.gallery.title = val("g-title"); C.gallery.autoplay = chkd("g-auto");
      C.gallery.images = val("g-imgs").split("\n").map(s => s.trim()).filter(Boolean);
      // instagram
      const igm = document.querySelector('input[name="igmode"]:checked'); C.instagramFeed.mode = igm ? igm.value : "tiles";
      C.instagramFeed.tiles = val("ig-tiles").split("\n").map(s => s.trim()).filter(Boolean); C.instagramFeed.embedHtml = val("ig-embed").trim();
      const ok = persistContent();
      if (!ok) { SSApp.toast("Couldn't save — too much data (upload photos instead of pasting them).", "err"); return; }
      updateLiveBadge(); SSApp.toast("Home page saved — live 🏠", "ok");
    };
  }

  /* ===================================================== POPUPS ===== */
  function renderPopups() {
    const C = content; C.popups = C.popups || { enabled: true, events: [] };
    const P = C.popups; P.events = P.events || [];
    const localPreviews = {};
    body().innerHTML = `
      <div class="ss-panel" style="margin-bottom:14px"><h3>Popups page</h3>
        <p style="color:var(--ink-60);font-size:.9rem">Showcase your events — markets, collabs, one-night drops. Each one shows a photo, title and where/when it happened. Appears on the <b>Popups</b> page (toggle the menu link in Menu &amp; Regions).</p>
        <label class="ss-switch ss-switch--chip"><input type="checkbox" id="pop-on" ${P.enabled !== false ? "checked" : ""}><span>Show the Popups page</span></label>
        <div class="ss-grid2" style="margin-top:10px">
          <div><label class="ss-label">Eyebrow</label><input class="ss-field" id="pop-eye" value="${esc(P.eyebrow || "")}"></div>
          <div><label class="ss-label">Title</label><input class="ss-field" id="pop-title" value="${esc(P.title || "")}"></div>
        </div>
        <label class="ss-label" style="margin-top:10px">Intro line</label><input class="ss-field" id="pop-intro" value="${esc(P.intro || "")}">
      </div>
      <div class="ss-panel" style="margin-bottom:14px"><h3>Events</h3>
        ${folderConnected() ? "" : `<p class="ss-seed" style="margin-bottom:10px">Tip: connect your project folder in <b>Design &amp; Logo</b> so event photos upload straight into your site.</p>`}
        <div id="pop-events"></div>
        <button class="ss-chip" id="pop-add" style="margin-top:8px">+ Add a popup</button>
      </div>
      <button class="ss-btn" id="pop-save">Save popups (go live)</button>`;

    // migrate any old single-image events to the images[] array
    P.events.forEach(ev => { if (!ev.images) ev.images = ev.image ? [ev.image] : []; });
    function thumbHTML(ev, i) {
      return (ev.images || []).map((src, j) =>
        `<div class="ss-thumb"><img src="${localPreviews[src] || SS.imgSrc(src)}" alt="" onerror="this.parentNode.classList.add('bad')"><button class="ss-thumb-x" data-delimg="${i}:${j}" title="Remove">✕</button></div>`).join("");
    }
    function draw() {
      const wrap = document.getElementById("pop-events");
      wrap.innerHTML = P.events.map((ev, i) => `
        <div class="ss-subpanel" data-ev="${i}">
          <div class="ss-grid2">
            <div><label class="ss-label">Title</label><input class="ss-field ss-field--sm" data-k="title" value="${esc(ev.title || "")}" placeholder="Lahore Eat Festival"></div>
            <div><label class="ss-label">Location</label><input class="ss-field ss-field--sm" data-k="location" value="${esc(ev.location || "")}" placeholder="Gulberg, Lahore"></div>
            <div><label class="ss-label">Date / when</label><input class="ss-field ss-field--sm" data-k="date" value="${esc(ev.date || "")}" placeholder="March 2026"></div>
            <div><label class="ss-label">Caption</label><input class="ss-field ss-field--sm" data-k="caption" value="${esc(ev.caption || "")}" placeholder="Sold out in 3 hours."></div>
          </div>
          <label class="ss-label" style="margin-top:10px">Photos for this popup</label>
          <div class="ss-thumbs">${thumbHTML(ev, i) || `<p class="ss-seed">No photos yet.</p>`}</div>
          <div style="margin-top:8px;display:flex;gap:8px"><button class="ss-chip" data-up="${i}">⬆ Upload photos</button><button class="ss-chip ss-chip--danger" data-del="${i}">✕ Remove this popup</button></div>
        </div>`).join("") || `<p class="ss-seed">No popups yet — add your first one below.</p>`;
      wrap.querySelectorAll("[data-ev]").forEach(row => {
        const i = +row.getAttribute("data-ev");
        row.querySelectorAll("[data-k]").forEach(inp => inp.oninput = () => { P.events[i][inp.getAttribute("data-k")] = inp.value; });
      });
      wrap.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { P.events.splice(+b.getAttribute("data-del"), 1); draw(); });
      wrap.querySelectorAll("[data-delimg]").forEach(b => b.onclick = () => { const [i, j] = b.getAttribute("data-delimg").split(":").map(Number); P.events[i].images.splice(j, 1); draw(); });
      wrap.querySelectorAll("[data-up]").forEach(b => b.onclick = () => {
        const i = +b.getAttribute("data-up");
        const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.multiple = true;
        inp.onchange = async e => {
          const files = [...e.target.files]; if (!files.length) return;
          b.disabled = true; b.textContent = "Uploading…";
          for (const file of files) {
            try { const name = await uploadImageToGitHub(file); localPreviews[name] = URL.createObjectURL(file); P.events[i].images.push(name); }
            catch (err) { SSApp.toast(String(err), "err"); }
          }
          b.disabled = false; draw();
        };
        inp.click();
      });
    }
    draw();
    document.getElementById("pop-add").onclick = () => { P.events.push({ title: "", location: "", date: "", image: "", caption: "" }); draw(); };
    document.getElementById("pop-save").onclick = () => {
      P.enabled = chkd("pop-on"); P.eyebrow = val("pop-eye"); P.title = val("pop-title"); P.intro = val("pop-intro");
      C.nav = C.nav || {}; C.nav.popups = P.enabled;   // hide the menu link if the page is off
      const ok = persistContent();
      if (!ok) { SSApp.toast("Couldn't save — too much data (upload photos instead of pasting them).", "err"); return; }
      updateLiveBadge(); SSApp.toast("Popups saved — live 📍", "ok");
    };
  }

  /* ================================================ MENU & REGIONS == */
  const NAV_ITEMS = [["home", "Home"], ["shop", "Shop"], ["bundles", "Bundles"], ["vault", "The Vault"], ["popups", "Popups"],
    ["preorders", "Pre-Orders"], ["about", "About"], ["faq", "FAQ"], ["contact", "Contact"]];
  function renderMenu() {
    const C = content; C.nav = C.nav || {};
    const regions = Object.keys(SS_REGIONS).map(id => SS.regionById(id));
    body().innerHTML = `
      <div class="ss-panel ss-pub-hero" style="margin-bottom:14px"><h3>👁️ Preview before you launch</h3>
        <p style="color:var(--ink-60)">See every unpublished change exactly as a customer would — without going live. When it looks right, go to <b>Save &amp; Export → Publish</b>.</p>
        <a class="ss-btn ss-btn--lg" href="index.html?preview=1" target="_blank" rel="noopener">Open live preview (draft)</a>
        <p class="ss-seed" style="margin-top:8px">Tip: the preview shows the same edits you've made here, on this browser. Customers keep seeing the published site until you Publish.</p>
      </div>
      <div class="ss-panel" style="margin-bottom:14px"><h3>Top menu links</h3>
        <p style="color:var(--ink-60);font-size:.9rem">Tick what appears in the top navigation bar. The country picker is the flag dropdown on the right — it's not a menu link.</p>
        <div class="ss-home-toggles">
          ${NAV_ITEMS.map(([k, label]) => `
            <label class="ss-home-toggle"><input type="checkbox" id="nav-${k}" ${C.nav[k] !== false ? "checked" : ""}>
              <span class="ss-home-toggle-box"></span><span class="ss-home-toggle-txt"><strong>${label}</strong></span></label>`).join("")}
        </div>
      </div>
      <div class="ss-panel" style="margin-bottom:14px"><h3>Regions / countries</h3>
        <p style="color:var(--ink-60);font-size:.9rem">Set each store's status. <b>Live</b> = fully orderable. <b>Coming soon</b> = shown everywhere (gate + flag dropdown) but products display as “Coming Soon” and can't be ordered yet. <b>Hidden</b> = removed completely. Leave at least one Live.</p>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
          ${regions.map(r => {
            const state = r.hidden ? "hidden" : (r.comingSoon ? "soon" : "live");
            return `<div class="ss-region-state">
              <strong>${r.flag} ${r.name} <small style="color:var(--ink-40);font-weight:600">${r.currency}</small></strong>
              <select class="ss-field ss-field--sm" id="rgn-${r.id}" style="max-width:200px">
                <option value="live" ${state === "live" ? "selected" : ""}>🟢 Live — orderable</option>
                <option value="soon" ${state === "soon" ? "selected" : ""}>🟡 Coming soon</option>
                <option value="hidden" ${state === "hidden" ? "selected" : ""}>⚪️ Hidden</option>
              </select></div>`;
          }).join("")}
        </div>
      </div>
      <button class="ss-btn" id="menu-save">Save menu &amp; regions (go live)</button>`;

    document.getElementById("menu-save").onclick = () => {
      const states = {}; regions.forEach(r => { states[r.id] = val("rgn-" + r.id); });
      const notHidden = regions.filter(r => states[r.id] !== "hidden").length;
      if (notHidden < 1) { SSApp.toast("Keep at least one region visible, or the shop has nothing to show.", "err"); return; }
      NAV_ITEMS.forEach(([k]) => { C.nav[k] = chkd("nav-" + k); });
      regions.forEach(r => {
        const s = states[r.id];
        SS.saveRegionPatch(r.id, { hidden: s === "hidden", comingSoon: s === "soon" });
      });
      persistContent(); updateLiveBadge(); SSApp.toast("Menu & regions saved — live 🧭", "ok");
    };
  }

  /* ===================================================== DESIGN ===== */
  const THEME_FIELDS = [
    ["choc", "Brand / text"], ["caramel", "Accent"], ["cookie", "Cookie tone"],
    ["cream", "Page background"], ["blush", "Blush pink"], ["gold", "Gold"],
  ];
  function renderDesign() {
    const C = content;
    C.theme = C.theme || {}; C.header = C.header || {}; C.effects = C.effects || {};
    body().innerHTML = `
      <p style="color:var(--ink-60);margin:0 0 14px">Site-wide look — applies to every page. (Hero, carousel &amp; Instagram photos live in the <b>Home</b> tab.)</p>
      <div class="ss-panel" style="margin-bottom:14px"><h3>Colour scheme</h3>
        <p style="color:var(--ink-60);font-size:.9rem">Pick your colours — the whole site (and this backend) updates live as you choose. Press Save to keep them, then Publish to go live.</p>
        <div class="ss-design-colors">
          ${THEME_FIELDS.map(([k, label]) => `
            <label class="ss-color-row">
              <input type="color" id="th-${k}" value="${esc(C.theme[k] || defaultTheme(k))}">
              <div><strong>${label}</strong><br><input class="ss-field ss-field--sm" id="thx-${k}" value="${esc(C.theme[k] || defaultTheme(k))}" style="width:110px"></div>
            </label>`).join("")}
        </div>
        <button class="ss-chip" id="th-reset" style="margin-top:10px">↺ Reset to original colours</button>
      </div>

      <div class="ss-panel" style="margin-bottom:14px"><h3>Logo &amp; header</h3>
        <div class="ss-grid2">
          <div><label class="ss-label">Logo placement</label>
            <select class="ss-field" id="h-align"><option value="left" ${C.header.logoAlign !== "center" ? "selected" : ""}>Left (with menu)</option><option value="center" ${C.header.logoAlign === "center" ? "selected" : ""}>Centered</option></select></div>
          <div><label class="ss-label">Logo size (px)</label><input class="ss-field" id="h-size" type="number" min="20" max="60" value="${C.header.logoSize || 34}"></div>
        </div>
        <label class="ss-switch ss-switch--chip" style="margin-top:10px"><input type="checkbox" id="h-word" ${C.header.showWordmark !== false ? "checked" : ""}><span>Show “Second Scoop.” text beside the logo</span></label>
      </div>

      <div class="ss-panel" style="margin-bottom:14px"><h3>Motion &amp; effects</h3>
        <label class="ss-switch ss-switch--chip"><input type="checkbox" id="e-reveal" ${C.effects.scrollReveal !== false ? "checked" : ""}><span>Fade sections in as you scroll</span></label>
        <label class="ss-switch ss-switch--chip" style="margin-top:8px"><input type="checkbox" id="e-parallax" ${C.effects.heroParallax !== false ? "checked" : ""}><span>Hero parallax on scroll</span></label>
      </div>

      <button class="ss-btn" id="d-save">Save design (go live preview)</button>`;

    // live colour preview
    THEME_FIELDS.forEach(([k]) => {
      const picker = document.getElementById("th-" + k), hex = document.getElementById("thx-" + k);
      const apply = (v) => { C.theme[k] = v; picker.value = v; hex.value = v; document.documentElement.style.setProperty("--" + k, v); if (k === "cream" || k === "blush") SSApp.applyTheme(); };
      picker.oninput = () => apply(picker.value);
      hex.onchange = () => { if (/^#[0-9a-fA-F]{6}$/.test(hex.value)) apply(hex.value); };
    });
    document.getElementById("th-reset").onclick = () => {
      THEME_FIELDS.forEach(([k]) => { C.theme[k] = defaultTheme(k); document.documentElement.style.setProperty("--" + k, defaultTheme(k)); });
      SSApp.applyTheme(); renderDesign(); SSApp.toast("Colours reset", "ok");
    };
    document.getElementById("d-save").onclick = () => {
      C.header.logoAlign = val("h-align"); C.header.logoSize = Math.max(20, Math.min(60, parseInt(val("h-size"), 10) || 34)); C.header.showWordmark = chkd("h-word");
      C.effects.scrollReveal = chkd("e-reveal"); C.effects.heroParallax = chkd("e-parallax");
      persistContent(); updateLiveBadge(); SSApp.applyTheme(); SSApp.toast("Design saved — live 🎨", "ok");
    };
  }
  function defaultTheme(k) {
    return ({ choc: "#2b1600", caramel: "#8b152c", cookie: "#ce9155", cream: "#ffeec4", blush: "#f8b6b8", gold: "#ffd583" })[k] || "#000000";
  }

  /* ==================================================== ANNOUNCE ==== */
  function renderAnnounce() {
    const styles = [["available", "Available (green)"], ["preorder", "Pre-Order (brown)"], ["closing", "Closing Soon (red)"], ["sold-out", "Sold Out (dark)"], ["coming-soon", "Coming Soon (gold)"]];
    body().innerHTML = REGION_IDS.map(rid => { const a = announce[rid], R = SS_REGIONS[rid];
      return `<div class="ss-panel" style="margin-bottom:14px"><h3>${R.flag} ${R.name} announcement bar</h3>
        <label class="ss-switch"><input type="checkbox" id="a-on-${rid}" ${a.enabled ? "checked" : ""}><span>Show the bar</span></label>
        <label class="ss-label" style="margin-top:10px">Message</label><input class="ss-field" id="a-text-${rid}" value="${esc(a.text || "")}">
        <label class="ss-label" style="margin-top:10px">Colour</label><select class="ss-field" id="a-style-${rid}">${styles.map(s => `<option value="${s[0]}" ${a.style === s[0] ? "selected" : ""}>${s[1]}</option>`).join("")}</select>
        <div class="ss-announce ss-announce--${a.style}" style="margin-top:12px;border-radius:10px"><span class="ss-announce-dot"></span>${esc(a.text || "Preview")}</div></div>`;
    }).join("") + `<button class="ss-btn" id="a-save">Save announcements (go live)</button>`;
    document.getElementById("a-save").onclick = () => { REGION_IDS.forEach(rid => announce[rid] = { enabled: chkd("a-on-" + rid), text: val("a-text-" + rid).trim(), style: val("a-style-" + rid) }); persistAnnounce(); updateLiveBadge(); SSApp.toast("Announcements saved — live 📣", "ok"); };
  }

  /* ===================================================== SETTINGS == */
  function renderSettings() {
    const b = content.brand || (content.brand = {});
    const gs = settings.googleSheets || (settings.googleSheets = {});
    body().innerHTML = `
      <div class="ss-panel" style="margin-bottom:14px"><h3>Brand &amp; contact</h3>
        <div class="ss-grid2"><div><label class="ss-label">Brand name</label><input class="ss-field" id="s-name" value="${esc(b.name || "")}"></div>
          <div><label class="ss-label">Tagline</label><input class="ss-field" id="s-tag" value="${esc(b.tagline || "")}"></div>
          <div><label class="ss-label">Contact email</label><input class="ss-field" id="s-email" value="${esc(b.email || "")}"></div>
          <div><label class="ss-label">Instagram handle (no @)</label><input class="ss-field" id="s-ig" value="${esc(b.instagram || "")}"></div>
          <div class="full"><label class="ss-label">Instagram URL</label><input class="ss-field" id="s-igurl" value="${esc(b.instagramUrl || "")}"></div>
          <div class="full"><label class="ss-label">Footer note</label><input class="ss-field" id="s-foot" value="${esc(b.footerNote || "")}"></div></div></div>

      ${REGION_IDS.map(rid => regionSettings(rid)).join("")}

      <div class="ss-panel" style="margin-bottom:14px"><h3>Google Sheets order sync</h3>
        <label class="ss-label">Web App URL (from SETUP_GUIDE.md)</label><input class="ss-field" id="s-gs-url" value="${esc(gs.webhookUrl || "")}" placeholder="https://script.google.com/macros/s/…/exec">
        <label class="ss-switch ss-switch--chip" style="margin-top:10px"><input type="checkbox" id="s-gs-on" ${gs.enabled !== false ? "checked" : ""}><span>Send orders to Google Sheets</span></label>
        <small class="ss-seed">Lahore orders flow into your “Monthly orders” tab. See SETUP_GUIDE.md.</small>
        <label class="ss-label" style="margin-top:12px">Secure order endpoint (optional — anti-tampering)</label>
        <input class="ss-field" id="s-gs-endpoint" value="${esc(gs.orderEndpoint || "")}" placeholder="/.netlify/functions/place-order">
        <small class="ss-seed">Once you set up the Netlify Function (see <code>SERVER-SETUP.md</code>), put <code>/.netlify/functions/place-order</code> here. Orders then get their total re-checked on the server, and your webhook URL stays hidden. Leave blank to keep sending straight to the sheet.</small></div>

      <div class="ss-panel" style="margin-bottom:14px"><h3>Live orders in your dashboard</h3>
        <p style="color:var(--ink-60);font-size:.9rem">Lets your Dashboard &amp; Orders tabs show <strong>every customer's order</strong> (not just this device) by reading them back from your sheet. Enter the same secret <code>READ_KEY</code> you set in the Apps Script.</p>
        <label class="ss-label">Dashboard read key</label><input class="ss-field" id="s-readkey" type="password" value="${esc(SS.read("ss_orders_key", ""))}" placeholder="e.g. scoop-read-2026">
        <small class="ss-seed">🔒 Stored only in this browser — never written into your published files.</small></div>

      <div class="ss-panel" style="margin-bottom:14px"><h3>Backend passcode</h3>
        <label class="ss-label">Passcode to open this backend</label><input class="ss-field" id="s-pass" value="${esc((settings.admin || {}).passcode || "")}">
        <small class="ss-seed">Change this from the default. You'll use it next time you log in.</small></div>

      ${publishPanel()}

      <button class="ss-btn" id="s-save">Save settings (go live)</button>`;
    document.getElementById("s-save").onclick = saveSettingsForm;
    const pt = document.getElementById("pub-test"); if (pt) pt.onclick = testPublish;

    // delivery-zones editor (per region)
    zoneState = {};
    REGION_IDS.forEach(rid => { zoneState[rid] = (((regionView[rid] || {}).delivery || {}).zones || []).map(z => ({ name: z.name || "", fee: Number(z.fee) || 0 })); });
    function drawZones(rid) {
      const wrap = document.getElementById("r-" + rid + "-zones"); if (!wrap) return;
      const arr = zoneState[rid], R = SS_REGIONS[rid];
      wrap.innerHTML = arr.length ? arr.map((z, i) => `<div class="ss-size-row" data-i="${i}">
        <input class="ss-field ss-field--sm" data-zk="name" value="${esc(z.name || "")}" placeholder="Area (e.g. Gulberg)">
        <input class="ss-field ss-field--sm" data-zk="fee" type="number" min="0" step="${R.currency === "PKR" ? 1 : 0.01}" value="${z.fee || 0}" placeholder="Fee (${R.currency})">
        <button class="ss-icon-btn" type="button" data-zdel="${i}">✕</button></div>`).join("") : `<p class="ss-seed">No areas — the flat fee above is used.</p>`;
      wrap.querySelectorAll(".ss-size-row").forEach(row => {
        const i = +row.getAttribute("data-i");
        row.querySelectorAll("[data-zk]").forEach(inp => inp.oninput = () => { const k = inp.getAttribute("data-zk"); arr[i][k] = k === "fee" ? (Number(inp.value) || 0) : inp.value; });
        row.querySelector("[data-zdel]").onclick = () => { arr.splice(i, 1); drawZones(rid); };
      });
    }
    REGION_IDS.forEach(rid => {
      drawZones(rid);
      const ab = document.getElementById("r-" + rid + "-zone-add");
      if (ab) ab.onclick = () => { zoneState[rid].push({ name: "", fee: 0 }); drawZones(rid); };
    });
  }
  function regionSettings(rid) {
    const r = regionView[rid], R = SS_REGIONS[rid];
    const pk = r.pickup || {}, dl = r.delivery || {}, ct = r.contact || {};
    return `<div class="ss-panel" style="margin-bottom:14px"><h3>${R.flag} ${R.name} — locations &amp; delivery</h3>
      <div class="ss-grid2">
        <div><label class="ss-label">Pickup address</label><input class="ss-field" id="r-${rid}-paddr" value="${esc(pk.address || "")}"></div>
        <div><label class="ss-label">Pickup hours</label><input class="ss-field" id="r-${rid}-phours" value="${esc(pk.hours || "")}"></div>
        <div class="full"><label class="ss-label">Pickup note</label><input class="ss-field" id="r-${rid}-pnote" value="${esc(pk.notes || "")}"></div>
        <div><label class="ss-label">Delivery fee (${R.currency})</label><input class="ss-field" id="r-${rid}-dfee" type="number" min="0" value="${dl.fee != null ? dl.fee : 0}"></div>
        <div><label class="ss-label">Free delivery over (0 = never)</label><input class="ss-field" id="r-${rid}-dfree" type="number" min="0" value="${dl.freeOver != null ? dl.freeOver : 0}"></div>
        <div class="full"><label class="ss-label">Delivery ETA text</label><input class="ss-field" id="r-${rid}-deta" value="${esc(dl.etaText || "")}"></div>
        <div class="full"><label class="ss-label">Delivery cities (comma separated)</label><input class="ss-field" id="r-${rid}-dcities" value="${esc((dl.cities || []).join(", "))}"></div>
        <div><label class="ss-label">WhatsApp</label><input class="ss-field" id="r-${rid}-cwa" value="${esc(ct.whatsapp || "")}"></div>
        <div><label class="ss-label">Region email</label><input class="ss-field" id="r-${rid}-cem" value="${esc(ct.email || "")}"></div>
        <div class="full" style="border-top:1px solid var(--line);padding-top:12px;margin-top:4px">
          <label class="ss-label">Delivery areas &amp; fees (charge by area)</label>
          <div class="ss-zones-edit" id="r-${rid}-zones"></div>
          <button class="ss-chip" type="button" id="r-${rid}-zone-add" style="margin-top:6px">+ Add an area</button>
          <small class="ss-seed">Add each area you deliver to and its own fee. At checkout the customer picks their area (or it's auto-detected from their address) and that fee is charged. Leave empty to use the single flat fee above.</small>
        </div>
      </div></div>`;
  }
  function publishPanel() {
    const c = getPublishCfg();
    const ready = publishConfigured();
    return `<div class="ss-panel" style="margin-bottom:14px" id="pub-panel">
      <h3>⤴ One-click publishing ${ready ? `<span class="ss-tag" style="background:#d7f0df;color:#2a6b43">Connected</span>` : `<span class="ss-tag ss-tag--off">Not set up</span>`}</h3>
      <p style="color:var(--ink-60);font-size:.9rem">Connect your GitHub repo once. Then the <strong>Publish to live site</strong> button (top right) pushes all your changes live automatically — no downloads. See <code>PUBLISH_GUIDE.md</code> for the 10-minute setup.</p>
      <div class="ss-grid2">
        <div><label class="ss-label">GitHub username / owner</label><input class="ss-field" id="pub-owner" value="${esc(c.owner)}" placeholder="your-username"></div>
        <div><label class="ss-label">Repository name</label><input class="ss-field" id="pub-repo" value="${esc(c.repo)}" placeholder="second-scoop"></div>
        <div><label class="ss-label">Branch</label><input class="ss-field" id="pub-branch" value="${esc(c.branch || "main")}" placeholder="main"></div>
        <div><label class="ss-label">Config folder path</label><input class="ss-field" id="pub-dir" value="${esc(c.dir || "assets/js/config")}"></div>
        <div class="full"><label class="ss-label">GitHub access token (fine-grained, Contents: Read &amp; write)</label>
          <input class="ss-field" id="pub-token" type="password" value="${esc(c.token)}" placeholder="github_pat_…"></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px"><button class="ss-chip" id="pub-test">Test connection</button></div>
      <small class="ss-seed">🔒 Your token is stored only in this browser and is never written into any published file. Use a fine-grained token limited to this one repo.</small>
      <p id="pub-test-msg" style="font-size:.85rem;font-weight:700;min-height:1.1em;margin:.5em 0 0"></p>
    </div>`;
  }

  async function testPublish() {
    const cfg = readPublishForm();
    const msg = document.getElementById("pub-test-msg");
    if (!cfg.token || !cfg.owner || !cfg.repo) { msg.style.color = "var(--err)"; msg.textContent = "Fill in owner, repo and token first."; return; }
    msg.style.color = "var(--ink-60)"; msg.textContent = "Checking…";
    try {
      const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}`, { headers: { "Authorization": "Bearer " + cfg.token, "Accept": "application/vnd.github+json" } });
      if (res.status === 200) { msg.style.color = "var(--ok)"; msg.textContent = "✅ Connected to " + cfg.owner + "/" + cfg.repo + ". Saving will enable Publish."; savePublishCfg(cfg); }
      else if (res.status === 401) { msg.style.color = "var(--err)"; msg.textContent = "❌ Token rejected (401). Check it has Contents: Read & write on this repo."; }
      else if (res.status === 404) { msg.style.color = "var(--err)"; msg.textContent = "❌ Repo not found (404). Check owner/repo spelling and token access."; }
      else { msg.style.color = "var(--err)"; msg.textContent = "❌ GitHub error (" + res.status + ")."; }
    } catch (e) { msg.style.color = "var(--err)"; msg.textContent = "❌ Network error reaching GitHub."; }
  }
  function readPublishForm() {
    return { token: val("pub-token").trim(), owner: val("pub-owner").trim(), repo: val("pub-repo").trim(), branch: val("pub-branch").trim() || "main", dir: val("pub-dir").trim() || "assets/js/config" };
  }

  function saveSettingsForm() {
    const b = content.brand;
    b.name = val("s-name"); b.tagline = val("s-tag"); b.email = val("s-email");
    b.instagram = val("s-ig"); b.instagramUrl = val("s-igurl"); b.footerNote = val("s-foot");
    persistContent();
    settings.googleSheets = settings.googleSheets || {};
    settings.googleSheets.webhookUrl = val("s-gs-url").trim();
    if (document.getElementById("s-gs-endpoint")) settings.googleSheets.orderEndpoint = val("s-gs-endpoint").trim();
    settings.googleSheets.enabled = chkd("s-gs-on");
    if (document.getElementById("s-readkey")) { SS.write("ss_orders_key", val("s-readkey").trim()); remoteState = "idle"; remoteOrders = null; }
    settings.admin = settings.admin || {}; settings.admin.passcode = val("s-pass").trim() || settings.admin.passcode;
    persistSettings();
    REGION_IDS.forEach(rid => {
      const patch = {
        pickup: { address: val(`r-${rid}-paddr`), hours: val(`r-${rid}-phours`), notes: val(`r-${rid}-pnote`) },
        delivery: { fee: Number(val(`r-${rid}-dfee`)) || 0, freeOver: Number(val(`r-${rid}-dfree`)) || 0, etaText: val(`r-${rid}-deta`), cities: val(`r-${rid}-dcities`).split(",").map(s => s.trim()).filter(Boolean), zones: (zoneState[rid] || []).map(z => ({ name: String(z.name || "").trim(), fee: Number(z.fee) || 0 })).filter(z => z.name) },
        contact: { whatsapp: val(`r-${rid}-cwa`), email: val(`r-${rid}-cem`) },
      };
      SS.saveRegionPatch(rid, patch);
      regionView[rid] = clone(SS.regionById(rid));
    });
    if (document.getElementById("pub-token")) savePublishCfg(readPublishForm());
    updateLiveBadge();
    SSApp.toast("Settings saved — live ⚙️", "ok");
  }

  /* ====================================================== EXPORT ==== */
  function renderExport() {
    const live = SS.hasOverride() || ["ss_vault_override", "ss_announce_override", "ss_content_override", "ss_settings_override", "ss_region_overrides"].some(k => localStorage.getItem(k));
    const ready = publishConfigured();
    body().innerHTML = `
      <div class="ss-panel ss-pub-hero">
        <h3>🚀 Finalise &amp; publish</h3>
        <p style="color:var(--ink-60)">Push every change you've made live to your real website — automatically. No downloads.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <a class="ss-btn ss-btn--ghost ss-btn--lg" href="index.html?preview=1" target="_blank" rel="noopener">👁️ Preview draft first</a>
          <button class="ss-btn ss-btn--lg" id="x-publish">⤴ Publish to live site</button>
        </div>
        ${ready
          ? `<p class="ss-seed" style="margin-top:10px">Connected to GitHub. Your site updates ~1 min after publishing.</p>`
          : `<p class="ss-seed" style="margin-top:10px">⚙️ First time? Connect your site in <a href="#settings" id="x-gosettings">Settings → One-click publishing</a> (see <code>PUBLISH_GUIDE.md</code>).</p>`}
      </div>
      <div class="ss-panel" style="margin-top:16px"><h3>Advanced: download files manually</h3>
        <p style="color:var(--ink-60);font-size:.9rem">Only needed if you're not using one-click publishing. Download a file and replace the matching one in <code>assets/js/config/</code>.</p>
        <div class="ss-export-grid">
          ${exportCard("products.js", "Products, prices, availability, images", "x-products")}
          ${exportCard("vault.js", "Secret codes &amp; Vault settings", "x-vault")}
          ${exportCard("content.js", "Hero, About, FAQ, How-it-works copy", "x-content")}
          ${exportCard("regions.js", "Locations, delivery, announcements", "x-regions")}
          ${exportCard("settings.js", "Contact, Google Sheets URL, passcode, flags", "x-settings")}
        </div>
      </div>
      <div class="ss-panel" style="margin-top:16px"><h3>Reset</h3>
        <p style="color:var(--ink-60)">Discard all browser edits and revert to the config files.</p>
        <button class="ss-btn ss-btn--ghost ss-chip--danger" id="x-reset" ${live ? "" : "disabled"}>↩ Revert all edits to files</button></div>`;
    document.getElementById("x-publish").onclick = doPublish;
    const gosettings = document.getElementById("x-gosettings"); if (gosettings) gosettings.onclick = e => { e.preventDefault(); go("settings"); };
    document.getElementById("x-products").onclick = () => download("products.js", genProducts());
    document.getElementById("x-vault").onclick = () => download("vault.js", genVault());
    document.getElementById("x-content").onclick = () => download("content.js", genContent());
    document.getElementById("x-regions").onclick = () => download("regions.js", genRegions());
    document.getElementById("x-settings").onclick = () => download("settings.js", genSettings());
    const rst = document.getElementById("x-reset");
    if (rst) rst.onclick = () => { if (confirm("Discard all edits and revert to files?")) { SS.resetCatalog(); SS.resetVault(); SS.resetContent(); SS.resetSettings(); SS.resetRegions(); SS.resetAnnounce(); location.reload(); } };
  }
  function exportCard(file, desc, id) {
    return `<div class="ss-export-card"><div class="ss-export-file">📄 ${file}</div><p>${desc}</p>
      <div style="display:flex;gap:8px"><button class="ss-btn ss-btn--sm" id="${id}">⬇ Download</button></div></div>`;
  }
  function fileHeader(t) { return `/* Second Scoop — ${t}\n   Exported from the Backend on ${new Date().toLocaleString()}.\n   Replace the matching file in assets/js/config/ to publish. */\n\n`; }
  function genProducts() { return fileHeader("products.js") + "window.SS_CATEGORIES = " + JSON.stringify(SS_CATEGORIES, null, 2) + ";\n\nwindow.SS_PRODUCTS = " + JSON.stringify(cat, null, 2) + ";\n"; }
  function genVault() { return fileHeader("vault.js") + "window.SS_VAULT = " + JSON.stringify(vault, null, 2) + ";\n"; }
  function genContent() { return fileHeader("content.js") + "window.SS_CONTENT = " + JSON.stringify(content, null, 2) + ";\n"; }
  function genRegions() {
    const out = {};
    REGION_IDS.forEach(rid => { out[rid] = clone(SS.regionById(rid)); if (announce[rid]) out[rid].announcement = announce[rid]; });
    return fileHeader("regions.js") + "window.SS_REGIONS = " + JSON.stringify(out, null, 2) + ";\n\nwindow.SS_DEFAULT_REGION = " + JSON.stringify(window.SS_DEFAULT_REGION || REGION_IDS[0]) + ";\n";
  }
  function genSettings() { return fileHeader("settings.js") + "window.SS_SETTINGS = " + JSON.stringify(settings, null, 2) + ";\n"; }

  /* =============================================== ONE-CLICK PUBLISH =
     Commits the 5 config files straight to your GitHub repo via the
     GitHub Contents API. GitHub Pages / Netlify / Vercel then auto-
     redeploy. The token is stored ONLY in this browser (key
     ss_publish_cfg) and is never written into any exported file.       */
  function getPublishCfg() { return SS.read("ss_publish_cfg", { token: "", owner: "", repo: "", branch: "main", dir: "assets/js/config" }); }
  function savePublishCfg(c) { SS.write("ss_publish_cfg", c); }
  function publishConfigured() { const c = getPublishCfg(); return !!(c.token && c.owner && c.repo); }

  function b64utf8(str) { return btoa(unescape(encodeURIComponent(str))); }

  async function commitFile(cfg, path, content, message) {
    const api = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
    const headers = { "Authorization": "Bearer " + cfg.token, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    const branch = cfg.branch || "main";
    let sha;
    const getRes = await fetch(api + "?ref=" + encodeURIComponent(branch), { headers });
    if (getRes.status === 200) { sha = (await getRes.json()).sha; }
    else if (getRes.status === 401) { throw "Bad token (401). Check your GitHub token has Contents: Read & write."; }
    else if (getRes.status === 404) { /* file doesn't exist yet — will create */ }
    else if (getRes.status !== 200) {
      // 404 on repo vs file: try to detect repo-not-found
      const t = await getRes.text();
      if (/Not Found/.test(t) && getRes.status === 404) sha = undefined; else throw "GitHub read error (" + getRes.status + ")";
    }
    const body = { message, content: b64utf8(content), branch };
    if (sha) body.sha = sha;
    const putRes = await fetch(api, { method: "PUT", headers, body: JSON.stringify(body) });
    if (putRes.status !== 200 && putRes.status !== 201) {
      let msg = ""; try { msg = (await putRes.json()).message || ""; } catch (e) {}
      throw `Couldn't write ${path} (${putRes.status}). ${msg}`;
    }
  }

  /* ---- HIGH-QUALITY IMAGE UPLOAD (commits real photo to GitHub) ----- */
  async function commitImage(cfg, path, base64, message) {
    const api = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
    const headers = { "Authorization": "Bearer " + cfg.token, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    const branch = cfg.branch || "main";
    let sha;
    const getRes = await fetch(api + "?ref=" + encodeURIComponent(branch), { headers });
    if (getRes.status === 200) sha = (await getRes.json()).sha;
    else if (getRes.status === 401) throw "Bad GitHub token (401).";
    const body = { message, content: base64, branch };
    if (sha) body.sha = sha;
    const putRes = await fetch(api, { method: "PUT", headers, body: JSON.stringify(body) });
    if (putRes.status !== 200 && putRes.status !== 201) { let m = ""; try { m = (await putRes.json()).message || ""; } catch (e) {} throw `Upload failed (${putRes.status}). ${m}`; }
  }
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => { const s = String(r.result); const i = s.indexOf(","); resolve(i >= 0 ? s.slice(i + 1) : s); };
      r.onerror = reject; r.readAsDataURL(file);
    });
  }
  // Trigger a browser download of a File/Blob under a chosen filename.
  function downloadBlob(file, name) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 6000);
  }

  /* ---- CONNECT PROJECT FOLDER (write images straight into assets/img) -
     Uses the browser's File System Access API. The owner picks their local
     project folder once; uploads then write directly into assets/img/ on
     disk — so GitHub Desktop sees them and pushes them. No token needed.   */
  let projectDir = null;
  function folderSupported() { return typeof window.showDirectoryPicker === "function"; }
  function folderConnected() { return !!projectDir; }
  async function connectProjectFolder() {
    if (!folderSupported()) throw "Your browser doesn't support folder access — use Chrome or Edge (or upload with the download fallback).";
    const dir = await window.showDirectoryPicker({ mode: "readwrite" });
    // sanity-check it's the project folder (has index.html or an assets folder)
    let looksRight = false;
    try { await dir.getFileHandle("index.html"); looksRight = true; } catch (e) {}
    if (!looksRight) { try { await dir.getDirectoryHandle("assets"); looksRight = true; } catch (e) {} }
    if (!looksRight) throw "That doesn't look like your Second Scoop project folder (no index.html / assets). Pick the folder that contains index.html.";
    if (dir.requestPermission) { const perm = await dir.requestPermission({ mode: "readwrite" }); if (perm !== "granted") throw "Permission to write to the folder was denied."; }
    projectDir = dir; return dir.name;
  }
  function folderPanelHTML() {
    return `<div class="ss-panel ss-pub-hero" style="margin-bottom:14px"><h3>📁 Photo uploads — connect your folder ${folderConnected() ? `<span class="ss-tag" style="background:#d7f0df;color:#2a6b43">Connected</span>` : ""}</h3>
      <p style="color:var(--ink-60)">${folderSupported()
        ? "Connect your project folder once and every photo you upload below writes <b>straight into</b> <code>assets/img/</code> on your computer, ready to push with GitHub Desktop."
        : "⚠️ Use <b>Chrome</b> or <b>Edge</b> for one-click uploads. Otherwise photos download and you move them into <code>assets/img/</code> yourself."}</p>
      ${folderSupported() ? `<button class="ss-btn ss-btn--sm" id="folder-connect">${folderConnected() ? "✓ Connected — reconnect" : "📂 Connect project folder"}</button>` : ""}</div>`;
  }
  function wireFolderConnect(rerender) {
    const fc = document.getElementById("folder-connect");
    if (fc) fc.onclick = async () => {
      try { const nm = await connectProjectFolder(); SSApp.toast("Connected “" + nm + "”. Uploads now write into assets/img.", "ok"); rerender(); }
      catch (err) { SSApp.toast(String(err), "err"); }
    };
  }
  async function writeIntoProject(relPath, file) {
    if (!projectDir) throw "no folder";
    const parts = relPath.split("/"); const fileName = parts.pop();
    let dir = projectDir;
    for (const part of parts) dir = await dir.getDirectoryHandle(part, { create: true });
    const fh = await dir.getFileHandle(fileName, { create: true });
    const w = await fh.createWritable(); await w.write(file); await w.close();
  }

  // Shrink + recompress a photo in the browser so it loads fast on the site.
  // Big phone photos (5–40MB) become ~150–400KB without visible quality loss.
  function optimizeImage(file, maxW, quality) {
    return new Promise(resolve => {
      if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type || "")) return resolve(file); // leave SVG/GIF alone
      const url = URL.createObjectURL(file); const im = new Image();
      im.onload = () => {
        const scale = Math.min(1, maxW / (im.width || maxW));
        const w = Math.max(1, Math.round((im.width || maxW) * scale)), h = Math.max(1, Math.round((im.height || maxW) * scale));
        const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(im, 0, 0, w, h); URL.revokeObjectURL(url);
        cv.toBlob(blob => {
          if (!blob || blob.size >= file.size) return resolve(file);   // don't make it bigger
          resolve(new File([blob], (file.name || "image").replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }));
        }, "image/jpeg", quality || 0.82);
      };
      im.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      im.src = url;
    });
  }
  // Upload an image → assets/img/<unique-name>; returns the filename to reference.
  // Order of preference: (1) connected project folder → writes to disk;
  // (2) one-click GitHub token → commits via API; (3) download fallback.
  async function uploadImageToGitHub(file) {
    if (file.size > 40 * 1024 * 1024) throw "Image is over 40MB — please use one under 40MB.";
    file = await optimizeImage(file, 1600, 0.82);   // fast-loading version
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const base = (file.name.replace(/\.[^.]+$/, "") || "image").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "image";
    const name = base + "-" + Date.now().toString(36) + "." + ext;
    if (folderConnected()) {
      await writeIntoProject("assets/img/" + name, file);
      return name;
    }
    if (publishConfigured()) {
      const cfg = getPublishCfg();
      const b64 = await fileToBase64(file);
      await commitImage(cfg, "assets/img/" + name, b64, "Add image " + name);
      return name;
    }
    downloadBlob(file, name);
    SSApp.toast("Saved “" + name + "” to Downloads. Move it into your project's assets/img/ folder, then push. (Tip: connect your project folder to skip this step.)", "ok");
    return name;
  }
  // Upload a hero video → assets/video/<name>; returns the path to reference.
  async function uploadVideoToGitHub(file) {
    if (!publishConfigured()) throw "Connect GitHub publishing in Settings → One-click publishing first (then you can upload a video).";
    if (file.size > 80 * 1024 * 1024) throw "Video is over 80MB — please use a shorter clip or compress it a little first.";
    const cfg = getPublishCfg();
    const b64 = await fileToBase64(file);
    const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
    const base = (file.name.replace(/\.[^.]+$/, "") || "hero").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "hero";
    const path = "assets/video/" + base + "-" + Date.now().toString(36) + "." + ext;
    await commitImage(cfg, path, b64, "Add hero video " + path);
    return path;
  }

  // --- auto-announce: detect restocks / new drops between publishes ---
  let mlPrefill = null;
  function buyable_(reg) { return reg && (reg.status === "available" || reg.status === "preorder") && (reg.status === "preorder" || (Number(reg.inventory) || 0) > 0); }
  function mlSnapshot() {
    const snap = {};
    (cat || []).forEach(p => Object.keys(p.regions || {}).forEach(rid => {
      snap[p.id + "|" + rid] = { status: p.regions[rid].status, inv: Number(p.regions[rid].inventory) || 0 };
    }));
    return snap;
  }
  // Compare current catalog against the last published snapshot.
  function mlDetectChanges(prev) {
    const changes = {};   // id → {name, type, secret}
    (cat || []).forEach(p => {
      const ids = Object.keys(p.regions || {});
      const existedBefore = ids.some(rid => prev[p.id + "|" + rid]);
      ids.forEach(rid => {
        const reg = p.regions[rid]; if (!buyable_(reg)) return;
        const was = prev[p.id + "|" + rid];
        if (!existedBefore) { changes[p.id] = { name: p.name, type: "drop", secret: !!p.secret }; return; }
        const wasBuyable = was && ((was.status === "available" || was.status === "preorder") && (was.status === "preorder" || was.inv > 0));
        if (!wasBuyable && !changes[p.id]) changes[p.id] = { name: p.name, type: "restock", secret: !!p.secret };
      });
    });
    return Object.keys(changes).map(id => Object.assign({ id }, changes[id]));
  }

  async function doPublish() {
    if (!publishConfigured()) {
      SSApp.toast("Set up publishing first — opening Settings.", "err");
      go("settings");
      setTimeout(() => { const el = document.getElementById("pub-panel"); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 200);
      return;
    }
    const cfg = getPublishCfg();
    if (!confirm(`Publish all current changes to the live site?\n\nRepo: ${cfg.owner}/${cfg.repo} (${cfg.branch || "main"})\nYour site updates automatically in ~1 minute.`)) return;

    const files = [
      ["products.js", genProducts()],
      ["content.js", genContent()],
      ["regions.js", genRegions()],
      ["vault.js", genVault()],
      ["settings.js", genSettings()],
    ];
    // Detect restock / new-drop BEFORE we overwrite the saved snapshot.
    const prevSnap = SS.read("ss_ml_pub_snapshot", null);
    const autoOn = SS.read("ss_ml_autoannounce", true) !== false;
    const changes = (prevSnap && autoOn) ? mlDetectChanges(prevSnap) : [];   // skip on first publish / when off
    showPublishModal(files.map(f => f[0]));
    let done = 0;
    try {
      for (const [name, content] of files) {
        setPublishStep(name, "working");
        await commitFile(cfg, (cfg.dir || "assets/js/config").replace(/\/+$/, "") + "/" + name, content, "Update " + name + " via Second Scoop backend");
        setPublishStep(name, "done"); done++;
      }
      SS.write("ss_ml_pub_snapshot", mlSnapshot());
      finishPublishModal(true, `Published ${done}/${files.length} files. Your site will update in about a minute.`, changes);
    } catch (err) {
      finishPublishModal(false, String(err));
    }
  }

  function showPublishModal(names) {
    let m = document.getElementById("pub-modal");
    if (!m) { m = document.createElement("div"); m.id = "pub-modal"; m.className = "ss-pub-modal"; document.body.appendChild(m); }
    m.innerHTML = `<div class="ss-pub-card">
      <h3>Publishing to live site…</h3>
      <div class="ss-pub-steps">${names.map(n => `<div class="ss-pub-step" data-step="${n}"><span class="ss-pub-dot"></span>${n}</div>`).join("")}</div>
      <div class="ss-pub-result" id="pub-result"></div>
      <div class="ss-pub-foot" id="pub-foot"></div>
    </div>`;
    m.classList.add("open");
  }
  function setPublishStep(name, state) {
    const el = document.querySelector(`#pub-modal [data-step="${name}"]`);
    if (el) el.className = "ss-pub-step ss-pub-step--" + state;
  }
  function finishPublishModal(ok, msg, changes) {
    const res = document.getElementById("pub-result");
    const foot = document.getElementById("pub-foot");
    if (res) { res.className = "ss-pub-result " + (ok ? "ok" : "err"); res.textContent = (ok ? "✅ " : "⚠️ ") + msg; }
    const hasChanges = ok && changes && changes.length;
    if (res && hasChanges) {
      const drop = changes.find(c => c.type === "drop"), pick = drop || changes[0];
      const names = changes.slice(0, 3).map(c => c.name).join(", ") + (changes.length > 3 ? ` +${changes.length - 3} more` : "");
      const kind = drop ? "new drop" : "restock";
      const anEl = document.createElement("div");
      anEl.style.cssText = "margin-top:14px;padding:14px;border-radius:12px;background:#fff4e5;color:#8a5a00;font-size:.9rem";
      anEl.innerHTML = `📨 <b>${esc(names)}</b> just went live as a ${kind}. Want to email your list?
        <div style="margin-top:10px"><button class="ss-btn ss-btn--sm" id="pub-announce">Compose announcement →</button></div>`;
      res.appendChild(anEl);
      setTimeout(() => { const b = document.getElementById("pub-announce"); if (b) b.onclick = () => {
        mlPrefill = { tpl: pick.secret ? "vault" : pick.type, productId: pick.secret ? "" : pick.id };
        closePublishModal(); go("mailing");
      }; }, 0);
    }
    if (foot) { foot.innerHTML = `<button class="ss-btn ss-btn--sm" id="pub-close">${ok ? "Done" : "Close"}</button>`; document.getElementById("pub-close").onclick = closePublishModal; }
    if (ok) { updateLiveBadge(); SSApp.toast("Published! Live in ~1 min 🚀", "ok"); }
  }
  function closePublishModal() { const m = document.getElementById("pub-modal"); if (m) m.classList.remove("open"); }

  /* ------------------------------------------------- demo + util ---- */
  function seedDemo() {
    const names = ["Ayesha Khan", "Bilal Ahmed", "Sara Malik", "Hamza Tariq", "Maya Reyes", "Daniyal Shah", "Priya N.", "Zoya R.", "Omar F.", "Nadia S."];
    const orders = SS.getOrders(), now = Date.now();
    for (let i = 0; i < 24; i++) {
      const rid = REGION_IDS[i % REGION_IDS.length];
      const pool = SS.productsForRegion(rid, { includeSecret: true }).map(p => SS.productView(p, rid)).filter(p => p.buyable);
      if (!pool.length) continue;
      const lines = [];
      for (let j = 0; j < 1 + Math.floor(Math.random() * 3); j++) { const p = pool[Math.floor(Math.random() * pool.length)]; if (lines.find(l => l.id === p.id)) continue; const qty = 1 + Math.floor(Math.random() * 3); lines.push({ id: p.id, name: p.name, qty, price: p.price, lineTotal: p.price * qty, secret: p.secret }); }
      const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
      const fulfil = Math.random() > 0.45 ? "delivery" : "pickup";
      const fee = SS.deliveryFee(fulfil, subtotal, rid);
      const ts = new Date(now - Math.floor(Math.random() * 40) * 86400000 - Math.random() * 86400000).toISOString();
      const name = names[Math.floor(Math.random() * names.length)];
      const order = { orderNumber: SS.genOrderNumber() + "-D" + i, timestamp: ts, region: rid, currency: SS_REGIONS[rid].currency,
        customer: { name, firstName: name.split(" ")[0], lastName: name.split(" ")[1] || "", phone: "+92 300 00000" + i, email: name.split(" ")[0].toLowerCase() + i + "@example.com", instagram: "", address: fulfil === "delivery" ? "Sample St, " + (SS.regionById(rid).delivery.cities[0] || "") : "(Pickup)", address2: "", fulfilment: fulfil, preferredDate: new Date(now + 86400000).toISOString().split("T")[0], notes: "" },
        lines, subtotal, deliveryFee: fee, grandTotal: subtotal + fee,
        orderStatus: ORDER_STATUSES[Math.floor(Math.random() * ORDER_STATUSES.length)], paymentStatus: ["Pending", "Paid", "Paid"][Math.floor(Math.random() * 3)],
        vaultProducts: lines.filter(l => l.secret).map(l => l.name).join(", "), _demo: true };
      orders.push(order);
      const cust = SS.getCustomers(); const k = order.customer.email.toLowerCase(); if (!cust[k]) cust[k] = { name, region: rid, orders: 0, first: ts }; cust[k].orders += 1; cust[k].last = ts; SS.write(SS.LS.customers, cust);
    }
    SS.write(SS.LS.orders, orders);
  }
  function clearDemo() {
    SS.write(SS.LS.orders, SS.getOrders().filter(o => !o._demo));
    const rebuilt = {}; SS.getOrders().forEach(o => { const k = (o.customer.email || "").toLowerCase(); if (!k) return; if (!rebuilt[k]) rebuilt[k] = { name: o.customer.name, region: o.region, orders: 0, first: o.timestamp }; rebuilt[k].orders += 1; rebuilt[k].last = o.timestamp; });
    SS.write(SS.LS.customers, rebuilt);
    SSApp.toast("Demo data cleared", "ok");
  }

  function openDrawer() { overlay.classList.add("open"); drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; }
  function closeDrawer() { overlay.classList.remove("open"); drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; }
  overlay.onclick = closeDrawer;
  function download(name, text, mime) { const blob = new Blob([text], { type: mime || "text/javascript" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); SSApp.toast("Downloaded " + name, "ok"); }
  function chk(id, label, on) { return `<label class="ss-switch ss-switch--chip"><input type="checkbox" id="${id}" ${on ? "checked" : ""}><span>${label}</span></label>`; }
  function val(id) { const e = document.getElementById(id); return e ? e.value : ""; }
  function chkd(id) { const e = document.getElementById(id); return !!(e && e.checked); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function slug(s) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product"; }
  function uniqueId(base) { let id = slug(base), n = 2; while (cat.some(p => p.id === id)) id = slug(base) + "-" + n++; return id; }
  function clampNum(v, lo, hi) { let n = parseFloat(v); if (isNaN(n)) n = 0; return Math.min(hi, Math.max(lo, n)); }
})();
