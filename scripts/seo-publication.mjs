import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {join,dirname} from "node:path";
import {GAME_SEO_SLUGS} from "./game-seo.mjs";
import {COURSE_SEO} from "./course-seo.mjs";
import {previewUrl} from "./social-og.mjs";

export const SEO_ORIGIN="https://koolo.app";
export const BASE_SEO_LOCALES=Object.freeze(["zh-TW","en"]);
export const CORE_SEO_ROUTES=Object.freeze(["/","/teacher","/story","/fortune","/research","/games"]);
export const INTERNATIONAL_ROUTES=Object.freeze([...CORE_SEO_ROUTES.filter(path=>path!=="/research"),"/chat","/learn",
 ...GAME_SEO_SLUGS.map(slug=>"/games/"+slug),...COURSE_SEO.map(course=>"/teacher/course/"+course.slug)]);
export const localePrefix=locale=>locale==="zh-TW"?"":"/"+locale;
export const htmlLanguage=locale=>locale==="zh-TW"?"zh-Hant":locale;
export const publicPath=(locale,path)=>localePrefix(locale)+(path==="/"?"":path)+"/";
export const canonicalUrl=(locale,path)=>SEO_ORIGIN+publicPath(locale,path);
const escape=value=>String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const htmlFile=(out,locale,path)=>join(out,publicPath(locale,path).slice(1),"index.html");

/** Explicit editorial release gate. UI support does not imply SEO publication. */
export function validateInternationalPages(config,uiLocales){
 if(config.version!==1||!Array.isArray(config.pages))throw Error("Invalid international SEO registry");
 const allowed=new Set(uiLocales.filter(locale=>locale.stage!=="published").map(locale=>locale.code));
 const seen=new Set();
 for(const entry of config.pages){
  const {locale,path,title,description,lastmod,reviewed}=entry;
  if(!allowed.has(locale)||!INTERNATIONAL_ROUTES.includes(path))throw Error("Unsupported international SEO route: "+locale+" "+path);
  if(reviewed!==true||typeof title!=="string"||!title.trim()||typeof description!=="string"||!description.trim()||
   !/^\d{4}-\d{2}-\d{2}$/.test(lastmod||"")||Number.isNaN(Date.parse(lastmod))||
   new Date(lastmod).toISOString().slice(0,10)!==lastmod)throw Error("International SEO page requires reviewed local metadata and a content date: "+locale+" "+path);
  const key=locale+":"+path;
  if(seen.has(key))throw Error("Duplicate international SEO route: "+key);
  seen.add(key);
 }
 return config.pages;
}
export function readInternationalPages(root){
 const config=JSON.parse(readFileSync(join(root,"config/seo-international.json"),"utf8"));
 const locales=JSON.parse(readFileSync(join(root,"config/ui-locales.json"),"utf8")).locales;
 return validateInternationalPages(config,locales);
}
export function alternatesFor(path,locales){
 const unique=[...new Set(locales)];
 const alternatives=unique.map(locale=>({language:htmlLanguage(locale),href:canonicalUrl(locale,path)}));
 if(unique.includes("zh-TW"))alternatives.push({language:"x-default",href:canonicalUrl("zh-TW",path)});
 return alternatives;
}
export function alternateTags(alternates,xml=false){
 return alternates.map(({language,href})=>xml?
  '<xhtml:link rel="alternate" hreflang="'+language+'" href="'+href+'"/>':
  '<link rel="alternate" hreflang="'+language+'" href="'+href+'">');
}

/** Exact localized routes must precede the broad preview rewrite.
 * Cloudflare applies only the first proxy rule; a self-target 200 serves the
 * existing canonical directory asset without a second redirect evaluation.
 * Noncanonical slashless paths get a real 301. All other locale paths stay noindex.
 */
export function internationalRedirectRules(previewLocales,pages){
 const exact=[],fallback=[];
 for(const {code} of previewLocales){
  const entries=pages.filter(page=>page.locale===code);
  if(!entries.length){fallback.push("/"+code+"/* /"+code+"/ 200");continue;}
  for(const {path} of entries){
   const canonical=publicPath(code,path);
   exact.push(canonical.slice(0,-1)+" "+canonical+" 301",canonical+" "+canonical+" 200");
  }
  fallback.push("/"+code+"/* /_app-noindex 200");
 }
 return [...exact,...fallback];
}

/** Render only approved pages; reconcile existing locale variants from the
 * actual final sitemap, so a preview or nonexistent translation is never linked.
 */
export function publishInternationalPages({out,pages,rendered,makeHtml,sitemap}){
 if(!pages.length)return sitemap;
 const existing=new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]));
 const byPath=new Map();
 for(const entry of pages){
  const group=byPath.get(entry.path)||[];
  group.push(entry);byPath.set(entry.path,group);
 }
 let next=sitemap;
 for(const [path,entries] of byPath){
  const baseLocales=BASE_SEO_LOCALES.filter(locale=>existing.has(canonicalUrl(locale,path)));
  const locales=[...baseLocales,...entries.map(entry=>entry.locale)];
  const alternatives=alternatesFor(path,locales);
  const htmlLinks=alternateTags(alternatives).join("\n");
  const xmlLinks=alternateTags(alternatives,true).join("");
  for(const locale of baseLocales){
   const canonical=canonicalUrl(locale,path),file=htmlFile(out,locale,path);
   if(!existsSync(file))throw Error("Sitemap counterpart missing HTML: "+canonical);
   const old=readFileSync(file,"utf8");
   if(!old.includes('<link rel="canonical" href="'+canonical+'">')||!old.includes('name="robots" content="index,follow"'))throw Error("Invalid SEO counterpart: "+canonical);
   const updated=old.replace(/<link\b[^>]*\bhreflang="[^"]+"[^>]*>/g,"").replace("</head>",htmlLinks+"\n</head>");
   writeFileSync(file,updated);
   next=next.replace(/<url>[\s\S]*?<\/url>/g,block=>block.includes("<loc>"+canonical+"</loc>")?
    block.replace(/<xhtml:link\b[^>]*\bhreflang="[^"]+"[^>]*\/>/g,"").replace("</url>",xmlLinks+"</url>"):block);
  }
  for(const entry of entries){
   const canonical=canonicalUrl(entry.locale,path),key=entry.locale+":"+path;
   if(existing.has(canonical))throw Error("Duplicate sitemap URL: "+canonical);
   const body=rendered.get(key);
   if(!body||!body.includes('class="app-header"')||!body.includes("<h1"))throw Error("Missing localized SSG: "+key);
   const html=makeHtml(entry,body,htmlLinks);
   if(!html.includes('<html lang="'+htmlLanguage(entry.locale)+'">')||!html.includes('<link rel="canonical" href="'+canonical+'">')||!html.includes('name="robots" content="index,follow"')||html.includes('name="robots" content="noindex'))throw Error("Invalid localized HTML: "+key);
   const file=htmlFile(out,entry.locale,path);
   mkdirSync(dirname(file),{recursive:true});
   writeFileSync(file,html);
   next=next.replace("</urlset>","  <url><loc>"+canonical+"</loc><lastmod>"+entry.lastmod+"</lastmod>"+xmlLinks+"</url>\n</urlset>");
   existing.add(canonical);
  }
 }
 return next;
}
export function localizedSeoHead(entry,htmlLinks){
 const url=canonicalUrl(entry.locale,entry.path),lang=htmlLanguage(entry.locale);
 const image=entry.path==="/"?previewUrl("home"):entry.path==="/teacher"?previewUrl("feature","teacher"):null;
 const preview=image?'<meta property="og:image" content="'+image+'">\n<meta property="og:image:secure_url" content="'+image+'">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:image" content="'+image+'">\n':"";
 const json=JSON.stringify({"@context":"https://schema.org","@type":"WebPage","@id":url+"#webpage",url,name:entry.title,description:entry.description,inLanguage:lang}).replaceAll("<","\\u003c");
 return '<link rel="canonical" href="'+url+'">\n'+htmlLinks+'\n<meta name="description" content="'+escape(entry.description)+'">\n<meta property="og:site_name" content="Koolo">\n<meta property="og:type" content="website">\n<meta property="og:title" content="'+escape(entry.title)+'">\n<meta property="og:description" content="'+escape(entry.description)+'">\n<meta property="og:url" content="'+url+'">\n'+preview+'<script type="application/ld+json">'+json+'</script>';
}
