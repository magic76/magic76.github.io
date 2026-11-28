import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {auditRedirects,auditCanonicalAliases,ORIGIN,LEGACY_HOSTS,MIGRATION_PATHS,PUBLIC_ALIAS_PATHS} from "../scripts/check-seo-migration.mjs";

function mockFetch({status=301,dropQuery=false,finalStatus=200}={}){
 return async (url,options)=>{
  assert.equal(options.redirect,"manual");
  const parsed=new URL(url);
  if(parsed.origin===ORIGIN)return new Response(null,{status:finalStatus});
  assert.ok(LEGACY_HOSTS.includes(parsed.origin));
  return new Response(null,{status,headers:{location:ORIGIN+parsed.pathname+(dropQuery?"":parsed.search)}});
 };
}
test("migration checks direct permanent redirects and final HTTP 200",async()=>{
 const result=await auditRedirects({fetchImpl:mockFetch(),log:()=>{}});
 assert.equal(result.passed,LEGACY_HOSTS.length*MIGRATION_PATHS.length);
 assert.equal(result.failed,0);
});
test("migration rejects temporary redirects, lost query parameters and bad destinations",async()=>{
 for(const options of [{status:302},{dropQuery:true},{finalStatus:404}]){
  const result=await auditRedirects({fetchImpl:mockFetch(options),log:()=>{}});
  assert.ok(result.failed>0);
 }
});
test("English speaking guide keeps its existing slug and teacher route, with concrete conversation exercises",()=>{
 const source=readFileSync(new URL("../web-spa/src/guides/catalog.ts",import.meta.url),"utf8");
 const start=source.indexOf(' "ai-english-speaking":{');
 const end=source.indexOf(' "ai-conversation-partner":{',start);
 assert.ok(start>=0&&end>start);
 const guide=source.slice(start,end);
 assert.match(guide,/English Conversation Practice with an AI Tutor/);
 assert.match(guide,/Try a conversation before you open the tutor/);
 assert.match(guide,/Practice listening, pronunciation and speaking together/);
 assert.match(guide,/target:"\/learn"/);
 assert.match(guide,/No API key needed to start/);
 assert.match(guide,/not a certified pronunciation assessment/);
});

test("public aliases are exact, retain locale and query, and exclude dynamic app paths",async()=>{
 assert.equal(new Set(PUBLIC_ALIAS_PATHS).size,PUBLIC_ALIAS_PATHS.length);
 for(const path of ["/en","/en/games","/en/story","/en/fortune","/guides/ai-english-speaking","/en/guides/ai-english-speaking"])assert.ok(PUBLIC_ALIAS_PATHS.includes(path),path);
 assert.ok(PUBLIC_ALIAS_PATHS.every(p=>!p.endsWith("/")&&!p.includes("*")&&!p.startsWith("/api/")));
 for(const path of ["/teacher/live","/teacher/roles","/fortune/reading","/friend/live","/en/account","/settings"])assert.ok(!PUBLIC_ALIAS_PATHS.includes(path),path);
 const mock=({dropQuery=false,status=301}={})=>async(url,options)=>{
  assert.equal(options.redirect,"manual");
  const u=new URL(url);
  if(u.pathname.endsWith("/"))return new Response(null,{status:200});
  return new Response(null,{status,headers:{location:u.origin+u.pathname+"/"+(dropQuery?"":u.search)}});
 };
 const result=await auditCanonicalAliases({fetchImpl:mock(),log:()=>{}});
 assert.equal(result.passed,PUBLIC_ALIAS_PATHS.length);
 for(const options of [{dropQuery:true},{status:302}])assert.equal((await auditCanonicalAliases({fetchImpl:mock(options),log:()=>{}})).failed,PUBLIC_ALIAS_PATHS.length);
});
test("guide links use canonical paths and descriptive English anchor",()=>{
 const hub=readFileSync(new URL("../web-spa/src/guides/GuideHub.tsx",import.meta.url),"utf8");
 const guide=readFileSync(new URL("../web-spa/src/guides/GuidePage.tsx",import.meta.url),"utf8");
 assert.ok(hub.includes('"/guides/"+slug+"/"'));
 assert.ok(hub.includes("AI English Speaking Practice"));
 assert.ok(guide.includes('"/guides/"+slug+"/"'));
});
