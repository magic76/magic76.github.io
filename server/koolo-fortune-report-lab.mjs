import {reportLabHtml} from "./koolo-fortune-lab-html.mjs";
import {normalizeLabFacts,validateLabChapters,generateLabChapters,generateLabPart,PARTS} from "./koolo-fortune-lab-core.mjs";
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
const modelName=env=>/^gemini-[a-zA-Z0-9.-]{2,55}$/.test(env?.KOOLO_FORTUNE_LAB_MODEL||"gemini-3.5-flash")?
 env?.KOOLO_FORTUNE_LAB_MODEL||"gemini-3.5-flash":null;
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
const PROGRESS_VERSION="bazi-private-lab-progress-v1";
function parseProgress(row){
 let obj;try{obj=JSON.parse(row.content_json||"null")}catch{return null}
 if(!obj||obj.version!==PROGRESS_VERSION||!obj.chapters||
  typeof obj.facts?.fourPillars!=="string"||typeof obj.facts?.dayMaster!=="string")return null;
 return obj;
}
function progressSummary(row){
 const saved=parseProgress(row);if(!saved)return null;
 const summary={completed:PARTS.filter(k=>typeof saved.chapters[k]==="string").length,
  total:PARTS.length,busy:!!(saved.lease&&Number(saved.lease.until)>Date.now())};
 // Only the authenticated owner can retrieve this controlled, non-PII code.
 if(row.status==="failed"&&typeof saved.lastFailure==="string"&&
  /^[A-Z][A-Z0-9_]{2,55}$/.test(saved.lastFailure))summary.lastFailure=saved.lastFailure;
 return summary;
}
const rowSummary=r=>({id:String(r.id),status:String(r.status),createdAt:Number(r.created_at),
 model:String(r.model||""),usage:{promptTokens:Number(r.prompt_tokens||0),outputTokens:Number(r.output_tokens||0)},
 ...(progressSummary(r)?{progress:progressSummary(r)}:{})});
function readyReport(row){
 if(row.status!=="ready")return null;
 let content;
 try{content=JSON.parse(row.content_json||"")}catch{return null}
 if(!content||!content.facts||!validateLabChapters(content.chapters,content.facts))return null;
 return {...rowSummary(row),version:content.version||"bazi-private-lab-v1",facts:content.facts,chapters:content.chapters};
}
function existingReportResponse(row){
 if(row.status==="ready"){
  const report=readyReport(row);
  return report?reply({report},200):reply({error:"REPORT_INVALID"},503);
 }
 if(row.status==="generating")return reply({report:rowSummary(row)},202);
 return null;
}
export async function labGet(ctx){
 const a=await owner(ctx,"GET");if(a.error)return a.error;
 const url=new URL(ctx.request.url),id=url.searchParams.get("report");
 if(id!==null){
  if(!UUID.test(id))return reply({error:"NOT_FOUND"},404);
  try{
   const row=await a.db.prepare("SELECT id,status,created_at,model,prompt_tokens,output_tokens,content_json FROM koolo_fortune_lab_reports WHERE id=? AND user_id=? LIMIT 1")
    .bind(id,a.userId).first();
   if(!row)return reply({error:"NOT_FOUND"},404);
   return existingReportResponse(row)||reply({report:rowSummary(row)});
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
 if(payload?.action==="advance"){
  if(!UUID.test(payload?.reportId||""))return reply({error:"NOT_FOUND"},404);
  return advanceLabReport(a,ctx,String(payload.reportId),key,model);
 }
 const facts=normalizeLabFacts(payload?.facts);
 if(!facts||!UUID.test(payload?.requestId||""))return reply({error:"INVALID_CHART"},400);
 const incremental=payload?.pipeline==="chapters";
 const progressSeed=incremental?JSON.stringify({version:PROGRESS_VERSION,facts,chapters:{},
  usage:{promptTokens:0,outputTokens:0},lease:null}):null;
 let progressSource=progressSeed;
 const now=nowSec();
 let id=crypto.randomUUID();
 try{
  // A completed failed attempt should not permanently consume the daily 3-slot
  // acceptance quota. Mark abandoned synchronous attempts stale after 15 min.
  await a.db.prepare("UPDATE koolo_fortune_lab_reports SET status='failed',updated_at=? WHERE user_id=? AND status='generating' AND created_at<? AND updated_at<?")
   .bind(now,a.userId,now-900,now-900).run();
  const insertion=await a.db.prepare(
   "INSERT INTO koolo_fortune_lab_reports(id,user_id,request_id,status,model,content_json,created_at,updated_at) "+
   "SELECT ?,?,?,'generating',?,?,?,? WHERE "+
   "(SELECT COUNT(1) FROM koolo_fortune_lab_reports WHERE user_id=? AND created_at>=? AND status IN ('generating','ready'))<3 "+
   "ON CONFLICT(user_id,request_id) DO NOTHING"
  ).bind(id,a.userId,payload.requestId,model,progressSeed,now,now,a.userId,taipeiStart(now)).run();
  if(Number(insertion.meta?.changes)!==1){
   const query="SELECT id,user_id,status,created_at,model,prompt_tokens,output_tokens,content_json FROM koolo_fortune_lab_reports WHERE user_id=? AND request_id=? LIMIT 1";
   const earlier=await a.db.prepare(query).bind(a.userId,payload.requestId).first();
   if(!earlier)return reply({error:"DAILY_LIMIT",limit:3},429);
   const existing=existingReportResponse(earlier);
   if(existing)return existing;
   if(incremental){
    const earlierProgress=parseProgress(earlier);
    if(earlierProgress&&JSON.stringify(earlierProgress.facts)!==JSON.stringify(facts))
     return reply({error:"CHART_MISMATCH"},409);
    progressSource=earlier?.content_json||progressSeed;
   }
   // A failed attempt may be explicitly retried with the SAME request ID.
   // Conditional update is atomic: concurrent requests cannot run two Gemini
   // generations. The active/ready count retains the existing daily limit.
   const claimed=await a.db.prepare(
    "UPDATE koolo_fortune_lab_reports SET status='generating',model=?,created_at=?,updated_at=?,content_json=CASE WHEN ?=1 THEN COALESCE(content_json,?) ELSE NULL END,prompt_tokens=0,output_tokens=0 "+
    "WHERE user_id=? AND request_id=? AND status='failed' AND "+
    "(SELECT COUNT(1) FROM koolo_fortune_lab_reports WHERE user_id=? AND created_at>=? AND status IN ('generating','ready'))<3"
   ).bind(model,now,now,incremental?1:0,progressSeed,a.userId,payload.requestId,a.userId,taipeiStart(now)).run();
   if(Number(claimed.meta?.changes)!==1){
    // Another caller may have claimed the failed row while this caller waited.
    const latest=await a.db.prepare(query).bind(a.userId,payload.requestId).first();
    const resolved=latest&&existingReportResponse(latest);
    if(resolved)return resolved;
    return reply({error:"DAILY_LIMIT",limit:3},429);
   }
   id=String(earlier.id);
  }
 }catch{return reply({error:"MIGRATION_REQUIRED"},503)}
 // New PWA protocol returns immediately; one chapter is generated by each
 // subsequent authenticated advance call. Legacy clients retain old behavior.
 if(incremental)return reply({report:rowSummary({id,status:"generating",created_at:now,
  model,content_json:progressSource,prompt_tokens:0,output_tokens:0})},202);
 const generationStart=Date.now();
 try{
  const generated=await generateLabChapters(facts,{key,model,fetcher:ctx.env?.FORTUNE_LAB_TEST_FETCH||fetch});
  const snapshot=JSON.stringify({version:"bazi-private-lab-v2",facts,chapters:generated.chapters});
  if(snapshot.length>50000)throw Error("REPORT_TOO_LARGE");
  // Persist the actual model used when a retired model returns 404, rather
  // than attributing a successful book to the failed initial model.
  const generatedModel=generated.model||model;
  await a.db.prepare("UPDATE koolo_fortune_lab_reports SET status='ready',model=?,content_json=?,prompt_tokens=?,output_tokens=?,updated_at=? WHERE id=? AND user_id=? AND status='generating'")
   .bind(generatedModel,snapshot,generated.usage.promptTokens,generated.usage.outputTokens,nowSec(),id,a.userId).run();
  return reply({report:{id,status:"ready",version:"bazi-private-lab-v2",createdAt:now,model:generatedModel,usage:generated.usage,facts,chapters:generated.chapters}},201);
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


/** Resume a checkpointed report by owner-scoped ID, with a compare-and-swap lease. */
async function advanceLabReport(a,ctx,id,key,model){
 const query="SELECT id,status,created_at,model,content_json,prompt_tokens,output_tokens FROM koolo_fortune_lab_reports WHERE id=? AND user_id=? LIMIT 1";
 const load=()=>a.db.prepare(query).bind(id,a.userId).first();
 let row;try{row=await load()}catch{return reply({error:"UNAVAILABLE"},503)}
 if(!row)return reply({error:"NOT_FOUND"},404);
 const already=existingReportResponse(row);
 if(row.status==="ready")return already||reply({error:"REPORT_INVALID"},503);
 let progress=parseProgress(row);
 if(!progress)return reply({error:"RESUME_REQUIRES_CHART",id},409);
 if(row.status==="failed"){
  const now=nowSec();
  let claim;
  try{claim=await a.db.prepare(
   "UPDATE koolo_fortune_lab_reports SET status='generating',created_at=?,updated_at=? "+
   "WHERE id=? AND user_id=? AND status='failed' AND "+
   "(SELECT COUNT(1) FROM koolo_fortune_lab_reports WHERE user_id=? AND created_at>=? AND status IN ('generating','ready'))<3"
  ).bind(now,now,id,a.userId,a.userId,taipeiStart(now)).run()}
  catch{return reply({error:"UNAVAILABLE"},503)}
  if(Number(claim.meta?.changes)!==1){
   const latest=await load();
   return latest&&existingReportResponse(latest)||reply({error:"DAILY_LIMIT",limit:3},429);
  }
  row.status="generating";row.created_at=now;
 }
 if(row.status!=="generating")return reply({error:"REPORT_INVALID"},409);
 if(progress.lease&&Number(progress.lease.until)>Date.now())
  return reply({report:rowSummary(row)},202);
 const part=PARTS.find(k=>typeof progress.chapters[k]!=="string");
 if(!part)return reply({error:"REPORT_INVALID"},409);
 const token=crypto.randomUUID();
 const reserved=JSON.stringify({...progress,lastFailure:null,lease:{token,until:Date.now()+45000}});
 const previous=row.content_json;
 let lease;
 try{
  lease=await a.db.prepare(
   "UPDATE koolo_fortune_lab_reports SET content_json=?,updated_at=? "+
   "WHERE id=? AND user_id=? AND status='generating' AND content_json=?"
  ).bind(reserved,nowSec(),id,a.userId,previous).run();
 }catch{return reply({error:"UNAVAILABLE"},503)}
 if(Number(lease.meta?.changes)!==1){
  const latest=await load();
  return latest&&existingReportResponse(latest)||reply({error:"UNAVAILABLE"},503);
 }
 const started=Date.now();
 try{
  const result=await generateLabPart(progress.facts,part,
   {key,model,fetcher:ctx.env?.FORTUNE_LAB_TEST_FETCH||fetch});
  const chapters={...progress.chapters,[part]:result.text};
  const usage={promptTokens:Number(progress.usage?.promptTokens||0)+result.usage.promptTokens,
   outputTokens:Number(progress.usage?.outputTokens||0)+result.usage.outputTokens};
  const done=PARTS.every(k=>typeof chapters[k]==="string");
  if(done&&!validateLabChapters(chapters,progress.facts))throw Error("QUALITY_CHECK_FAILED");
  const snapshot=JSON.stringify(done?
   {version:"bazi-private-lab-v2",facts:progress.facts,chapters}:
   {...progress,chapters,usage,lastFailure:null,lease:null});
  if(snapshot.length>50000)throw Error("REPORT_TOO_LARGE");
  const write=await a.db.prepare(
   "UPDATE koolo_fortune_lab_reports SET status=?,model=?,content_json=?,prompt_tokens=?,output_tokens=?,updated_at=? "+
   "WHERE id=? AND user_id=? AND status='generating' AND content_json=?"
  ).bind(done?"ready":"generating",result.model||model,snapshot,usage.promptTokens,usage.outputTokens,
   nowSec(),id,a.userId,reserved).run();
  if(Number(write.meta?.changes)!==1){
   const latest=await load();
   return latest&&existingReportResponse(latest)||reply({error:"UNAVAILABLE"},503);
  }
  console.info("[fortune-lab] chapter saved",JSON.stringify({part,elapsedMs:Date.now()-started,
   model:result.model||model,finishReason:result.finishReason,chapterChars:result.text.length,
   promptTokens:result.usage.promptTokens,outputTokens:result.usage.outputTokens,
   completed:PARTS.filter(k=>typeof chapters[k]==="string").length}));
  const saved={...row,status:done?"ready":"generating",model:result.model||model,
   content_json:snapshot,prompt_tokens:usage.promptTokens,output_tokens:usage.outputTokens};
  return done?reply({report:readyReport(saved)},201):reply({report:rowSummary(saved)},202);
 }catch(e){
  // Classify without recording the prompt, birth chart, raw upstream response,
  // user identifier or API key. A failed chapter stays resumable by this owner.
  const reason=e instanceof Error?e.message:"";
  const upstream=/^UPSTREAM_(400|401|403|404|408|429|500|502|503|504)$/.exec(reason);
  const code=reason==="UPSTREAM_TIMEOUT"?"AI_TIMEOUT":
   reason==="QUALITY_CHECK_FAILED"?"QUALITY_CHECK_FAILED":
   reason==="UPSTREAM_INVALID_RESPONSE"?"GEMINI_INVALID_RESPONSE":
   reason==="UPSTREAM_EMPTY"?"GEMINI_EMPTY":
   reason==="INVALID_JSON"?"GEMINI_INVALID_JSON":
   reason==="REPORT_TOO_LARGE"?"REPORT_TOO_LARGE":
   upstream?"GEMINI_UPSTREAM_"+upstream[1]:"GENERATION_FAILED";
  const failedContent=JSON.stringify({...progress,lease:null,lastFailure:code});
  let persisted=false;
  try{
   const result=await a.db.prepare(
    "UPDATE koolo_fortune_lab_reports SET status='failed',content_json=?,updated_at=? "+
    "WHERE id=? AND user_id=? AND status='generating' AND content_json=?"
   ).bind(failedContent,nowSec(),id,a.userId,reserved).run();
   persisted=Number(result.meta?.changes)===1;
  }catch{/* Preserve the original classified error. */}
  console.warn("[fortune-lab] chapter failed",JSON.stringify({part,code,elapsedMs:Date.now()-started,persisted}));
  if(!persisted)return reply({error:"UNAVAILABLE",id},503);
  // This is an expected application-level *generation outcome*, not a broken
  // HTTP gateway. Return 200 with a typed failed report to avoid Cloudflare
  // custom 5xx error-page replacement hiding the actionable failure code.
  return reply({report:rowSummary({...row,status:"failed",content_json:failedContent})});
 }
}
