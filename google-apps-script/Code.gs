/* =====================================================================
   SECOND SCOOP — GOOGLE APPS SCRIPT (orders in + dashboard reads back)
   ---------------------------------------------------------------------
   • Customers' orders are written into your "Monthly orders" tab
     (Pakistan) or a "Toronto Orders" tab (Toronto).
   • Your Backend dashboard can READ all orders back to show everyone's
     orders + revenue. Reading requires the secret READ_KEY below, so
     random visitors can't pull your customer data.

   AFTER EDITING: Deploy → Manage deployments → ✏️ Edit → Version: New
   version → Deploy. (Keeps the same URL.)
   ===================================================================== */

var PK_SHEET = "Monthly orders";
var TO_SHEET = "Toronto Orders";

// 🔒 CHANGE THIS to your own secret. Put the SAME value in your website
//    Backend → Settings → "Dashboard read key".
var READ_KEY = "scoop-read-2026";

/* ----------------------------- WRITE (orders coming in) ------------- */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var d = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (d.type === "review") { writeReview_(ss, d); return out_(null, { ok: true }); }
    if (d.type === "signup") { writeSignup_(ss, d); return out_(null, { ok: true }); }
    if (String(d.region).toLowerCase().indexOf("pakistan") > -1 || String(d.regionId).toLowerCase() === "pakistan") {
      writePakistan_(ss, d);
    } else {
      writeToronto_(ss, d);
    }
    return out_(null, { ok: true, orderNumber: d.submissionId || d.orderNumber });
  } catch (err) {
    return out_(null, { ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* --------------------------------- REVIEWS ------------------------- */
var REV_SHEET = "Reviews";
var REV_HEADERS = ["Timestamp", "Region", "Name", "Rating", "Product", "Review", "Status", "ID"];

function reviewSheet_(ss) {
  var sheet = ss.getSheetByName(REV_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(REV_SHEET);
    sheet.appendRow(REV_HEADERS);
    sheet.getRange(1, 1, 1, REV_HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(REV_SHEET);
  if (!sheet) return [];
  var v = sheet.getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) {
    var r = v[i]; var status = String(r[6] || "visible");
    if (!r[5] && !r[2]) continue;
    if (!includeHidden && status !== "visible") continue;
    out.push({
      ts: (r[0] instanceof Date) ? r[0].toISOString() : String(r[0] || ""),
      region: r[1] || "", name: r[2] || "Anonymous", rating: Number(r[3]) || 5,
      product: r[4] || "", review: r[5] || "", status: status, id: String(r[7] || "")
    });
  }
  return out;
}
function delReview_(id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(REV_SHEET);
  if (!sheet) return false;
  var v = sheet.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][7] || "") === String(id)) { sheet.getRange(i + 1, 7).setValue("hidden"); return true; }
  }
  return false;
}

/* ------------------------------ MAILING LIST ----------------------- */
var LIST_SHEET = "Mailing List";
var LIST_HEADERS = ["Timestamp", "Name", "Email", "Phone", "Region", "Source"];

function listSheet_(ss) {
  var sheet = ss.getSheetByName(LIST_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(LIST_SHEET);
    sheet.appendRow(LIST_HEADERS);
    sheet.getRange(1, 1, 1, LIST_HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}
function writeSignup_(ss, d) {
  var sheet = listSheet_(ss);
  var email = String(d.email || "").trim();
  if (email) {  // skip duplicates so the list stays clean
    var v = sheet.getDataRange().getValues();
    for (var i = 1; i < v.length; i++) {
      if (String(v[i][2] || "").toLowerCase() === email.toLowerCase()) return;
    }
  }
  sheet.appendRow([new Date(), String(d.name || "").slice(0, 80), email,
    "'" + String(d.phone || ""), d.region || "", d.source || ""]);
}
function readSignups_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(LIST_SHEET);
  if (!sheet) return [];
  var v = sheet.getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) {
    var r = v[i]; if (!r[2] && !r[1]) continue;
    out.push({
      ts: (r[0] instanceof Date) ? r[0].toISOString() : String(r[0] || ""),
      name: r[1] || "", email: r[2] || "", phone: String(r[3] || "").replace(/^'/, ""),
      region: r[4] || "", source: r[5] || ""
    });
  }
  return out;
}

function writePakistan_(ss, d) {
  var sheet = ss.getSheetByName(PK_SHEET);
  if (!sheet) sheet = ss.insertSheet(PK_SHEET);
  sheet.appendRow([
    d.submissionDate || new Date(), d.firstName || "", d.lastName || "",
    d.email || "", "'" + (d.phone || ""), d.instagram || "",
    d.addressLine1 || "", d.addressLine2 || "", d.productsFormatted || "",
    d.preferredMethod || "", "'" + (d.submissionId || ""),
    d.paymentStatus || "PENDING", d.preferredDate || "", Number(d.revenue) || 0
  ]);
  sheet.getRange(sheet.getLastRow(), osCol_(sheet)).setValue("New");
}

var TO_HEADERS = ["Submission Date", "First Name", "Last Name", "Email", "Phone",
  "Instagram", "Address", "Address Line 2", "Products", "Preferred Method",
  "Order #", "Payment Status", "Preferred Date", "Revenue (CAD)", "Delivery Fee", "Grand Total"];

function writeToronto_(ss, d) {
  var sheet = ss.getSheetByName(TO_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(TO_SHEET);
    sheet.appendRow(TO_HEADERS);
    sheet.getRange(1, 1, 1, TO_HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([
    d.submissionDate || new Date(), d.firstName || "", d.lastName || "",
    d.email || "", "'" + (d.phone || ""), d.instagram || "",
    d.addressLine1 || "", d.addressLine2 || "", d.productsFormatted || "",
    d.preferredMethod || "", "'" + (d.submissionId || ""),
    d.paymentStatus || "PENDING", d.preferredDate || "",
    Number(d.revenue) || 0, Number(d.deliveryFee) || 0, Number(d.grandTotal) || 0
  ]);
  sheet.getRange(sheet.getLastRow(), osCol_(sheet)).setValue("New");
}

/* ----------------------------- READ (dashboard pulls orders) ------- */
function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  if (p.action === "orders") {
    if (p.key !== READ_KEY) return out_(p.callback, { ok: false, error: "unauthorized" });
    return out_(p.callback, { ok: true, orders: readAllOrders_() });
  }
  if (p.action === "setstatus") {
    if (p.key !== READ_KEY) return out_(p.callback, { ok: false, error: "unauthorized" });
    var done = setStatus_(p.order, p.status, p.field || "payment");
    return out_(p.callback, { ok: done, error: done ? "" : "order not found" });
  }
  if (p.action === "reviews") {
    // public read of visible reviews; admin (with key) also gets hidden ones
    return out_(p.callback, { ok: true, reviews: readReviews_(p.key === READ_KEY) });
  }
  if (p.action === "delreview") {
    if (p.key !== READ_KEY) return out_(p.callback, { ok: false, error: "unauthorized" });
    return out_(p.callback, { ok: delReview_(p.id) });
  }
  if (p.action === "signups") {
    if (p.key !== READ_KEY) return out_(p.callback, { ok: false, error: "unauthorized" });
    return out_(p.callback, { ok: true, signups: readSignups_() });
  }
  return out_(p.callback, { ok: true, service: "Second Scoop order webhook" });
}

// Update Payment Status (col L) or Order Status (its own column) for an order.
function setStatus_(orderNumber, status, field) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return updateStatusIn_(ss.getSheetByName(PK_SHEET), orderNumber, status, field) ||
         updateStatusIn_(ss.getSheetByName(TO_SHEET), orderNumber, status, field);
}
function updateStatusIn_(sheet, orderNumber, status, field) {
  if (!sheet) return false;
  var v = sheet.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) {
    var on = String(v[i][10] || "").replace(/^'/, "");   // col K = Order #
    if (on && on === String(orderNumber)) {
      var col = (field === "order") ? osCol_(sheet) : 12; // 12 = col L Payment Status
      sheet.getRange(i + 1, col).setValue(status);
      return true;
    }
  }
  return false;
}

// Find (or create) the "Order Status" column; returns its 1-based index.
function osCol_(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var hdr = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var i = 0; i < hdr.length; i++) {
    if (String(hdr[i]).toLowerCase().indexOf("order status") > -1) return i + 1;
  }
  var col = lastCol + 1;
  sheet.getRange(1, col).setValue("Order Status");
  return col;
}

function readAllOrders_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var orders = [];
  collect_(ss.getSheetByName(PK_SHEET), "pakistan", "PKR", orders);
  collect_(ss.getSheetByName(TO_SHEET), "toronto", "CAD", orders);
  return orders;
}

function collect_(sheet, region, currency, orders) {
  if (!sheet) return;
  var v = sheet.getDataRange().getValues();
  var hdr = v[0] || [], osIdx = -1;
  for (var c = 0; c < hdr.length; c++) {
    if (String(hdr[c]).toLowerCase().indexOf("order status") > -1) { osIdx = c; break; }
  }
  for (var i = 1; i < v.length; i++) {
    var r = v[i];
    var first = r[1] || "", products = r[8] || "", sub = r[0];
    if (!products && !first) continue;                               // empty row
    if (String(sub).toLowerCase().indexOf("total revenue") > -1) continue; // summary row
    orders.push({
      submissionDate: (sub instanceof Date) ? sub.toISOString() : String(sub || ""),
      region: region, currency: currency,
      firstName: first, lastName: r[2] || "",
      email: r[3] || "", phone: String(r[4] || "").replace(/^'/, ""),
      instagram: r[5] || "",
      products: products,
      preferredMethod: r[9] || "",
      orderNumber: String(r[10] || "").replace(/^'/, ""),
      paymentStatus: r[11] || "",
      preferredDate: String(r[12] || ""),
      revenue: Number(r[13]) || 0,
      orderStatus: (osIdx >= 0) ? String(r[osIdx] || "") : ""
    });
  }
}

/* JSON or JSONP output (JSONP lets the website read across domains). */
function out_(callback, obj) {
  var json = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + "(" + json + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
