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
async function loadStandaloneWorker(){
 const backendUrl="data:text/javascript;base64,"+Buffer.from(source).toString("base64");
 const workerRaw=fs.readFileSync(path.join(root,"workers/guest-trial/worker.mjs"),"utf8");
 const workerSource=workerRaw.replace(
  'import {onRequestGet,onRequestPost} from "../../functions/api/guest/token.js";',
  'const {onRequestGet,onRequestPost}=await import("'+backendUrl+'");'
 );
 assert.notEqual(workerRaw,workerSource);
 assert.ok(!workerSource.includes('from "../../functions/api/guest/'));
 return (await import("data:text/javascript;base64,"+Buffer.from(workerSource).toString("base64"))).default;
}

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
    hostname:options.badHostname?"evil.example":options.hostname||"www.3sssi.com",
    action:options.badAction?"unexpected-action":options.action|| (options.hostname?"crew-guest-qa":"crew-guest-trial")});
  }
  if(String(url).includes("/v1beta/auth_tokens")){
   minted++;
   if(options.failMint)return new Response("unavailable",{status:503});
   const body=JSON.parse(init.body);
   assert.equal(init.headers["x-goog-api-key"],"server-secret-never-in-client");
   assert.equal(body.uses,1);
   assert.equal(body.bidiGenerateContentSetup.model,"models/gemini-3.8-live");
   assert.deepEqual(body.bidiGenerateContentSetup.generationConfig.responseModalities,["AUDIO"]);
   assert.deepEqual(body.bidiGenerateContentSetup.tools,[]);
   assert.equal(body.fieldMask,"model,generationConfig.responseModalities,tools");
   assert.equal(body.liveConnectConstraints,undefined);
   assert.ok(Date.parse(body.expireTime)-Date.now()<85000);
   assert.equal(body.uses,1);
   assert.ok(Date.parse(body.newSessionExpireTime)-Date.now()<=30000);
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
  assert.equal(body.seconds,60);
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
 const worker=await loadStandaloneWorker();
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

test("standalone Worker POST consumes one verified grant and blocks repeat without BYOK",async()=>{
 const worker=await loadStandaloneWorker();
 const url="https://crew-guest-trial.shanliyoung.workers.dev/api/guest/token";
 const bindings=env(fakeDb(),{GUEST_TURNSTILE_SECRET:undefined,TURNSTILE_SECRET_KEY:"server-turnstile-secret"});
 const post=()=>new Request(url,{
  method:"POST",headers:{"Origin":"https://www.3sssi.com","content-type":"application/json",
   "cf-connecting-ip":"203.0.113.9","user-agent":"Crew-Worker-Test"},
  body:JSON.stringify({challengeToken:"turnstile-valid-test-token"})
 });
 const mocked=mockedServices();
 try{
  const first=await worker.fetch(post(),bindings);
  assert.equal(first.status,200);
  assert.equal(first.headers.get("access-control-allow-origin"),"https://www.3sssi.com");
  assert.equal((await first.json()).token,"ephemeral-test-one-use-token");
  const again=await worker.fetch(post(),bindings);
  assert.equal(again.status,429);
  assert.equal((await again.json()).code,"ALREADY_USED");
  assert.equal(mocked.counts().minted,1);
 }finally{mocked.restore()}
});

test("Turnstile action mismatch blocks minted credentials",async()=>{
 const {onRequestPost}=await backend;
 const fake=mockedServices({badAction:true});
 try{
  assert.equal((await onRequestPost({request:req(),env:env(fakeDb())})).status,403);
  assert.equal(fake.counts().minted,0);
 }finally{fake.restore()}
});

test("guest UI copy is localized in all 11 UI locale catalogs",()=>{
 const locales=JSON.parse(fs.readFileSync(path.join(root,"config/ui-locales.json"),"utf8")).locales.map(x=>x.code);
 const base=JSON.parse(fs.readFileSync(path.join(root,"web-spa/src/i18n/locales/en/common.json"),"utf8")).guestTrial;
 for(const locale of locales){
  const c=JSON.parse(fs.readFileSync(path.join(root,"web-spa/src/i18n/locales",locale,"common.json"),"utf8")).guestTrial;
  assert.deepEqual(Object.keys(c).sort(),Object.keys(base).sort(),locale);
  for(const [k,v] of Object.entries(c))assert.ok(typeof v==="string"&&v.trim(),locale+" "+k);
 }
});


// Production-origin QA is deliberately opt-in independently of the public trial.
// A changed Origin header alone must never bypass the private access token or CAPTCHA.

test("Phase 1 public guest requires Turnstile and the Worker limiter (no D1)",async()=>{
 const worker=await loadStandaloneWorker();
 const url="https://crew-guest-trial.shanliyoung.workers.dev/api/guest/token";
 let allow=true;
 const settings={GUEST_TRIAL_ENABLED:"1",GEMINI_GUEST_API_KEY:"server-secret-never-in-client",
  TURNSTILE_SECRET_KEY:"server-turnstile-secret",GUEST_TURNSTILE_SITE_KEY:"public-site-key",
  GUEST_TRIAL_RATE_LIMITER:{limit:async ({key})=>{assert.equal(key,"crew-public-guest");return {success:allow}}}};
 const post=()=>new Request(url,{method:"POST",headers:{Origin:"https://www.3sssi.com",
  "content-type":"application/json","cf-connecting-ip":"203.0.113.9","user-agent":"Crew-Guest-Test"},
  body:JSON.stringify({challengeToken:"turnstile-valid-test-token"})});
 const mock=mockedServices();
 try{
  let r=await worker.fetch(new Request(url,{headers:{Origin:"https://www.3sssi.com"}}),settings);
  assert.equal((await r.json()).seconds,60);
  r=await worker.fetch(post(),{...settings,GUEST_TRIAL_RATE_LIMITER:undefined});
  assert.equal(r.status,503);
  assert.equal(mock.counts().minted,0);
  r=await worker.fetch(post(),settings);
  assert.equal(r.status,200);
  const grant=await r.json();
  assert.equal(grant.seconds,60);
  assert.ok(Date.parse(grant.expiresAt)-Date.parse(grant.issuedAt)<=70000);
  assert.equal(mock.counts().minted,1);
  allow=false;
  r=await worker.fetch(post(),settings);
  assert.equal(r.status,429);
  assert.equal(mock.counts().minted,1);
 }finally{mock.restore()}
});
test("public voice uses original Teacher and Friend UI; QA endpoint is gone",async()=>{
 const worker=await loadStandaloneWorker(),origin="https://www.3sssi.com";
 const qa=await worker.fetch(new Request("https://crew-guest-trial.shanliyoung.workers.dev/api/guest/qa",{headers:{Origin:origin}}),{});
 assert.equal(qa.status,404);
 const starter=fs.readFileSync(path.join(root,"web-spa/src/live/GuestLiveStarter.tsx"),"utf8");
 const hook=fs.readFileSync(path.join(root,"web-spa/src/live/useLiveSession.ts"),"utf8");
 const teacher=fs.readFileSync(path.join(root,"web-spa/src/teacher/LivePage.tsx"),"utf8");
 const friend=fs.readFileSync(path.join(root,"web-spa/src/friends/FriendLivePage.tsx"),"utf8");
 const app=fs.readFileSync(path.join(root,"web-spa/src/App.tsx"),"utf8");
 const home=fs.readFileSync(path.join(root,"web-spa/src/pages/HomePage.tsx"),"utf8");
 assert.match(starter,/crew-guest-trial/);
 assert.match(hook,/guestAccessToken:grant\?\.token/);
 assert.match(hook,/\.\.\.\(grant\?\{models:\[grant\.model\],maxLiveAttempts:1,maxResumeAttempts:0\}/);
 assert.match(hook,/!guestModeRef\.current/);
 assert.match(hook,/guestDeadlineRef\.current=performance\.now\(\)\+ms/);
 assert.match(teacher,/GuestLiveStarter/);
 assert.match(friend,/GuestLiveStarter/);
 assert.doesNotMatch(app,/GuestTrialPage/);
 assert.doesNotMatch(home,/to="\/try"/);
 assert.equal(fs.existsSync(path.join(root,"web-spa/src/pages/GuestTrialPage.tsx")),false);
});

test("Guest mode skips BYOK-only teacher grading and friend reconnect",()=>{
 const teacher=fs.readFileSync(path.join(root,"web-spa/src/teacher/LivePage.tsx"),"utf8");
 const friend=fs.readFileSync(path.join(root,"web-spa/src/friends/FriendLivePage.tsx"),"utf8");
 assert.match(teacher,/if\(guestStarted\|\|live\.state!=="ended"/);
 assert.match(teacher,/if\(guestStarted\)\{await live\.stop\(true\);navigate\("\/learn"\)/);
 assert.match(friend,/live\.voicePhase==="no-reply"&&!guestStarted/);
});
