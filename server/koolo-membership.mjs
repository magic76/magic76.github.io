/** Read-only, fail-closed membership projection. Payment writes are intentionally absent. */
const ORIGINS=new Set(["https://koolo.app","https://www.3sssi.com"]);
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","Vary":"Cookie"}});
const planConfig=Object.freeze({free:{voiceSeconds:0},plus:{voiceSeconds:0},pro:{voiceSeconds:0}});
export async function membershipInfo({request,env}){
 if(!ORIGINS.has(new URL(request.url).origin))return reply({error:"Not found"},404);
 if(!env?.CREW_AUTH_DB)return reply({error:"Unavailable"},503);
 const raw=(request.headers.get("Cookie")||"").split(";").map(s=>s.trim()).find(s=>s.startsWith("__Host-crew_session="))?.slice(20)||"";
 if(!/^[A-Za-z0-9_-]{43}$/.test(raw))return reply({authenticated:false},401);
 const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));
 const digest=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
 try{
  const now=Math.floor(Date.now()/1000);
  const session=await env.CREW_AUTH_DB.prepare("SELECT user_id FROM crew_auth_sessions WHERE token_hash=? AND expires_at>?").bind(digest,now).first();
  if(!session?.user_id)return reply({authenticated:false},401);
  const membership=await env.CREW_AUTH_DB.prepare("SELECT plan,status,current_period_end FROM koolo_memberships WHERE user_id=?").bind(session.user_id).first();
  const valid=membership&&["active","trialing","grace"].includes(membership.status)&&Number(membership.current_period_end)>now&&["plus","pro"].includes(membership.plan);
  const plan=valid?membership.plan:"free";
  return reply({authenticated:true,plan,status:valid?membership.status:"inactive",currentPeriodEnd:valid?membership.current_period_end:null,limits:planConfig[plan]});
 }catch{return reply({error:"Membership unavailable"},503)}
}
