const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const ROOT=path.resolve(__dirname,"..");
const DIST=path.join(ROOT,"dist");
const read=p=>fs.readFileSync(path.join(DIST,p),"utf8");
const pages=["","teacher","story","fortune","research","games"];
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
 for(const slug of ["teacher","story","fortune","research","games","settings"])assert.ok(routes.includes('path="/'+slug+'"'));
 assert.ok(!routes.includes("<BuildVersion/>"),"BuildVersion must not render globally");
 const settings=fs.readFileSync(path.join(ROOT,"web-spa/src/pages/SettingsPage.tsx"),"utf8");
 assert.ok(settings.includes("<BuildVersion/>"),"BuildVersion must be rendered within Settings");
});
check("Pages nearest 404 isolates missing hashed bundles while keeping SPA deep links",()=>{
 const notFoundPath="assets/build/404.html";
 const notFoundFile=path.join(DIST,notFoundPath);
 assert.ok(fs.existsSync(notFoundFile),"build must emit the nested Pages 404 page");
 assert.ok(!fs.existsSync(path.join(DIST,"404.html")),"top-level 404 would disable SPA fallback");
 assert.ok(!fs.existsSync(path.join(DIST,"assets","404.html")),"unversioned images must retain SPA fallback");
 assert.ok(fs.statSync(notFoundFile).size>0&&fs.statSync(notFoundFile).size<2048,"asset 404 must stay tiny");
 const notFound=read(notFoundPath);
 assert.match(notFound,/<title>404<\/title>/);
 assert.doesNotMatch(notFound,/<script\b|<link\b|\/assets\/|\bmodule\b|\.js\b|\.css\b/i,"404 must not load any app assets");
 const index=read("index.html");
 assert.notEqual(notFound,index,"nested 404 must not be the SPA index");

 // Pages merges ALL matching _headers blocks in file order. `! Cache-Control`
 // removes prior matches; a later Cache-Control then replaces immutable.
 function userCacheControl(requestPath){
  let values=[];
  for(const block of read("_headers").split(/\r?\n\s*\r?\n/)){
   const lines=block.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith("#"));
   if(!lines.length)continue;
   const [pattern,...directives]=lines;
   if(!pattern.startsWith("/"))continue; // Preview-host rules do not match www.
   const match=new RegExp("^"+pattern.split("*").map(part=>part.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join(".*")+"$");
   if(!match.test(requestPath))continue;
   for(const directive of directives){
    if(/^!\s+Cache-Control$/i.test(directive))values=[];
    const set=directive.match(/^Cache-Control:\s*(.+)$/i);
    if(set)values.push(set[1]);
   }
  }
  return values.join(", ");
 }
 // Pure-node emulation of OSS Pages handler.ts: exact asset first, nearest
 // ancestor 404.html next, root /index.html SPA fallback only if none exists.
 // The real handler additionally redirects /404.html to extensionless /404.
 function pagesLookup(requestPath){
  assert.match(requestPath,/^\/[a-zA-Z0-9/_\-.]+$/);
  assert.ok(!requestPath.includes(".."));
  let asset=requestPath.slice(1),status=200;
  if(fs.existsSync(path.join(DIST,asset))&&fs.statSync(path.join(DIST,asset)).isFile()){
   // Exact file.
  }else if(fs.existsSync(path.join(DIST,asset+".html"))){
   asset+=".html"; // Extensionless HTML alias.
  }else{
   let cwd=requestPath,nearest=null;
   while(cwd){
    cwd=cwd.slice(0,cwd.lastIndexOf("/"));
    const candidate=path.posix.join(cwd,"404.html").replace(/^\//,"");
    if(fs.existsSync(path.join(DIST,candidate))){nearest=candidate;break;}
   }
   if(nearest){status=404;asset=nearest;}
   else asset="index.html";
  }
  // OSS attachHeaders() strips ALL user cache-control on a 404 and sets no-store.
  const cacheControl=status===404?"no-store":userCacheControl(requestPath);
  return {status,asset,body:fs.readFileSync(path.join(DIST,asset)),cacheControl};
 }
 const missing="/assets/build/does-not-exist-123.js";
 assert.ok(!fs.existsSync(path.join(DIST,missing.slice(1))),"missing-chunk fixture must not exist in dist");
 assert.match(userCacheControl(missing),/immutable/,"missing build URLs do match the broad immutable rule before 404 stripping");
 const fail=pagesLookup(missing);
 assert.equal(fail.status,404);
 assert.equal(fail.asset,notFoundPath);
 assert.equal(fail.body.toString(),notFound);
 assert.notEqual(fail.body.toString(),index);
 assert.equal(fail.cacheControl,"no-store","404 must strip immutable, even though its URL matches the wildcard");

 const hashed=index.match(/src="\/(assets\/build\/[^"/]+-[^"/]+\.js)"/);
 assert.ok(hashed,"must find a real fingerprinted entry script");
 const real=pagesLookup("/"+hashed[1]);
 assert.equal(real.status,200);
 assert.equal(real.asset,hashed[1]);
 assert.ok(real.body.equals(fs.readFileSync(path.join(DIST,hashed[1]))));
 assert.equal(real.cacheControl,"public, max-age=31536000, immutable");

 // Some deep links have a generated .html SPA shell (e.g. teacher/roles).
 // Others rely on the root index.html. Neither may become the nested 404.
 assert.ok(!fs.existsSync(path.join(DIST,"story/read/x.html")),"story/read/x must exercise the true SPA fallback");
 for(const route of ["/teacher/roles","/story/read/x"]){
  const deep=pagesLookup(route);
  assert.equal(deep.status,200,route);
  assert.notEqual(deep.asset,notFoundPath,route);
  assert.notEqual(deep.body.toString(),notFound,route);
  const htmlAlias=route.slice(1)+".html";
  const expectedAsset=fs.existsSync(path.join(DIST,htmlAlias))?htmlAlias:"index.html";
  assert.equal(deep.asset,expectedAsset,route);
  assert.ok(deep.body.equals(fs.readFileSync(path.join(DIST,expectedAsset))),route);
 }
 const missingPhoto="/assets/does-not-exist-character-123.webp";
 assert.ok(!fs.existsSync(path.join(DIST,missingPhoto.slice(1))));
 const photo=pagesLookup(missingPhoto);
 assert.equal(photo.status,200,"unversioned missing photos still SPA-fallback today");
 assert.equal(photo.asset,"index.html");
 assert.doesNotMatch(photo.cacheControl,/immutable/);

 // Direct requests to the 404 HTML are NOT 404-status responses: Pages can
 // redirect /404.html to /404 and serve its HTML as a normal 200 asset.
 for(const url of ["/assets/build/404.html","/assets/build/404"]){
  assert.equal(userCacheControl(url),"no-store",url+" must detach immutable before setting no-store");
 }
 const direct=pagesLookup("/assets/build/404");
 assert.equal(direct.status,200);
 assert.equal(direct.asset,notFoundPath);
 assert.equal(direct.cacheControl,"no-store");
});

check("twelve static SEO entry points boot the same functional React bundle",()=>{
 const root=read("index.html");
 const script=root.match(/<script[^>]*src="(\/assets\/[^"]+\.js)"/);
  const cssFiles=fs.readdirSync(path.join(DIST,"assets","build")).filter(file=>/^index-[^/]+\.css$/.test(file));
 assert.equal(cssFiles.length,1,"expected exactly one initial-entry Vite CSS bundle (lazy routes may emit separate CSS)");
 const compiledCss=read("assets/build/"+cssFiles[0]);
 const coreCssTag='<link rel="stylesheet" href="/assets/build/'+cssFiles[0]+'">';
 const manifest=JSON.parse(read(".vite/manifest.json"));
 // Every CSS file reachable through the initial Vite entry's static imports
 // must be present on every SSG page, including common-component stylesheets
 // split into a separate Arrow-*.css (or any future shared CSS chunk).
 const entryKey=Object.keys(manifest).find(key=>manifest[key].isEntry&&manifest[key].file===script[1].slice(1));
 assert.ok(entryKey,"missing Vite index entry in manifest");
 const entryCssAssets=new Set(),entryVisited=new Set();
 function collectEntryCss(key){
  if(entryVisited.has(key))return;
  entryVisited.add(key);
  const chunk=manifest[key];
  assert.ok(chunk,"missing Vite static import "+key);
  for(const dependency of chunk.imports||[])collectEntryCss(dependency);
  for(const asset of chunk.css||[])entryCssAssets.add(asset);
 }
 collectEntryCss(entryKey);
 assert.ok(entryCssAssets.has("assets/build/"+cssFiles[0]),"manifest must contain the functional app CSS");
 const functionalCss=[...entryCssAssets].filter(asset=>{
  const css=read(asset);
  return css.includes(".app-header")&&css.includes(".global-nav");
 });
 assert.deepEqual(functionalCss,["assets/build/"+cssFiles[0]],"keep exactly one verified functional stylesheet");
 // HomePage imports HomeShortsPreview, whose CSS is extracted separately.
 function expectedRouteCss(name){
  const visited=new Set(),assets=new Set();
  function visit(key){
   if(visited.has(key))return;
   visited.add(key);
   const entry=manifest[key];
   assert.ok(entry,"missing Vite manifest entry "+key);
   for(const dependency of entry.imports||[])visit(dependency);
   for(const css of entry.css||[])if(css!=="assets/build/"+cssFiles[0])assets.add(css);
  }
  visit(name);
  return assets;
 }
 const pageStyles={
  "":expectedRouteCss("src/pages/HomePage.tsx"),
  games:expectedRouteCss("src/games/CrewPlayHubPage.tsx")
 };
 assert.ok(pageStyles[""].size>=2,"homepage must include its own and imported preview CSS");
 assert.ok(pageStyles.games.size>=1,"games page must include route CSS");

 assert.ok(script,"missing app JS");assert.ok(root.includes(coreCssTag),"missing hashed, cacheable app CSS link");
 assert.ok(compiledCss.length>10000&&compiledCss.includes(".global-nav"));
 assert.ok(!root.includes("data-crew-react-css"),"do not duplicate all app CSS into route HTML");
 for(const locale of ["zh","en"])for(const slug of pages){
  const pathname=(locale==="en"?"en/":"")+(slug?slug+"/":"")+"index.html";
  const html=read(pathname);
  const canonical="https://koolo.app/"+(locale==="en"?"en/":"")+(slug?slug+"/":"");
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
  assert.ok(html.includes('class="crew-home"')||html.includes('class="hero"')||html.includes('class="hero ')||html.includes('class="briefing')||html.includes('class="crew-play-hero"'),"product screen missing: "+pathname);
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
  assert.ok(head.indexOf(coreCssTag)>=0&&head.indexOf(coreCssTag)<head.indexOf(moduleOpen),"hashed app CSS must precede JS: "+pathname);
  const literalEscape=String.fromCharCode(92)+"n";
  assert.ok(!head.includes("</style>"+literalEscape),"escaped \\n leaked after CSS: "+pathname);
  assert.ok(!head.includes("</script>"+literalEscape),"escaped \\n leaked after script: "+pathname);
  assert.ok(head.includes("html.crew-dynamic-route #root"),"early deep-route guard must remain in head: "+pathname);
  const inlineGuard=head.split("<script>")[1]?.split("</script>")[0];
  assert.ok(inlineGuard,"missing inline route guard: "+pathname);
  assert.doesNotThrow(()=>new vm.Script(inlineGuard),"route guard must be valid browser JavaScript: "+pathname);

  assert.ok(!head.includes("data-crew-react-css"),"avoid route-duplicated styles: "+pathname);
  assert.ok(head.includes(coreCssTag),"SSR shell must load fingerprinted CSS: "+pathname);
  for(const asset of entryCssAssets){
   const tag='<link rel="stylesheet" href="/'+asset+'">';
   assert.equal(head.split(tag).length-1,1,"missing or duplicate entry CSS "+asset+": "+pathname);
   assert.ok(head.indexOf(tag)<head.indexOf(moduleOpen),"late shared CSS "+asset+": "+pathname);
   assert.ok(read(asset).length>0,"empty entry CSS "+asset);
  }
  // SSG page-specific stylesheets also load from hashed, cacheable URLs
  // before JavaScript hydration, instead of repeating CSS in each document.
  for(const asset of pageStyles[slug]||[]){
   const cssTag='<link rel="stylesheet" href="/'+asset+'">';
   assert.ok(head.includes(cssTag),"missing initial route CSS "+asset+": "+pathname);
   assert.ok(head.indexOf(cssTag)<head.indexOf(moduleOpen),"late route CSS: "+pathname);
   assert.ok(read(asset).length>0,"route CSS file is missing/empty: "+asset);
  }

  assert.ok(html.includes('<h1>'),pathname);
  assert.ok(html.includes('hreflang="en"'),pathname);
  assert.ok(html.includes('hreflang="zh-Hant"'),pathname);
  assert.ok(!html.includes('data-crew-seo-fallback'),"no redundant SEO stylesheet: "+pathname);
  assert.ok(!html.includes('href="/crew-app/#/'),"Public links must stay on clean product routes: "+pathname);
  assert.ok(!html.includes('location.replace("crew-app/#/') ,pathname);
 }
 assert.ok(fs.existsSync(path.join(DIST,script[1].slice(1))));
 assert.ok(fs.existsSync(path.join(DIST,"assets","build",cssFiles[0])));
});
check("search-intent guides serve real localized SSG HTML and enter the sitemap",()=>{
 const slugs=["ai-english-speaking","ai-conversation-partner","travel-english-dialogues","english-pronunciation","gemini-key-for-ai-practice"];
 const domain="https://koolo.app",sitemap=read("sitemap.xml");
 for(const slug of slugs){
  for(const locale of ["zh","en"]){
   const prefix=locale==="en"?"en/":"",relative=prefix+"guides/"+slug+"/index.html";
   const html=read(relative),path="/"+prefix+"guides/"+slug;
   const canonical=domain+path+"/";
   assert.ok(html.includes('<link rel="canonical" href="'+canonical+'">'),"canonical: "+relative);
   assert.ok(html.includes('<meta name="robots" content="index,follow">'),"robots: "+relative);
   assert.ok(html.includes('data-crew-ssg-path="'+path+'"'),"hydration: "+relative);
   assert.ok(html.includes('<article class="crew-guide">'),"real article HTML: "+relative);
   assert.ok(html.includes('crew-guide-section'),"substantial guide content: "+relative);
   assert.ok(html.includes('class="global-nav"'),"same Crew shell: "+relative);
   assert.ok(html.includes('<h1>'),"heading: "+relative);
   assert.ok(html.includes('href="'+domain+"/guides/"+slug+'/"'),"Chinese hreflang: "+relative);
   assert.ok(html.includes('href="'+domain+"/en/guides/"+slug+'/"'),"English hreflang: "+relative);
   assert.ok(!html.includes('/@fs/'),"Vite file system leak: "+relative);
   assert.ok(!html.includes('href="/crew-app/#/'),"legacy route leak: "+relative);
   assert.ok(sitemap.includes("<loc>"+canonical+"</loc>"),"guide omitted from sitemap: "+relative);
   const json=html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1];
   assert.ok(json,"structured data missing: "+relative);
   const graph=JSON.parse(json)["@graph"];
   assert.ok(graph.some(x=>x["@type"]==="BreadcrumbList"));
   assert.ok(graph.some(x=>x["@type"]==="WebPage"&&x.url===canonical));
  }
 }
});
check("travel guide publishes free dialogue quiz in both indexed locales",()=>{
 for(const prefix of ["","en/"]){
  const html=read(prefix+"guides/travel-english-dialogues/index.html");
  assert.ok(html.includes('id="travel-english-quiz"'),prefix);
  assert.ok(html.includes("May I see your passport, please?"),prefix);
  assert.ok(html.includes('<progress'),prefix);
 }
});
check("pronunciation guides ship the free ed ending quiz in both published locales",()=>{
 for(const prefix of ["","en/"]){
  const html=read(prefix+"guides/english-pronunciation/index.html");
  assert.ok(html.includes('id="ed-ending-quiz"'),"quiz missing: "+prefix);
  assert.ok(html.includes('id="ed-quiz-heading"'),"accessible heading missing: "+prefix);
  assert.ok(html.includes("washed"),"initial question missing: "+prefix);
  for(const choice of ["/t/","/d/","/ɪd/"])assert.ok(html.includes(choice),choice);
  assert.ok(html.includes('<progress'),"progress missing: "+prefix);
 }
 for(const prefix of ["","en/"])assert.ok(!read(prefix+"guides/ai-english-speaking/index.html").includes('id="ed-ending-quiz"'),"quiz must stay scoped");
});
check("English Gemini key guide preserves its heading and direct account CTA in rendered HTML",async()=>{
 const {decodeHtmlText}=await import("../scripts/research-seo.mjs");
 const html=read("en/guides/gemini-key-for-ai-practice/index.html");
 const heading=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i);
 assert.ok(heading);
 assert.equal(decodeHtmlText(heading[1]),"How to use a Gemini API key for AI voice chat");
 assert.ok(html.includes('href="/en/account#settings-gemini"'),"localized direct Gemini setup link missing");
 assert.ok(read("guides/gemini-key-for-ai-practice/index.html").includes('href="/account#settings-gemini"'),"Chinese direct Gemini setup link missing");
});
check("Crew Play SSG has real game cards with correct bilingual canonical and JSON-LD",()=>{
 const origin="https://koolo.app",sitemap=read("sitemap.xml");
 for(const prefix of ["","en/"]){
  const url=origin+"/"+prefix+"games/",html=read(prefix+"games/index.html");
  assert.ok(sitemap.includes("<loc>"+url+"</loc>"),"games sitemap entry missing: "+url);
  assert.ok(html.includes('<link rel="canonical" href="'+url+'">'),"wrong canonical: "+url);
  assert.ok(html.includes('data-crew-ssg-path="/'+prefix+'games"'),"wrong hydration route: "+url);
  assert.ok(html.includes('class="crew-play-catalog"'),"missing actual SSG game directory: "+url);
  const schema=html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1];
  assert.ok(schema,"missing JSON-LD: "+url);
  const list=JSON.parse(schema)["@graph"].find(x=>x["@type"]==="ItemList");
  assert.equal(list?.itemListElement?.length,7,"missing games in indexed directory: "+url);
  assert.ok(html.includes('meta name="robots" content="index,follow"'),"games hub should be indexable: "+url);
 }
});


check("indexed game URLs each ship route-specific hydrated SSG HTML, metadata and accessible links",()=>{
 const games=["friend-gomoku","connect4","twenty-questions","reversi","mystery","1a2b","taboo","number-bomb","memory","crazy-court","werewolf","truth-news","nonsense"];
 const sitemap=read("sitemap.xml");
 for(const locale of ["","en/"])for(const game of games){
  const path=locale+"games/"+game+"/";
  const canonical="https://koolo.app/"+path;
  const html=read(path+"index.html");
  assert.ok(sitemap.includes("<loc>"+canonical+"</loc>"),"missing indexed URL "+path);
  assert.ok(html.includes('<link rel="canonical" href="'+canonical+'">'),"bad canonical "+path);
  assert.ok(html.includes('<meta name="robots" content="index,follow">'),"not indexable "+path);
  assert.ok(html.includes('data-crew-ssg-path="/'+path.slice(0,-1)+'"'),"hydration route missing "+path);
  assert.ok(html.includes('<h1'),"missing semantic game heading "+path);
  assert.ok(html.includes('class="app-header"'),"missing actual game shell "+path);
  assert.ok(html.includes('hreflang="en"')&&html.includes('hreflang="zh-Hant"'),"game language alternates "+path);
  assert.ok(!html.includes("/@fs/"),"Vite dev-only path "+path);
  const match=html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
  assert.ok(match,"missing JSON-LD "+path);
  const graph=JSON.parse(match[1])["@graph"];
  assert.ok(graph.some(item=>item["@type"]==="BreadcrumbList"),"breadcrumbs "+path);
  assert.ok(graph.some(item=>item["@type"]==="SoftwareApplication"&&item.applicationCategory==="GameApplication"),"game schema "+path);
 }
});
check("English research detail deep links redirect to zh articles rather than the indexable homepage fallback",()=>{
 const lines=read("_redirects").trim().split(/\r?\n/);
 assert.ok(lines.includes("/en/research/:date/:article/ /research/:date/:article/ 301"));
 assert.ok(lines.includes("/en/research/:date/:article /research/:date/:article/ 301"));
 assert.ok(!lines.some(line=>/^\/en\/research\/\s/.test(line)),"English research hub must not be redirected");
 assert.ok(fs.existsSync(path.join(DIST,"en","research","index.html")),"English research hub must remain published");
 assert.ok(fs.existsSync(path.join(DIST,"research","index.html")),"Chinese research hub must remain published");
});

check("deep interactive routes keep their URLs and noindex SPA shell, including query strings",()=>{
 const shell=read("_app-noindex.html");
 const redirects=read("_redirects");
 assert.ok(shell.includes('name="robots" content="noindex,follow"'));
 assert.ok(!shell.includes('rel="canonical"'));
 assert.ok(shell.includes('src="/assets/')&&shell.includes('id="root"'),"private shell must boot the React app");

 // Physical files are served by Pages at their clean, extensionless paths.
 // /teacher/roles?mode=friends must never become /_app-noindex?mode=friends.
 for(const route of ["/chat","/learn","/magic","/settings","/teacher/live","/teacher/roles"]){
  for(const prefix of ["","/en"]){
   const publicPath=prefix+route;
   const file=publicPath.slice(1)+".html";
   assert.equal(read(file),shell,"missing private SPA shell at "+publicPath);
   assert.ok(!redirects.split("\n").some(line=>line.startsWith(publicPath+" ")),"private route unexpectedly redirected: "+publicPath);
  }
 }
 for(const route of ["/story/read/*","/en/story/read/*","/briefing/*"]){
  assert.ok(redirects.includes(route+" /_app-noindex 200"),"missing clean-path dynamic route proxy "+route);
 }
 assert.doesNotMatch(redirects,/\.html 200(?:\n|$)/,"HTML rewrite targets trigger Cloudflare's clean URL redirect");
 for(const route of ["/games/friend-gomoku","/games/connect4","/games/1a2b","/games/nonsense","/research/*"]){
  assert.ok(!redirects.split("\n").some(line=>line.startsWith(route+" ")),"indexable page incorrectly rewritten "+route);
 }
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
 const domain="https://koolo.app";
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
 const {readPublishedResearch,articlePath,articleCanonical,indexableArticle,hasArticleHeading,articleHeadingText}=await import("../scripts/research-seo.mjs");
 const {days}=readPublishedResearch(ROOT);
 let total=0,indexed=0;
 for(const [date,day] of days)for(const item of day.items){
  total++;
  const route=articlePath(date,item);
  const html=read(route.slice(1)+"index.html");
  const canonical=articleCanonical(date,item);
  assert.ok(html.includes('<div id="root" data-crew-ssg-path="'+route.slice(0,-1)+'">'),"missing article hydration marker: "+route);
  assert.ok(html.includes('<article class="briefing briefing-detail">'),"must render actual React article: "+route);
  assert.ok(hasArticleHeading(html,item.title),"article title missing in HTML: "+route+" (actual h1: "+JSON.stringify(articleHeadingText(html)?.slice(0,120)??null)+")");
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

 // SEO guides are indexed only in published Chinese and English locales.
 for(const slug of ["ai-english-speaking","ai-conversation-partner","travel-english-dialogues","english-pronunciation","gemini-key-for-ai-practice"]){
  expected.push(domain+"/guides/"+slug+"/");
  expected.push(domain+"/en/guides/"+slug+"/");
 }
 for(const slug of ["games/friend-gomoku","games/connect4","games/twenty-questions","games/reversi","games/mystery","games/1a2b","games/taboo","games/number-bomb","games/memory","games/crazy-court","games/werewolf","games/truth-news","games/nonsense"]){
  expected.push(domain+"/"+slug+"/");expected.push(domain+"/en/"+slug+"/");
 }
 for(const slug of ["bazi","bazi/jia-wood","bazi/yi-wood","bazi/bing-fire","bazi/ding-fire","bazi/wu-earth","bazi/ji-earth","bazi/geng-metal","bazi/xin-metal","bazi/ren-water","bazi/gui-water","bazi/five-elements","bazi/ten-gods","bazi/luck-cycles"]){expected.push(domain+"/fortune/"+slug+"/",domain+"/en/fortune/"+slug+"/")}
 for(const slug of ["numerology",...Array.from({length:9},(_,i)=>"numerology/"+(i+1))]){expected.push(domain+"/fortune/"+slug+"/",domain+"/en/fortune/"+slug+"/")}
 for(const slug of ["free-english-speaking","ai-english-conversation","english-interview-practice","2027-bazi-luck","2027-personal-year","2027-goat-zodiac"]){expected.push(domain+"/guides/"+slug+"/",domain+"/en/guides/"+slug+"/")}
 for(const slug of ["travel","business","daily","teamwork","tickets","services"]){expected.push(domain+"/teacher/course/"+slug+"/",domain+"/en/teacher/course/"+slug+"/")}
 // Published editorial entries must be represented by actual HTML documents, not SPA fallbacks.
 const {readEditorial}=await import("../scripts/editorial-articles.mjs");
 const editorial=readEditorial(ROOT);
 for(const item of editorial)for(const locale of ["","en/"]){
  const route="/"+locale+"articles/"+item.slug+"/",canonical=domain+route;
  expected.push(canonical);
  const html=read(locale+"articles/"+item.slug+"/index.html");
  assert.ok(html.includes('<link rel="canonical" href="'+canonical+'">'),"editorial canonical: "+route);
  assert.ok(html.includes('data-editorial-ssg-path="'+route+'"'),"missing editorial HTML content: "+route);
  assert.ok(html.includes('<meta name="robots" content="index,follow">'),"editorial page indexability: "+route);
 }
 for(const locale of ["","en/"]){
  const route="/"+locale+"articles/";
  expected.push(domain+route);
  assert.ok(read(locale+"articles/index.html").includes('data-editorial-ssg-path="'+route+'"'),"editorial index missing: "+route);
 }
 assert.equal(urls.length,expected.length,"sitemap should enumerate all public and playable game routes");
 assert.deepEqual([...urls].sort(),expected.sort(),"sitemap URLs do not match SSG routes");
 assert.ok(headers.includes("https://magic76-github-io.pages.dev/*"),"preview host missing noindex");
 assert.ok(headers.includes("https://:version.magic76-github-io.pages.dev/*"),"branch preview missing noindex");
 const previewRules=headers.trim().split(/\n\s*\n/).filter(rule=>rule.includes("https://"));
 assert.equal(previewRules.length,2,"two Cloudflare preview aliases");
 assert.ok(previewRules.every(rule=>rule.includes("X-Robots-Tag: noindex")),"each preview host needs noindex");
 assert.match(headers,/\/version\.json\s*\n\s*Cache-Control: no-store/,"live version feed must not be cached");
 assert.match(headers,/\/assets\/build\/\*\s*\n\s*Cache-Control: public, max-age=31536000, immutable/,"only hashed bundles may be cached immutably");
 assert.ok(!/\/assets\/\*\s*\n\s*Cache-Control:.*immutable/.test(headers),"unversioned images must not be immutable");
 assert.ok(!headers.includes("https://koolo.app/"),"production must remain indexable");
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
 assert.ok(!html.includes("crew_ui_locale_v1"));
});


check("Cloudflare build emits version metadata matching the currently shipped JavaScript",()=>{
 const metadata=JSON.parse(read("version.json"));
 assert.equal(metadata.schema,1);
 assert.ok(typeof metadata.buildId==="string"&&metadata.buildId.length>8,"missing build ID");
 assert.ok(typeof metadata.builtAt==="string"&&Number.isFinite(Date.parse(metadata.builtAt)),"missing build time");
 assert.ok(metadata.commit===null||/^[a-f0-9]{7,40}$/i.test(metadata.commit),"invalid SHA");
 assert.ok(["Production","Preview","Cloudflare Pages"].includes(metadata.environment));
 const jsFiles=fs.readdirSync(path.join(DIST,"assets","build")).filter(file=>file.endsWith(".js"));
 assert.ok(jsFiles.some(file=>read("assets/build/"+file).includes(metadata.buildId)),"version feed differs from running app build");
});


check("home SSG omits Gemini header status badges and false setup banners",()=>{
 for(const page of ["index.html","en/index.html"]){
  const body=read(page).split("</head>")[1]||"";
  assert.doesNotMatch(body,/crew-key-status-placeholder/,"obsolete Gemini header status placeholder in SSG body: "+page);
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
  assert.ok(!sitemap.includes("https://koolo.app/"+code+"/"));
  assert.ok(rewrites.includes("/"+code+"/* /"+code+"/ 200"),"preview locale must use its canonical directory URL");;
 }
 assert.ok(!rewrites.includes("/en/*"),"published English routes must retain SSG");
});


check("all published SSG OG images are present, 1200x630 PNG, and route-specific",async()=>{
 const origin="https://koolo.app",paths=[];
 const push=route=>paths.push(route+"index.html");
 for(const lang of ["","en/"]){
  for(const slug of pages)push(lang+(slug?slug+"/":""));
  for(const slug of ["travel","business","daily","teamwork","tickets","services"])push(lang+"teacher/course/"+slug+"/");
  for(const slug of ["ai-english-speaking","ai-conversation-partner","travel-english-dialogues","english-pronunciation","gemini-key-for-ai-practice"])push(lang+"guides/"+slug+"/");
  for(const slug of ["friend-gomoku","connect4","twenty-questions","reversi","mystery","1a2b","taboo","number-bomb","memory","crazy-court","werewolf","truth-news","nonsense"])push(lang+"games/"+slug+"/");
 }
 const {readPublishedResearch}=await import("../scripts/research-seo.mjs");
 const {days}=readPublishedResearch(ROOT);
 for(const [date,day] of days)for(const item of day.items)push("research/"+date+"/"+item.id+"/");
 for(const page of paths){
  const html=read(page);
  const meta=tag=>html.match(new RegExp('<meta '+tag+' content="([^"]+)">'))?.[1];
  const og=meta('property="og:image"'),secure=meta('property="og:image:secure_url"'),twitter=meta('name="twitter:image"');
  assert.ok(og&&og.startsWith(origin+"/social/"),"missing OG URL: "+page);
  assert.equal(secure,og,"OG HTTPS version must match "+page);
  assert.equal(twitter,og,"Twitter preview must match "+page);
  const imagePath=new URL(og).pathname.slice(1);
  assert.ok(!imagePath.includes("..")&&imagePath.startsWith("social/"),"unsafe OG path "+page);
  const png=fs.readFileSync(path.join(DIST,imagePath));
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10],"bad PNG "+page);
  assert.equal(png.readUInt32BE(16),1200,"wrong width "+page);
  assert.equal(png.readUInt32BE(20),630,"wrong height "+page);
  assert.ok(meta('property="og:image:alt"'),"missing accessible OG alt "+page);
  if(/^en\/?$|^index\.html$/.test(page))assert.equal(og,origin+"/social/koolo-shared-v1.png");
 }
 for(const slug of ["teacher","story","fortune","research","games"]){
  const url=origin+"/social/og/"+slug+"-koolo-v1.png";
  for(const lang of ["","en/"])assert.ok(read(lang+slug+"/index.html").includes('<meta property="og:image" content="'+url+'">'));
 }
 for(const slug of ["travel","business","daily","teamwork","tickets","services"]){
  for(const lang of ["zh","en"]){
   const html=read((lang==="en"?"en/":"")+"teacher/course/"+slug+"/index.html");
   assert.ok(html.includes(origin+"/social/og/course/"+slug+"-"+lang+".png"),slug+" "+lang);
  }
 }
});


check("Fortune challenge URL is readable by link preview crawlers without running React",()=>{
 for(const relative of ["fortune/reading.html","en/fortune/reading.html"]){
  const html=read(relative),head=html.split("</head>")[0];
  for(const name of ["og:title","og:description","og:image","og:url","twitter:card"]){
   assert.match(head,new RegExp('(?:property|name)="'+name+'"'),relative+" missing "+name);
  }
  assert.ok(head.includes("我算出了自己的命格身份！換你看看，你是哪一型？"),relative);
  assert.ok(head.includes("https://koolo.app/social/og/fortune-koolo-v1.png"),relative);
  assert.ok(head.includes('content="summary_large_image"'),relative);
  assert.ok(!head.includes("birthDate")&&!head.includes("dayMaster"),"Never expose a personal chart in public OG");
  assert.ok(head.includes('name="robots" content="noindex,follow"'),"Private reading must not become indexable");
 }
});
