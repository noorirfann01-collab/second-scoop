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
  props.setProperty("SENDER_EMAIL", "hello@second-scoop.com");   // must be verified in Brevo
  props.setProperty("SENDER_NAME",  "Second Scoop");
  Logger.log("Saved. Sender + key stored in Script Properties.");
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
    writeOrder_(ss, pk ? PK_SHEET : TO_SHEET, d, !pk);
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
  return updateStatusIn_(ss.getSheetByName(PK_SHEET), orderNumber, status, field) ||
         updateStatusIn_(ss.getSheetByName(TO_SHEET), orderNumber, status, field);
}
function updateStatusIn_(sheet, orderNumber, status, field) {
  if (!sheet) return false;
  var v = sheet.getDataRange().getValues(), headers = v[0].map(function (x) { return String(x).toLowerCase(); });
  var iOrder = findCol_(headers, ["submission id", "order #", "order number", "order no"]);
  var iPay = findCol_(headers, ["payment status"]);
  var iStatus = findCol_(headers, ["delivery status", "order status"]);
  var col = (field === "order") ? iStatus : iPay;
  if (col < 0 || iOrder < 0) return false;
  for (var i = 1; i < v.length; i++) {
    var on = String(v[i][iOrder] || "").replace(/^'/, "");
    if (on && on === String(orderNumber)) { sheet.getRange(i + 1, col + 1).setValue(status); return true; }
  }
  return false;
}

/* JSON / JSONP output */
function out_(callback, obj) {
  var json = JSON.stringify(obj);
  if (callback) return ContentService.createTextOutput(callback + "(" + json + ")").setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
