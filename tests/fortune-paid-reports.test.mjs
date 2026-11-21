import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {listFortuneReports,readFortuneReport,safeReportContent} from "../server/koolo-fortune-reports.mjs";

const ID="11111111-2222-4333-8444-555555555555";
const COOKIE="a".repeat(43);
const report={id:ID,mode:"bazi",title:"八字深度解讀",status:"ready",version:"bazi-deep-v1",
 created_at:1763750000,updated_at:1763750100,
 content_json:JSON.stringify({sections:[{title:"性格與優勢",body:"固定內容的第一段。"},{title:"行動方向",body:"第二段文字。"}]})};
function request(path="/api/fortune/reports",cookie=COOKIE,host="https://koolo.app"){
 return new Request(host+path,{headers:cookie?{Cookie:"__Host-crew_session="+cookie}:{}})
}
function db({userId="user-1",ownerId="user-1",orderStatus="paid",reportStatus="ready",missing=false}={}){
 return {prepare(sql){
  if(missing)throw Error("no such table");
  if(sql.includes("FROM crew_auth_sessions")){
   return {bind(){return {async first(){return userId?{user_id:userId}:null}}}};
  }
  if(sql.includes("FROM koolo_fortune_reports")){
   assert.match(sql,/o\.id=r\.order_id AND o\.user_id=r\.user_id/);
   assert.match(sql,/r\.user_id=\?/);
   assert.match(sql,/o\.status='paid'/);
   const allowed=userId===ownerId&&orderStatus==="paid";
   return {bind(...values){return {
    async all(){return {results:allowed?[{...report,status:reportStatus}]:[]}},
    async first(){return allowed&&reportStatus==="ready"&&values[0]===ID?report:null}
   }}};
  }
  throw Error("Unexpected SQL: "+sql);
 }};
}
const ctx=(opts={},path="/api/fortune/reports",id=ID)=>({request:request(path),env:{CREW_AUTH_DB:db(opts)},params:{id}});
const readJson=async r=>r.json();

test("paid report endpoints reject unknown origins and unauthenticated sessions",async()=>{
 assert.equal((await listFortuneReports({request:request("/api/fortune/reports",COOKIE,"https://evil.example"),env:{CREW_AUTH_DB:db()}})).status,404);
 assert.equal((await listFortuneReports({request:request("/api/fortune/reports",""),env:{CREW_AUTH_DB:db()}})).status,401);
 assert.equal((await listFortuneReports(ctx({userId:null}))).status,401);
 assert.equal((await readFortuneReport({request:request("/api/fortune/reports/"+ID,""),env:{CREW_AUTH_DB:db()},params:{id:ID}})).status,401);
 assert.equal((await listFortuneReports({request:request(),env:{}})).status,503);
});
test("paid report library lists only paid current-account reports and no content",async()=>{
 const ok=await listFortuneReports(ctx());
 assert.equal(ok.status,200);
 assert.match(ok.headers.get("Cache-Control"),/no-store/);
 const data=await readJson(ok);
 assert.equal(data.items.length,1);
 assert.deepEqual(Object.keys(data.items[0]).sort(),["createdAt","id","mode","status","title","updatedAt","version"].sort());
 assert.ok(!JSON.stringify(data).includes("固定內容"));
 for(const opts of [{userId:"other-user"},{orderStatus:"pending"},{orderStatus:"refunded"}]){
  const resp=await listFortuneReports(ctx(opts));
  assert.deepEqual((await readJson(resp)).items,[]);
 }
});
test("reader serves saved snapshot only to the owning account with paid, ready order",async()=>{
 const ok=await readFortuneReport(ctx({},"/api/fortune/reports/"+ID));
 assert.equal(ok.status,200);
 assert.deepEqual((await readJson(ok)).report.sections,[{title:"性格與優勢",body:"固定內容的第一段。"},{title:"行動方向",body:"第二段文字。"}]);
 for(const opts of [{userId:"other-user"},{orderStatus:"pending"},{orderStatus:"refunded"},{orderStatus:"chargeback"},{reportStatus:"generating"},{reportStatus:"revoked"}]){
  assert.equal((await readFortuneReport(ctx(opts,"/api/fortune/reports/"+ID))).status,404,JSON.stringify(opts));
 }
 assert.equal((await readFortuneReport(ctx({},"/api/fortune/reports/not-uuid","not-uuid"))).status,404);
});
test("malformed completed report never leaks raw database JSON",()=>{
 assert.equal(safeReportContent("{invalid"),null);
 assert.equal(safeReportContent(JSON.stringify({sections:[]})),null);
 assert.equal(safeReportContent(JSON.stringify({sections:[{title:"",body:"hi"}]})),null);
 assert.deepEqual(safeReportContent(JSON.stringify({sections:[{title:"A",body:"B",email:"secret@example.com"}],paymentToken:"secret"})),{sections:[{title:"A",body:"B"}]});
});
test("missing report schema fails closed instead of pretending the shelf is empty",async()=>{
 assert.equal((await listFortuneReports(ctx({missing:true}))).status,503);
 assert.equal((await readFortuneReport(ctx({missing:true},"/api/fortune/reports/"+ID))).status,503);
});
test("future checkout remains disabled; source routes and migration do not grant purchases",()=>{
 const root=new URL("../",import.meta.url);
 const read=p=>readFileSync(new URL(p,root),"utf8");
 const schema=read("migrations/crew-auth/0006_fortune_paid_reports.sql");
 const routes=JSON.parse(read("_routes.json"));
 const app=read("web-spa/src/App.tsx");
 const me=read("web-spa/src/pages/CrewSectionPage.tsx");
 assert.ok(routes.include.includes("/api/fortune/*"));
 assert.match(schema,/CHECK\(status<>'paid' OR paid_at IS NOT NULL\)/);
 assert.match(schema,/provider_event_hash TEXT NOT NULL UNIQUE/);
 const trigger=read("migrations/crew-auth/0007_fortune_report_immutable_trigger.sql");
 assert.doesNotMatch(schema,/^CREATE TRIGGER /m,"console migration must not include a multiline trigger");
 assert.match(trigger,/CREATE TRIGGER IF NOT EXISTS koolo_fortune_reports_lock_ready/);
 assert.match(trigger,/RAISE\(ABORT,'ready_report_immutable'\)/);
 assert.match(schema,/CHECK\(status<>'ready' OR content_json IS NOT NULL\)/);
 assert.ok(app.includes('path="purchases"'));
 assert.ok(app.includes('path="purchases/:reportId"'));
 assert.ok(me.includes('to="/fortune/purchases"'));
 const price=read("web-spa/src/fortune/FortunePriceInterest.tsx");
 assert.ok(price.includes("尚未開放"));
 assert.doesNotMatch(price,/paymentIntent|\/api\/fortune\/checkout/);
});
