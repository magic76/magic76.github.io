import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ecpayCheckMac,compactFacts,buildTestReport,stageConfig,stageOrder,stageOrders,
 stageOrderStatus,stageNotify,stageQuery} from "../server/koolo-ecpay-stage.mjs";

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
 const orders=new Map(),queryLimits=new Map();
 const db={prepare(sql){
  if(missing)throw Error("no such table");
  let args=[];
  const stmt={bind(...v){args=v;return stmt},
   async first(){
    if(sql.includes("FROM crew_auth_sessions"))return userId?{user_id:userId}:null;
    if(sql.includes("FROM koolo_ecpay_stage_query_limits"))return queryLimits.has(args[0])?{query_after:queryLimits.get(args[0])}:null;
    if(sql.includes("FROM koolo_fortune_stage_orders")||sql.includes("FROM koolo_fortune_stage_book_orders")){
     if(sql.includes("COUNT(1)"))return {n:orders.size};
     if(sql.includes("WHERE trade_no_hash=?"))return [...orders.values()].find(x=>x.trade_no_hash===args[0]&&x.amount_twd===(sql.includes("FROM koolo_fortune_stage_book_orders")?99:79))||null;
     if(sql.includes("WHERE merchant_trade_no=?"))return [...orders.values()].find(x=>x.merchant_trade_no===args[0]&&x.amount_twd===args[1])||null;
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
    if(sql.startsWith("INSERT INTO koolo_ecpay_stage_query_limits")){
     const[id,until,now]=args,existing=queryLimits.get(id)||0;
     if(now!==undefined&&existing>now)return {meta:{changes:0}};
     queryLimits.set(id,Math.max(existing,until));return {meta:{changes:1}};
    }
    if(sql.startsWith("INSERT INTO koolo_fortune_stage_book_orders")){
     const[id,user_id,merchant_trade_no,amount_twd,facts_json,created_at]=args;
     orders.set(id,{id,user_id,merchant_trade_no,facts_json,created_at,state:"pending",
       report_json:null,trade_no_hash:null,paid_at:null,amount_twd});
     return {success:true,meta:{changes:1}};
    }
    if(sql.startsWith("UPDATE koolo_fortune_stage_orders")||sql.startsWith("UPDATE koolo_fortune_stage_book_orders")){
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
 const cfg=await stageConfig({request:request("/api/fortune/ecpay/test-config"),env:s.env});assert.equal(cfg.status,200);assert.equal((await cfg.json()).amountTwd,99);
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
 assert.equal(data.checkout.fields.TotalAmount,"99");
 assert.equal([...s.orders.values()][0].amount_twd,99);
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
  TradeAmt:"99",PaymentType:"Credit_CreditCard",SimulatePaid:"0"};
 const send=async(extra={},breakMac=false)=>{
  const data={...payload,...extra},CheckMacValue=await ecpayCheckMac(data);
  const body=new URLSearchParams({...data,CheckMacValue:breakMac?"0".repeat(64):CheckMacValue}).toString();
  return stageNotify({request:request("/api/fortune/ecpay/test-notify",{method:"POST",body,isNotify:true,noCookie:true}),env:s.env});
 };
 assert.equal((await send({},true)).status,403);
 assert.equal((await send({TradeAmt:"80"})).status,422);
 assert.equal((await send({TradeAmt:"79"})).status,404,"79 cannot settle a 99 order");
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

test("legacy 79 callback remains isolated and order history preserves both prices",async()=>{
 const s=setup(),id=crypto.randomUUID(),merchantNo="LEGACY79";
 s.orders.set(id,{id,user_id:"u1",merchant_trade_no:merchantNo,amount_twd:79,state:"pending",facts_json:JSON.stringify(FACTS),created_at:1});
 const pay=async(amount)=>{
  const data={MerchantID:"3002607",MerchantTradeNo:merchantNo,RtnCode:"1",TradeNo:"LEGACYTRADE79",TradeAmt:String(amount),PaymentType:"Credit_CreditCard",SimulatePaid:"0"};
  const body=new URLSearchParams({...data,CheckMacValue:await ecpayCheckMac(data)}).toString();
  return stageNotify({request:request("/api/fortune/ecpay/test-notify",{method:"POST",body,isNotify:true,noCookie:true}),env:s.env});
 };
 assert.equal((await pay(99)).status,404);assert.equal(s.orders.get(id).state,"pending");
 assert.equal((await pay(79)).status,200);assert.equal(s.orders.get(id).state,"paid");
 const created=await stageOrder({request:request("/api/fortune/ecpay/test-order",{method:"POST",body:JSON.stringify({facts:FACTS})}),env:s.env});assert.equal(created.status,201);
 const newOrder=await created.json();const duplicate={MerchantID:"3002607",MerchantTradeNo:newOrder.checkout.fields.MerchantTradeNo,RtnCode:"1",TradeNo:"LEGACYTRADE79",TradeAmt:"99",PaymentType:"Credit_CreditCard",SimulatePaid:"0"};
 const body=new URLSearchParams({...duplicate,CheckMacValue:await ecpayCheckMac(duplicate)}).toString();
 assert.equal((await stageNotify({request:request("/api/fortune/ecpay/test-notify",{method:"POST",body,isNotify:true,noCookie:true}),env:s.env})).status,409);
 const list=await stageOrders({request:request("/api/fortune/ecpay/test-orders"),env:s.env});
 assert.deepEqual((await list.json()).orders.map(x=>x.amountTwd).sort(),[79,99]);
 const migration=read("migrations/crew-auth/0013_ecpay_stage_book_99.sql");assert.match(migration,/CHECK\(amount_twd=99\)/);assert.doesNotMatch(migration,/DROP TABLE|UPDATE koolo_fortune_stage_orders/);
});

test("authenticated sandbox query recovers paid orders without callback; never repeats a charge",async()=>{
 const s=setup(),created=await (await stageOrder({request:request("/api/fortune/ecpay/test-order",{method:"POST",body:JSON.stringify({facts:FACTS})}),env:s.env})).json();
 const id=created.orderId,row=s.orders.get(id),path="/api/fortune/ecpay/test-status?id="+id;
 let calls=0;
 const upstream=async(url,options)=>{
  calls++;assert.equal(url,"https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5");assert.equal(options.method,"POST");assert.equal(options.redirect,"manual");
  const f=Object.fromEntries(options.body);assert.equal(f.MerchantTradeNo,row.merchant_trade_no);assert.equal(f.PlatformID,"");assert.equal(f.CheckMacValue,await ecpayCheckMac(f));
  const v={MerchantID:"3002607",MerchantTradeNo:row.merchant_trade_no,TradeNo:"2511220000123456",TradeAmt:"99",PaymentType:"Credit_CreditCard",TradeStatus:"1"};
  return new Response(new URLSearchParams({...v,CheckMacValue:await ecpayCheckMac(v)}).toString());
 };
 const query=(opts={})=>stageQuery({request:request(path,{method:"POST",...opts}),env:s.env},upstream);
 assert.equal((await query()).status,429);assert.equal(calls,0);
 row.created_at-=601;
 assert.equal((await query({origin:"https://evil.invalid"})).status,403);assert.equal(calls,0);
 const response=await query();assert.equal(response.status,200);const data=await response.json();
 assert.equal(data.queryResult,"QUERY_PAID");assert.equal(data.order.state,"paid");assert.equal(data.order.report.sections.length,8);assert.equal(calls,1);
 assert.equal((await query()).status,200);assert.equal(calls,1);
});
test("query rejects mismatches and rate-limits attempts across requests",async()=>{
 const s=setup(),created=await (await stageOrder({request:request("/api/fortune/ecpay/test-order",{method:"POST",body:JSON.stringify({facts:FACTS})}),env:s.env})).json();
 const row=s.orders.get(created.orderId);row.created_at-=601;
 const path="/api/fortune/ecpay/test-status?id="+row.id;
 let calls=0;
 const query=()=>stageQuery({request:request(path,{method:"POST"}),env:s.env},async()=>{
  calls++;const v={MerchantID:"3002607",MerchantTradeNo:row.merchant_trade_no,TradeNo:"2511220000123456",TradeAmt:"79",PaymentType:"Credit_CreditCard",TradeStatus:"1"};
  return new Response(new URLSearchParams({...v,CheckMacValue:await ecpayCheckMac(v)}).toString());
 });
 const data=await (await query()).json();assert.equal(data.queryResult,"QUERY_MISMATCH");assert.equal(row.state,"pending");
 assert.equal((await query()).status,429);assert.equal(calls,1);
});
test("sandbox query never treats unsigned or simulated results as paid",async()=>{
 for(const scenario of ["bad-signature","simulated","unpaid"]){
  const s=setup(),created=await (await stageOrder({request:request("/api/fortune/ecpay/test-order",{method:"POST",body:JSON.stringify({facts:FACTS})}),env:s.env})).json();
  const row=s.orders.get(created.orderId);row.created_at-=601;
  const v={MerchantID:"3002607",MerchantTradeNo:row.merchant_trade_no,TradeNo:"2511220000123456",TradeAmt:"99",PaymentType:"Credit_CreditCard",TradeStatus:scenario==="unpaid"?"0":"1",...(scenario==="simulated"?{SimulatePaid:"1"}:{})};
  const res=await stageQuery({request:request("/api/fortune/ecpay/test-status?id="+row.id,{method:"POST"}),env:s.env},async()=>new Response(new URLSearchParams({...v,CheckMacValue:scenario==="bad-signature"?"0".repeat(64):await ecpayCheckMac(v)}).toString()));
  assert.equal((await res.json()).queryResult,scenario==="bad-signature"?"QUERY_BAD_SIGNATURE":scenario==="simulated"?"QUERY_MISMATCH":"QUERY_PENDING");assert.equal(row.state,"pending");
 }
});

test("Cloudflare-compatible query rejects redirects, reports transport and HTTP failures without settlement",async()=>{
 for(const [scenario,expected] of [["redirect","QUERY_REDIRECT"],["http","QUERY_HTTP_502"],["timeout","QUERY_TIMEOUT"],["transport","QUERY_TRANSPORT"]]){
  const s=setup(),created=await (await stageOrder({request:request("/api/fortune/ecpay/test-order",{method:"POST",body:JSON.stringify({facts:FACTS})}),env:s.env})).json();
  const row=s.orders.get(created.orderId);row.created_at-=601;
  let calls=0;
  const res=await stageQuery({request:request("/api/fortune/ecpay/test-status?id="+row.id,{method:"POST"}),env:s.env},async(url,opts)=>{
   calls++;assert.equal(opts.redirect,"manual");
   if(scenario==="redirect")return new Response(null,{status:302,headers:{Location:"https://example.invalid/"}});
   if(scenario==="http")return new Response("upstream error",{status:502});
   if(scenario==="timeout")throw new DOMException("timeout","TimeoutError");
   throw new TypeError("private upstream error");
  });
  const data=await res.json();assert.equal(data.queryResult,expected);assert.equal(row.state,"pending");assert.equal(calls,1);
  assert.doesNotMatch(JSON.stringify(data),/private upstream error|example.invalid/);
 }
});
