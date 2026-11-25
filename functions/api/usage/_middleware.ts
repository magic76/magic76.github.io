import {verifyAccess} from "./report";
type Env=Parameters<typeof verifyAccess>[1];
/** Only the first-party event endpoint is filtered. Never trust a client admin flag.
 * Anonymous visits perform no auth DB read; authenticated traffic uses the existing verifier.
 */
export async function onRequest({request,env,next}:{request:Request;env:Env;next:()=>Promise<Response>}){
 const url=new URL(request.url);
 if(request.method==="POST"&&url.pathname==="/api/usage/event"){
  const cookie=request.headers.get("cookie")||"";
  if((/(?:^|;\s*)__Host-crew_session=/.test(cookie)||request.headers.has("cf-access-jwt-assertion"))&&await verifyAccess(request,env))
   return new Response(null,{status:204,headers:{"Cache-Control":"no-store"}});
 }
 return next();
}
