import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {voiceCreditStatus} from "../server/koolo-voice-credits.mjs";

const TOKEN="a".repeat(43);
const base="https://koolo.app/api/voice/credits";
function request({host="https://koolo.app",cookie=TOKEN,method="GET"}={}){
 return new Request(host+"/api/voice/credits",{
  method,headers:cookie?{Cookie:"__Host-crew_session="+cookie}:{}
 });
}
const wallet={available_seconds:3725,reserved_seconds:120,updated_at:1770000000};
const sample={id:"ledger-1",event_type:"topup",delta_available_seconds:3900,
 delta_reserved_seconds:0,created_at:1770000000,source_id:"private-payment-ref"};
function db({sessionUser="user-1",walletUser="user-1",walletRow=wallet,events=[sample],fail=false}={}){
 return {prepare(sql){
  if(fail)throw Error("no such table");
  if(sql.includes("FROM crew_auth_sessions"))return {bind(){return {async first(){return sessionUser?{user_id:sessionUser}:null}}}};
  if(sql.includes("FROM koolo_voice_wallets")){
   assert.match(sql,/WHERE user_id=\?/);
   return {bind(id){return {async first(){return id===walletUser?walletRow:null}}}};
  }
  if(sql.includes("FROM koolo_voice_credit_ledger")){
   assert.match(sql,/WHERE user_id=\?/);
   assert.match(sql,/LIMIT 30/);
   return {bind(id){return {async all(){return {results:id===walletUser?events:[]}}}}};
  }
  throw Error("Unexpected wallet query: "+sql);
 }};
}
const ctx=(options={},req=request())=>({request:req,env:{CREW_AUTH_DB:db(options)}});
const getJson=async x=>x.json();

test("wallet rejects invalid host, logged-out, expired and malformed sessions",async()=>{
 assert.equal((await voiceCreditStatus(ctx({},request({host:"https://evil.example"})))).status,404);
 assert.equal((await voiceCreditStatus(ctx({},request({cookie:""})))).status,401);
 assert.equal((await voiceCreditStatus(ctx({},request({cookie:"short"})))).status,401);
 assert.equal((await voiceCreditStatus(ctx({sessionUser:null}))).status,401);
 assert.equal((await voiceCreditStatus(ctx({},request({method:"POST"})))).status,405);
});
test("wallet fails closed on missing bindings or missing schema",async()=>{
 assert.equal((await voiceCreditStatus({request:request(),env:{}})).status,503);
 assert.equal((await voiceCreditStatus(ctx({fail:true}))).status,503);
});
test("authenticated wallet shows server-owned seconds and no private payment references",async()=>{
 const res=await voiceCreditStatus(ctx());
 assert.equal(res.status,200);
 assert.match(res.headers.get("cache-control"),/no-store/);
 const payload=await getJson(res);
 assert.deepEqual({available:payload.availableSeconds,reserved:payload.reservedSeconds,total:payload.totalSeconds},
  {available:3725,reserved:120,total:3845});
 assert.equal(payload.unit,"seconds");
 assert.equal(payload.topupsEnabled,false);
 assert.equal(payload.paidVoiceEnabled,false);
 assert.deepEqual(payload.history,[{
  id:"ledger-1",type:"topup",deltaAvailableSeconds:3900,deltaReservedSeconds:0,createdAt:1770000000
 }]);
 assert.ok(!JSON.stringify(payload).includes("private-payment-ref"));
});
test("a new account with no wallet row has a real zero balance when schema exists",async()=>{
 const result=await voiceCreditStatus(ctx({walletRow:null,events:[]}));
 assert.equal(result.status,200);
 assert.deepEqual((await getJson(result)).history,[]);
 const payload=await getJson(await voiceCreditStatus(ctx({walletRow:null,events:[]})));
 assert.equal(payload.availableSeconds,0);
 assert.equal(payload.reservedSeconds,0);
});
test("wallet and history are both scoped to the session's user",async()=>{
 const payload=await getJson(await voiceCreditStatus(ctx({sessionUser:"user-2"})));
 assert.equal(payload.availableSeconds,0);
 assert.deepEqual(payload.history,[]);
});
test("corrupt negative balances and malformed ledger rows do not look spendable",async()=>{
 assert.equal((await voiceCreditStatus(ctx({walletRow:{...wallet,available_seconds:-1}}))).status,503);
 assert.equal((await voiceCreditStatus(ctx({events:[{...sample,delta_available_seconds:1.5}]}))).status,503);
});
test("read-only wallet foundation includes shared orders and an idempotent signed ledger",()=>{
 const root=new URL("../",import.meta.url);
 const read=path=>readFileSync(new URL(path,root),"utf8");
 const sql=read("migrations/crew-auth/0008_voice_credit_wallet.sql");
 assert.equal((sql.match(/^CREATE TABLE IF NOT EXISTS /gm)||[]).length,4);
 assert.match(sql,/koolo_voice_wallets/);
 assert.match(sql,/koolo_voice_credit_ledger/);
 assert.match(sql,/koolo_billing_orders/);
 assert.match(sql,/koolo_billing_events/);
 assert.match(sql,/UNIQUE\(user_id,source_type,source_id,event_type\)/);
 assert.match(sql,/CHECK\(available_seconds >= 0\)/);
 assert.match(sql,/CHECK\(reserved_seconds >= 0\)/);
 assert.match(sql,/provider_event_hash TEXT NOT NULL/);
 assert.doesNotMatch(sql,/^CREATE TRIGGER /m,"D1 Console schema must not contain a compound trigger");
 const routes=JSON.parse(read("_routes.json"));
 assert.ok(routes.include.includes("/api/voice/*"));
 const handler=read("functions/api/voice/credits.js");
 assert.match(handler,/onRequestGet=voiceCreditStatus/);
 assert.doesNotMatch(handler,/onRequestPost|onRequestPut|onRequestDelete/);
 const page=read("web-spa/src/pages/VoiceCreditsPage.tsx");
 assert.match(page,/topupsEnabled|尚未開放/);
 assert.doesNotMatch(page,/\/api\/voice\/checkout|onClick=.*topup/);
 assert.match(read("web-spa/src/App.tsx"),/path="\/me\/voice-credits"/);
 assert.match(read("web-spa/src/pages/MyAccountGroups.tsx"),/to="\/me\/voice-credits"/);
});
