import {prerenderPublicRoutes} from "./ssg-renderer.mjs";
import {articleHead,articlePath,escapeHtml,safeJson,indexableArticle} from "./research-seo.mjs";
import {readFileSync, writeFileSync, cpSync, existsSync, mkdirSync, rmSync} from "node:fs";
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
// Cloudflare Pages must not rely solely on a separate CSS request.
// Inline the Vite-compiled stylesheet to keep the React UI styled on every route.
// Retain hashed .css in dist for diagnostics and possible future optimization.
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
const inlineAppStylesheet='<style data-crew-react-css>'+compiledCss+'</style>';
const appTags=viteAssetTags.filter(tag=>!tag.includes('rel="stylesheet"')).join("\n  ");

// Copy only confirmed public assets, not the entire repo (which could contain
// source code, config, tooling or secrets). Imported images are handled by Vite.
for(const folder of ["features","assets","social"]){
 if(!existsSync(join(root,folder)))throw Error("Required public asset folder is missing: "+folder);
 cpSync(join(root,folder),join(out,folder),{recursive:true,force:false,errorOnExist:false});
}
for(const filename of ["crew.js","crew-live.js","crew-live-ui.js","robots.txt","sitemap.xml","seo.css","_headers","_routes.json"]){
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
   .replace('<link rel="stylesheet" href="/seo.css">',inlineAppStylesheet+newline+"  "+appTags)
   .replace("</head>",seedTag+newline+dynamicGuard+newline+"</head>")
   .replace(/<body>[\s\S]*?<\/body>/,
    '<body'+(bodyTheme?' class="'+bodyTheme+'"':"")+'><div id="root" data-crew-ssg-path="'+publicPath+'">'+page+'</div></body>');
  const target=join(out,relative);
  mkdirSync(dirname(target),{recursive:true});
  writeFileSync(target,html);
 }
}

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
writeFileSync(join(out,"_redirects"),previewLocales.map(({code})=>
 "/"+code+"/* /"+code+"/index.html 200").join(newline)+newline);

// Article documents use the *same* React detail page and public build-time data,
// with per-article metadata. The old research template contributes only head SEO.
const researchTemplate=read("research/index.html");
const replaceMeta=(html,attr,name,value)=>{
 const matcher=new RegExp('<meta '+attr+'="'+name+'" content="[^"]*">');
 if(!matcher.test(html))throw Error("Missing meta "+name+" on research template");
 return html.replace(matcher,'<meta '+attr+'="'+name+'" content="'+escapeHtml(value)+'">');
};
// The first five search-intent guides are genuine React SSG pages (zh-Hant + en).
// Reuse the verified teacher template's HEAD only, never its old marketing BODY.
const guideUrl=(slug,locale)=>"https://www.3sssi.com"+(locale==="en"?"/en":"")+"/guides/"+slug+"/";
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
    description:guide.description,inLanguage:language,isPartOf:{"@id":"https://www.3sssi.com/#website"}},
   {"@type":"BreadcrumbList",itemListElement:[
    {"@type":"ListItem",position:1,name:locale==="en"?"Home":"首頁",item:"https://www.3sssi.com"+(locale==="en"?"/en/":"/")},
    {"@type":"ListItem",position:2,name:"Crew Teacher",item:"https://www.3sssi.com"+(locale==="en"?"/en/teacher/":"/teacher/")},
    {"@type":"ListItem",position:3,name:guide.label,item:canonical}
   ]}
  ]
 };
 head=head.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,
  '<script type="application/ld+json">'+safeJson(ld)+'</script>');
 head=head.replace('<link rel="stylesheet" href="/seo.css">',inlineAppStylesheet+newline+"  "+appTags);
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
 head=head.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,
  '<script type="application/ld+json">'+safeJson(meta.ld)+'</script>');
 // Ensure the article is the first meaningful content, not a loading spinner.
 const rendered=prerendered.get("zh-TW:"+route);
 if(!rendered||!rendered.includes('<article class="briefing briefing-detail">'))throw Error("SSG article missing actual detail: "+route);
 const page=rendered.replace(/\/@fs\/[^"'\s<>)]*?\/assets\/([A-Za-z0-9_.\/-]+)/g,(_match,asset)=>"/assets/"+asset);
 const seedTag='<script id="crew-research-seed" type="application/json">'+safeJson(seed)+'</script>';
 head=head.replace('<link rel="stylesheet" href="/seo.css">',inlineAppStylesheet+newline+"  "+appTags);
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
 .map(({item,day})=>'  <url><loc>https://www.3sssi.com'+articlePath(day.date,item)+'</loc><lastmod>'+day.generatedAt.slice(0,10)+'</lastmod></url>').join(newline);
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
console.log("Prepared Cloudflare Pages: 22 public SSG routes (including "+guides.size+" language guides) and "+articles.size+" research articles (indexed "+[...articles.values()].filter(({item})=>indexableArticle(item)).length+"), inline CSS, no runtime SSR.");
