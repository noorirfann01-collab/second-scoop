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
  const events = (p.events || []).filter(e => e && (e.title || e.image));
  if (!grid) return;
  if (!events.length) {
    grid.innerHTML = `<p class="ss-empty" style="grid-column:1/-1">No popups posted yet — check back soon. 🍪</p>`;
    return;
  }
  grid.innerHTML = events.map(e => {
    const meta = [e.location, e.date].filter(Boolean).join(" · ");
    const img = e.image
      ? `<img src="${SS.imgSrc(e.image)}" alt="${(e.title || "").replace(/"/g, "")}" loading="lazy" onerror="this.parentNode.classList.add('ss-noimg');this.remove()">`
      : "";
    return `<article class="ss-popup ss-tilt">
      <div class="ss-popup-media${e.image ? "" : " ss-noimg"}">${img}</div>
      <div class="ss-popup-body">
        ${e.title ? `<h3>${e.title}</h3>` : ""}
        ${meta ? `<span class="ss-popup-meta">${meta}</span>` : ""}
        ${e.caption ? `<p>${e.caption}</p>` : ""}
      </div>
    </article>`;
  }).join("");

  // re-run motion on the freshly injected cards
  if (SSApp.initTilt) SSApp.initTilt(grid);
})();
