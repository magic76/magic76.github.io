// Read-only member order view. No charges or entitlement mutations.
const ORIGINS=new Set(["https://koolo.app","https://www.3sssi.com"]);
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const STATES=new Set(["pending","paid","canceled","refunded","chargeback"]);
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"private, no-store","Vary":"Cookie","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"}});
const unavailable=()=>reply({error:"ORDERS_UNAVAILABLE"},503);
const sha=async s=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,"0")).join("");
export function deliveryState(r,source){
 if(r.status!=="paid")return "unavailable";
 if(source==="fortune"){
  if(r.report_status==="ready"&&UUID.test(r.report_id||""))return "ready";
  if(r.report_status==="generating")return "processing";
  if(r.report_status==="failed")return "failed";
 }else if(r.product_kind==="voice_pack"&&Number.isSafeInteger(r.credit_seconds)&&r.credit_seconds>0&&r.granted_seconds===r.credit_seconds)return "ready";
 return "review";
}
function project(r,source){
 if(!UUID.test(r.id||"")||!STATES.has(r.status)||!Number.isSafeInteger(r.amount_twd)||r.amount_twd<=0||
 !Number.isSafeInteger(r.created_at)||!Number.isSafeInteger(r.updated_at))return null;
 if(source==="fortune"&&(r.product_id!=="bazi-deep-v1"||r.amount_twd!==79))return null;
 if(source==="billing"&&!["fortune_report","voice_pack"].includes(r.product_kind))return null;
 if(r.status==="paid"&&(!Number.isSafeInteger(r.paid_at)||r.paid_at<=0))return null;
 const delivery=deliveryState(r,source);
 return {id:r.id,source,kind:source==="fortune"?"fortune_report":r.product_kind,legacy:source==="fortune",
  amountTwd:r.amount_twd,status:r.status,delivery,createdAt:r.created_at,updatedAt:r.updated_at,
  ...(source==="fortune"&&delivery==="ready"?{reportId:r.report_id}:{})};
}
export async function purchaseOrders({request,env}){
 if(!ORIGINS.has(new URL(request.url).origin))return reply({error:"NOT_FOUND"},404);
 if(request.method!=="GET")return reply({error:"METHOD_NOT_ALLOWED"},405);
 if(!env?.CREW_AUTH_DB)return unavailable();
 const prefix="__Host-crew_session=";
 const token=(request.headers.get("Cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(prefix))?.slice(prefix.length)||"";
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))return reply({error:"LOGIN_REQUIRED"},401);
 try{
  const db=env.CREW_AUTH_DB;
  const session=await db.prepare("SELECT user_id FROM crew_auth_sessions WHERE token_hash=? AND expires_at>?").bind(await sha(token),Math.floor(Date.now()/1000)).first();
  if(typeof session?.user_id!=="string")return reply({error:"LOGIN_REQUIRED"},401);
  const [f,b]=await Promise.all([
   db.prepare("SELECT o.id,o.product_id,o.amount_twd,o.status,o.created_at,o.updated_at,o.paid_at,r.id AS report_id,r.status AS report_status FROM koolo_fortune_orders o LEFT JOIN koolo_fortune_reports r ON r.order_id=o.id AND r.user_id=o.user_id WHERE o.user_id=? ORDER BY o.created_at DESC,o.id DESC LIMIT 50").bind(session.user_id).all(),
   db.prepare("SELECT o.id,o.product_kind,o.amount_twd,o.status,o.created_at,o.updated_at,o.paid_at,o.credit_seconds,l.delta_available_seconds AS granted_seconds FROM koolo_billing_orders o LEFT JOIN koolo_voice_credit_ledger l ON l.user_id=o.user_id AND l.source_type='billing_order' AND l.source_id=o.id AND l.event_type='topup' WHERE o.user_id=? ORDER BY o.created_at DESC,o.id DESC LIMIT 50").bind(session.user_id).all()
  ]);
  if(!Array.isArray(f.results)||!Array.isArray(b.results))return unavailable();
  const orders=[...f.results.map(x=>project(x,"fortune")),...b.results.map(x=>project(x,"billing"))];
  if(orders.some(x=>!x))return unavailable();
  orders.sort((a,b)=>b.createdAt-a.createdAt||a.id.localeCompare(b.id));
  return reply({orders:orders.slice(0,50),checkoutEnabled:false});
 }catch{return unavailable()}
}
