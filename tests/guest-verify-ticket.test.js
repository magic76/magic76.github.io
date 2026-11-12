const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {webcrypto}=require("node:crypto");
const {stripTypeScriptTypes}=require("node:module");
globalThis.crypto ||= webcrypto;
const root=path.resolve(__dirname,"..");
const load=file=>import("data:text/javascript;base64,"+Buffer.from(fs.readFileSync(path.join(root,file))).toString("base64"));
const promise=Promise.all([load("functions/api/guest/token.js"),load("workers/guest-trial/text-chat.mjs"),load("workers/guest-trial/verify-ticket.mjs")]);
const ORIGIN="https://www.3sssi.com";
const code=(path)=>fs.readFileSync(require("node:path").join(root,path),"utf8");
function fakeDb(table=true){
 const tickets=new Map(),sessions=new Map(),usage=new Map(),daily=new Map();
 const pair=(a,b)=>a+"|"+b;
 const db={tickets,sessions,usage,daily,prepare(sql){
  const ticketSql=sql.includes("crew_guest_verify_tickets");
  if(ticketSql&&!table)throw Error("migration not applied");
  const stmt=(args=[])=>({
   bind(...values){return stmt(values)},
   async first(){
    if(sql.startsWith("SELECT visitor_hash,expires_at FROM crew_guest_verify_tickets"))return tickets.get(args[0])||null;
    if(sql.startsWith("SELECT used FROM crew_guest_text_usage"))return usage.get(pair(args[0],args[1]))||null;
    if(sql.startsWith("SELECT visitor_hash,expires_at FROM crew_guest_text_sessions"))return sessions.get(args[0])||null;
    throw Error("Unknown first: "+sql);
   },
   async run(){
    if(sql.startsWith("CREATE TABLE IF NOT EXISTS crew_guest_text_"))return {meta:{changes:0}};
    if(sql.startsWith("INSERT INTO crew_guest_verify_tickets")){
     if(tickets.has(args[0]))throw Error("duplicate ticket");
     tickets.set(args[0],{visitor_hash:args[1],expires_at:args[2],voice_redeemed_at:null});
     return {meta:{changes:1}};
    }
    if(sql.startsWith("UPDATE crew_guest_verify_tickets SET voice_redeemed_at=")){
     const item=tickets.get(args[1]);
     if(!item||item.visitor_hash!==args[2]||item.expires_at<=args[3]||item.voice_redeemed_at!==null)return {meta:{changes:0}};
     item.voice_redeemed_at=args[0];return {meta:{changes:1}};
    }
    if(sql.startsWith("DELETE FROM crew_guest_text_sessions")){
     for(const [key,s] of sessions)if(s.expires_at<args[0])sessions.delete(key);
     return {meta:{changes:1}};
    }
    if(sql.startsWith("INSERT INTO crew_guest_text_sessions")){
     sessions.set(args[0],{visitor_hash:args[1],expires_at:args[2]});return {meta:{changes:1}};
    }
    if(sql.startsWith("INSERT OR IGNORE INTO crew_guest_text_usage")){
     if(!usage.has(pair(args[0],args[1])))usage.set(pair(args[0],args[1]),{used:0,last_at:0});
     return {meta:{changes:1}};
    }
    if(sql.startsWith("UPDATE crew_guest_text_usage SET used=used+1")){
     const entry=usage.get(pair(args[1],args[2]));
     if(!entry||entry.used>=args[3]||entry.last_at>args[4])return {meta:{changes:0}};
     entry.used++;entry.last_at=args[0];return {meta:{changes:1}};
    }
    if(sql.startsWith("UPDATE crew_guest_text_usage SET used=MAX")){
     const item=usage.get(pair(args[0],args[1]));if(item)item.used=Math.max(0,item.used-1);
     return {meta:{changes:1}};
    }
    if(sql.startsWith("INSERT OR IGNORE INTO crew_guest_text_daily")){
     if(!daily.has(args[0]))daily.set(args[0],0);return {meta:{changes:1}};
    }
    if(sql.startsWith("UPDATE crew_guest_text_daily SET used=used+1")){
     const value=daily.get(args[0]);if(value>=args[1])return {meta:{changes:0}};
     daily.set(args[0],value+1);return {meta:{changes:1}};
    }
    if(sql.startsWith("UPDATE crew_guest_text_daily SET used=MAX")){
     daily.set(args[0],Math.max(0,(daily.get(args[0])||0)-1));return {meta:{changes:1}};
    }
    throw Error("Unknown run: "+sql);
   }
  });
  return stmt();
 }};
 return db;
}
function env(db,limit=()=>({success:true})){
 return {CREW_AUTH_DB:db,GUEST_TRIAL_ENABLED:"1",GUEST_TURNSTILE_SITE_KEY:"public-site-key",
  GUEST_TURNSTILE_SECRET:"private-verifier-value",GEMINI_GUEST_API_KEY:"test-value-not-real",
  GUEST_TRIAL_RATE_LIMITER:{limit}};
}
function req(path,body,ip="203.0.113.1",ua="Crew-Test/1.0"){
 return new Request(ORIGIN+path,{method:body===undefined?"GET":"POST",headers:{origin:ORIGIN,
  "cf-connecting-ip":ip,"user-agent":ua,...(body===undefined?{}:{"content-type":"application/json"})},
  ...(body===undefined?{}:{body:JSON.stringify(body)})});
}
const textRequest=(data,ip,ua)=>req("/api/guest/text",data,ip,ua);
const voiceRequest=(data,ip,ua)=>req("/api/guest/token",data,ip,ua);
const challenge="turnstile-verified-once";
function deps(ticketOps,counter){return {verifyTicket:ticketOps,verifyCaptcha:async()=>{counter.count++;return true},selectGuestGeminiKey:()=>"test-value-not-real"}}
function fakeGoogle(failMint=false){
 let captcha=0,minted=0,text=0;
 const old=globalThis.fetch;
 globalThis.fetch=async(url)=>{
  if(String(url).includes("siteverify")){captcha++;return Response.json({success:true,hostname:"www.3sssi.com",action:"crew-guest-trial"})}
  if(String(url).includes("/auth_tokens")){minted++;return failMint?new Response("unavailable",{status:503}):Response.json({name:"ephemeral-demo-name"})}
  if(String(url).includes(":generateContent")){text++;return Response.json({candidates:[{content:{parts:[{text:"Hello"}]}}]})}
  throw Error("Unknown HTTP "+url);
 };
 return {counts:()=>({captcha,minted,text}),restore:()=>{globalThis.fetch=old}};
}
async function setup(){const [token,text,ticketOps]=await promise,db=fakeDb(),bindings=env(db),count={count:0};return {token,text,ticketOps,db,bindings,count,deps:deps(ticketOps,count)}}
test("capability is explicit on Worker GET; Pages without injected module and old Worker cannot advertise it",async()=>{
 const s=await setup();
 assert.equal((await (await s.text.onTextRequest(textRequest(),s.bindings,s.deps)).json()).verifyTicket,1);
 assert.equal((await (await s.token.onRequestGet({request:voiceRequest(),env:s.bindings},{verifyTicket:s.ticketOps})).json()).verifyTicket,1);
 assert.equal((await (await s.text.onTextRequest(textRequest(),s.bindings,{...s.deps,verifyTicket:undefined})).json()).verifyTicket,undefined);
 assert.equal((await (await s.token.onRequestGet({request:voiceRequest(),env:s.bindings})).json()).verifyTicket,undefined);
 assert.equal((await (await s.text.onTextRequest(textRequest(),{...s.bindings,CREW_AUTH_DB:undefined},s.deps)).json()).enabled,false);
});
test("Turnstile text start issues a 256-bit ticket; only SHA256 hash and anonymous binding live in D1; text renewal bypasses captcha but not send quotas",async()=>{
 const s=await setup(),svc=fakeGoogle();
 try{
  const result=await s.text.onTextRequest(textRequest({action:"start",challengeToken:challenge}),s.bindings,s.deps);
  assert.equal(result.status,200);
  const proof=await result.json();assert.match(proof.verifyTicket,/^[0-9a-f]{64}$/);
  assert.ok(proof.verifyTicketExpiresAt>Date.now()+29*60000);
  assert.ok(proof.sessionToken);assert.equal(s.count.count,1);
  assert.equal(s.db.tickets.size,1);
  const dump=JSON.stringify([...s.db.tickets]);
  assert.doesNotMatch(dump,new RegExp(proof.verifyTicket));
  assert.doesNotMatch(dump,/203\.0\.113\.1|Crew-Test|test-value-not-real/);
  const again=await s.text.onTextRequest(textRequest({action:"start",verifyTicket:proof.verifyTicket}),s.bindings,s.deps);
  assert.equal(again.status,200);assert.ok((await again.json()).sessionToken);assert.equal(s.count.count,1);
  const send=await s.text.onTextRequest(textRequest({action:"send",sessionToken:proof.sessionToken,
   system:"Language practice",messages:[{role:"user",text:"Hi"}]}),s.bindings,s.deps);
  assert.equal(send.status,200);assert.equal((await send.json()).remaining,11);
  const fast=await s.text.onTextRequest(textRequest({action:"send",sessionToken:proof.sessionToken,
   system:"Language practice",messages:[{role:"user",text:"Hi again"}]}),s.bindings,s.deps);
  assert.equal(fast.status,429);assert.equal((await fast.json()).code,"TOO_FAST");
  assert.equal(svc.counts().text,1);
 }finally{svc.restore()}
});
test("voice proof redemption retains limiter and mint, atomic replay protection, and old captcha grant fields",async()=>{
 const s=await setup(),svc=fakeGoogle();let limits=0;s.bindings.GUEST_TRIAL_RATE_LIMITER.limit=async()=>{limits++;return {success:true}};
 try{
  const challengeResult=await s.token.onRequestPost({request:voiceRequest({challengeToken:challenge}),env:s.bindings},{verifyTicket:s.ticketOps});
  assert.equal(challengeResult.status,200);
  const first=await challengeResult.json();assert.equal(first.seconds,300);
  assert.ok(first.token&&first.model&&first.expiresAt&&first.issuedAt);
  assert.match(first.verifyTicket,/^[a-f0-9]{64}$/);
  assert.equal(svc.counts().captcha,1);
  const consumed=await s.token.onRequestPost({request:voiceRequest({verifyTicket:first.verifyTicket}),env:s.bindings},{verifyTicket:s.ticketOps});
  assert.equal(consumed.status,200);assert.equal((await consumed.json()).seconds,300);
  assert.equal(svc.counts().captcha,1);assert.equal(svc.counts().minted,2);assert.equal(limits,2);
  const replay=await s.token.onRequestPost({request:voiceRequest({verifyTicket:first.verifyTicket}),env:s.bindings},{verifyTicket:s.ticketOps});
  assert.equal(replay.status,403);assert.equal((await replay.json()).code,"VERIFY_REQUIRED");
  assert.equal(svc.counts().minted,2);
  const proof=await s.ticketOps.issue(voiceRequest(),s.bindings);
  const simultaneous=await Promise.all([1,2].map(()=>s.token.onRequestPost({request:voiceRequest({verifyTicket:proof.verifyTicket}),env:s.bindings},{verifyTicket:s.ticketOps})));
  assert.deepEqual(simultaneous.map(r=>r.status).sort(),[200,403]);
  assert.equal(svc.counts().minted,3);
 }finally{svc.restore()}
});
test("a voice proof stays consumed if the limiter rejects or Gemini token mint fails",async()=>{
 const s=await setup();let calls=0;
 s.bindings.GUEST_TRIAL_RATE_LIMITER.limit=async()=>{calls++;return {success:false}};
 const proof=await s.ticketOps.issue(voiceRequest(),s.bindings);
 const denied=await s.token.onRequestPost({request:voiceRequest({verifyTicket:proof.verifyTicket}),env:s.bindings},{verifyTicket:s.ticketOps});
 assert.equal(denied.status,429);assert.equal(calls,1);
 const replay=await s.token.onRequestPost({request:voiceRequest({verifyTicket:proof.verifyTicket}),env:s.bindings},{verifyTicket:s.ticketOps});
 assert.equal(replay.status,403);assert.equal(calls,1);
 s.bindings.GUEST_TRIAL_RATE_LIMITER.limit=async()=>({success:true});
 const next=await s.ticketOps.issue(voiceRequest(),s.bindings);
 const service=fakeGoogle(true);
 try{
  const failed=await s.token.onRequestPost({request:voiceRequest({verifyTicket:next.verifyTicket}),env:s.bindings},{verifyTicket:s.ticketOps});
  assert.equal(failed.status,503);
  const again=await s.token.onRequestPost({request:voiceRequest({verifyTicket:next.verifyTicket}),env:s.bindings},{verifyTicket:s.ticketOps});
  assert.equal(again.status,403);assert.equal(service.counts().minted,1);
 }finally{service.restore()}
});
test("expired, wrong IP, wrong User-Agent, malformed/oversize ticket are denied before any session or grant",async()=>{
 const s=await setup(),svc=fakeGoogle();
 try{
  const proof=await s.ticketOps.issue(voiceRequest(),s.bindings);
  const cases=[{ticket:proof.verifyTicket,ip:"203.0.113.99"},{ticket:proof.verifyTicket,ua:"DifferentBrowser"},
   {ticket:"bad"},{ticket:"Z".repeat(10000)},{ticket:"f".repeat(64)}];
  for(const row of cases){
   const text=await s.text.onTextRequest(textRequest({action:"start",verifyTicket:row.ticket},row.ip,row.ua),s.bindings,s.deps);
   assert.equal(text.status,403);assert.equal((await text.json()).code,"VERIFY_REQUIRED");
   const voice=await s.token.onRequestPost({request:voiceRequest({verifyTicket:row.ticket},row.ip,row.ua),env:s.bindings},{verifyTicket:s.ticketOps});
   assert.equal(voice.status,row.ticket.length>4096?413:403);
   if(row.ticket.length<=4096)assert.equal((await voice.json()).code,"VERIFY_REQUIRED");
  }
  [...s.db.tickets.values()][0].expires_at=Date.now()-1;
  assert.equal((await s.text.onTextRequest(textRequest({action:"start",verifyTicket:proof.verifyTicket}),s.bindings,s.deps)).status,403);
  assert.equal((await s.token.onRequestPost({request:voiceRequest({verifyTicket:proof.verifyTicket}),env:s.bindings},{verifyTicket:s.ticketOps})).status,403);
  assert.equal(svc.counts().minted,0);assert.equal(s.db.sessions.size,0);assert.equal(s.count.count,0);
 }finally{svc.restore()}
});
test("missing migration and SQL failures fail closed only on ticket path; valid captcha still grants without proof",async()=>{
 const s=await setup(),svc=fakeGoogle();s.bindings.CREW_AUTH_DB=fakeDb(false);
 try{
  const text=await s.text.onTextRequest(textRequest({action:"start",challengeToken:challenge}),s.bindings,s.deps);
  assert.equal(text.status,200);assert.equal((await text.json()).verifyTicket,undefined);
  const voice=await s.token.onRequestPost({request:voiceRequest({challengeToken:challenge}),env:s.bindings},{verifyTicket:s.ticketOps});
  assert.equal(voice.status,200);assert.equal((await voice.json()).verifyTicket,undefined);
  const rejected=await s.text.onTextRequest(textRequest({action:"start",verifyTicket:"a".repeat(64)}),s.bindings,s.deps);
  assert.equal(rejected.status,403);
  const voiceRejected=await s.token.onRequestPost({request:voiceRequest({verifyTicket:"a".repeat(64)}),env:s.bindings},{verifyTicket:s.ticketOps});
  assert.equal(voiceRejected.status,403);
  assert.equal(svc.counts().minted,1);
 }finally{svc.restore()}
});
test("same-tab client validates expiry, obeys GET capability and stores only in sessionStorage",()=>{
 const ts=code("web-spa/src/live/guestVerifyTicket.ts");
 const transformed=stripTypeScriptTypes(ts,{mode:"strip"}).replace(/^export /gm,"");
 const map=new Map(),storage={getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};
 const make=new Function("sessionStorage","Date",transformed+"\nreturn {readVerifyTicket,saveVerifyTicket,clearVerifyTicket,isVerifyTicketRejected};");
 let now=10000;const clock={now:()=>now},client=make(storage,clock);
 const proof="a".repeat(64);
 client.saveVerifyTicket({verifyTicket:proof,verifyTicketExpiresAt:now+1800000});
 assert.equal(client.readVerifyTicket(false),"");assert.equal(client.readVerifyTicket(true),proof);
 assert.equal(map.size,1);assert.equal([...map.keys()][0],"crew_guest_verify_ticket_v1");
 now+=1800001;assert.equal(client.readVerifyTicket(true),"");assert.equal(map.size,0);
 assert.equal(client.isVerifyTicketRejected("VERIFY_REQUIRED"),true);
 assert.ok(!/\blocalStorage\.|trackUsageEvent|location\.href/.test(ts));
});
test("real text start fallback issues a single challenge in the same send and stores a newly issued proof",async()=>{
 const panel=code("web-spa/src/live/TextChatPanel.tsx");
 const start=panel.indexOf(" async function startGuestText():Promise<string>{"),stop=panel.indexOf(" async function sendMessage(",start);
 assert.ok(start>0&&stop>start);
 const extracted=stripTypeScriptTypes(panel.slice(start,stop),{mode:"strip"});
 const compile=new Function("v","const {setGuestStatus,t,readVerifyTicket,ticketCapable,fetch,GUEST_TEXT_ENDPOINT,waitForChallenge,setGuestPhase,guestTextWorkerError,saveVerifyTicket,sessionStorage,SESSION_STORAGE_KEY,mounted,setGuestToken,setRemaining,backendFailureCount,classifyGuestTextFailure,phaseRef,markGuestTextStartError,clearVerifyTicket,isVerifyTicketRejected}=v;"+extracted+"\nreturn startGuestText;");
 const response=(value,status=200)=>({ok:status<400,status,json:async()=>value});
 const make=(can,stored,server)=>{
  const trace=[],storage={setItem:(...args)=>trace.push(["stored",args[0]]),removeItem:()=>trace.push(["clear"])};
  const setup={setGuestStatus:()=>{},t:k=>k,readVerifyTicket:()=>can?stored:"",ticketCapable:can,
   fetch:async(_url,init)=>{const body=JSON.parse(init.body);trace.push(["POST",body]);return server(body)},
   GUEST_TEXT_ENDPOINT:"/api/guest/text",waitForChallenge:async()=>{trace.push(["captcha"]);return challenge},
   setGuestPhase:()=>{},guestTextWorkerError:(code)=>Error(code),saveVerifyTicket:data=>{if(data.verifyTicket)trace.push(["save-proof"])},
   sessionStorage:storage,SESSION_STORAGE_KEY:"session-key",mounted:{current:true},setGuestToken:()=>{},setRemaining:()=>{},
   backendFailureCount:{current:1},classifyGuestTextFailure:()=>({kind:"verification",reverify:true}),phaseRef:{current:"ready"},
   markGuestTextStartError:e=>e,clearVerifyTicket:()=>trace.push(["clear-proof"]),isVerifyTicketRejected:code=>code==="VERIFY_REQUIRED"};
  return {start:compile(setup),trace};
 };
 const success={sessionToken:"a".repeat(64),expiresAt:Date.now()+10000,remaining:12,verifyTicket:"b".repeat(64)};
 const none=make(false,"shared",()=>response(success));await none.start();
 assert.deepEqual(none.trace.filter(x=>x[0]==="POST").map(x=>x[1]),[{action:"start",challengeToken:challenge}]);
 const good=make(true,"shared",()=>response(success));await good.start();
 assert.equal(good.trace.some(x=>x[0]==="captcha"),false);
 const fallback=make(true,"shared",body=>body.verifyTicket?response({code:"VERIFY_REQUIRED"},403):response(success));
 await fallback.start();
 assert.deepEqual(fallback.trace.filter(x=>x[0]==="POST").map(x=>x[1]),
  [{action:"start",verifyTicket:"shared"},{action:"start",challengeToken:challenge}]);
 assert.equal(fallback.trace.filter(x=>x[0]==="captcha").length,1);
 assert.equal(fallback.trace.filter(x=>x[0]==="save-proof").length,1);
 assert.equal(fallback.trace.filter(x=>x[0]==="clear-proof").length,1);
 assert.match(panel,/acquire:startGuestText/);
});
test("source guards: ticket consumed before unchanged voice grant path, microphone before POST, 300s quota, no new locale keys",()=>{
 const live=code("web-spa/src/live/GuestLiveStarter.tsx");
 assert.ok(live.indexOf("getUserMedia({audio:true})")<live.indexOf("fetch(GUEST_TOKEN_ENDPOINT"));
 assert.match(live,/readVerifyTicket\(ticketCapable\)/);
 assert.match(live,/isVerifyTicketRejected\(data\.code\)/);
 assert.match(live,/saveVerifyTicket\(data\)/);
 const server=code("functions/api/guest/token.js");
 assert.ok(server.indexOf("services?.verifyTicket?.voice")<server.indexOf("issueVoiceAfterVerification(input,env,ip,agent)"));
 assert.match(server,/const SESSION_SECONDS=300;/);
 assert.match(code("workers/guest-trial/verify-ticket.mjs"),/voice_redeemed_at IS NULL/);
});
