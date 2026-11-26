import {pathToFileURL} from "node:url";

// Public GET only. Never probe auth, API or dedicated Worker hosts.
export const ORIGIN="https://koolo.app";
export const LEGACY_HOSTS=["https://3sssi.com","https://www.3sssi.com","https://www.koolo.app"];
export const MIGRATION_PATHS=["/","/en/","/teacher/","/en/guides/ai-english-speaking/","/guides/english-pronunciation/","/en/guides/gemini-key-for-ai-practice/","/en/guides/ai-english-speaking/?seo_probe=1&lang=en"];

export async function auditRedirects({fetchImpl=fetch,log=console.log}={}){
 const errors=[],passed=[];
 await Promise.all(LEGACY_HOSTS.flatMap(host=>MIGRATION_PATHS.map(async path=>{
  const source=host+path,expected=ORIGIN+path;
  try{
   const response=await fetchImpl(source,{method:"GET",redirect:"manual",signal:AbortSignal.timeout(15000)});
   const location=response.headers.get("location");
   await response.body?.cancel();
   if(![301,308].includes(response.status))throw Error("expected permanent redirect (301/308), got "+response.status);
   if(!location||new URL(location,source).href!==expected)throw Error("expected "+expected+", got "+location);
   const target=await fetchImpl(expected,{method:"GET",redirect:"manual",signal:AbortSignal.timeout(15000)});
   await target.body?.cancel();
   if(target.status!==200)throw Error("destination expected 200, got "+target.status);
   passed.push(source);
   log("PASS "+source);
  }catch(e){errors.push(source+": "+e.message);log("FAIL "+source+": "+e.message);}
 })));
 return {passed:passed.length,failed:errors.length,errors};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=await auditRedirects();
 console.log("SEO migration: "+result.passed+" passed, "+result.failed+" failed");
 if(result.failed)process.exitCode=1;
}
