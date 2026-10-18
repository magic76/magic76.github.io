const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");

function compile(file){
 const source=fs.readFileSync(path.join(root,file),"utf8");
 const stripped=stripTypeScriptTypes(source,{mode:"strip"});
 const exports=[...source.matchAll(/export async function (\w+)/g)].map(match=>match[1]);
 const js=stripped.replace(/export async function /g,"async function ")+"\nmodule.exports={"+exports.join(",")+"};";
 const mod={exports:{}};
 const load=new Function("module","exports","require","Response","Request","fetch","crypto","atob","TextEncoder","TextDecoder",js);
 load(mod,mod.exports,require,Response,Request,fetch,globalThis.crypto,atob,TextEncoder,TextDecoder);
 return mod.exports;
}
const payload={event:"friend_conversation",detail:"",visitorId:"aab11919-1a11-4c99-a011-000000000001",sessionId:"aab11919-1a11-4c99-a011-000000000002"};
function request(data=payload,extra={}){
 return new Request("https://www.3sssi.com/api/usage/event",{method:"POST",
  headers:{"content-type":"application/json","origin":"https://www.3sssi.com",...extra},
  body:JSON.stringify(data)});
}
test("Pages Functions only run on intended API routes",()=>{
 const routes=JSON.parse(fs.readFileSync(path.join(root,"_routes.json"),"utf8"));
 assert.deepEqual(routes.include,["/api/usage/*","/api/feedback","/api/feedback/*"]);
 assert.deepEqual(routes.exclude,[]);
 const adapter=fs.readFileSync(path.join(root,"scripts/prepare-cloudflare.mjs"),"utf8");
 assert.ok(adapter.includes('"_routes.json"'));
});

test("event handler rejects unconfigured deployment and invalid or spoofed events",async()=>{
 const {onRequestPost}=compile("functions/api/usage/event.ts");
 const noBinding=await onRequestPost({request:request(),env:{}});
 assert.equal(noBinding.status,503);
 const points=[],env={ANALYTICS_ENGINE:{writeDataPoint:p=>points.push(p)}};
 assert.equal((await onRequestPost({request:request({...payload,event:"not_allowlisted"}),env})).status,400);
 assert.equal((await onRequestPost({request:request({...payload,visitorId:"someone@example.com"}),env})).status,400);
 assert.equal((await onRequestPost({request:request(payload,{"origin":"https://evil.invalid"}),env})).status,403);
 assert.equal((await onRequestPost({request:request(payload,{"user-agent":"curl/8"}),env})).status,204);
 assert.equal(points.length,0);
 const valid=await onRequestPost({request:request(),env});
 assert.equal(valid.status,204);
 assert.equal(points.length,1);
 assert.deepEqual(points[0].blobs,[payload.event,payload.visitorId,"",payload.sessionId]);
 assert.deepEqual(points[0].indexes,[payload.visitorId]);
 const bucket=await onRequestPost({request:request({...payload,event:"teacher_session_end",detail:"from_3_to_10m"}),env});
 assert.equal(bucket.status,204);
 assert.deepEqual(points[1].blobs,["teacher_session_end",payload.visitorId,"from_3_to_10m",payload.sessionId]);
 assert.equal((await onRequestPost({request:request({...payload,event:"teacher_session_end",detail:"private transcript"}),env})).status,400);
 assert.equal((await onRequestPost({request:request({...payload,event:"vocabulary_practice"}),env})).status,204);
});

test("report handler fails closed without verified Cloudflare Access JWT",async()=>{
 const {onRequestGet}=compile("functions/api/usage/report.ts");
 const blank=await onRequestGet({request:new Request("https://www.3sssi.com/api/usage/report"),env:{}});
 assert.equal(blank.status,403);
 const fake=await onRequestGet({
  request:new Request("https://www.3sssi.com/api/usage/report",{headers:{"cf-access-jwt-assertion":"fake.fake.fake"}}),
  env:{CREW_USAGE_ACCESS_ISS:"https://example.cloudflareaccess.com",CREW_USAGE_ACCESS_AUD:"audience",
   CREW_USAGE_ADMIN_EMAIL:"admin@example.com",CREW_USAGE_ACCOUNT_ID:"1".repeat(32),CREW_USAGE_SQL_TOKEN:"hidden"}
 });
 assert.equal(fake.status,403);
});
