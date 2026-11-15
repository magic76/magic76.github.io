const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const source=fs.readFileSync(path.join(__dirname,"../functions/api/usage/report.ts"),"utf8");
function compile(network){
 const js=stripTypeScriptTypes(source,{mode:"strip"})
  .replace(/export async function /g,"async function ")+
  "\nreturn {onRequestGet,onRequestPost};";
 return new Function("fetch","crypto","atob","TextEncoder","TextDecoder","Request","Response",js)(
  network,globalThis.crypto,atob,TextEncoder,TextDecoder,Request,Response
 );
}
const issuer="https://private-team.cloudflareaccess.com",aud="crew-private-audience",email="owner@example.com";
const makeEnv=db=>({
 CREW_USAGE_ACCESS_ISS:issuer,CREW_USAGE_ACCESS_AUD:aud,
 CREW_USAGE_ADMIN_EMAIL:email,CREW_FEEDBACK_DB:db
});
function fakeDb(){
 const feedback=[
  {id:11,kind:"bug",message:"The browser could not send feedback.",contact:"hi@example.com",page:"/games",created_at:"2026-11-15 06:00:00"},
  {id:10,kind:"idea",message:"Please add better lesson summaries.",contact:"",page:"/learn",created_at:"2026-11-15 05:00:00"}
 ],review=new Map(),log=[];
 return {feedback,review,log,prepare(sql){
  let args=[];
  return {bind(...values){args=values;return this},
   async run(){
    log.push({sql,args});
    if(sql.startsWith("CREATE TABLE"))return {success:true};
    if(sql.startsWith("INSERT INTO crew_feedback_review")){
     review.set(args[0],{status:args[1],updated_at:"2026-11-15 08:00:00"});
     return {success:true,meta:{changes:1}};
    }
    throw Error("Unexpected statement: "+sql);
   },
   async first(){
    log.push({sql,args});
    if(sql.startsWith("SELECT COUNT(*)"))return {
     total:feedback.length,
     newCount:feedback.filter(row=>!review.has(row.id)||review.get(row.id).status==="new").length,
     workingCount:feedback.filter(row=>review.get(row.id)?.status==="working").length,
     doneCount:feedback.filter(row=>review.get(row.id)?.status==="done").length
    };
    if(sql.startsWith("SELECT id FROM crew_feedback WHERE id="))return feedback.find(row=>row.id===args[0])||null;
    throw Error("Unexpected first query: "+sql);
   },
   async all(){
    log.push({sql,args});
    if(!sql.startsWith("SELECT f.id"))throw Error("Unexpected list query: "+sql);
    const [kind,,status,,before]=args;
    const items=feedback.filter(row=>
     (kind==="all"||row.kind===kind)&&
     (status==="all"||(review.get(row.id)?.status||"new")===status)&&row.id<before)
     .sort((a,b)=>b.id-a.id).map(row=>({
      ...row,status:review.get(row.id)?.status||"new",
      reviewed_at:review.get(row.id)?.updated_at||null
     }));
    return {success:true,results:items};
   }
  };
 }};
}
function req(method="GET",query="view=feedback",token="",data=null,origin="https://www.3sssi.com"){
 const headers={"cf-access-jwt-assertion":token};
 if(method==="POST"){headers.origin=origin;headers["content-type"]="application/json"}
 return new Request("https://www.3sssi.com/api/usage/report?"+query,{
  method,headers,body:data===null?undefined:JSON.stringify(data)
 });
}
function b64(value){return Buffer.from(JSON.stringify(value)).toString("base64url")}
async function signedAccess(overrides={}){
 const pair=await crypto.subtle.generateKey({
  name:"RSASSA-PKCS1-v1_5",modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"
 },true,["sign","verify"]);
 const jwk=await crypto.subtle.exportKey("jwk",pair.publicKey);
 const header=b64({alg:"RS256",kid:"owner-key"});
 const payload=b64({iss:issuer,aud:[aud],email,exp:Math.floor(Date.now()/1000)+600,...overrides});
 const unsigned=header+"."+payload;
 const signature=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",pair.privateKey,new TextEncoder().encode(unsigned));
 return {
  token:unsigned+"."+Buffer.from(signature).toString("base64url"),
  fetch:async url=>{
   assert.equal(url,issuer+"/cdn-cgi/access/certs");
   return new Response(JSON.stringify({keys:[{...jwk,kid:"owner-key"}]}),{status:200});
  }
 };
}
test("feedback inbox fails closed without a valid signed owner JWT, before touching D1",async()=>{
 const db=fakeDb(),api=compile(async()=>{throw Error("Unauthorized network access")});
 assert.equal((await api.onRequestGet({request:req(),env:makeEnv(db)})).status,403);
 assert.equal((await api.onRequestPost({request:req("POST","view=feedback","fake.fake.fake",{id:11,status:"done"}),env:makeEnv(db)})).status,403);
 assert.equal(db.log.length,0);
});
test("signed access validates the exact owner email and JWT audience",async()=>{
 const t=await signedAccess({email:"other@example.com"}),db=fakeDb(),api=compile(t.fetch);
 assert.equal((await api.onRequestGet({request:req("GET","view=feedback",t.token),env:makeEnv(db)})).status,403);
 const other=await signedAccess({aud:["wrong-audience"]}),wrong=compile(other.fetch);
 assert.equal((await wrong.onRequestGet({request:req("GET","view=feedback",other.token),env:makeEnv(db)})).status,403);
 assert.equal(db.log.length,0);
});
test("private listing, filtering, paging, mutations, and no-secret response",async()=>{
 const t=await signedAccess(),db=fakeDb(),api=compile(t.fetch),env=makeEnv(db);
 const noDb=await api.onRequestGet({request:req("GET","view=feedback",t.token),env:makeEnv(null)});
 assert.equal(noDb.status,503);
 const res=await api.onRequestGet({request:req("GET","view=feedback",t.token),env});
 assert.equal(res.status,200);
 assert.equal(res.headers.get("cache-control"),"no-store");
 const data=await res.json();
 assert.deepEqual(data.items.map(row=>row.id),[11,10]);
 assert.deepEqual(data.items.map(row=>row.status),["new","new"]);
 assert.equal(data.items[0].contact,"hi@example.com");
 assert.equal(data.summary.new,2);
 assert.equal(data.summary.total,2);
 assert.equal((await api.onRequestGet({request:req("GET","view=feedback&before=bad",t.token),env})).status,400);
 assert.equal((await api.onRequestGet({request:req("GET","view=feedback&status=unknown",t.token),env})).status,400);
 assert.equal((await api.onRequestPost({request:req("POST","view=feedback",t.token,{id:11,status:"done"},"https://attacker.invalid"),env})).status,403);
 assert.equal((await api.onRequestPost({request:req("POST","view=feedback",t.token,{id:11,status:"hacked"}),env})).status,400);
 assert.equal((await api.onRequestPost({request:req("POST","view=feedback",t.token,{id:999,status:"done"}),env})).status,404);
 const update=await api.onRequestPost({request:req("POST","view=feedback",t.token,{id:11,status:"working"}),env});
 assert.equal(update.status,200);
 assert.deepEqual(await update.json(),{ok:true,id:11,status:"working"});
 assert.equal(db.review.get(11).status,"working");
 const selected=await api.onRequestGet({request:req("GET","view=feedback&kind=bug&status=working",t.token),env});
 assert.deepEqual((await selected.json()).items.map(item=>item.id),[11]);
 assert.equal((await api.onRequestPost({request:req("POST","view=stats",t.token,{id:11,status:"done"}),env})).status,400);
});
test("admin endpoint stays under /usage Access route; public feedback API has no reader",()=>{
 const app=fs.readFileSync(path.join(__dirname,"../web-spa/src/App.tsx"),"utf8");
 const adapter=fs.readFileSync(path.join(__dirname,"../scripts/prepare-cloudflare.mjs"),"utf8");
 const client=fs.readFileSync(path.join(__dirname,"../web-spa/src/analytics/FeedbackInboxPage.tsx"),"utf8");
 const publicApi=fs.readFileSync(path.join(__dirname,"../functions/api/feedback.js"),"utf8");
 assert.match(app,/path="\/usage\/feedback"/);
 assert.match(adapter,/"\/usage\/feedback"/);
 assert.match(client,/\/api\/usage\/report\?/);
 assert.match(client,/credentials:"same-origin"/);
 assert.doesNotMatch(publicApi,/SELECT\s+.*FROM crew_feedback|onRequestPut|onRequestDelete/);
 assert.match(source,/verifyAccess\(request,env\)/);
 assert.match(source,/if\(view==="feedback"\)return listFeedback/);
 assert.match(source,/return updateFeedback\(request,env\)/);
});
