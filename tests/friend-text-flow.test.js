const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
function load(file,names){
 const source=stripTypeScriptTypes(read(file),{mode:"strip"}).replace(/^export /gm,"");
 const context={};
 vm.runInNewContext(source+"\nObject.assign(this,{"+names.join(",")+"});",context,{filename:file});
 return context;
}
function memoryStorage(){
 const values=new Map();
 return{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v))};
}
test("Friend transcript is recoverable after text → voice → text in one tab, scoped per friend",()=>{
 const {readSessionTranscript,writeSessionTranscript}=load("web-spa/src/live/sessionTranscript.ts",["readSessionTranscript","writeSessionTranscript"]);
 const store=memoryStorage();
 writeSessionTranscript("friend:zoe",[{role:"user",text:"Hello"},{role:"assistant",text:"Hi!"}],store);
 const restored=readSessionTranscript("friend:zoe",store);
 assert.deepEqual(Array.from(restored,m=>[m.role,m.text]),[["user","Hello"],["assistant","Hi!"]]);
 assert.equal(readSessionTranscript("friend:ada",store).length,0);
 assert.equal(readSessionTranscript("",store).length,0);
 assert.ok(store.getItem("crew_text_transcript_v1:friend:zoe"));
 const friend=read("web-spa/src/friends/FriendLivePage.tsx");
 const panel=read("web-spa/src/live/TextChatPanel.tsx");
 assert.match(friend,/sessionScope=\{"friend:"\+friend\.id/);
 assert.match(panel,/readSessionTranscript\(sessionScope\)/);
 assert.match(panel,/writeSessionTranscript\(sessionScope,latestMessages\.current\)/);
 assert.doesNotMatch(panel,/localStorage\./);
});
test("Guest can send before an active phase: wait for Turnstile, start, then send",async()=>{
 const {sendGuestTextWithRenewal}=load("web-spa/src/live/guestTextFlow.ts",["sendGuestTextWithRenewal"]);
 const actions=[];
 const result=await sendGuestTextWithRenewal({
  token:"",acquire:async()=>{actions.push("Turnstile → start");return "grant"},
  invalidate:()=>actions.push("invalid"),
  send:async token=>{actions.push("send:"+token+":hello");return{reply:"Hello!"}}
 });
 assert.equal(result.reply,"Hello!");
 assert.deepEqual(actions,["Turnstile → start","send:grant:hello"]);
 const panel=read("web-spa/src/live/TextChatPanel.tsx");
 assert.match(panel,/acquire:startGuestText/);
 assert.match(panel,/await waitForChallenge\(\)/);
 assert.match(panel,/if\(!key&&guestPhase==="error"\)setGuestPhase\("ready"\)/);
 assert.doesNotMatch(panel,/guestMode&&guestPhase!=="active"/);
 assert.match(panel,/disabled=\{busy\|\|\(guestMode&&\(guestPhase==="unavailable"\|\|guestPhase==="exhausted"\)\)\}/);
});
test("SESSION_EXPIRED invalidates first grant and resends same turn only once",async()=>{
 const {sendGuestTextWithRenewal}=load("web-spa/src/live/guestTextFlow.ts",["sendGuestTextWithRenewal"]);
 const actions=[],text="What is your favourite food?";
 const result=await sendGuestTextWithRenewal({
  token:"stale",invalidate:()=>actions.push("remove stale"),
  acquire:async()=>{actions.push("new Turnstile → start");return "fresh"},
  send:async token=>{actions.push(["send",token,text]);return token==="stale"?{code:"SESSION_EXPIRED"}:{reply:"Pizza"}}
 });
 assert.equal(result.reply,"Pizza");
 assert.deepEqual(actions.map(x=>Array.isArray(x)?x[1]:x),["stale","remove stale","new Turnstile → start","fresh"]);
 let sends=0,starts=0,invalidations=0;
 await assert.rejects(sendGuestTextWithRenewal({token:"stale",invalidate:()=>invalidations++,
  acquire:async()=>{starts++;return "fresh"},send:async()=>{sends++;return{code:"SESSION_EXPIRED"}}
 }),/SESSION_EXPIRED/);
 assert.equal(sends,2);assert.equal(starts,1);assert.equal(invalidations,2);
 // DAILY_LIMIT/TOO_FAST are not expired grants, so they cannot auto-start or resend.
 for(const code of ["DAILY_LIMIT","TOO_FAST"]){
  let calls=0;
  const blocked=await sendGuestTextWithRenewal({token:"live",invalidate:()=>{throw Error("unexpected invalidation")},
   acquire:async()=>{throw Error("unexpected start")},send:async()=>{calls++;return{code}}
  });
  assert.equal(blocked.code,code);assert.equal(calls,1);
 }
});
test("Friend text screen pins composer while transcript alone scrolls",()=>{
 const css=read("web-spa/src/live/TextChatPanel.css")+read("web-spa/src/friends/friends.css");
 const page=read("web-spa/src/friends/FriendLivePage.tsx");
 assert.match(css,/\.friend-text-stage \.crew-text-chat-history\{flex:1;min-height:0;max-height:none/);
 assert.match(css,/\.friend-desktop-workspace>\.friend-text-stage\{/);
 assert.match(page,/viewport\?\.height\|\|window\.innerHeight/);
 assert.match(page,/friend-text-stage/);
});
