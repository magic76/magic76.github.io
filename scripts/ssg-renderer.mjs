import {createServer} from "vite";
import {join} from "node:path";

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
  const result=new Map();
  for(const locale of ["zh-TW","en"]){
   for(const path of ["/","/teacher","/story","/fortune","/research"]){
    const html=await renderStaticRoute(path,locale);
    if(!html.includes("class=\"app-header\"")||!html.includes("class=\"global-nav\"")){
     throw Error("React SSG output missing app shell: "+locale+" "+path);
    }
    if(!html.includes("<h1"))throw Error("React SSG output missing heading: "+locale+" "+path);
    result.set(locale+":"+path,html);
   }
  }
  return result;
 }finally{
  if(vite)await vite.close();
  for(const [key,value] of Object.entries(saved)){
   if(value===undefined)delete globalThis[key];
   else Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  }
 }
}
