/**
 * Read-only private usage summary.
 * Requires a valid Cloudflare Access JWT, the expected AUD and an email allowlist.
 * A public deployment or forged Cf-Access-Jwt-Assertion header cannot bypass verification.
 */
type Context={request:Request;env:{
  CREW_USAGE_ACCESS_ISS?:string;CREW_USAGE_ACCESS_AUD?:string;
  CREW_USAGE_ADMIN_EMAIL?:string;CREW_USAGE_ACCOUNT_ID?:string;CREW_USAGE_SQL_TOKEN?:string;
  CREW_FEEDBACK_DB?:FeedbackDb;CREW_AUTH_DB?:FeedbackDb;KOOLO_ADMIN_EMAILS?:string;
}};
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{
 "Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"
}});
function decode(value:string){
 const raw=atob(value.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(value.length/4)*4,"="));
 return Uint8Array.from(raw,x=>x.charCodeAt(0));
}
async function verifyKooloAdmin(request:Request,env:Context["env"]):Promise<boolean>{
 const allow=new Set((env.KOOLO_ADMIN_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean));
 if(!allow.size||!env.CREW_AUTH_DB)return false;
 const origin=new URL(request.url).origin;
 if(origin!=="https://koolo.app"&&origin!=="https://www.3sssi.com")return false;
 const token=(request.headers.get("Cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("__Host-crew_session="))?.slice("__Host-crew_session=".length)||"";
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))return false;
 try{
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token))),x=>x.toString(16).padStart(2,"0")).join("");
  const row=await env.CREW_AUTH_DB.prepare("SELECT v.email AS email FROM crew_auth_sessions s JOIN crew_auth_identities i ON i.user_id=s.user_id AND i.provider='google' JOIN crew_auth_verified_emails v ON v.provider=i.provider AND v.provider_id=i.provider_id WHERE s.token_hash=? AND s.expires_at>? LIMIT 1")
   .bind(hash,Math.floor(Date.now()/1000)).first<{email:string}>();
  return typeof row?.email==="string"&&allow.has(row.email.toLowerCase());
 }catch{return false}
}
export async function verifyAccess(request:Request,env:Context["env"]):Promise<boolean>{
 if(await verifyKooloAdmin(request,env))return true;
 const issuer=env.CREW_USAGE_ACCESS_ISS?.replace(/\/+$/,"");
 const aud=env.CREW_USAGE_ACCESS_AUD,email=env.CREW_USAGE_ADMIN_EMAIL?.toLowerCase();
 if(!issuer||!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer)||!aud||!email)return false;
 const token=request.headers.get("cf-access-jwt-assertion");
 if(!token||token.length>16000)return false;
 const parts=token.split(".");
 if(parts.length!==3)return false;
 try{
  const header=JSON.parse(new TextDecoder().decode(decode(parts[0])));
  const payload=JSON.parse(new TextDecoder().decode(decode(parts[1])));
  if(header.alg!=="RS256"||typeof header.kid!=="string"||
     payload.iss!==issuer||!Array.isArray(payload.aud)||!payload.aud.includes(aud)||
     String(payload.email||"").toLowerCase()!==email||
     typeof payload.exp!=="number"||payload.exp<=Date.now()/1000||
     (typeof payload.nbf==="number"&&payload.nbf>Date.now()/1000))return false;
  const keysResponse=await fetch(issuer+"/cdn-cgi/access/certs");
  if(!keysResponse.ok)return false;
  const keys=await keysResponse.json() as {keys?:Array<JsonWebKey&{kid?:string}>};
  const jwk=keys.keys?.find(k=>k.kid===header.kid&&k.kty==="RSA");
  if(!jwk)return false;
  const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  return crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decode(parts[2]),new TextEncoder().encode(parts[0]+"."+parts[1]));
 }catch{return false}
}
type Row={day?:string;event?:string;detail?:string;platform?:string;count?:number|string;users?:number|string};
function taipeiReportDay(at=Date.now()){return new Date(at+8*3600000).toISOString().slice(0,10)}
function offsetReportDay(day:string,offset:number){
 return new Date(Date.parse(day+"T00:00:00Z")+offset*86400000).toISOString().slice(0,10);
}
/** D1/D7 are exact calendar-day cohorts, built from aggregate distinct-UUID counts. */
function retentionSummary(rows:Row[],days:number,today=taipeiReportDay()){
 const counts=new Map<string,number>();
 for(const row of rows){
  const day=String(row.day||""),event=String(row.event||"");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!["retention_cohort_started","retention_d1_returned","retention_d7_returned"].includes(event))continue;
  counts.set(day+":"+event,Number(row.users)||0);
 }
 const count=(day:string,event:string)=>counts.get(day+":"+event)||0;
 const result={d1:{eligible:0,returned:0},d7:{eligible:0,returned:0}};
 // The return window uses the last N complete Taipei dates, excluding today.
 for(let ago=1;ago<=days;ago++){
  const returnDay=offsetReportDay(today,-ago);
  result.d1.eligible+=count(offsetReportDay(returnDay,-1),"retention_cohort_started");
  result.d1.returned+=count(returnDay,"retention_d1_returned");
  result.d7.eligible+=count(offsetReportDay(returnDay,-7),"retention_cohort_started");
  result.d7.returned+=count(returnDay,"retention_d7_returned");
 }
 return result;
}
async function sql(env:Context["env"],query:string){
 const url="https://api.cloudflare.com/client/v4/accounts/"+env.CREW_USAGE_ACCOUNT_ID+"/analytics_engine/sql";
 const reply=await fetch(url,{method:"POST",headers:{
  "Authorization":"Bearer "+env.CREW_USAGE_SQL_TOKEN,
  "Content-Type":"text/plain"
 },body:query});
 if(!reply.ok)throw new Error("Query failed: "+reply.status);
 const result=await reply.json() as {data?:Row[]};
 if(!Array.isArray(result.data))throw new Error("Invalid query response");
 return result.data;
}

/** Owner inbox shares this EXACT Cloudflare Access-protected report path and JWT verifier.
 * Avoid a new public /api/* data endpoint or a second Zero Trust application/AUD.
 */
type FeedbackStatement={
 bind(...values:(string|number)[]):FeedbackStatement;
 run():Promise<{success:boolean;meta?:{changes?:number}}>;
 all<T>():Promise<{success:boolean;results:T[]}>;
 first<T>():Promise<T|null>;
};
type FeedbackDb={prepare(sql:string):FeedbackStatement};
type FeedbackRow={
 id:number;kind:"bug"|"idea"|"other";message:string;contact:string;page:string;created_at:string;
 status:"new"|"working"|"done";reviewed_at:string|null
};
const feedbackStatuses=new Set(["new","working","done"]);
const feedbackKinds=new Set(["all","bug","idea","other"]);
const feedbackFilters=new Set(["all","new","working","done"]);
async function ensureFeedbackTables(db:FeedbackDb){
 // Matches the public POST bootstrap: the inbox can be opened before anyone submits.
 await db.prepare("CREATE TABLE IF NOT EXISTS crew_feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, message TEXT NOT NULL, contact TEXT NOT NULL DEFAULT '', page TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
 // Separate review table means existing feedback rows work without an ALTER TABLE migration.
 await db.prepare("CREATE TABLE IF NOT EXISTS crew_feedback_review (feedback_id INTEGER PRIMARY KEY, status TEXT NOT NULL CHECK(status IN ('new','working','done')), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
}
async function listFeedback(request:Request,env:Context["env"]):Promise<Response>{
 const db=env.CREW_FEEDBACK_DB;
 if(!db||typeof db.prepare!=="function")return respond({error:"Feedback D1 binding unavailable"},503);
 const params=new URL(request.url).searchParams;
 const kind=params.get("kind")||"all",status=params.get("status")||"all",beforeRaw=params.get("before");
 if(!feedbackKinds.has(kind)||!feedbackFilters.has(status)||
    (beforeRaw!==null&&(!/^[1-9][0-9]{0,14}$/.test(beforeRaw)||!Number.isSafeInteger(Number(beforeRaw)))))
    return respond({error:"Invalid filter"},400);
 const before=beforeRaw?Number(beforeRaw):Number.MAX_SAFE_INTEGER;
 try{
  await ensureFeedbackTables(db);
  const summary=await db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN COALESCE(r.status,'new')='new' THEN 1 ELSE 0 END) AS newCount, SUM(CASE WHEN r.status='working' THEN 1 ELSE 0 END) AS workingCount, SUM(CASE WHEN r.status='done' THEN 1 ELSE 0 END) AS doneCount FROM crew_feedback f LEFT JOIN crew_feedback_review r ON r.feedback_id=f.id").first<{total:number;newCount:number;workingCount:number;doneCount:number}>();
  const result=await db.prepare("SELECT f.id,f.kind,f.message,f.contact,f.page,f.created_at,COALESCE(r.status,'new') AS status,r.updated_at AS reviewed_at FROM crew_feedback f LEFT JOIN crew_feedback_review r ON r.feedback_id=f.id WHERE (?='all' OR f.kind=?) AND (?='all' OR COALESCE(r.status,'new')=?) AND f.id < ? ORDER BY f.id DESC LIMIT 31")
   .bind(kind,kind,status,status,before).all<FeedbackRow>();
  if(!result.success||!Array.isArray(result.results))throw Error("DB query failed");
  const items=result.results.slice(0,30);
  return respond({items,hasMore:result.results.length>30,summary:{
   total:Number(summary?.total||0),new:Number(summary?.newCount||0),
   working:Number(summary?.workingCount||0),done:Number(summary?.doneCount||0)
  }});
 }catch{return respond({error:"Feedback data unavailable"},502)}
}
async function updateFeedback(request:Request,env:Context["env"]):Promise<Response>{
 const db=env.CREW_FEEDBACK_DB;
 if(!db||typeof db.prepare!=="function")return respond({error:"Feedback D1 binding unavailable"},503);
 const origin=new URL(request.url).origin;
 if(request.headers.get("origin")!==origin||request.headers.get("sec-fetch-site")==="cross-site")
  return respond({error:"Origin rejected"},403);
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type")||""))
  return respond({error:"JSON required"},415);
 if(Number(request.headers.get("content-length")||"0")>512)return respond({error:"Too large"},413);
 let body:unknown;
 try{
  const raw=await request.text();
  if(raw.length>512)return respond({error:"Too large"},413);
  body=JSON.parse(raw);
 }catch{return respond({error:"Invalid JSON"},400)}
 if(!body||typeof body!=="object"||Array.isArray(body))return respond({error:"Invalid update"},400);
 const input=body as Record<string,unknown>;
 if(typeof input.id!=="number"||!Number.isSafeInteger(input.id)||input.id<=0||!feedbackStatuses.has(String(input.status)))
  return respond({error:"Invalid update"},400);
 try{
  await ensureFeedbackTables(db);
  const present=await db.prepare("SELECT id FROM crew_feedback WHERE id=?").bind(Number(input.id)).first<{id:number}>();
  if(!present)return respond({error:"Feedback not found"},404);
  const updated=await db.prepare("INSERT INTO crew_feedback_review (feedback_id,status,updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT(feedback_id) DO UPDATE SET status=excluded.status,updated_at=CURRENT_TIMESTAMP")
   .bind(Number(input.id),String(input.status)).run();
  if(!updated.success)return respond({error:"Feedback update failed"},502);
  return respond({ok:true,id:Number(input.id),status:String(input.status)});
 }catch{return respond({error:"Feedback update failed"},502)}
}

export async function onRequestGet({request,env}:Context){
 if(!await verifyAccess(request,env))return respond({error:"Access denied or not configured"},403);
 const view=new URL(request.url).searchParams.get("view");
 if(view==="feedback")return listFeedback(request,env);
 if(view==="accounts"){
  const db=env.CREW_AUTH_DB;
  if(!db||typeof db.prepare!=="function")return respond({error:"Auth D1 binding unavailable"},503);
  try{
   const now=Math.floor(Date.now()/1000);
   const day=86400;
   const stats=await db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN created_at>=? THEN 1 ELSE 0 END) AS new7, SUM(CASE WHEN created_at>=? THEN 1 ELSE 0 END) AS new30 FROM crew_auth_users").bind(now-7*day,now-30*day).first<{total:number;new7:number;new30:number}>();
   const sessions=await db.prepare("SELECT COUNT(DISTINCT user_id) AS activeSessions FROM crew_auth_sessions WHERE expires_at>?").bind(now).first<{activeSessions:number}>();
   return respond({total:Number(stats?.total||0),new7:Number(stats?.new7||0),new30:Number(stats?.new30||0),activeSessions:Number(sessions?.activeSessions||0),generatedAt:new Date().toISOString()});
  }catch{return respond({error:"Account statistics unavailable"},502)}
 }

 if(view!==null)return respond({error:"Invalid report view"},400);
 if(!/^[0-9a-f]{32}$/i.test(env.CREW_USAGE_ACCOUNT_ID||"")||!env.CREW_USAGE_SQL_TOKEN){
  return respond({error:"Analytics query credentials not configured"},503);
 }
 const period=new URL(request.url).searchParams.get("days");
 const days=period==="30"?30:7;
 // The period is fixed to 7/30, and no user-provided SQL or identifiers are accepted.
 const bound="timestamp >= NOW() - INTERVAL '"+days+"' DAY";
 const activeEvents="'teacher_conversation','friend_conversation','timeline_conversation','game_completed','vocabulary_practice','textbook_study','story_reading','story_narration','story_created','fortune_calculated','fortune_ai_interpreted','town_interaction','magic_spell','magic_challenge_answer','magic_panel_choice','magic_voice_connected','guest_trial_connected','mate_briefing_ready','mate_handoff_started','mate_handoff_completed','souls_created','souls_conversation','research_article_completed','circle_post_published','circle_comment_posted'";
 const chatEvents="'teacher_conversation','friend_conversation','timeline_conversation','souls_conversation'";
 // Period-wide distinct browsers per stage; no joins, raw IDs or new DB.
 const journeyClickEvents="'home_entry_click','explore_entry_click','shorts_chat_click','guest_trial_start_click'";
 const journeyStartEvents="'teacher_conversation_start','friend_conversation_start','timeline_conversation_start','game_started','textbook_study','mate_handoff_started','magic_voice_connected','souls_live_connected','story_narration'";
 const platformBound=" AND blob5 IN ('web','pwa','android_shell')";
 const previous="timestamp >= NOW() - INTERVAL '"+(days*2)+"' DAY AND timestamp < NOW() - INTERVAL '"+days+"' DAY";
 try{
  // Browser identity is deduplicated ACROSS the entire reporting period by SQL.
  // Never sum the per-day distinct counts to infer unique browsers.
  const [daily,active,eventUsers,chat,previousActive,previousChat,journeyClicks,journeyStarts,platformOpens,platformActive,platformChat,platformReturn,platformGames,magicSessions,retentionRows]=await Promise.all([
   sql(env,"SELECT formatDateTime(timestamp, '%Y-%m-%d', 'Asia/Taipei') AS day, blob1 AS event, blob3 AS detail, SUM(_sample_interval) AS count, COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE "+bound+" GROUP BY day, event, detail ORDER BY day ASC, event ASC LIMIT 5000"),
   sql(env,"SELECT COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE "+bound+" AND blob1 IN ("+activeEvents+")"),
   sql(env,"SELECT blob1 AS event, COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE "+bound+" GROUP BY event LIMIT 100"),
   sql(env,"SELECT COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE "+bound+" AND blob1 IN ("+chatEvents+")"),
   sql(env,"SELECT COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE "+previous+" AND blob1 IN ("+activeEvents+")"),
   sql(env,"SELECT COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE "+previous+" AND blob1 IN ("+chatEvents+")"),
   sql(env,"SELECT COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE "+bound+" AND blob1 IN ("+journeyClickEvents+")"),
   sql(env,"SELECT COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE "+bound+" AND blob1 IN ("+journeyStartEvents+")"),
   // Period-wide anonymous browsers grouped by fixed launch-surface enum (not Firebase).
   sql(env,"SELECT blob5 AS platform, COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE "+bound+platformBound+" AND blob1 = 'app_opened' GROUP BY platform LIMIT 10"),
   sql(env,"SELECT blob5 AS platform, COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE "+bound+platformBound+" AND blob1 IN ("+activeEvents+") GROUP BY platform LIMIT 10"),
   sql(env,"SELECT blob5 AS platform, COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE "+bound+platformBound+" AND blob1 IN ("+chatEvents+") GROUP BY platform LIMIT 10"),
   sql(env,"SELECT blob5 AS platform, COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE "+bound+platformBound+" AND blob1 = 'user_returned' GROUP BY platform LIMIT 10"),
   sql(env,"SELECT blob5 AS platform, COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE "+bound+platformBound+" AND blob1 = 'game_completed' GROUP BY platform LIMIT 10"),
   sql(env,"SELECT COUNT(DISTINCT blob4) AS users FROM crew_usage WHERE "+bound+" AND blob1 = 'magic_enter'"),
   sql(env,"SELECT formatDateTime(timestamp, '%Y-%m-%d', 'Asia/Taipei') AS day, blob1 AS event, COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE timestamp >= NOW() - INTERVAL '"+(days+9)+"' DAY AND blob1 IN ('retention_cohort_started','retention_d1_returned','retention_d7_returned') GROUP BY day, event ORDER BY day ASC LIMIT 300")
  ]);
  const rows=daily.map(row=>({day:String(row.day||""),event:String(row.event||""),detail:String(row.detail||""),
    count:Number(row.count||0),users:Number(row.users||0)}));
  return respond({
   days,activeUsers:Number(active[0]?.users||0),chatUsers:Number(chat[0]?.users||0),
   previousActiveUsers:Number(previousActive[0]?.users||0),
   previousChatUsers:Number(previousChat[0]?.users||0),
   retention:retentionSummary(retentionRows,days),
   eventUsers:eventUsers.map(row=>({event:String(row.event||""),users:Number(row.users||0)})),
   journey:{
    opened:Number(eventUsers.find(row=>row.event==="app_opened")?.users||0),
    clicked:Number(journeyClicks[0]?.users||0),
    started:Number(journeyStarts[0]?.users||0),
    engaged:Number(active[0]?.users||0),
    returned:Number(eventUsers.find(row=>row.event==="user_returned")?.users||0)
   },
   platformBreakdown:["web","pwa","android_shell"].map(platform=>{
    const get=(results:Row[])=>Number(results.find(row=>row.platform===platform)?.users||0);
    return {platform,opened:get(platformOpens),active:get(platformActive),chat:get(platformChat),
      returned:get(platformReturn),gamesCompleted:get(platformGames)};
   }),
   magicDiagnostics:{entrySessions:Number(magicSessions[0]?.users||0)},
   rows,generatedAt:new Date().toISOString()
  });
 }catch{
  return respond({error:"Analytics data is unavailable. Check the binding, dataset and read token."},502);
 }
}
export async function onRequestPost({request,env}:Context){
 if(!await verifyAccess(request,env))return respond({error:"Access denied or not configured"},403);
 if(new URL(request.url).searchParams.get("view")!=="feedback")return respond({error:"Invalid report view"},400);
 return updateFeedback(request,env);
}
export async function onRequest(){
 return new Response(null,{status:405,headers:{Allow:"GET, POST","Cache-Control":"no-store"}});
}
