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
 const qaRaw=fs.readFileSync(path.join(root,"functions/api/guest/qa.js"),"utf8");
 const qaSource=qaRaw.replace(
  'import {mintToken,verifyCaptcha} from "./token.js";',
  'const {mintToken,verifyCaptcha}=await import("'+backendUrl+'");'
 );
 assert.notEqual(qaRaw,qaSource);
 const qaUrl="data:text/javascript;base64,"+Buffer.from(qaSource).toString("base64");
 const workerRaw=fs.readFileSync(path.join(root,"workers/guest-trial/worker.mjs"),"utf8");
 let workerSource=workerRaw.replace(
  'import {onRequestGet,onRequestPost} from "../../functions/api/guest/token.js";',
  'const {onRequestGet,onRequestPost}=await import("'+backendUrl+'");'
 );
 workerSource=workerSource.replace(
  'import {onQaGet,onQaPost} from "../../functions/api/guest/qa.js";',
  'const {onQaGet,onQaPost}=await import("'+qaUrl+'");'
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
   assert.ok(Date.parse(body.expireTime)-Date.now()<210000);
   assert.equal(body.uses,1);
   assert.ok(Date.parse(body.newSessionExpireTime)-Date.now()<=45000);
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

test("private QA is absent from production and fails closed without short-lived gating",async()=>{
 const worker=await loadStandaloneWorker();
 const url="https://crew-guest-trial.shanliyoung.workers.dev/api/guest/qa";
 const preview="https://test123.magic76-github-io.pages.dev";
 const access="q".repeat(48);
 const settings={
  ...env(undefined),GUEST_TRIAL_ENABLED:"0",GUEST_QA_ENABLED:"1",
  GUEST_ALLOW_PREVIEW:"1",GUEST_PREVIEW_ORIGIN:preview,
  GUEST_QA_ACCESS_TOKEN:access,GUEST_QA_UNTIL:new Date(Date.now()+3600000).toISOString(),
  GUEST_QA_RATE_LIMITER:{limit:async()=>({success:true})}
 };
 const request=(origin=preview,token=access)=>new Request(url,{headers:{"Origin":origin,"x-crew-qa-token":token}});
 assert.equal((await worker.fetch(request("https://www.3sssi.com"),settings)).status,403);
 assert.equal((await worker.fetch(request(preview,"bad"),settings)).status,403);
 assert.equal((await worker.fetch(request(preview),{...settings,GUEST_QA_ENABLED:"0"})).status,503);
 assert.equal((await worker.fetch(request(preview),{...settings,GUEST_QA_UNTIL:new Date(Date.now()-1000).toISOString()})).status,503);
 assert.equal((await worker.fetch(request(preview),{...settings,GUEST_QA_RATE_LIMITER:undefined})).status,503);
 assert.equal((await worker.fetch(request(preview),{...settings,GUEST_QA_ACCESS_TOKEN:"short"})).status,403);
 const good=await worker.fetch(request(preview),settings);
 assert.equal(good.status,200);
 const body=await good.json();
 assert.equal(body.enabled,true);
 assert.equal(body.qa,true);
 assert.equal(body.seconds,180);
 assert.equal(body.token,undefined);
 assert.equal(body.siteKey,"public-site-key");
});

test("private QA issues one token after Turnstile and limiter, with no DB binding",async()=>{
 const worker=await loadStandaloneWorker();
 const url="https://crew-guest-trial.shanliyoung.workers.dev/api/guest/qa";
 const preview="https://test123.magic76-github-io.pages.dev";
 const access="qa-private-access-key-".padEnd(48,"X");
 let allow=true;
 const settings={
  ...env(undefined),GUEST_TRIAL_ENABLED:"0",GUEST_QA_ENABLED:"1",
  GUEST_ALLOW_PREVIEW:"1",GUEST_PREVIEW_ORIGIN:preview,
  GUEST_QA_ACCESS_TOKEN:access,GUEST_QA_UNTIL:new Date(Date.now()+3600000).toISOString(),
  GUEST_QA_RATE_LIMITER:{limit:async()=>({success:allow})}
 };
 const post=()=>new Request(url,{method:"POST",headers:{
  "origin":preview,"x-crew-qa-token":access,"content-type":"application/json",
  "cf-connecting-ip":"203.0.113.9","user-agent":"Crew-QA-Test"
 },body:JSON.stringify({challengeToken:"turnstile-valid-test-token"})});
 const mock=mockedServices({hostname:"test123.magic76-github-io.pages.dev"});
 try{
  const preflight=await worker.fetch(new Request(url,{method:"OPTIONS",headers:{
   origin:preview,"access-control-request-method":"POST",
   "access-control-request-headers":"content-type,x-crew-qa-token"
  }}),settings);
  assert.equal(preflight.status,204);
  assert.match(preflight.headers.get("access-control-allow-headers"),/x-crew-qa-token/);
  const success=await worker.fetch(post(),settings);
  assert.equal(success.status,200);
  const grant=await success.json();
  assert.equal(grant.model,"gemini-3.8-live");
  assert.equal(grant.seconds,180);
  assert.equal(grant.token,"ephemeral-test-one-use-token");
  assert.equal(success.headers.get("access-control-allow-origin"),preview);
  assert.equal(mock.counts().minted,1);
  allow=false;
  const limited=await worker.fetch(post(),settings);
  assert.equal(limited.status,429);
  assert.equal((await limited.json()).code,"QA_LIMIT");
  assert.equal(mock.counts().minted,1);
 }finally{mock.restore()}
});

// Regression: QA must not leak enablement through different error responses.
test("private QA denies bad access before revealing configuration, enforces time zone",async()=>{
 const worker=await loadStandaloneWorker(),url="https://crew-guest-trial.shanliyoung.workers.dev/api/guest/qa";
 const origin="https://test123.magic76-github-io.pages.dev",secret="Q".repeat(48);
 const base={...env(undefined),GUEST_TRIAL_ENABLED:"0",GUEST_QA_ENABLED:"1",
  GUEST_ALLOW_PREVIEW:"1",GUEST_PREVIEW_ORIGIN:origin,GUEST_QA_ACCESS_TOKEN:secret,
  GUEST_QA_UNTIL:new Date(Date.now()+7200000).toISOString(),
  GUEST_QA_RATE_LIMITER:{limit:async()=>({success:true})}};
 const req=(token)=>new Request(url,{headers:{Origin:origin,"x-crew-qa-token":token}});
 assert.equal((await worker.fetch(req("bad"),base)).status,403);
 assert.equal((await worker.fetch(req("bad"),{...base,GUEST_QA_ENABLED:"0"})).status,403);
 assert.equal((await worker.fetch(req(secret),{...base,GUEST_QA_UNTIL:"2026-10-28T13:00:00"})).status,503);
 assert.equal((await worker.fetch(req(secret),{...base,GUEST_QA_UNTIL:new Date(Date.now()+18000000).toISOString()})).status,503);
});
test("Turnstile action mismatch blocks minted credentials",async()=>{
 const {onRequestPost}=await backend;
 const fake=mockedServices({badAction:true});
 try{
  assert.equal((await onRequestPost({request:req(),env:env(fakeDb())})).status,403);
  assert.equal(fake.counts().minted,0);
 }finally{fake.restore()}
});

test("guest QA page and discovery guard against lifecycle and opt-in regressions",()=>{
 const page=fs.readFileSync(path.join(root,"web-spa/src/pages/GuestTrialPage.tsx"),"utf8");
 const gate=fs.readFileSync(path.join(root,"web-spa/src/onboarding/OnboardingGate.tsx"),"utf8");
 const helper=fs.readFileSync(path.join(root,"web-spa/src/lib/guestTrial.ts"),"utf8");
 assert.match(page,/if\(qaMode\)setPhase\("unavailable"\)/);
 assert.match(page,/active\.current=false;resetTimer\(\)/);
 assert.match(page,/guest-page-leave/);
 assert.match(page,/document\.addEventListener\("visibilitychange"/);
 assert.match(page,/window\.addEventListener\("pagehide"/);
 assert.match(page,/performance\.now\(\)/);
 assert.doesNotMatch(page,/deadline\.current-Date\.now\(\)/);
 assert.ok(page.indexOf("await ensureLive();")<page.indexOf("getUserMedia({audio:true})"));
 assert.match(page,/content-type"\)\?\.toLowerCase\(\)\.includes\("application\/json"\)/);
 assert.match(page,/action:qaMode\?"crew-guest-qa":"crew-guest-trial"/);
 assert.match(helper,/VITE_CREW_GUEST_TRIAL_ENABLED==="1"/);
 assert.match(helper,/!isCrewAndroidShell\(\)/);
 assert.doesNotMatch(gate,/isCrewAndroidShell\(/);
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
