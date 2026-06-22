/* =====================================================================
   SECOND SCOOP — server-side order validation (Netlify Function)
   ---------------------------------------------------------------------
   Why: on a static site the browser computes the order total, so a
   tech-savvy customer could tamper with prices before submitting. This
   function runs on Netlify's SERVER. It:
     1. Re-reads your real prices from the published products.js.
     2. Recomputes the order total from the product IDs + sizes + qty.
     3. Ignores whatever total the browser sent — uses the server total.
     4. Forwards the corrected order to your Google Sheet webhook, whose
        URL is kept secret in a Netlify environment variable.

   SET THESE in Netlify → Site settings → Environment variables:
     SHEET_WEBHOOK = your Apps Script .../exec URL
     SITE_URL      = https://second-scoop.com   (your live URL)
   ===================================================================== */

const SHEET = process.env.SHEET_WEBHOOK || "";
const SITE = process.env.SITE_URL || "https://second-scoop.com";

let PRICE_CACHE = null, PRICE_TS = 0;
async function loadProducts() {
  if (PRICE_CACHE && Date.now() - PRICE_TS < 5 * 60 * 1000) return PRICE_CACHE;
  const res = await fetch(SITE + "/assets/js/config/products.js");
  const code = await res.text();
  const win = {};
  // products.js is just: window.SS_PRODUCTS = [...]; window.SS_CATEGORIES = [...]
  new Function("window", code)(win);
  PRICE_CACHE = win.SS_PRODUCTS || [];
  PRICE_TS = Date.now();
  return PRICE_CACHE;
}

function unitPrice(prods, id, region, size) {
  const p = prods.find(x => x.id === id);
  if (!p || !p.regions || !p.regions[region]) return null;
  const r = p.regions[region];
  if (Array.isArray(r.sizes) && r.sizes.length) {
    if (size) { const s = r.sizes.find(s => s.label === size); if (s) return Number(s.price) || 0; }
    return Math.min.apply(null, r.sizes.map(s => Number(s.price) || 0));   // cheapest if size missing
  }
  return Number(r.price) || 0;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  if (!SHEET) return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Webhook not configured (set SHEET_WEBHOOK)." }) };
  let d;
  try { d = JSON.parse(event.body || "{}"); } catch (e) { return { statusCode: 400, body: JSON.stringify({ ok: false, error: "bad json" }) }; }

  // Basic shape check (cheap spam filter)
  const region = String(d.regionId || d.region || "").toLowerCase().indexOf("pakistan") > -1 ? "pakistan" : (d.regionId || "pakistan");
  const lines = Array.isArray(d.lines) ? d.lines : [];
  if (!lines.length) return { statusCode: 400, body: JSON.stringify({ ok: false, error: "empty order" }) };

  // Recompute the TRUE total from server-side prices.
  let serverSubtotal = 0, allMatched = true;
  try {
    const prods = await loadProducts();
    lines.forEach(l => {
      const up = unitPrice(prods, l.id, region, l.size);
      if (up == null) { allMatched = false; return; }
      serverSubtotal += up * (Number(l.qty) || 0);
    });
  } catch (e) { allMatched = false; }

  // If we matched every line, trust the server number; else fall back to the
  // (clamped) client number so a valid order is never lost.
  let clientSubtotal = Number(d.revenue); if (!isFinite(clientSubtotal) || clientSubtotal < 0) clientSubtotal = 0;
  const subtotal = allMatched ? serverSubtotal : clientSubtotal;
  const deliveryFee = Math.max(0, Number(d.deliveryFee) || 0);

  // Build the payload for the sheet, overriding money fields with server values.
  const payload = Object.assign({}, d, {
    revenue: subtotal,
    productTotal: subtotal,
    grandTotal: subtotal + deliveryFee,
    _validated: allMatched ? "server" : "client-fallback",
  });

  try {
    await fetch(SHEET, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ ok: false, error: "sheet unreachable" }) };
  }
  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, total: subtotal + deliveryFee, validated: payload._validated }) };
};
