/** Crew guest Live trial. All long-lived credentials stay on the Worker. */
const json=(value,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}
});
const LIVE_MODEL="gemini-3.8-live";
const SESSION_SECONDS=60;
const ROLLING_DAYS=30;
const previewHost=/^[a-z0-9-]+\.magic76-github-io\.pages\.dev$/;
const MAX_GEMINI_KEYS=20;
// Accept one/multiple keys as comma/newline text, JSON array/string or {keys:[...]}.
// Fail closed on invalid multi-key settings even when the legacy secret exists.
function parseGuestGeminiKeyList(raw){
 let parsed=raw;
 if(typeof raw==="string"){
  if(raw.length>16000)return {keys:[],problem:"too_large"};
  const value=raw.trim();
  if(!value)return {keys:[],problem:"empty"};
  if(value.startsWith("[")||value.startsWith("{")||value.startsWith('"')){
   try{parsed=JSON.parse(value)}catch{return {keys:[],problem:"malformed_json"}}
  }else parsed=value;
 }
 // Cloudflare JSON bindings may be arrays/objects, not strings.
 // Also support quoted JSON text without logging its contents.
 if(typeof parsed==="string"){
  const value=parsed.trim();
  if(value.startsWith("[")||value.startsWith("{")){
   try{parsed=JSON.parse(value)}catch{return {keys:[],problem:"malformed_json"}}
  }else parsed=value.split(/[,\r\n]/).map(key=>key.trim());
 }
 if(parsed!==null&&typeof parsed==="object"&&!Array.isArray(parsed)){
  if(Object.keys(parsed).length!==1||!Object.prototype.hasOwnProperty.call(parsed,"keys"))
   return {keys:[],problem:"unsupported_shape"};
  parsed=parsed.keys;
 }
 if(!Array.isArray(parsed))return {keys:[],problem:"unsupported_type"};
 if(parsed.length<1||parsed.length>MAX_GEMINI_KEYS)return {keys:[],problem:"invalid_count"};
 const keys=[];
 for(const value of parsed){
  if(typeof value!=="string"||!/^[A-Za-z0-9_-]{12,512}$/.test(value.trim()))
   return {keys:[],problem:"invalid_key_entry"};
  keys.push(value.trim());
 }
 return {keys:[...new Set(keys)],problem:null};
}
function guestGeminiKeys(env){
 if(Object.prototype.hasOwnProperty.call(env,"GEMINI_GUEST_API_KEYS"))
  return parseGuestGeminiKeyList(env.GEMINI_GUEST_API_KEYS).keys;
 const old=env.GEMINI_GUEST_API_KEY;
 return typeof old==="string"&&old.trim().length>=12?[old.trim()]:[];
}
function selectGuestGeminiKey(env){
 const keys=guestGeminiKeys(env);
 if(keys.length===1)return keys[0];
 if(keys.length<1)throw new Error("Guest credential not configured");
 const value=new Uint32Array(1);
 crypto.getRandomValues(value);
 return keys[value[0]%keys.length];
}
function validHost(url,env){
 if(url.hostname==="www.3sssi.com")return true;
 return env.GUEST_ALLOW_PREVIEW==="1"&&previewHost.test(url.hostname);
}
// Give operators a stable, non-sensitive failure reason in private Worker logs.
// Do not expose binding state or credential metadata to browser responses.
function guestTrialConfigurationIssue(env){
 if(env.GUEST_TRIAL_ENABLED!=="1")return "trial_disabled";
 if(!guestGeminiKeys(env).length)return Object.prototype.hasOwnProperty.call(env,"GEMINI_GUEST_API_KEYS")
  ?"gemini_keys_invalid":"gemini_key_missing";
 if(!env.GUEST_TURNSTILE_SITE_KEY)return "turnstile_site_key_missing";
 if(!env.GUEST_TURNSTILE_SECRET)return "turnstile_secret_missing";
 // Phase 1: require per-edge rate limiting even without a database.
 if(!env.GUEST_DB)return typeof env.GUEST_TRIAL_RATE_LIMITER?.limit==="function"
  ?null:"rate_limiter_binding_missing";
 // Phase 2: D1 atomic daily limit and salted device/network claim.
 if(!env.GUEST_HASH_SALT)return "d1_hash_salt_missing";
 const limit=Number(env.GUEST_DAILY_SESSION_LIMIT);
 return Number.isInteger(limit)&&limit>0&&limit<=1000?null:"d1_daily_limit_invalid";
}
function configured(env){return guestTrialConfigurationIssue(env)===null;}
function validOrigin(request,url){
 const origin=request.headers.get("origin");
 return origin===url.origin&&request.headers.get("sec-fetch-site")!=="cross-site";
}
function disabled(){return json({enabled:false},200);}
export async function onRequestGet({request,env}){
 const url=new URL(request.url);
 if(!validHost(url,env))return disabled();
 const issue=guestTrialConfigurationIssue(env);
 if(issue){
  // Stable private diagnostic codes only: never include credential values or lengths.
  const detail=issue==="gemini_keys_invalid"
   ?parseGuestGeminiKeyList(env.GEMINI_GUEST_API_KEYS).problem:null;
  console.warn("crew_guest_trial_configuration",{state:"unavailable",reason:issue,...(detail?{detail}:{})});
  return disabled();
 }
 return json({enabled:true,siteKey:env.GUEST_TURNSTILE_SITE_KEY,seconds:SESSION_SECONDS});
}
async function fingerprint(ip,agent,salt){
 const bytes=new TextEncoder().encode(salt+"|"+ip+"|"+agent.slice(0,256));
 const digest=await crypto.subtle.digest("SHA-256",bytes);
 return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,"0")).join("");
}
async function verifyCaptcha(token,ip,secret,hostname,action="crew-guest-trial"){
 const body=new URLSearchParams({secret,response:token,remoteip:ip});
 const response=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
  method:"POST",body,signal:AbortSignal.timeout(8000)
 });
 if(!response.ok)throw new Error("Turnstile service unavailable");
 const result=await response.json();
 return result.success===true&&result.hostname===hostname&&result.action===action;
}
async function mintToken(key,now){
 const body={
  uses:1,
  expireTime:new Date(now+70000).toISOString(),
  newSessionExpireTime:new Date(now+30000).toISOString(),
  // Official AuthToken wire fields. Mask only these fields: client owns role, voice
  // and transcription, but cannot select a different model or paid tools.
  bidiGenerateContentSetup:{
   model:"models/"+LIVE_MODEL,
   generationConfig:{responseModalities:["AUDIO"]},
   tools:[]
  },
  fieldMask:"model,generationConfig.responseModalities,tools"
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
 // Phase 1 has no globally durable per-person/session quota. Fail closed when
 // the Cloudflare per-colo limiter is missing; never claim USD hard caps.
 if(!env.GUEST_DB){
  try{
   const limit=await env.GUEST_TRIAL_RATE_LIMITER.limit({key:"crew-public-guest"});
   if(limit?.success!==true)return json({error:"Guest trial busy",code:"DAILY_LIMIT"},429);
  }catch{return json({error:"Guest limiter unavailable"},503)}
  try{
   const issuedAt=Date.now();
   const token=await mintToken(selectGuestGeminiKey(env),issuedAt);
   return json({token,model:LIVE_MODEL,seconds:SESSION_SECONDS,
    issuedAt:new Date(issuedAt).toISOString(),expiresAt:new Date(issuedAt+70000).toISOString()});
  }catch{return json({error:"Guest trial temporarily unavailable"},503)}
 }
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
  const token=await mintToken(selectGuestGeminiKey(env),issuedAt);
  minted=true;
  return json({token,model:LIVE_MODEL,seconds:SESSION_SECONDS,issuedAt:new Date(issuedAt).toISOString(),expiresAt:new Date(issuedAt+70000).toISOString()});
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
