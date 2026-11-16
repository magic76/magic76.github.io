/** Build trigger 2026-10-30: verify separate crew-guest-trial TTS Worker deployment. */
/** Public five-minute Guest Trial Worker. Legacy private QA endpoint retired. */
import {onRequestGet,onRequestPost,selectGuestGeminiKey,verifyCaptcha} from "../../functions/api/guest/token.js";
import {onTextRequest} from "./text-chat.mjs";
import {pollVideoTtsQueue,videoTtsResult} from "./video-tts.mjs";
const ORIGIN="https://www.3sssi.com", NEW_ORIGIN="https://koolo.app", HOSTS=new Set(["crew-guest-trial.shanliyoung.workers.dev","p.koolo.app"]), PATH="/api/guest/token", TEXT_PATH="/api/guest/text";
function response(body,status=200,origin){
 const headers={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"};
 if(origin){headers["access-control-allow-origin"]=origin;headers["vary"]="Origin"}
 return new Response(JSON.stringify(body),{status,headers});
}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.protocol!=="https:"||!HOSTS.has(url.hostname))return response({error:"Not found"},404);
  if(url.pathname==="/api/video/tts/result"){
   if(request.method!=="GET")return response({error:"Method not allowed"},405);
   return videoTtsResult(request,env);
  }
  if(url.pathname!==PATH&&url.pathname!==TEXT_PATH)return response({error:"Not found"},404);
  const origin=request.headers.get("origin");
  if(origin!==ORIGIN&&origin!==NEW_ORIGIN)return response({error:"Origin rejected"},403);
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{
   "access-control-allow-origin":origin,"access-control-allow-methods":"GET, POST, OPTIONS",
   "access-control-allow-headers":"content-type","access-control-max-age":"600",
   "vary":"Origin","cache-control":"no-store"
  }});
  if(request.method!=="GET"&&request.method!=="POST")return response({error:"Method not allowed"},405,origin);
  const internal=new Request(origin+url.pathname,request);
  internal.headers.set("origin",origin);
  internal.headers.delete("sec-fetch-site");
  const bindings={...env,
   GUEST_TURNSTILE_SECRET:env.GUEST_TURNSTILE_SECRET||env.TURNSTILE_SECRET_KEY,
   GUEST_TURNSTILE_SITE_KEY:env.GUEST_TURNSTILE_SITE_KEY||"0x4AAAAAAFpJ8ljaQjJq_Aqy"};
  const result=url.pathname===TEXT_PATH
   ?await onTextRequest(internal,bindings,{verifyCaptcha,selectGuestGeminiKey})
   :request.method==="GET"
    ?await onRequestGet({request:internal,env:bindings})
    :await onRequestPost({request:internal,env:bindings});
  const headers=new Headers(result.headers);
  headers.set("access-control-allow-origin",origin);
  headers.set("vary","Origin");
  headers.set("cache-control","no-store");
  return new Response(result.body,{status:result.status,headers});
 },
 async scheduled(_controller,env){
  // Fail closed: never interfere with existing guest Live Token requests.
  try{await pollVideoTtsQueue(env,{pickKey:selectGuestGeminiKey})}
  catch{console.warn("crew_video_tts_poll_unavailable")}
 }
};
