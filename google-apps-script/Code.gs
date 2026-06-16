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

// 🔒 Keep this the SAME as Backend → Brand & Settings → "Dashboard read key".
var READ_KEY = "scoop-read-2026";

/* ----------------------------- WRITE (incoming) -------------------- */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var d = JSON.parse(e.postData.contents);
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
var LIST_HEADERS = ["Timestamp", "Name", "Email", "Phone", "Region", "Source"];
function writeSignup_(ss, d) {
  var sheet = ss.getSheetByName(LIST_SHEET);
  if (!sheet) { sheet = ss.insertSheet(LIST_SHEET); sheet.appendRow(LIST_HEADERS); sheet.getRange(1, 1, 1, LIST_HEADERS.length).setFontWeight("bold"); sheet.setFrozenRows(1); }
  var email = String(d.email || "").trim();
  if (email) { var v = sheet.getDataRange().getValues(); for (var i = 1; i < v.length; i++) if (String(v[i][2] || "").toLowerCase() === email.toLowerCase()) return; }
  sheet.appendRow([new Date(), String(d.name || "").slice(0, 80), email, "'" + String(d.phone || ""), d.region || "", d.source || ""]);
}
function readSignups_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LIST_SHEET);
  if (!sheet) return [];
  var v = sheet.getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) { var r = v[i]; if (!r[2] && !r[1]) continue; out.push({ ts: (r[0] instanceof Date) ? r[0].toISOString() : String(r[0] || ""), name: r[1] || "", email: r[2] || "", phone: String(r[3] || "").replace(/^'/, ""), region: r[4] || "", source: r[5] || "" }); }
  return out;
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
