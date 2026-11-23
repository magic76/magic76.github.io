import {reportLabHtml} from "./koolo-fortune-lab-html.mjs";
import {normalizeLabFacts,validateLabChapters,generateLabChapters} from "./koolo-fortune-lab-core.mjs";
/** Private acceptance lab. No real checkout or grants. Admin permission is delegated to the existing /usage verifyAccess guard on every request. */
const ORIGINS=new Set(["https://koolo.app","https://www.3sssi.com"]);
const SESSION="__Host-crew_session";
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HEADERS={"Content-Type":"application/json; charset=utf-8","Cache-Control":"private, no-store",
 "X-Koolo-Fortune-Lab-API":"v1",
 "Vary":"Cookie","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff",
 "X-Robots-Tag":"noindex, nofollow, noarchive","X-Frame-Options":"DENY"};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const hash=async s=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))].map(n=>n.toString(16).padStart(2,"0")).join("");
const nowSec=()=>Math.floor(Date.now()/1000);
const taipeiStart=n=>Math.floor((n+28800)/86400)*86400-28800;
const modelName=env=>/^gemini-[a-zA-Z0-9.-]{2,55}$/.test(env?.KOOLO_FORTUNE_LAB_MODEL||"gemini-2.5-flash")?
 env?.KOOLO_FORTUNE_LAB_MODEL||"gemini-2.5-flash":null;
async function owner({request,env,verifyAdmin},method){
 let origin;try{origin=new URL(request.url).origin}catch{return {error:reply({error:"NOT_FOUND"},404)}}
 if(!ORIGINS.has(origin))return {error:reply({error:"NOT_FOUND"},404)};
 if(request.method!==method)return {error:reply({error:"METHOD_NOT_ALLOWED"},405)};
 if(!env?.CREW_AUTH_DB)return {error:reply({error:"UNAVAILABLE"},503)};
 const token=(request.headers.get("Cookie")||"").split(";").map(x=>x.trim())
  .find(x=>x.startsWith(SESSION+"="))?.slice(SESSION.length+1)||"";
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))return {error:reply({error:"LOGIN_REQUIRED"},401)};
 try{
  const r=await env.CREW_AUTH_DB.prepare("SELECT user_id FROM crew_auth_sessions WHERE token_hash=? AND expires_at>?")
   .bind(await hash(token),nowSec()).first();
  if(!r||typeof r.user_id!=="string")return {error:reply({error:"LOGIN_REQUIRED"},401)};
  // Requires a real Koolo account for per-user report ownership AND the
  // *same* server-side authorization that protects /usage and its report API.
  // Never trust the SPA admin card, a client-supplied flag, or a second allowlist.
  if(typeof verifyAdmin!=="function")return {error:reply({error:"NOT_FOUND"},404)};
  let admin=false;
  try{admin=await verifyAdmin(request,env)===true}catch{/* fail closed */}
  if(!admin)return {error:reply({error:"NOT_FOUND"},404)};
  return {db:env.CREW_AUTH_DB,userId:r.user_id};
 }catch{return {error:reply({error:"UNAVAILABLE"},503)}}
}
const rowSummary=r=>({id:String(r.id),status:String(r.status),createdAt:Number(r.created_at),
 model:String(r.model||""),usage:{promptTokens:Number(r.prompt_tokens||0),outputTokens:Number(r.output_tokens||0)}});
export async function labGet(ctx){
 const a=await owner(ctx,"GET");if(a.error)return a.error;
 const url=new URL(ctx.request.url),id=url.searchParams.get("report");
 if(id!==null){
  if(!UUID.test(id))return reply({error:"NOT_FOUND"},404);
  try{
   const row=await a.db.prepare("SELECT id,status,created_at,model,prompt_tokens,output_tokens,content_json FROM koolo_fortune_lab_reports WHERE id=? AND user_id=? LIMIT 1")
    .bind(id,a.userId).first();
   if(!row)return reply({error:"NOT_FOUND"},404);
   if(row.status!=="ready")return reply({report:rowSummary(row)});
   const content=JSON.parse(row.content_json);
   if(!content||!content.facts||!validateLabChapters(content.chapters,content.facts))return reply({error:"REPORT_INVALID"},503);
   return reply({report:{...rowSummary(row),facts:content.facts,chapters:content.chapters}});
  }catch{return reply({error:"UNAVAILABLE"},503)}
 }
 if(url.searchParams.has("list")){
  try{
   const rows=await a.db.prepare("SELECT id,status,created_at,model,prompt_tokens,output_tokens FROM koolo_fortune_lab_reports WHERE user_id=? ORDER BY created_at DESC LIMIT 20")
    .bind(a.userId).all();
   return reply({items:(rows.results||[]).map(rowSummary)});
  }catch{return reply({error:"MIGRATION_REQUIRED"},503)}
 }
 return reply({error:"NOT_FOUND"},404);
}
export async function labPage(ctx){
 const a=await owner(ctx,"GET");if(a.error)return a.error;
 const nonce=crypto.randomUUID().replaceAll("-","");
 return new Response(reportLabHtml(nonce),{status:200,headers:{
  "Content-Type":"text/html; charset=utf-8","Cache-Control":"private, no-store","Vary":"Cookie",
  "X-Robots-Tag":"noindex, nofollow, noarchive","X-Frame-Options":"DENY",
  "Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff",
  "Content-Security-Policy":"default-src 'none'; script-src 'self'; style-src 'nonce-"+nonce+"' 'unsafe-inline'; connect-src 'self'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'"
 }});
}
export async function labPost(ctx){
 const a=await owner(ctx,"POST");if(a.error)return a.error;
 if(ctx.request.headers.get("Origin")!==new URL(ctx.request.url).origin)return reply({error:"BAD_ORIGIN"},403);
 if(!(ctx.request.headers.get("Content-Type")||"").toLowerCase().startsWith("application/json"))return reply({error:"BAD_CONTENT_TYPE"},415);
 if(Number(ctx.request.headers.get("Content-Length")||0)>7000)return reply({error:"TOO_LARGE"},413);
 const key=ctx.env?.KOOLO_FORTUNE_LAB_GEMINI_KEY,model=modelName(ctx.env);
 if(typeof key!=="string"||key.length<15||!model)return reply({error:"AI_NOT_CONFIGURED"},503);
 let payload;try{
  const raw=await ctx.request.text();
  if(raw.length>7000)return reply({error:"TOO_LARGE"},413);
  payload=JSON.parse(raw);
 }catch{return reply({error:"BAD_JSON"},400)}
 const facts=normalizeLabFacts(payload?.facts);
 if(!facts||!UUID.test(payload?.requestId||""))return reply({error:"INVALID_CHART_OR_QUESTIONS"},400);
 const now=nowSec(),id=crypto.randomUUID();
 try{
  // A completed failed attempt should not permanently consume the daily 3-slot
  // acceptance quota. Mark abandoned synchronous attempts stale after 15 min.
  await a.db.prepare("UPDATE koolo_fortune_lab_reports SET status='failed',updated_at=? WHERE user_id=? AND status='generating' AND created_at<?")
   .bind(now,a.userId,now-900).run();
  const insertion=await a.db.prepare(
   "INSERT INTO koolo_fortune_lab_reports(id,user_id,request_id,status,model,created_at,updated_at) "+
   "SELECT ?,?,?,'generating',?,?,? WHERE "+
   "(SELECT COUNT(1) FROM koolo_fortune_lab_reports WHERE user_id=? AND created_at>=? AND status IN ('generating','ready'))<3 "+
   "ON CONFLICT(user_id,request_id) DO NOTHING"
  ).bind(id,a.userId,payload.requestId,model,now,now,a.userId,taipeiStart(now)).run();
  if(Number(insertion.meta?.changes)!==1){
   const earlier=await a.db.prepare("SELECT id,status FROM koolo_fortune_lab_reports WHERE user_id=? AND request_id=?")
    .bind(a.userId,payload.requestId).first();
   return earlier?reply({error:"DUPLICATE_REQUEST",id:earlier.id,status:earlier.status},409):reply({error:"DAILY_LIMIT",limit:3},429);
  }
 }catch{return reply({error:"MIGRATION_REQUIRED"},503)}
 const generationStart=Date.now();
 try{
  const generated=await generateLabChapters(facts,{key,model,fetcher:ctx.env?.FORTUNE_LAB_TEST_FETCH||fetch});
  const snapshot=JSON.stringify({version:"bazi-private-lab-v1",facts,chapters:generated.chapters});
  if(snapshot.length>50000)throw Error("REPORT_TOO_LARGE");
  await a.db.prepare("UPDATE koolo_fortune_lab_reports SET status='ready',content_json=?,prompt_tokens=?,output_tokens=?,updated_at=? WHERE id=? AND user_id=? AND status='generating'")
   .bind(snapshot,generated.usage.promptTokens,generated.usage.outputTokens,nowSec(),id,a.userId).run();
  return reply({report:{id,status:"ready",createdAt:now,model,usage:generated.usage,facts,chapters:generated.chapters}},201);
 }catch(e){
  try{await a.db.prepare("UPDATE koolo_fortune_lab_reports SET status='failed',updated_at=? WHERE id=? AND user_id=? AND status='generating'")
   .bind(nowSec(),id,a.userId).run()}catch{/* no unauthorized write */}
  const reason=e instanceof Error?e.message:"";
  const upstream=/^UPSTREAM_(400|401|403|404|408|429|500|502|503|504)$/.exec(reason);
  const code=reason==="UPSTREAM_TIMEOUT"?"AI_TIMEOUT":
   reason==="QUALITY_CHECK_FAILED"?"QUALITY_CHECK_FAILED":
   reason==="UPSTREAM_INVALID_RESPONSE"?"GEMINI_INVALID_RESPONSE":
   upstream?"GEMINI_UPSTREAM_"+upstream[1]:"GENERATION_FAILED";
  // Do not log the birth chart, prompts, user id, response text, or API Key.
  console.warn("[fortune-lab] generation failed",JSON.stringify({code,elapsedMs:Date.now()-generationStart}));
  return reply({error:code,id},code==="AI_TIMEOUT"?504:502);
 }
}
