const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

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
  assert.ok(html.includes('data-crew-ssg-path="'),"must contain route-specific SSG marker");
  assert.ok(html.includes('<header class="app-header">'),"HTML must contain actual React app shell: "+pathname);
  assert.ok(html.includes('class="global-nav"'),"SSG must include actual React navigation: "+pathname);
  assert.ok(html.includes("<h1"),"SSG must contain real product heading: "+pathname);
  assert.ok(!html.includes('class="seo-fallback"'),"old marketing fallback is not SSG: "+pathname);
  assert.ok(!html.includes("crew-bootstrap-shell"),"no duplicate bootstrap page: "+pathname);
  assert.ok(!html.includes('class="site-header"'),"must not ship marketing HTML: "+pathname);
  assert.ok(html.includes('class="crew-home"')||html.includes('class="hero"')||html.includes('class="hero ')||html.includes('class="briefing'),"product screen missing: "+pathname);
  assert.ok(html.includes('html.crew-dynamic-route #root{visibility:hidden!important}'),"deep-route fallback must hide wrong SSG");
  assert.ok(!html.includes('/@fs/'),"Vite dev-only image URL leaked into deployment");
  assert.ok(html.includes(script[1]),pathname);
  // Guard browser HTML parsing, not just the presence of a Vite URL.
  // <script src="/assets/..."> needs a closing </script>. A literal
  // backslash+n outside a tag can terminate <head> and become visible text.
  const headStart=html.indexOf("<head>");
  const headEnd=html.indexOf("</head>");
  const bodyStart=html.indexOf("<body");
  assert.ok(headStart>=0&&headEnd>headStart&&bodyStart>headEnd,"valid head/body order: "+pathname);
  const head=html.slice(headStart,headEnd);
  const moduleOpen=html.match(/<script[^>]*src="\/assets\/[^"]+\.js"[^>]*>/)?.[0];
  assert.ok(moduleOpen,"missing Vite module opening tag: "+pathname);
  assert.ok(head.includes(moduleOpen+"</script>"),"Vite script must be explicitly closed inside <head>: "+pathname);
  assert.ok(head.indexOf("<style data-crew-react-css>")<head.indexOf(moduleOpen),"compiled CSS must precede the app JS: "+pathname);
  const literalEscape=String.fromCharCode(92)+"n";
  assert.ok(!head.includes("</style>"+literalEscape),"escaped \\n leaked after CSS: "+pathname);
  assert.ok(!head.includes("</script>"+literalEscape),"escaped \\n leaked after script: "+pathname);
  assert.ok(head.includes("html.crew-dynamic-route #root"),"early deep-route guard must remain in head: "+pathname);
  const inlineGuard=head.match(/<script>([\\s\\S]*?)<\\/script>/)?.[1];
  assert.ok(inlineGuard,"missing inline route guard: "+pathname);
  assert.doesNotThrow(()=>new vm.Script(inlineGuard),"route guard must be valid browser JavaScript: "+pathname);

  const actualInline=html.split('<style data-crew-react-css>')[1]?.split('</style>')[0];
  assert.ok(actualInline,"React UI CSS must be available without a network request: "+pathname);
  assert.equal(actualInline,compiledCss,"style is stale: "+pathname);
  assert.ok(html.includes('<h1>'),pathname);
  assert.ok(html.includes('hreflang="en"'),pathname);
  assert.ok(html.includes('hreflang="zh-Hant"'),pathname);
  assert.ok(!html.includes('data-crew-seo-fallback'),"no redundant SEO stylesheet: "+pathname);
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
check("React SSG hydration keeps one app and uses client-side routing for deep links",()=>{
 const main=fs.readFileSync(path.join(ROOT,"web-spa/src/main.tsx"),"utf8");
 assert.ok(main.includes("hydrateRoot(root,app)"));
 assert.ok(main.includes("createRoot(root).render(app)"),"deep links must still use SPA mode");
 assert.ok(main.includes("prerenderedPath===pathname"),"never hydrate a different route's HTML");
 const renderer=fs.readFileSync(path.join(ROOT,"scripts/ssg-renderer.mjs"),"utf8");
 assert.ok(renderer.includes('await vite.ssrLoadModule("/src/ssg-entry.tsx")'));
 const entry=fs.readFileSync(path.join(ROOT,"web-spa/src/ssg-entry.tsx"),"utf8");
 assert.ok(entry.includes("renderToString(")&&entry.includes("<App/>"),"SSG must render real React App");
 const r=read("teacher/index.html");
 assert.ok(r.includes('data-crew-ssg-path="/teacher"'));
 assert.ok(!r.includes('data-crew-seo-fallback'),"SSG must not load a separate SEO CSS");
 const en=read("en/teacher/index.html");
 assert.ok(en.includes('data-crew-ssg-path="/en/teacher"'));
 const headline=html=>html.split("<h1>")[1]?.split("</h1>")[0];
 assert.ok(headline(r)&&headline(en),"SSR must include product h1");
 assert.notEqual(headline(r),headline(en),"localized headings must differ");
});

check("production SEO metadata, sitemap and preview noindex are consistent",()=>{
 const robots=read("robots.txt"),sitemap=read("sitemap.xml"),headers=read("_headers");
 const domain="https://www.3sssi.com";
 assert.ok(robots.includes("Sitemap: "+domain+"/sitemap.xml"),"robots must point to production sitemap");
 const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
 const expected=[];
 for(const locale of ["zh","en"])for(const slug of pages){
  const prefix=locale==="en"?"/en":"";
  const route=(slug?"/"+slug:"")+"/";
  const canonical=domain+prefix+route;
  expected.push(canonical);
  const pathname=(locale==="en"?"en/":"")+(slug?slug+"/":"")+"index.html";
  const html=read(pathname);
  const zhHref=domain+route,enHref=domain+"/en"+route;
  assert.ok(html.includes('<link rel="canonical" href="'+canonical+'">'),"canonical mismatch: "+pathname);
  assert.ok(html.includes('<link rel="alternate" hreflang="zh-Hant" href="'+zhHref+'">'),"Chinese alternate mismatch: "+pathname);
  assert.ok(html.includes('<link rel="alternate" hreflang="en" href="'+enHref+'">'),"English alternate mismatch: "+pathname);
  assert.ok(html.includes('<meta name="robots" content="index,follow">'),"public page must remain indexable: "+pathname);
  assert.ok(sitemap.includes("<loc>"+canonical+"</loc>"),"sitemap missing: "+canonical);
 }
 assert.equal(urls.length,expected.length,"sitemap should include only public SSG routes");
 assert.deepEqual([...urls].sort(),expected.sort(),"sitemap URLs do not match SSG routes");
 assert.ok(headers.includes("https://magic76-github-io.pages.dev/*"),"preview host missing noindex");
 assert.ok(headers.includes("https://:version.magic76-github-io.pages.dev/*"),"branch preview missing noindex");
 assert.ok(headers.trim().split(/\n\s*\n/).every(rule=>rule.includes("X-Robots-Tag: noindex")),"each preview host needs noindex");
 assert.ok(!headers.includes("https://www.3sssi.com/"),"production must remain indexable");
 assert.ok(!headers.includes("no-transform"),"Cloudflare automatic Web Analytics needs unmodified HTML");
});

check("old HashRouter links resolve to clean URLs with query strings",()=>{
 const html=read("crew-app/index.html");
 assert.ok(html.includes('name="robots" content="noindex,follow"'));
 assert.ok(html.includes("location.hash"));
 assert.ok(html.includes("location.replace("));
 assert.ok(html.includes("parsed.search"));
 assert.ok(html.includes("crew_ui_locale_v1"));
});
