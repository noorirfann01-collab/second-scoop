/* =====================================================================
   SECOND SCOOP — CUSTOMER REVIEWS (live, via Google Sheet)
   ---------------------------------------------------------------------
   Reviews post to your Apps Script webhook and show live to everyone.
   Public reads need no key. Backend moderation (list hidden / delete)
   uses the same read key as orders.
   ===================================================================== */
(function () {
  "use strict";

  function webhook() {
    try { return (SS.getSettings().googleSheets || {}).webhookUrl || ""; } catch (e) { return ""; }
  }
  function enabled() { return !!webhook(); }

  // JSONP GET (works cross-domain with Apps Script).
  function jsonp(params) {
    return new Promise((resolve, reject) => {
      const url = webhook();
      if (!url) return reject("not configured");
      const cb = "ssrev_" + Math.random().toString(36).slice(2);
      const sep = url.indexOf("?") > -1 ? "&" : "?";
      const qs = Object.keys(params).map(k => k + "=" + encodeURIComponent(params[k])).join("&");
      const s = document.createElement("script");
      s.src = url + sep + qs + "&callback=" + cb;
      let done = false;
      window[cb] = (data) => { done = true; cleanup(); resolve(data || {}); };
      s.onerror = () => { if (!done) { cleanup(); reject("network"); } };
      function cleanup() { try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); }
      document.body.appendChild(s);
      setTimeout(() => { if (!done) { cleanup(); reject("timeout"); } }, 15000);
    });
  }

  function fetchPublic() { return jsonp({ action: "reviews" }).then(d => (d && d.ok) ? d.reviews || [] : []); }
  function fetchAll(key) { return jsonp({ action: "reviews", key: key }).then(d => (d && d.ok) ? d.reviews || [] : []); }
  function del(id, key) { return jsonp({ action: "delreview", id: id, key: key }).then(d => d && d.ok); }

  function submit(data) {
    const url = webhook();
    if (!url) return Promise.reject("not configured");
    return fetch(url, {
      method: "POST", mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({ type: "review" }, data)),
    }).then(() => true).catch(() => false);
  }

  function stars(n) { n = Math.round(n) || 0; return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function reviewCard(r) {
    const region = (window.SS_REGIONS && SS_REGIONS[r.region]) ? SS_REGIONS[r.region].name : "";
    const where = [r.product, region].filter(Boolean).join(" · ");
    return `<div class="ss-review">
      <div class="ss-review-stars">${stars(r.rating)}</div>
      <p>"${esc(r.review)}"</p>
      <div class="ss-review-who">${esc(r.name)}${where ? ` <span>· ${esc(where)}</span>` : ""}</div>
    </div>`;
  }

  // Render a list of reviews into el. opts: { product, limit, emptyHtml }
  function renderList(el, reviews, opts) {
    opts = opts || {};
    let list = reviews.slice();
    if (opts.product) list = list.filter(r => (r.product || "").toLowerCase() === opts.product.toLowerCase());
    list.sort((a, b) => new Date(b.ts) - new Date(a.ts));
    if (opts.limit) list = list.slice(0, opts.limit);
    if (!list.length) { el.innerHTML = opts.emptyHtml || ""; return false; }
    el.innerHTML = list.map(reviewCard).join("");
    return true;
  }

  // Render a "leave a review" form into el. opts: { product, products, region, onDone }
  function renderForm(el, opts) {
    opts = opts || {};
    const region = opts.region || (window.SS ? SS.getRegion() : "");
    const productField = opts.product
      ? `<input type="hidden" name="product" value="${esc(opts.product)}">`
      : (opts.products && opts.products.length
        ? `<label class="ss-label">Which product?</label>
           <select class="ss-field" name="product"><option value="">(General)</option>${opts.products.map(p => `<option>${esc(p)}</option>`).join("")}</select>`
        : "");
    el.innerHTML = `
      <form class="ss-review-form" novalidate>
        <h4>Leave a review</h4>
        <div class="ss-stars-pick" data-rating="5">
          ${[1, 2, 3, 4, 5].map(i => `<button type="button" class="ss-star" data-v="${i}">★</button>`).join("")}
        </div>
        <div class="ss-form-grid">
          <input class="ss-field" name="name" placeholder="Your name" required>
          ${opts.product ? productField : `<div class="full">${productField}</div>`}
        </div>
        <textarea class="ss-field" name="review" placeholder="Tell everyone how good it was…" required style="margin-top:10px;min-height:80px"></textarea>
        ${opts.product ? productField : ""}
        <button class="ss-btn" type="submit" style="margin-top:10px">Post review</button>
        <p class="ss-review-msg" style="font-weight:700;margin:.5em 0 0;min-height:1.1em"></p>
      </form>`;
    const form = el.querySelector("form");
    const pick = el.querySelector(".ss-stars-pick");
    const msg = el.querySelector(".ss-review-msg");
    function paint() {
      const r = +pick.getAttribute("data-rating");
      pick.querySelectorAll(".ss-star").forEach(b => b.classList.toggle("on", +b.getAttribute("data-v") <= r));
    }
    pick.querySelectorAll(".ss-star").forEach(b => b.onclick = () => { pick.setAttribute("data-rating", b.getAttribute("data-v")); paint(); });
    paint();
    form.onsubmit = e => {
      e.preventDefault();
      const name = form.name.value.trim(), text = form.review.value.trim();
      if (!name || !text) { msg.style.color = "var(--err)"; msg.textContent = "Add your name and a review."; return; }
      const btn = form.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Posting…";
      submit({
        region: region, name: name, rating: +pick.getAttribute("data-rating"),
        product: (form.product ? form.product.value : (opts.product || "")), review: text,
      }).then(() => {
        msg.style.color = "var(--ok)"; msg.textContent = "Thanks! Your review is live. 🍪";
        form.reset(); pick.setAttribute("data-rating", "5"); paint();
        btn.disabled = false; btn.textContent = "Post review";
        if (opts.onDone) setTimeout(opts.onDone, 1200);
      }).catch(() => { msg.style.color = "var(--err)"; msg.textContent = "Couldn't post — try again."; btn.disabled = false; btn.textContent = "Post review"; });
    };
  }

  window.SSReviews = { enabled, fetchPublic, fetchAll, del, submit, renderList, renderForm, reviewCard, stars };
})();
