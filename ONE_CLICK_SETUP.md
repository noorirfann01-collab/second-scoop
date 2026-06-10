# Get the One-Click Publish Button Working (GitHub + Netlify)

Goal: edit in the backend → press **Publish** → site updates automatically. No downloads.

How it works: the Publish button saves your changes into a **GitHub repo**. **Netlify watches that repo** and rebuilds your live site whenever it changes. So we need three things lined up: (A) the full site in a GitHub repo, (B) Netlify connected to that repo, (C) the backend holding a valid token.

Do these **in order**. If a step looks different than described, stop and tell me.

---

## A. Put the FULL site in a fresh GitHub repo (done right)

The earlier 404 happened because the files landed inside a sub-folder. This avoids that.

1. Go to **github.com** → top-right **+** → **New repository**.
2. Name it **`second-scoop`** (lowercase). Set **Public**. Click **Create repository**.
3. On the new repo page, click the link **“uploading an existing file.”**
4. In Finder, **open** your unzipped `second-scoop-site` folder so you can see `index.html`, `backend.html`, `assets`, etc. *inside* it.
5. Click once on any item, then press **⌘A** to select **everything inside the folder**.
6. **Drag the highlighted items** into the GitHub upload box.
   ⚠️ Drag the *selected files*, **NOT** the folder itself. (Dragging the folder is what nested it before.)
7. Wait for all files to list, then scroll down and click **Commit changes**.

**✅ Checkpoint:** your repo's main page should now show `index.html`, `backend.html`, `assets`, etc. listed **directly** (not one lonely folder). If you see a single folder, delete it and redo steps 3–7. Don't continue until this looks right.

---

## B. Connect Netlify to the repo

This makes Netlify rebuild automatically whenever Publish pushes a change.

1. **app.netlify.com** → your **second-scoop** site → **Site configuration** (or Project configuration) → **Build & deploy** → **Continuous deployment**.
2. Click **Link repository** (or “Link site to Git”).
3. Choose **GitHub** → authorize if asked → pick **second-scoop**.
4. Settings:
   - **Branch to deploy:** `main`
   - **Build command:** leave **blank**
   - **Publish directory:** type `.` (a single dot) or leave blank
5. Click **Deploy / Save**. Netlify will deploy from the repo once. Your site keeps the same `second-scoop-5735b5.netlify.app` URL (and your domain once DNS finishes).

**✅ Checkpoint:** Netlify shows a successful deploy “from GitHub.”

---

## C. Make a token (classic — the most reliable)

1. Go to **https://github.com/settings/tokens** → **Tokens (classic)** tab → **Generate new token → Generate new token (classic)**.
2. Note: `Second Scoop`. Expiration: your choice (e.g. 1 year).
3. Tick the **`repo`** checkbox (the top one — it selects everything under it).
4. Scroll down → **Generate token**.
5. **Copy** the token (`ghp_…`). It's shown once.

---

## D. Tell the backend

1. Open `second-scoop-5735b5.netlify.app/backend.html` → log in.
2. **Settings → One-click publishing:**
   - **GitHub username / owner:** your GitHub username (the part in your repo URL right after `github.com/`)
   - **Repository name:** `second-scoop`  *(must match the repo exactly)*
   - **Branch:** `main`
   - **Config folder path:** `assets/js/config`
   - **Token:** paste the `ghp_…` token
3. Click **Test connection** → it should say ✅ Connected.
4. Click **Save settings**.

---

## E. Use it

Make any edit → top-right **⤴ Publish to live site** → it writes to GitHub → Netlify rebuilds → live in ~1 minute. 🎉

---

### If Test connection still says 404
- The **owner** or **repo name** doesn't match exactly. Open your repo in the browser; the URL reads `github.com/OWNER/REPO`. Copy those two values *exactly* (capitals matter) into the backend.
- Or the token is from a **different GitHub account** than the one that owns the repo. Use a token from the same account.
