import {pathToFileURL} from "node:url";

// Public GET only. Never probe auth, API or dedicated Worker hosts.
export const ORIGIN="https://koolo.app";
export const LEGACY_HOSTS=["https://3sssi.com","https://www.3sssi.com","https://www.koolo.app"];
export const PUBLIC_ALIAS_PATHS=["/en","/en/fortune","/en/games","/en/games/1a2b","/en/games/connect4","/en/games/crazy-court","/en/games/friend-gomoku","/en/games/memory","/en/games/mystery","/en/games/nonsense","/en/games/number-bomb","/en/games/reversi","/en/games/taboo","/en/games/truth-news","/en/games/twenty-questions","/en/games/werewolf","/en/guides/2027-bazi-luck","/en/guides/2027-goat-zodiac","/en/guides/2027-personal-year","/en/guides/ai-conversation-partner","/en/guides/ai-english-conversation","/en/guides/ai-english-speaking","/en/guides/english-interview-practice","/en/guides/english-pronunciation","/en/guides/free-english-speaking","/en/guides/gemini-key-for-ai-practice","/en/guides/travel-english-dialogues","/en/research","/en/story","/en/teacher","/en/teacher/course/business","/en/teacher/course/daily","/en/teacher/course/services","/en/teacher/course/teamwork","/en/teacher/course/tickets","/en/teacher/course/travel","/fortune","/games","/games/1a2b","/games/connect4","/games/crazy-court","/games/friend-gomoku","/games/memory","/games/mystery","/games/nonsense","/games/number-bomb","/games/reversi","/games/taboo","/games/truth-news","/games/twenty-questions","/games/werewolf","/guides/2027-bazi-luck","/guides/2027-goat-zodiac","/guides/2027-personal-year","/guides/ai-conversation-partner","/guides/ai-english-conversation","/guides/ai-english-speaking","/guides/english-interview-practice","/guides/english-pronunciation","/guides/free-english-speaking","/guides/gemini-key-for-ai-practice","/guides/travel-english-dialogues","/research","/story","/teacher","/teacher/course/business","/teacher/course/daily","/teacher/course/services","/teacher/course/teamwork","/teacher/course/tickets","/teacher/course/travel"];
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
// Probe slash aliases, including query preservation; only exact published routes.
export async function auditCanonicalAliases({fetchImpl=fetch,log=console.log}={}){
 const errors=[],passed=[];
 let cursor=0;
 const paths=PUBLIC_ALIAS_PATHS.map(path=>path+"?seo_probe=1");
 await Promise.all(Array.from({length:4},async()=>{
  while(cursor<paths.length){
   const path=paths[cursor++],source=ORIGIN+path,expected=source.replace("?","/?");
   try{
    const response=await fetchImpl(source,{method:"GET",redirect:"manual",signal:AbortSignal.timeout(15000)});
    const location=response.headers.get("location");await response.body?.cancel();
    if(![301,308].includes(response.status)||!location||new URL(location,source).href!==expected)throw Error("expected permanent redirect to "+expected+", got "+response.status+" "+location);
    const target=await fetchImpl(expected,{method:"GET",redirect:"manual",signal:AbortSignal.timeout(15000)});
    await target.body?.cancel();
    if(target.status!==200)throw Error("destination expected 200, got "+target.status);
    passed.push(source);log("PASS "+source);
   }catch(e){errors.push(source+": "+e.message);log("FAIL "+source+": "+e.message)}
  }
 }));
 return {passed:passed.length,failed:errors.length,errors};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=await auditRedirects();
 console.log("SEO migration: "+result.passed+" passed, "+result.failed+" failed");
 const aliases=await auditCanonicalAliases();
 console.log("SEO slash aliases: "+aliases.passed+" passed, "+aliases.failed+" failed");
 if(result.failed||aliases.failed)process.exitCode=1;
}
