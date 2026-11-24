import test from "node:test";
import assert from "node:assert/strict";
import {purchaseOrders,deliveryState} from "../server/koolo-purchase-status.mjs";
import {reconcileQuery} from "../server/koolo-ecpay-live-test.mjs";
const id="12345678-1234-1234-1234-123456789012",report="12345678-1234-1234-1234-123456789013";
const base={id,product_id:"bazi-deep-v1",amount_twd:79,status:"paid",created_at:1,updated_at:2,paid_at:2,report_id:report,report_status:"ready",secret:"never expose"};
test("delivery is separate from paid and refunded orders cannot present access",()=>{
 assert.equal(deliveryState(base,"fortune"),"ready");
 assert.equal(deliveryState({...base,report_status:"failed"},"fortune"),"failed");
 assert.equal(deliveryState({...base,status:"refunded"},"fortune"),"unavailable");
 assert.equal(deliveryState({...base,product_kind:"voice_pack",credit_seconds:600,granted_seconds:0},"billing"),"review");
 assert.equal(deliveryState({...base,product_kind:"voice_pack",credit_seconds:600,granted_seconds:600},"billing"),"ready");
});
test("orders require session, scope both tables to owner and return only safe fields",async()=>{
 let reads=0;
 const db={prepare(sql){let args;return {bind(...v){args=v;return this},async first(){return {user_id:"owner"}},async all(){assert.deepEqual(args,["owner"]);assert.match(sql,/WHERE o.user_id=\?/);reads++;return {results:sql.includes("koolo_fortune_orders")?[base]:[]}}}}};
 const url="https://koolo.app/api/membership/orders?user_id=other";
 assert.equal((await purchaseOrders({request:new Request(url),env:{CREW_AUTH_DB:db}})).status,401);
 const request=new Request(url,{headers:{Cookie:"__Host-crew_session="+"a".repeat(43)}});
 const res=await purchaseOrders({request,env:{CREW_AUTH_DB:db}});
 assert.equal(res.status,200);assert.match(res.headers.get("Cache-Control"),/no-store/);
 const body=await res.json();assert.equal(reads,2);assert.equal(body.checkoutEnabled,false);assert.equal(body.orders[0].reportId,report);assert.equal(body.orders[0].amountTwd,79);assert.ok(!JSON.stringify(body).includes("never expose"));
 assert.equal((await purchaseOrders({request,env:{}})).status,503);
});
test("query reconciliation handles non-existent order without full card details and flags conflicts",()=>{
 const c={merchant:"1234567"},row={merchant_trade_no:"KL123",paid_at:null};
 const f={MerchantID:c.merchant,MerchantTradeNo:row.merchant_trade_no,TradeStatus:"10200095"};
 assert.match(reconcileQuery(f,row,c),/未成立/);
 assert.match(reconcileQuery(f,{...row,paid_at:1},c),/衝突/);
 assert.match(reconcileQuery({...f,MerchantTradeNo:"other"},row,c),/不符/);
 assert.match(reconcileQuery({...f,TradeStatus:"1"},row,c),/不符/);
 assert.equal(reconcileQuery({...f,TradeStatus:"1",TradeAmt:"10",PaymentType:"Credit_CreditCard",TradeNo:"123"},row,c),null);
});
