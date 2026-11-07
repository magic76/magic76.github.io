/**
 * Privacy-limited product analytics ingestion.
 * Client-provided event names are allowlisted; no chat content, keys, IP or URLs are persisted.
 */
type Dataset={writeDataPoint(point:{indexes:string[];blobs:string[];doubles:number[]}):void};
type Context={request:Request;env:{ANALYTICS_ENGINE?:Dataset}};
const events=new Set([
  "app_opened","visitor_first_seen","user_returned",
  "teacher_conversation","friend_conversation",
  "teacher_conversation_start","friend_conversation_start","timeline_conversation_start",
  "teacher_user_spoke","friend_user_spoke","timeline_user_spoke",
  "teacher_ai_replied","friend_ai_replied","timeline_ai_replied",
  "timeline_view","timeline_conversation","timeline_session_end",
  "game_open","game_started","game_completed",
  "game_route_loaded","game_route_stalled","game_route_asset_error",
  "teacher_session_end","friend_session_end",
  "vocabulary_practice","textbook_open","textbook_study",
  "shorts_view","shorts_chat_click","shorts_conversation","shorts_hook_click","shorts_story_followup",
  "story_reading","story_narration","story_created",
  "fortune_calculated","fortune_ai_interpreted",
  "gemini_key_missing","gemini_key_verified",
  "guest_trial_entry_view","guest_trial_unavailable","guest_trial_start_click","guest_trial_mic_denied","guest_trial_setup_failed",
  "guest_trial_token_issued","guest_trial_token_failed","guest_trial_connected","guest_trial_connect_failed","guest_trial_ended",
  "home_entry_click","explore_entry_click",
  "home_live_bubble_view","home_live_bubble_click","home_live_bubble_connected","home_live_bubble_conversation",
  "home_gift_view","home_gift_open","home_gift_result","home_gift_go","home_gift_minimize",
  "souls_open","souls_photo_ready","souls_created","souls_live_attempt","souls_live_connected","souls_live_failed","souls_user_input","souls_ai_replied","souls_conversation","souls_mask_repaired",
  "town_enter","town_interaction","town_chat_click","town_3d_fallback",
  "magic_enter","magic_spell","magic_challenge_answer","magic_panel_choice",
  "magic_voice_connected","magic_voice_failed","magic_3d_fallback","magic_world_reset",
  "mate_open","mate_briefing_ready","mate_handoff_started","mate_handoff_completed","mate_handoff_failed",
  "research_article_open","research_article_saved","research_article_completed","research_source_open",
  "circle_thread_open","circle_post_published","circle_comment_posted"
]);
const details=new Set(["","bazi","tarot","vedic","shorts_home","shorts_feed",
  "under_1m","from_1_to_3m","from_3_to_10m","over_10m",
  "under_1s","from_1_to_3s","from_3_to_8s","over_8s",
  "teacher","friend","under_15s","from_15_to_45s","from_45_to_60s","from_60_to_120s","from_120_to_180s","from_180_to_300s",
  "mira","ethan","hana","settings","learn","story","fortune","timeline","play","briefing","town","magic","mate","souls","shorts","circle",
  "android_app_google_play",
  "voice","demo","live","person","object","place","manual","render_error","unsupported",
  "nonsense","crazy-court","taboo","1a2b","number-bomb","memory","gomoku","connect4","reversi","twenty-questions","mystery","werewolf"]);
const identifier=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json=(body:unknown,status:number)=>new Response(JSON.stringify(body),{
  status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}
});
export async function onRequestPost({request,env}:Context):Promise<Response>{
  // Unconfigured deployments should fail closed, without affecting product workflows.
  if(!env.ANALYTICS_ENGINE)return json({error:"Analytics binding unavailable"},503);
  const url=new URL(request.url);
  if(!["www.3sssi.com","3sssi.com"].includes(url.hostname))return json({error:"Production only"},403);
  const origin=request.headers.get("origin");
  if(origin!==url.origin||request.headers.get("sec-fetch-site")==="cross-site")return json({error:"Origin rejected"},403);
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type")||""))return json({error:"JSON required"},415);
  const length=Number(request.headers.get("content-length")||"0");
  if(length>1024)return json({error:"Payload too large"},413);
  const agent=request.headers.get("user-agent")||"";
  if(/bot\b|spider|crawler|curl|wget|headless|lighthouse|playwright|puppeteer/i.test(agent))return new Response(null,{status:204});
  if(typeof request.cf?.botManagement?.score==="number"&&request.cf.botManagement.score<20)return new Response(null,{status:204});
  let body:unknown;
  try{
    const raw=await request.text();
    if(raw.length>1024)return json({error:"Payload too large"},413);
    body=JSON.parse(raw);
  }catch{return json({error:"Invalid JSON"},400)}
  if(!body||typeof body!=="object"||Array.isArray(body))return json({error:"Invalid event"},400);
  const value=body as Record<string,unknown>;
  if(typeof value.event!=="string"||!events.has(value.event)||
     typeof value.visitorId!=="string"||!identifier.test(value.visitorId)||
     typeof value.sessionId!=="string"||!identifier.test(value.sessionId)||
     typeof value.detail!=="string"||!details.has(value.detail)){
    return json({error:"Invalid event"},400);
  }
  env.ANALYTICS_ENGINE.writeDataPoint({
    indexes:[value.visitorId],
    blobs:[value.event,value.visitorId,value.detail,value.sessionId],
    doubles:[1]
  });
  return new Response(null,{status:204,headers:{"Cache-Control":"no-store"}});
}
export async function onRequest():Promise<Response>{
  return new Response(null,{status:405,headers:{Allow:"POST","Cache-Control":"no-store"}});
}
