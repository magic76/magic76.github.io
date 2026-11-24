import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {liveCheckoutFields,liveMac,liveTestPage,liveTestPost,liveTestNotify} from "../server/koolo-ecpay-live-test.mjs";
const host="https://koolo.app",page=host+"/admin/payment-test",notify=host+"/api/fortune/ecpay/live-test-notify";
const cfg={ready:true,merchant:"1234567",key:"0123456789ABCDEF",iv:"FEDCBA9876543210"};
const cookie="__Host-crew_session="+"a".repeat(43);
const env={ECPAY_MERCHANT_ID:cfg.merchant,ECPAY_HASH_KEY:cfg.key,ECPAY_HASH_IV:cfg.iv,ECPAY_ENV:"production",ECPAY_ENABLED:"false",CREW_AUTH_DB:{prepare(sql){return{bind(){return this},async first(){return sql.includes("crew_auth_sessions")?{user_id:"u1"}:null},async all(){return {results:[]}}}}}};
const admin=async()=>true;
test("checkout has fixed live amount and dedicated callback",async()=>{
 const id="12345678-1234-1234-1234-123456789012";
 const f=liveCheckoutFields(cfg,"KL123456781234123412",id,new Date("2026-11-24T00:00:00Z"));
 assert.equal(f.TotalAmount,"10");assert.equal(f.MerchantID,cfg.merchant);
 assert.equal(f.ReturnURL,notify);assert.equal(f.ClientBackURL,page+"?order="+id);
 assert.equal(f.MerchantTradeDate,"2026/11/24 08:00:00");
 assert.match(await liveMac(f,cfg),/^[A-F0-9]{64}$/);
 await assert.rejects(liveMac(f,{...cfg,ready:false}),/LIVE_NOT_CONFIGURED/);
});
test("admin gate, disabled checkout and secrets never rendered",async()=>{
 const request=new Request(page,{headers:{Cookie:cookie}});
 assert.equal((await liveTestPage({request,env,verifyAdmin:async()=>false})).status,404);
 assert.equal((await liveTestPage({request:new Request(page),env,verifyAdmin:admin})).status,401);
 const result=await liveTestPage({request,env,verifyAdmin:admin});assert.equal(result.status,200);
 const body=await result.text();assert.match(body,/已關閉/);assert.match(body,/disabled/);
 for(const s of [cfg.key,cfg.iv,cfg.merchant])assert.ok(!body.includes(s));
 const req=origin=>new Request(page,{method:"POST",headers:{Cookie:cookie,Origin:origin},body:new URLSearchParams({action:"create",id:"12345678-1234-1234-1234-123456789012",confirm:"yes"})});
 assert.equal((await liveTestPost({request:req("https://evil.invalid"),env,verifyAdmin:admin})).status,403);
 assert.equal((await liveTestPost({request:req(host),env,verifyAdmin:admin})).status,403);
});
test("callback rejects forged, duplicate parameters, wrong amount, stage config",async()=>{
 const send=async(v,override={},mac=true)=>liveTestNotify({request:new Request(notify,{method:"POST",body:new URLSearchParams({...v,CheckMacValue:mac?await liveMac(v,cfg):"0".repeat(64)})}),env:{...env,...override}});
 const f={MerchantID:cfg.merchant,MerchantTradeNo:"KL123456781234123412",TradeAmt:"10",TradeNo:"123456789",PaymentType:"Credit_CreditCard",RtnCode:"1",SimulatePaid:"0"};
 assert.equal((await send(f,{},false)).status,403);
 assert.equal((await send({...f,TradeAmt:"11"})).status,422);
 assert.equal((await send(f,{ECPAY_ENV:"stage"})).status,503);
 assert.equal((await send(f)).status,404);
 assert.equal((await liveTestNotify({request:new Request(notify,{method:"POST",body:new URLSearchParams("MerchantID=a&MerchantID=b")}),env})).status,403);
});
test("isolated persistence and route registration",()=>{
 const source=readFileSync(new URL("../server/koolo-ecpay-live-test.mjs",import.meta.url),"utf8");
 assert.doesNotMatch(source,/koolo_fortune_orders|koolo_fortune_reports|koolo_voice_wallets|koolo_billing_orders/);
 assert.match(source,/payment\.ecpay\.com\.tw\/Cashier\/QueryTradeInfo\/V5/);
 assert.match(source,/WHERE id=\? AND paid_at IS NULL/);
 const routes=JSON.parse(readFileSync(new URL("../_routes.json",import.meta.url),"utf8"));
 assert.ok(routes.include.includes("/admin/payment-test"));assert.ok(routes.include.includes("/api/fortune/*"));
});

test("valid live callback is idempotent, rejects conflicting trade, and accepts in-flight notices with checkout disabled",async()=>{
 const row={id:"r1",paid_at:null,trade_no_hash:null};
 let writes=0;
 const db={prepare(sql){let args;return {bind(...values){args=values;return this},async first(){return {...row}},async run(){
  if(sql.includes("SET paid_at=")&&!row.paid_at){row.paid_at=args[0];row.trade_no_hash=args[2];writes++;return {meta:{changes:1}}}
  if(sql.includes("callback_result=?")&&!row.paid_at){row.callback_result=args[1];return {meta:{changes:1}}}
  return {meta:{changes:0}};
 }}}};
 const f={MerchantID:cfg.merchant,MerchantTradeNo:"KL123456781234123412",TradeAmt:"10",TradeNo:"123456789",PaymentType:"Credit_CreditCard",RtnCode:"1",SimulatePaid:"0"};
 const send=async(extra={})=>{const v={...f,...extra};return liveTestNotify({request:new Request(notify,{method:"POST",body:new URLSearchParams({...v,CheckMacValue:await liveMac(v,cfg)})}),env:{...env,CREW_AUTH_DB:db}})};
 assert.equal((await send({SimulatePaid:"1"})).status,200);assert.equal(row.paid_at,null);
 assert.equal((await send({RtnCode:"0"})).status,200);assert.equal(row.paid_at,null);
 const ok=await send();assert.equal(ok.status,200);assert.equal(await ok.text(),"1|OK");
 assert.equal((await send()).status,200);assert.equal(writes,1);
 assert.equal((await send({TradeNo:"987654321"})).status,409);assert.equal(writes,1);
});
test("usage dashboard links to a protected server page rather than a public SPA route",()=>{
 const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
 assert.match(read("web-spa/src/analytics/UsageDashboardPage.tsx"),/href="https:\/\/koolo\.app\/admin\/payment-test"/);
 const handler=read("functions/admin/payment-test.js");
 assert.match(handler,/liveTestPage\(\{\.\.\.context,verifyAdmin:verifyAccess\}\)/);
 assert.match(handler,/liveTestPost\(\{\.\.\.context,verifyAdmin:verifyAccess\}\)/);
 assert.doesNotMatch(read("web-spa/src/App.tsx"),/path="\/admin\/payment-test"/);
});

test("native HTML forms preserve Origin; reject null, missing and foreign origins before creating orders",async()=>{
 let inserts=0;
 const db={prepare(sql){return{bind(){return this},async first(){return sql.includes("crew_auth_sessions")?{user_id:"u1"}:null},async all(){return {results:[]}},async run(){inserts++;return {meta:{changes:1}}}}}};
 const e={...env,ECPAY_ENABLED:"true",CREW_AUTH_DB:db};
 const res=await liveTestPage({request:new Request(page,{headers:{Cookie:cookie}}),env:e,verifyAdmin:admin});
 assert.equal(res.headers.get("Referrer-Policy"),"strict-origin");
 assert.match(await res.text(),/<form method="post" action="\/admin\/payment-test">/);
 const send=origin=>liveTestPost({request:new Request(page,{method:"POST",headers:{Cookie:cookie,...(origin===undefined?{}:{Origin:origin})},body:new URLSearchParams({action:"create",id:"12345678-1234-1234-1234-123456789012",confirm:"yes"})}),env:e,verifyAdmin:admin});
 for(const origin of ["null",undefined,"https://evil.invalid","https://www.koolo.app"]){
  const rejected=await send(origin);assert.equal(rejected.status,403);assert.equal(await rejected.text(),"Bad origin");
 }
 assert.equal(inserts,0);
 const ok=await send(host);assert.equal(ok.status,201);assert.equal(inserts,1);
 assert.equal(ok.headers.get("Referrer-Policy"),"strict-origin");
 assert.match(await ok.text(),/action="https:\/\/payment\.ecpay\.com\.tw\/Cashier\/AioCheckOut\/V5"/);
});
