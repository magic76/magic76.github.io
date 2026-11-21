/** Read-only voice credit wallet. No purchase, grant, reserve or deduct mutations. */
const ALLOWED_ORIGINS=new Set(["https://koolo.app","https://www.3sssi.com"]);
const COOKIE_NAME="__Host-crew_session";
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{
 "Content-Type":"application/json; charset=utf-8",
 "Cache-Control":"private, no-store","Pragma":"no-cache","Vary":"Cookie",
 "Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"
}});
const validSeconds=value=>Number.isSafeInteger(value)&&value>=0?value:null;
async function authenticatedOwner({request,env}){
 let origin;try{origin=new URL(request.url).origin}catch{return {error:reply({error:"NOT_FOUND"},404)}}
 if(!ALLOWED_ORIGINS.has(origin))return {error:reply({error:"NOT_FOUND"},404)};
 if(request.method!=="GET")return {error:reply({error:"METHOD_NOT_ALLOWED"},405)};
 if(!env?.CREW_AUTH_DB)return {error:reply({error:"WALLET_UNAVAILABLE"},503)};
 const cookiePrefix=COOKIE_NAME+"=";
 const raw=(request.headers.get("Cookie")||"").split(";").map(part=>part.trim())
  .find(part=>part.startsWith(cookiePrefix))?.slice(cookiePrefix.length)||"";
 if(!/^[A-Za-z0-9_-]{43}$/.test(raw))return {error:reply({error:"LOGIN_REQUIRED"},401)};
 try{
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));
  const digest=[...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
  const session=await env.CREW_AUTH_DB.prepare(
   "SELECT user_id FROM crew_auth_sessions WHERE token_hash=? AND expires_at>?"
  ).bind(digest,Math.floor(Date.now()/1000)).first();
  if(typeof session?.user_id!=="string")return {error:reply({error:"LOGIN_REQUIRED"},401)};
  return {db:env.CREW_AUTH_DB,userId:session.user_id};
 }catch{return {error:reply({error:"WALLET_UNAVAILABLE"},503)}}
}
function parseEntry(r){
 if(!["topup","reserve","consume","release","refund","adjustment"].includes(r.event_type))return null;
 const available=Number(r.delta_available_seconds),reserved=Number(r.delta_reserved_seconds),created=Number(r.created_at);
 if(!Number.isSafeInteger(available)||!Number.isSafeInteger(reserved)||validSeconds(created)===null)return null;
 return {id:String(r.id),type:r.event_type,deltaAvailableSeconds:available,
  deltaReservedSeconds:reserved,createdAt:created};
}
export async function voiceCreditStatus(context){
 const auth=await authenticatedOwner(context);if(auth.error)return auth.error;
 try{
  // Both reads must succeed, including empty ledgers: missing 0008 schema is
  // a 503 and MUST NOT masquerade as a zero-balance paid wallet.
  const wallet=await auth.db.prepare(
   "SELECT available_seconds,reserved_seconds,updated_at FROM koolo_voice_wallets WHERE user_id=?"
  ).bind(auth.userId).first();
  const events=await auth.db.prepare(
   "SELECT id,event_type,delta_available_seconds,delta_reserved_seconds,created_at "+
   "FROM koolo_voice_credit_ledger WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 30"
  ).bind(auth.userId).all();
  const available=wallet?validSeconds(Number(wallet.available_seconds)):0;
  const reserved=wallet?validSeconds(Number(wallet.reserved_seconds)):0;
  if(available===null||reserved===null||!Number.isSafeInteger(available+reserved)||!Array.isArray(events?.results))return reply({error:"WALLET_UNAVAILABLE"},503);
  const history=events.results.map(parseEntry);
  if(history.some(entry=>!entry))return reply({error:"WALLET_UNAVAILABLE"},503);
  return reply({unit:"seconds",availableSeconds:available,reservedSeconds:reserved,
   totalSeconds:available+reserved,topupsEnabled:false,paidVoiceEnabled:false,
   history});
 }catch{return reply({error:"WALLET_UNAVAILABLE"},503)}
}
