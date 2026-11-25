import {appendLearningFeedbackTool} from "../../../web-spa/src/live/learningFeedback.mjs";
/** Crew guest Live trial. All long-lived credentials stay on the Worker. */
import {quotaV2,readFreeQuotaPolicy,freeQuotaDay,reserveVoiceCapacity,releaseVoiceCapacity,reserveGuestVoice,releaseGuestVoice} from "../../../server/free-quota.mjs";
const json=(value,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}
});
const LIVE_MODEL="gemini-3.8-live";
const SESSION_SECONDS=300;
const MEMBER_TRIAL_LIMIT=3;
// Asia/Taipei is UTC+08:00 year-round; use server time, never browser time.
const TAIPEI_OFFSET_SECONDS=8*3600;
const taipeiDayStart=now=>Math.floor((now+TAIPEI_OFFSET_SECONDS)/86400)*86400-TAIPEI_OFFSET_SECONDS;
const ROLLING_DAYS=30;
const previewHost=/^[a-z0-9-]+\.magic76-github-io\.pages\.dev$/;
const MAX_GEMINI_KEYS=20;
const MEMBER_SIGNIN_FLAG="GUEST_REQUIRE_SIGNIN",MEMBER_METER_FLAG="GUEST_ACCOUNT_METER_ENABLED";
const memberMeterEnabled=env=>env[MEMBER_SIGNIN_FLAG]==="1"||env[MEMBER_METER_FLAG]==="1";
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
  // Use the same per-key validation as legacy GEMINI_GUEST_API_KEY.
  // Gemini credentials can contain punctuation (for example, a period).
  if(!validGuestGeminiKey(value))return {keys:[],problem:"invalid_key_entry"};
  keys.push(value.trim());
 }
 return {keys:[...new Set(keys)],problem:null};
}
function validGuestGeminiKey(value){
 return typeof value==="string"&&value.trim().length>=12;
}
function guestGeminiKeys(env){
 if(Object.prototype.hasOwnProperty.call(env,"GEMINI_GUEST_API_KEYS"))
  return parseGuestGeminiKeyList(env.GEMINI_GUEST_API_KEYS).keys;
 const old=env.GEMINI_GUEST_API_KEY;
 return validGuestGeminiKey(old)?[old.trim()]:[];
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
 if(url.hostname==="www.3sssi.com"||url.hostname==="koolo.app")return true;
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
 for(const name of [MEMBER_SIGNIN_FLAG,MEMBER_METER_FLAG]){
  if(env[name]!==undefined&&!["0","1"].includes(env[name]))return "signin_flag_invalid";
 }
 if(quotaV2(env)&&(!memberMeterEnabled(env)||!env.CREW_AUTH_DB?.prepare))return "member_quota_binding_missing";
 if(memberMeterEnabled(env)){
  if(!env.CREW_AUTH_DB||typeof env.CREW_GUEST_TICKET_SECRET!=="string"||env.CREW_GUEST_TICKET_SECRET.length<32)
   return "member_quota_binding_missing";
  return typeof env.GUEST_TRIAL_RATE_LIMITER?.limit==="function"?null:"rate_limiter_binding_missing";
 }
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
 const config={enabled:true,siteKey:env.GUEST_TURNSTILE_SITE_KEY,seconds:SESSION_SECONDS,
  ...(env[MEMBER_SIGNIN_FLAG]==="1"?{signinRequired:true}:{}),
  ...(memberMeterEnabled(env)?{memberMetering:true}:{})};
 if(quotaV2(env)){
  try{
   const policy=await readFreeQuotaPolicy(env);
   if(!policy.enabled)return disabled();
   const ip=request.headers.get("cf-connecting-ip"),agent=request.headers.get("user-agent");
   if(env[MEMBER_SIGNIN_FLAG]!=="1"&&ip&&agent){
    const hash=await fingerprint(ip,agent,env.GUEST_TURNSTILE_SECRET);
    const claim=await env.CREW_AUTH_DB.prepare("SELECT used FROM crew_guest_voice_usage WHERE visitor_hash=? AND day=?").bind(hash,freeQuotaDay()).first();
    return json({...config,dailyQuota:true,trial:{used:Math.min(1,Number(claim?.used)||0),limit:1}});
   }
   return json({...config,dailyQuota:true});
  }catch{return disabled()}
 }
 // Anonymous D1 claims are one use per rolling window. Never guess when the
 // store is unavailable or reveal fingerprints or overall worker capacity.
 if(env[MEMBER_SIGNIN_FLAG]!=="1"&&env.GUEST_DB&&env.GUEST_HASH_SALT){
  const ip=request.headers.get("cf-connecting-ip"),agent=request.headers.get("user-agent");
  if(ip&&agent){
   try{
    const hash=await fingerprint(ip,agent,env.GUEST_HASH_SALT);
    const claim=await env.GUEST_DB.prepare("SELECT 1 AS used FROM guest_trial_claims WHERE fingerprint=? AND expires_at>? LIMIT 1").bind(hash,Date.now()).first();
    return json({...config,trial:{used:claim?1:0,limit:1}});
   }catch{/* Do not show fabricated remaining quota on D1 errors. */}
  }
 }
 return json(config);
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
// Server-owned, fixed local-only tool. Never accept a client-supplied declaration.
export const GUEST_FRIEND_MEMORY_TOOLS=[{functionDeclarations:[{
 name:"save_friend_memory",
 description:"Quietly propose useful, non-sensitive conversation topics explicitly stated by the real user. Copy exact user evidence, never assistant speech or roleplay. Reuse stable topic keys. Skip greetings, identifiers, contact details, precise location, health, religion, politics, sexuality and secrets. Continue the normal spoken reply; never announce this tool.",
 parameters:{type:"OBJECT",properties:{topics:{type:"ARRAY",items:{type:"OBJECT",properties:{
  key:{type:"STRING"},title:{type:"STRING"},summary:{type:"STRING"},followUp:{type:"STRING"},evidence:{type:"STRING"}
 },required:["key","title","summary","evidence"]}}},required:["topics"]}
}]}];
function guestFriendMemoryRequested(input,env){
 return env.GUEST_FRIEND_MEMORY_ENABLED!=="0"&&input?.role==="friend"&&input?.friendMemory===true;
}
function guestLearningFeedbackRequested(input,env){
 return env.GUEST_LEARNING_FEEDBACK_ENABLED!=="0"&&["friend","teacher"].includes(input?.role)&&input?.learningFeedback===true;
}
async function mintToken(key,now,friendMemory=false,learningFeedback=false){
 const body={
  uses:1,
  expireTime:new Date(now+310000).toISOString(),
  newSessionExpireTime:new Date(now+30000).toISOString(),
  // Official AuthToken wire fields. Mask only these fields: client owns role, voice
  // and transcription, but cannot select a different model or paid tools.
  bidiGenerateContentSetup:{
   model:"models/"+LIVE_MODEL,
   generationConfig:{responseModalities:["AUDIO"]},
   tools:learningFeedback?appendLearningFeedbackTool(friendMemory===true?GUEST_FRIEND_MEMORY_TOOLS:[]):friendMemory===true?GUEST_FRIEND_MEMORY_TOOLS:[]
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

/** Only Pages can mint this HMAC assertion from a valid HttpOnly member session. */
export async function memberTicket(raw,secret){
 if(typeof secret!=="string"||secret.length<32||typeof raw!=="string"||raw.length>1024)return null;
 const parts=raw.split(".");
 if(parts.length!==2||parts.some(p=>!/^[A-Za-z0-9_-]+$/.test(p)))return null;
 try{
  const dec=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(s.length/4)*4,"=")),c=>c.charCodeAt(0));
  const encoder=new TextEncoder();
  const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
  if(!await crypto.subtle.verify("HMAC",key,dec(parts[1]),encoder.encode(parts[0])))return null;
  const body=JSON.parse(new TextDecoder().decode(dec(parts[0])));
  const now=Math.floor(Date.now()/1000);
  if(body?.v!==1||typeof body?.sub!=="string"||!/^[0-9a-f-]{36}$/i.test(body.sub)||
     typeof body?.nonce!=="string"||!/^[A-Za-z0-9_-]{43}$/.test(body.nonce)||
     !Number.isInteger(body.exp)||body.exp<=now||body.exp>now+90)return null;
  return {userId:body.sub,nonce:body.nonce};
 }catch{return null}
}
async function issueMemberTrial(input,env){
 const friendMemory=guestFriendMemoryRequested(input,env),learningFeedback=guestLearningFeedbackRequested(input,env);
 const member=await memberTicket(input.authTicket,env.CREW_GUEST_TICKET_SECRET);
 if(!member)return json({error:"Sign-in required",code:"SIGNIN_REQUIRED"},401);
 try{
  const limit=await env.GUEST_TRIAL_RATE_LIMITER.limit({key:"crew-public-guest"});
  if(limit?.success!==true)return json({error:"Guest trial busy",code:"DAILY_LIMIT"},429);
 }catch{return json({error:"Guest limiter unavailable"},503)}
 const db=env.CREW_AUTH_DB,now=Math.floor(Date.now()/1000),dayStart=taipeiDayStart(now);
 let reserved=false,minted=false;
 try{
  // A ticket can be claimed once, even across simultaneous browser tabs / edges.
  const ticket=await db.prepare("INSERT OR IGNORE INTO crew_guest_ticket_claims (nonce,user_id,claimed_at) VALUES (?,?,?)")
   .bind(member.nonce,member.userId,now).run();
  if(ticket.meta?.changes!==1)return json({error:"Trial request already used",code:"ALREADY_USED"},429);
  await db.prepare("INSERT OR IGNORE INTO crew_guest_usage (user_id,used,updated_at) VALUES (?,0,?)")
   .bind(member.userId,now).run();
  // D1 conditional UPDATE is atomic: reset yesterday's count or increment today's.
  // Existing lifetime rows become today's counters on first grant, without a migration.
  const quota=await db.prepare(
   "UPDATE crew_guest_usage SET used=CASE WHEN updated_at<? THEN 1 ELSE used+1 END,updated_at=? WHERE user_id=? AND (updated_at<? OR used<?)"
  ).bind(dayStart,now,member.userId,dayStart,MEMBER_TRIAL_LIMIT).run();
  if(quota.meta?.changes!==1)return json({error:"Trial already used",code:"ALREADY_USED"},429);
  reserved=true;
  const issuedAt=Date.now();
  const token=await mintToken(selectGuestGeminiKey(env),issuedAt,friendMemory,learningFeedback);
  minted=true;
  return json({token,model:LIVE_MODEL,seconds:SESSION_SECONDS,...(friendMemory?{friendMemory:true}:{}),...(learningFeedback?{learningFeedback:true}:{}),
   issuedAt:new Date(issuedAt).toISOString(),expiresAt:new Date(issuedAt+310000).toISOString()});
 }catch{return json({error:"Guest trial temporarily unavailable"},503)}
 finally{
  // If provisioning failed, release the quota, but never reuse a ticket nonce.
  if(reserved&&!minted){
   // Never refund an older failed grant against a newly reset day's allowance.
   try{await db.prepare("UPDATE crew_guest_usage SET used=MAX(0,used-1) WHERE user_id=? AND updated_at>=? AND updated_at<?")
    .bind(member.userId,dayStart,dayStart+86400).run()}catch{}
  }
 }
}

async function issueDailyAnonymousTrial(request,env,day,friendMemory=false,learningFeedback=false){
 const db=env.CREW_AUTH_DB;
 const hash=await fingerprint(request.headers.get("cf-connecting-ip"),request.headers.get("user-agent"),env.GUEST_TURNSTILE_SECRET);
 let claimed=false,minted=false;
 try{
  // Check the personal allowance before spending a shared edge limiter slot.
  if(!await reserveGuestVoice(db,hash,day))return json({code:"ALREADY_USED"},429);
  claimed=true;
  const limit=await env.GUEST_TRIAL_RATE_LIMITER.limit({key:"crew-public-guest"});
  if(limit?.success!==true)return json({code:"DAILY_LIMIT"},429);
  const issuedAt=Date.now(),token=await mintToken(selectGuestGeminiKey(env),issuedAt,friendMemory,learningFeedback);
  minted=true;
  return json({token,model:LIVE_MODEL,seconds:SESSION_SECONDS,...(friendMemory?{friendMemory:true}:{}),...(learningFeedback?{learningFeedback:true}:{}),issuedAt:new Date(issuedAt).toISOString(),expiresAt:new Date(issuedAt+310000).toISOString()});
 }catch{return json({error:"Guest trial temporarily unavailable"},503)}
 finally{
  if(claimed&&!minted)try{await releaseGuestVoice(db,hash,day)}catch{}
 }
}
async function issueV2Trial(request,input,env){
 const db=env.CREW_AUTH_DB,day=freeQuotaDay();
 let reserved=false,issued=false;
 try{
  const policy=await readFreeQuotaPolicy(env);
  if(!policy.enabled)return json({error:"Guest trial unavailable"},503);
  const isMember=env[MEMBER_SIGNIN_FLAG]==="1"||Object.prototype.hasOwnProperty.call(input,"authTicket");
  if(isMember&&!await memberTicket(input.authTicket,env.CREW_GUEST_TICKET_SECRET))return json({code:"SIGNIN_REQUIRED"},401);
  if(!await reserveVoiceCapacity(db,day,policy.voiceCap))return json({code:"DAILY_LIMIT"},429);
  reserved=true;
  const result=isMember?await issueMemberTrial(input,env):await issueDailyAnonymousTrial(request,env,day,guestFriendMemoryRequested(input,env),guestLearningFeedbackRequested(input,env));
  issued=result.ok;
  return result;
 }catch{return json({error:"Guest trial temporarily unavailable"},503)}
 finally{
  if(reserved&&!issued)try{await releaseVoiceCapacity(db,day)}catch{}
 }
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
 const friendMemory=guestFriendMemoryRequested(input,env),learningFeedback=guestLearningFeedbackRequested(input,env);
 if(quotaV2(env))return issueV2Trial(request,input,env);
 // In meter-only mode, signed-in visitors receive account-counted trials,
 // while unsigned visitors retain the existing anonymous flow.
 if(env[MEMBER_SIGNIN_FLAG]==="1"||
    (memberMeterEnabled(env)&&Object.prototype.hasOwnProperty.call(input,"authTicket")))
  return issueMemberTrial(input,env);
 // Phase 1 has no globally durable per-person/session quota. Fail closed when
 // the Cloudflare per-colo limiter is missing; never claim USD hard caps.
 if(!env.GUEST_DB){
  try{
   const limit=await env.GUEST_TRIAL_RATE_LIMITER.limit({key:"crew-public-guest"});
   if(limit?.success!==true)return json({error:"Guest trial busy",code:"DAILY_LIMIT"},429);
  }catch{return json({error:"Guest limiter unavailable"},503)}
  try{
   const issuedAt=Date.now();
   const token=await mintToken(selectGuestGeminiKey(env),issuedAt,friendMemory,learningFeedback);
   return json({token,model:LIVE_MODEL,seconds:SESSION_SECONDS,...(friendMemory?{friendMemory:true}:{}),...(learningFeedback?{learningFeedback:true}:{}),
    issuedAt:new Date(issuedAt).toISOString(),expiresAt:new Date(issuedAt+310000).toISOString()});
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
  const token=await mintToken(selectGuestGeminiKey(env),issuedAt,friendMemory,learningFeedback);
  minted=true;
  return json({token,model:LIVE_MODEL,seconds:SESSION_SECONDS,...(friendMemory?{friendMemory:true}:{}),...(learningFeedback?{learningFeedback:true}:{}),issuedAt:new Date(issuedAt).toISOString(),expiresAt:new Date(issuedAt+310000).toISOString()});
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
export {mintToken,verifyCaptcha,selectGuestGeminiKey};
