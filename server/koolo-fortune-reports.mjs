/** Read-only paid report bookshelf. No checkout/payment mutations are exposed. */
const ORIGINS=new Set(["https://koolo.app","https://www.3sssi.com"]);
const SESSION="__Host-crew_session";
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{
 "Content-Type":"application/json; charset=utf-8","Cache-Control":"private, no-store",
 "Pragma":"no-cache","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff","Vary":"Cookie"
}});
const hash=async token=>{
 const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
 return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,"0")).join("");
};
async function owner({request,env}){
 let origin;try{origin=new URL(request.url).origin}catch{return {error:response({error:"NOT_FOUND"},404)}}
 if(!ORIGINS.has(origin))return {error:response({error:"NOT_FOUND"},404)};
 if(!env?.CREW_AUTH_DB)return {error:response({error:"REPORTS_UNAVAILABLE"},503)};
 const prefix=SESSION+"=";
 const token=(request.headers.get("Cookie")||"").split(";").map(v=>v.trim()).find(v=>v.startsWith(prefix))?.slice(prefix.length)||"";
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))return {error:response({error:"LOGIN_REQUIRED"},401)};
 try{
  const user=await env.CREW_AUTH_DB.prepare("SELECT user_id FROM crew_auth_sessions WHERE token_hash=? AND expires_at>?")
   .bind(await hash(token),Math.floor(Date.now()/1000)).first();
  if(typeof user?.user_id!=="string")return {error:response({error:"LOGIN_REQUIRED"},401)};
  return {db:env.CREW_AUTH_DB,userId:user.user_id};
 }catch{return {error:response({error:"REPORTS_UNAVAILABLE"},503)}}
}
/** A completed report must be an immutable structured snapshot of plain text. */
export function safeReportContent(raw){
 if(typeof raw!=="string"||raw.length>131072)return null;
 let value;try{value=JSON.parse(raw)}catch{return null}
 if(!value||typeof value!=="object"||!Array.isArray(value.sections)||value.sections.length<1||value.sections.length>20)return null;
 const sections=[];
 for(const part of value.sections){
  if(!part||typeof part!=="object"||typeof part.title!=="string"||typeof part.body!=="string"||
   part.title.length<1||part.title.length>120||part.body.length<1||part.body.length>10000)return null;
  sections.push({title:part.title,body:part.body});
 }
 return {sections};
}
export async function listFortuneReports(context){
 const auth=await owner(context);if(auth.error)return auth.error;
 try{
  const result=await auth.db.prepare(
   "SELECT r.id,r.mode,r.title,r.status,r.version,r.created_at,r.updated_at "+
   "FROM koolo_fortune_reports r JOIN koolo_fortune_orders o ON o.id=r.order_id AND o.user_id=r.user_id "+
   "WHERE r.user_id=? AND o.status='paid' AND r.status IN ('ready','generating','failed') "+
   "ORDER BY r.created_at DESC LIMIT 100"
  ).bind(auth.userId).all();
  return response({items:(result.results||[]).map(r=>({
   id:String(r.id),mode:String(r.mode),title:String(r.title),status:String(r.status),
   version:String(r.version),createdAt:Number(r.created_at),updatedAt:Number(r.updated_at)
  }))});
 }catch{return response({error:"REPORTS_UNAVAILABLE"},503)}
}
export async function readFortuneReport(context){
 const auth=await owner(context);if(auth.error)return auth.error;
 const id=context.params?.id;
 if(typeof id!=="string"||!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id))return response({error:"REPORT_NOT_FOUND"},404);
 try{
  const report=await auth.db.prepare(
   "SELECT r.id,r.mode,r.title,r.version,r.content_json,r.created_at "+
   "FROM koolo_fortune_reports r JOIN koolo_fortune_orders o ON o.id=r.order_id AND o.user_id=r.user_id "+
   "WHERE r.id=? AND r.user_id=? AND r.status='ready' AND o.status='paid' LIMIT 1"
  ).bind(id,auth.userId).first();
  if(!report)return response({error:"REPORT_NOT_FOUND"},404);
  const content=safeReportContent(report.content_json);
  if(!content)return response({error:"REPORTS_UNAVAILABLE"},503);
  return response({report:{id:String(report.id),mode:String(report.mode),title:String(report.title),
   version:String(report.version),createdAt:Number(report.created_at),sections:content.sections}});
 }catch{return response({error:"REPORTS_UNAVAILABLE"},503)}
}
