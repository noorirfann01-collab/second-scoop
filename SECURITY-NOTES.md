# Second Scoop — Security notes & what was done

Your site is a **static site** (HTML/CSS/JS on Netlify). The single most important
thing to understand: **anything in the JS files is public.** A static site can't keep
secrets in front-end code. Below is what was fixed, what's inherent to this setup, and
what would need a small server to truly lock down.

## ✅ Fixed in this update (no server needed)

- **Security headers added** (`_headers`): Content-Security-Policy, X-Frame-Options
  (anti-clickjacking), X-Content-Type-Options (anti MIME-sniffing), Referrer-Policy,
  Permissions-Policy, and stronger HSTS (`includeSubDomains; preload`). The CSP is
  tuned to allow exactly what your site uses (Google Fonts, the Apps Script webhook,
  LightWidget, GitHub API) so nothing breaks.
- **Backend hidden from search engines** (`robots.txt` disallows `/backend.html`,
  `/admin.html`, `/manager.html`).
- **Webhook spam filter**: the Apps Script now ignores junk POSTs that don't look like
  a real order/review/signup/message.
- **Admin passcode rotated** in `settings.js`. Change it again to your own value.

## 🟡 Important context (the review over-stated some of this)

- **"Admin panel is wide open."** The passcode is visible in source, true — but opening
  the backend only gives a local sandbox. It **cannot publish to your live site**
  (needs the GitHub token) and **cannot read your orders / mailing list / messages**
  (needs the dashboard read key). Both of those live ONLY in your own browser and are
  **never written into any file**. So the practical damage from someone opening the
  backend is near zero. Still: change the passcode and don't reuse it.
- **Your bank IBAN is public.** This is by design — you show it to customers so they can
  pay you. Published payment details are normal for a business; it does not let someone
  "become you." Just don't store *other* secrets in the front-end files.
- **Orders are protected.** Reading orders back requires the secret READ_KEY, which lives
  in the Apps Script (server-side) and your browser — not in the public files.

## 🔴 Inherent to a static site (need a small server to truly fix)

- **Vault codes are visible** in `vault.js`. On a static site the unlock check runs in
  the browser, so the codes can be read in source. The Vault is fun gating, not real
  security. To make it truly secret, the code-check + hidden products must move behind a
  serverless function.
- **Cart/price trust.** A tech-savvy user could change a price in their own browser before
  submitting. Because **you confirm every order and take payment in advance by bank
  transfer**, you'd catch any mismatch when reconciling payment — so real-world risk is low.
- **Open webhook.** Anyone who finds the URL can POST. The spam filter helps; a serverless
  proxy with a secret + rate limiting (or Netlify Forms / a CAPTCHA) would fully fix it.

## The real fix for true secrets: Netlify Functions

Move admin auth, vault unlocking, and the order webhook behind **Netlify Functions**
(free tier). Secrets live in Netlify environment variables, never in the repo. This is
the only way to keep something genuinely secret on this hosting. Ask and this can be set up.

## Do these now
1. Ship this update (the headers + robots + filter go live on publish).
2. Change your admin passcode (Backend → Brand & Settings → passcode) to something only you know.
3. Treat the current IBAN/passcode as already-seen; that's fine for the IBAN, rotate the passcode.
