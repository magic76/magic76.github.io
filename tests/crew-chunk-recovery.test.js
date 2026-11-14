const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const read=file=>fs.readFileSync(require("node:path").resolve(__dirname,"../",file),"utf8");

const helper=read("web-spa/src/runtime/chunkRecovery.ts");
const code=stripTypeScriptTypes(helper,{mode:"strip"}).replace(/\bexport\s+/g,"");
const bustedChunkUrl=vm.runInNewContext(code+"\nbustedChunkUrl",{URL,Error});

test("chunk retry URL is same-origin, JS only, and has exactly one cache-busting value",()=>{
 const base="https://www.3sssi.com/games/1a2b?mode=chat";
 const input=new Error("Failed to fetch dynamically imported module: https://www.3sssi.com/assets/build/NumberGame-Ab1.js");
 const retry=bustedChunkUrl(input,base,"build123-1");
 assert.equal(retry,"https://www.3sssi.com/assets/build/NumberGame-Ab1.js?__crew_chunk_retry=build123-1");
 assert.equal(bustedChunkUrl("Unable to preload CSS for /assets/build/page-X.css",base,"x"),null);
 assert.equal(bustedChunkUrl("Failed to fetch dynamically imported module: https://attacker.test/assets/build/evil.js",base,"x"),null);
 assert.equal(bustedChunkUrl("Failed to fetch dynamically imported module: https://www.3sssi.com/api/private.js",base,"x"),null);
 assert.equal(bustedChunkUrl("ChunkLoadError: no URL",base,"x"),null);
 assert.match(helper,/await import\(\/\* @vite-ignore \*\/ url\)/);
 assert.equal((helper.match(/await import\(/g)||[]).length,1,"only one cache-busted import() probe");
});

test("optional AppChrome footer is isolated from the route error boundary",()=>{
 const chrome=read("web-spa/src/components/AppChrome.tsx");
 const app=read("web-spa/src/App.tsx");
 assert.match(chrome,/<OptionalWidgetBoundary><Suspense fallback=\{null\}><CrewInstallEntry\/><\/Suspense><\/OptionalWidgetBoundary>/);
 assert.match(app,/<RouteErrorBoundary key=\{pathname\}>/);
 for(const name of ["CrewInstallNudge","CrewUpdateNotice","OnboardingGate","LearningLanguageGate"]){
  assert.match(app,new RegExp("<OptionalWidgetBoundary><Suspense fallback=\\{null\\}><"+name));
 }
});

test("a failed route tries a busted import then one guarded reload, never reopens a loop",()=>{
 const boundary=read("web-spa/src/components/RouteErrorBoundary.tsx");
 const main=read("web-spa/src/main.tsx");
 assert.match(boundary,/const RETRY_WINDOW_MS=60_000/);
 assert.match(boundary,/previous\?\.path===path&&typeof previous\.at==="number"/);
 assert.match(boundary,/now-previous\.at<RETRY_WINDOW_MS/);
 assert.match(boundary,/sessionStorage\.setItem\(RETRY_KEY,JSON\.stringify\(\{path,at:now\}\)\)/);
 assert.match(boundary,/if\(alreadyRetried\)\{this\.setState\(\{recovering:false\}\);return;\}/);
 assert.match(boundary,/retryFailedChunkOnce\(error,nonce\)/);
 assert.match(boundary,/prepareChunkRecoveryWorker\(\)/);
 assert.match(boundary,/void this\.recoverAsset\(error\)/);
 assert.match(boundary,/window\.location\.replace\(url\.toString\(\)\)/);
 assert.match(main,/url\.searchParams\.delete\("__crew_reload"\)/);
 assert.match(helper,/sw\.register\("\/sw\.js",\{scope:"\/",updateViaCache:"none"\}\)/);
});

test("all 11 languages have local recovery text, accessible controls, and allowlisted telemetry only",()=>{
 const src=read("web-spa/src/components/RouteErrorBoundary.tsx");
 for(const locale of ["zh-TW","en","ja","ko","es","fr","de","id","pt-BR","th","vi"]){
  assert.match(src,new RegExp('(?:"'+locale+'"|\\b'+locale+'):\\['));
 }
 assert.match(src,/minHeight:44,minWidth:110/);
 assert.match(src,/role="alert"/);
 assert.match(src,/role="status"/);
 assert.match(src,/trackUsageEvent\("route_load_error",isAssetLoadError\(error\)\?"asset":"runtime"\)/);
 assert.equal((src.match(/trackUsageEvent\(/g)||[]).length,1);
 assert.doesNotMatch(src,/trackUsageEvent\("(?!route_load_error)/);
});
