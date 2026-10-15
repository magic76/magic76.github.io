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
 assert.ok(!routes.includes("<BuildVersion/>"),"BuildVersion must not render globally");
 const settings=fs.readFileSync(path.join(ROOT,"web-spa/src/pages/SettingsPage.tsx"),"utf8");
 assert.ok(settings.includes("<BuildVersion/>"),"BuildVersion must be rendered within Settings");
});
check("ten static SEO entry points boot the same functional React bundle",()=>{
 const root=read("index.html");
 const script=root.match(/<script[^>]*src="(\/assets\/[^"]+\.js)"/);
 const inlineCss=root.split('<style data-crew-react-css>')[1]?.split('</style>')[0];
 const cssFiles=fs.readdirSync(path.join(DIST,"assets")).filter(file=>/^index-[^/]+\.css$/.test(file));
 assert.equal(cssFiles.length,1,"expected exactly one initial-entry Vite CSS bundle (lazy routes may emit separate CSS)");
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
  assert.ok(!/<section\b[^>]*class="[^"]*crew-build-section/.test(html),"Build version must not appear on non-settings routes: "+pathname);
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
  const inlineGuard=head.split("<script>")[1]?.split("</script>")[0];
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
  "sitemap.xml","robots.txt","seo.css","social/teacher.png","features/teacher/shorts/posts.json"]){
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
 assert.ok(entry.includes("prerender(")&&entry.includes("<App/>"),"async SSG must fully prerender real React App including lazy routes");
 const r=read("teacher/index.html");
 assert.ok(r.includes('data-crew-ssg-path="/teacher"'));
 assert.ok(!r.includes('data-crew-seo-fallback'),"SSG must not load a separate SEO CSS");
 const en=read("en/teacher/index.html");
 assert.ok(en.includes('data-crew-ssg-path="/en/teacher"'));
 const headline=html=>html.split("<h1>")[1]?.split("</h1>")[0];
 assert.ok(headline(r)&&headline(en),"SSR must include product h1");
 assert.notEqual(headline(r),headline(en),"localized headings must differ");
});

check("production SEO metadata, sitemap and preview noindex are consistent",async()=>{
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
 const {readPublishedResearch,articlePath,articleCanonical,indexableArticle}=await import("../scripts/research-seo.mjs");
 const {days}=readPublishedResearch(ROOT);
 let total=0,indexed=0;
 for(const [date,day] of days)for(const item of day.items){
  total++;
  const route=articlePath(date,item);
  const html=read(route.slice(1)+"index.html");
  const canonical=articleCanonical(date,item);
  assert.ok(html.includes('<div id="root" data-crew-ssg-path="'+route.slice(0,-1)+'">'),"missing article hydration marker: "+route);
  assert.ok(html.includes('<article class="briefing briefing-detail">'),"must render actual React article: "+route);
  assert.ok(html.includes(item.title.replaceAll("&","&amp;")),"article title missing in HTML: "+route);
  assert.ok(html.includes('<link rel="canonical" href="'+canonical+'">'),"article canonical incorrect: "+route);
  assert.ok(html.includes('<meta property="og:url" content="'+canonical+'">'),"article og URL incorrect: "+route);
  assert.ok(html.includes('<script id="crew-research-seed" type="application/json">'),"missing hydration public seed: "+route);
  const rawSeed=html.split('<script id="crew-research-seed" type="application/json">')[1]?.split("</script>")[0];
  const seed=JSON.parse(rawSeed);
  assert.equal(seed.article.id,item.id,"wrong article seed: "+route);
  assert.equal(seed.day.date,date);
  assert.ok(!html.includes("seo-fallback"),"duplicate SEO landing: "+route);
  assert.ok(!html.includes("crew_teacher_spa_state"),"user state must not be embedded: "+route);
  const structured=html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1];
  assert.ok(structured,"missing Article structured data: "+route);
  const ld=JSON.parse(structured);
  assert.equal(ld["@type"],"BlogPosting");
  assert.equal(ld.mainEntityOfPage["@id"],canonical);
  assert.equal(ld.datePublished,day.generatedAt,"should distinguish published research edition from cited paper date");
  if(indexableArticle(item)){
   indexed++;expected.push(canonical);
   assert.ok(html.includes('<meta name="robots" content="index,follow">'),"substantial article must be indexable: "+route);
   assert.ok(sitemap.includes("<loc>"+canonical+"</loc>"),"curated article absent from sitemap: "+route);
  }else{
   assert.ok(html.includes('<meta name="robots" content="noindex,follow">'),"thin article should not be indexed: "+route);
   assert.ok(!sitemap.includes("<loc>"+canonical+"</loc>"),"thin article must not enter sitemap: "+route);
  }
 }
 assert.ok(total>0,"public research feed must produce article pages, even when no articles qualify for indexing");
 const discovery=JSON.parse(read("briefings/discovery.json"));
 assert.equal(Object.keys(discovery).length,total,"every public article must appear in discovery manifest");
 for(const [pagePath,entries] of Object.entries(discovery)){
  assert.ok(Array.isArray(entries)&&entries.length<=3,"maximum 3 recommendations");
  for(const entry of entries){
   assert.ok(fs.existsSync(path.join(DIST,entry.path.slice(1),"index.html")),"unpublished recommendation: "+entry.path);
   assert.notEqual(pagePath,entry.path,"article must not recommend itself");
   const expectedSeed=JSON.parse(read(pagePath.slice(1)+"index.html").split('<script id="crew-research-seed" type="application/json">')[1].split("</script>")[0]);
   assert.deepEqual(expectedSeed.related,entries,"hydration data and discovery manifest disagree: "+pagePath);
  }
 }

 assert.equal(urls.length,expected.length,"sitemap should include only public SSG routes");
 assert.deepEqual([...urls].sort(),expected.sort(),"sitemap URLs do not match SSG routes");
 assert.ok(headers.includes("https://magic76-github-io.pages.dev/*"),"preview host missing noindex");
 assert.ok(headers.includes("https://:version.magic76-github-io.pages.dev/*"),"branch preview missing noindex");
 const previewRules=headers.trim().split(/\n\s*\n/).filter(rule=>rule.includes("https://"));
 assert.equal(previewRules.length,2,"two Cloudflare preview aliases");
 assert.ok(previewRules.every(rule=>rule.includes("X-Robots-Tag: noindex")),"each preview host needs noindex");
 assert.match(headers,/\/version\.json\s*\n\s*Cache-Control: no-store/,"live version feed must not be cached");
 assert.ok(!headers.includes("https://www.3sssi.com/"),"production must remain indexable");
 assert.ok(!headers.includes("no-transform"),"Cloudflare automatic Web Analytics needs unmodified HTML");
});

check("public product SEO content is visible in the real React SSG screens",()=>{
 for(const slug of ["teacher","story","fortune"]){
  const html=read(slug+"/index.html"),en=read("en/"+slug+"/index.html");
  assert.ok(html.includes('class="section crew-product-about"'),"public explainer missing: "+slug);
  assert.ok(en.includes('class="section crew-product-about"'),"English explainer missing: "+slug);
  assert.ok(html.includes('<a')&&en.includes('<a'),"explainers must link to real product actions");
  assert.ok(!html.includes('class="seo-fallback"'),"avoid extra marketing page");
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


check("Cloudflare build emits version metadata matching the currently shipped JavaScript",()=>{
 const metadata=JSON.parse(read("version.json"));
 assert.equal(metadata.schema,1);
 assert.ok(typeof metadata.buildId==="string"&&metadata.buildId.length>8,"missing build ID");
 assert.ok(typeof metadata.builtAt==="string"&&Number.isFinite(Date.parse(metadata.builtAt)),"missing build time");
 assert.ok(metadata.commit===null||/^[a-f0-9]{7,40}$/i.test(metadata.commit),"invalid SHA");
 assert.ok(["Production","Preview","Cloudflare Pages"].includes(metadata.environment));
 const jsFiles=fs.readdirSync(path.join(DIST,"assets")).filter(file=>file.endsWith(".js"));
 assert.ok(jsFiles.some(file=>read("assets/"+file).includes(metadata.buildId)),"version feed differs from running app build");
});


check("home SSG starts with neutral Gemini key status and no false setup banner",()=>{
 for(const page of ["index.html","en/index.html"]){
  const body=read(page).split("</head>")[1]||"";
  assert.ok(body.includes('class="status crew-key-status-placeholder"'),"missing neutral status placeholder: "+page);
  assert.doesNotMatch(body,/class="[^"]*crew-home-setup(?:\s|")/,"false setup banner in SSG body: "+page);
  assert.doesNotMatch(body,/class="[^"]*status (?:connected|pending)"/,"personal connection state in public SSG: "+page);
 }
});

check("preview language routes serve noindex HTML and are excluded from the sitemap",()=>{
 const locales=JSON.parse(fs.readFileSync(path.join(ROOT,"config/ui-locales.json"),"utf8")).locales;
 const sitemap=read("sitemap.xml");
 const rewrites=read("_redirects");
 for(const {code,stage} of locales){
  if(stage==="published")continue;
  const preview=read(code+"/index.html");
  assert.ok(preview.includes('<html lang="'+(code==="zh-CN"?"zh-Hans":code)+'">'));
  assert.ok(preview.includes('name="robots" content="noindex,follow"'));
  assert.ok(preview.includes('name="crew-i18n-stage" content="'+stage+'"'));
  assert.ok(!preview.includes('rel="canonical"'));
  assert.ok(!sitemap.includes("https://www.3sssi.com/"+code+"/"));
  assert.ok(rewrites.includes("/"+code+"/* /"+code+"/index.html 200"));
 }
 assert.ok(!rewrites.includes("/en/*"),"published English routes must retain SSG");
});
