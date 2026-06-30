const fs=require("fs"); const {JSDOM}=require("jsdom");
const dom=new JSDOM(`<!doctype html><html><body>
<div id="ss-admin-body"></div><div id="ss-admin-nav"></div></body></html>`,
 {url:"https://second-scoop.com/backend.html",runScripts:"outside-only",pretendToBeVisual:true});
const {window}=dom; global.window=window; global.document=window.document;
global.localStorage=window.localStorage; global.sessionStorage=window.sessionStorage;
global.location=window.location; global.navigator=window.navigator;
const files=["assets/js/config/settings.js","assets/js/config/regions.js","assets/js/config/products.js",
 "assets/js/config/vault.js","assets/js/config/content.js","assets/js/store.js","assets/js/app.js",
 "assets/js/reviews.js","assets/js/pages/backend.js"];
let ok=true;
for(const f of files){ try{ window.eval(fs.readFileSync(f,"utf8")); }catch(e){ ok=false; console.log("LOAD ERROR in",f,"\n",e.message);} }
console.log(ok?"ALL BACKEND FILES LOADED OK":"LOAD FAILED");
