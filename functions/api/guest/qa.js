/**
 * Phase 1: short-lived private QA only, no DB.
 * Never reachable from the public production origin. Requires a protected
 * Cloudflare Pages preview, a 32+ character QA secret, Turnstile, an expiring
 * operator window, AND a Cloudflare Worker rate-limit binding.
 *
 * Rate-limit binding is best-effort per edge location, not a billing cap.
 */
import {mintToken,verifyCaptcha} from "./token.js";
const LIVE_MODEL="gemini-3.8-live";
const SESSION_SECONDS=180;
const json=(body,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}
});
function qaConfigured(env){
 const until=Date.parse(env.GUEST_QA_UNTIL||"");
 const now=Date.now();
 return env.GUEST_TRIAL_ENABLED!=="1"
  &&env.GUEST_QA_ENABLED==="1"
  &&typeof env.GUEST_QA_ACCESS_TOKEN==="string"&&env.GUEST_QA_ACCESS_TOKEN.length>=32
  &&typeof env.GEMINI_GUEST_API_KEY==="string"&&env.GEMINI_GUEST_API_KEY.length>10
  &&typeof env.GUEST_TURNSTILE_SECRET==="string"&&!!env.GUEST_TURNSTILE_SITE_KEY
  &&typeof env.GUEST_QA_RATE_LIMITER?.limit==="function"
  &&Number.isFinite(until)&&until>now&&until-now<=86400000;
}
async function authorized(request,env){
 const provided=request.headers.get("x-crew-qa-token")||"";
 if(provided.length<32||provided.length>256)return false;
 // Compare hashes to avoid exposing token length or timing.
 const encoder=new TextEncoder();
 const [a,b]=await Promise.all([
  crypto.subtle.digest("SHA-256",encoder.encode(provided)),
  crypto.subtle.digest("SHA-256",encoder.encode(env.GUEST_QA_ACCESS_TOKEN))
 ]);
 const left=new Uint8Array(a),right=new Uint8Array(b);
 let difference=0;
 for(let index=0;index<left.length;index++)difference|=left[index]^right[index];
 return difference===0;
}
async function gate(request,env){
 if(!qaConfigured(env))return json({enabled:false},503);
 if(!await authorized(request,env))return json({error:"Unauthorized"},403);
 return null;
}
export async function onQaGet({request,env}){
 const failure=await gate(request,env);
 return failure||json({enabled:true,siteKey:env.GUEST_TURNSTILE_SITE_KEY,seconds:SESSION_SECONDS,qa:true});
}
export async function onQaPost({request,env}){
 const failure=await gate(request,env);
 if(failure)return failure;
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type")||""))
  return json({error:"JSON required"},415);
 if(Number(request.headers.get("content-length")||"0")>4096)return json({error:"Request too large"},413);
 const ip=request.headers.get("cf-connecting-ip");
 if(!ip)return json({error:"Verification unavailable"},403);
 let input;
 try{
  const raw=await request.text();
  if(raw.length>4096)return json({error:"Request too large"},413);
  input=JSON.parse(raw);
 }catch{return json({error:"Invalid request"},400)}
 if(typeof input?.challengeToken!=="string"||input.challengeToken.length<10||input.challengeToken.length>2048)
  return json({error:"Verification required"},400);
 let valid=false;
 try{valid=await verifyCaptcha(input.challengeToken,ip,env.GUEST_TURNSTILE_SECRET,new URL(request.url).hostname)}
 catch{return json({error:"Verification unavailable"},503)}
 if(!valid)return json({error:"Verification failed"},403);
 try{
  const limit=await env.GUEST_QA_RATE_LIMITER.limit({key:"crew-private-qa-global"});
  if(limit?.success!==true)return json({error:"Private QA rate limit reached",code:"QA_LIMIT"},429);
 }catch{return json({error:"Private QA limiter unavailable"},503)}
 try{
  const issuedAt=Date.now();
  const token=await mintToken(env.GEMINI_GUEST_API_KEY,issuedAt);
  return json({token,model:LIVE_MODEL,seconds:SESSION_SECONDS,
   issuedAt:new Date(issuedAt).toISOString(),expiresAt:new Date(issuedAt+200000).toISOString()});
 }catch{return json({error:"Trial temporarily unavailable"},503)}
}
