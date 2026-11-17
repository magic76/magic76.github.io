import {COURSE_SEO} from "./course-seo.mjs";
import {prerenderPublicRoutes} from "./ssg-renderer.mjs";
import {articleHead,articlePath,escapeHtml,safeJson,indexableArticle} from "./research-seo.mjs";
import {GAME_SEO_PAGES,GAME_SEO_SLUGS} from "./game-seo.mjs";
import {previewUrl,writePreview,writeStaticPreviews,replacePreviewMeta} from "./social-og.mjs";
import {readFileSync, writeFileSync, cpSync, existsSync, mkdirSync, rmSync, readdirSync} from "node:fs";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

/**
 * Cloudflare Pages build adapter. Keep existing GitHub Pages build intact until
 * custom-domain cutover; both environments run the exact same React App.
 *
 * Cloudflare Pages: npm run build:cloudflare, output directory: dist
 * No top-level 404.html: Pages serves index.html as SPA fallback for deep links.
 */
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const out=join(root,"dist");
const read=path=>readFileSync(join(root,path),"utf8");
if(!existsSync(join(out,"index.html")))throw Error("Missing Vite output. Run CREW_DEPLOY_TARGET=cloudflare vite build first.");

const viteHtml=readFileSync(join(out,"index.html"),"utf8");
const viteAssetTags=[...viteHtml.matchAll(/<(?:script|link)\b[^>]*>/g)]
  .map(x=>x[0]).filter(tag=>/\b(?:src|href)="\/assets\//.test(tag))
  // The regex above extracts only opening tags. Script tags are NOT void:
  // leaving out </script> breaks the document head and SPA module execution.
  .map(tag=>tag.startsWith("<script")?tag+"</script>":tag);
if(!viteAssetTags.some(tag=>tag.startsWith("<script"))||!viteAssetTags.some(tag=>tag.includes('rel="stylesheet"'))){
 throw Error("Cannot locate the Vite JS/CSS entries in dist/index.html");
}
// SSG must use fingerprinted cacheable CSS rather than repeating the full
// compiled stylesheet in every HTML document. Blocking stylesheet links in
// <head> ensure prerendered React markup is styled before its first paint.
const viteCSS=viteAssetTags.filter(tag=>tag.includes('rel="stylesheet"'));
if(viteCSS.length!==1)throw Error("Expected exactly one Vite stylesheet; got "+viteCSS.length);
const cssHref=viteCSS[0].match(/\bhref="(\/assets\/[^"]+\.css)"/)?.[1];
if(!cssHref)throw Error("Could not identify Vite stylesheet filename");
const compiledCssPath=join(out,cssHref.slice(1));
if(!existsSync(compiledCssPath))throw Error("Vite CSS file missing: "+cssHref);
const compiledCss=readFileSync(compiledCssPath,"utf8");
if(compiledCss.length<10000||!compiledCss.includes(".app-header")||!compiledCss.includes(".global-nav")){
 throw Error("Compiled CSS is missing the functional Crew UI styles");
}
if(/<\/style/i.test(compiledCss))throw Error("Unexpected closing style tag in compiled CSS");
const linkedAppStylesheet='<link rel="stylesheet" href="'+cssHref+'">';
const appTags=viteAssetTags.filter(tag=>!tag.includes('rel="stylesheet"')).join("\n  ");

// SSG sends fully rendered React.lazy markup, but Vite extracts each lazy
// page's CSS to a separate chunk loaded only after hydration (FOUC).
// Link CSS from the selected prerendered page and static imports in the
// document head, leaving unrelated lazy routes out of the critical path.
const viteManifest=JSON.parse(readFileSync(join(out,".vite","manifest.json"),"utf8"));
const ssgRouteEntries={
 "/":["src/pages/HomePage.tsx"],
 "/games":["src/games/CrewPlayHubPage.tsx"],
 "/games/friend-gomoku":["src/games/FriendGomokuPage.tsx"],
 "/games/1a2b":["src/games/NumberGamePage.tsx"],
 "/games/taboo":["src/games/TabooGamePage.tsx"],
 "/games/connect4":["src/games/CrewPlayGamePage.tsx"],
 "/games/twenty-questions":["src/games/CrewPlayGamePage.tsx"],
 "/games/reversi":["src/games/CrewPlayGamePage.tsx"],
 "/games/mystery":["src/games/CrewPlayGamePage.tsx"],
 "/teacher":["src/teacher/PracticePage.tsx"]
};
function routeCssLinks(route){
 const visited=new Set(),cssFiles=new Set();
 function visit(name){
  if(visited.has(name))return;
  visited.add(name);
  const entry=viteManifest[name];
  if(!entry)throw Error("Vite manifest is missing "+name+" for "+route);
  for(const dependency of entry.imports||[])visit(dependency);
  for(const asset of entry.css||[])cssFiles.add(asset);
 }
 for(const entry of ssgRouteEntries[route]||[])visit(entry);
 let links="";
 for(const asset of cssFiles){
  if(asset===cssHref.slice(1))continue; // Already linked for every public route.
  if(!asset.startsWith("assets/")||!asset.endsWith(".css")||asset.includes("..")||asset.includes("\\\\")||asset.includes("?"))throw Error("Invalid Vite CSS asset "+asset);
  const file=join(out,asset);
  if(!existsSync(file))throw Error("Missing route CSS: "+asset);
  links+=String.fromCharCode(10)+'<link rel="stylesheet" href="/'+asset+'">';
 }
 return links;
}


// Copy only confirmed public assets, not the entire repo (which could contain
// source code, config, tooling or secrets). Imported images are handled by Vite.
for(const folder of ["features","assets","social"]){
 if(!existsSync(join(root,folder)))throw Error("Required public asset folder is missing: "+folder);
 cpSync(join(root,folder),join(out,folder),{recursive:true,force:false,errorOnExist:false});
}
for(const filename of ["crew.js","crew-live.js","crew-live-input-worklet.js","crew-live-output-worklet.js","crew-live-ui.js","robots.txt","sitemap.xml","seo.css","_headers","_routes.json"]){
 if(!existsSync(join(root,filename)))throw Error("Required static runtime file is missing: "+filename);
 cpSync(join(root,filename),join(out,filename));
}
for(const filename of ["favicon.ico","favicon.svg","site.webmanifest"]){
 if(existsSync(join(root,filename)))cpSync(join(root,filename),join(out,filename));
}

// Briefing generator currently writes published JSON into crew-app/briefings.
// Keep the research feed fresh under the new /briefings/ API-free static path.
const briefing=join(root,"crew-app","briefings");
if(!existsSync(join(briefing,"index.json")))throw Error("Published briefing feed is missing (crew-app/briefings/index.json)");
cpSync(briefing,join(out,"briefings"),{recursive:true});

// The actual React App is rendered at build time for public routes. Vite handles
// TSX/assets; we reuse the old SEO files ONLY for their head metadata (title,
// canonical, hreflang, social images and JSON-LD). No marketing HTML is shipped.
const {pages:prerendered,articles,research,related,guides}=await prerenderPublicRoutes(root);
// Static 1200x630 OG PNGs, emitted at build time only.
writeStaticPreviews(out,{
 courseSlugs:COURSE_SEO.map(c=>c.slug),
 guideSlugs:[...new Set([...guides.values()].map(g=>g.slug))],
 gameSlugs:GAME_SEO_SLUGS
});
// Public editorial recommendations are available for client-side navigation.
writeFileSync(join(out,"briefings","discovery.json"),JSON.stringify(related));
// Head fragments must be separated by real whitespace. A literal backslash-n
// between tags makes the browser close <head> early and visibly render "\\n".
const newline=String.fromCharCode(10);
const routes=["","teacher","story","fortune","research","games"];
const normalizePath=path=>path.replace(/\/+$/,"")||"/";
// Fallback deep routes receive /index.html from Pages. If its SSG route differs
// from the real URL, hide the wrong screen before first paint until React mounts.
// Avoid regex backslash escapes inside the HTML-generating template string:
// \/ turns into / in a JS template literal and breaks the emitted JS.
const dynamicGuard=`<style>html.crew-dynamic-route #root{visibility:hidden!important}</style>
<script>(function(){
var canonical=document.querySelector('link[rel="canonical"]');if(!canonical)return;
var expected=new URL(canonical.href).pathname;
if(expected.length>1&&expected.endsWith("/"))expected=expected.slice(0,-1);
var current=location.pathname;
if(current.length>1&&current.endsWith("/"))current=current.slice(0,-1);
if(current!==expected)document.documentElement.classList.add("crew-dynamic-route");
})();</script>`;
for(const locale of ["zh","en"]){
 for(const slug of routes){
  const prefix=locale==="en"?"en/":"";
  const relative=prefix+(slug?slug+"/":"")+"index.html";
  const path=slug?"/"+slug:"/";
  const marketing=read(relative);
  if(!marketing.includes('name="robots" content="index,follow"'))throw Error("Missing SEO metadata: "+relative);
  let page=prerendered.get((locale==="en"?"en":"zh-TW")+":"+path);
  // Vite's build-time SSR importer expresses image URLs as /@fs/<cwd>/assets/..
  // but Pages serves those same first-party assets at /assets/... (copied above).
  // Never publish dev-server file-system paths in an SSG document.
  if(page)page=page.replace(/\/@fs\/[^"'\s<>)]*?\/assets\/([A-Za-z0-9_.\/-]+)/g,(_match,asset)=>"/assets/"+asset);
  if(!page||!page.includes("app-header"))throw Error("React SSG failed: "+relative);
  const publicPath=normalizePath((locale==="en"?"/en":"")+path);
  const bodyTheme=slug==="teacher"?"teacher-theme":slug==="story"?"story-theme":slug==="fortune"?"fortune-theme":"";
  const seed=slug==="research"&&research.days.get(research.index.days[0])
   ?{index:research.index,day:research.days.get(research.index.days[0])}:null;
  const seedTag=seed?'<script id="crew-research-seed" type="application/json">'+safeJson(seed)+'</script>':"";
  const html=marketing
   .replace('<link rel="stylesheet" href="/seo.css">',linkedAppStylesheet+routeCssLinks(path)+newline+"  "+appTags)
   .replace("</head>",seedTag+newline+dynamicGuard+newline+"</head>")
   .replace(/<body>[\s\S]*?<\/body>/,
    '<body'+(bodyTheme?' class="'+bodyTheme+'"':"")+'><div id="root" data-crew-ssg-path="'+publicPath+'">'+page+'</div></body>');
  const target=join(out,relative);
  mkdirSync(dirname(target),{recursive:true});
  writeFileSync(target,html);
 }
}

// The invite-only /circle board remains noindex and separate from Crew SSG.
const circleHtml=viteHtml.replace("<title>Crew</title>","<title>媽媽友小圈圈｜交流板</title>");
if(!circleHtml.includes('name="robots" content="noindex,follow"'))throw Error("Circle pilot must remain noindex");
mkdirSync(join(out,"circle"),{recursive:true});
writeFileSync(join(out,"circle","index.html"),circleHtml);

// Preview UI locales intentionally have NO SEO alternate, canonical, or sitemap.
// Cloudflare Pages rewrites their deep links to locale-specific noindex app shells.
const uiLocales=JSON.parse(read("config/ui-locales.json")).locales;
const previewLocales=uiLocales.filter(locale=>locale.stage!=="published");
for(const {code,stage} of previewLocales){
 const directory=join(out,code);
 mkdirSync(directory,{recursive:true});
 const lang=code==="zh-CN"?"zh-Hans":code;
 const html=viteHtml.replace(/<html lang="[^"]*">/,'<html lang="'+lang+'">')
  .replace("</head>",'<meta name="crew-i18n-stage" content="'+stage+'">'+newline+"</head>");
 if(!html.includes('name="robots" content="noindex,follow"'))throw Error("Preview must be noindex: "+code);
 writeFileSync(join(directory,"index.html"),html);
}
// Known interactive routes get a noindex SPA shell instead of the indexable homepage
// snapshot (whose canonical would incorrectly point to /). Keep exact public SSG
// routes out of these rewrites; do not use a broad wildcard over /games or /research.
const privatePaths=[
 "/phone","/chat","/explore","/mate","/town","/magic","/learn","/me","/orb",
 "/settings","/account","/privacy","/usage","/usage/feedback","/feedback","/research/board",
 "/briefing","/briefing/board","/friend/live","/teacher/live","/teacher/voice-lab","/teacher/board",
 ...["practice","fortune","shorts","friends","roles","learn","tutor","me","vocabulary","course","pronunciation","textbook","phrasebook","reports","memory","reading-library"].map(s=>"/teacher/"+s),
 ...["shelf","me","create","physical","live"].map(s=>"/story/"+s),
 ...["history","reading","live"].map(s=>"/fortune/"+s),
 ...["nonsense","crazy-court","werewolf","gomoku"].map(s=>"/games/"+s),
 "/timeline","/timeline/compare","/timeline/live"
];
const privatePatterns=["/story/edit/*","/story/read/*","/story/physical/*","/briefing/*"];
const privateShell=viteHtml.replace("<title>Crew</title>","<title>Crew · Interactive App</title>");
if(!privateShell.includes('name="robots" content="noindex,follow"'))throw Error("Private shell must be noindex");
// Cloudflare Pages canonicalizes *.html to extensionless URLs, even when
// the filename is used as a 200 proxy destination. That leaked /_app-noindex
// into the address bar and left React with an unknown (blank) route.
// Generate an actual HTML asset for every known private route; Pages serves
// /teacher/roles from /teacher/roles.html without changing the URL or ?mode.
// Keep a clean-URL proxy only for parameterized routes that cannot be emitted.
writeFileSync(join(out,"_app-noindex.html"),privateShell);
// Bots used by LINE and WhatsApp do not execute React. Emit OG tags in the
// actual /fortune/reading HTML response, without embedding private chart data.
const readingShareMeta=[
 '<meta property="og:type" content="website">',
 '<meta property="og:site_name" content="Crew Fortune">',
 '<meta property="og:locale" content="zh_TW">',
 '<meta property="og:title" content="我算出了自己的命格身份！換你看看，你是哪一型？">',
 '<meta property="og:description" content="Crew Fortune｜八字、塔羅生命靈數與印度星盤，看看你的命格身份是哪一型。">',
 '<meta property="og:url" content="https://koolo.app/fortune/reading">',
 '<meta property="og:image" content="https://koolo.app/social/og/fortune-chibi-v1.png">',
 '<meta property="og:image:secure_url" content="https://koolo.app/social/og/fortune-chibi-v1.png">',
 '<meta property="og:image:type" content="image/png">',
 '<meta property="og:image:width" content="1200">',
 '<meta property="og:image:height" content="630">',
 '<meta name="twitter:card" content="summary_large_image">',
 '<meta name="twitter:title" content="我算出了自己的命格身份！換你看看，你是哪一型？">',
 '<meta name="twitter:description" content="Crew Fortune｜看看你的命格身份是哪一型。">',
 '<meta name="twitter:image" content="https://koolo.app/social/og/fortune-chibi-v1.png">'
].join(newline);
for(const prefix of ["","/en"]){
 for(const route of privatePaths){
  const relative=(prefix+route).slice(1)+".html";
  const target=join(out,relative);
  if(existsSync(target))throw Error("Private route conflicts with published file: "+relative);
  mkdirSync(dirname(target),{recursive:true});
  writeFileSync(target,route==="/fortune/reading"?privateShell.replace("</head>",readingShareMeta+newline+"</head>"):privateShell);
 }
}
// Research detail pages are currently SSG only in zh-TW. Untranslated /en/
// detail deep links must not soft-404 to an indexable homepage snapshot.
// Use two exact-depth placeholder rules; /en/research/ hub remains untouched.
// Cloudflare Pages _redirects supports these dynamic placeholder 301 rules.
const rules=[
 "/en/research/:date/:article/ /research/:date/:article/ 301",
 "/en/research/:date/:article /research/:date/:article/ 301",
 ...previewLocales.map(({code})=>"/"+code+"/* /"+code+"/ 200")
];
for(const prefix of ["","/en"]){
 for(const path of privatePatterns)rules.push(prefix+path+" /_app-noindex 200");
}
writeFileSync(join(out,"_redirects"),rules.join(newline)+newline);


const researchTemplate=read("research/index.html");
const replaceMeta=(html,attr,name,value)=>{
 const matcher=new RegExp('<meta '+attr+'="'+name+'" content="[^"]*">');
 if(!matcher.test(html))throw Error("Missing meta "+name+" on research template");
 return html.replace(matcher,'<meta '+attr+'="'+name+'" content="'+escapeHtml(value)+'">');
};

// Every game declared in the sitemap must ship its own real React SSG page.
// The head is derived from the indexed Games template, not a second UI.
for(const locale of ["zh","en"])for(const slug of GAME_SEO_SLUGS){
 const meta=GAME_SEO_PAGES[slug][locale],path="/games/"+slug;
 const prefix=locale==="en"?"/en":"";
 const canonical="https://koolo.app"+prefix+path+"/";
 const zhHref="https://koolo.app"+path+"/";
 const enHref="https://koolo.app/en"+path+"/";
 const template=read(locale==="en"?"en/games/index.html":"games/index.html");
 let head=template.split("</head>")[0]+"</head>";
 head=head.replace(/<title>[\s\S]*?<\/title>/,"<title>"+escapeHtml(meta.title)+"</title>");
 head=head.replace(/<link rel="canonical" href="[^"]*">/,'<link rel="canonical" href="'+canonical+'">');
 head=replaceMeta(head,"name","description",meta.description);
 head=replaceMeta(head,"property","og:title",meta.title);
 head=replaceMeta(head,"property","og:description",meta.description);
 head=replaceMeta(head,"property","og:url",canonical);
 head=replacePreviewMeta(head,previewUrl("game",slug),meta.title);
 head=head.replace(/<link rel="alternate"[^>]*>\s*/g,"");
 const alternates=[
  '<link rel="alternate" hreflang="zh-Hant" href="'+zhHref+'">',
  '<link rel="alternate" hreflang="en" href="'+enHref+'">',
  '<link rel="alternate" hreflang="x-default" href="'+zhHref+'">'
 ].join(newline+"  ");
 const ld={"@context":"https://schema.org","@graph":[
  {"@type":"WebPage","@id":canonical+"#webpage",url:canonical,name:meta.title,description:meta.description,inLanguage:locale==="en"?"en":"zh-Hant"},
  {"@type":"BreadcrumbList",itemListElement:[
   {"@type":"ListItem",position:1,name:locale==="en"?"Home":"首頁",item:"https://koolo.app"+(locale==="en"?"/en/":"/")},
   {"@type":"ListItem",position:2,name:"Koolo Play",item:"https://koolo.app"+(locale==="en"?"/en/games/":"/games/")},
   {"@type":"ListItem",position:3,name:meta.name,item:canonical}
  ]},
  {"@type":"SoftwareApplication",name:meta.name,applicationCategory:"GameApplication",operatingSystem:"Web",url:canonical,description:meta.description}
 ]};
 head=head.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,
  '<script type="application/ld+json">'+safeJson(ld)+'</script>');
 head=head.replace("</head>",alternates+newline+"</head>");
 head=head.replace('<link rel="stylesheet" href="/seo.css">',linkedAppStylesheet+routeCssLinks(path)+newline+"  "+appTags);
 head=head.replace("</head>",dynamicGuard+newline+"</head>");
 let page=prerendered.get((locale==="en"?"en":"zh-TW")+":"+path);
 if(!page||!page.includes("<h1"))throw Error("Missing SSG game "+path+" "+locale);
 page=page.replace(/\/@fs\/[^"'\s<>)]*?\/assets\/([A-Za-z0-9_.\/-]+)/g,(_match,asset)=>"/assets/"+asset);
 const publicPath=prefix+path;
 const html=template.replace(/<head>[\s\S]*?<\/head>/,head)
  .replace(/<body>[\s\S]*?<\/body>/,
   '<body><div id="root" data-crew-ssg-path="'+publicPath+'">'+page+'</div></body>');
 const target=join(out,(locale==="en"?"en/":"")+"games/"+slug+"/index.html");
 mkdirSync(dirname(target),{recursive:true});writeFileSync(target,html);
}


for(const locale of ["zh-TW","en"])for(const course of COURSE_SEO){
 const slug=course.slug,meta=locale==="en"?course.en:course.zh;
 const route="/teacher/course/"+slug,canonical="https://koolo.app"+(locale==="en"?"/en":"")+route+"/";
 const zhHref="https://koolo.app"+route+"/",enHref="https://koolo.app/en"+route+"/";
 const template=read(locale==="en"?"en/teacher/index.html":"teacher/index.html");
 let head=template.split("</head>")[0]+"</head>";
 head=head.replace(/<title>[\s\S]*?<\/title>/,"<title>"+escapeHtml(meta.title)+"</title>");
 head=head.replace(/<link rel="canonical" href="[^"]*">/,'<link rel="canonical" href="'+canonical+'">');
 head=replaceMeta(head,"name","description",meta.description);
 head=replaceMeta(head,"property","og:title",meta.title);
 head=replaceMeta(head,"property","og:description",meta.description);
 head=replaceMeta(head,"property","og:url",canonical);
 head=replacePreviewMeta(head,previewUrl("course",slug,locale),meta.title);
 head=head.replace(/<link rel="alternate"[^>]*>\s*/g,"");
 head=head.replace("</head>",[
  '<link rel="alternate" hreflang="zh-Hant" href="'+zhHref+'">',
  '<link rel="alternate" hreflang="en" href="'+enHref+'">',
  '<link rel="alternate" hreflang="x-default" href="'+zhHref+'">'
 ].join(newline)+"</head>");
 const ld={"@context":"https://schema.org","@type":"Course",name:meta.title,
  description:meta.description,url:canonical,inLanguage:locale==="en"?"en":"zh-Hant"};
 head=head.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,
  '<script type="application/ld+json">'+safeJson(ld)+'</script>');
 head=head.replace('<link rel="stylesheet" href="/seo.css">',linkedAppStylesheet+routeCssLinks(route)+newline+"  "+appTags);
 head=head.replace("</head>",dynamicGuard+newline+"</head>");
 let page=prerendered.get(locale+":"+route);
 if(!page||!page.includes("<h1"))throw Error("Missing SSG course "+route+" "+locale);
 page=page.replace(/\/@fs\/[^"'\s<>)]*?\/assets\/([A-Za-z0-9_.\/-]+)/g,(_match,asset)=>"/assets/"+asset);
 const html=template.replace(/<head>[\s\S]*?<\/head>/,head)
  .replace(/<body>[\s\S]*?<\/body>/,
   '<body class="teacher-theme"><div id="root" data-crew-ssg-path="'+(locale==="en"?"/en":"")+route+'">'+page+'</div></body>');
 const target=join(out,(locale==="en"?"en/":"")+"teacher/course/"+slug+"/index.html");
 mkdirSync(dirname(target),{recursive:true});writeFileSync(target,html);
}

// Article documents use the *same* React detail page and public build-time data,
// with per-article metadata. The old research template contributes only head SEO.
// The first five search-intent guides are genuine React SSG pages (zh-Hant + en).
// Reuse the verified teacher template's HEAD only, never its old marketing BODY.
const guideUrl=(slug,locale)=>"https://koolo.app"+(locale==="en"?"/en":"")+"/guides/"+slug+"/";
for(const [id,{slug,locale,content:guide}] of guides){
 const route="/guides/"+slug;
 const canonical=guideUrl(slug,locale),zhHref=guideUrl(slug,"zh-TW"),enHref=guideUrl(slug,"en");
 const publicPath=(locale==="en"?"/en":"")+route;
 const template=read(locale==="en"?"en/teacher/index.html":"teacher/index.html");
 let head=template.split("</head>")[0]+"</head>";
 head=head.replace(/<title>[\s\S]*?<\/title>/,'<title>'+escapeHtml(guide.title)+'</title>');
 head=head.replace(/<link rel="canonical" href="[^"]*">/,'<link rel="canonical" href="'+canonical+'">');
 head=replaceMeta(head,"name","description",guide.description);
 head=replaceMeta(head,"property","og:title",guide.title);
 head=replaceMeta(head,"property","og:description",guide.description);
 head=replaceMeta(head,"property","og:url",canonical);
 head=replacePreviewMeta(head,previewUrl("guide",slug,locale),guide.headline);
 head=head.replace(/<meta property="og:type" content="[^"]*">/,'<meta property="og:type" content="article">');
 head=head.replace(/<link rel="alternate"[^>]*>\s*/g,"");
 const languageLinks=[
  '<link rel="alternate" hreflang="zh-Hant" href="'+zhHref+'">',
  '<link rel="alternate" hreflang="en" href="'+enHref+'">',
  '<link rel="alternate" hreflang="x-default" href="'+zhHref+'">'
 ].join(newline+"  ");
 head=head.replace("</head>","  "+languageLinks+newline+"</head>");
 const language=locale==="en"?"en":"zh-Hant";
 const ld={
  "@context":"https://schema.org","@graph":[
   {"@type":"WebPage","@id":canonical+"#webpage",url:canonical,name:guide.title,
    description:guide.description,inLanguage:language,isPartOf:{"@id":"https://koolo.app/#website"}},
   {"@type":"BreadcrumbList",itemListElement:[
    {"@type":"ListItem",position:1,name:locale==="en"?"Home":"首頁",item:"https://koolo.app"+(locale==="en"?"/en/":"/")},
    {"@type":"ListItem",position:2,name:"Koolo Teacher",item:"https://koolo.app"+(locale==="en"?"/en/teacher/":"/teacher/")},
    {"@type":"ListItem",position:3,name:guide.label,item:canonical}
   ]}
  ]
 };
 head=head.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,
  '<script type="application/ld+json">'+safeJson(ld)+'</script>');
 head=head.replace('<link rel="stylesheet" href="/seo.css">',linkedAppStylesheet+newline+"  "+appTags);
 head=head.replace("</head>",dynamicGuard+newline+"</head>");
 let body=prerendered.get(id);
 if(!body||!body.includes(guide.headline)||!body.includes("crew-guide-section"))throw Error("Guide SSG failed: "+id);
 body=body.replace(/\/@fs\/[^"'\s<>)]*?\/assets\/([A-Za-z0-9_.\/-]+)/g,(_match,asset)=>"/assets/"+asset);
 const html=template.replace(/<head>[\s\S]*?<\/head>/,head)
  .replace(/<body>[\s\S]*?<\/body>/,
   '<body class="teacher-theme"><div id="root" data-crew-ssg-path="'+publicPath+'">'+body+'</div></body>');
 const target=join(out,(locale==="en"?"en/":"")+"guides/"+slug+"/index.html");
 mkdirSync(dirname(target),{recursive:true});
 writeFileSync(target,html);
}

for(const [route,{day,item,seed}] of articles){
 const path=articlePath(day.date,item);
 if(path.slice(0,-1)!==route)throw Error("Article route disagreement: "+route);
 const meta=articleHead(item,day);
 let head=researchTemplate.split("</head>")[0]+"</head>";
 head=head.replace(/<link rel="alternate"[^>]*>\s*/g,"");
 head=head.replace(/<title>[\s\S]*?<\/title>/,'<title>'+escapeHtml(meta.title)+'</title>');
 head=head.replace(/<link rel="canonical" href="[^"]*">/,'<link rel="canonical" href="'+meta.canonical+'">');
 head=replaceMeta(head,"name","description",meta.description);
 head=replaceMeta(head,"name","robots",meta.robots);
 head=replaceMeta(head,"property","og:title",meta.title);
 head=replaceMeta(head,"property","og:description",meta.description);
 head=replaceMeta(head,"property","og:url",meta.canonical);
 if(indexableArticle(item)){
  const og=writePreview(out,"article",day.date+"/"+item.id,"zh",day.date);
  head=replacePreviewMeta(head,og,item.title);
 }
 head=head.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,
  '<script type="application/ld+json">'+safeJson(meta.ld)+'</script>');
 // Ensure the article is the first meaningful content, not a loading spinner.
 const rendered=prerendered.get("zh-TW:"+route);
 if(!rendered||!rendered.includes('<article class="briefing briefing-detail">'))throw Error("SSG article missing actual detail: "+route);
 const page=rendered.replace(/\/@fs\/[^"'\s<>)]*?\/assets\/([A-Za-z0-9_.\/-]+)/g,(_match,asset)=>"/assets/"+asset);
 const seedTag='<script id="crew-research-seed" type="application/json">'+safeJson(seed)+'</script>';
 head=head.replace('<link rel="stylesheet" href="/seo.css">',linkedAppStylesheet+newline+"  "+appTags);
 head=head.replace("</head>",seedTag+newline+dynamicGuard+newline+"</head>");
 const html=researchTemplate.replace(/<head>[\s\S]*?<\/head>/,head)
  .replace(/<body>[\s\S]*?<\/body>/,
   '<body><div id="root" data-crew-ssg-path="'+route+'">'+page+'</div></body>');
 const target=join(out,route.slice(1),"index.html");
 mkdirSync(dirname(target),{recursive:true});
 writeFileSync(target,html);
}
// Only substantial original commentary is indexable. Thin extracted abstracts
// remain available via normal links, but are excluded from Google Sitemap.
const sitemapEntries=[...articles.values()].filter(({item})=>indexableArticle(item))
 .map(({item,day})=>'  <url><loc>https://koolo.app'+articlePath(day.date,item)+'</loc><lastmod>'+day.generatedAt.slice(0,10)+'</lastmod></url>').join(newline);
const guideSitemapEntries=[...new Set([...guides.values()].map(({slug})=>slug))].flatMap(slug=>
 ["zh-TW","en"].map(locale=>{
  const canonical=guideUrl(slug,locale),zhHref=guideUrl(slug,"zh-TW"),enHref=guideUrl(slug,"en");
  return '  <url><loc>'+canonical+'</loc>'+
   '<xhtml:link rel="alternate" hreflang="zh-Hant" href="'+zhHref+'"/>'+
   '<xhtml:link rel="alternate" hreflang="en" href="'+enHref+'"/>'+
   '<xhtml:link rel="alternate" hreflang="x-default" href="'+zhHref+'"/>'+
   '</url>';
 })
).join(newline);
const sitemap=read("sitemap.xml");
if(!sitemap.includes("</urlset>"))throw Error("Missing sitemap closing tag");
writeFileSync(join(out,"sitemap.xml"),sitemap.replace("</urlset>",guideSitemapEntries+newline+sitemapEntries+newline+"</urlset>"));

// Preserve bookmarks shared from GitHub Pages, including HashRouter query string.
// Cloudflare deploys a redirect-only compatibility document, not a second app.
const oldPath=join(out,"crew-app");mkdirSync(oldPath,{recursive:true});
writeFileSync(join(oldPath,"index.html"),`<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="robots" content="noindex,follow"><title>Moving to Crew</title></head>
<body><p>正在前往新的 Crew 網址… <a href="/">開啟 Crew</a></p>
<script>
(function(){
 var old=(location.hash||"").replace(/^#/,"")||"/";
 if(!/^\\/(?!\\/)/.test(old)||old.includes(".."))old="/";
 var parsed;try{parsed=new URL(old,location.origin)}catch(e){parsed=new URL("/",location.origin)}
 var preferred="";try{preferred=localStorage.getItem("crew_ui_locale_v1")==="en"?"/en":""}catch(e){}
 location.replace(preferred+parsed.pathname+parsed.search+parsed.hash)
})();
</script></body></html>`);
if(existsSync(join(out,"404.html")))rmSync(join(out,"404.html"));
// Pages' asset handler looks upwards for the nearest 404.html before falling
// back to /index.html. Scope this 404 to hashed assets; keep SPA deep links.
// On a 404 Pages strips user Cache-Control and sends no-store. Keep this HTML
// headless so the PWA head injection below does not add app asset references.
const buildAssetsDir=join(out,"assets","build");
if(!existsSync(buildAssetsDir))throw Error("Missing Vite build assets directory: "+buildAssetsDir);
const buildNotFound=join(buildAssetsDir,"404.html");
const buildNotFoundHtml='<!doctype html><html lang="en"><meta name="robots" content="noindex"><title>404</title><body>Not Found</body></html>\n';
writeFileSync(buildNotFound,buildNotFoundHtml,{flag:"wx"});
if(readFileSync(buildNotFound,"utf8")!==buildNotFoundHtml||existsSync(join(out,"404.html"))){
 throw Error("Cloudflare build 404 must exist only at dist/assets/build/404.html");
}
console.log("Prepared Cloudflare Pages: "+(12+GAME_SEO_SLUGS.length*2+guides.size)+" public SSG routes and "+articles.size+" research articles (indexed "+[...articles.values()].filter(({item})=>indexableArticle(item)).length+"), private route noindex shells, no runtime SSR.");

// Crew PWA metadata for every entry point, including SSG, private deep links,
// generated SEO articles, and non-English locale shells. This runs LAST so no
// subsequently generated HTML page misses the manifest or iOS home-screen icon.
const pwaHead=[
 '<link rel="manifest" href="/site.webmanifest">',
 '<link rel="icon" type="image/svg+xml" href="/favicon.svg">',
 '<link rel="apple-touch-icon" sizes="180x180" href="/icons/koolo-v2-180.png">',
 '<meta name="apple-mobile-web-app-capable" content="yes">',
 '<meta name="apple-mobile-web-app-title" content="Koolo">'
].join(newline);
function addPwaHeadToHtml(directory){
 for(const entry of readdirSync(directory,{withFileTypes:true})){
  const file=join(directory,entry.name);
  if(entry.isDirectory()){addPwaHeadToHtml(file);continue;}
  if(!entry.isFile()||!file.endsWith(".html"))continue;
  const original=readFileSync(file,"utf8");
  if(!original.includes("</head>"))continue;
  const missing=pwaHead.split(newline).filter(tag=>!original.includes(tag));
  if(missing.length)writeFileSync(file,original.replace("</head>",missing.join(newline)+newline+"</head>"));
 }
}
for(const name of ["site.webmanifest","sw.js","offline.html","favicon.svg","brand/koolo-wordmark-C.svg","brand/koolo-wordmark-C-dark.svg","brand/koolo-icon-C.svg","brand/koolo-icon-C-dark.svg","brand/koolo-wordmark-koo-v2.svg","brand/koolo-wordmark-koo-v2-dark.svg","brand/koolo-icon-koo-v2.svg","brand/koolo-icon-koo-v2-dark.svg","icons/koolo-v2-180.png","icons/koolo-v2-192.png","icons/koolo-v2-512.png","icons/koolo-v2-maskable-512.png",
 "icons/shortcut-chat-96.png","icons/shortcut-chat-192.png",
 "icons/shortcut-learn-96.png","icons/shortcut-learn-192.png",
 "icons/shortcut-games-96.png","icons/shortcut-games-192.png"]){
 if(!existsSync(join(out,name)))throw Error("Missing Crew PWA asset: "+name);
}
addPwaHeadToHtml(out);
