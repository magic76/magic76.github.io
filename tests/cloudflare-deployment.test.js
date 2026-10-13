const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
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
 const inlineCss=root.split('<style data-crew-react-css>')[1]?.split('</style>')[0];
 const cssFiles=fs.readdirSync(path.join(DIST,"assets")).filter(file=>file.endsWith(".css"));
 assert.equal(cssFiles.length,1,"expected one Vite CSS bundle");
 const compiledCss=read("assets/"+cssFiles[0]);
 assert.ok(script,"missing app JS");assert.ok(inlineCss,"missing inline React stylesheet");
 assert.ok(compiledCss.length>10000&&compiledCss.includes(".global-nav"));
 assert.equal(inlineCss,compiledCss,"inlined stylesheet must exactly match the Vite CSS build");
 for(const locale of ["zh","en"])for(const slug of pages){
  const pathname=(locale==="en"?"en/":"")+(slug?slug+"/":"")+"index.html";
  const html=read(pathname);
  const canonical="https://www.3sssi.com/"+(locale==="en"?"en/":"")+(slug?slug+"/":"");
  assert.ok(html.includes('<link rel="canonical" href="'+canonical+'">'),pathname);
  assert.ok(html.includes('<html lang="'+(locale==="en"?"en":"zh-Hant")+'">'),pathname);
  assert.match(html,/<div id="root"><div class="crew-bootstrap-shell"/,"functional loading shell must appear before SEO fallback");
  assert.ok(html.includes('<div class="seo-fallback">'),"non-JS SEO fallback must remain available");
  assert.ok(html.indexOf('<div class="crew-bootstrap-shell"')<html.indexOf('<div class="seo-fallback">'));
  assert.ok(html.includes('<style data-crew-bootstrap>'));
  assert.ok(html.includes('<script data-crew-bootstrap>'));
  assert.ok(html.indexOf('<script data-crew-bootstrap>')<html.indexOf("</head>"),"boot script must execute before first paint");
  const bootStyles=html.split('<style data-crew-bootstrap>')[1]?.split("</style>")[0];
  assert.ok(bootStyles.includes("html.crew-js .seo-fallback{display:none!important}"),"JS users must not see separate SEO marketing UI");
  assert.ok(bootStyles.includes("html.crew-js.crew-boot-failed .seo-fallback{display:block!important}"),"app failure must preserve static content");
  assert.ok(bootStyles.includes(".crew-bootstrap-shell"));
  assert.ok(html.indexOf("<style data-crew-react-css>")<html.indexOf("<script data-crew-bootstrap>"),"app styles are present before boot");
  assert.ok(html.includes(script[1]),pathname);
  const actualInline=html.split('<style data-crew-react-css>')[1]?.split('</style>')[0];
  assert.ok(actualInline,"React UI CSS must be available without a network request: "+pathname);
  assert.equal(actualInline,compiledCss,"style is stale: "+pathname);
  assert.ok(html.includes('<h1>'),pathname);
  assert.ok(html.includes('hreflang="en"'),pathname);
  assert.ok(html.includes('hreflang="zh-Hant"'),pathname);
  assert.ok(html.includes('<link rel="stylesheet" href="/seo.css" data-crew-seo-fallback>'),"SEO fallback must have full CSS: "+pathname);
  assert.ok(!html.includes('href="/crew-app/#/'),"Public links must stay on clean product routes: "+pathname);
  assert.ok(!html.includes('location.replace("crew-app/#/') ,pathname);
 }
 assert.ok(fs.existsSync(path.join(DIST,script[1].slice(1))));
 assert.ok(fs.existsSync(path.join(DIST,"assets",cssFiles[0])));
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
  assert.ok(html.indexOf("<style data-crew-react-css>")<html.indexOf('href="/seo.css"'),"Full React CSS must be available before SEO fallback overrides it");
 }
});
check("first-paint watchdog avoids marketing flash, then recovers after JS failure",()=>{
 const html=read("index.html");
 const startup=html.split('<script data-crew-bootstrap>')[1]?.split("</script>")[0];
 assert.ok(startup,"missing boot watchdog");
 const execute=()=>{
  const set=new Set(),listeners={};
  let callback,wait,cleared=false;
  const document={documentElement:{classList:{
   add(...values){for(const v of values)set.add(v)},
   remove(...values){for(const v of values)set.delete(v)}
  }}};
  const window={addEventListener(type,listener){listeners[type]=listener}};
  vm.runInNewContext(startup,{
   document,window,
   setTimeout(fn,ms){callback=fn;wait=ms;return 12},
   clearTimeout(id){if(id===12)cleared=true}
  });
  return {set,listeners,get callback(){return callback},get wait(){return wait},get cleared(){return cleared}};
 };
 const success=execute();
 assert.ok(success.set.has("crew-js"));
 assert.ok(!success.set.has("crew-boot-failed"));
 assert.equal(success.wait,8000);
 success.listeners["crew:mounted"]();
 assert.ok(success.cleared);
 assert.ok(!success.set.has("crew-js"),"React commit must clear boot-only CSS rules");
 const failure=execute();
 failure.callback();
 assert.ok(failure.set.has("crew-boot-failed"),"on JS failure SEO content must become readable");
});
check("old HashRouter links resolve to clean URLs with query strings",()=>{
 const html=read("crew-app/index.html");
 assert.ok(html.includes('name="robots" content="noindex,follow"'));
 assert.ok(html.includes("location.hash"));
 assert.ok(html.includes("location.replace("));
 assert.ok(html.includes("parsed.search"));
 assert.ok(html.includes("crew_ui_locale_v1"));
});
