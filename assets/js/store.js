/* =====================================================================
   SECOND SCOOP — STORE ENGINE
   ---------------------------------------------------------------------
   Central state: region, cart, orders, vault unlocks, signups.
   Persisted to localStorage. Every page uses these helpers.
   ===================================================================== */

(function () {
  "use strict";

  const LS = {
    region:   "ss_region",
    cart:     "ss_cart",
    orders:   "ss_orders",
    vault:    "ss_vault_unlocks",
    signups:  "ss_signups",
    customers:"ss_customers",
  };

  /* ------------------------------------------------ persistence ---- */
  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }   // e.g. storage quota exceeded
  }
  // Backend pages set window.SS_BACKEND = true. Only there do edits
  // ("overrides") apply — so the PUBLIC site always shows the published
  // files, never one device's unsaved preview.
  function inBackend() { try { return !!window.SS_BACKEND; } catch (e) { return false; } }
  // Preview mode: open any page with ?preview=1 to see UNPUBLISHED draft edits
  // (made in the backend on this same browser) before you launch them. ?preview=0
  // turns it off. The flag sticks for the browser session so links keep showing
  // the draft as you click around.
  function previewMode() {
    try {
      const u = new URLSearchParams(location.search).get("preview");
      if (u === "1") { sessionStorage.setItem("ss_preview", "1"); return true; }
      if (u === "0") { sessionStorage.removeItem("ss_preview"); return false; }
      return sessionStorage.getItem("ss_preview") === "1";
    } catch (e) { return false; }
  }
  // Draft edits apply in the backend AND in preview mode (never on the plain
  // public site, so customers always see the published files).
  function useDraft() { return inBackend() || previewMode(); }
  // Deep merge plain objects (arrays replaced, not merged).
  function deepMerge(base, over) {
    if (Array.isArray(over)) return over.slice();
    if (over && typeof over === "object" && base && typeof base === "object" && !Array.isArray(base)) {
      const out = Object.assign({}, base);
      Object.keys(over).forEach(k => { out[k] = deepMerge(base[k], over[k]); });
      return out;
    }
    return over === undefined ? base : over;
  }

  /* -------------------------------- override layers (backend edits) --
     Content, settings and region info can be edited live in the Backend
     and are stored as overrides here, merged over the config files.     */
  function getContent() { return useDraft() ? deepMerge(window.SS_CONTENT || {}, read("ss_content_override", {}) || {}) : (window.SS_CONTENT || {}); }
  function saveContent(c) { return write("ss_content_override", c); }
  function resetContent() { try { localStorage.removeItem("ss_content_override"); } catch (e) {} }

  function getSettings() { return useDraft() ? deepMerge(window.SS_SETTINGS || {}, read("ss_settings_override", {}) || {}) : (window.SS_SETTINGS || {}); }
  function saveSettings(s) { return write("ss_settings_override", s); }
  function resetSettings() { try { localStorage.removeItem("ss_settings_override"); } catch (e) {} }

  // Merged region (locations, delivery, contact, announcement overrides).
  function regionById(rid) {
    const base = SS_REGIONS[rid];
    if (!base) return base;
    if (!useDraft()) return base;
    const ov = (read("ss_region_overrides", {}) || {})[rid];
    return ov ? deepMerge(base, ov) : base;
  }
  function saveRegionPatch(rid, patch) {
    const all = read("ss_region_overrides", {}) || {};
    all[rid] = deepMerge(all[rid] || {}, patch); write("ss_region_overrides", all);
  }
  function resetRegions() { try { localStorage.removeItem("ss_region_overrides"); localStorage.removeItem("ss_announce_override"); } catch (e) {} }

  /* ----------------------------------------------------- region ---- */
  // Regions the owner has marked live (hide a region by setting hidden:true
  // in Backend → Menu & Regions; e.g. keep Toronto hidden until it's ready).
  function availableRegions() {
    return Object.keys(SS_REGIONS).map(id => regionById(id)).filter(r => r && !r.hidden);
  }
  function regionAvailable(id) { const r = SS_REGIONS[id] && regionById(id); return !!(r && !r.hidden); }
  function getRegion() {
    const ids = availableRegions().map(r => r.id);
    const ok = id => id && SS_REGIONS[id] && ids.indexOf(id) !== -1;
    const url = new URLSearchParams(location.search).get("region");
    if (ok(url)) { write(LS.region, url); return url; }
    const saved = read(LS.region, null);
    if (ok(saved)) return saved;
    if (ok(SS_DEFAULT_REGION)) return SS_DEFAULT_REGION;
    return ids[0] || SS_DEFAULT_REGION;
  }
  function setRegion(id) {
    if (SS_REGIONS[id]) { write(LS.region, id); try { localStorage.setItem("ss_region_chosen", "1"); } catch (e) {} document.dispatchEvent(new CustomEvent("ss:region", { detail: id })); }
  }
  function regionChosen() { try { return localStorage.getItem("ss_region_chosen") === "1"; } catch (e) { return false; } }
  function region() {
    const base = regionById(getRegion());
    if (!useDraft()) return base;
    const ann = (read("ss_announce_override", {}) || {})[getRegion()];
    if (ann) return Object.assign({}, base, { announcement: Object.assign({}, base.announcement, ann) });
    return base;
  }
  // Announcement overrides (edited in the Backend → live site).
  function saveAnnounce(regionId, ann) {
    const all = read("ss_announce_override", {}) || {};
    all[regionId] = ann; write("ss_announce_override", all);
  }
  function getAnnounce(regionId) {
    const all = read("ss_announce_override", {}) || {};
    return all[regionId] || (regionById(regionId) && regionById(regionId).announcement) || null;
  }
  function resetAnnounce() { try { localStorage.removeItem("ss_announce_override"); } catch (e) {} }

  /* --------------------------------------------------- currency ---- */
  function money(amount, regionId) {
    const r = SS_REGIONS[regionId || getRegion()];
    const n = Number(amount) || 0;
    const formatted = n.toLocaleString(r.locale, {
      minimumFractionDigits: r.currency === "PKR" ? 0 : 2,
      maximumFractionDigits: r.currency === "PKR" ? 0 : 2,
    });
    return r.currencyPosition === "before"
      ? `${r.currencySymbol} ${formatted}`
      : `${formatted} ${r.currencySymbol}`;
  }

  /* --------------------------------------------------- products ---- */
  // CATALOG OVERRIDE LAYER
  // The Product Manager (manager.html) saves an edited catalog to
  // localStorage. When present, the whole site uses it instead of the
  // products.js file — so edits go live instantly. "Save/Export" in the
  // manager downloads a new products.js to make changes permanent.
  function effectiveCatalog() {
    if (!useDraft()) return (window.SS_PRODUCTS || []);    // public site = published files only
    const ov = read("ss_catalog_override", null);
    return (ov && Array.isArray(ov) && ov.length) ? ov : (window.SS_PRODUCTS || []);
  }
  function getCatalog() { return effectiveCatalog(); }
  function saveCatalog(arr) { return write("ss_catalog_override", arr); }   // returns false if storage full
  function resetCatalog() { try { localStorage.removeItem("ss_catalog_override"); } catch (e) {} }
  function hasOverride() { return !!read("ss_catalog_override", null); }

  // Resolve an image value to a usable src: bare filename → assets/img/,
  // but full URLs and uploaded data: URLs are used as-is.
  function imgSrc(image) {
    if (!image) return "";
    // full URLs, data URLs, absolute/relative paths, or anything with a folder
    // (e.g. "assets/video/hero.mp4") pass through untouched.
    if (/^(https?:|data:|\/|\.\.?\/)/.test(image) || image.indexOf("/") > -1) return image;
    return "assets/img/" + image;   // bare filename → lives in assets/img/
  }

  // Returns products visible in a region: not hidden, region entry exists,
  // and (unless includeSecret) not secret.
  function productsForRegion(regionId, opts) {
    opts = opts || {};
    const rid = regionId || getRegion();
    return effectiveCatalog().filter(p => {
      if (p.hidden) return false;
      if (!p.regions || !p.regions[rid]) return false;
      if (p.secret && !opts.includeSecret) return false;
      return true;
    });
  }
  function getProduct(id) { return effectiveCatalog().find(p => p.id === id) || null; }

  // Region-aware view of a product (merges shared + region fields).
  function productView(p, regionId) {
    if (!p) return null;
    const rid = regionId || getRegion();
    const r = p.regions[rid];
    if (!r) return null;
    // A region marked "Coming Soon" shows every product as coming-soon and not
    // orderable — a pre-launch holding state until the owner flips it live.
    const reg = regionById(rid);
    const comingSoon = !!(reg && reg.comingSoon);
    const status = comingSoon ? "coming-soon" : r.status;
    // Optional size/price options for this region (e.g. Regular / Large).
    const sizes = (Array.isArray(r.sizes) && r.sizes.length)
      ? r.sizes.map(s => ({ label: String(s.label || ""), price: Number(s.price) || 0 })).filter(s => s.label)
      : null;
    // Main/default price = the cheapest size (falls back to the single price).
    const cheapest = sizes && sizes.length ? Math.min.apply(null, sizes.map(s => s.price)) : null;
    return {
      id: p.id, name: p.name, category: p.category, tagline: p.tagline,
      description: p.description, longDescription: p.longDescription,
      images: p.images, image: (p.images && p.images[0]) || null,
      imageSrc: imgSrc((p.images && p.images[0]) || null),
      badge: comingSoon ? "" : p.badge, featured: !!p.featured, hero: !!p.hero, secret: !!p.secret,
      reviews: p.reviews || { rating: 0, count: 0 },
      status: status, price: sizes ? cheapest : (r.price || 0), inventory: r.inventory,
      sizes: sizes,
      deliveryNotes: r.deliveryNotes || "",
      buyable: !comingSoon && (status === "available" || status === "preorder" || status === "closing"),
    };
  }
  // Price for a chosen size label (falls back to the product's default price).
  function sizePrice(pv, size) {
    if (pv && pv.sizes && size) { const s = pv.sizes.find(s => s.label === size); if (s) return s.price; }
    return pv ? pv.price : 0;
  }
  function cartKey(id, size) { return size ? id + "::" + size : id; }
  function categoryName(id) {
    const c = (window.SS_CATEGORIES || []).find(c => c.id === id);
    return c ? c.name : id;
  }

  /* ------------------------------------------------------- cart ---- */
  // Cart items keyed by productId; cart belongs to a region.
  function getCart() {
    const c = read(LS.cart, { region: getRegion(), items: {} });
    if (c.region !== getRegion()) return { region: getRegion(), items: {} }; // region switch clears view
    return c;
  }
  function saveCart(c) { write(LS.cart, c); document.dispatchEvent(new CustomEvent("ss:cart")); }

  function addToCart(productId, qty, size) {
    qty = qty || 1;
    const p = getProduct(productId);
    const pv = productView(p);
    if (!pv || !pv.buyable) return false;
    let chosen = size || "";
    if (pv.sizes && pv.sizes.length && !chosen) chosen = pv.sizes[0].label;   // default to first size
    const key = cartKey(productId, chosen);
    const c = getCart();
    c.region = getRegion();
    const cur = c.items[key] ? c.items[key].qty : 0;
    const max = pv.inventory > 0 ? pv.inventory : 999;
    c.items[key] = { id: productId, size: chosen, qty: Math.min(cur + qty, max) };
    saveCart(c);
    return true;
  }
  function setQty(key, qty) {
    const c = getCart();
    if (qty <= 0) { delete c.items[key]; }
    else {
      const it = c.items[key] || {};
      const pv = productView(getProduct(it.id || String(key).split("::")[0]));
      const max = pv && pv.inventory > 0 ? pv.inventory : 999;
      c.items[key] = Object.assign({}, it, { qty: Math.min(qty, max) });
    }
    saveCart(c);
  }
  function removeFromCart(key) { const c = getCart(); delete c.items[key]; saveCart(c); }
  function clearCart() { saveCart({ region: getRegion(), items: {} }); }
  function cartCount() {
    const c = getCart();
    return Object.values(c.items).reduce((n, it) => n + it.qty, 0);
  }
  // Detailed cart lines + totals for current region.
  function cartDetail() {
    const c = getCart();
    const rid = c.region;
    const lines = [];
    Object.entries(c.items).forEach(([key, it]) => {
      const id = it.id || String(key).split("::")[0];
      const pv = productView(getProduct(id), rid);
      if (!pv) return;
      const size = it.size || "";
      const price = sizePrice(pv, size);
      lines.push({ key, id, size, name: pv.name + (size ? " — " + size : ""), qty: it.qty, price,
                   lineTotal: price * it.qty, image: pv.image, status: pv.status, secret: pv.secret });
    });
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    return { region: rid, lines, subtotal };
  }
  // Delivery zones (areas) for a region, each with its own fee.
  function deliveryZones(regionId) {
    const r = regionById(regionId || getRegion());
    return (r && r.delivery && Array.isArray(r.delivery.zones)) ? r.delivery.zones.filter(z => z && z.name) : [];
  }
  function deliveryFee(method, subtotal, regionId, zoneName) {
    const r = regionById(regionId || getRegion());
    if (method !== "delivery") return 0;
    let fee = Number(r.delivery.fee) || 0;
    const zones = (r.delivery && Array.isArray(r.delivery.zones)) ? r.delivery.zones : [];
    if (zones.length) {
      const z = zoneName ? zones.find(z => z.name === zoneName) : null;
      fee = z ? (Number(z.fee) || 0) : (Number(r.delivery.fee) || 0);  // until an area is picked, show the base fee
    }
    if (r.delivery.freeOver && subtotal >= r.delivery.freeOver) return 0;
    return fee;
  }

  /* ------------------------------------------------------ vault ---- */
  // Vault config override (edited in the Product Manager → live site).
  function effectiveVault() { return (useDraft() && read("ss_vault_override", null)) || window.SS_VAULT; }
  function getVault() { return effectiveVault(); }
  function saveVault(v) { write("ss_vault_override", v); }
  function resetVault() { try { localStorage.removeItem("ss_vault_override"); } catch (e) {} }

  function vaultUnlocks(regionId) {
    const rid = regionId || getRegion();
    const all = read(LS.vault, {});
    return all[rid] || [];
  }
  // Wipe all vault unlocks so the Vault re-locks (drops change often).
  function clearVaultUnlocks() { try { localStorage.removeItem(LS.vault); } catch (e) {} }
  function tryVaultCode(rawCode, regionId) {
    const rid = regionId || getRegion();
    const code = (rawCode || "").trim().toLowerCase();
    const entries = ((effectiveVault().codes || {})[rid] || []).filter(e => e.code.toLowerCase() === code);
    if (!entries.length) return { ok: false, products: [] };
    const unlockedIds = [];
    entries.forEach(e => e.products.forEach(pid => { if (!unlockedIds.includes(pid)) unlockedIds.push(pid); }));
    const all = read(LS.vault, {});
    const existing = all[rid] || [];
    all[rid] = Array.from(new Set(existing.concat(unlockedIds)));
    write(LS.vault, all);
    return { ok: true, products: unlockedIds, label: entries.map(e => e.label).join(" + ") };
  }
  function unlockedSecretProducts(regionId) {
    const rid = regionId || getRegion();
    const ids = vaultUnlocks(rid);
    return ids.map(id => productView(getProduct(id), rid)).filter(Boolean);
  }
  function isUnlocked(productId, regionId) {
    return vaultUnlocks(regionId).includes(productId);
  }

  /* ----------------------------------------------------- orders ---- */
  function genOrderNumber() {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const rnd = Math.floor(1000 + Math.random() * 9000);
    return `${SS_SETTINGS.order.prefix}-${yy}${mm}${dd}-${rnd}`;
  }

  async function placeOrder(form) {
    const detail = cartDetail();
    if (!detail.lines.length) return { ok: false, error: "Your cart is empty." };

    const rid = detail.region;
    const r = regionById(rid);
    const area = form.area || "";
    const fee = deliveryFee(form.fulfilment, detail.subtotal, rid, area);
    const grand = detail.subtotal + fee;
    const orderNumber = genOrderNumber();
    const ts = new Date().toISOString();

    const nameParts = (form.name || "").trim().split(/\s+/);
    const firstName = nameParts.shift() || form.name || "";
    const lastName = nameParts.join(" ");

    const order = {
      orderNumber, timestamp: ts, region: rid, currency: r.currency,
      customer: {
        name: form.name, firstName, lastName,
        phone: form.phone, email: form.email, instagram: form.instagram || "",
        address: form.fulfilment === "delivery" ? form.address : "(Pickup)",
        address2: form.address2 || "",
        area: area,
        fulfilment: form.fulfilment, preferredDate: form.preferredDate, notes: form.notes || "",
      },
      lines: detail.lines.map(l => ({ id: l.id, size: l.size || "", name: l.name, qty: l.qty, price: l.price, lineTotal: l.lineTotal, secret: l.secret })),
      subtotal: detail.subtotal, deliveryFee: fee, grandTotal: grand,
      orderStatus: "New", paymentStatus: "Pending",
      vaultProducts: detail.lines.filter(l => l.secret).map(l => l.name).join(", "),
    };

    // Save locally first (source of truth for the backend dashboard).
    const orders = read(LS.orders, []);
    orders.push(order);
    write(LS.orders, orders);
    trackCustomer(form.email, form.name, rid);

    // Best-effort push to Google Sheets.
    let synced = false;
    const gs = getSettings().googleSheets || {};
    if (gs.enabled && gs.webhookUrl) synced = await pushToSheets(order);

    clearCart();
    return { ok: true, order, synced };
  }

  // Human-readable "Preferred Method" string for the sheet.
  function preferredMethodText(order) {
    const r = regionById(order.region);
    if (order.customer.fulfilment === "pickup") {
      return `Pick up (${r.pickup && r.pickup.address ? r.pickup.address : "pickup"})`;
    }
    const fee = order.deliveryFee;
    return fee ? `Delivery (Rs.${fee})` : "Delivery";
  }
  // Products block formatted like the existing Monthly orders sheet.
  function productsBlock(order) {
    const sym = (SS_REGIONS[order.region] || {}).currency || "PKR";
    const lines = order.lines.map(l => `${l.name} (Amount: ${Number(l.price).toFixed(2)} ${sym}, Quantity: ${l.qty})`);
    lines.push(`Total: ${Number(order.subtotal).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${sym}`);
    return lines.join("\n");
  }

  // Local-friendly timestamp "YYYY-MM-DD HH:MM:SS".
  function sheetDate(iso) {
    const d = new Date(iso);
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  function flattenForSheet(order) {
    // Never write a broken number into the sheet (a corrupt total once wrecked
    // the dashboard). Clamp to a sane, finite, non-negative value.
    const safe = n => { n = Number(n); return (isFinite(n) && n >= 0) ? n : 0; };
    const subtotalSafe = safe(order.subtotal), feeSafe = safe(order.deliveryFee), grandSafe = safe(order.grandTotal) || (subtotalSafe + feeSafe);
    return {
      // routing
      region: SS_REGIONS[order.region] ? SS_REGIONS[order.region].name : order.region,
      regionId: order.region,

      // --- exact "Monthly orders" sheet columns (Pakistan) ---
      submissionDate: sheetDate(order.timestamp),
      firstName: order.customer.firstName || order.customer.name,
      lastName: order.customer.lastName || "",
      email: order.customer.email,
      phone: order.customer.phone,
      instagram: order.customer.instagram || "",
      addressLine1: order.customer.fulfilment === "delivery" ? order.customer.address : "(Pickup)",
      addressLine2: [order.customer.address2 || "", order.customer.area ? "Area: " + order.customer.area : ""].filter(Boolean).join(" · "),
      productsFormatted: productsBlock(order),
      preferredMethod: preferredMethodText(order),
      submissionId: order.orderNumber,
      paymentStatus: order.paymentStatus,
      preferredDate: order.customer.preferredDate,
      revenue: subtotalSafe,

      // --- extra fields (used for the Toronto tab / general logging) ---
      orderNumber: order.orderNumber,
      timestamp: order.timestamp,
      customerName: order.customer.name,
      fulfilment: order.customer.fulfilment,
      address: order.customer.address,
      products: order.lines.map(l => l.name).join(" | "),
      quantities: order.lines.map(l => `${l.name} x${l.qty}`).join(" | "),
      productTotal: subtotalSafe,
      deliveryFee: feeSafe,
      grandTotal: grandSafe,
      currency: order.currency,
      orderStatus: order.orderStatus,
      notes: order.customer.notes,
      vaultProduct: order.vaultProducts,
    };
  }

  async function pushToSheets(order) {
    try {
      const gs = getSettings().googleSheets || {};
      const flat = flattenForSheet(order);
      // If a secure server endpoint is set (Netlify Function), send the order
      // THERE — it recomputes the total server-side (blocks price tampering)
      // and forwards to the sheet with the webhook kept secret.
      if (gs.orderEndpoint) {
        const body = Object.assign({}, flat, { lines: order.lines.map(l => ({ id: l.id, size: l.size || "", qty: l.qty })) });
        await fetch(gs.orderEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        return true;
      }
      const url = gs.webhookUrl;
      if (!url) return false;
      // text/plain avoids a CORS preflight against Apps Script.
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(flat),
      });
      return true; // no-cors gives an opaque response; assume queued
    } catch (e) { return false; }
  }

  function getOrders() { return read(LS.orders, []); }
  function updateOrderStatus(orderNumber, field, value) {
    const orders = read(LS.orders, []);
    const o = orders.find(o => o.orderNumber === orderNumber);
    if (o) { o[field] = value; write(LS.orders, orders); }
  }

  /* -------------------------------------------------- customers ---- */
  function trackCustomer(email, name, regionId) {
    if (!email) return;
    const all = read(LS.customers, {});
    const key = email.toLowerCase();
    if (!all[key]) all[key] = { name, region: regionId, orders: 0, first: new Date().toISOString() };
    all[key].orders += 1;
    all[key].last = new Date().toISOString();
    write(LS.customers, all);
  }
  function getCustomers() { return read(LS.customers, {}); }

  /* ----------------------------------------------------- signups --- */
  function addSignup(data) {
    const entry = Object.assign({ ts: new Date().toISOString(), region: getRegion() }, data);
    const list = read(LS.signups, []);
    list.push(entry);
    write(LS.signups, list);
    // Also send to the owner's Google Sheet so they actually RECEIVE the contact.
    try {
      const url = (getSettings().googleSheets || {}).webhookUrl;
      if (url) fetch(url, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(Object.assign({ type: "signup" }, entry)),
      }).catch(() => {});
    } catch (e) {}
  }
  function getSignups() { return read(LS.signups, []); }

  /* --------------------------------------------- contact messages -- */
  function addMessage(data) {
    const entry = Object.assign({ ts: new Date().toISOString(), region: getRegion() }, data);
    const list = read("ss_messages", []); list.push(entry); write("ss_messages", list);
    try {
      const url = (getSettings().googleSheets || {}).webhookUrl;
      if (url) fetch(url, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(Object.assign({ type: "message" }, entry)),
      }).catch(() => {});
    } catch (e) {}
  }
  function getMessages() { return read("ss_messages", []); }

  /* ----------------------------------------------------- expose ---- */
  window.SS = {
    LS, read, write,
    getRegion, setRegion, region, money,
    availableRegions, regionAvailable, regionChosen, previewMode, useDraft, inBackend,
    productsForRegion, getProduct, productView, categoryName,
    getCatalog, saveCatalog, resetCatalog, hasOverride, imgSrc,
    getVault, saveVault, resetVault, saveAnnounce, getAnnounce, resetAnnounce,
    getContent, saveContent, resetContent, getSettings, saveSettings, resetSettings,
    regionById, saveRegionPatch, resetRegions, deepMerge,
    getCart, saveCart, addToCart, setQty, removeFromCart, clearCart, cartCount, cartDetail, deliveryFee, deliveryZones,
    vaultUnlocks, tryVaultCode, unlockedSecretProducts, isUnlocked, clearVaultUnlocks,
    genOrderNumber, placeOrder, getOrders, updateOrderStatus, flattenForSheet,
    getCustomers, addSignup, getSignups, addMessage, getMessages,
  };
})();
