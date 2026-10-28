/**
 * Crew guest Live trial — disabled unless explicitly provisioned.
 * Secrets, quota reservation and Turnstile verification are server-side only.
 * One three-minute Live session per salted device/network fingerprint per 30 days.
 * Budget is a conservative daily session reservation, NOT exact Gemini billing.
 */
const json=(value,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}
});
const LIVE_MODEL="gemini-3.8-live";
const SESSION_SECONDS=180;
const ROLLING_DAYS=30;
const previewHost=/^[a-z0-9-]+\.magic76-github-io\.pages\.dev$/;
function validHost(url,env){
 if(url.hostname==="www.3sssi.com")return true;
 return env.GUEST_ALLOW_PREVIEW==="1"&&previewHost.test(url.hostname);
}
function configured(env){
 return env.GUEST_TRIAL_ENABLED==="1"&&!!env.GEMINI_GUEST_API_KEY
  &&!!env.GUEST_TURNSTILE_SITE_KEY&&!!env.GUEST_TURNSTILE_SECRET
  &&!!env.GUEST_HASH_SALT&&!!env.GUEST_DB
  &&Number.isInteger(Number(env.GUEST_DAILY_SESSION_LIMIT))
  &&Number(env.GUEST_DAILY_SESSION_LIMIT)>0
  &&Number(env.GUEST_DAILY_SESSION_LIMIT)<=1000;
}
function validOrigin(request,url){
 const origin=request.headers.get("origin");
 return origin===url.origin&&request.headers.get("sec-fetch-site")!=="cross-site";
}
function disabled(){return json({enabled:false},200);}
export async function onRequestGet({request,env}){
 const url=new URL(request.url);
 if(!validHost(url,env)||!configured(env))return disabled();
 return json({enabled:true,siteKey:env.GUEST_TURNSTILE_SITE_KEY,seconds:SESSION_SECONDS});
}
async function fingerprint(ip,agent,salt){
 const bytes=new TextEncoder().encode(salt+"|"+ip+"|"+agent.slice(0,256));
 const digest=await crypto.subtle.digest("SHA-256",bytes);
 return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,"0")).join("");
}
async function verifyCaptcha(token,ip,secret,hostname){
 const body=new URLSearchParams({secret,response:token,remoteip:ip});
 const response=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
  method:"POST",body,signal:AbortSignal.timeout(8000)
 });
 if(!response.ok)return false;
 const result=await response.json();
 return result.success===true&&result.hostname===hostname;
}
async function mintToken(key,now){
 const body={
  uses:1,
  expireTime:new Date(now+200000).toISOString(),
  newSessionExpireTime:new Date(now+45000).toISOString(),
  liveConnectConstraints:{model:"models/"+LIVE_MODEL,config:{responseModalities:["AUDIO"]}}
 };
 const response=await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens",{
  method:"POST",headers:{"x-goog-api-key":key,"content-type":"application/json"},
  body:JSON.stringify(body),signal:AbortSignal.timeout(10000)
 });
 if(!response.ok)throw new Error("Gemini provisioning failed");
 const result=await response.json();
 if(typeof result.name!=="string"||result.name.length<12)throw new Error("Gemini token missing");
 return result.name;
}
export async function onRequestPost({request,env}){
 const url=new URL(request.url);
 if(!validHost(url,env))return json({error:"Not found"},404);
 if(!configured(env))return json({error:"Guest trial unavailable"},503);
 if(!validOrigin(request,url))return json({error:"Origin rejected"},403);
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type")||""))
  return json({error:"JSON required"},415);
 if(Number(request.headers.get("content-length")||"0")>4096)
  return json({error:"Request too large"},413);
 const ip=request.headers.get("cf-connecting-ip");
 const agent=request.headers.get("user-agent")||"";
 if(!ip||!agent)return json({error:"Verification unavailable"},403);
 let input;
 try {
  const raw=await request.text();
  if(raw.length>4096)return json({error:"Request too large"},413);
  input=JSON.parse(raw);
 }catch{return json({error:"Invalid request"},400)}
 if(!input||typeof input.challengeToken!=="string"||input.challengeToken.length<10
    ||input.challengeToken.length>2048)return json({error:"Verification required"},400);
 try{
  if(!await verifyCaptcha(input.challengeToken,ip,env.GUEST_TURNSTILE_SECRET,url.hostname))
   return json({error:"Verification failed"},403);
 }catch{return json({error:"Verification temporarily unavailable"},503)}
 const now=Date.now(), day=new Date(now).toISOString().slice(0,10);
 const hash=await fingerprint(ip,agent,env.GUEST_HASH_SALT);
 let claimed=false, reserved=false, minted=false;
 const db=env.GUEST_DB;
 try{
  // D1 uniqueness protects against concurrent tabs; no raw IP or User-Agent stored.
  await db.prepare("DELETE FROM guest_trial_claims WHERE expires_at <= ?").bind(now).run();
  const claim=await db.prepare(
   "INSERT OR IGNORE INTO guest_trial_claims (fingerprint,claimed_at,expires_at) VALUES (?,?,?)"
  ).bind(hash,now,now+ROLLING_DAYS*86400000).run();
  if(claim.meta?.changes!==1)return json({error:"Trial already used",code:"ALREADY_USED"},429);
  claimed=true;
  await db.prepare(
   "INSERT OR IGNORE INTO guest_daily_quota (day,used) VALUES (?,0)"
  ).bind(day).run();
  // Single conditional UPDATE is atomic, even when several requests race.
  const quota=await db.prepare(
   "UPDATE guest_daily_quota SET used=used+1 WHERE day=? AND used < ?"
  ).bind(day,Number(env.GUEST_DAILY_SESSION_LIMIT)).run();
  if(quota.meta?.changes!==1)return json({error:"Today's trial capacity reached",code:"DAILY_LIMIT"},429);
  reserved=true;
  const issuedAt=Date.now();
  const token=await mintToken(env.GEMINI_GUEST_API_KEY,issuedAt);
  minted=true;
  return json({token,model:LIVE_MODEL,seconds:SESSION_SECONDS,issuedAt:new Date(issuedAt).toISOString(),expiresAt:new Date(issuedAt+200000).toISOString()});
 }catch{
  return json({error:"Trial temporarily unavailable"},503);
 }finally{
  // Fail closed if reservation cleanup fails. Never return a token when quota failed.
  if(claimed&&!minted){
   try{await db.prepare("DELETE FROM guest_trial_claims WHERE fingerprint=?").bind(hash).run()}catch{}
  }
  if(reserved&&!minted){
   try{await db.prepare("UPDATE guest_daily_quota SET used=MAX(0,used-1) WHERE day=?").bind(day).run()}catch{}
  }
 }
}
export async function onRequest(){return json({error:"Method not allowed"},405)}

// Shared primitives for the isolated, secret-protected Phase 1 QA endpoint.
export {mintToken,verifyCaptcha};
