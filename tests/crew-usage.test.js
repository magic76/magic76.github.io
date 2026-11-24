const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");

function compile(file){
 const source=fs.readFileSync(path.join(root,file),"utf8");
 const stripped=stripTypeScriptTypes(source,{mode:"strip"});
 const exports=[...source.matchAll(/export async function (\w+)/g)].map(match=>match[1]);
 const js=stripped.replace(/export async function /g,"async function ")+"\nmodule.exports={"+exports.join(",")+"};";
 const mod={exports:{}};
 const load=new Function("module","exports","require","Response","Request","fetch","crypto","atob","TextEncoder","TextDecoder",js);
 load(mod,mod.exports,require,Response,Request,fetch,globalThis.crypto,atob,TextEncoder,TextDecoder);
 return mod.exports;
}
const payload={event:"friend_conversation",detail:"",visitorId:"aab11919-1a11-4c99-a011-000000000001",sessionId:"aab11919-1a11-4c99-a011-000000000002"};
function request(data=payload,extra={}){
 return new Request("https://www.3sssi.com/api/usage/event",{method:"POST",
  headers:{"content-type":"application/json","origin":"https://www.3sssi.com",...extra},
  body:JSON.stringify(data)});
}
test("Pages Functions only run on allowlisted APIs and the localized root",()=>{
 const routes=JSON.parse(fs.readFileSync(path.join(root,"_routes.json"),"utf8"));
 assert.deepEqual(routes.include,["/api/usage/*","/api/feedback","/api/auth/*","/api/membership/*","/api/fortune/*","/fortune/report-lab","/admin/payment-test","/api/voice/*","/api/books","/"]);
 // Even if included in a future Pages config, guest APIs must never be served by Pages Functions.
 assert.deepEqual(routes.exclude,["/api/guest/*"]);
 const adapter=fs.readFileSync(path.join(root,"scripts/prepare-cloudflare.mjs"),"utf8");
 assert.ok(adapter.includes('"_routes.json"'));
});

test("private fortune report lab is reachable from /usage PWA but not public site navigation",()=>{
 const dashboard=fs.readFileSync(path.join(root,"web-spa/src/analytics/UsageDashboardPage.tsx"),"utf8");
 const css=fs.readFileSync(path.join(root,"web-spa/src/analytics/usage-dashboard.css"),"utf8");
 const home=fs.readFileSync(path.join(root,"web-spa/src/pages/KooloAdminEntry.tsx"),"utf8");
 const api=fs.readFileSync(path.join(root,"functions/api/fortune/report-lab.js"),"utf8");
 const page=fs.readFileSync(path.join(root,"functions/fortune/report-lab.js"),"utf8");
 assert.ok(dashboard.includes('<a href="/fortune/report-lab" className="usage-jump usage-report-lab-link"'));
 assert.ok(dashboard.includes("專屬命書驗收"));
 assert.ok(css.includes(".usage-toolbar .usage-report-lab-link{"));
 assert.ok(css.includes("min-height:44px"));
 assert.ok(!home.includes("/fortune/report-lab"));
 // Native <a> navigates to the protected Pages Function, not the SPA router.
 assert.ok(!dashboard.includes('<Link to="/fortune/report-lab"'));
 assert.ok(api.includes("verifyAdmin:verifyAccess"));
 assert.ok(page.includes("verifyAdmin:verifyAccess"));
});

test("event handler rejects unconfigured deployment and invalid or spoofed events",async()=>{
 const {onRequestPost}=compile("functions/api/usage/event.ts");
 const noBinding=await onRequestPost({request:request(),env:{}});
 assert.equal(noBinding.status,503);
 const points=[],env={ANALYTICS_ENGINE:{writeDataPoint:p=>points.push(p)}};
 assert.equal((await onRequestPost({request:request({...payload,event:"not_allowlisted"}),env})).status,400);
 assert.equal((await onRequestPost({request:request({...payload,visitorId:"someone@example.com"}),env})).status,400);
 assert.equal((await onRequestPost({request:request(payload,{"origin":"https://evil.invalid"}),env})).status,403);
 assert.equal((await onRequestPost({request:request(payload,{"user-agent":"curl/8"}),env})).status,204);
 assert.equal(points.length,0);
 const valid=await onRequestPost({request:request(),env});
 assert.equal(valid.status,204);
 assert.equal(points.length,1);
 assert.deepEqual(points[0].blobs,[payload.event,payload.visitorId,"",payload.sessionId,"legacy"]);
 assert.deepEqual(points[0].indexes,[payload.visitorId]);
 const bucket=await onRequestPost({request:request({...payload,event:"teacher_session_end",detail:"from_3_to_10m"}),env});
 assert.equal(bucket.status,204);
 assert.deepEqual(points[1].blobs,["teacher_session_end",payload.visitorId,"from_3_to_10m",payload.sessionId,"legacy"]);
 assert.equal((await onRequestPost({request:request({...payload,event:"teacher_session_end",detail:"private transcript"}),env})).status,400);
 assert.equal((await onRequestPost({request:request({...payload,event:"vocabulary_practice"}),env})).status,204);
});

test("report handler fails closed without verified Cloudflare Access JWT",async()=>{
 const {onRequestGet}=compile("functions/api/usage/report.ts");
 const blank=await onRequestGet({request:new Request("https://www.3sssi.com/api/usage/report"),env:{}});
 assert.equal(blank.status,403);
 const fake=await onRequestGet({
  request:new Request("https://www.3sssi.com/api/usage/report",{headers:{"cf-access-jwt-assertion":"fake.fake.fake"}}),
  env:{CREW_USAGE_ACCESS_ISS:"https://example.cloudflareaccess.com",CREW_USAGE_ACCESS_AUD:"audience",
   CREW_USAGE_ADMIN_EMAIL:"admin@example.com",CREW_USAGE_ACCOUNT_ID:"1".repeat(32),CREW_USAGE_SQL_TOKEN:"hidden"}
 });
 assert.equal(fake.status,403);
});

test("new privacy-safe Timeline and game events are allowlisted, private details rejected",async()=>{
 const {onRequestPost}=compile("functions/api/usage/event.ts");
 const points=[],env={ANALYTICS_ENGINE:{writeDataPoint:point=>points.push(point)}};
 for(const [event,detail] of [["timeline_view","hana"],["timeline_conversation",""],["timeline_user_spoke",""],
  ["game_open","taboo"],["game_started","connect4"],["game_completed","mystery"]]){
  const result=await onRequestPost({request:request({...payload,event,detail}),env});
  assert.equal(result.status,204,event);
 }
 assert.equal(points.length,6);
 assert.equal((await onRequestPost({request:request({...payload,event:"game_completed",detail:"private-answer"}),env})).status,400);
 assert.equal((await onRequestPost({request:request({...payload,event:"timeline_view",detail:"private-user-id"}),env})).status,400);
});
test("report aggregates browser uniqueness over the full period rather than summing daily",()=>{
 const source=fs.readFileSync(path.join(root,"functions/api/usage/report.ts"),"utf8");
 assert.match(source,/SELECT COUNT\(DISTINCT blob2\) AS users FROM crew_usage WHERE /);
 assert.match(source,/eventUsers\.map/);
 assert.match(source,/previousChatUsers/);
 const dashboard=fs.readFileSync(path.join(root,"web-spa/src/analytics/UsageDashboardPage.tsx"),"utf8");
 assert.doesNotMatch(dashboard,/\.reduce\(\(a,b\)=>a\+b\.users/);
 const overview=fs.readFileSync(path.join(root,"web-spa/src/analytics/UsageOverviewCards.tsx"),"utf8");
 assert.match(overview,/data\.chatUsers/);
});

test("frontend and Cloudflare ingest share one verified event/detail vocabulary",()=>{
 const client=fs.readFileSync(path.join(root,"web-spa/src/analytics/usage.ts"),"utf8");
 const server=fs.readFileSync(path.join(root,"functions/api/usage/event.ts"),"utf8");
 const values=(body)=>[...body.matchAll(/"([^"]*)"/g)].map(match=>match[1]);
 const clientEvents=client.match(/export type UsageEvent=([\s\S]*?);/);
 const clientDetails=client.match(/type Detail=([\s\S]*?);/);
 const serverEvents=server.match(/const events=new Set\(\[([\s\S]*?)\]\);/);
 const serverDetails=server.match(/const details=new Set\(\[([\s\S]*?)\]\);/);
 assert.ok(clientEvents&&clientDetails&&serverEvents&&serverDetails,"analytics contract declarations present");
 assert.deepEqual([...new Set(values(clientEvents[1]))].sort(),[...new Set(values(serverEvents[1]))].sort(),"every Web event must be accepted by Pages");
 assert.deepEqual([...new Set(values(clientDetails[1]))].sort(),[...new Set(values(serverDetails[1]))].sort(),"every Web detail must be accepted by Pages");
});

test("new game and experience events survive ingestion without personal payloads",async()=>{
 const {onRequestPost}=compile("functions/api/usage/event.ts");
 const points=[],env={ANALYTICS_ENGINE:{writeDataPoint:p=>points.push(p)}};
 for(const [event,detail] of [
  ["game_completed","nonsense"],["game_completed","crazy-court"],
  ["town_interaction","person"],["town_3d_fallback","render_error"],
  ["magic_spell",""],["magic_panel_choice",""],["magic_voice_failed",""],
  ["mate_handoff_completed",""],["research_article_completed",""],
  ["circle_post_published","live"],["home_entry_click","play"]
 ]){
  const response=await onRequestPost({request:request({...payload,event,detail}),env});
  assert.equal(response.status,204,event+":"+detail);
 }
 assert.equal(points.length,11);
 assert.equal((await onRequestPost({request:request({...payload,event:"research_article_open",detail:"private article title"}),env})).status,400);
});

test("GA4 keeps known product routes while redacting dynamic paths",()=>{
 const source=fs.readFileSync(path.join(root,"web-spa/src/analytics/ga4.ts"),"utf8");
 const section=source.slice(source.indexOf("const reserved"),source.indexOf("function command"));
 const js=stripTypeScriptTypes(section,{mode:"strip"}).replace("export function safeGa4Path","function safeGa4Path");
 const safe=new Function(js+"\nreturn safeGa4Path;")();
 assert.equal(safe("/town"),"/town");
 assert.equal(safe("/magic"),"/magic");
 assert.equal(safe("/mate"),"/mate");
 assert.equal(safe("/souls"),"/souls");
 assert.equal(safe("/souls/my-personal-name"),"/souls/item");
 assert.equal(safe("/games/crazy-court"),"/games/crazy-court");
 assert.equal(safe("/games/nonsense"),"/games/nonsense");
 assert.equal(safe("/research/2026-10-25/private-article"),"/research/item/item");
 assert.equal(safe("/story/read/private-book-id"),"/story/read/item");
});

test("guest trial funnel events and duration details are privacy-allowlisted",async()=>{
 const {onRequestPost}=compile("functions/api/usage/event.ts");
 const points=[],env={ANALYTICS_ENGINE:{writeDataPoint:point=>points.push(point)}};
 for(const [event,detail] of [
  ["guest_trial_entry_view","teacher"],["guest_trial_unavailable","friend"],["guest_trial_start_click","teacher"],
  ["guest_trial_token_issued","friend"],["guest_trial_connected","friend"],
  ["guest_trial_ended","from_45_to_60s"],["guest_trial_ended","from_60_to_120s"],["guest_trial_ended","from_120_to_180s"],["guest_trial_ended","from_180_to_300s"],["guest_trial_ended","under_15s"],
  ["guest_trial_mic_denied","teacher"],["guest_trial_token_failed","friend"],
  ["guest_trial_connect_failed","friend"],["guest_trial_setup_failed","teacher"]
 ]){
  const r=await onRequestPost({request:request({...payload,event,detail}),env});
  assert.equal(r.status,204,event);
 }
 assert.equal(points.length,14);
 assert.equal((await onRequestPost({request:request({...payload,event:"guest_trial_token_issued",detail:"private-token"}),env})).status,400);
 const starter=fs.readFileSync(path.join(root,"web-spa/src/live/GuestLiveStarter.tsx"),"utf8");
 const hook=fs.readFileSync(path.join(root,"web-spa/src/live/useLiveSession.ts"),"utf8");
 const dash=fs.readFileSync(path.join(root,"web-spa/src/analytics/UsageDashboardPage.tsx"),"utf8");
 const teacher=fs.readFileSync(path.join(root,"web-spa/src/teacher/LivePage.tsx"),"utf8");
 const friend=fs.readFileSync(path.join(root,"web-spa/src/friends/FriendLiveConversation.tsx"),"utf8");
 assert.match(starter,/guest_trial_entry_view/);
 assert.match(starter,/guest_trial_unavailable/);
 assert.match(starter,/guest_trial_token_issued/);
 assert.match(hook,/recordGuestConnect\(\)/);
 assert.match(hook,/recordGuestEnd\(\)/);
 assert.match(dash,/免費體驗（5 分鐘）/);
 assert.match(dash,/eventRatio\(/);
 assert.match(hook,/from_180_to_300s/);
 assert.match(dash,/3–5 分鐘/);
 assert.match(dash,/id="guest-trial-stats"/);
 assert.match(teacher,/role="teacher"/);
 assert.match(friend,/role="friend"/);
 assert.match(dash,/這是尊重隱私設定的瀏覽器端事件/);
});

test("guest trial completed turns count as chat without enabling memory callbacks",()=>{
 const hook=fs.readFileSync(path.join(root,"web-spa/src/live/useLiveSession.ts"),"utf8");
 const report=fs.readFileSync(path.join(root,"functions/api/usage/report.ts"),"utf8");
 // A connection alone, or an AI-only greeting, must not count as a conversation.
 assert.match(hook,/const guestEffectiveReportedRef=useRef\(false\)/);
 assert.match(hook,/guestEffectiveReportedRef\.current=false/);
 assert.match(hook,/guestModeRef\.current&&!guestEffectiveReportedRef\.current/);
 assert.match(hook,/turnsRef\.current\.some\(t=>Boolean\(t\.input\?\.trim\(\)&&t\.output\?\.trim\(\)\)\)/);
 assert.match(hook,/guestEffectiveReportedRef\.current=true/);
 assert.match(hook,/trackUsageEvent\(guestRole\(\)==="friend"\?"friend_conversation":"teacher_conversation"\)/);
 // Guest pages must remain excluded from side-effectful callback/history code.
 assert.match(hook,/if\(!guestModeRef\.current\)configRef\.current\.onTurnComplete\?\.\(turn,turnsRef\.current\.slice\(\)\)/);
 assert.match(hook,/if\(configRef\.current\.persistHistory!==false&&!guestModeRef\.current\)saveLive/);
 // Report counts distinct browsers for chat events, never connection-only events.
 assert.match(report,/const chatEvents=.*'teacher_conversation','friend_conversation'/);
 assert.doesNotMatch(report,/const chatEvents=.*'guest_trial_connected'/);
});

test("guest usage summary counts are explicitly labeled as non-cohort ratios",()=>{
 const dashboard=fs.readFileSync(path.join(root,"web-spa/src/analytics/UsageDashboardPage.tsx"),"utf8");
 const css=fs.readFileSync(path.join(root,"web-spa/src/analytics/usage-dashboard.css"),"utf8");
 const definitions=fs.readFileSync(path.join(root,"web-spa/src/analytics/usageDashboardDefinitions.ts"),"utf8");
 assert.match(definitions,/eventRatio=\(value:number,previous:number\)=>previous>0/);
 assert.match(dashboard,/不是同一批訪客的精準轉換率/);
 assert.match(dashboard,/guest_trial_unavailable/);
 assert.match(css,/usage-guest-overview/);
});

test("Souls anonymous funnel allows only fixed event/category combinations, including apex production",async()=>{
 const {onRequestPost}=compile("functions/api/usage/event.ts");
 const points=[],env={ANALYTICS_ENGINE:{writeDataPoint:point=>points.push(point)}};
 const steps=[
  ["explore_entry_click","souls"],["souls_open",""],
  ["souls_photo_ready",""],["souls_created","object"],["souls_created","person"],
  ["souls_live_attempt",""],["souls_live_connected",""],["souls_live_failed",""],
  ["souls_user_input",""],["souls_ai_replied",""],["souls_conversation",""],["souls_mask_repaired",""]
 ];
 for(const [event,detail] of steps){
  const response=await onRequestPost({request:request({...payload,event,detail}),env});
  assert.equal(response.status,204,event+":"+detail);
 }
 assert.equal(points.length,steps.length);
 const apex=new Request("https://3sssi.com/api/usage/event",{
  method:"POST",headers:{"Content-Type":"application/json","Origin":"https://3sssi.com"},
  body:JSON.stringify({...payload,event:"souls_open",detail:""})
 });
 assert.equal((await onRequestPost({request:apex,env})).status,204);
 for(const invalid of [
  {...payload,event:"souls_created",detail:"private-person-name"},
  {...payload,event:"souls_camera_frame",detail:""},
  {...payload,event:"souls_photo_ready",detail:"data:image/png;base64,PRIVATE"}
 ]){
  const response=await onRequestPost({request:request(invalid),env});
  assert.equal(response.status,400);
 }
 assert.equal(points.length,steps.length+1);
 const usage=fs.readFileSync(path.join(root,"web-spa/src/analytics/usage.ts"),"utf8");
 // Verify the client production gate, not an obsolete pre-Koolo hostname list.
 assert.ok(usage.includes('"koolo.app"'),"Koolo production hostname remains enabled");
 for(const host of ["www.3sssi.com","3sssi.com","koolo.app"]){
  const origin="https://"+host;
  const productionRequest=new Request(origin+"/api/usage/event",{
   method:"POST",headers:{"Content-Type":"application/json","Origin":origin},
   body:JSON.stringify({...payload,event:"souls_open",detail:""})
  });
  assert.equal((await onRequestPost({request:productionRequest,env})).status,204,host);
 }
 for(const host of ["evil.invalid","www.koolo.app"]){
  const origin="https://"+host;
  const rejected=new Request(origin+"/api/usage/event",{
   method:"POST",headers:{"Content-Type":"application/json","Origin":origin},
   body:JSON.stringify({...payload,event:"souls_open",detail:""})
  });
  assert.equal((await onRequestPost({request:rejected,env})).status,403,host);
 }
 const report=fs.readFileSync(path.join(root,"functions/api/usage/report.ts"),"utf8");
 assert.match(report,/souls_created/);
 assert.match(report,/souls_live_connected/);
 assert.match(report,/souls_conversation/);
 assert.match(report,/const chatEvents=.*souls_conversation/);
});

test("platform labels are strictly allowlisted; legacy clients remain compatible",async()=>{
 const {onRequestPost}=compile("functions/api/usage/event.ts");
 const points=[],env={ANALYTICS_ENGINE:{writeDataPoint:p=>points.push(p)}};
 for(const platform of ["web","pwa","android_shell"]){
  const response=await onRequestPost({request:request({...payload,platform}),env});
  assert.equal(response.status,204);
  assert.equal(points.at(-1).blobs[4],platform);
 }
 for(const platform of ["private-user","android",null,5]){
  const response=await onRequestPost({request:request({...payload,platform}),env});
  assert.equal(response.status,400);
 }
 assert.equal(points.length,3);
 const usage=fs.readFileSync(path.join(root,"web-spa/src/analytics/usage.ts"),"utf8");
 const client=fs.readFileSync(path.join(root,"web-spa/src/analytics/usagePlatform.ts"),"utf8");
 const report=fs.readFileSync(path.join(root,"functions/api/usage/report.ts"),"utf8");
 assert.match(usage,/platform:usagePlatform\(\)/);
 assert.match(client,/isCrewAndroidShell\(\)/);
 assert.match(client,/display-mode: standalone/);
 assert.match(report,/COUNT\(DISTINCT blob2\)/);
 assert.match(report,/blob5 IN/);
 assert.match(report,/platformBreakdown:/);
});


test("Koolo production analytics and Magic diagnostic contract",()=>{
 const client=fs.readFileSync(path.join(root,"web-spa/src/analytics/usage.ts"),"utf8");
 const report=fs.readFileSync(path.join(root,"functions/api/usage/report.ts"),"utf8");
 const dashboard=fs.readFileSync(path.join(root,"web-spa/src/analytics/UsageDashboardPage.tsx"),"utf8");
 assert.match(client,/\["www\.3sssi\.com","3sssi\.com","koolo\.app"\]\.includes\(location\.hostname\)/);
 assert.match(report,/COUNT\(DISTINCT blob4\) AS users FROM crew_usage WHERE /);
 assert.match(report,/magicDiagnostics:\{entrySessions:/);
 assert.match(dashboard,/Magic 事件診斷/);
 assert.match(dashboard,/unique\("magic_enter"\)/);
 assert.match(dashboard,/magicDiagnostics\.entrySessions/);
});
