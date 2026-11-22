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
  {title:"測試版提醒",body:"這份報告由命盤摘要資料產生，是綠界測試付款、伺服器製作與跨裝置保存的驗收樣本。沒有真正收費，也不是正式的 NT$79 深度產品。"},
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
 const data={id:String(row.id),state:row.state,createdAt:Number(row.created_at),sandbox:true};
 if(includeReport&&row.state==="paid"&&typeof row.report_json==="string"){
  try{const report=JSON.parse(row.report_json);if(Array.isArray(report.sections))data.report=report}catch{/* never leak raw content */}
 }
 return data;
}
export async function stageConfig(context){
 const a=await owner(context);if(a.error)return a.error;
 try{await a.db.prepare("SELECT id FROM koolo_fortune_stage_orders LIMIT 1").first();
  return respond({enabled:true,sandbox:true,amountTwd:79});
 }catch{return respond({error:"MIGRATION_REQUIRED"},503)}
}
export async function stageOrder(context){
 const a=await owner(context,"POST");if(a.error)return a.error;
 const origin=new URL(context.request.url).origin;
 if(context.request.headers.get("Origin")!==origin)return respond({error:"BAD_ORIGIN"},403);
 if(!(context.request.headers.get("Content-Type")||"").toLowerCase().startsWith("application/json"))return respond({error:"BAD_CONTENT_TYPE"},415);
 if(Number(context.request.headers.get("Content-Length")||0)>8192)return respond({error:"BAD_REQUEST"},413);
 let payload;try{const raw=await context.request.text();if(raw.length>8192)return respond({error:"BAD_REQUEST"},413);payload=JSON.parse(raw)}catch{return respond({error:"BAD_REQUEST"},400)}
 const facts=compactFacts(payload?.facts);if(!facts)return respond({error:"INVALID_CHART"},400);
 const now=Math.floor(Date.now()/1000),id=crypto.randomUUID();
 const tradeNo="K"+id.replaceAll("-","").slice(0,18); // <=20, unique merchant trade number
 try{
  const count=await a.db.prepare("SELECT COUNT(1) AS n FROM koolo_fortune_stage_orders WHERE user_id=? AND created_at>?")
   .bind(a.userId,now-86400).first();
  if(Number(count?.n||0)>=12)return respond({error:"TEST_DAILY_LIMIT"},429);
  await a.db.prepare("INSERT INTO koolo_fortune_stage_orders(id,user_id,merchant_trade_no,facts_json,created_at) VALUES(?,?,?,?,?)")
   .bind(id,a.userId,tradeNo,JSON.stringify(facts),now).run();
  const fields={
   MerchantID:TEST_MERCHANT,MerchantTradeNo:tradeNo,MerchantTradeDate:tradeDate(),
   PaymentType:"aio",TotalAmount:"79",TradeDesc:"Koolo Bazi Sandbox",
   ItemName:"Koolo Bazi Test Report",
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
   "SELECT id,state,created_at,report_json FROM koolo_fortune_stage_orders WHERE user_id=? ORDER BY created_at DESC LIMIT 20"
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
   "SELECT id,state,created_at,report_json FROM koolo_fortune_stage_orders WHERE id=? AND user_id=? LIMIT 1"
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
  values.TradeAmt!=="79"||!/^Credit(?:_|$)/.test(values.PaymentType||"")||
  !/^[A-Za-z0-9]{1,40}$/.test(values.TradeNo||""))return nack(422);
 try{
  const row=await env.CREW_AUTH_DB.prepare(
   "SELECT id,user_id,state,facts_json,trade_no_hash FROM koolo_fortune_stage_orders WHERE merchant_trade_no=? AND amount_twd=79 LIMIT 1"
  ).bind(values.MerchantTradeNo).first();
  if(!row)return nack(404);
  if(values.RtnCode!=="1"||values.SimulatePaid==="1")return ack(); // nonpayment / backend simulation grants nothing
  const tradeHash=await sha(TEST_MERCHANT+":"+values.TradeNo);
  if(row.state==="paid")return row.trade_no_hash===tradeHash?ack():nack(409);
  if(row.state!=="pending")return nack(409);
  const facts=compactFacts(JSON.parse(row.facts_json));
  if(!facts)return nack(503);
  const snapshot=JSON.stringify(buildTestReport(facts)),now=Math.floor(Date.now()/1000);
  const result=await env.CREW_AUTH_DB.prepare(
   "UPDATE koolo_fortune_stage_orders SET state='paid',paid_at=?,trade_no_hash=?,report_json=? WHERE id=? AND state='pending'"
  ).bind(now,tradeHash,snapshot,row.id).run();
  if(Number(result.meta?.changes)===1)return ack();
  const updated=await env.CREW_AUTH_DB.prepare(
   "SELECT state,trade_no_hash FROM koolo_fortune_stage_orders WHERE id=?"
  ).bind(row.id).first();
  return updated?.state==="paid"&&updated.trade_no_hash===tradeHash?ack():nack(409);
 }catch{return nack(503)}
}
