/**
 * Read-only private usage summary.
 * Requires a valid Cloudflare Access JWT, the expected AUD and an email allowlist.
 * A public deployment or forged Cf-Access-Jwt-Assertion header cannot bypass verification.
 */
type Context={request:Request;env:{
  CREW_USAGE_ACCESS_ISS?:string;CREW_USAGE_ACCESS_AUD?:string;
  CREW_USAGE_ADMIN_EMAIL?:string;CREW_USAGE_ACCOUNT_ID?:string;CREW_USAGE_SQL_TOKEN?:string;
}};
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{
 "Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"
}});
function decode(value:string){
 const raw=atob(value.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(value.length/4)*4,"="));
 return Uint8Array.from(raw,x=>x.charCodeAt(0));
}
async function verifyAccess(request:Request,env:Context["env"]):Promise<boolean>{
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
type Row={day?:string;event?:string;detail?:string;count?:number|string;users?:number|string};
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
export async function onRequestGet({request,env}:Context){
 if(!await verifyAccess(request,env))return respond({error:"Access denied or not configured"},403);
 if(!/^[0-9a-f]{32}$/i.test(env.CREW_USAGE_ACCOUNT_ID||"")||!env.CREW_USAGE_SQL_TOKEN){
  return respond({error:"Analytics query credentials not configured"},503);
 }
 const period=new URL(request.url).searchParams.get("days");
 const days=period==="30"?30:7;
 // The period is fixed to 7/30, and no user-provided SQL or identifiers are accepted.
 const bound="timestamp >= NOW() - INTERVAL '"+days+"' DAY";
 const activeEvents="'teacher_conversation','friend_conversation','timeline_conversation','game_completed','vocabulary_practice','textbook_study','story_reading','story_narration','story_created','fortune_calculated','fortune_ai_interpreted','town_interaction','magic_spell','magic_challenge_answer','magic_panel_choice','magic_voice_connected','guest_trial_connected','mate_briefing_ready','mate_handoff_started','mate_handoff_completed','souls_created','souls_live_connected','souls_conversation','research_article_completed','circle_post_published','circle_comment_posted'";
 const chatEvents="'teacher_conversation','friend_conversation','timeline_conversation','souls_conversation'";
 // Period-wide distinct browsers per stage; no joins, raw IDs or new DB.
 const journeyClickEvents="'home_entry_click','explore_entry_click','shorts_chat_click','guest_trial_start_click'";
 const journeyStartEvents="'teacher_conversation_start','friend_conversation_start','timeline_conversation_start','game_started','textbook_study','mate_handoff_started','magic_voice_connected','souls_live_connected','story_narration'";
 const previous="timestamp >= NOW() - INTERVAL '"+(days*2)+"' DAY AND timestamp < NOW() - INTERVAL '"+days+"' DAY";
 try{
  // Browser identity is deduplicated ACROSS the entire reporting period by SQL.
  // Never sum the per-day distinct counts to infer unique browsers.
  const [daily,active,eventUsers,chat,previousActive,previousChat,journeyClicks,journeyStarts]=await Promise.all([
   sql(env,"SELECT formatDateTime(timestamp, '%Y-%m-%d', 'Etc/UTC') AS day, blob1 AS event, blob3 AS detail, SUM(_sample_interval) AS count, COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE "+bound+" GROUP BY day, event, detail ORDER BY day ASC, event ASC LIMIT 5000"),
   sql(env,"SELECT COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE "+bound+" AND blob1 IN ("+activeEvents+")"),
   sql(env,"SELECT blob1 AS event, COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE "+bound+" GROUP BY event LIMIT 100"),
   sql(env,"SELECT COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE "+bound+" AND blob1 IN ("+chatEvents+")"),
   sql(env,"SELECT COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE "+previous+" AND blob1 IN ("+activeEvents+")"),
   sql(env,"SELECT COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE "+previous+" AND blob1 IN ("+chatEvents+")"),
   sql(env,"SELECT COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE "+bound+" AND blob1 IN ("+journeyClickEvents+")"),
   sql(env,"SELECT COUNT(DISTINCT blob2) AS users FROM crew_usage WHERE "+bound+" AND blob1 IN ("+journeyStartEvents+")")
  ]);
  const rows=daily.map(row=>({day:String(row.day||""),event:String(row.event||""),detail:String(row.detail||""),
    count:Number(row.count||0),users:Number(row.users||0)}));
  return respond({
   days,activeUsers:Number(active[0]?.users||0),chatUsers:Number(chat[0]?.users||0),
   previousActiveUsers:Number(previousActive[0]?.users||0),
   previousChatUsers:Number(previousChat[0]?.users||0),
   eventUsers:eventUsers.map(row=>({event:String(row.event||""),users:Number(row.users||0)})),
   journey:{
    opened:Number(eventUsers.find(row=>row.event==="app_opened")?.users||0),
    clicked:Number(journeyClicks[0]?.users||0),
    started:Number(journeyStarts[0]?.users||0),
    engaged:Number(active[0]?.users||0),
    returned:Number(eventUsers.find(row=>row.event==="user_returned")?.users||0)
   },
   rows,generatedAt:new Date().toISOString()
  });
 }catch{
  return respond({error:"Analytics data is unavailable. Check the binding, dataset and read token."},502);
 }
}
export async function onRequest(){
 return new Response(null,{status:405,headers:{Allow:"GET","Cache-Control":"no-store"}});
}
