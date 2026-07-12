/* =====================================================================
   SECOND SCOOP — GOOGLE APPS SCRIPT (header-driven, column-safe)
   ---------------------------------------------------------------------
   Writes orders, reviews, signups and contact messages into your sheet,
   and reads orders/lists back for your Backend dashboard.

   ⭐ NEW: orders are matched to your columns BY HEADER NAME, not by
   position. So it always puts Revenue under "Revenue", the order status
   under "Delivery Status"/"Order Status", etc. — no more clashes, even
   if you add/move columns. (This fixes revenue landing in the wrong cell.)

   AFTER PASTING: Deploy → Manage deployments → ✏️ Edit → Version: New
   version → Deploy. (Keeps the same URL.)
   ===================================================================== */

var PK_SHEET = "Monthly orders";   // Lahore / Pakistan orders
var TO_SHEET = "Toronto Orders";   // Toronto orders
var REV_SHEET = "Reviews";
var LIST_SHEET = "Mailing List";
var MSG_SHEET = "Messages";
var CAMPAIGN_SHEET = "Campaigns";  // log of every email blast

// 🔒 Keep this the SAME as Backend → Brand & Settings → "Dashboard read key".
var READ_KEY = "scoop-read-2026";

/* =====================================================================
   EMAIL (Brevo) — SET THESE ONCE, then run setupEmail() from the editor.
   Your Brevo API key lives ONLY here in the script (never in the website
   files). Get a free key at brevo.com → Settings → SMTP & API → API Keys.
   The sender email MUST be a Brevo-verified sender (Senders & IPs).
   ===================================================================== */
function setupEmail() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty("BREVO_API_KEY", "PASTE-YOUR-BREVO-API-KEY-HERE");
  props.setProperty("SENDER_EMAIL", "secondscooponline@gmail.com"); // must be verified in Brevo
  props.setProperty("SENDER_NAME",  "Second Scoop");
  props.setProperty("ADMIN_EMAIL",  "noorirfann01@gmail.com");      // where the daily recap goes
  Logger.log("Saved. Sender + key + admin email stored in Script Properties.");
}
function getProp_(k, dflt) {
  var v = PropertiesService.getScriptProperties().getProperty(k);
  return (v === null || v === undefined || v === "") ? (dflt || "") : v;
}
function emailReady_() {
  var key = getProp_("BREVO_API_KEY");
  return !!(key && key.indexOf("PASTE-") !== 0);
}
// Deterministic per-email unsubscribe token (stops strangers unsubscribing others).
function unsubToken_(email) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    String(email).toLowerCase() + "|" + READ_KEY);
  return Utilities.base64EncodeWebSafe(raw).replace(/[=]+$/, "").slice(0, 20);
}
function webappUrl_() { try { return ScriptApp.getService().getUrl(); } catch (e) { return ""; } }

// Send ONE email through Brevo. Returns true on success.
function brevoSend_(toEmail, toName, subject, html) {
  var payload = {
    sender: { name: getProp_("SENDER_NAME", "Second Scoop"), email: getProp_("SENDER_EMAIL") },
    to: [{ email: toEmail, name: toName || toEmail }],
    subject: subject,
    htmlContent: html
  };
  var res = UrlFetchApp.fetch("https://api.brevo.com/v3/smtp/email", {
    method: "post", contentType: "application/json",
    headers: { "api-key": getProp_("BREVO_API_KEY"), "accept": "application/json" },
    payload: JSON.stringify(payload), muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  return code >= 200 && code < 300;
}

/* =====================================================================
   DAILY ADMIN RECAP — free, sent through Gmail (MailApp). No Brevo needed.
   ONE-TIME: run setupEmail() (sets ADMIN_EMAIL), then run createDailyTrigger()
   and approve the permission prompt. Set the project timezone to Asia/Karachi
   under Project Settings so 10 PM means Lahore time.
   ===================================================================== */
var PRODUCTS_URL = "https://second-scoop.com/assets/js/config/products.js";
var CONTENT_URL = "https://second-scoop.com/assets/js/config/content.js";

function createDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === "dailyAdminSummary") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("dailyAdminSummary").timeBased().everyDays(1).atHour(22).create();  // 22 = 10 PM (project timezone)
  Logger.log("Daily 10 PM recap trigger created. (Set project timezone to Asia/Karachi.)");
}

// Turn any date-ish cell into yyyy-MM-dd in the given timezone.
function dayStr_(val, tz) {
  if (val instanceof Date) return Utilities.formatDate(val, tz, "yyyy-MM-dd");
  var s = String(val || "").trim();
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[1] + "-" + m[2] + "-" + m[3];
  var d = new Date(s); if (!isNaN(d)) return Utilities.formatDate(d, tz, "yyyy-MM-dd");
  return "";
}
function esc_(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function dailyAdminSummary() {
  var to = getProp_("ADMIN_EMAIL"); if (!to) { Logger.log("Set ADMIN_EMAIL first (run setupEmail)."); return; }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = Session.getScriptTimeZone() || "Asia/Karachi";
  var today = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");

  // orders + revenue placed today
  var ord = { count: 0, pk: 0, to: 0, list: [] };
  [[PK_SHEET, "pk", "Rs"], [TO_SHEET, "to", "C$"]].forEach(function (cfg) {
    var sheet = ss.getSheetByName(cfg[0]); if (!sheet) return;
    var v = sheet.getDataRange().getValues(); if (v.length < 2) return;
    var h = v[0].map(function (x) { return String(x).toLowerCase(); });
    var iDate = findCol_(h, ["submission date"], ["delivery", "pickup"]);
    var iRev = findCol_(h, ["revenue"]);
    var iFirst = findCol_(h, ["first name", "full name"]);
    var iOrder = findCol_(h, ["submission id", "order #", "order number", "order no"]);
    for (var r = 1; r < v.length; r++) {
      if (dayStr_(v[r][iDate], tz) !== today) continue;
      var rev = Number(v[r][iRev]); if (!isFinite(rev) || rev < 0) rev = 0;
      ord.count++; ord[cfg[1]] += rev;
      ord.list.push({ who: v[r][iFirst], num: String(v[r][iOrder] || "").replace(/^'/, ""), rev: cfg[2] + " " + rev });
    }
  });

  var subs = readSignups_().filter(function (s) { return dayStr_(s.ts, tz) === today; });
  var revs = readReviews_(true).filter(function (x) { return dayStr_(x.ts, tz) === today; });
  var msgs = readMessages_().filter(function (x) { return dayStr_(x.ts, tz) === today; });

  // low stock / sold out from the live products.js
  var low = [], sold = [];
  try {
    var txt = UrlFetchApp.fetch(PRODUCTS_URL, { muteHttpExceptions: true }).getContentText();
    var mm = txt.match(/SS_PRODUCTS\s*=\s*(\[[\s\S]*\]);/);
    if (mm) {
      JSON.parse(mm[1]).forEach(function (p) {
        var regs = p.regions || {};
        Object.keys(regs).forEach(function (rid) {
          var rg = regs[rid];
          if (rg.status === "sold-out") sold.push(p.name + " (" + rid + ")");
          else if (rg.status === "available" && Number(rg.inventory) > 0 && Number(rg.inventory) <= 10) low.push(p.name + " (" + rid + "): " + rg.inventory + " left");
        });
      });
    }
  } catch (e) {}

  MailApp.sendEmail({ to: to, subject: "🍪 Second Scoop — daily recap " + today,
    htmlBody: dailySummaryHtml_(today, ord, subs, revs, msgs, low, sold) });
}

function dailySummaryHtml_(day, ord, subs, revs, msgs, low, sold) {
  function sec(t, inner) { return '<h3 style="margin:22px 0 8px;font-size:16px;color:#33241a">' + t + '</h3>' + inner; }
  var ordInner = ord.count
    ? '<p style="margin:0;font-size:15px;color:#5a4636">' + ord.count + ' order(s) · <b>Rs ' + ord.pk + '</b> Pakistan' + (ord.to ? ' · <b>C$ ' + ord.to + '</b> Toronto' : '') + '</p>'
      + '<ul style="color:#5a4636;font-size:14px;padding-left:18px">' + ord.list.map(function (o) { return '<li>' + esc_(o.who) + ' — ' + esc_(o.num) + ' — ' + esc_(o.rev) + '</li>'; }).join('') + '</ul>'
    : '<p style="margin:0;color:#9a8871">No orders today.</p>';
  var subInner = subs.length
    ? '<ul style="color:#5a4636;font-size:14px;padding-left:18px">' + subs.map(function (s) { return '<li>' + esc_(s.name) + ' — ' + esc_(s.email) + '</li>'; }).join('') + '</ul>'
    : '<p style="margin:0;color:#9a8871">No new signups today.</p>';
  var lowInner = (low.length || sold.length)
    ? (sold.length ? '<p style="margin:0 0 4px;color:#b3261e"><b>Sold out:</b> ' + sold.map(esc_).join(', ') + '</p>' : '')
      + (low.length ? '<ul style="color:#8a5a00;font-size:14px;padding-left:18px">' + low.map(function (x) { return '<li>' + esc_(x) + '</li>'; }).join('') + '</ul>' : '')
    : '<p style="margin:0;color:#9a8871">Stock looks healthy.</p>';
  var rmInner = (revs.length || msgs.length)
    ? (revs.length ? '<p style="margin:0 0 4px;color:#5a4636"><b>' + revs.length + ' new review(s)</b></p>' : '')
      + (msgs.length ? '<ul style="color:#5a4636;font-size:14px;padding-left:18px">' + msgs.map(function (m) { return '<li>' + esc_(m.name) + ': ' + esc_(String(m.message).slice(0, 80)) + '</li>'; }).join('') + '</ul>' : '')
    : '<p style="margin:0;color:#9a8871">No new reviews or messages.</p>';
  return '<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#fffaf3;border:1px solid #ecdfcc;border-radius:16px;overflow:hidden">'
    + '<div style="background:#33241a;padding:18px;text-align:center"><span style="color:#f4ece0;font-size:20px;font-weight:700">Second Scoop<span style="color:#e0a15e">.</span> — Daily Recap</span></div>'
    + '<div style="padding:8px 26px 26px"><p style="color:#b06a2c;font-size:13px;letter-spacing:1px;text-transform:uppercase">' + day + '</p>'
    + sec("🧾 Orders &amp; revenue", ordInner)
    + sec("📨 New signups (" + subs.length + ")", subInner)
    + sec("📦 Low stock / sold out", lowInner)
    + sec("⭐ Reviews &amp; messages", rmInner)
    + '</div></div>';
}

/* =====================================================================
   ORDER CONFIRMATION EMAILS TO CUSTOMERS (via Brevo)
   • "Order received — please pay" the moment an order is placed.
   • "Payment confirmed" when you mark it Paid (backend OR sheet edit).
   Needs Brevo connected (setupEmail). For the sheet-edit path, run
   createOrderEmailTriggers() once and approve the prompt.
   ===================================================================== */
function isPaidStatus_(s) { s = String(s || "").toLowerCase(); return s.indexOf("paid") > -1 && s.indexOf("unpaid") < 0; }

// Find (by keywords) or create a column; returns its 1-based index.
function ensureCol_(sheet, headerName, keywords) {
  var c = findCol_(headerRow_(sheet), keywords);
  if (c > -1) return c + 1;
  var col = sheet.getLastColumn() + 1;
  sheet.getRange(1, col).setValue(headerName).setFontWeight("bold");
  return col;
}
// Live bank/payment details from the site's content.js (single source of truth).
function getPayment_() {
  try {
    var txt = UrlFetchApp.fetch(CONTENT_URL, { muteHttpExceptions: true }).getContentText();
    var m = txt.match(/SS_CONTENT\s*=\s*(\{[\s\S]*\});/);
    if (m) { var c = JSON.parse(m[1]); return c.payment || {}; }
  } catch (e) {}
  return {};
}
function money_(isTo, n) { return (isTo ? "C$ " : "Rs ") + (Number(n) || 0); }

function orderEmailShell_(firstName, eyebrow, heading, innerHtml) {
  return '<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#fffaf3;border:1px solid #ecdfcc;border-radius:18px;overflow:hidden">'
    + '<div style="background:#33241a;padding:20px;text-align:center"><span style="color:#f4ece0;font-size:21px;font-weight:700">Second Scoop<span style="color:#e0a15e">.</span></span></div>'
    + '<div style="padding:30px 30px 12px">'
    + '<div style="font-size:13px;color:#b06a2c;letter-spacing:2px;text-transform:uppercase;padding-bottom:6px">' + esc_(eyebrow) + '</div>'
    + '<div style="font-size:25px;line-height:1.2;font-weight:700;padding-bottom:14px;color:#33241a">Hi ' + esc_(String(firstName || "there").split(/\s+/)[0]) + ' — ' + esc_(heading) + '</div>'
    + innerHtml + '</div>'
    + '<div style="padding:22px 30px 26px;border-top:1px solid #f0e6d6;font-size:12px;color:#9a8871;line-height:1.6">Second Scoop 🍪 The first scoop is never enough.</div></div>';
}
function orderLines_(num, products, totalStr, dateStr, methodStr) {
  return '<table role="presentation" width="100%" style="font-size:15px;color:#5a4636;border-collapse:collapse">'
    + '<tr><td style="padding:4px 0;color:#9a8871">Order</td><td style="padding:4px 0;text-align:right;font-weight:700">' + esc_(num) + '</td></tr>'
    + '<tr><td style="padding:4px 0;color:#9a8871">Items</td><td style="padding:4px 0;text-align:right">' + esc_(products) + '</td></tr>'
    + (methodStr ? '<tr><td style="padding:4px 0;color:#9a8871">Method</td><td style="padding:4px 0;text-align:right">' + esc_(methodStr) + '</td></tr>' : '')
    + (dateStr ? '<tr><td style="padding:4px 0;color:#9a8871">Date</td><td style="padding:4px 0;text-align:right">' + esc_(dateStr) + '</td></tr>' : '')
    + '<tr><td style="padding:8px 0 0;color:#9a8871;border-top:1px solid #f0e6d6">Total</td><td style="padding:8px 0 0;text-align:right;font-weight:700;border-top:1px solid #f0e6d6">' + esc_(totalStr) + '</td></tr>'
    + '</table>';
}
function orderPlacedHtml_(firstName, num, products, totalStr, dateStr, methodStr, pay) {
  var bank = '';
  if (pay && (pay.bankName || pay.accountNumber || pay.iban)) {
    bank = '<div style="margin-top:20px;background:#f7efe2;border-radius:12px;padding:16px 18px;font-size:14px;color:#5a4636;line-height:1.7">'
      + '<b style="color:#33241a">' + esc_(pay.heading || "Payment — bank transfer in advance") + '</b><br>'
      + (pay.bankName ? 'Bank: <b>' + esc_(pay.bankName) + '</b><br>' : '')
      + (pay.accountTitle ? 'Account title: <b>' + esc_(pay.accountTitle) + '</b><br>' : '')
      + (pay.accountNumber ? 'Account #: <b>' + esc_(pay.accountNumber) + '</b><br>' : '')
      + (pay.iban ? 'IBAN: <b>' + esc_(pay.iban) + '</b>' : '')
      + '</div>';
    if (pay.shareText) bank += '<p style="margin:14px 0 0;font-size:13px;color:#8a6a48">📸 ' + esc_(pay.shareText) + '</p>';
  }
  var inner = '<p style="font-size:16px;line-height:1.6;color:#5a4636;margin:0 0 18px">Thanks for your order! We’ve received it and it’s reserved for you. To confirm it, please send your payment by bank transfer using the details below.</p>'
    + orderLines_(num, products, totalStr, dateStr, methodStr) + bank;
  return orderEmailShell_(firstName, "Order received", "we’ve got your order!", inner);
}
function orderPaidHtml_(firstName, num, products, totalStr, dateStr, methodStr) {
  var inner = '<p style="font-size:16px;line-height:1.6;color:#5a4636;margin:0 0 18px">Your payment is confirmed and your order is locked in. 🎉 We’ll have it ready for your chosen date — thank you for scooping with us!</p>'
    + orderLines_(num, products, totalStr, dateStr, methodStr);
  return orderEmailShell_(firstName, "Payment confirmed", "you’re all set!", inner);
}

// Fired from doPost right after an order is written.
function sendOrderPlacedEmail_(ss, sheetName, d) {
  try {
    if (!emailReady_()) return;
    var email = String(d.email || "").trim();
    if (!/\S+@\S+\.\S+/.test(email)) return;
    var isTo = (sheetName === TO_SHEET);
    var total = Number(d.grandTotal); if (!isFinite(total) || total <= 0) total = (Number(d.revenue) || 0) + (Number(d.deliveryFee) || 0);
    var num = d.submissionId || d.orderNumber || "";
    var html = orderPlacedHtml_(d.firstName, num, d.productsFormatted || "", money_(isTo, total), d.preferredDate || "", d.preferredMethod || "", getPayment_());
    if (brevoSend_(email, d.firstName || email, "We’ve got your order " + num + " 🍪 — payment details inside", html)) {
      var sheet = ss.getSheetByName(sheetName);
      var col = ensureCol_(sheet, "Emails Sent", ["emails sent", "email sent", "confirmation sent"]);
      sheet.getRange(sheet.getLastRow(), col).setValue("placed");
    }
  } catch (e) {}
}

// Read one order row into a tidy object.
function rowOrder_(sheet, rowIdx1) {
  var v = sheet.getDataRange().getValues(); var h = v[0].map(function (x) { return String(x).toLowerCase(); });
  var row = v[rowIdx1 - 1];
  function c(keys, exc) { var i = findCol_(h, keys, exc); return i > -1 ? row[i] : ""; }
  var isTo = (sheet.getName() === TO_SHEET);
  var grand = Number(c(["grand total"], ["sub", "product"]));
  var rev = Number(c(["revenue"]));
  var total = (isFinite(grand) && grand > 0) ? grand : ((isFinite(rev) ? rev : 0) + (Number(c(["delivery fee"])) || 0));
  var pd = c(["pickup", "delivery date", "preferred date"], ["status"]);
  return {
    email: String(c(["email"]) || "").trim(), first: c(["first name", "full name"]),
    num: String(c(["submission id", "order #", "order number", "order no"]) || "").replace(/^'/, ""),
    products: c(["product"]), method: c(["preferred method", "method"]),
    date: (pd instanceof Date) ? Utilities.formatDate(pd, Session.getScriptTimeZone() || "Asia/Karachi", "d MMM yyyy") : String(pd || ""),
    total: total, isTo: isTo
  };
}
// Fired when payment becomes Paid (backend or sheet edit). Dedupes.
function sendPaidEmail_(sheet, rowIdx1) {
  try {
    if (!emailReady_()) return;
    var o = rowOrder_(sheet, rowIdx1);
    if (!/\S+@\S+\.\S+/.test(o.email)) return;
    var col = ensureCol_(sheet, "Emails Sent", ["emails sent", "email sent", "confirmation sent"]);
    var flags = String(sheet.getRange(rowIdx1, col).getValue() || "");
    if (flags.indexOf("paid") > -1) return;   // already confirmed
    var html = orderPaidHtml_(o.first, o.num, o.products, money_(o.isTo, o.total), o.date, o.method);
    if (brevoSend_(o.email, o.first || o.email, "Payment confirmed ✅ — order " + o.num, html))
      sheet.getRange(rowIdx1, col).setValue((flags ? flags + "," : "") + "paid");
  } catch (e) {}
}

// Installable onEdit: emails the customer when YOU type "Paid" in the sheet.
function createOrderEmailTriggers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === "onPaymentEdit") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("onPaymentEdit").forSpreadsheet(ss).onEdit().create();
  Logger.log("Payment-confirmation trigger installed.");
}
function onPaymentEdit(e) {
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet(), name = sheet.getName();
    if (name !== PK_SHEET && name !== TO_SHEET) return;
    var iPay = findCol_(headerRow_(sheet), ["payment status"]);
    if (iPay < 0 || e.range.getColumn() !== iPay + 1) return;
    var val = (e.value != null) ? e.value : e.range.getValue();
    if (isPaidStatus_(val)) sendPaidEmail_(sheet, e.range.getRow());
  } catch (err) {}
}

/* ----------------------------- WRITE (incoming) -------------------- */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var d = JSON.parse(e.postData.contents);
    // Light anti-spam: ignore payloads that don't look like a real submission.
    if (!validIncoming_(d)) return out_(null, { ok: false, error: "ignored" });
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (d.type === "review")  { writeReview_(ss, d);  return out_(null, { ok: true }); }
    if (d.type === "signup")  { writeSignup_(ss, d);  return out_(null, { ok: true }); }
    if (d.type === "message") { writeMessage_(ss, d); return out_(null, { ok: true }); }
    var pk = (String(d.region).toLowerCase().indexOf("pakistan") > -1 ||
              String(d.region).toLowerCase().indexOf("lahore") > -1 ||
              String(d.regionId).toLowerCase() === "pakistan");
    var sheetName = pk ? PK_SHEET : TO_SHEET;
    writeOrder_(ss, sheetName, d, !pk);
    sendOrderPlacedEmail_(ss, sheetName, d);
    return out_(null, { ok: true, orderNumber: d.submissionId || d.orderNumber });
  } catch (err) {
    return out_(null, { ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Reject obviously-junk POSTs (cheap spam filter; not a full security wall).
function validIncoming_(d) {
  if (!d || typeof d !== "object") return false;
  if (d.type === "review")  return !!(String(d.review || "").trim() || String(d.name || "").trim());
  if (d.type === "signup")  return /\S+@\S+\.\S+/.test(String(d.email || ""));
  if (d.type === "message") return !!(String(d.message || "").trim() && /\S+@\S+\.\S+/.test(String(d.email || "")));
  // otherwise it's an order — needs a region and either a name or products
  var hasRegion = !!(String(d.region || "") || String(d.regionId || ""));
  return hasRegion && !!(String(d.firstName || d.customerName || "").trim() || String(d.productsFormatted || d.products || "").trim());
}

/* ---- header tools: find the column for a field by its header text ---- */
function headerRow_(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (x) { return String(x).toLowerCase(); });
}
// First column whose header contains ANY keyword (and none of the excludes).
function findCol_(headers, keywords, excludes, skip) {
  for (var i = 0; i < headers.length; i++) {
    if (skip && skip.indexOf(i) > -1) continue;
    var h = headers[i], match = false;
    for (var k = 0; k < keywords.length; k++) { if (h.indexOf(keywords[k]) > -1) { match = true; break; } }
    if (!match) continue;
    if (excludes) { var bad = false; for (var x = 0; x < excludes.length; x++) if (h.indexOf(excludes[x]) > -1) bad = true; if (bad) continue; }
    return i;
  }
  return -1;
}

var DEFAULT_PK_HEADERS = ["Submission Date", "First Name", "Last Name", "Email", "Phone", "Instagram",
  "Address", "Address Line 2", "Products", "Preferred Method", "Submission ID",
  "Payment Status", "Pickup/ Delivery date", "Delivery Status", "Revenue"];
var DEFAULT_TO_HEADERS = DEFAULT_PK_HEADERS.concat(["Delivery Fee", "Grand Total"]);

function writeOrder_(ss, sheetName, d, isToronto) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) { sheet = ss.insertSheet(sheetName); }
  if (sheet.getLastRow() < 1) {
    var hd = isToronto ? DEFAULT_TO_HEADERS : DEFAULT_PK_HEADERS;
    sheet.appendRow(hd); sheet.getRange(1, 1, 1, hd.length).setFontWeight("bold"); sheet.setFrozenRows(1);
  }
  var headers = headerRow_(sheet);
  var lastCol = headers.length;
  var row = []; for (var i = 0; i < lastCol; i++) row.push("");
  function put(value, keywords, excludes, skip) {
    var c = findCol_(headers, keywords, excludes, skip);
    if (c > -1) row[c] = value;
    return c;
  }
  var revVal = Number(d.revenue); if (!isFinite(revVal) || revVal < 0) revVal = 0;
  put(d.submissionDate || new Date(), ["submission date"], ["delivery", "pickup"]);
  put(d.firstName || "", ["first name", "full name"]);
  put(d.lastName || "", ["last name"]);
  put(d.email || "", ["email"]);
  put("'" + (d.phone || ""), ["phone"]);
  put(d.instagram || "", ["instagram"]);
  var a2 = put(d.addressLine2 || "", ["address line 2", "address 2"]);
  put(d.addressLine1 || "", ["address"], null, a2 > -1 ? [a2] : null);
  put(d.productsFormatted || "", ["product"]);
  put(d.preferredMethod || "", ["preferred method", "method"]);
  put("'" + (d.submissionId || ""), ["submission id", "order #", "order number", "order no"]);
  put(d.paymentStatus || "PENDING", ["payment status"]);
  put(d.preferredDate || "", ["pickup", "delivery date", "preferred date"], ["status"]);
  put(d.orderStatus || "New", ["delivery status", "order status"]);
  put(revVal, ["revenue"]);
  if (isToronto) {
    var fee = Number(d.deliveryFee) || 0, grand = Number(d.grandTotal); if (!isFinite(grand) || grand < 0) grand = revVal + fee;
    put(fee, ["delivery fee"]);
    put(grand, ["grand total"], ["sub", "product"]);
  }
  sheet.appendRow(row);
}

/* --------------------------------- REVIEWS ------------------------- */
var REV_HEADERS = ["Timestamp", "Region", "Name", "Rating", "Product", "Review", "Status", "ID"];
function reviewSheet_(ss) {
  var sheet = ss.getSheetByName(REV_SHEET);
  if (!sheet) { sheet = ss.insertSheet(REV_SHEET); sheet.appendRow(REV_HEADERS); sheet.getRange(1, 1, 1, REV_HEADERS.length).setFontWeight("bold"); sheet.setFrozenRows(1); }
  return sheet;
}
function writeReview_(ss, d) {
  var sheet = reviewSheet_(ss);
  var id = "R" + Date.now() + Math.floor(Math.random() * 1000);
  var rating = Math.max(1, Math.min(5, Number(d.rating) || 5));
  sheet.appendRow([new Date(), d.region || "", String(d.name || "Anonymous").slice(0, 60),
    rating, String(d.product || "").slice(0, 80), String(d.review || "").slice(0, 1000), "visible", id]);
}
function readReviews_(includeHidden) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REV_SHEET);
  if (!sheet) return [];
  var v = sheet.getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) {
    var r = v[i], status = String(r[6] || "visible");
    if (!r[5] && !r[2]) continue;
    if (!includeHidden && status !== "visible") continue;
    out.push({ ts: (r[0] instanceof Date) ? r[0].toISOString() : String(r[0] || ""), region: r[1] || "", name: r[2] || "Anonymous", rating: Number(r[3]) || 5, product: r[4] || "", review: r[5] || "", status: status, id: String(r[7] || "") });
  }
  return out;
}
function delReview_(id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REV_SHEET);
  if (!sheet) return false;
  var v = sheet.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) if (String(v[i][7] || "") === String(id)) { sheet.getRange(i + 1, 7).setValue("hidden"); return true; }
  return false;
}

/* ------------------------------ MAILING LIST ----------------------- */
var LIST_HEADERS = ["Timestamp", "Name", "Email", "Phone", "Region", "Source", "Subscribed"];
function listSheet_(ss) {
  var sheet = ss.getSheetByName(LIST_SHEET);
  if (!sheet) { sheet = ss.insertSheet(LIST_SHEET); sheet.appendRow(LIST_HEADERS); sheet.getRange(1, 1, 1, LIST_HEADERS.length).setFontWeight("bold"); sheet.setFrozenRows(1); }
  return sheet;
}
// Column (1-based) of the "Subscribed" header — added automatically if missing,
// so older sheets keep working. Blank/"yes" = subscribed; "no" = unsubscribed.
function listSubCol_(sheet) {
  var headers = headerRow_(sheet);
  var c = findCol_(headers, ["subscribed", "status"]);
  if (c > -1) return c + 1;
  var col = sheet.getLastColumn() + 1;
  sheet.getRange(1, col).setValue("Subscribed").setFontWeight("bold");
  return col;
}
function writeSignup_(ss, d) {
  var sheet = listSheet_(ss);
  var email = String(d.email || "").trim();
  if (email) { var v = sheet.getDataRange().getValues(); for (var i = 1; i < v.length; i++) if (String(v[i][2] || "").toLowerCase() === email.toLowerCase()) return; }
  var subCol = listSubCol_(sheet);
  var row = [new Date(), String(d.name || "").slice(0, 80), email, "'" + String(d.phone || ""), d.region || "", d.source || ""];
  while (row.length < subCol) row.push("");
  row[subCol - 1] = "yes";
  sheet.appendRow(row);
}
function readSignups_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LIST_SHEET);
  if (!sheet) return [];
  var v = sheet.getDataRange().getValues(); if (v.length < 1) return [];
  var headers = v[0].map(function (x) { return String(x).toLowerCase(); });
  var iSub = findCol_(headers, ["subscribed", "status"]);
  var out = [];
  for (var i = 1; i < v.length; i++) {
    var r = v[i]; if (!r[2] && !r[1]) continue;
    var subRaw = (iSub > -1) ? String(r[iSub] || "").toLowerCase() : "";
    var subscribed = !(subRaw === "no" || subRaw === "unsubscribed" || subRaw === "false");
    out.push({ ts: (r[0] instanceof Date) ? r[0].toISOString() : String(r[0] || ""), name: r[1] || "", email: r[2] || "", phone: String(r[3] || "").replace(/^'/, ""), region: r[4] || "", source: r[5] || "", subscribed: subscribed });
  }
  return out;
}
// Flip a subscriber to unsubscribed (by email). Returns true if found.
function unsubscribe_(email) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(LIST_SHEET); if (!sheet) return false;
  var subCol = listSubCol_(sheet);
  var v = sheet.getDataRange().getValues();
  var target = String(email || "").toLowerCase();
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][2] || "").toLowerCase() === target) { sheet.getRange(i + 1, subCol).setValue("no"); return true; }
  }
  return false;
}

/* --------------------------- EMAIL CAMPAIGNS ----------------------- */
var CAMPAIGN_HEADERS = ["Sent at", "Subject", "Audience", "Recipients", "Delivered", "Failed", "Sent by"];
function campaignSheet_(ss) {
  var sheet = ss.getSheetByName(CAMPAIGN_SHEET);
  if (!sheet) { sheet = ss.insertSheet(CAMPAIGN_SHEET); sheet.appendRow(CAMPAIGN_HEADERS); sheet.getRange(1, 1, 1, CAMPAIGN_HEADERS.length).setFontWeight("bold"); sheet.setFrozenRows(1); }
  return sheet;
}
function readCampaigns_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CAMPAIGN_SHEET);
  if (!sheet) return [];
  var v = sheet.getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) { var r = v[i]; if (!r[1]) continue; out.push({ ts: (r[0] instanceof Date) ? r[0].toISOString() : String(r[0] || ""), subject: r[1] || "", audience: r[2] || "", recipients: Number(r[3]) || 0, delivered: Number(r[4]) || 0, failed: Number(r[5]) || 0 }); }
  return out.reverse();
}

// Which region(s) an audience keyword includes.
function audienceMatch_(audience, region) {
  var a = String(audience || "all").toLowerCase(), rg = String(region || "").toLowerCase();
  if (a === "all" || !a) return true;
  if (a === "pakistan") return rg.indexOf("pakistan") > -1 || rg.indexOf("lahore") > -1;
  if (a === "toronto")  return rg.indexOf("toronto") > -1 || rg.indexOf("canada") > -1;
  return true;
}

// Branded HTML email. p = {headline, body, ctaText, ctaUrl, imageUrl, preheader}
function campaignHtml_(p, toName, unsubUrl) {
  var esc = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
  var firstName = String(toName || "").split(/\s+/)[0] || "there";
  var bodyHtml = esc(p.body).replace(/\n/g, "<br>");
  var img = p.imageUrl ? '<tr><td style="padding:0 0 22px"><img src="' + esc(p.imageUrl) + '" alt="" width="536" style="width:100%;max-width:536px;border-radius:14px;display:block"></td></tr>' : "";
  var cta = (p.ctaText && p.ctaUrl) ? '<tr><td style="padding:6px 0 4px"><a href="' + esc(p.ctaUrl) + '" style="background:#b06a2c;color:#fff;text-decoration:none;font-weight:700;padding:14px 30px;border-radius:999px;display:inline-block;font-size:15px">' + esc(p.ctaText) + '</a></td></tr>' : "";
  var pre = p.preheader ? '<div style="display:none;max-height:0;overflow:hidden;opacity:0">' + esc(p.preheader) + '</div>' : "";
  return '<!doctype html><html><body style="margin:0;background:#f4ece0;font-family:Georgia,\'Times New Roman\',serif;color:#33241a">'
    + pre
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4ece0;padding:26px 12px"><tr><td align="center">'
    + '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fffaf3;border-radius:20px;overflow:hidden;border:1px solid #ecdfcc">'
    + '<tr><td style="background:#33241a;padding:22px 32px;text-align:center"><span style="color:#f4ece0;font-size:22px;font-weight:700;letter-spacing:.5px">Second Scoop<span style="color:#e0a15e">.</span></span></td></tr>'
    + '<tr><td style="padding:34px 32px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
    + '<tr><td style="font-size:13px;color:#b06a2c;letter-spacing:2px;text-transform:uppercase;padding-bottom:6px">Hey ' + esc(firstName) + ' 👋</td></tr>'
    + '<tr><td style="font-size:27px;line-height:1.2;font-weight:700;padding-bottom:16px">' + esc(p.headline) + '</td></tr>'
    + img
    + '<tr><td style="font-size:16px;line-height:1.65;color:#5a4636;padding-bottom:24px">' + bodyHtml + '</td></tr>'
    + cta
    + '</table></td></tr>'
    + '<tr><td style="padding:26px 32px 30px;border-top:1px solid #f0e6d6;font-size:12px;color:#9a8871;line-height:1.6">'
    + 'You’re getting this because you joined the Second Scoop list. The first scoop is never enough 🍪<br>'
    + '<a href="' + esc(unsubUrl) + '" style="color:#9a8871;text-decoration:underline">Unsubscribe</a>'
    + '</td></tr></table></td></tr></table></body></html>';
}

// Main send. p carries the campaign fields. Returns a summary object.
function sendCampaign_(p) {
  if (!emailReady_()) return { ok: false, error: "Email not connected. Run setupEmail() in Apps Script with your Brevo key." };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var subject = String(p.subject || "News from Second Scoop").slice(0, 200);
  var base = webappUrl_();

  // TEST send → just the one address, no logging, no unsubscribe filtering.
  if (p.test) {
    var testUnsub = base + "?action=unsubscribe&e=" + encodeURIComponent(p.test) + "&t=" + unsubToken_(p.test);
    var okT = brevoSend_(p.test, "Preview", "[TEST] " + subject, campaignHtml_(p, "there", testUnsub));
    return { ok: okT, sent: okT ? 1 : 0, failed: okT ? 0 : 1, test: true };
  }

  var all = readSignups_();
  var recips = all.filter(function (s) { return s.subscribed && /\S+@\S+\.\S+/.test(s.email) && audienceMatch_(p.audience, s.region); });
  if (!recips.length) return { ok: true, sent: 0, failed: 0, skipped: 0, note: "No subscribers match that audience." };

  var sent = 0, failed = 0;
  for (var i = 0; i < recips.length; i++) {
    var s = recips[i];
    var unsub = base + "?action=unsubscribe&e=" + encodeURIComponent(s.email) + "&t=" + unsubToken_(s.email);
    try { if (brevoSend_(s.email, s.name, subject, campaignHtml_(p, s.name, unsub))) sent++; else failed++; }
    catch (err) { failed++; }
  }
  campaignSheet_(ss).appendRow([new Date(), subject, p.audience || "all", recips.length, sent, failed, "backend"]);
  return { ok: true, sent: sent, failed: failed, recipients: recips.length };
}

/* ----------------------------- CONTACT MESSAGES -------------------- */
var MSG_HEADERS = ["Timestamp", "Name", "Email", "Region", "Message"];
function writeMessage_(ss, d) {
  var sheet = ss.getSheetByName(MSG_SHEET);
  if (!sheet) { sheet = ss.insertSheet(MSG_SHEET); sheet.appendRow(MSG_HEADERS); sheet.getRange(1, 1, 1, MSG_HEADERS.length).setFontWeight("bold"); sheet.setFrozenRows(1); }
  sheet.appendRow([new Date(), String(d.name || "").slice(0, 80), String(d.email || ""), d.region || "", String(d.message || "").slice(0, 2000)]);
}
function readMessages_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MSG_SHEET);
  if (!sheet) return [];
  var v = sheet.getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) { var r = v[i]; if (!r[4] && !r[1]) continue; out.push({ ts: (r[0] instanceof Date) ? r[0].toISOString() : String(r[0] || ""), name: r[1] || "", email: r[2] || "", region: r[3] || "", message: r[4] || "" }); }
  return out;
}

/* ----------------------------- READ (dashboard) ------------------- */
function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  if (p.action === "orders")    { if (p.key !== READ_KEY) return out_(p.callback, { ok: false, error: "unauthorized" }); return out_(p.callback, { ok: true, orders: readAllOrders_() }); }
  if (p.action === "setstatus") { if (p.key !== READ_KEY) return out_(p.callback, { ok: false, error: "unauthorized" }); var done = setStatus_(p.order, p.status, p.field || "payment"); return out_(p.callback, { ok: done, error: done ? "" : "order not found" }); }
  if (p.action === "reviews")   { return out_(p.callback, { ok: true, reviews: readReviews_(p.key === READ_KEY) }); }
  if (p.action === "delreview") { if (p.key !== READ_KEY) return out_(p.callback, { ok: false, error: "unauthorized" }); return out_(p.callback, { ok: delReview_(p.id) }); }
  if (p.action === "signups")   { if (p.key !== READ_KEY) return out_(p.callback, { ok: false, error: "unauthorized" }); return out_(p.callback, { ok: true, signups: readSignups_() }); }
  if (p.action === "messages")  { if (p.key !== READ_KEY) return out_(p.callback, { ok: false, error: "unauthorized" }); return out_(p.callback, { ok: true, messages: readMessages_() }); }
  if (p.action === "campaigns") { if (p.key !== READ_KEY) return out_(p.callback, { ok: false, error: "unauthorized" }); return out_(p.callback, { ok: true, campaigns: readCampaigns_(), emailReady: emailReady_() }); }
  if (p.action === "sendcampaign") {
    if (p.key !== READ_KEY) return out_(p.callback, { ok: false, error: "unauthorized" });
    var res = sendCampaign_({
      subject: p.subject, audience: p.audience, headline: p.headline, body: p.body,
      ctaText: p.ctaText, ctaUrl: p.ctaUrl, imageUrl: p.imageUrl, preheader: p.preheader, test: p.test
    });
    return out_(p.callback, res);
  }
  if (p.action === "unsubscribe") {
    var okUn = (p.t === unsubToken_(p.e)) ? unsubscribe_(p.e) : false;
    var msg = okUn ? "You’re unsubscribed. You won’t get any more Second Scoop emails." :
      "We couldn’t process that unsubscribe link. Email us and we’ll remove you right away.";
    return HtmlService.createHtmlOutput(
      '<div style="font-family:Georgia,serif;max-width:460px;margin:60px auto;text-align:center;color:#33241a">' +
      '<h1 style="font-size:24px">Second Scoop<span style="color:#e0a15e">.</span></h1>' +
      '<p style="font-size:16px;line-height:1.6;color:#5a4636">' + msg + '</p></div>'
    ).setTitle("Unsubscribe — Second Scoop");
  }
  return out_(p.callback, { ok: true, service: "Second Scoop webhook" });
}

function readAllOrders_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), orders = [];
  collect_(ss.getSheetByName(PK_SHEET), "pakistan", "PKR", orders);
  collect_(ss.getSheetByName(TO_SHEET), "toronto", "CAD", orders);
  return orders;
}
function collect_(sheet, region, currency, orders) {
  if (!sheet) return;
  var v = sheet.getDataRange().getValues(); if (v.length < 2) return;
  var headers = v[0].map(function (x) { return String(x).toLowerCase(); });
  var iDate = findCol_(headers, ["submission date"], ["delivery", "pickup"]);
  var iFirst = findCol_(headers, ["first name", "full name"]);
  var iLast = findCol_(headers, ["last name"]);
  var iEmail = findCol_(headers, ["email"]);
  var iPhone = findCol_(headers, ["phone"]);
  var iInsta = findCol_(headers, ["instagram"]);
  var iProd = findCol_(headers, ["product"]);
  var iMethod = findCol_(headers, ["preferred method", "method"]);
  var iOrder = findCol_(headers, ["submission id", "order #", "order number", "order no"]);
  var iPay = findCol_(headers, ["payment status"]);
  var iPref = findCol_(headers, ["pickup", "delivery date", "preferred date"], ["status"]);
  var iStatus = findCol_(headers, ["delivery status", "order status"]);
  var iRev = findCol_(headers, ["revenue"]);
  function cell(row, i) { return i > -1 ? row[i] : ""; }
  for (var r = 1; r < v.length; r++) {
    var row = v[r];
    var first = cell(row, iFirst), prod = cell(row, iProd), sub = cell(row, iDate);
    if (!first && !prod) continue;
    if (String(sub).toLowerCase().indexOf("total revenue") > -1) continue;
    var revRaw = cell(row, iRev);
    var rev = (revRaw instanceof Date) ? 0 : Number(revRaw);          // a date in Revenue = wrong cell → 0
    if (!isFinite(rev) || rev < 0 || rev > 100000000) rev = 0;
    orders.push({
      submissionDate: (sub instanceof Date) ? sub.toISOString() : String(sub || ""),
      region: region, currency: currency,
      firstName: first || "", lastName: cell(row, iLast) || "",
      email: cell(row, iEmail) || "", phone: String(cell(row, iPhone) || "").replace(/^'/, ""),
      instagram: cell(row, iInsta) || "",
      products: prod, preferredMethod: cell(row, iMethod) || "",
      orderNumber: String(cell(row, iOrder) || "").replace(/^'/, ""),
      paymentStatus: cell(row, iPay) || "",
      preferredDate: iPref > -1 ? String(row[iPref]) : "",
      revenue: rev,
      orderStatus: iStatus > -1 ? String(row[iStatus] || "") : ""
    });
  }
}

/* ----- inline status edits from the dashboard (header-driven) ------ */
function setStatus_(orderNumber, status, field) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var names = [PK_SHEET, TO_SHEET];
  for (var n = 0; n < names.length; n++) {
    var sheet = ss.getSheetByName(names[n]); if (!sheet) continue;
    var rowIdx = updateStatusIn_(sheet, orderNumber, status, field);
    if (rowIdx) { if (field !== "order" && isPaidStatus_(status)) sendPaidEmail_(sheet, rowIdx); return true; }
  }
  return false;
}
// Returns the 1-based row it updated, or 0 if not found.
function updateStatusIn_(sheet, orderNumber, status, field) {
  if (!sheet) return 0;
  var v = sheet.getDataRange().getValues(), headers = v[0].map(function (x) { return String(x).toLowerCase(); });
  var iOrder = findCol_(headers, ["submission id", "order #", "order number", "order no"]);
  var iPay = findCol_(headers, ["payment status"]);
  var iStatus = findCol_(headers, ["delivery status", "order status"]);
  var col = (field === "order") ? iStatus : iPay;
  if (col < 0 || iOrder < 0) return 0;
  for (var i = 1; i < v.length; i++) {
    var on = String(v[i][iOrder] || "").replace(/^'/, "");
    if (on && on === String(orderNumber)) { sheet.getRange(i + 1, col + 1).setValue(status); return i + 1; }
  }
  return 0;
}

/* JSON / JSONP output */
function out_(callback, obj) {
  var json = JSON.stringify(obj);
  if (callback) return ContentService.createTextOutput(callback + "(" + json + ")").setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
