/**
 * Standalone Worker entry for the already-created crew-guest-trial Worker.
 * The public site and an explicitly allowlisted Access-protected preview are the
 * ONLY accepted browser origins. This adapter reuses the Pages handler's
 * same-origin security checks by creating a trusted internal Request.
 */
import {onRequestGet,onRequestPost} from "../../functions/api/guest/token.js";
import {onQaGet,onQaPost} from "../../functions/api/guest/qa.js";
const PRODUCTION="https://www.3sssi.com";
const HOST="crew-guest-trial.shanliyoung.workers.dev";
const PATH="/api/guest/token";
const QA_PATH="/api/guest/qa";
function allowedOrigin(request,env){
 const origin=request.headers.get("origin");
 if(origin===PRODUCTION)return origin;
 if(env.GUEST_ALLOW_PREVIEW!=="1"||!env.GUEST_PREVIEW_ORIGIN||origin!==env.GUEST_PREVIEW_ORIGIN)return null;
 try{
  const url=new URL(origin);
  return url.protocol==="https:"&&/^[a-z0-9-]+\.magic76-github-io\.pages\.dev$/.test(url.hostname)?origin:null;
 }catch{return null}
}
function response(body,status,origin){
 const headers={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"};
 if(origin){headers["access-control-allow-origin"]=origin;headers["vary"]="Origin";}
 return new Response(JSON.stringify(body),{status,headers});
}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  const isQA=url.pathname===QA_PATH;
  if(url.hostname!==HOST||(url.pathname!==PATH&&!isQA))return response({error:"Not found"},404);
  const origin=allowedOrigin(request,env);
  if(!origin||isQA&&origin===PRODUCTION)return response({error:"Origin rejected"},403);
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{
   "access-control-allow-origin":origin,"access-control-allow-methods":"GET, POST, OPTIONS",
   "access-control-allow-headers":"content-type,x-crew-qa-token","access-control-max-age":"600",
   "vary":"Origin","cache-control":"no-store"
  }});
  if(request.method!=="GET"&&request.method!=="POST")return response({error:"Method not allowed"},405,origin);
  // The external boundary is checked above. Preserve CF's client IP/UA
  // for quotas, but express the verified caller site in the internal Request.
  const internal=new Request(origin+url.pathname,request);
  internal.headers.set("origin",origin);
  internal.headers.delete("sec-fetch-site");
  const bindings={
   ...env,
   GUEST_TURNSTILE_SECRET:env.GUEST_TURNSTILE_SECRET||env.TURNSTILE_SECRET_KEY,
   GUEST_TURNSTILE_SITE_KEY:env.GUEST_TURNSTILE_SITE_KEY||"0x4AAAAAAFpJ8ljaQjJq_Aqy"
  };
  const result=isQA
   ?request.method==="GET"?await onQaGet({request:internal,env:bindings}):await onQaPost({request:internal,env:bindings})
   :request.method==="GET"?await onRequestGet({request:internal,env:bindings}):await onRequestPost({request:internal,env:bindings});
  const headers=new Headers(result.headers);
  headers.set("access-control-allow-origin",origin);
  headers.set("vary","Origin");
  headers.set("cache-control","no-store");
  return new Response(result.body,{status:result.status,headers});
 }
};
