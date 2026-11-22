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
 return{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
}
test("Friend text is ephemeral, Teacher course transcripts still restore",()=>{
 const {readSessionTranscript,writeSessionTranscript}=load("web-spa/src/live/sessionTranscript.ts",["readSessionTranscript","writeSessionTranscript"]);
 const store=memoryStorage(),exchange=[{role:"user",text:"Hello"},{role:"assistant",text:"Hi!"}];
 writeSessionTranscript("friend:zoe",exchange,store);
 assert.equal(store.getItem("crew_text_transcript_v1:friend:zoe"),null);
 assert.equal(readSessionTranscript("friend:zoe",store).length,0);
 writeSessionTranscript("teacher:course:daily_u1_l1",exchange,store);
 assert.deepEqual(Array.from(readSessionTranscript("teacher:course:daily_u1_l1",store),m=>m.text),["Hello","Hi!"]);
 const friend=read("web-spa/src/friends/FriendLiveConversation.tsx"),panel=read("web-spa/src/live/TextChatPanel.tsx");
 assert.match(friend,/<FriendUnifiedComposer live=\{live\}/);
 assert.match(panel,/if\(!isFriend\)writeSessionTranscript\(sessionScope,complete\)/);
 assert.doesNotMatch(panel,/saveFriendResume|Previous conversation for continuity|TextChatWelcomeBack/);
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
 assert.match(panel,/disabled=\{busy\|\|\(guestMode&&\(guestPhase==="unavailable"\|\|guestPhase==="exhausted"\|\|guestPhase==="paused"\)\)\}/);
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
 const page=read("web-spa/src/friends/FriendLiveConversation.tsx")+read("web-spa/src/friends/useFriendTextViewport.ts");
 assert.match(css,/\.friend-text-stage \.crew-text-chat-history\{flex:1;min-height:0;max-height:none/);
 assert.match(css,/\.friend-desktop-workspace>\.friend-text-stage\{/);
 assert.match(page,/viewport\?\.height\|\|window\.innerHeight/);
 assert.match(page,/useFriendTextViewport\(true,textStage\)/);
});

test("Interrupted verification restores a retryable draft without persisting a ghost turn",()=>{
 const {readSessionTranscript,writeSessionTranscript,readPendingTextDraft,writePendingTextDraft,clearPendingTextDraft}=
  load("web-spa/src/live/sessionTranscript.ts",["readSessionTranscript","writeSessionTranscript","readPendingTextDraft","writePendingTextDraft","clearPendingTextDraft"]);
 const store=memoryStorage();
 const scope="teacher:course:daily_u1_l1",complete=[{role:"user",text:"Hi"},{role:"assistant",text:"Hello"}];
 writeSessionTranscript(scope,complete,store);
 writePendingTextDraft(scope,{text:"I haven't verified yet",sent:false},store);
 assert.equal(readPendingTextDraft(scope,store).text,"I haven't verified yet");
 assert.equal(readPendingTextDraft(scope,store).sent,false);
 assert.equal(readSessionTranscript(scope,store).length,2,"pending input is not a committed user turn");
 writePendingTextDraft(scope,{text:"Actually sent",sent:true},store);
 assert.equal(readPendingTextDraft(scope,store).sent,true,"mid-flight retries disclose possible quota usage");
 clearPendingTextDraft(scope,store);
 assert.equal(readPendingTextDraft(scope,store),null);
 const panel=read("web-spa/src/live/TextChatPanel.tsx");
 assert.match(panel,/pendingSend\.current=\{before:messages,value,sent:false\}/);
 assert.match(panel,/writePendingTextDraft\(sessionScope,\{text:value,sent:false\}\)/);
 assert.match(panel,/writeSessionTranscript\(sessionScope,pendingSend\.current\?\.before\|\|messages\)/);
 assert.match(panel,/writeSessionTranscript\(sessionScope,pendingSend\.current\?\.before\|\|latestMessages\.current\)/);
 assert.match(panel,/const dangling=saved\.at\(-1\)\?\.role==="user"\?saved\.pop\(\)\?\.text/);
 assert.match(panel,/if\(pending\|\|dangling\)/);
 assert.match(panel,/clearPendingTextDraft\(sessionScope\)/);
});
test("During Turnstile / connection, the friend must not be labelled as typing",()=>{
 const panel=read("web-spa/src/live/TextChatPanel.tsx");
 const text=panel.slice(panel.indexOf("return <section"));
 assert.match(text,/busy&&requestSent&&messages\.at\(-1\)\?\.role!=="assistant"/);
 assert.doesNotMatch(text,/\{busy&&messages\.at\(-1\)\?\.role!=="assistant"/);
 assert.match(panel,/setRequestSent\(false\)/);
 assert.match(panel,/setRequestSent\(true\)/);
 assert.match(panel,/markDispatched\(\);setRequestSent\(true\);/);
 assert.match(text,/pendingSend\.current&&!pendingSend\.current\.sent/);
 assert.match(text,/t\("textChat\.ui\.notSent"\)/);
 const zhPending=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/voice.json")).textChat.ui.notSent;
 assert.match(zhPending,/等待驗證・尚未送出/);
 assert.match(panel,/await waitForChallenge\(\)/);
});
test("Restored Turnstile layout re-scrolls history after widget resize",()=>{
 const panel=read("web-spa/src/live/TextChatPanel.tsx");
 const css=read("web-spa/src/live/TextChatPanel.css");
 assert.match(panel,/new ResizeObserver\(/);
 assert.match(panel,/observer\.observe\(log\)/);
 assert.match(panel,/observer\.observe\(guest\)/);
 assert.match(panel,/log\.scrollTop=log\.scrollHeight/);
 assert.match(css,/\.friend-text-stage \.crew-text-guest\{order:1\}/);
 assert.match(css,/\.friend-text-stage \.crew-text-chat-history\{order:0\}/);
});
test("390px composer uses actual viewport header/shell offset, not hardcoded 104px",()=>{
 const css=read("web-spa/src/friends/friends.css")+read("web-spa/src/live/TextChatPanel.css");
 const page=read("web-spa/src/friends/FriendLiveConversation.tsx")+read("web-spa/src/friends/useFriendTextViewport.ts");
 assert.doesNotMatch(css,/viewport-height,100dvh\) - 104px/);
 assert.match(css,/--crew-friend-stage-top/);
 assert.match(css,/\.friend-text-stage \.crew-text-chat-form\{flex:0 0 auto;margin-top:auto\}/);
 assert.match(css,/\.friend-live-page:has\(\.friend-text-stage\)\{padding:8px 0 0\}/);
 assert.match(page,/getBoundingClientRect\(\)\.top-\(viewport\?\.offsetTop\|\|0\)/);
});

// Teacher parity.css keeps a large spacer for its fixed voice dock.
// The friend text stage must out-specify that rule, not just set generic padding.
test("Voice-dock padding cannot push the friend text composer away from viewport bottom",()=>{
 const friend=read("web-spa/src/friends/friends.css");
 assert.match(friend,/@media\(max-width:640px\)\{\s*body\.teacher-theme\.session-page \.friend-text-stage\.live-stage\{padding-bottom:calc\(6px \+ env\(safe-area-inset-bottom,0px\)\)\}/);
 const paritySelector="body.teacher-theme.session-page .live-stage";
 assert.ok("body.teacher-theme.session-page .friend-text-stage.live-stage".split(/[ .]+/).length>paritySelector.split(/[ .]+/).length);
});

test("Activity pointer remains usable without a friend resume or text preview",()=>{
 const local=memoryStorage(),tab=memoryStorage();
 const source=stripTypeScriptTypes(read("web-spa/src/live/sessionTranscript.ts"),{mode:"strip"}).replace(/^export /gm,"");
 const context={localStorage:local,sessionStorage:tab};
 vm.runInNewContext(source+"\nObject.assign(this,{readSessionTranscript,writeSessionTranscript,recordFriendActivity,readLatestFriendActivity});",context);
 const transcript=[{role:"user",text:"I like cycling"},{role:"assistant",text:"Where do you ride?"}];
 context.writeSessionTranscript("friend:zoe",transcript);
 assert.equal(tab.getItem("crew_text_transcript_v1:friend:zoe"),null);
 context.recordFriendActivity("zoe","text");
 assert.equal(context.readLatestFriendActivity().friendId,"zoe");
 assert.equal(context.readLatestFriendActivity().resume,null);
 context.recordFriendActivity("noah","voice");
 assert.equal(context.readLatestFriendActivity().friendId,"noah");
 context.recordFriendActivity("INVALID FRIEND","voice");
 assert.equal(context.readLatestFriendActivity().friendId,"noah");
 assert.equal(local.getItem("crew_friend_text_resume_v1"),null);
 assert.equal(context.readSessionTranscript("friend:zoe").length,0);
 assert.match(read("web-spa/src/friends/FriendLiveConversation.tsx"),/starters=\{\[gameRoundStarter\(/);
});
