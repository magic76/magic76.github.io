/** Keyless text-only practice. Gemini credentials never leave this Worker.
 * Separate from the five-minute Live voice token / account quota.
 * Store only anonymous salted counters and short-lived token hashes in D1.
 */
import {memberTicket} from "../../functions/api/guest/token.js";
import {quotaV2,readFreeQuotaPolicy,memberTextQuotaKey,MEMBER_TEXT_LIMIT} from "../../server/free-quota.mjs";
const MODEL="gemini-3.5-flash-lite";
const DAILY_TURNS=12,GLOBAL_DAILY_TURNS=1500,SESSION_MS=30*60*1000;
const MAX_BODY=20000,MIN_TURN_GAP_MS=2500;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{
 "content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"
}});
const hex=bytes=>Array.from(bytes,x=>x.toString(16).padStart(2,"0")).join("");
const sha256=async text=>hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text))));
const taipeiDay=now=>new Date(now+8*3600000).toISOString().slice(0,10);
const dbReady=new WeakMap();
function configured(env){
 return env.GUEST_TRIAL_ENABLED==="1"&&Boolean(env.CREW_AUTH_DB?.prepare)&&
  Boolean(env.GUEST_TURNSTILE_SITE_KEY)&&Boolean(env.GUEST_TURNSTILE_SECRET)&&
  Boolean(env.GEMINI_GUEST_API_KEYS||env.GEMINI_GUEST_API_KEY);
}
async function ensureTables(db){
 if(!dbReady.has(db)){
  const task=(async()=>{
   await db.prepare("CREATE TABLE IF NOT EXISTS crew_guest_text_sessions (token_hash TEXT PRIMARY KEY,visitor_hash TEXT NOT NULL,expires_at INTEGER NOT NULL)").run();
   await db.prepare("CREATE TABLE IF NOT EXISTS crew_guest_text_usage (visitor_hash TEXT NOT NULL,day TEXT NOT NULL,used INTEGER NOT NULL DEFAULT 0,last_at INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(visitor_hash,day))").run();
   await db.prepare("CREATE TABLE IF NOT EXISTS crew_guest_text_daily (day TEXT PRIMARY KEY,used INTEGER NOT NULL DEFAULT 0)").run();
  })();
  dbReady.set(db,task);
  task.catch(()=>{if(dbReady.get(db)===task)dbReady.delete(db)});
 }
 await dbReady.get(db);
}
async function visitorHash(request,env){
 const ip=request.headers.get("cf-connecting-ip"),agent=request.headers.get("user-agent");
 if(!ip||!agent)return null;
 return sha256(env.GUEST_TURNSTILE_SECRET+"|"+ip+"|"+agent.slice(0,256));
}
async function parseInput(request){
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type")||""))
  return {error:json({code:"BAD_REQUEST"},415)};
 if(Number(request.headers.get("content-length")||0)>MAX_BODY)return {error:json({code:"BAD_REQUEST"},413)};
 try{
  const raw=await request.text();
  if(raw.length>MAX_BODY)return {error:json({code:"BAD_REQUEST"},413)};
  const value=JSON.parse(raw);
  if(!value||typeof value!=="object"||Array.isArray(value))throw Error("invalid input");
  return {value};
 }catch{return {error:json({code:"BAD_REQUEST"},400)}}
}
async function createSession(request,env,input,deps,visitor,quotaKey=visitor,dailyLimit=DAILY_TURNS,v2=false){
 if(typeof input.challengeToken!=="string"||input.challengeToken.length<10||input.challengeToken.length>2048)
  return json({code:"VERIFY_REQUIRED"},400);
 let verified=false;
 try{verified=await deps.verifyCaptcha(input.challengeToken,request.headers.get("cf-connecting-ip"),env.GUEST_TURNSTILE_SECRET,new URL(request.url).hostname,"crew-guest-trial")}
 catch{return json({code:"TEMP_UNAVAILABLE"},503)}
 if(!verified)return json({code:"VERIFY_FAILED"},403);
 const db=env.CREW_AUTH_DB,now=Date.now(),day=taipeiDay(now);
 try{
  await ensureTables(db);
  const record=await db.prepare("SELECT used FROM crew_guest_text_usage WHERE visitor_hash=? AND day=?").bind(quotaKey,day).first();
  if(Number(record?.used||0)>=dailyLimit)return json({code:"DAILY_LIMIT",remaining:0},429);
  const token=hex(crypto.getRandomValues(new Uint8Array(32)));
  const hash=await sha256(token);
  await db.prepare("DELETE FROM crew_guest_text_sessions WHERE expires_at<?").bind(now).run();
  await db.prepare("INSERT INTO crew_guest_text_sessions (token_hash,visitor_hash,expires_at) VALUES (?,?,?)")
   .bind(hash,visitor,now+SESSION_MS).run();
  return json({sessionToken:token,remaining:dailyLimit-Number(record?.used||0),expiresAt:now+SESSION_MS,...(v2?{dailyLimit}:{})});
 }catch{return json({code:"TEMP_UNAVAILABLE"},503)}
}
function cleanMessages(raw){
 if(!Array.isArray(raw)||raw.length<1||raw.length>10)return null;
 const messages=[];
 for(const item of raw){
  if(!item||!["user","assistant"].includes(item.role)||typeof item.text!=="string")return null;
  const text=item.text.trim();
  if(!text||text.length>1200)return null;
  messages.push({role:item.role==="assistant"?"model":"user",parts:[{text}]});
 }
 if(messages.at(-1).role!=="user")return null;
 return messages;
}
async function refund(db,visitor,day){
 // A failed upstream request should not consume a user's daily allowance.
 try{await db.prepare("UPDATE crew_guest_text_usage SET used=MAX(0,used-1) WHERE visitor_hash=? AND day=?").bind(visitor,day).run()}catch{}
 try{await db.prepare("UPDATE crew_guest_text_daily SET used=MAX(0,used-1) WHERE day=?").bind(day).run()}catch{}
}
async function sendText(env,input,deps,visitor,quotaKey=visitor,dailyLimit=DAILY_TURNS,globalLimit=GLOBAL_DAILY_TURNS,v2=false){
 const messages=cleanMessages(input.messages);
 if(!messages||typeof input.system!=="string"||input.system.length>6000||
    typeof input.sessionToken!=="string"||!/^[0-9a-f]{64}$/.test(input.sessionToken))
  return json({code:"BAD_REQUEST"},400);
 const db=env.CREW_AUTH_DB,now=Date.now(),day=taipeiDay(now);
 let reservedVisitor=false,reservedGlobal=false;
 try{
  await ensureTables(db);
  const session=await db.prepare("SELECT visitor_hash,expires_at FROM crew_guest_text_sessions WHERE token_hash=?")
   .bind(await sha256(input.sessionToken)).first();
  if(!session||session.visitor_hash!==visitor||session.expires_at<=now)return json({code:"SESSION_EXPIRED"},401);
  await db.prepare("INSERT OR IGNORE INTO crew_guest_text_usage (visitor_hash,day,used,last_at) VALUES (?,?,0,0)")
   .bind(quotaKey,day).run();
  const grant=await db.prepare("UPDATE crew_guest_text_usage SET used=used+1,last_at=? WHERE visitor_hash=? AND day=? AND used<? AND last_at<=?")
   .bind(now,quotaKey,day,dailyLimit,now-MIN_TURN_GAP_MS).run();
  if(grant.meta?.changes!==1){
   const status=await db.prepare("SELECT used FROM crew_guest_text_usage WHERE visitor_hash=? AND day=?").bind(quotaKey,day).first();
   return Number(status?.used||0)>=dailyLimit
    ?json({code:"DAILY_LIMIT",remaining:0},429):json({code:"TOO_FAST"},429);
  }
  reservedVisitor=true;
  await db.prepare("INSERT OR IGNORE INTO crew_guest_text_daily (day,used) VALUES (?,0)").bind(day).run();
  const total=await db.prepare("UPDATE crew_guest_text_daily SET used=used+1 WHERE day=? AND used<?")
   .bind(day,globalLimit).run();
  if(total.meta?.changes!==1){
   await db.prepare("UPDATE crew_guest_text_usage SET used=MAX(0,used-1) WHERE visitor_hash=? AND day=?").bind(quotaKey,day).run();
   reservedVisitor=false;
   return json({code:"CAPACITY"},429);
  }
  reservedGlobal=true;
  const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+MODEL+":generateContent",{
   method:"POST",headers:{"content-type":"application/json","x-goog-api-key":deps.selectGuestGeminiKey(env)},
   body:JSON.stringify({
    systemInstruction:{parts:[{text:"You are a friendly, accurate language-learning conversation partner. Follow the teacher or friend persona, speaking language, correction style, and scenario below. Respond only in text, not audio. Keep replies concise and interactive.\n"+input.system}]},
    contents:messages,generationConfig:{temperature:0.7,maxOutputTokens:520}
   }),signal:AbortSignal.timeout(25000)
  });
  if(!response.ok)throw Error("upstream unavailable");
  const body=await response.json();
  const reply=(body?.candidates?.[0]?.content?.parts||[])
   .map(part=>typeof part?.text==="string"?part.text:"").join("").trim().slice(0,2800);
  if(!reply)throw Error("empty upstream reply");
  const quota=await db.prepare("SELECT used FROM crew_guest_text_usage WHERE visitor_hash=? AND day=?").bind(quotaKey,day).first();
  return json({reply,remaining:Math.max(0,dailyLimit-Number(quota?.used??dailyLimit)),...(v2?{dailyLimit}:{})});
 }catch{
  if(reservedGlobal)await refund(db,quotaKey,day);
  else if(reservedVisitor){
   try{await db.prepare("UPDATE crew_guest_text_usage SET used=MAX(0,used-1) WHERE visitor_hash=? AND day=?").bind(quotaKey,day).run()}catch{}
  }
  return json({code:"TEMP_UNAVAILABLE"},503);
 }
}
/** Inject the existing Turnstile validator and server-side Gemini key selector. */
export async function onTextRequest(request,env,deps){
 const origin=request.headers.get("origin");
 if(!["https://www.3sssi.com","https://koolo.app"].includes(origin)||new URL(request.url).origin!==origin)return json({code:"ORIGIN_REJECTED"},403);
 const v2=quotaV2(env);
 let policy;
 if(v2&&configured(env)){
  try{
   if(typeof env.CREW_GUEST_TICKET_SECRET!=="string"||env.CREW_GUEST_TICKET_SECRET.length<32)throw Error("Signer unavailable");
   policy=await readFreeQuotaPolicy(env);
  }catch{return request.method==="GET"?json({enabled:false}):json({code:"TEMP_UNAVAILABLE"},503)}
  if(!policy.enabled)return request.method==="GET"?json({enabled:false}):json({code:"TEMP_UNAVAILABLE"},503);
 }
 if(request.method==="GET")return json(configured(env)
  ?{enabled:true,siteKey:env.GUEST_TURNSTILE_SITE_KEY,dailyLimit:DAILY_TURNS,...(v2?{memberDailyLimit:MEMBER_TEXT_LIMIT}:{})}:{enabled:false});
 if(request.method!=="POST")return json({code:"METHOD_NOT_ALLOWED"},405);
 if(!configured(env))return json({code:"TEMP_UNAVAILABLE"},503);
 const visitor=await visitorHash(request,env);
 if(!visitor)return json({code:"VERIFY_REQUIRED"},403);
 const parsed=await parseInput(request);
 if(parsed.error)return parsed.error;
 const input=parsed.value;
 let sessionVisitor=visitor,quotaKey=visitor,dailyLimit=DAILY_TURNS;
 if(v2&&Object.prototype.hasOwnProperty.call(input,"authTicket")){
  const member=await memberTicket(input.authTicket,env.CREW_GUEST_TICKET_SECRET);
  if(!member)return json({code:"SESSION_EXPIRED"},401);
  quotaKey=memberTextQuotaKey(member.userId);
  // A verified member grant is valid only for the same account AND device fingerprint.
  sessionVisitor=await sha256("member-session|"+member.userId+"|"+visitor);
  dailyLimit=MEMBER_TEXT_LIMIT;
 }
 if(input.action==="start")return createSession(request,env,input,deps,sessionVisitor,quotaKey,dailyLimit,v2);
 if(input.action==="send")return sendText(env,input,deps,sessionVisitor,quotaKey,dailyLimit,policy?.textCap??GLOBAL_DAILY_TURNS,v2);
 return json({code:"BAD_REQUEST"},400);
}
