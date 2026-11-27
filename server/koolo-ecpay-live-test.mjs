import {ecpayCheckMac} from "./koolo-ecpay-stage.mjs";
// Private live acceptance only. No product entitlement or card data.
const HOST="https://koolo.app", PAGE="/admin/payment-test", AMOUNT=10;
const CHECKOUT="https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5";
const QUERY="https://payment.ecpay.com.tw/Cashier/QueryTradeInfo/V5";
const NOTIFY=HOST+"/api/fortune/ecpay/live-test-notify";
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const now=()=>Math.floor(Date.now()/1000);
const hash=async s=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,"0")).join("");
const eq=(a,b)=>typeof a==="string"&&typeof b==="string"&&a.length===b.length&&[...a].reduce((v,c,i)=>v|(c.charCodeAt(0)^b.charCodeAt(i)),0)===0;
const config=env=>{
 const merchant=env?.ECPAY_MERCHANT_ID, key=env?.ECPAY_HASH_KEY, iv=env?.ECPAY_HASH_IV;
 const checks={MerchantID:typeof merchant==="string"&&/^\d{6,10}$/.test(merchant)&&!["3002607","2000132","2000214"].includes(merchant),
 HashKey:typeof key==="string"&&/^[A-Za-z0-9]{16}$/.test(key)&&!["pwFHCqoQZGmho4w6","5294y06JbISpM5x9"].includes(key),
 HashIV:typeof iv==="string"&&/^[A-Za-z0-9]{16}$/.test(iv)&&!["EkRm7iFT261dpevs","v77hoKGq4kWxNNIS"].includes(iv),
 Environment:env?.ECPAY_ENV==="production",Database:!!env?.CREW_AUTH_DB};
 return {merchant,key,iv,checks,ready:Object.values(checks).every(Boolean),enabled:env?.ECPAY_ENABLED==="true"};
};
const headers={"Cache-Control":"private, no-store","Vary":"Cookie","X-Robots-Tag":"noindex, nofollow, noarchive","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"};
const plain=(s,status=200)=>new Response(s,{status,headers:{...headers,"Content-Type":"text/plain; charset=utf-8"}});
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// no-referrer makes native POST forms send Origin: null. Keep origin-only referrers on HTML,
// including the checkout handoff, while preserving the exact-origin CSRF guard.
// Signed query reconciliation is diagnostic; it cannot change entitlements.
export function reconcileQuery(v,row,c){
 if(v.MerchantID!==c.merchant||v.MerchantTradeNo!==row.merchant_trade_no)return "特店或訂單編號不符，需人工核對";
 if(v.TradeStatus==="10200095")return row.paid_at?"通知與查詢衝突，需人工核對":"綠界訂單未成立，請先核對是否扣款";
 if(v.TradeAmt!==String(AMOUNT)||!/^Credit(?:_|$)/.test(v.PaymentType||"")||!/^[A-Za-z0-9]{1,20}$/.test(v.TradeNo||""))return "交易資料不符，需人工核對";
 if(v.TradeStatus==="0")return row.paid_at?"通知與查詢衝突，需人工核對":"綠界尚未確認付款，請勿重複付款";
 if(v.TradeStatus==="1")return null;
 return "綠界狀態待人工核對";
}
function html(body,status=200){
 return new Response('<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Koolo 正式金流驗證</title><style>body{font:16px/1.6 system-ui,sans-serif;background:#f6f7f8;color:#18242b;margin:0}main{max-width:760px;margin:auto;padding:20px;overflow-wrap:anywhere}section{background:white;border:1px solid #d9dfe2;border-radius:14px;padding:16px;margin:16px 0}h1,h2{line-height:1.3}button,.btn{font:inherit;padding:10px 14px;border:1px solid #205a4d;border-radius:9px;background:#205a4d;color:white;cursor:pointer}button:disabled{background:#737b80;cursor:default}a{color:#155b50}label{display:block;margin:10px 0}small{color:#52606a}ul{padding-left:22px}.warning{border-color:#d8a165}.order{border-top:1px solid #ddd;padding:12px 0}form{margin:12px 0}input[type=checkbox]{width:20px;height:20px;vertical-align:middle}</style><main><a href="/usage">‹ 返回管理後台</a><h1>綠界正式金流驗證台</h1>'+body+'</main></html>',{status,headers:{...headers,"Referrer-Policy":"strict-origin","Content-Type":"text/html; charset=utf-8","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https://payment.ecpay.com.tw; frame-ancestors 'none'; base-uri 'none'"}});
}
async function owner({request,env,verifyAdmin}){
 if(new URL(request.url).origin!==HOST||typeof verifyAdmin!=="function")return {error:plain("Not found",404)};
 if(!env?.CREW_AUTH_DB)return {error:plain("Database unavailable",503)};
 const token=(request.headers.get("Cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("__Host-crew_session="))?.slice("__Host-crew_session=".length)||"";
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))return {error:plain("請先登入 Koolo",401)};
 try{
  const row=await env.CREW_AUTH_DB.prepare("SELECT user_id FROM crew_auth_sessions WHERE token_hash=? AND expires_at>?").bind(await hash(token),now()).first();
  if(!row?.user_id||await verifyAdmin(request,env)!==true)return {error:plain("Not found",404)};
  return {db:env.CREW_AUTH_DB,uid:row.user_id};
 }catch{return {error:plain("Unavailable",503)}}
}
async function formFields(request,max=12000){
 if(!(request.headers.get("Content-Type")||"").toLowerCase().startsWith("application/x-www-form-urlencoded"))return null;
 if(Number(request.headers.get("Content-Length")||0)>max)return null;
 // Limit streamed bodies even when Content-Length is absent.
 if(!request.body)return null;
 const reader=request.body.getReader();let bytes=0;const decoder=new TextDecoder();let raw="";
 try{for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>max){await reader.cancel();return null}raw+=decoder.decode(value,{stream:true})}raw+=decoder.decode()}catch{return null}
 return parseFields(raw);
}
function parseFields(raw){
 const p=new URLSearchParams(raw);
 if([...p.keys()].length!==new Set(p.keys()).size)return null;
 return Object.fromEntries(p);
}
export async function liveMac(fields,c){
 if(!c.ready)throw Error("LIVE_NOT_CONFIGURED");
 return ecpayCheckMac(fields,c.key,c.iv);
}
async function signed(fields,c){
 return !!fields&&/^[A-Fa-f0-9]{64}$/.test(fields.CheckMacValue||"")&&eq(fields.CheckMacValue.toUpperCase(),await liveMac(fields,c));
}
export function liveCheckoutFields(c,tradeNo,id,date=new Date()){
 const time=new Date(date.getTime()+28800000).toISOString().slice(0,19).replaceAll("-","/").replace("T"," ");
 return {MerchantID:c.merchant,MerchantTradeNo:tradeNo,MerchantTradeDate:time,PaymentType:"aio",TotalAmount:String(AMOUNT),TradeDesc:"Koolo live payment verification",ItemName:"Koolo payment verification",ReturnURL:NOTIFY,ClientBackURL:HOST+PAGE+"?order="+id,ChoosePayment:"Credit",EncryptType:"1"};
}
export async function liveTestPage(ctx){
 const a=await owner(ctx);if(a.error)return a.error;
 const c=config(ctx.env);let rows=[],dbReady=true;
 try{rows=(await a.db.prepare("SELECT id,merchant_trade_no,created_at,paid_at,callback_at,callback_result,query_at,query_result FROM koolo_ecpay_live_test_orders WHERE user_id=? ORDER BY created_at DESC LIMIT 20").bind(a.uid).all()).results||[]}catch{dbReady=false}
 const checks={...c.checks,Database:dbReady&&c.checks.Database};
 const checkList=Object.entries(checks).map(([k,v])=>"<li>"+esc(k)+"："+(v?"已設定":"未設定／格式不符")+"</li>").join("");
 const orderRows=rows.map(row=>{
  const canQuery=c.ready&&(row.paid_at||now()-row.created_at>=600)&&(!row.query_at||now()-row.query_at>=600);
  const status=row.paid_at?"付款通知已驗章成功":row.callback_result==="failed"?"收到未成功付款通知":row.callback_result==="simulated"?"模擬通知（未付款）":"等待付款通知";
  return '<div class="order"><strong>'+esc(row.merchant_trade_no)+'</strong> · NT$10<br>'+esc(status)+'<br><small>查詢比對：'+esc(row.query_result||"尚未查詢")+'</small><form method="post" action="'+PAGE+'"><input type="hidden" name="action" value="query"><input type="hidden" name="id" value="'+esc(row.id)+'"><button '+(canQuery?"":"disabled")+'>向綠界查詢訂單</button></form></div>';
 }).join("");
 return html('<section class="warning"><strong>正式環境，會真實扣款 NT$10</strong><p>僅供授權管理員驗證。無命書、語音額度或其他商品開通。請先確認綠界允許此測試交易及金額，不使用違反特店約定的自行刷卡方式。</p></section><section><h2>參數檢查</h2><ul>'+checkList+'</ul><small>僅檢查是否存在及基本格式，不代表金鑰已通過綠界驗證。金鑰不會顯示。</small><p>建立新訂單：'+(c.enabled?"已開啟":"已關閉（ECPAY_ENABLED=false）")+'</p></section><section><h2>建立正式驗證訂單</h2><form method="post" action="'+PAGE+'"><input type="hidden" name="action" value="create"><input type="hidden" name="id" value="'+crypto.randomUUID()+'"><label><input type="checkbox" name="confirm" value="yes" required> 我確認這是正式付款，可能產生手續費。</label><button '+(c.ready&&c.enabled&&dbReady?"":"disabled")+'>建立 NT$10 驗證訂單</button></form></section><section><h2>我的驗證紀錄</h2><p>若綠界顯示 10300023，先確認收款服務及信用卡資格是否開通。若已扣款但沒有通知，請先查詢與對帳，切勿再次付款。</p><p>收到通知後可查詢比對；若未收到，請於付款後至少 10 分鐘再查詢。查詢不會發起付款。</p>'+(orderRows||"<p>目前沒有驗證訂單。</p>")+'<a href="'+PAGE+'">重新整理紀錄</a></section><section><h2>退款驗證</h2><p>請在綠界廠商後台依特店訂單編號查找，依交易狀態取消授權或退款，再核對結果。本站不會自動退款，也不將查詢的已付款狀態視為退款完成。</p><a href="https://vendor.ecpay.com.tw/">前往綠界廠商管理後台</a></section>');
}
export async function liveTestPost(ctx){
 const a=await owner(ctx);if(a.error)return a.error;
 if(ctx.request.headers.get("Origin")!==HOST)return plain("Bad origin",403);
 const f=await formFields(ctx.request,2048);
 if(!f||!UUID.test(f.id||""))return plain("Bad request",400);
 const c=config(ctx.env);
 if(!c.ready)return html('<p>正式金流參數尚未完成。</p><a href="'+PAGE+'">返回驗證台</a>',503);
 try{
  if(f.action==="create"){
   if(!c.enabled||f.confirm!=="yes")return plain("Disabled or not confirmed",403);
   const tradeNo="KL"+f.id.replaceAll("-","").slice(0,18),created=now();
   const result=await a.db.prepare("INSERT INTO koolo_ecpay_live_test_orders(id,user_id,merchant_trade_no,created_at) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM koolo_ecpay_live_test_orders WHERE created_at>?)<3 ON CONFLICT(id) DO NOTHING").bind(f.id,a.uid,tradeNo,created,created-86400).run();
   // Never issue a second signed checkout for the same ID, even after refresh.
   if(result.meta?.changes!==1)return html('<p>訂單已建立，或已達全站每日三筆驗證上限。請查看紀錄，勿重複付款。</p><a href="'+PAGE+'">返回驗證台</a>',409);
   const fields=liveCheckoutFields(c,tradeNo,f.id);
   fields.CheckMacValue=await liveMac(fields,c);
   return html('<section class="warning"><h2>訂單已建立，尚未付款</h2><p>訂單：'+esc(tradeNo)+'</p><p>金額：NT$10。按下後前往綠界正式付款頁，請確認網址及金額。</p><form method="post" accept-charset="UTF-8" action="'+CHECKOUT+'">'+Object.entries(fields).map(([k,v])=>'<input type="hidden" name="'+esc(k)+'" value="'+esc(v)+'">').join("")+'<button>前往綠界正式付款</button></form><a href="'+PAGE+'">返回（不付款）</a></section>',201);
  }
  if(f.action==="query"){
   const row=await a.db.prepare("SELECT * FROM koolo_ecpay_live_test_orders WHERE id=? AND user_id=?").bind(f.id,a.uid).first();
   if(!row)return plain("Not found",404);
   if(!row.paid_at&&now()-row.created_at<600)return plain("Wait before querying",429);
   const t=now();
   const lease=await a.db.prepare("UPDATE koolo_ecpay_live_test_orders SET query_at=?,query_result='查詢中' WHERE id=? AND user_id=? AND (query_at IS NULL OR query_at<=?)").bind(t,f.id,a.uid,t-600).run();
   if(lease.meta?.changes!==1)return plain("Query cooldown",429);
   let summary="查詢失敗或未通過驗章";
   try{
    const fields={MerchantID:c.merchant,MerchantTradeNo:row.merchant_trade_no,TimeStamp:String(t),PlatformID:""};
    const resp=await fetch(QUERY,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({...fields,CheckMacValue:await liveMac(fields,c)}),redirect:"manual",signal:AbortSignal.timeout(15000)});
    if(resp.status>=300&&resp.status<400)summary="綠界回傳非預期轉址，未跟隨";
    else if(resp.ok){
     const raw=await resp.text(),v=raw.length<=12000?parseFields(raw):null;
     if(await signed(v,c)){
      const currentRow=await a.db.prepare("SELECT paid_at,trade_no_hash FROM koolo_ecpay_live_test_orders WHERE id=?").bind(row.id).first();
      const decision=reconcileQuery(v,{...row,...currentRow},c);
      if(decision!==null){summary=decision}else{
      const current=await a.db.prepare("SELECT trade_no_hash FROM koolo_ecpay_live_test_orders WHERE id=?").bind(row.id).first();
      const same=current?.trade_no_hash===await hash(c.merchant+":"+v.TradeNo);
      summary=same?"已付款，與通知一致":current?.trade_no_hash?"已付款，但交易編號不符":"綠界已付款，尚未收到有效通知；請人工核對，勿重複付款";
      }
     }
    }else if(resp.status===403)summary="綠界拒絕查詢（403），請隔至少 30 分鐘後再試";
   }catch{/* never disclose provider response or secrets */}
   await a.db.prepare("UPDATE koolo_ecpay_live_test_orders SET query_result=?,query_at=? WHERE id=? AND query_at=?").bind(summary,summary.includes("403")?t+1200:t,row.id,t).run();
   return new Response(null,{status:303,headers:{...headers,Location:PAGE+"?order="+row.id}});
  }
  return plain("Bad action",400);
 }catch{return html('<p>操作未完成，請回到驗證紀錄確認是否已建立訂單，勿連續重試。</p><a href="'+PAGE+'">返回驗證台</a>',503)}
}
export async function liveTestNotify({request,env}){
 const nack=s=>plain("0|FAIL",s),ack=()=>plain("1|OK");
 if(new URL(request.url).origin!==HOST||request.method!=="POST")return nack(404);
 const c=config(env);if(!c.ready)return nack(503);
 // Keep accepting already-created payments when the new-order switch is OFF.
 const v=await formFields(request);
 if(!await signed(v,c))return nack(403);
 if(v.MerchantID!==c.merchant||!/^KL[a-f0-9]{18}$/.test(v.MerchantTradeNo||"")||v.TradeAmt!==String(AMOUNT)||!/^Credit(?:_|$)/.test(v.PaymentType||"")||!/^[A-Za-z0-9]{1,20}$/.test(v.TradeNo||""))return nack(422);
 try{
  const db=env.CREW_AUTH_DB;
  const row=await db.prepare("SELECT id,paid_at,trade_no_hash FROM koolo_ecpay_live_test_orders WHERE merchant_trade_no=? AND amount_twd=10").bind(v.MerchantTradeNo).first();
  if(!row)return nack(404);
  if(v.RtnCode!=="1"||v.SimulatePaid==="1"){
   await db.prepare("UPDATE koolo_ecpay_live_test_orders SET callback_at=?,callback_result=? WHERE id=? AND paid_at IS NULL").bind(now(),v.SimulatePaid==="1"?"simulated":"failed",row.id).run();
   return ack();
  }
  if(v.SimulatePaid!=="0")return nack(422);
  const h=await hash(c.merchant+":"+v.TradeNo);
  if(row.paid_at)return row.trade_no_hash===h?ack():nack(409);
  const t=now();
  const result=await db.prepare("UPDATE koolo_ecpay_live_test_orders SET paid_at=?,callback_at=?,callback_result='paid',trade_no_hash=? WHERE id=? AND paid_at IS NULL").bind(t,t,h,row.id).run();
  if(result.meta?.changes===1)return ack();
  const current=await db.prepare("SELECT paid_at,trade_no_hash FROM koolo_ecpay_live_test_orders WHERE id=?").bind(row.id).first();
  return current?.paid_at&&current.trade_no_hash===h?ack():nack(409);
 }catch{return nack(503)}
}
