# Second Scoop — Ecommerce Platform

> The First Scoop Is Never Enough.

A complete, production-ready ecommerce site for the Second Scoop dessert brand. Mobile-first, premium DTC styling, two independent regional storefronts (Pakistan 🇵🇰 / Toronto 🇨🇦), a secret-product **Vault**, full cart + checkout, order logging to Google Sheets, and an analytics **Admin Dashboard**.

Built with plain HTML, CSS and JavaScript — **no build step, no dependencies**. Open it in a browser or host it anywhere static.

---

## Run it

**Easiest:** double-click `index.html`.

**Recommended (so everything works including cart persistence across pages):** run a tiny local server from this folder:

```bash
# Python
python3 -m http.server 8000
# then visit http://localhost:8000

# or Node
npx serve .
```

**Host it free:** drag this folder onto [Netlify Drop](https://app.netlify.com/drop), or push to GitHub and enable Pages, or use Vercel. It's all static files.

---

## The Backend (your control room)

Everything is managed from one private, passcode-protected hub: **`backend.html`**.
It's **not linked anywhere on the public site**, so customers can't find it. Bookmark the URL, or just type `/backend.html`. (The old `/admin.html` and `/manager.html` links redirect here too.) Default passcode: `scoop-admin-2026` — change it in **Settings**.

The backend has a sidebar with these tabs:

- **Dashboard** — revenue (today/week/month/year), orders, best/lowest sellers, revenue by product/category/region, customer & inventory metrics. *Load demo orders* to see it populated.
- **Orders** — every order in a searchable, filterable table. Change order/payment status inline; export to CSV.
- **Products** — Shopify-style: add, edit, duplicate, hide or delete; set price/availability/inventory **per region**; upload images; toggle Featured/Hero/Secret/Hidden; badges & ratings.
- **The Vault** — secret codes and which products they unlock, per region.
- **Content & Copy** — edit the homepage hero (headline, tagline, sub-text, trust badges), How-It-Works steps, the whole About page, and every FAQ. Basically all the words on the site.
- **Announcements** — the top bar message + colour per region, with a live preview.
- **Settings** — brand name/tagline/contact/Instagram, **store locations** (pickup address & hours, delivery cities, fees, free-delivery threshold) per region, the **Google Sheets webhook URL**, and the backend passcode.
- **Save & Export** — download the updated config files to publish your edits for everyone.

> How it works: edits save instantly as an override layer in your browser (so the live site reflects them right away for you). To publish for **all** visitors, open **Save & Export**, download the files you changed (`products.js`, `content.js`, `regions.js`, `vault.js`, `settings.js`), drop them into `assets/js/config/`, and redeploy. One-click **Revert** discards everything.

## Editing via config files (advanced)

Prefer code? Everything is also editable directly. No products are hardcoded in pages — edit these and the whole site updates:

| File | Controls |
|------|----------|
| `assets/js/config/products.js` | **All products** — add/remove/hide, price, description, images, availability, badges, inventory, secret flag. The single source of truth. |
| `assets/js/config/regions.js` | The two storefronts — currency, delivery fees, pickup info, cities, and the **announcement bar** text per region. |
| `assets/js/config/vault.js` | **The Vault** — secret codes (per region) and which secret products each code unlocks. |
| `assets/js/config/settings.js` | Brand info, **Google Sheets webhook URL**, admin passcode, feature flags, promo codes. |

Each file has a comment block at the top explaining exactly how to manage it.

### Common tasks

- **Add a product:** copy a block in `products.js`, give it a new unique `id`.
- **Change a price:** edit `regions.<region>.price` on that product.
- **Mark sold out / coming soon:** set `status: "sold-out"` or `"coming-soon"`.
- **Put it on pre-order:** `status: "preorder"` (or `"closing"`).
- **Feature on homepage:** `featured: true`.
- **Add a secret drop:** add the product with `secret: true`, then map a code to it in `vault.js`.
- **Change the announcement bar:** edit `announcement.text` in `regions.js`.
- **Add your photos:** drop image files in `assets/img/` (see that folder's `README.txt`).

---

## Pages

**Public:** `index.html` (home) · `shop.html?region=pakistan|toronto` · `product.html?id=...` · `cart.html` · `checkout.html` · `confirmation.html` · `vault.html` · `about.html` · `faq.html` · `preorders.html` · `contact.html`

**Private (passcode):** `backend.html` — the unified control room (not linked publicly).

## The Vault

A locked screen takes a code. Wrong codes get *"Not this scoop. Try again."* Correct codes reveal the secret product(s) — image, name, description, price, Add to Cart — and the unlock is remembered on that device. Codes and products are **region-specific**. Default demo codes (edit in `vault.js`):

- `FIRSTSCOOP` → Salted Caramel Stuffed Scoopie (both regions)
- `CHURRO` → Stuffed Churro Scoopie (Pakistan)
- `VAULT` / `VAULT6IX` → the full Vault

## Orders → your Google Sheet

Pakistan orders flow straight into the **"Monthly orders"** tab of your **Second Scoop Costing** spreadsheet, in your exact columns (first/last name, Instagram, the itemised products block, preferred method, revenue, etc.). Toronto orders go to a separate **"Toronto Orders"** tab in the same file. Orders are also always saved on the device (that powers the backend dashboard), so nothing is lost if the sheet is offline. Full ~8-minute setup is in **`SETUP_GUIDE.md`**; paste the resulting Web App URL into **Backend → Settings**.

---

## Notes on assets

- The **logo** (your real Second Scoop artwork) is in `assets/img/` — the cookie "SS" mark (`logo-mark.png`), a cream version for dark backgrounds (`logo-mark-cream.png`), and the full stacked wordmark (`logo-wordmark.png`). Your original uploads are kept in `brand-assets/originals/`.
- **Product photos** aren't included yet, so the shop shows premium styled placeholders. Drop `og-scoopie.jpg`, `doughiginal.jpg` and `chunkies.jpg` into `assets/img/` and they appear everywhere automatically. See `assets/img/README.txt`.
