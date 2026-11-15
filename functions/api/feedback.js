/** Cloudflare Pages Function: feedback stored privately in D1. No user-facing fallback. */
const TYPES=new Set(["bug","idea","other"]);
const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const configured=env=>Boolean(env?.CREW_FEEDBACK_DB&&typeof env.CREW_FEEDBACK_DB.prepare==="function");
const limited=(value,max)=>typeof value==="string"&&value.trim().length<=max?value.trim():null;
const feedbackTable="CREATE TABLE IF NOT EXISTS crew_feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, message TEXT NOT NULL, contact TEXT NOT NULL DEFAULT '', page TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)";
const limitsTable="CREATE TABLE IF NOT EXISTS crew_feedback_limit (rate_key TEXT PRIMARY KEY, hour INTEGER NOT NULL, hits INTEGER NOT NULL)";
// Optional owner-only notification. The public submission response never depends on Telegram.
// Send only fixed metadata: NEVER send message, contact, page, raw IP or secrets to Telegram.
const telegramKinds={bug:"問題回報",idea:"功能建議",other:"其他意見"};
function telegramSettings(env){
 const token=typeof env?.CREW_FEEDBACK_TG_BOT_TOKEN==="string"?env.CREW_FEEDBACK_TG_BOT_TOKEN.trim():"";
 const chatId=typeof env?.CREW_FEEDBACK_TG_CHAT_ID==="string"?env.CREW_FEEDBACK_TG_CHAT_ID.trim():"";
 return /^[0-9]{5,12}:[A-Za-z0-9_-]{25,}$/.test(token)&&/^-?[0-9]{1,20}$/.test(chatId)?{token,chatId}:null;
}
async function sendTelegramNotification({token,chatId},id,kind){
 try{
  const nl=String.fromCharCode(10);
  const text="🔔 Crew 收到新回饋"+nl+"編號：FB-"+id+nl+"類別："+telegramKinds[kind]+nl+"查看：https://www.3sssi.com/usage/feedback";
  const result=await fetch("https://api.telegram.org/bot"+token+"/sendMessage",{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({chat_id:chatId,text,link_preview_options:{is_disabled:true}})
  });
  const body=result.ok?await result.json():null;
  if(!result.ok||body?.ok!==true)console.warn("Crew feedback Telegram notification unsuccessful for FB-"+id);
 }catch{
  // Never log the Bot Token, Chat ID, raw response, or visitor-supplied content.
  console.warn("Crew feedback Telegram notification unsuccessful for FB-"+id);
 }
}
export async function onRequestGet({env}){
 return reply({enabled:configured(env)});
}
export async function onRequestPost(context){
 const {request,env}=context;
 if(!configured(env))return reply({error:"NOT_CONFIGURED"},503);
 const url=new URL(request.url);
 if(request.headers.get("origin")!==url.origin||request.headers.get("sec-fetch-site")==="cross-site")return reply({error:"ORIGIN_REJECTED"},403);
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type")||""))return reply({error:"INVALID_CONTENT_TYPE"},415);
 if(Number(request.headers.get("content-length")||"0")>6000)return reply({error:"TOO_LARGE"},413);
 let data;
 try{
  const raw=await request.text();
  if(raw.length>6000)return reply({error:"TOO_LARGE"},413);
  data=JSON.parse(raw);
 }catch{return reply({error:"INVALID_JSON"},400)}
 if(!data||typeof data!=="object"||Array.isArray(data))return reply({error:"INVALID_JSON"},400);
 if(data.website)return reply({error:"INVALID_SUBMISSION"},400);
 const kind=data.kind,message=limited(data.message,1500),contact=limited(data.contact??"",160),page=limited(data.page??"",160);
 if(!TYPES.has(kind)||message===null||message.length<10||contact===null||
    (contact!==""&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact))||
    page===null||(page!==""&&!/^\/[a-zA-Z0-9_\-/]*$/.test(page)))return reply({error:"INVALID_SUBMISSION"},400);
 // Cloudflare injects this header. Never accept a client-supplied IP or retain a plain IP address.
 const ip=request.headers.get("cf-connecting-ip");
 if(!ip||ip.length>80)return reply({error:"ORIGIN_REJECTED"},403);
 const hour=Math.floor(Date.now()/3600000);
 try{
  const rawKey=new TextEncoder().encode("crew-feedback-hour-v1:"+hour+":"+ip);
  const digest=await crypto.subtle.digest("SHA-256",rawKey);
  const rateKey=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");
  const db=env.CREW_FEEDBACK_DB;
  // Idempotent schema bootstrap: setup requires only one D1 binding, no manual SQL.
  await db.prepare(feedbackTable).run();
  await db.prepare(limitsTable).run();
  await db.prepare("DELETE FROM crew_feedback_limit WHERE hour < ?").bind(hour-48).run();
  const allowed=await db.prepare("INSERT INTO crew_feedback_limit (rate_key,hour,hits) VALUES (?, ?, 1) ON CONFLICT(rate_key) DO UPDATE SET hits=hits+1 WHERE hits < 3").bind(rateKey,hour).run();
  if(!allowed.success)return reply({error:"SUBMISSION_UNAVAILABLE"},503);
  if(allowed.meta?.changes!==1)return reply({error:"RATE_LIMITED"},429);
  const result=await db.prepare("INSERT INTO crew_feedback (kind,message,contact,page) VALUES (?, ?, ?, ?)").bind(kind,message,contact,page).run();
  const id=result?.meta?.last_row_id;
  if(!result?.success||!Number.isSafeInteger(id)||id<=0)return reply({error:"SUBMISSION_UNAVAILABLE"},503);
  // Cloudflare keeps the job alive after response; Telegram failure cannot roll back D1.
  const tg=telegramSettings(env);
  if(tg&&typeof context.waitUntil==="function"){
   try{context.waitUntil(sendTelegramNotification(tg,id,kind))}
   catch{console.warn("Crew feedback Telegram scheduling unsuccessful for FB-"+id)}
  }
  return reply({ok:true,reference:"FB-"+id},201);
 }catch{return reply({error:"SUBMISSION_UNAVAILABLE"},503)}
}
export function onRequest(){return new Response(null,{status:405,headers:{...headers,Allow:"GET, POST"}})}
