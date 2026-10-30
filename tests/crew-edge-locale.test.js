"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const middleware=fs.readFileSync(path.join(root,"functions/_middleware.ts"),"utf8");
const script=stripTypeScriptTypes(middleware).replace(/\bexport (?=(?:function|async function)\b)/g,"");
const {shouldRedirectRootToEnglish,onRequest}=new Function(script+"\nreturn {shouldRedirectRootToEnglish,onRequest};")();
function req(pathname="/",options={}){
 const headers=new Headers(options.headers||{});
 return new Request("https://www.3sssi.com"+pathname,{method:options.method||"GET",headers});
}
test("Only true first-visit English GET / takes an edge 302 and preserves search",async()=>{
 const request=req("/?from=campaign&play=1",{headers:{"Accept-Language":"en-US,en;q=0.9,zh;q=0.5"}});
 assert.equal(shouldRedirectRootToEnglish(request),true);
 let forwarded=false;
 const response=await onRequest({request,next:async()=>{forwarded=true;return new Response("ok")}});
 assert.equal(forwarded,false);
 assert.equal(response.status,302);
 assert.equal(response.headers.get("location"),"https://www.3sssi.com/en/?from=campaign&play=1");
 assert.match(response.headers.get("vary"),/Accept-Language/);
 assert.match(response.headers.get("cache-control"),/no-store/);
});
test("Manual language preference wins; crawlers and deep routes never redirect",()=>{
 const english={"Accept-Language":"en-US,en;q=0.9"};
 assert.equal(shouldRedirectRootToEnglish(req("/",{headers:{...english,Cookie:"crew_ui_locale_v1=zh-TW"}})),false);
 assert.equal(shouldRedirectRootToEnglish(req("/",{headers:{...english,Cookie:"crew_ui_locale_v1=ja"}})),false);
 assert.equal(shouldRedirectRootToEnglish(req("/",{headers:{"Accept-Language":"zh-TW,zh;q=.9,en;q=.5"}})),false);
 assert.equal(shouldRedirectRootToEnglish(req("/en/",{headers:english})),false);
 assert.equal(shouldRedirectRootToEnglish(req("/teacher",{headers:english})),false);
 assert.equal(shouldRedirectRootToEnglish(req("/",{headers:{...english,"User-Agent":"Googlebot/2.1"}})),false);
 assert.equal(shouldRedirectRootToEnglish(req("/",{headers:{...english,"User-Agent":"Lighthouse"}})),false);
 assert.equal(shouldRedirectRootToEnglish(req("/",{headers:english,method:"HEAD"})),false);
 assert.equal(shouldRedirectRootToEnglish(req("/",{headers:{Cookie:"crew_ui_locale_v1=en","Accept-Language":"zh-TW"}})),true);
});
test("Root middleware runs only at / and language picker persists a matching cookie",()=>{
 const routes=JSON.parse(fs.readFileSync(path.join(root,"_routes.json"),"utf8"));
 assert.ok(routes.include.includes("/"),"root path must invoke the Pages Function");
 assert.ok(routes.include.includes("/api/usage/*"),"usage API routes must remain active");
 assert.ok(routes.include.includes("/api/books"),"Books API route must remain active");
 const switcher=fs.readFileSync(path.join(root,"web-spa/src/i18n/LanguageSwitcher.tsx"),"utf8");
 assert.match(switcher,/document.cookie=/);
 assert.match(switcher,/UI_LOCALE_KEY/);
 const catalog=fs.readFileSync(path.join(root,"web-spa/src/i18n/localeCatalog.ts"),"utf8");
 assert.match(catalog,/UI_LOCALE_KEY\s*=\s*"crew_ui_locale_v1"/);
});
