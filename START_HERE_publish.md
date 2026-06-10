# Second Scoop — Simple Publish & Domain (no GitHub)

You don't need GitHub at all. This is the simplest path: **Netlify Drop** to publish, then point your **GoDaddy domain** at it. Updating later = drag the folder again. That's it.

---

## Step 1 — Unzip

Double-click **`second-scoop-site.zip`**. You get a folder with `index.html`, `backend.html`, the `assets` folder, etc. **directly inside it.**

---

## Step 2 — Publish (Netlify Drop)

You already have a Netlify site (`second-scoop-5735b5.netlify.app`). Update it with the clean files:

1. Go to **https://app.netlify.com** → click your **second-scoop** site.
2. Open the **Deploys** tab.
3. Drag your **unzipped folder** onto the drop area that says *“Drag and drop your site output folder here.”*
4. Wait ~20 seconds → it's live and refreshed.

> Prefer a clean start? Go to **https://app.netlify.com/drop** and drag the folder → it makes a brand-new site with a new URL. Either works.

Your site: `https://second-scoop-5735b5.netlify.app`
Your backend: same URL + `/backend.html` (passcode `scoop-admin-2026`).

---

## Step 3 — Connect your GoDaddy domain (second-scoop.com)

**In Netlify:**
1. Your site → **Domain management** → **Add a custom domain** → type `second-scoop.com` → **Add**.
2. Add `www.second-scoop.com` too if it offers.

**In GoDaddy** (Domain → DNS → Manage DNS):
First, turn OFF domain forwarding/parking: **Domain → Settings → Forwarding → remove** any forwarding. This frees the locked record.

Then set exactly these two records:

| Type  | Name | Value                              | TTL     |
|-------|------|------------------------------------|---------|
| A     | `@`  | `75.2.60.5`                        | Default |
| CNAME | `www`| `second-scoop-5735b5.netlify.app`  | Default |

- Delete/replace any existing `@` **A** record (the GoDaddy parked one) so only `75.2.60.5` remains.
- For the CNAME, the value is the **hostname** (no `https://`, no IP).

**Back in Netlify:** wait 10–60 min. Once it verifies, Netlify auto-adds HTTPS. Set your preferred address as **Primary domain** and turn on **Force HTTPS**.

---

## Updating the site later

Make changes in the **Backend** (they preview instantly for you). To push them live for everyone:

1. Backend → **Save & Export** → download the file(s) you changed.
2. Replace those files inside your site folder (in `assets/js/config/`).
3. Drag the folder onto Netlify → **Deploys** again.

> You can **ignore** the backend's "Publish to live site" GitHub button — that's only for people using GitHub. The drag-to-Netlify method does the same job.

---

## Don't forget: orders → Google Sheet

Separately, follow **`SETUP_GUIDE.md`** to connect orders to your Monthly orders tab, then paste the Web App URL into **Backend → Settings → Google Sheets**. This works no matter how the site is hosted.
