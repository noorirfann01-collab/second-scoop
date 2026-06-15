/* =====================================================================
   CART PAGE
   ===================================================================== */
(function () {
  SSApp.mount({ recentlySold: false });
  const root = document.getElementById("cart-root");
  const r = SS.region();

  function render() {
    const { lines, subtotal } = SS.cartDetail();
    if (!lines.length) {
      root.innerHTML = `<div class="ss-empty" style="padding:70px 20px">
        <div style="font-size:3rem">🛒</div>
        <h2>Your cart is empty</h2>
        <p>Let's fix that.</p>
        <a class="ss-btn ss-btn--lg" href="shop.html?region=${SS.getRegion()}">Shop ${r.name}</a>
      </div>`;
      return;
    }
    const fee = SS.deliveryFee("delivery", subtotal);
    root.innerHTML = `
    <div class="ss-cart-layout">
      <div class="ss-cart-lines">
        ${lines.map(l => lineHTML(l)).join("")}
        <a href="shop.html?region=${SS.getRegion()}" class="ss-sec-link" style="display:inline-block;margin-top:8px">← Keep shopping</a>
      </div>
      <aside class="ss-summary">
        <h3>Order Summary</h3>
        <div class="ss-summary-row"><span>Subtotal</span><span>${SS.money(subtotal)}</span></div>
        <div class="ss-summary-row"><span>Delivery (if chosen)</span><span>${fee ? SS.money(fee) : "Free / Pickup"}</span></div>
        <div class="ss-summary-total"><span>Total</span><span>${SS.money(subtotal + 0)}</span></div>
        <p style="font-size:.78rem;color:var(--ink-60);margin:.6em 0 1em">Delivery fee (if any) is added at checkout based on your choice. ${r.delivery.freeOver ? "Free delivery over " + SS.money(r.delivery.freeOver) + "." : ""}</p>
        <a class="ss-btn ss-btn--lg ss-btn--block" href="checkout.html">Checkout →</a>
      </aside>
    </div>`;
    bind();
  }

  function lineHTML(l) {
    const img = l.image ? `<img src="${SS.imgSrc(l.image)}" alt="" onerror="this.remove()">` : "";
    return `<div class="ss-cart-line" data-key="${l.key}">
      <div class="ss-cart-thumb">${img}</div>
      <div class="ss-cart-info">
        <h4>${l.name}${l.secret ? " 🔓" : ""}</h4>
        <div class="ss-cart-unit">${SS.money(l.price)} each</div>
        <div class="ss-qty ss-qty--sm" style="margin-top:8px">
          <button data-step="-1" aria-label="Decrease">−</button>
          <span>${l.qty}</span>
          <button data-step="1" aria-label="Increase">+</button>
        </div>
      </div>
      <div class="ss-cart-line-right">
        <strong style="font-family:'Fredoka';font-size:1.15rem">${SS.money(l.lineTotal)}</strong>
        <button class="ss-cart-remove" data-remove>Remove</button>
      </div>
    </div>`;
  }

  function bind() {
    root.querySelectorAll(".ss-cart-line").forEach(line => {
      const key = line.getAttribute("data-key");
      line.querySelectorAll("[data-step]").forEach(b =>
        b.addEventListener("click", () => {
          const cur = SS.cartDetail().lines.find(l => l.key === key);
          SS.setQty(key, (cur ? cur.qty : 1) + Number(b.getAttribute("data-step")));
          render(); SSApp.refreshCartCount();
        }));
      line.querySelector("[data-remove]").addEventListener("click", () => {
        SS.removeFromCart(key); render(); SSApp.refreshCartCount();
      });
    });
  }
  render();
})();
