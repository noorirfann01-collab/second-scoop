# Second Scoop — Connect Orders to Your Google Sheet

This pipes every **Pakistan** website order straight into the **"Monthly orders"** tab of your existing **Second Scoop Costing** spreadsheet, in the exact columns you already use. Toronto orders go to their own **"Toronto Orders"** tab so they don't mix with your PKR accounting.

It uses **Google Apps Script** — free, no third-party tools, and your data never leaves your Google account. ~8 minutes, one time.

---

## What gets written

Into **Monthly orders** (columns A–N), for each Pakistan order:

| Col | Column header | Comes from |
|-----|---------------|-----------|
| A | Submission Date | order time (`YYYY-MM-DD HH:MM:SS`) |
| B | Full Name - First Name | first word of name |
| C | Full Name - Last Name | rest of name |
| D | Email Address | email |
| E | Phone Number | phone |
| F | Instagram: | Instagram (optional at checkout) |
| G | Address - Street Address | delivery address |
| H | Address - Street Address Line 2 | address line 2 |
| I | What are you craving?: Products | itemised list + total (same format as your form) |
| J | Preferred Method | "Delivery (Rs.X)" or "Pick up (location)" |
| K | Submission ID | the website order number |
| L | Payment Status: | `PENDING` (you update to PAID/COMP) |
| M | Delivery/pickup date: | preferred date |
| N | Revenue: | product subtotal (excludes delivery, like your sheet) |

Your summary columns (P/Q/R totals) are left untouched.

---

## Step 1 — Open the script editor

1. Open your **Second Scoop Costing** spreadsheet.
2. Menu: **Extensions → Apps Script**.
3. Delete anything in the editor.
4. Open `google-apps-script/Code.gs` from this project, copy **everything**, paste it in, and click **Save** 💾.

> The script targets a tab named exactly **`Monthly orders`**. That's the name in your sheet today — leave it as is.

## Step 2 — Deploy as a Web App

1. Click **Deploy → New deployment**.
2. Gear icon ⚙️ → **Web app**.
3. Set:
   - **Execute as:** **Me**
   - **Who has access:** **Anyone**  *(needed so the site can submit; no one can read your sheet — they can only post an order)*
4. **Deploy** → **Authorize access** → pick your Google account → **Advanced → Go to (project) → Allow**.
5. Copy the **Web app URL** (looks like `https://script.google.com/macros/s/AKfy…/exec`).

> Test: paste that URL in a browser. You should see `{"ok":true,"service":"Second Scoop order webhook"}`.

## Step 3 — Connect the website

Two ways — pick one:

**A. From the Backend (easiest)**
Open `admin.html` → **Settings** tab → paste the URL into **Google Sheets Webhook URL** → **Save**.

**B. In the file**
Open `assets/js/config/settings.js` and set:

```js
googleSheets: {
  webhookUrl: "https://script.google.com/macros/s/AKfy…/exec",
  enabled: true,
},
```

That's it. Place a test order on the Pakistan store — it appears in **Monthly orders** within a second or two.

---

## Notes

- Orders are **always saved on the device** too, which powers the Backend dashboard — so nothing is lost even if the sheet is offline or not yet connected.
- To re-deploy after editing the script, use **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy** (the URL stays the same).
- Want Toronto in the *same* sheet file but separate tab? It already does that automatically (**Toronto Orders**). If you'd rather route Toronto somewhere else, tell me and I'll adjust the script.

## Prefer a no-code tool instead?

The website just POSTs JSON to the URL in `settings.js`. You can point it at **Make.com** ("Custom webhook" → "Google Sheets: Add a Row"), **Zapier** ("Catch Hook" → "Create Spreadsheet Row"), or **SheetDB** instead. Apps Script is recommended (free, unlimited, private).
