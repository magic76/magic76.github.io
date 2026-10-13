const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const ROOT=path.resolve(__dirname,"..");
const DIST=path.join(ROOT,"dist");
const read=p=>fs.readFileSync(path.join(DIST,p),"utf8");
const pages=["","teacher","story","fortune","research"];
// Normal npm test is source-only and does not produce dist. The dedicated
// Cloudflare build job sets this flag after building the deployment artifact.
const check=process.env.CREW_CLOUDFLARE_TEST==="1"?test:test.skip;

check("Cloudflare build uses clean React routes and avoids a 404 SPA fallback blocker",()=>{
 assert.ok(fs.existsSync(path.join(DIST,"index.html")));
 assert.ok(!fs.existsSync(path.join(DIST,"404.html")));
 const main=fs.readFileSync(path.join(ROOT,"web-spa/src/main.tsx"),"utf8");
 assert.match(main,/BrowserRouter/);
 assert.match(main,/HashRouter/);
 const routes=fs.readFileSync(path.join(ROOT,"web-spa/src/App.tsx"),"utf8");
 for(const slug of ["teacher","story","fortune","research","settings"])assert.ok(routes.includes('path="/'+slug+'"'));
});
check("ten static SEO entry points boot the same functional React bundle",()=>{
 const root=read("index.html");
 const script=root.match(/<script[^>]*src="(\/assets\/[^"]+\.js)"/);
 const stylesheet=root.match(/<link[^>]*href="(\/assets\/[^"]+\.css)"/);
 assert.ok(script,"missing app JS");assert.ok(stylesheet,"missing app CSS");
 for(const locale of ["zh","en"])for(const slug of pages){
  const pathname=(locale==="en"?"en/":"")+(slug?slug+"/":"")+"index.html";
  const html=read(pathname);
  const canonical="https://www.3sssi.com/"+(locale==="en"?"en/":"")+(slug?slug+"/":"");
  assert.ok(html.includes('<link rel="canonical" href="'+canonical+'">'),pathname);
  assert.ok(html.includes('<html lang="'+(locale==="en"?"en":"zh-Hant")+'">'),pathname);
  assert.match(html,/<div id="root"><div class="seo-fallback">/);
  assert.ok(html.includes(script[1]),pathname);
  assert.ok(html.includes(stylesheet[1]),pathname);
  assert.ok(html.includes('<h1>'),pathname);
  assert.ok(html.includes('hreflang="en"'),pathname);
  assert.ok(html.includes('hreflang="zh-Hant"'),pathname);
  assert.ok(html.includes('<link rel="stylesheet" href="/seo.css" data-crew-seo-fallback>'),"SEO fallback must have full CSS: "+pathname);
  assert.ok(!html.includes('href="/crew-app/#/'),"Public links must stay on clean product routes: "+pathname);
  assert.ok(!html.includes('location.replace("crew-app/#/') ,pathname);
 }
 assert.ok(fs.existsSync(path.join(DIST,script[1].slice(1))));
 assert.ok(fs.existsSync(path.join(DIST,stylesheet[1].slice(1))));
});
check("existing runtime scripts, shared services and daily research feed are available from the domain root",()=>{
 for(const file of ["crew.js","crew-live.js","crew-live-ui.js","features/shared/db.js",
  "features/story/shelf/store.js","features/fortune/shared/profile.js","briefings/index.json",
  "sitemap.xml","robots.txt","seo.css","social/teacher.png"]){
  assert.ok(fs.existsSync(path.join(DIST,file)),"missing required asset: "+file);
 }
 const index=JSON.parse(read("briefings/index.json"));
 assert.ok(Array.isArray(index.days));
});
check("fallback CSS is designed, copied and removed only after React mount",()=>{
 const fallbackCSS=read("seo.css");
 assert.ok(fallbackCSS.includes(".hero{display:grid"),"expected original landing design styles");
 assert.ok(fallbackCSS.includes(".feature-grid"),"expected original grid styles");
 const main=fs.readFileSync(path.join(ROOT,"web-spa/src/main.tsx"),"utf8");
 assert.ok(main.includes("React.useLayoutEffect"),"cleanup must run after successful React commit");
 assert.ok(main.includes("link[data-crew-seo-fallback]"),"cleanup must target only fallback CSS");
 for(const locale of ["", "en/"]){
  const html=read(locale+"index.html");
  assert.equal((html.match(/data-crew-seo-fallback/g)||[]).length,1);
  assert.ok(html.indexOf('href="/seo.css"')<html.indexOf('href="/assets/'),"fallback CSS must load before the app stylesheet");
 }
});
check("old HashRouter links resolve to clean URLs with query strings",()=>{
 const html=read("crew-app/index.html");
 assert.ok(html.includes('name="robots" content="noindex,follow"'));
 assert.ok(html.includes("location.hash"));
 assert.ok(html.includes("location.replace("));
 assert.ok(html.includes("parsed.search"));
 assert.ok(html.includes("crew_ui_locale_v1"));
});
