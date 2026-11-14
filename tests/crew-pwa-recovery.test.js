const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const ROOT=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(ROOT,p),"utf8");

test("a standalone install registers and updates the service worker without an install prompt",()=>{
 const pwa=read("web-spa/src/runtime/pwa.ts");
 const main=read("web-spa/src/main.tsx");
 assert.match(pwa,/export function canRegisterCrewPwa\(\)/);
 assert.match(pwa,/!canRegisterCrewPwa\(\)\|\|registrationStarted/);
 assert.match(pwa,/export function canOfferCrewInstall\(\)/);
 assert.match(pwa,/isCrewInstalled\(\)/);
 assert.doesNotMatch(pwa,/registerCrewPwa\(\)\{\s*if[^\n]*!canOfferCrewInstall\(\)/);
 assert.match(main,/function ensureCrewPwaUpdates\(\)/);
 assert.match(main,/import\("\.\/runtime\/pwa"\)\.then\(module=>module\.registerCrewPwa\(\)\)/);
 assert.match(main,/window\.addEventListener\("load",ensureCrewPwaUpdates/);
 assert.match(pwa,/isCrewAndroidShell\(\)/);
});

test("a missing optional route-independent lazy chunk never kills the entire PWA",()=>{
 const app=read("web-spa/src/App.tsx");
 const boundary=read("web-spa/src/components/OptionalWidgetBoundary.tsx");
 for(const name of ["CrewInstallNudge","CrewUpdateNotice","OnboardingGate","LearningLanguageGate"]){
  assert.match(app,new RegExp("<OptionalWidgetBoundary><Suspense fallback=\\{null\\}><"+name));
 }
 assert.match(boundary,/static getDerivedStateFromError\(\)\{return \{failed:true\};\}/);
 assert.match(boundary,/this\.state\.failed\?null:this\.props\.children/);
 assert.match(app,/<RouteErrorBoundary key=\{pathname\}>/);
});

test("Service Worker repairs an HTML SPA fallback with one cache-busted refetch and caches only JS",async()=>{
 const src=read("web-spa/public/sw.js");
 assert.match(src,/STATIC_CACHE="crew-pwa-static-v2"/);
 const listeners={};
 const memory=new Map();
 const put=[];
 const cache={
  match:async request=>memory.get(request.url)||null,
  put:async(request,response)=>{put.push(request.url);memory.set(request.url,response);},
  keys:async()=>[...memory.keys()].map(url=>({url}))
 };
 const responses=[
  {ok:true,type:"basic",headers:{get:()=>"text/html; charset=utf-8"},clone(){return this;}},
  {ok:true,type:"basic",headers:{get:()=>"text/javascript; charset=utf-8"},clone(){return this;}}
 ];
 const requests=[];
 vm.runInNewContext(src,{
  self:{location:{origin:"https://www.3sssi.com"},addEventListener:(name,fn)=>{listeners[name]=fn;}},
  caches:{open:async()=>cache,match:async()=>null,keys:async()=>[]},
  URL,Response,fetch:async(request,opts)=>{requests.push({request,opts});return responses[Math.min(requests.length-1,1)];}
 });
 const request={url:"https://www.3sssi.com/assets/build/fortune-old.js",mode:"cors",method:"GET"};
 function fetchAsset(){
  let answer;
  listeners.fetch({request,respondWith:response=>{answer=response;}});
  return answer;
 }
 const first=await fetchAsset();
 assert.equal(first.headers.get("content-type"),"text/javascript; charset=utf-8");
 assert.equal(requests.length,2,"one original and exactly one cache-busted request");
 assert.match(requests[1].request,/fortune-old\.js\?__crew_asset_retry=/);
 assert.equal(requests[1].opts.cache,"no-store");
 assert.deepEqual(put,[request.url],"only verified JS may be cached at the original URL");
 await fetchAsset();
 assert.equal(requests.length,2,"subsequent fetch uses repaired cache entry");
});

test("Service Worker cannot persist HTML when a cache-busted retry also returns HTML",async()=>{
 const src=read("web-spa/public/sw.js");
 const listeners={},calls=[];let saved=0;
 const html={ok:true,type:"basic",headers:{get:()=>"text/html; charset=utf-8"},clone(){return this;}};
 vm.runInNewContext(src,{
  self:{location:{origin:"https://www.3sssi.com"},addEventListener:(name,fn)=>{listeners[name]=fn;}},
  caches:{open:async()=>({match:async()=>null,put:async()=>{saved++;},keys:async()=>[]}),match:async()=>null,keys:async()=>[]},
  URL,Response,fetch:async(request)=>{calls.push(request);return html;}
 });
 let result;
 listeners.fetch({request:{url:"https://www.3sssi.com/assets/build/broken.css",mode:"cors",method:"GET"},respondWith:answer=>{result=answer;}});
 assert.equal(await result,html);
 assert.equal(calls.length,2,"retry once only");
 assert.equal(saved,0,"no HTML cache poisoning");
});

test("Fortune failures and update failures are distinguishable without exposing route or user data",()=>{
 const boundary=read("web-spa/src/components/RouteErrorBoundary.tsx");
 const client=read("web-spa/src/analytics/usage.ts");
 const server=read("functions/api/usage/event.ts");
 assert.match(boundary,/trackUsageEvent\("route_load_error",isAssetLoadError\(error\)\?"asset":"runtime"\)/);
 assert.match(boundary,/此頁面的程式執行發生錯誤/);
 assert.match(boundary,/新版頁面檔案載入失敗/);
 assert.match(boundary,/RETRY_WINDOW_MS=60_000/);
 assert.match(boundary,/window\.location\.replace\(url\.toString\(\)\)/);
 for(const str of ["route_load_error","asset","runtime"]){
  assert.ok(client.includes('"'+str+'"'),str+" client");
  assert.ok(server.includes('"'+str+'"'),str+" server");
 }
});
