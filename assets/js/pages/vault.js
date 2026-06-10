/* =====================================================================
   THE VAULT — secret code unlock, region-aware, persistent
   ===================================================================== */
(function () {
  SSApp.mount({ recentlySold: false });

  const region = SS.getRegion();
  const locked = document.getElementById("vault-locked");
  const revealed = document.getElementById("vault-revealed");
  const grid = document.getElementById("vault-grid");
  const msg = document.getElementById("vault-msg");
  const form = document.getElementById("vault-form");
  const input = document.getElementById("vault-code");

  // copy from config (respects manager overrides)
  const VAULT = SS.getVault();
  document.getElementById("vault-title").textContent = VAULT.teaser.title;
  document.getElementById("vault-subtitle").textContent = VAULT.teaser.subtitle;
  document.getElementById("vault-hint").textContent = VAULT.teaser.hint;

  function renderRevealed() {
    const unlocked = SS.unlockedSecretProducts(region);
    if (!unlocked.length) { showLocked(); return; }
    grid.innerHTML = unlocked.map(p => SSApp.productCard(p)).join("");
    locked.style.display = "none";
    revealed.style.display = "block";
  }
  function showLocked() {
    locked.style.display = "flex";
    revealed.style.display = "none";
  }

  // show already-unlocked products on load
  if (SS.vaultUnlocks(region).length) renderRevealed();

  form.addEventListener("submit", e => {
    e.preventDefault();
    const res = SS.tryVaultCode(input.value, region);
    if (res.ok) {
      msg.style.color = "var(--gold-soft)";
      msg.textContent = `Unlocked: ${res.label || "Secret Scoops"} 🔓`;
      setTimeout(renderRevealed, 700);
    } else {
      msg.style.color = "var(--blush)";
      msg.textContent = VAULT.wrongCodeMessage;
      const box = document.querySelector(".ss-vault-box");
      box.classList.add("ss-vault-shake");
      setTimeout(() => box.classList.remove("ss-vault-shake"), 450);
      input.value = "";
    }
  });

  const more = document.getElementById("vault-add-more");
  if (more) more.addEventListener("click", () => { showLocked(); input.focus(); });
})();
