import {seoBootHead,seoBootShell} from "./seo-first-paint.mjs";
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
  .map(x=>x[0]).filter(tag=>/\b(?:src|href)="\/assets\//.test(tag));
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
for(const filename of ["crew.js","crew-live.js","crew-live-ui.js","robots.txt","sitemap.xml","seo.css"]){
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

// Public SEO data is sourced from the existing bilingual content generator,
// but the *same URL* now boots the functional React app. The original content
// is visible before React starts / with JavaScript off, never hidden for bots.
// Once JS loads, React replaces only #root children with the actual product.
const routes=[
 ["", ""],["teacher","teacher"],["story","story"],["fortune","fortune"],["research","research"]
];
// Keep the fully designed SEO page visible while the React bundle loads.
// The app removes this stylesheet after React commits. The bootstrap shell
// prevents a marketing-to-app flash, while preserving the non-JS landing.
const fallbackStylesheet = '<link rel="stylesheet" href="/seo.css" data-crew-seo-fallback>';
for(const locale of ["zh","en"]){
 for(const [name,slug] of routes){
  const prefix=locale==="en"?"en/":"";
  const relative=prefix+(slug?slug+"/":"")+"index.html";
  // The marketing fallback must also link to the clean functional routes.
  // Apply the longest paths first so generic /crew-app/#/ doesn't eat subroutes.
  const redirectTargets=[
   ["/crew-app/#/teacher/practice","/teacher/"],
   ["/crew-app/#/teacher/roles?mode=friends","/teacher/roles?mode=friends"],
   ["/crew-app/#/story/shelf","/story/"],
   ["/crew-app/#/story/create","/story/create"],
   ["/crew-app/#/briefing/board","/research/board"],
   ["/crew-app/#/briefing","/research/"],
   ["/crew-app/#/fortune","/fortune/"],
   ["/crew-app/#/","/"]
  ];
  let marketing=read(relative);
  for(const [previous,next] of redirectTargets)marketing=marketing.replaceAll(previous,next);
  if(!marketing.includes("<main id=\"main\">")||!marketing.includes('name="robots" content="index,follow"'))throw Error("Missing SEO content: "+relative);
  const html=marketing
   .replace('<link rel="stylesheet" href="/seo.css">',inlineAppStylesheet+"\n  "+fallbackStylesheet+"\n  "+appTags)
   .replace("</head>",seoBootHead()+"\n</head>")
   .replace("<body>","<body>\n<div id=\"root\">"+seoBootShell({locale,product:name||"home"})+"\n<div class=\"seo-fallback\">")
   .replace("</body>","</div></div>\n</body>");
  const target=join(out,relative);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,html);
 }
}
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
console.log("Prepared Cloudflare Pages: 10 React routes, inline app CSS ("+compiledCss.length+" chars) and runtime assets.");
