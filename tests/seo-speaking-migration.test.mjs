import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {auditRedirects,ORIGIN,LEGACY_HOSTS,MIGRATION_PATHS} from "../scripts/check-seo-migration.mjs";

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
 assert.match(guide,/target:"\/teacher\/roles\?mode=teacher"/);
 assert.match(guide,/No API key needed to start/);
 assert.match(guide,/not a certified pronunciation assessment/);
});
