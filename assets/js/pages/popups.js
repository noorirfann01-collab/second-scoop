/* =====================================================================
   POPUPS — events showcase (image + title + location/date + caption)
   ===================================================================== */
(function () {
  SSApp.mount({ recentlySold: false });
  const C = SS.getContent();
  const p = C.popups || {};

  const set = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.textContent = v; };
  set("pop-eyebrow", p.eyebrow);
  set("pop-title", p.title);
  set("pop-intro", p.intro);

  const grid = document.getElementById("pop-grid");
  const imagesOf = e => (e.images && e.images.length) ? e.images.filter(Boolean) : (e.image ? [e.image] : []);
  const events = (p.events || []).filter(e => e && (e.title || imagesOf(e).length));
  if (!grid) return;
  if (!events.length) {
    grid.innerHTML = `<p class="ss-empty" style="grid-column:1/-1">No popups posted yet — check back soon. 🍪</p>`;
    return;
  }
  grid.innerHTML = events.map((e, idx) => {
    const meta = [e.location, e.date].filter(Boolean).join(" · ");
    const imgs = imagesOf(e);
    const main = imgs.length
      ? `<img id="pop-main-${idx}" class="ss-lb-open" src="${SS.imgSrc(imgs[0])}" alt="${(e.title || "").replace(/"/g, "")}" loading="lazy" onerror="this.parentNode.classList.add('ss-noimg');this.remove()">`
      : "";
    const thumbs = imgs.length > 1
      ? `<div class="ss-popup-thumbs">${imgs.map((src, i) => `<button class="ss-popup-thumb${i === 0 ? " is-active" : ""}" data-ev="${idx}" data-i="${i}" data-src="${SS.imgSrc(src)}"><img src="${SS.imgSrc(src)}" alt="" loading="lazy" onerror="this.remove()"></button>`).join("")}</div>`
      : "";
    return `<article class="ss-popup ss-tilt">
      <div class="ss-popup-media${imgs.length ? "" : " ss-noimg"}" data-ev="${idx}" data-active="0">${main}${imgs.length > 1 ? `<span class="ss-popup-count">📸 ${imgs.length}</span>` : ""}</div>
      <div class="ss-popup-body">
        ${e.title ? `<h3>${e.title}</h3>` : ""}
        ${meta ? `<span class="ss-popup-meta">${meta}</span>` : ""}
        ${e.caption ? `<p>${e.caption}</p>` : ""}
        ${thumbs}
      </div>
    </article>`;
  }).join("");

  // thumbnail → swap the main image of that event (and remember which is active)
  grid.querySelectorAll(".ss-popup-thumb").forEach(b => b.addEventListener("click", () => {
    const idx = b.getAttribute("data-ev");
    const main = document.getElementById("pop-main-" + idx);
    if (main) main.src = b.getAttribute("data-src");
    const media = main && main.closest(".ss-popup-media");
    if (media) media.setAttribute("data-active", b.getAttribute("data-i") || "0");
    b.parentNode.querySelectorAll(".ss-popup-thumb").forEach(t => t.classList.toggle("is-active", t === b));
  }));

  // click the main photo → open all of that event's photos as a fullscreen carousel
  grid.querySelectorAll(".ss-popup-media").forEach(media => {
    const idx = +media.getAttribute("data-ev");
    const ev = events[idx]; const imgs = imagesOf(ev);
    if (!imgs.length) return;
    media.style.cursor = "zoom-in";
    media.addEventListener("click", () => SSApp.openLightbox(
      imgs.map(s => ({ src: s, caption: ev.title || "" })), +media.getAttribute("data-active") || 0));
  });

  // re-run motion on the freshly injected cards
  if (SSApp.initTilt) SSApp.initTilt(grid);
})();
