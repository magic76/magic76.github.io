/** Same-origin account proof for the isolated Gemini guest Worker. */
import{sessionInfo}from"../../../server/crew-auth.mjs";
import{createGuestTicket}from"../../../server/crew-guest-ticket.mjs";
const json=(value,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff"}
});
export async function onRequestPost({request,env}){
 const origin=new URL(request.url).origin;
 if(!["https://www.3sssi.com","https://koolo.app"].includes(origin))return json({error:"Not found"},404);
 if(request.headers.get("origin")!==origin||request.headers.get("sec-fetch-site")==="cross-site")
  return json({error:"Origin rejected"},403);
 if(typeof env?.CREW_GUEST_TICKET_SECRET!=="string"||env.CREW_GUEST_TICKET_SECRET.length<32||!env.CREW_AUTH_DB)
  return json({error:"Account trial unavailable"},503);
 const result=await sessionInfo({request,env});
 if(!result.ok)return json({error:"Account session unavailable"},503);
 const session=await result.json();
 if(!session?.user?.id)return json({error:"Sign-in required",code:"SIGNIN_REQUIRED"},401);
 try{
  const ticket=await createGuestTicket(session.user.id,env.CREW_GUEST_TICKET_SECRET);
  return json({ticket,expiresIn:90});
 }catch{return json({error:"Account trial unavailable"},503)}
}
export async function onRequest(){return json({error:"Method not allowed"},405)}
