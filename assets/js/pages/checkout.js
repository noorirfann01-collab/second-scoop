/* =====================================================================
   CHECKOUT PAGE — customer details, fulfilment, totals, place order
   ===================================================================== */
(function () {
  SSApp.mount({ recentlySold: false });
  const root = document.getElementById("checkout-root");
  const r = SS.region();

  const { lines, subtotal } = SS.cartDetail();
  if (!lines.length) {
    root.innerHTML = `<div class="ss-empty" style="padding:70px 20px">
      <h2>Nothing to check out</h2><p>Your cart is empty.</p>
      <a class="ss-btn" href="shop.html?region=${SS.getRegion()}">Shop ${r.name}</a></div>`;
    return;
  }

  const minDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  root.innerHTML = `
  <form class="ss-checkout" id="checkout-form" novalidate>
    <div>
      <div class="ss-form-card">
        <h3>Your details</h3>
        <div class="ss-form-grid">
          <div><label class="ss-label">Full name <span class="req">*</span></label>
            <input class="ss-field" name="name" required><div class="ss-error">Please enter your name.</div></div>
          <div><label class="ss-label">Phone <span class="req">*</span></label>
            <input class="ss-field" name="phone" inputmode="tel" required><div class="ss-error">Please enter a phone number.</div></div>
          <div><label class="ss-label">Email <span class="req">*</span></label>
            <input class="ss-field" type="email" name="email" required><div class="ss-error">Please enter a valid email.</div></div>
          <div><label class="ss-label">Instagram <span style="color:var(--ink-40);font-weight:500">(optional)</span></label>
            <input class="ss-field" name="instagram" placeholder="@yourhandle"></div>
        </div>
      </div>

      <div class="ss-form-card">
        <h3>Delivery or pickup</h3>
        <div class="ss-toggle" id="fulfil-toggle">
          <label class="is-on"><input type="radio" name="fulfilment" value="delivery" checked>
            🚚 Delivery <span class="sub">${r.delivery.etaText}</span></label>
          <label><input type="radio" name="fulfilment" value="pickup">
            🏠 Pickup <span class="sub">${r.pickup.hours}</span></label>
        </div>
        <div id="address-block" style="margin-top:16px">
          <label class="ss-label">Delivery address <span class="req">*</span></label>
          <textarea class="ss-field" name="address" placeholder="Street address…"></textarea>
          <div class="ss-error">Please enter a delivery address.</div>
          <label class="ss-label" style="margin-top:10px">Address line 2 <span style="color:var(--ink-40);font-weight:500">(optional)</span></label>
          <input class="ss-field" name="address2" placeholder="Apartment, floor, landmark…">
          <small style="color:var(--ink-60)">Cities: ${r.delivery.cities.join(", ")}.</small>
        </div>
        <div id="pickup-block" style="margin-top:16px;display:none">
          <div class="ss-pdp-notes">📍 <span><strong>${r.pickup.address}</strong><br>${r.pickup.hours}. ${r.pickup.notes}</span></div>
        </div>
        <div class="ss-form-grid" style="margin-top:16px">
          <div><label class="ss-label">Preferred date <span class="req">*</span></label>
            <input class="ss-field" type="date" name="preferredDate" min="${minDate}" required>
            <div class="ss-error">Please choose a date.</div></div>
        </div>
        <div style="margin-top:16px"><label class="ss-label">Order notes</label>
          <textarea class="ss-field" name="notes" placeholder="Allergies, gift message, drop-off instructions…"></textarea></div>
      </div>
    </div>

    <aside>
      <div class="ss-summary">
        <h3>Your order</h3>
        ${lines.map(l => `<div class="ss-summary-row"><span>${l.qty} × ${l.name}${l.secret ? " 🔓" : ""}</span><span>${SS.money(l.lineTotal)}</span></div>`).join("")}
        <div class="ss-summary-row" style="border-top:1px solid var(--line);margin-top:.4em;padding-top:.7em"><span>Subtotal</span><span>${SS.money(subtotal)}</span></div>
        <div class="ss-summary-row"><span>Delivery</span><span id="sum-delivery"></span></div>
        <div class="ss-summary-total"><span>Total</span><span id="sum-total"></span></div>
        <button class="ss-btn ss-btn--lg ss-btn--block" type="submit" id="place-btn" style="margin-top:14px">Place Order</button>
        <p style="font-size:.76rem;color:var(--ink-60);margin-top:.8em">You'll get an order number instantly. We'll confirm payment &amp; timing by ${r.contact.whatsapp ? "WhatsApp" : "phone"}.</p>
      </div>
    </aside>
  </form>`;

  const form = document.getElementById("checkout-form");
  const addressBlock = document.getElementById("address-block");
  const pickupBlock = document.getElementById("pickup-block");

  function fulfilment() { return form.querySelector('[name="fulfilment"]:checked').value; }
  function refreshTotals() {
    const fee = SS.deliveryFee(fulfilment(), subtotal);
    document.getElementById("sum-delivery").textContent = fulfilment() === "pickup" ? "Pickup (free)" : (fee ? SS.money(fee) : "Free");
    document.getElementById("sum-total").textContent = SS.money(subtotal + fee);
  }
  document.getElementById("fulfil-toggle").addEventListener("change", () => {
    const isDelivery = fulfilment() === "delivery";
    addressBlock.style.display = isDelivery ? "block" : "none";
    pickupBlock.style.display = isDelivery ? "none" : "block";
    form.querySelectorAll("#fulfil-toggle label").forEach(l =>
      l.classList.toggle("is-on", l.querySelector("input").checked));
    refreshTotals();
  });
  refreshTotals();

  function showError(input, show) {
    const err = input.parentNode.querySelector(".ss-error");
    if (err) err.classList.toggle("show", show);
    input.style.borderColor = show ? "var(--err)" : "";
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const isDelivery = fulfilment() === "delivery";
    let ok = true;
    const required = [["name", v => v.trim()], ["phone", v => v.trim().length >= 6],
                      ["email", v => /\S+@\S+\.\S+/.test(v)], ["preferredDate", v => v]];
    if (isDelivery) required.push(["address", v => v.trim()]);
    required.forEach(([n, test]) => {
      const inp = form[n]; const valid = test(inp.value); showError(inp, !valid); if (!valid) ok = false;
    });
    if (!ok) { SSApp.toast("Please fix the highlighted fields.", "err"); return; }

    const btn = document.getElementById("place-btn");
    btn.disabled = true; btn.textContent = "Placing order…";

    const result = await SS.placeOrder({
      name: form.name.value, phone: form.phone.value, email: form.email.value,
      instagram: form.instagram ? form.instagram.value : "",
      fulfilment: fulfilment(), address: form.address.value,
      address2: form.address2 ? form.address2.value : "",
      preferredDate: form.preferredDate.value, notes: form.notes.value,
    });

    if (result.ok) {
      sessionStorage.setItem("ss_last_order", JSON.stringify(result.order));
      sessionStorage.setItem("ss_last_synced", result.synced ? "1" : "0");
      location.href = "confirmation.html";
    } else {
      btn.disabled = false; btn.textContent = "Place Order";
      SSApp.toast(result.error || "Something went wrong.", "err");
    }
  });
})();
