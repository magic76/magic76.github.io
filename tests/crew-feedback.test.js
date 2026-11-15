const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const code=fs.readFileSync(path.join(__dirname,"../functions/api/feedback.js"),"utf8");
const load=()=>import("data:text/javascript;base64,"+Buffer.from(code).toString("base64"));
const request=(body,extra={})=>new Request("https://www.3sssi.com/api/feedback",{method:"POST",headers:{"origin":"https://www.3sssi.com","content-type":"application/json","cf-connecting-ip":"203.0.113.7",...extra},body:JSON.stringify(body)});
const payload={kind:"bug",message:"Something broke on the games page.",contact:"",page:"/games",website:""};
function fakeDb(){
 const rows=[],rates=new Map(),sqls=[];let id=100;
 return {rows,rates,sqls,prepare(sql){
  sqls.push(sql);let args=[];
  return {bind(...values){args=values;return this},async run(){
   if(sql.startsWith("CREATE TABLE"))return {success:true,meta:{changes:0}};
   if(sql.startsWith("DELETE FROM crew_feedback_limit")){for(const [key,val] of rates)if(val.hour<args[0])rates.delete(key);return {success:true,meta:{changes:0}}}
   if(sql.startsWith("INSERT INTO crew_feedback_limit")){
    const [key,hour]=args,prior=rates.get(key);
    if(prior?.hits>=3)return {success:true,meta:{changes:0}};
    rates.set(key,{hour,hits:(prior?.hits||0)+1});
    return {success:true,meta:{changes:1}};
   }
   if(sql.startsWith("INSERT INTO crew_feedback (")){
    rows.push({id:++id,kind:args[0],message:args[1],contact:args[2],page:args[3]});
    return {success:true,meta:{changes:1,last_row_id:id}};
   }
   throw Error("Unexpected query "+sql);
  }};
 }};
}
test("GET only requires the D1 binding; returns no secrets or data",async()=>{
 const api=await load(),db=fakeDb();
 assert.deepEqual(await (await api.onRequestGet({env:{}})).json(),{enabled:false});
 assert.deepEqual(await (await api.onRequestGet({env:{CREW_FEEDBACK_DB:db}})).json(),{enabled:true});
});
test("POST validates origin, input, and honeypot",async()=>{
 const api=await load(),env={CREW_FEEDBACK_DB:fakeDb()};
 assert.equal((await api.onRequestPost({request:request(payload,{"origin":"https://attacker.example"}),env})).status,403);
 assert.equal((await api.onRequestPost({request:request({...payload,message:"short"}),env})).status,400);
 assert.equal((await api.onRequestPost({request:request({...payload,website:"spam.example"}),env})).status,400);
 assert.equal((await api.onRequestPost({request:request(payload,{"cf-connecting-ip":""}),env})).status,403);
 assert.equal((await api.onRequestPost({request:request(payload),env:{}})).status,503);
});
test("POST stores private D1 record, returns FB id, and throttles 4th submission",async()=>{
 const api=await load(),db=fakeDb(),env={CREW_FEEDBACK_DB:db},old=globalThis.fetch;
 globalThis.fetch=()=>{throw Error("No network calls are allowed")};
 try{
  for(let i=0;i<3;i++){
   const response=await api.onRequestPost({request:request({...payload,page:"/en/games"}),env});
   assert.equal(response.status,201);
   assert.deepEqual(await response.json(),{ok:true,reference:"FB-"+(101+i)});
  }
  const limited=await api.onRequestPost({request:request(payload),env});
  assert.equal(limited.status,429);
  assert.deepEqual(await limited.json(),{error:"RATE_LIMITED"});
  assert.equal(db.rows.length,3);
  assert.deepEqual(db.rows[0],{id:101,kind:"bug",message:payload.message,contact:"",page:"/en/games"});
  assert.equal([...db.rates.keys()][0].includes("203.0.113.7"),false);
 }finally{globalThis.fetch=old}
});
test("frontend has no Turnstile or email fallback and retains its draft on errors",()=>{
 const source=fs.readFileSync(path.join(__dirname,"../web-spa/src/pages/FeedbackPage.tsx"),"utf8");
 assert.doesNotMatch(source,/mailto:|turnstile|emailFallback|captcha/);
 assert.match(source,/setStatus\("error"\)/);
 assert.match(source,/RATE_LIMITED/);
});

test("submit stays clickable and explains invalid fields without a readiness GET gate",()=>{
 const source=fs.readFileSync(path.join(__dirname,"../web-spa/src/pages/FeedbackPage.tsx"),"utf8");
 assert.doesNotMatch(source,/availability!==|availability==="ready"|fetch\("\/api\/feedback",\{cache:/);
 assert.match(source,/type="submit" disabled=\{status==="sending"\}/);
 assert.match(source,/setErrorCode\("required"\)/);
 assert.match(source,/setErrorCode\("invalidEmail"\)/);
 assert.match(source,/messageRef\.current\?\.focus\(\)/);
 assert.match(source,/emailRef\.current\?\.focus\(\)/);
 assert.match(source,/response\.status===503/);
 assert.match(source,/role="alert"/);
 const adapter=fs.readFileSync(path.join(__dirname,"../scripts/prepare-cloudflare.mjs"),"utf8");
 assert.match(adapter,/\/settings","\/account","\/privacy","\/usage","\/feedback"/);
});
