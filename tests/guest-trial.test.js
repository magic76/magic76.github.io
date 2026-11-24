const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {webcrypto}=require("node:crypto");
globalThis.crypto ||= webcrypto;
const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"functions/api/guest/token.js"),"utf8");
const backend=import("../functions/api/guest/token.js");
const transport=require("../crew-live.js");
async function loadStandaloneWorker(){return (await import("../workers/guest-trial/worker.mjs")).default;}

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
 let minted=0,captcha=0;const usedKeys=[];
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
   usedKeys.push(init.headers["x-goog-api-key"]);
   if(options.allowedKeys)assert.ok(options.allowedKeys.includes(init.headers["x-goog-api-key"]));
   else assert.equal(init.headers["x-goog-api-key"],"server-secret-never-in-client");
   assert.equal(body.uses,1);
   assert.equal(body.bidiGenerateContentSetup.model,"models/gemini-3.8-live");
   assert.deepEqual(body.bidiGenerateContentSetup.generationConfig.responseModalities,["AUDIO"]);
   assert.deepEqual(body.bidiGenerateContentSetup.tools,[]);
   assert.equal(body.fieldMask,"model,generationConfig.responseModalities,tools");
   assert.equal(body.liveConnectConstraints,undefined);
   const expiry=Date.parse(body.expireTime)-Date.now();
   assert.ok(expiry>=300000&&expiry<=310000);
   assert.equal(body.uses,1);
   assert.ok(Date.parse(body.newSessionExpireTime)-Date.now()<=30000);
   return Response.json({name:"ephemeral-test-one-use-token"});
  }
  throw Error("Unexpected fetch "+url);
 };
 return {counts:()=>({minted,captcha,usedKeys:[...usedKeys]}),restore:()=>{globalThis.fetch=old}};
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
  assert.equal(body.seconds,300);
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
 const source=fs.readFileSync(path.join(root,"crew-live.js"),"utf8");
 assert.match(source,/self\.textOnly\?"v1beta":"v1alpha"/);
 assert.match(source,/\.GenerativeService\.BidiGenerateContent\?key=/);
 const keyboard=new transport.Session({textOnly:true,models:["gemini-3.8-live"]});
 assert.equal(keyboard.guestMode,false);
 assert.equal(keyboard.textOnly,true);
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
  assert.equal((await r.json()).seconds,300);
  r=await worker.fetch(post(),{...settings,GUEST_TRIAL_RATE_LIMITER:undefined});
  assert.equal(r.status,503);
  assert.equal(mock.counts().minted,0);
  r=await worker.fetch(post(),settings);
  assert.equal(r.status,200);
  const grant=await r.json();
  assert.equal(grant.seconds,300);
  assert.equal(Date.parse(grant.expiresAt)-Date.parse(grant.issuedAt),310000);
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
 const friend=fs.readFileSync(path.join(root,"web-spa/src/friends/FriendLiveConversation.tsx"),"utf8");
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
 const friend=fs.readFileSync(path.join(root,"web-spa/src/friends/FriendLiveConversation.tsx"),"utf8");
 assert.match(teacher,/if\(guestStarted\|\|live\.state!=="ended"/);
 assert.match(teacher,/if\(guestStarted\)\{await live\.stop\(true\);navigate\("\/learn"\)/);
 assert.match(friend,/live\.voicePhase==="no-reply"&&!guestStarted/);
});

// Tests verify that Secret values never become a browser-visible API response.
test("multiple Gemini keys work as one JSON Secret; single-key installations still work",async()=>{
 const {onRequestGet,onRequestPost}=await backend;
 const allowed=["server-key-alpha-at-least-12","server-key-beta-at-least-12"];
 const cloudflareEnv=env(undefined,{
  GEMINI_GUEST_API_KEYS:JSON.stringify([...allowed,allowed[0]]),
  GUEST_TRIAL_RATE_LIMITER:{limit:async()=>({success:true})}
 });
 const mock=mockedServices({allowedKeys:allowed});
 try{
  const config=await onRequestGet({request:new Request("https://www.3sssi.com/api/guest/token"),env:cloudflareEnv});
  assert.equal((await config.json()).enabled,true);
  const result=await onRequestPost({request:req(),env:cloudflareEnv});
  assert.equal(result.status,200);
  const body=await result.json();
  assert.equal(body.seconds,300);
  assert.equal(mock.counts().minted,1);
  assert.equal(mock.counts().usedKeys.length,1);
  assert.ok(allowed.includes(mock.counts().usedKeys[0]));
  assert.ok(!JSON.stringify(body).includes("server-key-"));
 }finally{mock.restore()}
});
test("invalid Gemini multi-key Secret fails closed, without falling back to legacy key",async()=>{
 const {onRequestGet,onRequestPost}=await backend;
 const base=env(undefined,{GUEST_TRIAL_RATE_LIMITER:{limit:async()=>({success:true})}});
 for(const value of ['{"keys":["key"]}','[]','["too-short"]','["valid-server-key",1]','one-valid-key,,two-valid-key',',one-valid-key','one-valid-key,','one-valid-key, not a key','[malformed-json]','a,b,c',Array.from({length:21},(_,i)=>"valid-gemini-key-"+i).join(",")]){
  const envBad={...base,GEMINI_GUEST_API_KEYS:value};
  const r=await onRequestGet({request:new Request("https://www.3sssi.com/api/guest/token"),env:envBad});
  assert.deepEqual(await r.json(),{enabled:false});
  const post=await onRequestPost({request:req(),env:envBad});
  assert.equal(post.status,503);
 }
});
test("comma-separated Gemini API keys work without JSON and accept trimmed entries",async()=>{
 const {onRequestGet,onRequestPost}=await backend;
 const keys=["server-key-alpha-at-least-12","server-key-beta-at-least-12","server-key-gamma-at-least-12"];
 const settings=env(undefined,{
  GEMINI_GUEST_API_KEYS:" "+keys.join(" , ")+" ",
  GUEST_TRIAL_RATE_LIMITER:{limit:async()=>({success:true})}
 });
 const mock=mockedServices({allowedKeys:keys});
 try{
  const config=await onRequestGet({request:new Request("https://www.3sssi.com/api/guest/token"),env:settings});
  assert.deepEqual((await config.json()).seconds,300);
  const response=await onRequestPost({request:req(),env:settings});
  assert.equal(response.status,200);
  const token=await response.json();
  assert.ok(token.token);
  assert.equal(mock.counts().minted,1);
  assert.ok(keys.includes(mock.counts().usedKeys[0]));
  assert.ok(!JSON.stringify(token).includes("server-key-"));
 }finally{mock.restore()}
});

test("public GET reports private non-sensitive diagnostics when guest config is unavailable",async()=>{
 const worker=await loadStandaloneWorker();
 const url="https://crew-guest-trial.shanliyoung.workers.dev/api/guest/token";
 const base={GUEST_TRIAL_ENABLED:"1",GEMINI_GUEST_API_KEYS:"server-key-alpha-at-least-12",
  TURNSTILE_SECRET_KEY:"sensitive-turnstile-secret",GUEST_TRIAL_RATE_LIMITER:{limit:async()=>({success:true})}};
 const cases=[
  [{...base,GUEST_TRIAL_ENABLED:"0"},"trial_disabled"],
  [{...base,GEMINI_GUEST_API_KEYS:"a,b,c"},"gemini_keys_invalid","invalid_key_entry"],
  [{...base,GEMINI_GUEST_API_KEYS:undefined},"gemini_keys_invalid","unsupported_type"],
  [{GUEST_TRIAL_ENABLED:"1",TURNSTILE_SECRET_KEY:"sensitive-turnstile-secret",
   GUEST_TRIAL_RATE_LIMITER:base.GUEST_TRIAL_RATE_LIMITER},"gemini_key_missing"],
  [{...base,TURNSTILE_SECRET_KEY:undefined},"turnstile_secret_missing"],
  [{...base,GUEST_TRIAL_RATE_LIMITER:undefined},"rate_limiter_binding_missing"],
  [{...base,GUEST_DB:{}},"d1_hash_salt_missing"],
  [{...base,GUEST_DB:{},GUEST_HASH_SALT:"present",GUEST_DAILY_SESSION_LIMIT:"0"},"d1_daily_limit_invalid"]
 ];
 const warnings=[],originalWarn=console.warn;
 console.warn=(...args)=>warnings.push(args);
 try{
  for(const [settings,reason,detail] of cases){
   const r=await worker.fetch(new Request(url,{headers:{Origin:"https://www.3sssi.com"}}),settings);
   assert.equal(r.status,200);
   assert.deepEqual(await r.json(),{enabled:false});
   assert.deepEqual(warnings.at(-1),["crew_guest_trial_configuration",{state:"unavailable",reason,...(detail?{detail}:{})}]);
  }
  assert.equal(warnings.length,cases.length);
  const ok=await worker.fetch(new Request(url,{headers:{Origin:"https://www.3sssi.com"}}),base);
  assert.equal((await ok.json()).enabled,true);
  assert.equal(warnings.length,cases.length);
  assert.doesNotMatch(JSON.stringify(warnings),/sensitive-turnstile-secret|server-key-alpha-at-least-12/);
 }finally{console.warn=originalWarn}
});

test("multi-key binding accepts CSV, newline, quoted JSON, JSON arrays and strict objects",async()=>{
 const worker=await loadStandaloneWorker();
 const url="https://crew-guest-trial.shanliyoung.workers.dev/api/guest/token";
 const first="server-key-alpha-at-least-12",second="server-key-beta-at-least-12";
 const formats=[
  first, first+","+second, first+"\n"+second,
  JSON.stringify([first,second]),JSON.stringify({keys:[first,second]}),
  JSON.stringify(JSON.stringify([first,second])),[first,second],{keys:[first,second]}
 ];
 for(const setting of formats){
  const bindings={GUEST_TRIAL_ENABLED:"1",GEMINI_GUEST_API_KEYS:setting,
   TURNSTILE_SECRET_KEY:"server-turnstile-secret",
   GUEST_TRIAL_RATE_LIMITER:{limit:async()=>({success:true})}};
  const r=await worker.fetch(new Request(url,{headers:{Origin:"https://www.3sssi.com"}}),bindings);
  assert.equal(r.status,200);
  assert.equal((await r.json()).enabled,true);
 }
});
test("multi-key diagnostics classify malformed formats without exposing credentials",async()=>{
 const worker=await loadStandaloneWorker();
 const url="https://crew-guest-trial.shanliyoung.workers.dev/api/guest/token";
 const key="secret-server-key-at-least-12";
 const invalid=[
  [undefined,"unsupported_type"],[42,"unsupported_type"],
  [{keys:[key],other:"unexpected"},"unsupported_shape"],
  ["{not-json","malformed_json"],
  ["","empty"],["a,b,c","invalid_key_entry"],
  [key+",","invalid_key_entry"],
  [Array.from({length:21},(_,i)=>key+i),"invalid_count"]
 ];
 const original=console.warn,warnings=[];
 console.warn=(...args)=>warnings.push(args);
 try{
  for(const [setting,detail] of invalid){
   const r=await worker.fetch(new Request(url,{headers:{Origin:"https://www.3sssi.com"}}),{
    GUEST_TRIAL_ENABLED:"1",GEMINI_GUEST_API_KEYS:setting,
    GEMINI_GUEST_API_KEY:key,TURNSTILE_SECRET_KEY:"server-turnstile-secret",
    GUEST_TRIAL_RATE_LIMITER:{limit:async()=>({success:true})}
   });
   assert.deepEqual(await r.json(),{enabled:false});
   assert.deepEqual(warnings.at(-1),["crew_guest_trial_configuration",{
    state:"unavailable",reason:"gemini_keys_invalid",detail
   }]);
  }
  assert.doesNotMatch(JSON.stringify(warnings),/secret-server-key-at-least-12/);
 }finally{console.warn=original}
});

test("single and multi-key secrets accept identical credential characters",async()=>{
 const {onRequestGet,onRequestPost}=await backend;
 const first="AQ.example_credential-123456789012",second="AQ.other.credential:abcdef123456";
 const limiter={limit:async()=>({success:true})};
 const common={GUEST_TRIAL_ENABLED:"1",GUEST_TURNSTILE_SITE_KEY:"public-site-key",
  GUEST_TURNSTILE_SECRET:"server-turnstile-secret",GUEST_TRIAL_RATE_LIMITER:limiter};
 const single={...common,GEMINI_GUEST_API_KEY:first};
 const multi={...common,GEMINI_GUEST_API_KEYS:first+","+second};
 for(const settings of [single,multi]){
  const response=await onRequestGet({request:new Request("https://www.3sssi.com/api/guest/token"),env:settings});
  assert.equal((await response.json()).enabled,true);
 }
 const mock=mockedServices({allowedKeys:[first,second]});
 try{
  const grant=await onRequestPost({request:req(),env:multi});
  assert.equal(grant.status,200);
  assert.ok((await grant.json()).token);
  assert.equal(mock.counts().minted,1);
  assert.ok([first,second].includes(mock.counts().usedKeys[0]));
 }finally{mock.restore()}
});

test("multi-key parser retains structural validation without character allowlist",async()=>{
 const {onRequestGet}=await backend;
 const base=env(undefined,{GUEST_TRIAL_RATE_LIMITER:{limit:async()=>({success:true})}});
 const valid="AQ.period:plus+and=equals123456";
 const accepted=[valid,JSON.stringify([valid]),{keys:[valid]}];
 for(const value of accepted){
  const response=await onRequestGet({request:new Request("https://www.3sssi.com/api/guest/token"),
   env:{...base,GEMINI_GUEST_API_KEYS:value}});
  assert.equal((await response.json()).enabled,true);
 }
 const invalid=[",AQ.valid.part.123456","AQ.valid.part.123456,",
  "short",JSON.stringify([valid,"short"])];
 for(const value of invalid){
  const response=await onRequestGet({request:new Request("https://www.3sssi.com/api/guest/token"),
   env:{...base,GEMINI_GUEST_API_KEYS:value}});
  assert.deepEqual(await response.json(),{enabled:false});
 }
});

test("guest trial 10-second guidance and completion UX preserve hard stop",()=>{
 const hook=fs.readFileSync(path.join(root,"web-spa/src/live/useLiveSession.ts"),"utf8");
 const component=fs.readFileSync(path.join(root,"web-spa/src/live/GuestTrialExperience.tsx"),"utf8");
 const teacher=fs.readFileSync(path.join(root,"web-spa/src/teacher/LivePage.tsx"),"utf8");
 const friend=fs.readFileSync(path.join(root,"web-spa/src/friends/FriendLiveConversation.tsx"),"utf8");
 const css=fs.readFileSync(path.join(root,"web-spa/src/live/guestTrialExperience.css"),"utf8");
 assert.match(hook,/Math\.min\(300000/);
 assert.match(hook,/guestWrapUpSentRef\.current=true/);
 assert.match(hook,/left>0&&left<=10/);
 assert.match(hook,/setGuestExpired\(true\)/);
 assert.match(hook,/closeSession\(session,"guest-limit"\)/);
 assert.match(component,/secondsLeft<=10/);
 assert.match(component,/role="timer"/);
 assert.match(component,/role="status"/);
 assert.match(component,/to="\/account#settings-gemini"/);
 for(const destination of ["/games/1a2b","/teacher/vocabulary","/story"])assert.ok(component.includes('to="'+destination+'"'));
 assert.match(teacher,/<GuestTrialFinish expired=\{live\.guestExpired\} failed=\{live\.state==="error"\} name=\{profile\.name\}/);
 assert.match(friend,/<GuestTrialFinish expired=\{live\.guestExpired\}/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 const locales=JSON.parse(fs.readFileSync(path.join(root,"config/ui-locales.json"),"utf8")).locales.map(x=>x.code);
 for(const locale of locales){
  const entry=JSON.parse(fs.readFileSync(path.join(root,"web-spa/src/i18n/locales",locale,"common.json"),"utf8")).guestTrial;
  for(const key of ["timeLeft","almostDone","completeTitle","completeBody","continueKey","free1a2b","freeVocabulary","freeStory","interruptedBody","usedUpTitle","usedMember","usedMemberNoCount","limit","aiFriend"])
   assert.equal(typeof entry[key],"string",locale+":"+key);
 }
});

test("five-minute trial stays consistent across Worker grants and client hard deadline",()=>{
 const backend=fs.readFileSync(path.join(root,"functions/api/guest/token.js"),"utf8");
 const worker=fs.readFileSync(path.join(root,"workers/guest-trial/worker.mjs"),"utf8");
 const starter=fs.readFileSync(path.join(root,"web-spa/src/live/GuestLiveStarter.tsx"),"utf8");
 const hook=fs.readFileSync(path.join(root,"web-spa/src/live/useLiveSession.ts"),"utf8");
 const usage=fs.readFileSync(path.join(root,"web-spa/src/analytics/usage.ts"),"utf8");
 const config=fs.readFileSync(path.join(root,"web-spa/src/lib/guestTrial.ts"),"utf8");
 assert.match(backend,/const SESSION_SECONDS=300;/);
 assert.match(backend,/const MEMBER_TRIAL_LIMIT=3;/);
 assert.match(backend,/expireTime:new Date\(now\+310000\)/);
 assert.match(backend,/newSessionExpireTime:new Date\(now\+30000\)/);
 assert.match(worker,/five-minute Guest Trial Worker/);
 assert.match(starter,/data\.seconds!==300/);
 assert.match(hook,/Math\.min\(300000/);
 assert.match(hook,/Math\.min\(300,grant\.seconds\|\|300\)/);
 assert.match(hook,/left>0&&left<=10/);
 assert.match(usage,/from_120_to_180s/);
 assert.match(usage,/from_180_to_300s/);
 assert.match(config,/Number\(value\.seconds\)===300/);
});

test("member mode rejects replayed tickets and enforces three trials per Taipei day",async()=>{
 const {createGuestTicket}=await import("../server/crew-guest-ticket.mjs");
 const {onRequestGet,onRequestPost}=await backend;
 const secret="testing-only-account-guest-secret-at-least-32-bytes";
 const users=new Map(),days=new Map(),claims=new Set();
 const db={prepare(sql){return {bind(...v){return {async run(){
  if(sql.startsWith("INSERT OR IGNORE INTO crew_guest_ticket_claims")){
   if(claims.has(v[0]))return{meta:{changes:0}};
   claims.add(v[0]);return{meta:{changes:1}};
  }
  if(sql.startsWith("INSERT OR IGNORE INTO crew_guest_usage")){
   if(!users.has(v[0])){users.set(v[0],0);days.set(v[0],v[1])}
   return{meta:{changes:1}};
  }
  if(sql.startsWith("UPDATE crew_guest_usage SET used=CASE WHEN updated_at<")){
   const [dayStart,now,uid,,limit]=v;
   const fresh=days.get(uid)<dayStart,value=users.get(uid)||0;
   if(!fresh&&value>=limit)return{meta:{changes:0}};
   users.set(uid,fresh?1:value+1);days.set(uid,now);return{meta:{changes:1}};
  }
  if(sql.startsWith("UPDATE crew_guest_usage SET used=MAX")){
   if(days.get(v[0])>=v[1]&&days.get(v[0])<v[2])users.set(v[0],Math.max(0,(users.get(v[0])||0)-1));
   return{meta:{changes:1}};
  }
  throw Error("Unexpected member SQL "+sql);
 }}}}}};
 const settings=env(undefined,{GUEST_REQUIRE_SIGNIN:"1",CREW_AUTH_DB:db,CREW_GUEST_TICKET_SECRET:secret,
  GUEST_TRIAL_RATE_LIMITER:{limit:async()=>({success:true})}});
 const config=await onRequestGet({request:req().method==="POST"?new Request("https://www.3sssi.com/api/guest/token"):req(),env:settings});
 assert.equal((await config.json()).signinRequired,true);
 const request=ticket=>new Request("https://www.3sssi.com/api/guest/token",{
  method:"POST",headers:{"origin":"https://www.3sssi.com","content-type":"application/json",
   "cf-connecting-ip":"203.0.113.9","user-agent":"Crew-Test/1.0"},
  body:JSON.stringify({challengeToken:"turnstile-valid-test-token",...(ticket?{authTicket:ticket}:{})})
 });
 const mock=mockedServices(),originalNow=Date.now;
 let clock=Date.parse("2026-11-07T15:59:59.000Z"); // Taipei 23:59:59
 Date.now=()=>clock;
 try{
  assert.equal((await onRequestPost({request:request(),env:settings})).status,401);
  const uid="123e4567-e89b-42d3-a456-426614174000";
  const ticket=await createGuestTicket(uid,secret);
  assert.equal((await onRequestPost({request:request(ticket+"tampered"),env:settings})).status,401);
  const first=await onRequestPost({request:request(ticket),env:settings});
  assert.equal(first.status,200);
  assert.equal((await first.json()).seconds,300);
  assert.equal((await onRequestPost({request:request(ticket),env:settings})).status,429);
  for(let attempt=2;attempt<=3;attempt++){
   const next=await createGuestTicket(uid,secret);
   assert.equal((await onRequestPost({request:request(next),env:settings})).status,200,
    "account must allow trial "+attempt);
   assert.equal(users.get(uid),attempt);
  }
  const exhaustedTicket=await createGuestTicket(uid,secret);
  const exhausted=await onRequestPost({request:request(exhaustedTicket),env:settings});
  assert.equal(exhausted.status,429);
  assert.equal((await exhausted.json()).code,"ALREADY_USED");
  assert.equal(mock.counts().minted,3);
  assert.equal(users.get(uid),3);
  clock=Date.parse("2026-11-07T16:00:01.000Z"); // Taipei 00:00:01
  const tomorrow=await createGuestTicket(uid,secret);
  assert.equal((await onRequestPost({request:request(tomorrow),env:settings})).status,200);
  assert.equal(users.get(uid),1,"a new Taipei calendar day resets member quota");
  assert.equal(mock.counts().minted,4);
 }finally{Date.now=originalNow;mock.restore()}
});
test("member trial requires a secure database and shared signing secret",async()=>{
 const {onRequestGet}=await backend;
 const base={GUEST_TRIAL_ENABLED:"1",GEMINI_GUEST_API_KEY:"server-secret-never-in-client",
  GUEST_TURNSTILE_SITE_KEY:"public-site-key",GUEST_TURNSTILE_SECRET:"server-turnstile-secret",
  GUEST_TRIAL_RATE_LIMITER:{limit:async()=>({success:true})}};
 const r=await onRequestGet({request:new Request("https://www.3sssi.com/api/guest/token"),
  env:{...base,GUEST_REQUIRE_SIGNIN:"1"}});
 assert.deepEqual(await r.json(),{enabled:false});
 const bad=await onRequestGet({request:new Request("https://www.3sssi.com/api/guest/token"),
  env:{...base,GUEST_REQUIRE_SIGNIN:"true"}});
 assert.deepEqual(await bad.json(),{enabled:false});
});


function fakeMemberQuotaDb(){
 const used=new Map(),days=new Map(),nonces=new Set();
 return {used,days,nonces,prepare(sql){return {bind(...v){return {async run(){
  if(sql.startsWith("INSERT OR IGNORE INTO crew_guest_ticket_claims")){
   if(nonces.has(v[0]))return {meta:{changes:0}};
   nonces.add(v[0]);return {meta:{changes:1}};
  }
  if(sql.startsWith("INSERT OR IGNORE INTO crew_guest_usage")){
   if(!used.has(v[0])){used.set(v[0],0);days.set(v[0],v[1])}
   return {meta:{changes:1}};
  }
  if(sql.startsWith("UPDATE crew_guest_usage SET used=CASE WHEN updated_at<")){
   const [dayStart,now,uid,,limit]=v;
   const count=used.get(uid)||0,fresh=days.get(uid)<dayStart;
   if(!fresh&&count>=limit)return {meta:{changes:0}};
   used.set(uid,fresh?1:count+1);days.set(uid,now);return {meta:{changes:1}};
  }
  if(sql.startsWith("UPDATE crew_guest_usage SET used=MAX")){
   if(days.get(v[0])>=v[1]&&days.get(v[0])<v[2])used.set(v[0],Math.max(0,(used.get(v[0])||0)-1));
   return {meta:{changes:1}};
  }
  throw new Error("Unexpected member SQL: "+sql);
 }}}}}};
}
const memberRequest=authTicket=>new Request("https://www.3sssi.com/api/guest/token",{
 method:"POST",headers:{"Origin":"https://www.3sssi.com","content-type":"application/json",
  "cf-connecting-ip":"203.0.113.10","user-agent":"Crew-Test/Member"},
 body:JSON.stringify({challengeToken:"turnstile-valid-test-token",
  ...(authTicket===undefined?{}:{authTicket})})
});
test("optional member metering counts signed-in accounts without blocking anonymous trials",async()=>{
 const {createGuestTicket}=await import("../server/crew-guest-ticket.mjs");
 const {onRequestGet,onRequestPost}=await backend;
 const signing="test-member-secret-at-least-thirty-two-bytes";
 const db=fakeMemberQuotaDb();
 const settings=env(undefined,{
  CREW_AUTH_DB:db,CREW_GUEST_TICKET_SECRET:signing,
  GUEST_ACCOUNT_METER_ENABLED:"1",GUEST_REQUIRE_SIGNIN:"0",
  GUEST_TRIAL_RATE_LIMITER:{limit:async()=>({success:true})}
 });
 const config=await onRequestGet({request:new Request("https://www.3sssi.com/api/guest/token"),env:settings});
 const available=await config.json();
 assert.equal(available.enabled,true);
 assert.equal(available.seconds,300);
 assert.equal(available.memberMetering,true);
 assert.equal(available.signinRequired,undefined);
 const services=mockedServices();
 try{
  const anon=await onRequestPost({request:memberRequest(),env:settings});
  assert.equal(anon.status,200);
  assert.equal((await anon.json()).seconds,300);
  assert.equal(db.used.size,0,"unsigned visitors retain anonymous flow without member counters");
  const accountA="123e4567-e89b-42d3-a456-426614174001",accountB="123e4567-e89b-42d3-a456-426614174002";
  const forged=await onRequestPost({request:memberRequest("forged"),env:settings});
  assert.equal(forged.status,401,"supplied invalid assertion cannot fall back to anonymous");
  const wrongType=await onRequestPost({request:memberRequest(42),env:settings});
  assert.equal(wrongType.status,401,"malformed ticket cannot switch to anonymous");
  const ticketA=await createGuestTicket(accountA,signing);
  const first=await onRequestPost({request:memberRequest(ticketA),env:settings});
  assert.equal(first.status,200);
  const firstData=await first.json();
  assert.equal(firstData.seconds,300);
  assert.equal(Date.parse(firstData.expiresAt)-Date.parse(firstData.issuedAt),310000);
  assert.equal(db.used.get(accountA),1);
  assert.equal((await onRequestPost({request:memberRequest(ticketA),env:settings})).status,429);
  const newA=await createGuestTicket(accountA,signing);
  assert.equal((await onRequestPost({request:memberRequest(newA),env:settings})).status,200);
  assert.equal(db.used.get(accountA),2);
  const ticketB=await createGuestTicket(accountB,signing);
  assert.equal((await onRequestPost({request:memberRequest(ticketB),env:settings})).status,200);
  assert.equal(db.used.get(accountB),1);
  assert.equal((await onRequestPost({request:memberRequest(),env:settings})).status,200);
  assert.equal(services.counts().minted,5,"two anonymous, two for account A, one for account B");
 }finally{services.restore()}
});

test("failed Gemini provisioning refunds member trial without reusing a nonce",async()=>{
 const {createGuestTicket}=await import("../server/crew-guest-ticket.mjs");
 const {onRequestPost}=await backend;
 const signing="test-member-secret-at-least-thirty-two-bytes",db=fakeMemberQuotaDb();
 const account="123e4567-e89b-42d3-a456-426614174003";
 const settings=env(undefined,{CREW_AUTH_DB:db,CREW_GUEST_TICKET_SECRET:signing,
  GUEST_ACCOUNT_METER_ENABLED:"1",GUEST_TRIAL_RATE_LIMITER:{limit:async()=>({success:true})}});
 const ticket1=await createGuestTicket(account,signing),failed=mockedServices({failMint:true});
 try{
  const bad=await onRequestPost({request:memberRequest(ticket1),env:settings});
  assert.equal(bad.status,503);
  assert.equal(db.used.get(account),0);
  assert.equal(db.nonces.size,1);
 }finally{failed.restore()}
 const success=mockedServices();
 try{
  assert.equal((await onRequestPost({request:memberRequest(ticket1),env:settings})).status,429,
   "same assertion remains claimed on a failed mint");
  const ticket2=await createGuestTicket(account,signing);
  assert.equal((await onRequestPost({request:memberRequest(ticket2),env:settings})).status,200);
  assert.equal(db.used.get(account),1);
 }finally{success.restore()}
});
test("member metering fails closed when shared D1, signing secret, or config flag is invalid",async()=>{
 const {onRequestGet}=await backend,valid=env(undefined,{
  GUEST_TRIAL_RATE_LIMITER:{limit:async()=>({success:true})},
  GUEST_ACCOUNT_METER_ENABLED:"1"
 });
 for(const settings of [valid,{...valid,CREW_AUTH_DB:fakeMemberQuotaDb()},
  {...valid,GUEST_ACCOUNT_METER_ENABLED:"yes"}, {...valid,GUEST_REQUIRE_SIGNIN:"yes"}]){
  const response=await onRequestGet({request:new Request("https://www.3sssi.com/api/guest/token"),env:settings});
  assert.deepEqual(await response.json(),{enabled:false});
 }
});


test("optional member metering checks exhausted quota before Turnstile or ticket issuance",()=>{
 const starter=fs.readFileSync(path.join(root,"web-spa/src/live/GuestLiveStarter.tsx"),"utf8");
 const account=fs.readFileSync(path.join(root,"web-spa/src/pages/AccountPage.tsx"),"utf8");
 assert.match(starter,/Number\.isFinite\(used\)/);
 assert.match(starter,/used>=limit/);
 assert.match(starter,/setPhase\("exhausted"\);return/);
 assert.match(starter,/phase==="exhausted"/);
 assert.match(starter,/phase==="login"/);
 assert.match(account,/state\.trial\.used<state\.trial\.limit/);
 assert.match(account,/\/teacher\/roles\?mode=teacher/);
});


test("five-minute free-trial offer is localized without changing lesson practice duration",()=>{
 const locales=JSON.parse(fs.readFileSync(path.join(root,"config/ui-locales.json"),"utf8")).locales.map(x=>x.code);
 const markers={"zh-TW":/5 分鐘/,"en":/(?:five[- ]minute|5 minutes?)/i,"ja":/5分/,"es":/(?:cinco|5) minutos/i,"pt-BR":/(?:cinco|5) minutos/i,"id":/(?:lima|5) menit/i,"fr":/(?:cinq|5) minutes/i,"de":/(?:fünf|5) Minuten/i,"ko":/5분/,"vi":/(?:năm|5) phút/i,"th":/(?:ห้า|5)\s*นาที/};
 for(const locale of locales){
  const common=JSON.parse(fs.readFileSync(path.join(root,"web-spa/src/i18n/locales",locale,"common.json"),"utf8"));
  const home=JSON.parse(fs.readFileSync(path.join(root,"web-spa/src/i18n/locales",locale,"home.json"),"utf8"));
  for(const key of ["signInToTry","completeTitle","description","homeTitle","onboardingCTA","settingsCta"])
   assert.match(common.guestTrial[key],markers[locale],locale+":"+key);
  assert.match(home.world.chatSubtitle,markers[locale],locale+":chatSubtitle");
 }
 const generator=fs.readFileSync(path.join(root,"scripts/generate-seo.mjs"),"utf8");
 const zhHome=fs.readFileSync(path.join(root,"index.html"),"utf8");
 const enHome=fs.readFileSync(path.join(root,"en/index.html"),"utf8");
 assert.match(generator,/AI 朋友聊天、英文口說練習與互動遊戲/);
 assert.match(zhHome,/<title>AI 朋友聊天、英文口說練習與互動遊戲/);
 assert.match(generator,/Chat with AI Friends, Practice Speaking/);
 assert.match(enHome,/<title>Chat with AI Friends, Practice Speaking/);
 for(const [locale,html] of [["zh-TW",zhHome],["en",enHome]]){
  const head=html.split(/<\/head>/i,1)[0];
  assert.doesNotMatch(head,/\bGemini\b|\bKey\b/i,locale+": homepage head must not mention Gemini or Key");
 }
 const lesson=JSON.parse(fs.readFileSync(path.join(root,"web-spa/src/i18n/locales/zh-TW/teacher.json"),"utf8"));
 assert.match(lesson.learn.threeMinute,/3 分鐘/);
});

