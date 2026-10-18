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
 new Function("module","Response","Request","fetch","crypto","atob","TextEncoder","TextDecoder",js)(
  mod,Response,Request,fetch,require("node:crypto").webcrypto,atob,TextEncoder,TextDecoder);
 return mod.exports;
}
const payload={kind:"bug",reason:"repeated_question",message:"Repeats the same clue",product:"play",platform:"web",includeDiagnostics:true,page:"/games/taboo",roleId:"zoe",model:"gemini-3.8-live"};
const secret="private-test-rate-limiting-secret-123456";
function request(data=payload,headers={}){
 return new Request("https://www.3sssi.com/api/feedback",{method:"POST",
  headers:{"content-type":"application/json","origin":"https://www.3sssi.com","CF-Connecting-IP":"198.51.100.8",...headers},
  body:JSON.stringify(data)});
}
function mockDB(){
 const events=[],rates=[];
 return {events,rates,prepare(sql){
  return {bind(...args){
   return {async run(){
    if(sql.startsWith("INSERT INTO feedback_rate_limits")){
     rates.push(args);return{meta:{changes:rates.length<=5?1:0}};
    }
    if(sql.startsWith("INSERT INTO feedback(")){events.push(args);return{meta:{changes:1}}}
    return{meta:{changes:1}};
   }};
  }};
 }};
}
test("Feedback endpoint is routed and build adapter preserves routes",()=>{
 const routes=JSON.parse(fs.readFileSync(path.join(root,"_routes.json"),"utf8"));
 assert.ok(routes.include.includes("/api/feedback"));
 assert.ok(routes.include.includes("/api/feedback/*"));
 assert.ok(fs.readFileSync(path.join(root,"scripts/prepare-cloudflare.mjs"),"utf8").includes('"_routes.json"'));
});
test("Feedback POST rejects unsafe and invalid data without storing it",async()=>{
 const {onRequestPost}=compile("functions/api/feedback/index.ts");
 const db=mockDB(),env={FEEDBACK_DB:db,CREW_FEEDBACK_RATE_SECRET:secret};
 assert.equal((await onRequestPost({request:request(),env:{}})).status,503);
 assert.equal((await onRequestPost({request:request(payload,{origin:"https://evil.example"}),env})).status,403);
 assert.equal((await onRequestPost({request:request({...payload,transcript:"sensitive"}),env})).status,400);
 assert.equal((await onRequestPost({request:request({...payload,geminiKey:"should-never-store"}),env})).status,400);
 assert.equal((await onRequestPost({request:request({...payload,message:""}),env})).status,400);
 assert.equal((await onRequestPost({request:request({...payload,page:"/games/taboo?key=private"}),env})).status,400);
 assert.equal((await onRequestPost({request:request({...payload,reason:"secret"}),env})).status,400);
 assert.equal(db.events.length,0);assert.equal(db.rates.length,0);
});
test("Feedback limits hourly submissions and keeps only opted-in structured diagnostics",async()=>{
 const {onRequestPost}=compile("functions/api/feedback/index.ts");
 const db=mockDB(),env={FEEDBACK_DB:db,CREW_FEEDBACK_RATE_SECRET:secret};
 const noDiag={...payload,includeDiagnostics:false};
 assert.equal((await onRequestPost({request:request(noDiag),env})).status,201);
 const first=db.events[0];
 assert.equal(first[7],"");assert.equal(first[8],"");assert.equal(first[9],"");
 assert.equal(first[4],payload.message);assert.equal(first[5],"play");
 for(let i=0;i<4;i++)assert.equal((await onRequestPost({request:request(payload),env})).status,201);
 assert.equal((await onRequestPost({request:request(payload),env})).status,429);
 assert.equal(db.events.length,5);assert.equal(db.rates.length,6);
 const rating=await onRequestPost({request:request({kind:"rating",rating:1,reason:"",message:"",product:"teacher",platform:"web",includeDiagnostics:false},{
  "CF-Connecting-IP":"198.51.100.9"}),env: {FEEDBACK_DB:mockDB(),CREW_FEEDBACK_RATE_SECRET:secret}});
 assert.equal(rating.status,201);
});
test("Admin GET and PATCH fail closed when Cloudflare Access is not configured or forged",async()=>{
 const {onRequestGet,onRequestPatch}=compile("functions/api/feedback/admin.ts");
 assert.equal((await onRequestGet({request:new Request("https://www.3sssi.com/api/feedback/admin"),env:{}})).status,403);
 const forged={FEEDBACK_DB:mockDB(),CREW_USAGE_ACCESS_ISS:"https://example.cloudflareaccess.com",
  CREW_USAGE_ACCESS_AUD:"aud",CREW_USAGE_ADMIN_EMAIL:"owner@example.com"};
 assert.equal((await onRequestGet({request:new Request("https://www.3sssi.com/api/feedback/admin",{headers:{"cf-access-jwt-assertion":"fake.fake.fake"}}),env:forged})).status,403);
 assert.equal((await onRequestPatch({request:new Request("https://www.3sssi.com/api/feedback/admin",{method:"PATCH",
  headers:{origin:"https://www.3sssi.com","content-type":"application/json"},
  body:JSON.stringify({id:"11111111-1111-4111-8111-111111111111",status:"closed"})}),env:forged})).status,403);
});
