# 📨 Mailing List Emails — Setup Guide

Your site now sends real emails to your mailing list (restocks, new drops, Vault unlocks)
through **Brevo**. The whole system runs on your existing Google Sheet + Apps Script —
no new website hosting needed. Your Brevo key stays **server-side in Apps Script** and is
never written into any public site file.

---

## 1. Make a free Brevo account (5 min)

1. Sign up at **https://www.brevo.com** (free plan = 300 emails/day — plenty to start).
2. Go to **Senders, Domains & Dedicated IPs → Senders** and add the email you want to
   send *from* (e.g. `hello@second-scoop.com`). Click the verification link Brevo emails you.
   - Best deliverability: also authenticate your domain (SPF/DKIM) under **Domains**. Optional but recommended.
3. Go to **Settings → SMTP & API → API Keys → Generate a new API key**. Copy it.

## 2. Put your key into Apps Script (one time)

1. Open your Google Sheet → **Extensions → Apps Script**.
2. Paste the new `Code.gs` (from this update) over the old one.
3. In the function dropdown at the top, pick **`setupEmail`** and edit these three lines first:
   ```js
   props.setProperty("BREVO_API_KEY", "PASTE-YOUR-BREVO-API-KEY-HERE");
   props.setProperty("SENDER_EMAIL", "hello@second-scoop.com");  // your verified sender
   props.setProperty("SENDER_NAME",  "Second Scoop");
   ```
4. Click **Run** once. (Approve the permission prompt.) Your key is now stored privately in
   Script Properties — it is **not** in the code you share or publish.
5. **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy.** (URL stays the same.)

> ⚠️ You must re-deploy as a **New version** or the site will still be running the old script.

## 3. Send your first email

In your backend → **Mailing List** tab:

1. Type your own email in the test box and hit **Send test to me** — confirm it arrives.
2. Pick a **template** (Restock / New drop / Vault), optionally **feature a product**
   (auto-fills the name, image and link), choose your **audience** (Everyone / Pakistan / Toronto),
   tweak the wording, watch the **live preview**, then **Send**.

Every email includes a working **Unsubscribe** link. When someone unsubscribes they’re marked
`no` in your sheet’s Mailing List tab and skipped automatically on future sends.

## 4. Auto-announce on publish

When you publish a product that just came **back in stock** or is **brand new**, the publish
box offers a one-click **“Compose announcement”** button with the email pre-filled. Toggle this
on/off with the checkbox at the top of the Mailing List tab.

---

## 5. Daily recap email to yourself (free — no Brevo needed)

Get a 10 PM recap of the day: orders + revenue, new signups, low-stock / sold-out, and new
reviews & messages. This uses Gmail directly (not Brevo) and runs on Google's servers.

1. In Apps Script, open `setupEmail()` and confirm the last line points at your inbox:
   ```js
   props.setProperty("ADMIN_EMAIL", "noorirfann01@gmail.com");
   ```
   Run `setupEmail()` once (already done if you set up Brevo above).
2. In **Project Settings** (gear icon), set **Time zone → Asia/Karachi** so 10 PM = Lahore time.
3. Run the function **`createDailyTrigger()`** once and approve the Gmail permission prompt.
   That schedules `dailyAdminSummary()` to run every day at 10 PM.
4. Want to see it now? Just run **`dailyAdminSummary()`** manually — a recap lands in your inbox.

To change the time, edit `atHour(22)` in `createDailyTrigger()` (22 = 10 PM, 8 = 8 AM) and re-run it.
Low-stock is read from your **live** site, so publish your latest inventory for it to be accurate.

## 6. Automatic order emails to customers (Brevo)

Customers now get two automatic emails:

- **"Order received — please pay"** the moment they place an order — includes their order
  number, items, total, and your **bank-transfer details** (pulled live from your site, so
  whatever you set in Backend → Shop & Checkout → Payment is always what they see) plus the
  "send a screenshot to confirm" instructions.
- **"Payment confirmed"** when you mark the order **Paid** — whether you change it in the
  backend Orders tab **or** type "Paid" straight into the Payment Status cell in your sheet.

Setup:

1. Make sure **Brevo is connected** (section 1–2 above) — these are customer-facing, so they
   send from your Brevo sender for good deliverability.
2. For the "mark Paid in the sheet" path, run **`createOrderEmailTriggers()`** once in Apps
   Script and approve the prompt. (The backend "Paid" dropdown works without this.)
3. Re-deploy the Apps Script as a **New version**.

Each order can only ever get one "received" and one "paid" email — an **Emails Sent** column is
added to your order tabs to prevent duplicates, even if a status is toggled back and forth.

---

### Notes & limits
- **Free plan: 300 emails/day.** If your list is bigger, sends beyond 300 that day will fail
  (shown as "failed" in the campaign log) — upgrade Brevo or split across days.
- Sends happen one email at a time so each person only sees their own address (never CC'd together).
- A **Campaigns** tab is added to your sheet logging every send (subject, audience, delivered, failed).
- A **Subscribed** column is added to your Mailing List tab automatically.
