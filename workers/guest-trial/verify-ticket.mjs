/** Short-lived human verification proof; never doubles as a quota or Live grant. */
const TTL=30*60*1000;
const hex=bytes=>Array.from(bytes,x=>x.toString(16).padStart(2,"0")).join("");
const digest=async value=>hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))));
const validTicket=value=>typeof value==="string"&&/^[0-9a-f]{64}$/.test(value);
export async function visitorHash(request,env){
 const ip=request.headers.get("cf-connecting-ip"),ua=request.headers.get("user-agent");
 if(!ip||!ua||!env.GUEST_TURNSTILE_SECRET)return null;
 return digest(env.GUEST_TURNSTILE_SECRET+"|"+ip+"|"+ua.slice(0,256));
}
/** A missing migration is an issuance failure, not a failure of a verified grant. */
export async function issue(request,env,visitor){
 try{
  const db=env.CREW_AUTH_DB;
  if(!db?.prepare)return null;
  const identity=visitor||await visitorHash(request,env);
  if(!identity)return null;
  const ticket=hex(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt=Date.now()+TTL;
  const inserted=await db.prepare("INSERT INTO crew_guest_verify_tickets (ticket_hash,visitor_hash,expires_at,voice_redeemed_at) VALUES (?,?,?,NULL)")
   .bind(await digest(ticket),identity,expiresAt).run();
  if(inserted?.meta?.changes!==1)return null;
  return {verifyTicket:ticket,verifyTicketExpiresAt:expiresAt};
 }catch{return null}
}
/** Unlimited text session renewals inside the 30-minute window; send quotas are unchanged. */
export async function text(request,env,visitor,ticket){
 if(!validTicket(ticket)||!visitor||!env.CREW_AUTH_DB?.prepare)return false;
 try{
  const result=await env.CREW_AUTH_DB.prepare("SELECT visitor_hash,expires_at FROM crew_guest_verify_tickets WHERE ticket_hash=?")
   .bind(await digest(ticket)).first();
  return result?.visitor_hash===visitor&&Number(result.expires_at)>Date.now();
 }catch{return false}
}
/** One atomic conditional UPDATE per voice grant; no rollback even on mint failure. */
export async function voice(request,env,ticket){
 if(!validTicket(ticket)||!env.CREW_AUTH_DB?.prepare)return false;
 try{
  const identity=await visitorHash(request,env);
  if(!identity)return false;
  const now=Date.now();
  const result=await env.CREW_AUTH_DB.prepare("UPDATE crew_guest_verify_tickets SET voice_redeemed_at=? WHERE ticket_hash=? AND visitor_hash=? AND expires_at>? AND voice_redeemed_at IS NULL")
   .bind(now,await digest(ticket),identity,now).run();
  return result?.meta?.changes===1;
 }catch{return false}
}
