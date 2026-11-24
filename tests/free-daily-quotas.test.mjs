import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {onRequestGet,onRequestPost} from "../functions/api/guest/token.js";
import {onTextRequest} from "../workers/guest-trial/text-chat.mjs";
import {createGuestTicket} from "../server/crew-guest-ticket.mjs";
import {ensureFreeQuotaTables,freeQuotaDay} from "../server/free-quota.mjs";

const origin="https://www.3sssi.com",uid="11111111-1111-4111-8111-111111111111";
const uid2="22222222-2222-4222-8222-222222222222";
function setup(){
 const sql=new DatabaseSync(":memory:");
 sql.exec("CREATE TABLE crew_guest_usage(user_id TEXT PRIMARY KEY,used INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL);CREATE TABLE crew_guest_ticket_claims(nonce TEXT PRIMARY KEY,user_id TEXT NOT NULL,claimed_at INTEGER NOT NULL)");
 const db={prepare(query){
  const st=sql.prepare(query);
  const bound=(args)=>({async run(){return {meta:{changes:Number(st.run(...args).changes)}}},async first(){return st.get(...args)||null}});
  return {...bound([]),bind(...args){return bound(args)}};
 }};
 const env={CREW_AUTH_DB:db,GUEST_DAILY_QUOTAS_V2:"1",GUEST_TRIAL_ENABLED:"1",GUEST_ACCOUNT_METER_ENABLED:"1",GUEST_REQUIRE_SIGNIN:"0",GEMINI_GUEST_API_KEY:"unit-test-provider-key",GUEST_TURNSTILE_SITE_KEY:"site",GUEST_TURNSTILE_SECRET:"turnstile-test-salt",CREW_GUEST_TICKET_SECRET:"unit-test-signer-secret-32-characters",GUEST_TRIAL_RATE_LIMITER:{limit:async()=>({success:true})}};
 const request=(body,ip="203.0.113.1")=>new Request(origin+"/api/guest/token",{method:body?"POST":"GET",headers:{origin,"content-type":"application/json","user-agent":"Crew-Test","cf-connecting-ip":ip},...(body?{body:JSON.stringify(body)}:{})});
 const ticket=(id=uid)=>createGuestTicket(id,env.CREW_GUEST_TICKET_SECRET);
 return {db,env,sql,request,ticket};
}
test("daily anonymous and member voice quotas, shared cap, refunds and Taipei reset",async()=>{
 const {db,env,sql,request,ticket}=setup();
 const oldFetch=globalThis.fetch,oldNow=Date.now;
 let now=Date.parse("2026-11-24T15:59:00Z"),fail=false;
 Date.now=()=>now;
 globalThis.fetch=async url=>String(url).includes("siteverify")?Response.json({success:true,hostname:"www.3sssi.com",action:"crew-guest-trial"}):fail?new Response("",{status:503}):Response.json({name:"ephemeral-test-token"});
 const voice=(body={},ip)=>onRequestPost({request:request({challengeToken:"test-challenge-token",...body},ip),env});
 try{
  await ensureFreeQuotaTables(db);
  assert.equal(freeQuotaDay(),"2026-11-24");
  assert.equal((await voice()).status,200);
  assert.equal((await (await voice()).json()).code,"ALREADY_USED");
  for(let i=0;i<3;i++)assert.equal((await voice({authTicket:await ticket()})).status,200);
  assert.equal((await (await voice({authTicket:await ticket()})).json()).code,"ALREADY_USED");
  sql.exec("UPDATE crew_free_quota_policy SET voice_cap=4");
  assert.equal((await (await voice({},"203.0.113.2")).json()).code,"DAILY_LIMIT");
  sql.exec("UPDATE crew_free_quota_policy SET voice_cap=5");
  fail=true;assert.equal((await voice({},"203.0.113.2")).status,503);
  fail=false;assert.equal((await voice({},"203.0.113.2")).status,200);
  assert.equal(sql.prepare("SELECT used FROM crew_guest_voice_daily").get().used,5);
  now=Date.parse("2026-11-24T16:00:00Z");
  assert.equal(freeQuotaDay(),"2026-11-25");
  assert.equal((await voice()).status,200);
  assert.equal((await voice({authTicket:await ticket()})).status,200);
  sql.exec("UPDATE crew_free_quota_policy SET enabled=0");
  assert.deepEqual(await (await onRequestGet({request:request(),env})).json(),{enabled:false});
  assert.equal((await voice()).status,503);
 }finally{Date.now=oldNow;globalThis.fetch=oldFetch;sql.close()}
});

test("text member quota shared across devices, guest separate, forged proof, cap and refund",async()=>{
 const {db,env,sql,request,ticket}=setup();
 const oldFetch=globalThis.fetch,oldNow=Date.now;
 let now=Date.parse("2026-11-24T12:00:00Z"),fail=false;
 Date.now=()=>now;
 globalThis.fetch=async()=>fail?new Response("",{status:503}):Response.json({candidates:[{content:{parts:[{text:"reply"}]}}]});
 const deps={verifyCaptcha:async()=>true,selectGuestGeminiKey:()=>env.GEMINI_GUEST_API_KEY};
 const call=(body,ip)=>onTextRequest(request(body,ip),env,deps);
 const start=async(ip,id)=>call({action:"start",challengeToken:"test-challenge-token",...(id?{authTicket:await ticket(id)}:{})},ip);
 const send=async(sessionToken,ip,id)=>{now+=5000;return call({action:"send",sessionToken,system:"Teach English",messages:[{role:"user",text:"hello"}],...(id?{authTicket:await ticket(id)}:{})},ip)};
 const a="203.0.113.1",b="203.0.113.2";
 try{
  await ensureFreeQuotaTables(db);
  const x=await (await start(a,uid)).json(),y=await (await start(b,uid)).json();
  assert.equal(x.dailyLimit,50);assert.equal(y.remaining,50);
  assert.equal((await send(x.sessionToken,a,uid2)).status,401);
  assert.equal((await call({action:"start",challengeToken:"test-challenge-token",authTicket:"forged"},a)).status,401);
  for(let i=0;i<50;i++){
   const r=await send(i%2?x.sessionToken:y.sessionToken,i%2?a:b,uid);
   assert.equal(r.status,200);assert.equal((await r.json()).remaining,49-i);
  }
  assert.equal((await (await send(x.sessionToken,a,uid)).json()).code,"DAILY_LIMIT");
  const guest=await (await start(a)).json();assert.equal(guest.dailyLimit,12);
  sql.exec("UPDATE crew_free_quota_policy SET text_cap=50");
  assert.equal((await (await send(guest.sessionToken,a)).json()).code,"CAPACITY");
  sql.exec("UPDATE crew_free_quota_policy SET text_cap=100");
  fail=true;assert.equal((await send(guest.sessionToken,a)).status,503);
  fail=false;
  for(let i=0;i<12;i++)assert.equal((await (await send(guest.sessionToken,a)).json()).remaining,11-i);
  assert.equal((await (await send(guest.sessionToken,a)).json()).code,"DAILY_LIMIT");
  now=Date.parse("2026-11-24T16:00:00Z");
  assert.equal((await (await start(a,uid)).json()).remaining,50);
  assert.equal((await (await start(a)).json()).remaining,12);
  sql.exec("UPDATE crew_free_quota_policy SET enabled=0");
  assert.equal((await start(a,uid)).status,503);
 }finally{Date.now=oldNow;globalThis.fetch=oldFetch;sql.close()}
});
