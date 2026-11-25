import {pathToFileURL} from "node:url";
import {ORIGIN,canonicalOf,robotsOf,sitemapUrls} from "./check-live-seo.mjs";

// Synthetic user-agent probes detect obvious HTTP/challenge problems. They do not
// establish verified crawler IP access, indexing, ranking or citations.
export const SEARCH_AGENTS=["Googlebot","bingbot","OAI-SearchBot","PerplexityBot"];
export const PUBLIC_PATHS=["/","/en/","/teacher/","/guides/ai-english-speaking/","/guides/ai-conversation-partner/"];
export function inspectAiResponse({status,headers,body},url,kind){
 if(status!==200)throw Error("HTTP "+status);
 if(headers.get("cf-mitigated")==="challenge"||/<title>\s*Just a moment/i.test(body))throw Error("Cloudflare challenge");
 if(kind==="robots"){
  if(!/User-agent:/i.test(body)||!body.includes("Sitemap: "+new URL(url).origin+"/sitemap.xml"))throw Error("Unexpected robots.txt");
  return;
 }
 if(kind==="sitemap"){
  const urls=sitemapUrls(body,new URL(url).origin);
  for(const path of PUBLIC_PATHS)if(!urls.includes(new URL(path,url).href))throw Error("Missing "+path);
  return;
 }
 if(canonicalOf(body)!==url||!robotsOf(body)?.split(",").map(x=>x.trim()).includes("index")||
    /noindex/i.test(robotsOf(body)||"")||/noindex/i.test(headers.get("x-robots-tag")||"")||
    !/<h1(?:\s[^>]*)?>/i.test(body))throw Error("Missing canonical, indexability or HTML content");
}
export async function auditAiAccess({origin=ORIGIN,fetchImpl=fetch,log=console.log}={}){
 const checks=[];
 for(const agent of SEARCH_AGENTS){
  for(const [path,kind] of [["/robots.txt","robots"],["/sitemap.xml","sitemap"],...PUBLIC_PATHS.map(p=>[p,"html"])]){
   const url=origin+path;
   try{
    const res=await fetchImpl(url,{redirect:"manual",signal:AbortSignal.timeout(15000),headers:{"User-Agent":agent}});
    const body=await res.text();
    inspectAiResponse({status:res.status,headers:res.headers,body},url,kind);
    checks.push({agent,path,ok:true});log("PASS "+agent+" "+path);
   }catch(error){checks.push({agent,path,ok:false,error:error.message});log("FAIL "+agent+" "+path+": "+error.message);}
  }
 }
 const failed=checks.filter(x=>!x.ok).length;
 log("Synthetic UA checks: "+(checks.length-failed)+" passed, "+failed+" failed. Verify real bot IP/WAF and robots rules separately.");
 return {checks,failed};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=await auditAiAccess();if(result.failed)process.exitCode=1;
}
