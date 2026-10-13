import {prerenderPublicRoutes} from "./ssg-renderer.mjs";
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

// The actual React App is rendered at build time for public routes. Vite handles
// TSX/assets; we reuse the old SEO files ONLY for their head metadata (title,
// canonical, hreflang, social images and JSON-LD). No marketing HTML is shipped.
const prerendered=await prerenderPublicRoutes(root);
// Head fragments must be separated by real whitespace. A literal backslash-n
// between tags makes the browser close <head> early and visibly render "\\n".
const newline=String.fromCharCode(10);
const routes=["","teacher","story","fortune","research"];
const normalizePath=path=>path.replace(/\/+$/,"")||"/";
// Fallback deep routes receive /index.html from Pages. If its SSG route differs
// from the real URL, hide the wrong screen before first paint until React mounts.
const dynamicGuard=`<style>html.crew-dynamic-route #root{visibility:hidden!important}</style>
<script>(function(){var canonical=document.querySelector('link[rel="canonical"]');if(!canonical)return;
var expected=new URL(canonical.href).pathname.replace(/\/+$/,"")||"/";
var current=location.pathname.replace(/\/+$/,"")||"/";
if(current!==expected)document.documentElement.classList.add("crew-dynamic-route")
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
  const html=marketing
   .replace('<link rel="stylesheet" href="/seo.css">',inlineAppStylesheet+newline+"  "+appTags)
   .replace("</head>",dynamicGuard+newline+"</head>")
   .replace(/<body>[\s\S]*?<\/body>/,
    '<body'+(bodyTheme?' class="'+bodyTheme+'"':"")+'><div id="root" data-crew-ssg-path="'+publicPath+'">'+page+'</div></body>');
  const target=join(out,relative);
  mkdirSync(dirname(target),{recursive:true});
  writeFileSync(target,html);
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
console.log("Prepared Cloudflare Pages: 10 React SSG routes, inline app CSS ("+compiledCss.length+" chars), no runtime SSR.");
