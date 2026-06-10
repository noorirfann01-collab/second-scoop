/* =====================================================================
   CONFIRMATION PAGE
   ===================================================================== */
(function () {
  SSApp.mount({ recentlySold: false });
  const root = document.getElementById("confirm-root");
  const raw = sessionStorage.getItem("ss_last_order");
  const synced = sessionStorage.getItem("ss_last_synced") === "1";

  if (!raw) {
    root.innerHTML = `<div class="ss-confirm"><h1>No recent order</h1>
      <p>Looks like there's nothing to show here.</p>
      <a class="ss-btn" href="index.html">Back home</a></div>`;
    return;
  }
  const o = JSON.parse(raw);
  const money = (n) => SS.money(n, o.region);
  const r = SS_REGIONS[o.region];

  const syncNote = SS_SETTINGS.googleSheets.enabled && SS_SETTINGS.googleSheets.webhookUrl
    ? (synced ? `<p style="color:var(--ok);font-weight:600">✓ Logged to our order system.</p>` : "")
    : "";

  root.innerHTML = `
  <div class="ss-confirm">
    <div class="ss-confirm-check">✓</div>
    <span class="eyebrow">Order received</span>
    <h1>Thank you, ${o.customer.name.split(" ")[0]}! 🍪</h1>
    <p>Your scoops are locked in. We'll confirm payment &amp; timing shortly via ${r.contact.whatsapp ? "WhatsApp" : "phone"}.</p>
    <div class="ss-confirm-num">${o.orderNumber}</div>
    ${syncNote}
    <div class="ss-confirm-card">
      <h3>Order details</h3>
      ${o.lines.map(l => `<div class="ss-summary-row"><span>${l.qty} × ${l.name}${l.secret ? " 🔓" : ""}</span><span>${money(l.lineTotal)}</span></div>`).join("")}
      <div class="ss-summary-row" style="border-top:1px solid var(--line);padding-top:.6em;margin-top:.4em"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
      <div class="ss-summary-row"><span>${o.customer.fulfilment === "pickup" ? "Pickup" : "Delivery"}</span><span>${o.deliveryFee ? money(o.deliveryFee) : (o.customer.fulfilment === "pickup" ? "Free" : "Free")}</span></div>
      <div class="ss-summary-total"><span>Total</span><span>${money(o.grandTotal)}</span></div>
    </div>
    <div class="ss-confirm-card">
      <h3>${o.customer.fulfilment === "pickup" ? "Pickup" : "Delivery"} info</h3>
      <div class="ss-summary-row"><span>Region</span><span>${r.flag} ${r.name}</span></div>
      <div class="ss-summary-row"><span>Method</span><span style="text-transform:capitalize">${o.customer.fulfilment}</span></div>
      ${o.customer.fulfilment === "delivery" ? `<div class="ss-summary-row"><span>Address</span><span>${o.customer.address}</span></div>` : `<div class="ss-summary-row"><span>Location</span><span>${r.pickup.address}</span></div>`}
      <div class="ss-summary-row"><span>Preferred date</span><span>${o.customer.preferredDate}</span></div>
      ${o.customer.notes ? `<div class="ss-summary-row"><span>Notes</span><span>${o.customer.notes}</span></div>` : ""}
    </div>
    <a class="ss-btn ss-btn--lg" href="shop.html?region=${o.region}">Order more scoops</a>
    <a class="ss-btn ss-btn--ghost ss-btn--lg" href="index.html" style="margin-left:8px">Back home</a>
  </div>`;
})();
