const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
function compile(file,bindings,names){
 const src=stripTypeScriptTypes(read(file),{mode:"strip"}).replace(/^import .*;\r?\n/g,"").replace(/^export /gm,"");
 return new Function(...Object.keys(bindings),src+"\nreturn {"+names.join(",")+"};")(...Object.values(bindings));
}
function journeyHarness(){
 const values=new Map(),events=[];
 let now=1000000;
 const sessionStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const api=compile("web-spa/src/analytics/homeFriendJourney.ts",{sessionStorage,Date:{now:()=>now},trackUsageEvent:(...args)=>events.push(args)},["beginHomeFriendJourney","advanceHomeFriendJourney"]);
 return {api,events,advanceTime:n=>{now+=n}};
}
test("only a primary home CTA attempt can advance, in order, once per stage",()=>{
 const {api,events}=journeyHarness();
 api.advanceHomeFriendJourney("zoe","reply");
 assert.deepEqual(events,[]);
 api.beginHomeFriendJourney("zoe",false);
 api.advanceHomeFriendJourney("other","verify");
 api.advanceHomeFriendJourney("zoe","verify");
 api.advanceHomeFriendJourney("zoe","verify");
 api.advanceHomeFriendJourney("zoe","reply");
 api.advanceHomeFriendJourney("zoe","reply");
 assert.deepEqual(events,["fresh_pick","fresh_verify","fresh_reply"].map(detail=>["home_friend_journey",detail]));
});
test("returning attempts expire, and an observed exchange confirms connection if the state effect has not run",()=>{
 const {api,events,advanceTime}=journeyHarness();
 api.beginHomeFriendJourney("zoe",true);
 advanceTime(31*60*1000);
 api.advanceHomeFriendJourney("zoe","reply");
 assert.equal(events.length,1);
 api.beginHomeFriendJourney("zoe",true);
 api.advanceHomeFriendJourney("zoe","reply");
 assert.deepEqual(events.slice(1),["resume_pick","resume_verify","resume_reply"].map(detail=>["home_friend_journey",detail]));
});
test("admin traffic is skipped by the real verified account allowlist, never by a claimed client flag",async()=>{
 const {verifyAccess}=compile("functions/api/usage/report.ts",{},["verifyAccess"]);
 const {onRequest}=compile("functions/api/usage/_middleware.ts",{verifyAccess},["onRequest"]);
 let reads=0,forwarded=0;
 const db={prepare:sql=>{assert.match(sql,/crew_auth_sessions/);return{bind:(hash,expiry)=>{assert.match(hash,/^[a-f0-9]{64}$/);assert.ok(expiry>0);return{first:async()=>{reads++;return {email:"admin@example.test"}}}}}}};
 const env={KOOLO_ADMIN_EMAILS:"admin@example.test",CREW_AUTH_DB:db};
 const next=async()=>{forwarded++;return new Response(null,{status:202})};
 const req=(headers={},route="/api/usage/event",method="POST")=>new Request("https://koolo.app"+route,{method,headers});
 assert.equal((await onRequest({request:req({"x-admin":"true"}),env,next})).status,202);
 assert.equal(reads,0);
 assert.equal((await onRequest({request:req({"cookie":"__Host-crew_session="+"A".repeat(43)}),env,next})).status,204);
 assert.equal(reads,1);
 assert.equal((await onRequest({request:req({"cookie":"__Host-crew_session="+"A".repeat(43)}),env:{...env,KOOLO_ADMIN_EMAILS:"other@example.test"},next})).status,202);
 assert.equal(reads,2);
 assert.equal((await onRequest({request:req({"cookie":"__Host-crew_session=invalid"}),env,next})).status,202);
 assert.equal(reads,2);
 assert.equal((await onRequest({request:req({"cookie":"__Host-crew_session="+"A".repeat(43)},"/api/usage/report","GET"),env,next})).status,202);
 assert.equal(reads,2);
 assert.equal(forwarded,4);
});
test("homepage keeps voice-first links and passes no raw topic to route or analytics",()=>{
 const mobile=read("web-spa/src/pages/MobileHomePage.tsx"),desktop=read("web-spa/src/pages/DesktopHomePage.tsx");
 const hook=read("web-spa/src/pages/useHomeFriendTopic.ts");
 for(const home of [mobile,desktop]){
  assert.match(home,/useHomeFriendTopic\(/);
  assert.match(home,/beginHomeFriendJourney\(/);
  assert.match(home,/chatChoices\.resume/);
  assert.doesNotMatch(home,/encodeURIComponent\(resumeTopic\)|trackUsageEvent\([^\n]*resumeTopic/);
 }
 assert.match(mobile,/to=\{voiceDestination\}/);
 assert.match(desktop,/to=\{voiceTo\}/);
 assert.match(hook,/import\("\.\.\/friends\/friendMemory"\)/);
 assert.match(hook,/memory.getHomeChatTopic\(friendId,language\)/);
 assert.match(hook,/note\.id!==friendId\|\|note\.language!==language/);
 const live=read("web-spa/src/friends/FriendLiveConversation.tsx");
 assert.match(live,/if\(bubbleEntry\)advanceHomeFriendJourney\(sessionId,"reply"\)/);
 assert.match(live,/lifeOpening:openingRecall.returning&&openingRecall.verifiedTopic\?"":lifeOpening/);
});
