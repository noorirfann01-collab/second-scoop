# Make Second Scoop safer with a tiny server (Netlify Functions)

This adds a small piece of server code that runs on Netlify (free). It fixes the
two things a static site can't: **cart/price tampering** and the **public webhook**.

You don't have to do this for the site to work — orders keep working as-is until you
switch it on. When you're ready:

## What it does
- Every order is re-checked on the **server**: it recomputes the total from your real
  product prices and **ignores any total the customer's browser sent**. A tampered price
  is corrected automatically.
- Your Google Sheet webhook URL becomes a **secret** (a Netlify environment variable),
  so it's no longer sitting in your public files.

## One-time setup (about 5 minutes)

1. **Push this update** to GitHub (it already includes `netlify.toml` and
   `netlify/functions/place-order.js`). Netlify auto-detects and deploys the function.

2. In **Netlify → your site → Site configuration → Environment variables**, add:
   - `SHEET_WEBHOOK` = your Apps Script URL (the `https://script.google.com/.../exec` one)
   - `SITE_URL` = `https://second-scoop.com`
   Then **Deploys → Trigger deploy → Deploy site** so the variables take effect.

3. Test it works: visit
   `https://second-scoop.com/.netlify/functions/place-order` — it should say
   "Method not allowed" (that's correct; it only accepts orders, not plain visits).

4. In your backend → **Brand & Settings → Google Sheets order sync**, set
   **Secure order endpoint** to:  `/.netlify/functions/place-order`
   Save, then Publish.

That's it. Orders now flow: customer → your server function (re-checks the total) →
your Google Sheet. Customers can no longer pay a tampered price.

## Optional next steps (ask and these can be added)
- Move **admin login** into a function so the passcode never ships in the page.
- Move **Vault code checking** server-side so the secret codes aren't in `vault.js`.
- Add **rate limiting / a honeypot** to the order function to kill spam entirely.

## If something looks off
- Orders not appearing? Check the env vars are set and you re-deployed. Until the endpoint
  is set in the backend, orders still go directly to the sheet (nothing breaks).
- You can always clear the **Secure order endpoint** field to fall back to direct-to-sheet.
