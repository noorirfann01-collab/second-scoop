# Second Scoop — Get a Live Website + One-Click Publishing

Right now your site is a folder of files on your computer. To get a **public link** and the **"Publish to live site"** button working, you host the site on **GitHub Pages** (free) once. After that, every change you make in the Backend goes live by pressing one button — no downloads, ever.

Total one-time setup: ~10 minutes.

---

## Part 1 — Put the site online (gives you your link)

1. Create a free account at <https://github.com> (if you don't have one).
2. Click **+ → New repository**. Name it **`second-scoop`**. Set it to **Public**. Click **Create repository**.
3. On the new repo page click **uploading an existing file**.
4. Open your **Second Scoop** folder, select **everything inside it** (index.html, the `assets` folder, all the `.html` files, etc.) and drag it into the browser. Wait for upload, then click **Commit changes**.
5. Go to the repo's **Settings → Pages**.
6. Under **Build and deployment → Source**, choose **Deploy from a branch**. Branch: **main**, folder: **/ (root)**. Click **Save**.
7. Wait ~1 minute, refresh the page. GitHub shows:
   **“Your site is live at `https://YOUR-USERNAME.github.io/second-scoop/`”**

**That link is your website.** 🎉
Your backend is at `https://YOUR-USERNAME.github.io/second-scoop/backend.html`.

---

## Part 2 — Create a publishing token (lets the button save changes)

1. Go to <https://github.com/settings/tokens?type=beta> (Settings → Developer settings → **Fine-grained tokens**).
2. **Generate new token**.
   - **Token name:** `Second Scoop publish`
   - **Expiration:** 1 year (or your choice)
   - **Repository access:** *Only select repositories* → pick **second-scoop**
   - **Permissions → Repository permissions → Contents:** set to **Read and write**
3. **Generate token** and **copy it** (starts with `github_pat_…`). You won't see it again.

> The token only lets it edit files in this one repo. It's stored only in your browser, never inside the website.

---

## Part 3 — Connect the Backend (one time)

1. Open your live backend: `https://YOUR-USERNAME.github.io/second-scoop/backend.html`
2. Log in (passcode `scoop-admin-2026`).
3. Go to **Settings → One-click publishing** and fill in:
   - **GitHub username / owner:** your GitHub username
   - **Repository name:** `second-scoop`
   - **Branch:** `main`
   - **Config folder path:** `assets/js/config` (leave as is)
   - **GitHub access token:** paste the token
4. Click **Test connection** — you should see ✅ Connected.
5. Click **Save settings**.

---

## Part 4 — Publish whenever you want

From now on:

1. Make any changes in **Products, Content, Settings, Vault, Announcements** — they preview instantly.
2. Click **⤴ Publish to live site** (top-right of the Backend).
3. A little window shows each file publishing. Done in a few seconds.
4. Your live site updates automatically about **1 minute** later.

That's it. No files to download, no copy-paste.

---

## FAQ

**Do I have to redo this every time?** No — Parts 1–3 are one-time. After that it's just the Publish button.

**Where do customer orders go?** Into your Google Sheet (see `SETUP_GUIDE.md`) and the Backend dashboard. Publishing is only for site/content/product changes.

**Is my token safe in a public repo?** Yes — the token lives only in your browser's storage. It is never written into any file that gets published. (Your backend passcode and Google Sheets URL *do* live in `settings.js`, which is public in the repo — keep the passcode non-sensitive, and the Sheets URL is safe to expose since it only accepts new orders.)

**Prefer Netlify or Vercel instead of GitHub Pages?** Connect either one to the same GitHub repo (New site → import from Git → pick `second-scoop`). They auto-deploy on every publish too, and give you a nicer URL / custom domain support. The Publish button works the same way because it commits to GitHub.

**Want a custom domain (e.g. secondscoop.co)?** Easiest via Netlify or Vercel → Domain settings. I can walk you through it.
