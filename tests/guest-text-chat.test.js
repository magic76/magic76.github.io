const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {webcrypto}=require("node:crypto");
globalThis.crypto ||= webcrypto;
const modulePromise=import("../workers/guest-trial/text-chat.mjs");
const origin="https://www.3sssi.com";
function mockDb(){
 const sessions=new Map(),usage=new Map(),daily=new Map();
 const key=(a,b)=>a+"|"+b;
 const db={sessions,usage,daily,prepare(sql){
  return {async run(){if(sql.startsWith("CREATE TABLE IF NOT EXISTS"))return {meta:{changes:0}};throw Error("Unexpected direct RUN: "+sql)},bind(...args){return{
   async first(){
    if(sql.startsWith("SELECT used FROM crew_guest_text_usage"))return usage.get(key(args[0],args[1]))||null;
    if(sql.startsWith("SELECT visitor_hash,expires_at FROM crew_guest_text_sessions"))return sessions.get(args[0])||null;
    throw Error("Unexpected SELECT: "+sql);
   },
   async run(){
    if(sql.startsWith("CREATE TABLE IF NOT EXISTS"))return {meta:{changes:0}};
    if(sql.startsWith("DELETE FROM crew_guest_text_sessions")){
     for(const [id,s] of sessions)if(s.expires_at<args[0])sessions.delete(id);
     return {meta:{changes:1}};
    }
    if(sql.startsWith("INSERT INTO crew_guest_text_sessions")){
     sessions.set(args[0],{visitor_hash:args[1],expires_at:args[2]});return {meta:{changes:1}};
    }
    if(sql.startsWith("INSERT OR IGNORE INTO crew_guest_text_usage")){
     if(!usage.has(key(args[0],args[1])))usage.set(key(args[0],args[1]),{used:0,last_at:0});
     return {meta:{changes:1}};
    }
    if(sql.startsWith("UPDATE crew_guest_text_usage SET used=used+1")){
     const item=usage.get(key(args[1],args[2]));
     if(item.used>=args[3]||item.last_at>args[4])return {meta:{changes:0}};
     item.used++;item.last_at=args[0];return {meta:{changes:1}};
    }
    if(sql.startsWith("UPDATE crew_guest_text_usage SET used=MAX")){
     const item=usage.get(key(args[0],args[1]));if(item)item.used=Math.max(0,item.used-1);
     return {meta:{changes:1}};
    }
    if(sql.startsWith("INSERT OR IGNORE INTO crew_guest_text_daily")){
     if(!daily.has(args[0]))daily.set(args[0],0);
     return {meta:{changes:1}};
    }
    if(sql.startsWith("UPDATE crew_guest_text_daily SET used=used+1")){
     const count=daily.get(args[0]);
     if(count>=args[1])return {meta:{changes:0}};
     daily.set(args[0],count+1);return {meta:{changes:1}};
    }
    if(sql.startsWith("UPDATE crew_guest_text_daily SET used=MAX")){
     daily.set(args[0],Math.max(0,(daily.get(args[0])||0)-1));return {meta:{changes:1}};
    }
    throw Error("Unexpected RUN: "+sql);
   }
  }}};
 }};
 return db;
}
function env(db){return {
 GUEST_TRIAL_ENABLED:"1",CREW_AUTH_DB:db,
 GEMINI_GUEST_API_KEYS:"key-for-worker-only-not-for-browser",
 GUEST_TURNSTILE_SITE_KEY:"site-public-key",GUEST_TURNSTILE_SECRET:"turnstile-private-pepper"
}}
function request(method="GET",value=null,ip="198.51.100.7",site=origin){
 return new Request(origin+"/api/guest/text",{method,headers:{
  origin:site,"user-agent":"Crew-Web-Test","cf-connecting-ip":ip,
  ...(method==="POST"?{"content-type":"application/json"}:{})
 },...(method==="POST"?{body:JSON.stringify(value)}:{})});
}
const deps={verifyCaptcha:async()=>true,selectGuestGeminiKey:()=>"secret-for-google-only"};
const input={action:"send",system:"You are Ada. Teach English.",messages:[{role:"user",text:"Hello!"}]};
const validToken="1234567890verified";
async function start(handler,environment,opts={}){
 const r=await handler(request("POST",{action:"start",challengeToken:validToken},opts.ip),environment,deps);
 return {status:r.status,...await r.json()};
}
test("text guest discovery is separate from voice and fails closed when D1 is missing",async()=>{
 const {onTextRequest}=await modulePromise;
 const r=await onTextRequest(request(),env(mockDb()),deps);
 assert.equal(r.status,200);
 assert.deepEqual(await r.json(),{enabled:true,siteKey:"site-public-key",dailyLimit:12});
 const noDb=await onTextRequest(request(),env(undefined),deps);
 assert.deepEqual(await noDb.json(),{enabled:false});
 const badOrigin=await onTextRequest(request("GET",null,undefined,"https://attacker.test"),env(mockDb()),deps);
 assert.equal(badOrigin.status,403);
});
test("new text session requires Turnstile and stores only hash, never Gemini key or transcript",async()=>{
 const {onTextRequest}=await modulePromise,db=mockDb(),environment=env(db);
 const denied=await onTextRequest(request("POST",{action:"start",challengeToken:"short"}),environment,deps);
 assert.equal(denied.status,400);
 const fail=await onTextRequest(request("POST",{action:"start",challengeToken:validToken}),environment,
  {...deps,verifyCaptcha:async()=>false});
 assert.equal(fail.status,403);
 const session=await start(onTextRequest,environment);
 assert.equal(session.status,200);assert.match(session.sessionToken,/^[0-9a-f]{64}$/);
 assert.equal(session.remaining,12);
 assert.equal(db.sessions.has(session.sessionToken),false);
 assert.doesNotMatch(JSON.stringify([...db.sessions]),/secret-for-google-only|Hello!/);
});
test("guest text uses Gemini text output with configured persona, budget and same IP/UA",async()=>{
 const {onTextRequest}=await modulePromise,db=mockDb(),environment=env(db),session=await start(onTextRequest,environment);
 const oldFetch=globalThis.fetch;let called=0,body,apiKey;
 globalThis.fetch=async (_url,options)=>{
  called++;apiKey=options.headers["x-goog-api-key"];body=JSON.parse(options.body);
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:"Hi! What's your name?"}]}}]}),{status:200});
 };
 try{
  const r=await onTextRequest(request("POST",{...input,sessionToken:session.sessionToken}),environment,deps);
  assert.equal(r.status,200);assert.deepEqual(await r.json(),{reply:"Hi! What's your name?",remaining:11});
  assert.equal(called,1);assert.equal(apiKey,"secret-for-google-only");
  assert.match(body.systemInstruction.parts[0].text,/You are Ada/);
  assert.equal(body.contents[0].role,"user");
  assert.equal(body.generationConfig.maxOutputTokens,520);
  const otherIp=await onTextRequest(request("POST",{...input,sessionToken:session.sessionToken},"198.51.100.99"),environment,deps);
  assert.equal(otherIp.status,401);
  assert.equal(called,1);
 }finally{globalThis.fetch=oldFetch}
});
test("text guest enforces cooldown, 12 messages per Taipei day, and refunds model failures",async()=>{
 const {onTextRequest}=await modulePromise,db=mockDb(),environment=env(db),session=await start(onTextRequest,environment);
 const oldFetch=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{
  calls++;
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:"Hello back!"}]}}]}),{status:200});
 };
 try{
  const send=()=>onTextRequest(request("POST",{...input,sessionToken:session.sessionToken}),environment,deps);
  let first=await send();assert.equal(first.status,200);
  const tooFast=await send();assert.equal(tooFast.status,429);
  assert.equal((await tooFast.json()).code,"TOO_FAST");
  for(let i=1;i<12;i++){
   for(const entry of db.usage.values())entry.last_at=0;
   const item=await send();assert.equal(item.status,200);
  }
  for(const entry of db.usage.values())entry.last_at=0;
  const limit=await send();assert.equal(limit.status,429);
  assert.deepEqual(await limit.json(),{code:"DAILY_LIMIT",remaining:0});
  assert.equal(calls,12);
 }finally{globalThis.fetch=oldFetch}
 const db2=mockDb(),env2=env(db2),sess2=await start(onTextRequest,env2);
 globalThis.fetch=async()=>new Response("downstream error",{status:503});
 try{
  const failed=await onTextRequest(request("POST",{...input,sessionToken:sess2.sessionToken}),env2,deps);
  assert.equal(failed.status,503);
  assert.equal([...db2.usage.values()][0].used,0);
  assert.equal([...db2.daily.values()][0],0);
 }finally{globalThis.fetch=oldFetch}
});
test("Teacher and Friend retain the same text component and no mic is needed in WebView",()=>{
 const root=path.join(__dirname,"..");
 const panel=fs.readFileSync(path.join(root,"web-spa/src/live/TextChatPanel.tsx"),"utf8");
 const worker=fs.readFileSync(path.join(root,"workers/guest-trial/worker.mjs"),"utf8");
 for(const page of ["web-spa/src/teacher/LivePage.tsx","web-spa/src/friends/FriendLivePage.tsx"]){
  assert.match(fs.readFileSync(path.join(root,page),"utf8"),/<TextChatPanel/);
 }
 assert.match(panel,/GUEST_TEXT_ENDPOINT/);
 assert.doesNotMatch(panel,/getUserMedia\(/);
 assert.doesNotMatch(panel,/guestTrialDiscoveryEnabled\(/); // Android WebView must not be disabled.
 assert.match(worker,/TEXT_PATH="\/api\/guest\/text"/);
 assert.match(worker,/onTextRequest\(internal,bindings/);
});


test("saved but unverified Gemini keys default to free text, with a manual BYOK override",()=>{
 const panel=fs.readFileSync(path.join(__dirname,"../web-spa/src/live/TextChatPanel.tsx"),"utf8");
 assert.match(panel,/useState\(\(\)=>!geminiKey\(\)\|\|!geminiVerified\(\)\)/);
 assert.match(panel,/const guestMode=useGuest\|\|!hasKey/);
 assert.match(panel,/const key=guestMode\?"":geminiKey\(\)/);
 assert.match(panel,/setUseGuest\(current=>!current\)/);
 assert.match(panel,/guestMode&&<div className="crew-text-guest"/);
 assert.match(panel,/guestMode&&guestPhase!=="active"/);
 assert.doesNotMatch(panel,/請檢查 Gemini Key 或網路後再試/);
});
test("BYOK text now uses a persistent Gemini Live keyboard session",()=>{
 const panel=fs.readFileSync(path.join(__dirname,"../web-spa/src/live/TextChatPanel.tsx"),"utf8");
 const adapter=fs.readFileSync(path.join(__dirname,"../web-spa/src/live/liveTextChat.ts"),"utf8");
 const transport=fs.readFileSync(path.join(__dirname,"../crew-live.js"),"utf8");
 assert.match(panel,/new LiveTextConversation\(system,searchEnabled/);
 assert.match(panel,/liveChat\\.current\\.send\\(value\\)/);
 assert.match(adapter,/textOnly:true,models:\\["gemini-3\\.8-live"\\]/);
 assert.match(adapter,/outputAudioTranscription|onOutputTranscript/);
 assert.match(adapter,/onTurnComplete:turn=>/);
 assert.match(adapter,/googleSearch/);
 assert.match(transport,/this\\.textOnly=this\\.options\\.textOnly===true/);
 assert.match(transport,/if\\(this\\.textOnly\\)return/);
 assert.match(panel,/category==="quota"/);
 assert.match(panel,/category==="model"/);
});
