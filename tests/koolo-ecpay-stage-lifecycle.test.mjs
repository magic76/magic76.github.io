import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {stageOrder,stageOrderAction,stageOrderStatus,stageNotify,ecpayCheckMac} from "../server/koolo-ecpay-stage.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const origin="https://koolo.app",token="a".repeat(43),facts={fourPillars:"甲子 乙丑 丙寅 丁卯",dayMaster:"丙",element:"火"};
const now=()=>Math.floor(Date.now()/1000);
function request(path,body,notify=false){
 return new Request(origin+"/api/fortune/ecpay/"+path,{method:body===undefined?"GET":"POST",headers:{Cookie:"__Host-crew_session="+token,Origin:origin,...(body===undefined?{}:{"Content-Type":notify?"application/x-www-form-urlencoded":"application/json"})},...(body===undefined?{}:{body:notify?body:JSON.stringify(body)})});
}
async function setup(){
 const db=new DatabaseSync(":memory:");
 db.exec("CREATE TABLE crew_auth_users(id TEXT PRIMARY KEY); CREATE TABLE crew_auth_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT,expires_at INTEGER); INSERT INTO crew_auth_users VALUES('u1'),('u2');");
 for(const n of ["0009_ecpay_stage_only","0013_ecpay_stage_book_99","0014_ecpay_stage_book_lifecycle"])db.exec(read("migrations/crew-auth/"+n+".sql"));
 const hash=[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token)))].map(x=>x.toString(16).padStart(2,"0")).join("");
 db.prepare("INSERT INTO crew_auth_sessions VALUES(?,?,?)").run(hash,"u1",now()+7200);
 const d1={prepare(sql){const stmt=db.prepare(sql);let args=[];return {bind(...v){args=v;return this},async first(){return stmt.get(...args)||null},async all(){return {results:stmt.all(...args)}},async run(){return {meta:{changes:Number(stmt.run(...args).changes)}}}}}};
 const env={CREW_AUTH_DB:d1,KOOLO_ECPAY_STAGE_ENABLED:"1",KOOLO_ECPAY_TEST_USER_IDS:"u1,u2"};
 return {db,env,create:(body={facts})=>stageOrder({request:request("test-order",body),env}),action:(id,action)=>stageOrderAction({request:request("test-action",{orderId:id,action}),env}),status:id=>stageOrderStatus({request:request("test-status?id="+id),env})};
}
async function signed(fields){return new URLSearchParams({...fields,CheckMacValue:await ecpayCheckMac(fields)}).toString()}
test("real SQLite lifecycle: dedup, cancel, expiry, throttled reconciliation, retry, late success",async t=>{
 const s=await setup();t.after(()=>s.db.close());
 const first=await s.create();assert.equal(first.status,201);const data=await first.json(),id=data.orderId;
 const duplicate=await s.create();assert.equal(duplicate.status,409);assert.equal((await duplicate.json()).orderId,id);
 assert.equal((await s.action(id,"check")).status,429);
 assert.equal((await s.action(id,"cancel")).status,200);
 assert.equal((await (await s.status(id)).json()).order.lifecycle,"cancelled");
 assert.equal((await s.create({retryOrderId:id})).status,409);
 s.db.prepare("UPDATE koolo_fortune_stage_book_orders SET created_at=? WHERE id=?").run(now()-2500,id);
 const trade=data.checkout.fields.MerchantTradeNo;
 let providerStatus="0",calls=0,invalid=false;
 t.mock.method(globalThis,"fetch",async(url,options)=>{
  calls++;assert.equal(url,"https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5");assert.equal(options.body.get("MerchantTradeNo"),trade);
  const body=await signed({MerchantID:"3002607",MerchantTradeNo:trade,TradeStatus:providerStatus});
  return new Response(invalid?body.replace("MerchantID=3002607","MerchantID=9999999"):body);
 });
 assert.equal((await s.action(id,"check")).status,200);
 assert.equal((await s.create({retryOrderId:id})).status,409);
 assert.equal((await s.action(id,"check")).status,429);assert.equal(calls,1);
 s.db.prepare("UPDATE koolo_fortune_stage_book_lifecycle SET checked_at=? WHERE order_id=?").run(now()-601,id);
 providerStatus="10200095";invalid=true;
 assert.equal((await s.action(id,"check")).status,502);
 assert.equal((await s.create({retryOrderId:id})).status,409);
 s.db.prepare("UPDATE koolo_fortune_stage_book_lifecycle SET checked_at=? WHERE order_id=?").run(now()-601,id);
 invalid=false;assert.equal((await s.action(id,"check")).status,200);
 assert.equal((await (await s.status(id)).json()).order.lifecycle,"failed");
 const retry=await s.create({retryOrderId:id});assert.equal(retry.status,201);const next=await retry.json();assert.notEqual(next.orderId,id);assert.notEqual(next.checkout.fields.MerchantTradeNo,trade);
 assert.equal((await s.create({retryOrderId:id})).status,409);
 s.db.prepare("UPDATE koolo_fortune_stage_book_orders SET created_at=? WHERE id=?").run(now()-1900,next.orderId);
 assert.equal((await (await s.status(next.orderId)).json()).order.lifecycle,"expired");
 const notice=await signed({MerchantID:"3002607",MerchantTradeNo:trade,RtnCode:"1",TradeNo:"LATEPAY01",TradeAmt:"99",PaymentType:"Credit_CreditCard",SimulatePaid:"0"});
 assert.equal((await stageNotify({request:request("test-notify",notice,true),env:s.env})).status,200);
 const paid=(await (await s.status(id)).json()).order;assert.equal(paid.lifecycle,"paid");assert.equal(paid.reportState,"ready");assert.ok(paid.report.sections.length);
});
test("verified paid query repairs missing callback and owner boundary",async t=>{
 const s=await setup();t.after(()=>s.db.close());
 const data=await (await s.create()).json(),id=data.orderId;
 s.db.prepare("UPDATE koolo_fortune_stage_book_orders SET created_at=? WHERE id=?").run(now()-2500,id);
 s.db.exec("UPDATE crew_auth_sessions SET user_id='u2'");
 assert.equal((await s.action(id,"check")).status,404);
 s.db.exec("UPDATE crew_auth_sessions SET user_id='u1'");
 t.mock.method(globalThis,"fetch",async()=>new Response(await signed({MerchantID:"3002607",MerchantTradeNo:data.checkout.fields.MerchantTradeNo,TradeStatus:"1",TradeAmt:"99",PaymentType:"Credit_CreditCard",TradeNo:"QUERYPAID01"})));
 const result=await s.action(id,"check");assert.equal(result.status,200);assert.equal((await result.json()).order.lifecycle,"paid");
});
