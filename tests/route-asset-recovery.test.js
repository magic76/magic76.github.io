const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const src=path.resolve(__dirname,"../web-spa/src");
const read=file=>fs.readFileSync(path.join(src,file),"utf8");

test("background warmups never evaluate lazy import() and poison the module map",()=>{
  const app=read("App.tsx");
  assert.doesNotMatch(app,/scheduleCrewPreload/);
  assert.equal(fs.existsSync(path.join(src,"runtime/routePreload.ts")),false);
  assert.match(app,/Suspense fallback=/);
});

test("one recoverable chunk failure renders loading, then surfaces a real error after retry",()=>{
  const source=read("components/RouteErrorBoundary.tsx");
  assert.match(source,/recovering:isAssetLoadError\(error\)/);
  assert.match(source,/if\(this\.state\.recovering\)return/);
  assert.match(source,/role="status"/);
  assert.match(source,/this\.setState\(\{recovering:false\}\)/);
  assert.match(source,/sessionStorage\.setItem\(RETRY_KEY/);
  assert.match(source,/RETRY_WINDOW_MS=60_000/);
  assert.match(source,/"頁面暫時無法載入"/);
  assert.match(source,/"返回首頁"/);
});

test("Chrome chat cards constrain bare SVGs and game entry uses a full document",()=>{
 const css=read("pages/crewSections.css");
 const chat=read("pages/CrewSectionPage.tsx");
 assert.match(css,/\.crew-section-chat \.crew-intent-card>svg\{[^}]*width:28px;height:28px[^}]*fill:none;stroke:currentColor/);
 assert.match(css,/\.crew-section-chat \.crew-intent-grid\{display:grid/);
 assert.match(chat,/reloadDocument=\{item\.to==="\/games"\}/);
});

test("a pending game chunk recovers once instead of showing an endless spinner",()=>{
 const app=read("App.tsx");
 const source=read("components/GameRouteFallback.tsx");
 assert.match(app,/Suspense fallback=\{<GameRouteFallback pathname=\{pathname\}/);
 assert.match(source,/STALL_MS=12_000/);
 assert.match(source,/sessionStorage\.setItem\(RETRY_KEY/);
 assert.match(source,/RETRY_WINDOW_MS=60_000/);
 assert.match(source,/window\.location\.replace/);
 assert.match(source,/showRetry&&/);
});
