import {createServer} from "vite";
import {join} from "node:path";
import {readPublishedResearch,hasArticleHeading,articleHeadingText,decodeHtmlText} from "./research-seo.mjs";
import {recommendPublishedResearch} from "./research-discovery.mjs";
import {GAME_SEO_SLUGS} from "./game-seo.mjs";
import {COURSE_SEO} from "./course-seo.mjs";
import {BASE_SEO_LOCALES,CORE_SEO_ROUTES,readInternationalPages} from "./seo-publication.mjs";

/**
 * Build-time only. No Cloudflare Worker, Node server or user data is deployed.
 * This mirrors a new visitor's empty storage so pre-rendered HTML contains no
 * local Gemini keys, conversation history, private profile or memory.
 */
export async function prerenderPublicRoutes(root){
 const saved={
  localStorage:globalThis.localStorage,
  sessionStorage:globalThis.sessionStorage,
  navigator:globalThis.navigator
 };
 const blankStorage={
  getItem(){return null},
  setItem(){},
  removeItem(){},
  clear(){}
 };
 Object.defineProperty(globalThis,"localStorage",{value:blankStorage,configurable:true,writable:true});
 Object.defineProperty(globalThis,"sessionStorage",{value:blankStorage,configurable:true,writable:true});
 Object.defineProperty(globalThis,"navigator",{value:{language:"zh-TW",languages:["zh-TW"]},configurable:true,writable:true});
 let vite;
 try{
  vite=await createServer({
   configFile:join(root,"vite.web.config.ts"),
   server:{middlewareMode:true},
   appType:"custom",
   logLevel:"warn"
  });
  const {renderStaticRoute}=await vite.ssrLoadModule("/src/ssg-entry.tsx");
  const {guideSlugs,getGuide}=await vite.ssrLoadModule("/src/guides/catalog.ts");
  const result=new Map();
  const research=readPublishedResearch(root);
  const related= recommendPublishedResearch(research.days);
  const latest=research.days.get(research.index.days[0]);
  for(const locale of BASE_SEO_LOCALES){
   for(const path of CORE_SEO_ROUTES){
    const seed=path==="/research"&&latest?{index:research.index,day:latest}:null;
    const html=await renderStaticRoute(path,locale,seed);
    if(!html.includes("class=\"app-header\"")||!html.includes("class=\"global-nav\"")){
     throw Error("React SSG output missing app shell: "+locale+" "+path);
    }
    if(!html.includes("<h1"))throw Error("React SSG output missing heading: "+locale+" "+path);
    result.set(locale+":"+path,html);
   }
  }
  // A sitemap URL must have real, route-specific HTML, not the homepage SPA fallback.
  for(const locale of BASE_SEO_LOCALES){
   for(const slug of GAME_SEO_SLUGS){
    const path="/games/"+slug;
    const html=await renderStaticRoute(path,locale);
    if(!html.includes('class="app-header"')||!html.includes("<h1"))throw Error("Crew Play SSG missing UI: "+locale+" "+path);
    result.set(locale+":"+path,html);
   }
  }
  for(const locale of BASE_SEO_LOCALES){
   for(const course of COURSE_SEO){
    const path="/teacher/course/"+course.slug;
    const html=await renderStaticRoute(path,locale);
    if(!html.includes('class="app-header"')||!html.includes("<h1")||
       !html.includes('class="crew-learning-focus crew-course-focus"'))
     throw Error("Course SSG missing track: "+locale+" "+path);
    result.set(locale+":"+path,html);
   }
  }
  const guides=new Map();
  for(const locale of BASE_SEO_LOCALES){
   for(const slug of guideSlugs){
    const path="/guides/"+slug,guide=getGuide(slug,locale==="en"?"en":"zh");
    if(!guide)throw Error("Guide missing content: "+locale+" "+slug);
    const html=await renderStaticRoute(path,locale);
    const heading=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i);
    if(!heading||decodeHtmlText(heading[1].replace(/<[^>]*>/g,""))!==guide.headline)throw Error("Guide SSG missing content: "+locale+" "+slug);
    result.set(locale+":"+path,html);
    guides.set(locale+":"+path,{slug,locale,content:guide});
   }
  }
  const internationalPages=readInternationalPages(root);
  for(const {locale,path} of internationalPages){
   const html=await renderStaticRoute(path,locale);
   if(!html.includes('class="app-header"')||!html.includes("<h1"))throw Error("International SSG missing UI: "+locale+" "+path);
   result.set(locale+":"+path,html);
  }
  const articles=new Map();
  for(const [date,day] of research.days){
   for(const item of day.items){
    const path="/research/"+date+"/"+item.id;
    const seed={day,article:item,related:related[path+"/"]||[]};
    const html=await renderStaticRoute(path,"zh-TW",seed);
    if(!hasArticleHeading(html,item.title))throw Error("Article prerender missing heading: "+path+" (actual h1: "+JSON.stringify(articleHeadingText(html)?.slice(0,120)??null)+")");
    result.set("zh-TW:"+path,html);
    articles.set(path,{day,item,seed});
   }
  }
  return {pages:result,articles,research,related,guides,internationalPages};
 }finally{
  if(vite)await vite.close();
  for(const [key,value] of Object.entries(saved)){
   if(value===undefined)delete globalThis[key];
   else Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  }
 }
}
