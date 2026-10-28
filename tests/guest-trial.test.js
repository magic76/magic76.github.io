const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {webcrypto}=require("node:crypto");
globalThis.crypto ||= webcrypto;
const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"functions/api/guest/token.js"),"utf8");
const backend=import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const transport=require("../crew-live.js");

function fakeDb(){
 const claims=new Map(),quotas=new Map();
 return {claims,quotas,prepare(sql){
  return {bind(...v){return {async run(){
   if(sql.startsWith("DELETE FROM guest_trial_claims WHERE expires_at")){
    for(const [key,item] of claims)if(item.expires<=v[0])claims.delete(key);
    return {meta:{changes:0}};
   }
   if(sql.startsWith("INSERT OR IGNORE INTO guest_trial_claims")){
    if(claims.has(v[0]))return {meta:{changes:0}};
    claims.set(v[0],{expires:v[2]});return {meta:{changes:1}};
   }
   if(sql.startsWith("DELETE FROM guest_trial_claims WHERE fingerprint")){
    const had=claims.delete(v[0]);return {meta:{changes:had?1:0}};
   }
   if(sql.startsWith("INSERT OR IGNORE INTO guest_daily_quota")){
    if(!quotas.has(v[0]))quotas.set(v[0],0);
    return {meta:{changes:1}};
   }
   if(sql.startsWith("UPDATE guest_daily_quota SET used=used+1")){
    const current=quotas.get(v[0])||0;
    if(current>=v[1])return {meta:{changes:0}};
    quotas.set(v[0],current+1);return {meta:{changes:1}};
   }
   if(sql.startsWith("UPDATE guest_daily_quota SET used=MAX")){
    quotas.set(v[0],Math.max(0,(quotas.get(v[0])||0)-1));
    return {meta:{changes:1}};
   }
   throw new Error("Unexpected D1 SQL: "+sql);
  }}}};
 }};
}
function env(db,overrides={}){
 return {GUEST_DB:db,GUEST_TRIAL_ENABLED:"1",GEMINI_GUEST_API_KEY:"server-secret-never-in-client",
 GUEST_TURNSTILE_SITE_KEY:"public-site-key",GUEST_TURNSTILE_SECRET:"server-turnstile-secret",
 GUEST_HASH_SALT:"unit-test-long-random-salt",GUEST_DAILY_SESSION_LIMIT:"1",...overrides};
}
function req(ip="203.0.113.9",origin="https://www.3sssi.com",token="turnstile-valid-test-token"){
 return new Request("https://www.3sssi.com/api/guest/token",{
  method:"POST",headers:{"origin":origin,"content-type":"application/json","user-agent":"Crew-Test/1.0","cf-connecting-ip":ip},
  body:JSON.stringify({challengeToken:token})
 });
}
function mockedServices(options={}){
 let minted=0,captcha=0;
 const old=globalThis.fetch;
 globalThis.fetch=async (url,init)=>{
  if(String(url).includes("siteverify")){
   captcha++;
   return Response.json({success:options.badCaptcha!==true,
    hostname:options.badHostname?"evil.example":"www.3sssi.com"});
  }
  if(String(url).includes("/v1beta/auth_tokens")){
   minted++;
   if(options.failMint)return new Response("unavailable",{status:503});
   const body=JSON.parse(init.body);
   assert.equal(init.headers["x-goog-api-key"],"server-secret-never-in-client");
   assert.equal(body.uses,1);
   assert.equal(body.liveConnectConstraints.model,"models/gemini-3.8-live");
   assert.deepEqual(body.liveConnectConstraints.config.responseModalities,["AUDIO"]);
   assert.ok(Date.parse(body.expireTime)-Date.now()<210000);
   return Response.json({name:"ephemeral-test-one-use-token"});
  }
  throw Error("Unexpected fetch "+url);
 };
 return {counts:()=>({minted,captcha}),restore:()=>{globalThis.fetch=old}};
}

test("disabled or unbound preview does not expose a trial",async()=>{
 const {onRequestGet,onRequestPost}=await backend;
 const db=fakeDb();
 let r=await onRequestGet({request:new Request("https://www.3sssi.com/api/guest/token"),env:env(db,{GUEST_TRIAL_ENABLED:"0"})});
 assert.deepEqual(await r.json(),{enabled:false});
 r=await onRequestPost({request:req(),env:env(db,{GUEST_TRIAL_ENABLED:"0"})});
 assert.equal(r.status,503);
 r=await onRequestGet({request:new Request("https://random.pages.dev/api/guest/token"),env:env(db)});
 assert.equal((await r.json()).enabled,false);
});

test("strict origin, Turnstile and bounded body gate provisioning",async()=>{
 const {onRequestPost}=await backend;
 const services=mockedServices();
 try{
  const db=fakeDb();
  assert.equal((await onRequestPost({request:req("203.0.113.1","https://evil.example"),env:env(db)})).status,403);
  assert.equal((await onRequestPost({request:req("203.0.113.1","https://www.3sssi.com","short"),env:env(db)})).status,400);
  assert.equal(services.counts().minted,0);
 }finally{services.restore()}
 const bad=mockedServices({badHostname:true});
 try{
  const r=await onRequestPost({request:req(),env:env(fakeDb())});
  assert.equal(r.status,403);
  assert.equal(bad.counts().minted,0);
 }finally{bad.restore()}
});

test("one-use fingerprint and server daily reservations block repeat/overflow",async()=>{
 const {onRequestPost}=await backend;
 const services=mockedServices();
 try{
  const db=fakeDb(),bindings=env(db);
  const first=await onRequestPost({request:req(),env:bindings});
  assert.equal(first.status,200);
  const body=await first.json();
  assert.equal(body.token,"ephemeral-test-one-use-token");
  assert.equal(body.seconds,180);
  assert.equal(body.model,"gemini-3.8-live");
  assert.match(first.headers.get("cache-control"),/no-store/);
  const repeat=await onRequestPost({request:req(),env:bindings});
  assert.equal(repeat.status,429);
  assert.equal((await repeat.json()).code,"ALREADY_USED");
  const overflow=await onRequestPost({request:req("203.0.113.10"),env:bindings});
  assert.equal(overflow.status,429);
  assert.equal((await overflow.json()).code,"DAILY_LIMIT");
  assert.equal(services.counts().minted,1);
  assert.equal(db.claims.size,1);
 }finally{services.restore()}
});

test("failed Gemini issuance refunds the claim and daily slot",async()=>{
 const {onRequestPost}=await backend;
 const db=fakeDb(),bindings=env(db);
 const down=mockedServices({failMint:true});
 try{
  const r=await onRequestPost({request:req(),env:bindings});
  assert.equal(r.status,503);
  assert.equal(db.claims.size,0);
  assert.equal([...db.quotas.values()][0],0);
 }finally{down.restore()}
 const up=mockedServices();
 try{
  const retry=await onRequestPost({request:req(),env:bindings});
  assert.equal(retry.status,200);
 }finally{up.restore()}
});

test("guest transport cannot reuse normal BYOK credential or reconnect one-use tokens",()=>{
 const guest=new transport.Session({guestAccessToken:"ephemeral-demo-token",models:["gemini-3.8-live"]});
 assert.equal(guest.guestMode,true);
 assert.equal(guest._deps.getKey(),"ephemeral-demo-token");
 assert.equal(guest.maxLiveAttempts,1);
 assert.equal(guest.maxResumeAttempts,0);
 assert.match(fs.readFileSync(path.join(root,"crew-live.js"),"utf8"),/BidiGenerateContentConstrained\?access_token=/);
 const byok=new transport.Session({models:["gemini-3.8-live"]});
 assert.equal(byok.guestMode,false);
 assert.match(fs.readFileSync(path.join(root,"crew-live.js"),"utf8"),/v1alpha\.GenerativeService\.BidiGenerateContent\?key=/);
});

test("standalone Worker rejects unexpected origins and provides strict CORS preflight",async()=>{
 const workerSource=fs.readFileSync(path.join(root,"workers/guest-trial/worker.mjs"),"utf8");
 const backendUrl="data:text/javascript;base64,"+Buffer.from(source).toString("base64");
 const substituted=workerSource.replace(/import \{onRequestGet,onRequestPost\} from "[^"]+";/,
  'const {onRequestGet,onRequestPost}=await import("'+backendUrl+'");');
 assert.notEqual(substituted,workerSource);
 const worker=(await import("data:text/javascript;base64,"+Buffer.from(substituted).toString("base64"))).default;
 const url="https://crew-guest-trial.shanliyoung.workers.dev/api/guest/token";
 const bindings=env(fakeDb(),{GUEST_TURNSTILE_SECRET:undefined,TURNSTILE_SECRET_KEY:"server-turnstile-secret"});
 const evil=await worker.fetch(new Request(url,{method:"OPTIONS",headers:{"Origin":"https://evil.example","access-control-request-method":"POST"}}),bindings);
 assert.equal(evil.status,403);
 assert.equal(evil.headers.get("access-control-allow-origin"),null);
 const pre=await worker.fetch(new Request(url,{method:"OPTIONS",headers:{"Origin":"https://www.3sssi.com","access-control-request-method":"POST"}}),bindings);
 assert.equal(pre.status,204);
 assert.equal(pre.headers.get("access-control-allow-origin"),"https://www.3sssi.com");
 const get=await worker.fetch(new Request(url,{headers:{"Origin":"https://www.3sssi.com"}}),bindings);
 assert.equal(get.status,200);
 assert.equal((await get.json()).enabled,true);
 const off=await worker.fetch(new Request(url,{headers:{"Origin":"https://www.3sssi.com"}}),env(fakeDb(),{GUEST_TRIAL_ENABLED:"0"}));
 assert.equal((await off.json()).enabled,false);
});
