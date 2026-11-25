import {test} from "node:test";
import assert from "node:assert/strict";
import {inspectAiResponse,auditAiAccess,PUBLIC_PATHS,SEARCH_AGENTS} from "../scripts/check-live-aieo.mjs";
const origin="https://koolo.app";
const html=url=>'<html><head><link rel="canonical" href="'+url+'"><meta name="robots" content="index,follow"></head><body><h1>Koolo</h1></body></html>';
test("AI probe rejects challenge, noindex and wrong canonical",()=>{
 const url=origin+"/";
 const res={status:200,headers:new Headers(),body:html(url)};
 assert.doesNotThrow(()=>inspectAiResponse(res,url,"html"));
 assert.throws(()=>inspectAiResponse({...res,status:403},url,"html"),/403/);
 assert.throws(()=>inspectAiResponse({...res,headers:new Headers({"cf-mitigated":"challenge"})},url,"html"),/challenge/);
 assert.throws(()=>inspectAiResponse({...res,headers:new Headers({"x-robots-tag":"noindex"})},url,"html"),/indexability/);
 assert.throws(()=>inspectAiResponse({...res,body:html(origin+"/wrong/")},url,"html"),/canonical/);
});
test("AI audit checks each search agent and reports failures",async()=>{
 const robots="User-agent: *\nAllow: /\nSitemap: "+origin+"/sitemap.xml";
 const sitemap="<urlset>"+PUBLIC_PATHS.map(p=>"<url><loc>"+origin+p+"</loc></url>").join("")+"</urlset>";
 const seen=[];
 const result=await auditAiAccess({log:()=>{},fetchImpl:async(url,opts)=>{
  seen.push(opts.headers["User-Agent"]);
  const path=new URL(url).pathname;
  return new Response(path==="/robots.txt"?robots:path==="/sitemap.xml"?sitemap:html(url),
   {status:opts.headers["User-Agent"]==="OAI-SearchBot"&&path==="/teacher/"?403:200});
 }});
 assert.equal(result.checks.length,SEARCH_AGENTS.length*(PUBLIC_PATHS.length+2));
 assert.equal(result.failed,1);
 assert.deepEqual([...new Set(seen)],SEARCH_AGENTS);
});
