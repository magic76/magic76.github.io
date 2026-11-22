import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ecpayCheckMac,compactFacts,buildTestReport,stageConfig,stageOrder,stageOrders,
 stageOrderStatus,stageNotify} from "../server/koolo-ecpay-stage.mjs";

const ROOT=new URL("../",import.meta.url),read=x=>readFileSync(new URL(x,ROOT),"utf8");
const TOKEN="a".repeat(43),ORIGIN="https://koolo.app";
const FACTS={fourPillars:"甲子 乙丑 丙寅 丁卯",dayMaster:"丙",element:"火",strength:"中和",
 currentLuck:"壬辰",resource:2,output:3,officer:1,directWealth:2,indirectWealth:1,spousePalace:"寅"};
function request(path,opts={}){
 return new Request(ORIGIN+path,{method:opts.method||"GET",headers:{
  ...(opts.noCookie?{}:{Cookie:"__Host-crew_session="+(opts.cookie||TOKEN)}),
  ...(opts.origin===false?{}:opts.method==="POST"&&!opts.isNotify?{Origin:opts.origin||ORIGIN}:{}),
  ...(opts.body!==undefined?{"Content-Type":opts.isNotify?"application/x-www-form-urlencoded":"application/json"}:{})
 },...(opts.body!==undefined?{body:opts.body}:{})});
}
function setup({userId="u1",missing=false,allowed="u1",enabled="1"}={}){
 const orders=new Map();
 const db={prepare(sql){
  if(missing)throw Error("no such table");
  let args=[];
  const stmt={bind(...v){args=v;return stmt},
   async first(){
    if(sql.includes("FROM crew_auth_sessions"))return userId?{user_id:userId}:null;
    if(sql.includes("FROM koolo_fortune_stage_orders")){
     if(sql.includes("COUNT(1)"))return {n:orders.size};
     if(sql.includes("WHERE merchant_trade_no=?"))return [...orders.values()].find(x=>x.merchant_trade_no===args[0])||null;
     if(sql.includes("WHERE id=? AND user_id=?"))return [...orders.values()].find(x=>x.id===args[0]&&x.user_id===args[1])||null;
     if(sql.includes("WHERE id=?"))return orders.get(args[0])||null;
     return [...orders.values()][0]||null;
    }
    throw Error("Unknown first: "+sql);
   },
   async all(){
    if(sql.includes("FROM koolo_fortune_stage_orders")){
     return {results:[...orders.values()].filter(x=>x.user_id===args[0]).slice(0,20)};
    }
    throw Error("Unknown all: "+sql);
   },
   async run(){
    if(sql.startsWith("INSERT INTO koolo_fortune_stage_orders")){
     const[id,user_id,merchant_trade_no,facts_json,created_at]=args;
     orders.set(id,{id,user_id,merchant_trade_no,facts_json,created_at,state:"pending",
       report_json:null,trade_no_hash:null,paid_at:null,amount_twd:79});
     return {success:true,meta:{changes:1}};
    }
    if(sql.startsWith("UPDATE koolo_fortune_stage_orders")){
     const[paid_at,trade_no_hash,report_json,id]=args;
     const row=orders.get(id);if(!row||row.state!=="pending")return {meta:{changes:0}};
     Object.assign(row,{paid_at,trade_no_hash,report_json,state:"paid"});
     return {success:true,meta:{changes:1}};
    }
    throw Error("Unknown run: "+sql);
   }
  };return stmt;
 }};
 const env={CREW_AUTH_DB:db,KOOLO_ECPAY_STAGE_ENABLED:enabled,KOOLO_ECPAY_TEST_USER_IDS:allowed};
 return {orders,env,db};
}
test("ECPay SHA256 CheckMacValue matches official documentation vector",async()=>{
 const fields={TradeDesc:"促銷方案",PaymentType:"aio",MerchantTradeDate:"2023/03/12 15:30:23",
  MerchantTradeNo:"ecpay20230312153023",MerchantID:"3002607",
  ReturnURL:"https://www.ecpay.com.tw/receive.php",ItemName:"Apple iphone 15",
  TotalAmount:"30000",ChoosePayment:"ALL",EncryptType:"1"};
 assert.equal(await ecpayCheckMac(fields),"6C51C9E6888DE861FD62FB1DD17029FC742634498FD813DC43D4243B5685B840");
});
test("strict opt-in, session and per-user allowlist before any stage operation",async()=>{
 const s=setup();
 assert.equal((await stageConfig({request:request("/api/fortune/ecpay/test-config",{noCookie:true}),env:s.env})).status,401);
 assert.equal((await stageConfig({request:request("/api/fortune/ecpay/test-config"),env:{...s.env,KOOLO_ECPAY_STAGE_ENABLED:"0"}})).status,503);
 assert.equal((await stageConfig({request:request("/api/fortune/ecpay/test-config"),env:{...s.env,KOOLO_ECPAY_TEST_USER_IDS:"u2"}})).status,403);
 assert.equal((await stageConfig({request:request("/api/fortune/ecpay/test-config"),env:setup({missing:true}).env})).status,503);
 assert.equal((await stageConfig({request:request("/api/fortune/ecpay/test-config"),env:s.env})).status,200);
});
test("order creation validates CSRF, input, sandbox destination and account ownership",async()=>{
 const s=setup(),path="/api/fortune/ecpay/test-order";
 const post=async(opts={})=>stageOrder({request:request(path,{method:"POST",body:JSON.stringify({facts:FACTS}),...opts}),env:s.env});
 assert.equal((await post({origin:"https://attacker.invalid"})).status,403);
 assert.equal((await stageOrder({request:request(path,{method:"POST",body:JSON.stringify({facts:{}})}),env:s.env})).status,400);
 const ok=await post();assert.equal(ok.status,201);
 const data=await ok.json();
 assert.equal(data.sandbox,true);
 assert.equal(data.checkout.action,"https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5");
 assert.equal(data.checkout.fields.TotalAmount,"79");
 assert.equal(data.checkout.fields.MerchantID,"3002607");
 assert.equal(data.checkout.fields.ChoosePayment,"Credit");
 assert.equal(data.checkout.fields.ReturnURL,"https://koolo.app/api/fortune/ecpay/test-notify");
 const{CheckMacValue,...payload}=data.checkout.fields;
 assert.equal(CheckMacValue,await ecpayCheckMac(payload));
 assert.equal(s.orders.size,1);
 assert.equal([...s.orders.values()][0].state,"pending");
 const other=setup({userId:"u2",allowed:"u2"}).env;
 assert.equal((await stageOrderStatus({request:request("/api/fortune/ecpay/test-status?id="+data.orderId),env:other})).status,404);
});
test("ECPay forged callbacks, wrong amount, unapproved simulation and failure cannot grant sample report",async()=>{
 const s=setup();const order=await stageOrder({request:request("/api/fortune/ecpay/test-order",{method:"POST",body:JSON.stringify({facts:FACTS})}),env:s.env});
 const created=await order.json(),id=created.orderId,merchantNo=created.checkout.fields.MerchantTradeNo;
 const payload={MerchantID:"3002607",MerchantTradeNo:merchantNo,RtnCode:"1",RtnMsg:"交易成功",TradeNo:"2511220000123456",
  TradeAmt:"79",PaymentType:"Credit_CreditCard",SimulatePaid:"0"};
 const send=async(extra={},breakMac=false)=>{
  const data={...payload,...extra},CheckMacValue=await ecpayCheckMac(data);
  const body=new URLSearchParams({...data,CheckMacValue:breakMac?"0".repeat(64):CheckMacValue}).toString();
  return stageNotify({request:request("/api/fortune/ecpay/test-notify",{method:"POST",body,isNotify:true,noCookie:true}),env:s.env});
 };
 assert.equal((await send({},true)).status,403);
 assert.equal((await send({TradeAmt:"80"})).status,422);
 assert.equal((await send({RtnCode:"0"})).status,200);
 assert.equal((await send({SimulatePaid:"1"})).status,200);
 assert.equal(s.orders.get(id).state,"pending");
 const good=await send();assert.equal(good.status,200);assert.equal(await good.text(),"1|OK");
 assert.equal(s.orders.get(id).state,"paid");
 const report=JSON.parse(s.orders.get(id).report_json);
 assert.ok(report.sections.length>=6);
 assert.match(report.sections[1].body,/丙/);
 assert.equal((await send()).status,200,"replayed same notice is idempotent");
 assert.equal((await send({TradeNo:"2511220000987654"})).status,409);
 assert.equal(s.orders.size,1);
});
test("read-only order lists return only current owner's sandbox reports",async()=>{
 const s=setup();
 const start=await stageOrder({request:request("/api/fortune/ecpay/test-order",{method:"POST",body:JSON.stringify({facts:FACTS})}),env:s.env});
 const{id}=await start.json().then(x=>({id:x.orderId}));
 const list=await stageOrders({request:request("/api/fortune/ecpay/test-orders"),env:s.env});
 assert.equal(list.status,200);assert.equal((await list.json()).orders.length,1);
 assert.equal((await stageOrderStatus({request:request("/api/fortune/ecpay/test-status?id="+id),env:s.env})).status,200);
 assert.equal((await stageOrderStatus({request:request("/api/fortune/ecpay/test-status?id=other"),env:s.env})).status,400);
 const x=setup({userId:"u2",allowed:"u2"});x.orders.set(id,s.orders.get(id));
 const notOwner=await stageOrders({request:request("/api/fortune/ecpay/test-orders"),env:x.env});
 assert.deepEqual((await notOwner.json()).orders,[]);
 assert.equal((await stageOrderStatus({request:request("/api/fortune/ecpay/test-status?id="+id),env:x.env})).status,404);
});
test("sandbox report is deterministic plain text, never raw birth details",()=>{
 const f=compactFacts({...FACTS,birthDate:"1990-01-01",name:"secret"});
 assert.deepEqual(f,FACTS);
 assert.ok(buildTestReport(f).sections.every(x=>typeof x.title==="string"&&typeof x.body==="string"));
 assert.ok(!JSON.stringify(buildTestReport(f)).includes("secret"));
});
test("no live payment routes or live purchase entitlements introduced",()=>{
 const schema=read("migrations/crew-auth/0009_ecpay_stage_only.sql");
 assert.match(schema,/CREATE TABLE IF NOT EXISTS koolo_fortune_stage_orders/);
 assert.doesNotMatch(schema,/^CREATE TRIGGER /m);
 assert.doesNotMatch(schema,/CREATE TABLE IF NOT EXISTS koolo_fortune_orders/);
 const stage=read("server/koolo-ecpay-stage.mjs");
 assert.match(stage,/payment-stage\.ecpay\.com\.tw/);
 assert.doesNotMatch(stage,/["']https:\/\/payment\.ecpay\.com\.tw/);
 assert.doesNotMatch(stage,/INSERT INTO koolo_fortune_reports|UPDATE koolo_fortune_orders|koolo_voice_wallets/);
 assert.match(stage,/KOOLO_ECPAY_STAGE_ENABLED/);
 assert.match(stage,/KOOLO_ECPAY_TEST_USER_IDS/);
 assert.match(read("web-spa/src/fortune/FortunePriceInterest.tsx"),/\/fortune\/ecpay\/test\?history=/);
 assert.match(read("web-spa/src/App.tsx"),/path="ecpay\/test"/);
});
