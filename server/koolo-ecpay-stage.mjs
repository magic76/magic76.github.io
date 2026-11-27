/** ECPay AIO stage harness only. Public ECPay stage keys cannot authorize a live purchase.
 * Deliberately isolated from koolo_fortune_orders/reports/voice wallets.
 * https://developers.ecpay.com.tw/27979/ (public stage credentials)
 */
const ORIGINS=new Set(["https://koolo.app","https://www.3sssi.com"]);
const STAGE_ACTION="https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";
const TEST_MERCHANT="3002607";
const TEST_KEY="pwFHCqoQZGmho4w6";
const TEST_IV="EkRm7iFT261dpevs";
const SESSION="__Host-crew_session";
const BOOK_AMOUNT=99;
const LEGACY_TABLE="koolo_fortune_stage_orders",BOOK_TABLE="koolo_fortune_stage_book_orders";
const ALL_ORDERS="(SELECT id,user_id,merchant_trade_no,amount_twd,state,facts_json,report_json,trade_no_hash,created_at,paid_at FROM "+LEGACY_TABLE+" UNION ALL SELECT id,user_id,merchant_trade_no,amount_twd,state,facts_json,report_json,trade_no_hash,created_at,paid_at FROM "+BOOK_TABLE+")";
const LIFE_TABLE="koolo_fortune_stage_book_lifecycle";
const EXPIRE_SECONDS=1800,QUERY_AFTER_SECONDS=2400,QUERY_INTERVAL=600;
const STAGE_QUERY="https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5";
const ORDER_COLS="o.id,o.user_id,o.merchant_trade_no,o.amount_twd,o.state,o.facts_json,o.report_json,o.trade_no_hash,o.created_at,o.paid_at";
const ORDER_VIEW="(SELECT "+ORDER_COLS+",NULL AS cancelled_at,NULL AS checked_at,NULL AS provider_state FROM "+LEGACY_TABLE+" o UNION ALL SELECT "+ORDER_COLS+",l.cancelled_at,l.checked_at,l.provider_state FROM "+BOOK_TABLE+" o LEFT JOIN "+LIFE_TABLE+" l ON l.order_id=o.id)";
const ID_RE=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const respond=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{
 "Content-Type":"application/json; charset=utf-8","Cache-Control":"private, no-store",
 "Pragma":"no-cache","Vary":"Cookie","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"
}});
const sha=async s=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))]
 .map(x=>x.toString(16).padStart(2,"0")).join("");
const secureEqual=(a,b)=>typeof a==="string"&&typeof b==="string"&&a.length===b.length&&
 [...a].reduce((v,x,i)=>v|(x.charCodeAt(0)^b.charCodeAt(i)),0)===0;
const enabled=env=>env?.KOOLO_ECPAY_STAGE_ENABLED==="1";
const allowed=(env,uid)=>typeof uid==="string"&&(env?.KOOLO_ECPAY_TEST_USER_IDS||"").split(",")
 .map(x=>x.trim()).filter(Boolean).includes(uid);
function validHost(request){try{return ORIGINS.has(new URL(request.url).origin)}catch{return false}}
async function owner({request,env},method="GET"){
 if(!validHost(request))return {error:respond({error:"NOT_FOUND"},404)};
 if(request.method!==method)return {error:respond({error:"METHOD_NOT_ALLOWED"},405)};
 if(!enabled(env))return {error:respond({error:"STAGE_DISABLED"},503)};
 if(!env?.CREW_AUTH_DB)return {error:respond({error:"STAGE_UNAVAILABLE"},503)};
 const pre=SESSION+"=";
 const cookie=(request.headers.get("Cookie")||"").split(";").map(x=>x.trim())
  .find(x=>x.startsWith(pre))?.slice(pre.length)||"";
 if(!/^[A-Za-z0-9_-]{43}$/.test(cookie))return {error:respond({error:"LOGIN_REQUIRED"},401)};
 try{
  const result=await env.CREW_AUTH_DB.prepare("SELECT user_id FROM crew_auth_sessions WHERE token_hash=? AND expires_at>?")
   .bind(await sha(cookie),Math.floor(Date.now()/1000)).first();
  if(typeof result?.user_id!=="string")return {error:respond({error:"LOGIN_REQUIRED"},401)};
  if(!allowed(env,result.user_id))return {error:respond({error:"TEST_ACCESS_DENIED"},403)};
  return {db:env.CREW_AUTH_DB,userId:result.user_id};
 }catch{return {error:respond({error:"STAGE_UNAVAILABLE"},503)}}
}
function encodeEcpay(s){
 // ECPay uses application/x-www-form-urlencoded with .NET special-char mapping
 // and lowercases the entire encoded source before SHA-256.
 return encodeURIComponent(s).replace(/[!'()*~]/g,c=>"%"+c.charCodeAt(0).toString(16).toUpperCase())
  .replace(/%20/g,"+").replace(/%21/g,"!").replace(/%2A/g,"*")
  .replace(/%28/g,"(").replace(/%29/g,")").replace(/%2D/g,"-")
  .replace(/%5F/g,"_").replace(/%2E/g,".");
}
export async function ecpayCheckMac(fields,key=TEST_KEY,iv=TEST_IV){
 const pairs=Object.entries(fields).filter(([name])=>name!=="CheckMacValue")
  .sort(([a],[b])=>a.toLowerCase().localeCompare(b.toLowerCase(),"en"))
  .map(([name,value])=>name+"="+String(value)).join("&");
 const raw="HashKey="+key+"&"+pairs+"&HashIV="+iv;
 return (await sha(encodeEcpay(raw).toLowerCase())).toUpperCase();
}
export function compactFacts(input){
 if(!input||typeof input!=="object"||Array.isArray(input))return null;
 const s=(name,max)=>typeof input[name]==="string"&&input[name].trim().length<=max?input[name].trim():"";
 const fourPillars=s("fourPillars",75),dayMaster=s("dayMaster",12),element=s("element",4);
 if(!fourPillars||!dayMaster||!["木","火","土","金","水"].includes(element))return null;
 const safeInt=(name)=>Number.isSafeInteger(input[name])&&input[name]>=0&&input[name]<=20?input[name]:0;
 return {fourPillars,dayMaster,element,strength:s("strength",25)||"未提供",
  currentLuck:s("currentLuck",24)||"未提供",
  resource:safeInt("resource"),output:safeInt("output"),officer:safeInt("officer"),
  directWealth:safeInt("directWealth"),indirectWealth:safeInt("indirectWealth"),
  spousePalace:s("spousePalace",12)||"未提供"};
}
export function buildTestReport(f){
 const work=f.resource>=f.output&&f.resource>=f.officer?"印星（學習與支援）":
  f.output>=f.officer?"食傷（表達與成果）":"官殺（責任與規範）";
 const money=f.directWealth>f.indirectWealth?"較偏向穩定規劃的切入角度":
  f.indirectWealth>f.directWealth?"較偏向彈性機會與風險控管的切入角度":"適合平衡穩定與彈性的切入角度";
 return {sections:[
  {title:"測試版提醒",body:"這份報告由命盤摘要資料產生，是綠界測試付款、伺服器製作與跨裝置保存的驗收樣本。沒有真正收費，也不是正式交付的專屬一生命書。"},
  {title:"命盤摘要",body:"四柱："+f.fourPillars+"。日主："+f.dayMaster+"（"+f.element+"），旺衰標記："+f.strength+"。這些是傳統命理的象徵語言，不是客觀人格測量。"},
  {title:"性格與優勢",body:"以日主「"+f.element+"」作為自我觀察起點，整理自己在合作、學習及壓力下的表現。建議記下三個近期實際案例，辨認何時這種描述符合你、何時不符合。"},
  {title:"工作與職涯",body:"印星 "+f.resource+"、食傷 "+f.output+"、官殺 "+f.officer+"。三類訊號中「"+work+"」相對突出，可思考如何配置學習、表達與承擔責任的時間。實際求職和升遷仍取決於技能、工作環境與選擇。"},
  {title:"財富與資源",body:"正財標記 "+f.directWealth+"、偏財標記 "+f.indirectWealth+"；這是"+money+"。建議盤點每月現金流、緊急預備金與風險界線，不把命理標記當作投資建議。"},
  {title:"關係與人生階段",body:"日支參考："+f.spousePalace+"；目前大運："+f.currentLuck+"。把它當作檢視溝通、界線與時間配置的象徵線索，不代表關係或未來事件必然發生。"},
  {title:"接下來三年的思考題",body:"第一年：選一項想累積的核心技能。第二年：檢視一段需要改善的合作或關係。第三年：確認財務及生活節奏是否符合長期目標。此為反思建議，不是流年事件預言。"},
  {title:"30 天實踐",body:"第 1 週：紀錄時間與精力花在哪裡。第 2 週：設立一個可以衡量的小目標。第 3 週：向可信任的人取得具體回饋。第 4 週：比較前後差異，決定下一個 30 天要持續的習慣。"}
 ]};
}
function tradeDate(now=Date.now()){return new Date(now+8*3600*1000).toISOString().slice(0,19).replaceAll("-","/").replace("T"," ")}
function responseOrder(row,includeReport=false){
 const now=Math.floor(Date.now()/1000),createdAt=Number(row.created_at),book=Number(row.amount_twd)===BOOK_AMOUNT;
 const lifecycle=row.state==="paid"?"paid":!book?"legacy":row.provider_state==="failed"?"failed":row.cancelled_at?"cancelled":now>=createdAt+EXPIRE_SECONDS?"expired":"pending";
 const data={id:String(row.id),state:row.state,createdAt,amountTwd:Number(row.amount_twd),sandbox:true,lifecycle,
  reportState:row.state==="paid"?"ready":"not_started",expiresAt:book?createdAt+EXPIRE_SECONDS:null,
  nextCheckAt:book?Math.max(createdAt+QUERY_AFTER_SECONDS,Number(row.checked_at||0)+QUERY_INTERVAL):null,
  canCancel:book&&lifecycle==="pending",canRetry:book&&lifecycle==="failed",canCheck:book&&row.state==="pending"&&lifecycle!=="failed"&&now>=Math.max(createdAt+QUERY_AFTER_SECONDS,Number(row.checked_at||0)+QUERY_INTERVAL)};
 if(includeReport&&row.state==="paid"&&typeof row.report_json==="string"){
  try{const report=JSON.parse(row.report_json);if(Array.isArray(report.sections))data.report=report}catch{/* never leak raw content */}
 }
 return data;
}
export async function stageConfig(context){
 const a=await owner(context);if(a.error)return a.error;
 try{await a.db.prepare("SELECT id FROM "+ORDER_VIEW+" LIMIT 1").first();
  return respond({enabled:true,sandbox:true,amountTwd:BOOK_AMOUNT});
 }catch{return respond({error:"MIGRATION_REQUIRED"},503)}
}
export async function stageOrder(context){
 const a=await owner(context,"POST");if(a.error)return a.error;
 const origin=new URL(context.request.url).origin;
 if(context.request.headers.get("Origin")!==origin)return respond({error:"BAD_ORIGIN"},403);
 if(!(context.request.headers.get("Content-Type")||"").toLowerCase().startsWith("application/json"))return respond({error:"BAD_CONTENT_TYPE"},415);
 if(Number(context.request.headers.get("Content-Length")||0)>8192)return respond({error:"BAD_REQUEST"},413);
 let payload;try{const raw=await context.request.text();if(raw.length>8192)return respond({error:"BAD_REQUEST"},413);payload=JSON.parse(raw)}catch{return respond({error:"BAD_REQUEST"},400)}
 let facts=compactFacts(payload?.facts);
 if(payload?.retryOrderId!==undefined){
  if(!ID_RE.test(payload.retryOrderId||""))return respond({error:"INVALID_ORDER"},400);
  try{
   const previous=await a.db.prepare("SELECT * FROM "+ORDER_VIEW+" WHERE id=? AND user_id=? LIMIT 1").bind(payload.retryOrderId,a.userId).first();
   if(!previous)return respond({error:"NOT_FOUND"},404);
   if(previous.state!=="pending"||previous.amount_twd!==BOOK_AMOUNT||previous.provider_state!=="failed")return respond({error:"PAYMENT_NOT_CONFIRMED_FAILED"},409);
   facts=compactFacts(JSON.parse(previous.facts_json));
  }catch{return respond({error:"STAGE_UNAVAILABLE"},503)}
 }
 if(!facts)return respond({error:"INVALID_CHART"},400);
 const now=Math.floor(Date.now()/1000),id=crypto.randomUUID();
 const tradeNo="K"+id.replaceAll("-","").slice(0,18); // <=20, unique merchant trade number
 try{
  const serialized=JSON.stringify(facts);
  const activeSql="SELECT o.id FROM "+BOOK_TABLE+" o LEFT JOIN "+LIFE_TABLE+" l ON l.order_id=o.id WHERE o.user_id=? AND o.facts_json=? AND o.state='pending' AND COALESCE(l.provider_state,'unknown')<>'failed' ORDER BY o.created_at DESC LIMIT 1";
  const existing=await a.db.prepare(activeSql).bind(a.userId,serialized).first();
  if(existing)return respond({error:"ORDER_ALREADY_PENDING",orderId:existing.id},409);
  const count=await a.db.prepare("SELECT COUNT(1) AS n FROM "+ALL_ORDERS+" WHERE user_id=? AND created_at>?")
   .bind(a.userId,now-86400).first();
  if(Number(count?.n||0)>=12)return respond({error:"TEST_DAILY_LIMIT"},429);
  // Single conditional write closes the check/insert race across tabs and devices.
  const inserted=await a.db.prepare("INSERT INTO "+BOOK_TABLE+"(id,user_id,merchant_trade_no,amount_twd,facts_json,created_at) SELECT ?,?,?,?,?,? WHERE NOT EXISTS ("+activeSql+")")
   .bind(id,a.userId,tradeNo,BOOK_AMOUNT,serialized,now,a.userId,serialized).run();
  if(Number(inserted.meta?.changes)!==1){
   const current=await a.db.prepare(activeSql).bind(a.userId,serialized).first();
   return respond({error:"ORDER_ALREADY_PENDING",orderId:current?.id},409);
  }
  const fields={
   MerchantID:TEST_MERCHANT,MerchantTradeNo:tradeNo,MerchantTradeDate:tradeDate(),
   PaymentType:"aio",TotalAmount:String(BOOK_AMOUNT),TradeDesc:"Koolo Life Book Sandbox",
   ItemName:"Koolo Personal Life Book (Test)",
   ReturnURL:"https://koolo.app/api/fortune/ecpay/test-notify",
   ClientBackURL:"https://koolo.app/fortune/ecpay/test?order="+encodeURIComponent(id),
   ChoosePayment:"Credit",EncryptType:"1"
  };
  return respond({orderId:id,sandbox:true,checkout:{action:STAGE_ACTION,
   fields:{...fields,CheckMacValue:await ecpayCheckMac(fields)}}},201);
 }catch{return respond({error:"STAGE_UNAVAILABLE"},503)}
}
export async function stageOrders(context){
 const a=await owner(context);if(a.error)return a.error;
 try{
  const result=await a.db.prepare(
   "SELECT id,state,created_at,amount_twd,report_json,cancelled_at,checked_at,provider_state FROM "+ORDER_VIEW+" WHERE user_id=? ORDER BY created_at DESC LIMIT 20"
  ).bind(a.userId).all();
  return respond({sandbox:true,orders:(result.results||[]).map(responseOrder)});
 }catch{return respond({error:"STAGE_UNAVAILABLE"},503)}
}
export async function stageOrderStatus(context){
 const a=await owner(context);if(a.error)return a.error;
 const id=new URL(context.request.url).searchParams.get("id");
 if(!ID_RE.test(id||""))return respond({error:"INVALID_ORDER"},400);
 try{
  const row=await a.db.prepare(
   "SELECT id,state,created_at,amount_twd,report_json,cancelled_at,checked_at,provider_state FROM "+ORDER_VIEW+" WHERE id=? AND user_id=? LIMIT 1"
  ).bind(id,a.userId).first();
  return row?respond({order:responseOrder(row,true)}):respond({error:"NOT_FOUND"},404);
 }catch{return respond({error:"STAGE_UNAVAILABLE"},503)}
}
const ack=()=>new Response("1|OK",{status:200,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}});
const nack=(status=400)=>new Response("0|FAIL",{status,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}});
export async function stageNotify({request,env}){
 // This is a server-to-server callback: NEVER require a browser session.
 if(!validHost(request)||new URL(request.url).host!=="koolo.app"||request.method!=="POST")return nack(404);
 if(!enabled(env)||!env?.CREW_AUTH_DB)return nack(503);
 if(!(request.headers.get("Content-Type")||"").toLowerCase().startsWith("application/x-www-form-urlencoded"))return nack(415);
 if(Number(request.headers.get("Content-Length")||0)>10000)return nack(413);
 let raw;try{raw=await request.text();if(raw.length>10000)return nack(413)}catch{return nack()}
 const p=new URLSearchParams(raw);if([...p.keys()].length!==new Set(p.keys()).size)return nack();
 const values=Object.fromEntries(p),mac=values.CheckMacValue;
 if(typeof mac!=="string"||!/^[A-F0-9]{64}$/i.test(mac)||!secureEqual(mac.toUpperCase(),await ecpayCheckMac(values)))return nack(403);
 if(values.MerchantID!==TEST_MERCHANT||!/^[A-Za-z0-9]{1,20}$/.test(values.MerchantTradeNo||"")||
  !["79",String(BOOK_AMOUNT)].includes(values.TradeAmt)||!/^Credit(?:_|$)/.test(values.PaymentType||"")||
  !/^[A-Za-z0-9]{1,40}$/.test(values.TradeNo||""))return nack(422);
 try{
  // Legacy callbacks continue to resolve only against the original 79 TWD table.
  const table=values.TradeAmt==="79"?LEGACY_TABLE:BOOK_TABLE;
  const row=await env.CREW_AUTH_DB.prepare(
   "SELECT id,user_id,state,facts_json,trade_no_hash FROM "+table+" WHERE merchant_trade_no=? AND amount_twd=? LIMIT 1"
  ).bind(values.MerchantTradeNo,Number(values.TradeAmt)).first();
  if(!row)return nack(404);
  if(values.RtnCode!=="1"||values.SimulatePaid==="1")return ack(); // nonpayment / backend simulation grants nothing
  return await settleStageOrder(env.CREW_AUTH_DB,table,row,values.TradeNo);
 }catch{return nack(503)}
}
async function settleStageOrder(db,table,row,tradeNo){
 const other=table===LEGACY_TABLE?BOOK_TABLE:LEGACY_TABLE;
  const tradeHash=await sha(TEST_MERCHANT+":"+tradeNo);
  if(row.state==="paid")return row.trade_no_hash===tradeHash?ack():nack(409);
  if(row.state!=="pending")return nack(409);
  // One ECPay trade cannot be attached to another legacy or book order.
  // Keep callbacks for legacy orders working even before migration 0013.
  let otherReady=true,duplicate;try{duplicate=await db.prepare("SELECT id FROM "+other+" WHERE trade_no_hash=? LIMIT 1").bind(tradeHash).first()}catch(e){if(table!==LEGACY_TABLE||!/no such table/i.test(String(e)))throw e;otherReady=false}
  if(duplicate)return nack(409);
  const facts=compactFacts(JSON.parse(row.facts_json));
  if(!facts)return nack(503);
  const snapshot=JSON.stringify(buildTestReport(facts)),now=Math.floor(Date.now()/1000);
  const result=await db.prepare(
   "UPDATE "+table+" SET state='paid',paid_at=?,trade_no_hash=?,report_json=? WHERE id=? AND state='pending' AND NOT EXISTS (SELECT 1 FROM "+table+" WHERE trade_no_hash=?)"+(otherReady?" AND NOT EXISTS (SELECT 1 FROM "+other+" WHERE trade_no_hash=?)":"")
  ).bind(now,tradeHash,snapshot,row.id,tradeHash,...(otherReady?[tradeHash]:[])).run();
  if(Number(result.meta?.changes)===1)return ack();
  const updated=await db.prepare(
   "SELECT state,trade_no_hash FROM "+table+" WHERE id=?"
  ).bind(row.id).first();
  return updated?.state==="paid"&&updated.trade_no_hash===tradeHash?ack():nack(409);

}

/** Local cancellation never cancels an ECPay authorization. Reconciliation is
 * deliberately opt-in, throttled in D1 and fail-closed on ambiguous responses. */
export async function stageOrderAction(context){
 const a=await owner(context,"POST");if(a.error)return a.error;
 if(context.request.headers.get("Origin")!==new URL(context.request.url).origin)return respond({error:"BAD_ORIGIN"},403);
 if(!(context.request.headers.get("Content-Type")||"").toLowerCase().startsWith("application/json"))return respond({error:"BAD_CONTENT_TYPE"},415);
 let payload;try{const raw=await context.request.text();if(raw.length>2048)return respond({error:"BAD_REQUEST"},413);payload=JSON.parse(raw)}catch{return respond({error:"BAD_REQUEST"},400)}
 const id=payload?.orderId,action=payload?.action;
 if(typeof id!=="string"||!ID_RE.test(id)||!["cancel","check"].includes(action))return respond({error:"BAD_REQUEST"},400);
 const load=()=>a.db.prepare("SELECT * FROM "+ORDER_VIEW+" WHERE id=? AND user_id=? LIMIT 1").bind(id,a.userId).first();
 const current=async()=>{const row=await load();return row?respond({order:responseOrder(row,true)}):respond({error:"NOT_FOUND"},404)};
 try{
  const row=await load();if(!row)return respond({error:"NOT_FOUND"},404);
  if(row.amount_twd!==BOOK_AMOUNT)return respond({error:"LEGACY_ORDER_READ_ONLY"},409);
  if(row.state==="paid"||row.provider_state==="failed")return current();
  const now=Math.floor(Date.now()/1000);
  if(action==="cancel"){
   if(now>=Number(row.created_at)+EXPIRE_SECONDS)return current();
   await a.db.prepare("INSERT INTO "+LIFE_TABLE+"(order_id,cancelled_at) VALUES(?,?) ON CONFLICT(order_id) DO UPDATE SET cancelled_at=COALESCE(cancelled_at,excluded.cancelled_at)").bind(id,now).run();
   return current();
  }
  const next=Math.max(Number(row.created_at)+QUERY_AFTER_SECONDS,Number(row.checked_at||0)+QUERY_INTERVAL);
  if(now<next)return respond({error:"CHECK_TOO_EARLY",nextCheckAt:next},429);
  const lease=await a.db.prepare("INSERT INTO "+LIFE_TABLE+"(order_id,checked_at) VALUES(?,?) ON CONFLICT(order_id) DO UPDATE SET checked_at=excluded.checked_at WHERE checked_at IS NULL OR checked_at<=?").bind(id,now,now-QUERY_INTERVAL).run();
  if(Number(lease.meta?.changes)!==1)return respond({error:"CHECK_TOO_EARLY"},429);
  const fields={MerchantID:TEST_MERCHANT,MerchantTradeNo:row.merchant_trade_no,TimeStamp:String(now)};
  const result=await fetch(STAGE_QUERY,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({...fields,CheckMacValue:await ecpayCheckMac(fields)}),signal:AbortSignal.timeout(12000)});
  if(!result.ok)return respond({error:"PROVIDER_UNAVAILABLE"},502);
  const raw=await result.text();if(raw.length>16000)return respond({error:"PROVIDER_UNVERIFIED"},502);
  const params=new URLSearchParams(raw);
  if([...params.keys()].length!==new Set(params.keys()).size)return respond({error:"PROVIDER_UNVERIFIED"},502);
  const values=Object.fromEntries(params);
  if(!/^[A-F0-9]{64}$/i.test(values.CheckMacValue||"")||!secureEqual(values.CheckMacValue.toUpperCase(),await ecpayCheckMac(values))||
   values.MerchantID!==TEST_MERCHANT||values.MerchantTradeNo!==row.merchant_trade_no)return respond({error:"PROVIDER_UNVERIFIED"},502);
  if(values.TradeStatus==="1"){
   if(values.TradeAmt!==String(BOOK_AMOUNT)||!/^Credit(?:_|$)/.test(values.PaymentType||"")||!/^[A-Za-z0-9]{1,40}$/.test(values.TradeNo||"")||values.SimulatePaid==="1")return respond({error:"PROVIDER_UNVERIFIED"},502);
   const settled=await settleStageOrder(a.db,BOOK_TABLE,row,values.TradeNo);
   if(!settled.ok)return respond({error:"PAYMENT_REVIEW_REQUIRED"},409);
  }else if(values.TradeStatus==="10200095"){
   await a.db.prepare("UPDATE "+LIFE_TABLE+" SET provider_state='failed' WHERE order_id=?").bind(id).run();
  }else if(values.TradeStatus!=="0")return respond({error:"PROVIDER_UNVERIFIED"},502);
  return current();
 }catch{return respond({error:"STAGE_UNAVAILABLE"},503)}
}
