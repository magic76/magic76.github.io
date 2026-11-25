const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const source=fs.readFileSync("web-spa/src/analytics/usage.ts","utf8");
const js=stripTypeScriptTypes(source,{mode:"strip"}).replace(/^import .*?;\s*/,"")
 .replaceAll('import("./ga4")','loadGa4Mock()')
 .replace(/export (function|const) /g,"$1 ")+"\nthis.api={trackAppOpen,trackPageView,trackUsageEvent};";
function browser(search="",saved={},blocked=false){
 const calls=[],ga=[],local=new Map(),session=new Map(Object.entries(saved));
 const storage=map=>({getItem:k=>{if(blocked&&map===session)throw Error("blocked");return map.get(k)||null},setItem:(k,v)=>{if(blocked&&map===session)throw Error("blocked");map.set(k,v)},removeItem:k=>map.delete(k)});
 const location={hostname:"koolo.app",pathname:"/learn",search};
 const context={URLSearchParams,location,window:{location},document:{referrer:""},navigator:{},localStorage:storage(local),sessionStorage:storage(session),crypto:{randomUUID:()=>"uuid"},Date,Map,Set,Promise,usagePlatform:()=>"web",
 fetch:(...args)=>{calls.push(args);return Promise.resolve()},loadGa4Mock:()=>{ga.push("load");return Promise.resolve({setGa4Enabled:()=>{},sendGa4PageView:()=>ga.push("view"),sendGa4Event:()=>ga.push("event")})}};
 vm.runInNewContext(js,context);return {api:context.api,location,session,calls,ga};
}
test("preview suppresses all GA and usage traffic across navigation and reload",async()=>{
 const b=browser("?kooloPreview=1");
 b.api.trackAppOpen();b.api.trackPageView("/learn");b.api.trackUsageEvent("game_open","connect4");
 b.location.search="";b.api.trackPageView("/games");b.api.trackUsageEvent("shorts_view");
 await new Promise(setImmediate);assert.equal(b.calls.length,0);assert.deepEqual(b.ga,[]);
 const reloaded=browser("",Object.fromEntries(b.session));
 reloaded.api.trackAppOpen();reloaded.api.trackPageView("/learn");
 await new Promise(setImmediate);assert.equal(reloaded.calls.length,0);assert.deepEqual(reloaded.ga,[]);
});
test("ordinary visitors continue reporting, including after explicitly leaving preview",async()=>{
 for(const b of [browser(),browser("?kooloPreview=0",{koolo_workbench_preview_v1:"1"})]){
  b.api.trackAppOpen();b.api.trackPageView("/learn");
  await new Promise(setImmediate);assert.ok(b.calls.length>0);assert.ok(b.ga.includes("view"));
 }
});
test("blocked storage still suppresses the marked document and SPA navigation",async()=>{
 const b=browser("?kooloPreview=1",{},true);
 b.api.trackAppOpen();b.location.search="";b.api.trackPageView("/learn");
 await new Promise(setImmediate);assert.equal(b.calls.length,0);assert.deepEqual(b.ga,[]);
});
