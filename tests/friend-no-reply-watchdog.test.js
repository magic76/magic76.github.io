const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../web-spa/src/live/useLiveSession.ts"),"utf8");
function harness(kind="friend"){
 const from=source.indexOf("const scheduleFriendReplyCheck=");
 const to=source.indexOf("// Only Crew Teacher/Friends",from);
 assert.ok(from>0&&to>from,"watchdog must be present");
 const timers=new Map();let nextId=0;const requests=[],statuses=[];
 const window={
  setTimeout(callback,ms){const id=++nextId;timers.set(id,{callback,ms});return id},
  clearTimeout(id){timers.delete(id)}
 };
 const friendReplyTimerRef={current:null};
 const cancelFriendReplyTimer=()=>{if(friendReplyTimerRef.current!==null){window.clearTimeout(friendReplyTimerRef.current);friendReplyTimerRef.current=null}};
 const configRef={current:{sessionKind:kind,languageDirective:"Use Japanese only"}};
 const awaitingTutorRef={current:true},friendReplyRescueSentRef={current:false};
 const session={ready:true,running:true,micMuted:false,sendControl:message=>{requests.push(message);return true}};
 const sessionRef={current:session};
 const setStatus=status=>statuses.push(status);
 const phases=[];
 const setFriendPhase=phase=>phases.push(phase);
 const logFriendHealth=()=>{};
 const factory=new Function("window","configRef","awaitingTutorRef","friendReplyRescueSentRef","session","sessionRef","cancelFriendReplyTimer","friendReplyTimerRef","setStatus","setFriendPhase","logFriendHealth",source.slice(from,to)+"\nreturn scheduleFriendReplyCheck;");
 const schedule=factory(window,configRef,awaitingTutorRef,friendReplyRescueSentRef,session,sessionRef,cancelFriendReplyTimer,friendReplyTimerRef,setStatus,setFriendPhase,logFriendHealth);
 const fire=()=>{const item=timers.entries().next().value;assert.ok(item,"a timer should be armed");const [id,{callback,ms}]=item;timers.delete(id);callback();return ms};
 return {schedule,fire,timers,requests,statuses,phases,session,sessionRef,awaitingTutorRef,friendReplyRescueSentRef};
}
test("friend silence gets exactly one content-free nudge and then user guidance",()=>{
 const h=harness();
 h.schedule();
 assert.equal(h.fire(),11000);
 assert.equal(h.requests.length,1);
 assert.match(h.requests[0],/FRIEND UNANSWERED TURN/);
 assert.match(h.requests[0],/Use Japanese only/);
 assert.equal(h.fire(),10000);
 assert.equal(h.requests.length,1,"never issue a second recovery for the same turn");
 assert.equal(h.timers.size,0);
 assert.match(h.statuses.at(-1),/請再說一次/);
});
test("other session kinds and completed/disconnected turns cannot be rescued",()=>{
 const teacher=harness("teacher");teacher.schedule();
 assert.equal(teacher.timers.size,0);
 for(const change of [h=>{h.awaitingTutorRef.current=false},h=>{h.session.running=false},h=>{h.session.ready=false},h=>{h.session.micMuted=true},h=>{h.sessionRef.current=null}]){
  const h=harness();h.schedule();change(h);h.fire();
  assert.equal(h.requests.length,0);
 }
});
test("streaming transcript fragments do not reset rescue quota, and every terminal lifecycle cancels the timer",()=>{
 assert.match(source,/if\(firstFragment\)friendReplyRescueSentRef\.current=false/);
 assert.match(source,/if\(!friendReplyRescueSentRef\.current\)scheduleFriendReplyCheck\(\)/);
 assert.match(source,/onOutputTranscript:v=>\{[\s\S]*?cancelFriendReplyTimer\(\)/);
 assert.match(source,/onTurnComplete:turn=>\{[\s\S]*?cancelFriendReplyTimer\(\)/);
 assert.match(source,/onTerminal:info=>\{[^}]*cancelRescue\(\);cancelFriendReplyTimer\(\)/);
 assert.match(source,/cancelRescue\(\);cancelFriendReplyTimer\(\);[^\n]*setState\("ending"\)/);
 assert.match(source,/const interrupt=useCallback\(\(\)=>\{[\s\S]*?cancelFriendReplyTimer\(\)/);
 assert.match(source,/trackUsageEvent\(chatKind==="teacher"\?"teacher_user_spoke"/);
 assert.match(source,/trackUsageEvent\(chatKind==="teacher"\?"teacher_ai_replied"/);
});
test("friend missing-transcript watchdog uses sustained local speech and never invents a turn",()=>{
 const from=source.indexOf("const scheduleUnrecognizedSpeechCheck=");
 const to=source.indexOf("// Friend-only watchdog:",from);
 assert.ok(from>0&&to>from);
 const timers=new Map();let id=0,phase="pause";
 const window={setTimeout(fn,ms){timers.set(++id,{fn,ms});return id;},clearTimeout(key){timers.delete(key);}};
 const unrecognizedSpeechTimerRef={current:null};
 const cancelUnrecognizedSpeechTimer=()=>{if(unrecognizedSpeechTimerRef.current!==null){window.clearTimeout(unrecognizedSpeechTimerRef.current);unrecognizedSpeechTimerRef.current=null}};
 const configRef={current:{sessionKind:"friend"}};
 const awaitingTutorRef={current:false},voicePhaseRef={current:"pause"};
 const session={ready:true,running:true,micMuted:false};
 const sessionRef={current:session},statuses=[],health=[];
 const setStatus=v=>statuses.push(v);
 const setFriendPhase=v=>{phase=v;voicePhaseRef.current=v};
 const logFriendHealth=v=>health.push(v);
 const factory=new Function("window","configRef","session","sessionRef","awaitingTutorRef","voicePhaseRef",
  "unrecognizedSpeechTimerRef","cancelUnrecognizedSpeechTimer","setStatus","setFriendPhase","logFriendHealth",
  source.slice(from,to)+"\nreturn scheduleUnrecognizedSpeechCheck;");
 const schedule=factory(window,configRef,session,sessionRef,awaitingTutorRef,voicePhaseRef,
  unrecognizedSpeechTimerRef,cancelUnrecognizedSpeechTimer,setStatus,setFriendPhase,logFriendHealth);
 const trigger=()=>{const {fn,ms}=timers.values().next().value;timers.clear();fn();return ms;};
 schedule();assert.equal(trigger(),8000);
 assert.equal(phase,"no-transcript");
 assert.match(statuses.at(-1),/請再說一次/);
 assert.deepEqual(health,["local-speech-no-transcript"]);
 phase="pause";voicePhaseRef.current="pause";awaitingTutorRef.current=true;
 schedule();trigger();assert.equal(phase,"pause","server transcript suppresses no-transcript warning");
 awaitingTutorRef.current=false;session.micMuted=true;
 schedule();trigger();assert.equal(phase,"pause","muted microphone suppresses no-transcript warning");
 session.micMuted=false;session.ready=false;
 schedule();trigger();assert.equal(phase,"pause","disconnected session suppresses no-transcript warning");
 configRef.current.sessionKind="teacher";session.ready=true;
 schedule();assert.equal(timers.size,0,"teacher never inherits friend-only watchdog");
});

test("friend display and watchdog cleanup are separate from actual Gemini VAD",()=>{
 const friend=fs.readFileSync(path.join(__dirname,"../web-spa/src/friends/FriendLiveConversation.tsx"),"utf8");
 const transport=fs.readFileSync(path.join(__dirname,"../crew-live.js"),"utf8");
 assert.match(friend,/friendVoiceStatus/);
 assert.match(friend,/no-transcript/);
 assert.match(friend,/no-reply/);
 assert.match(friend,/t\("controls\.reconnect"\)/);
 assert.equal(JSON.parse(fs.readFileSync(path.join(__dirname,"../web-spa/src/i18n/locales/zh-TW/voice.json"),"utf8")).controls.reconnect,"重新連線");
 assert.match(source,/onLocalUtteranceEnd:\(\)=>\{/);
 assert.match(source,/cancelUnrecognizedSpeechTimer\(\);setFriendPhase\("idle"\)/);
 assert.match(source,/if\(configRef\.current\.sessionKind==="friend"\)scheduleFriendReplyCheck\(\)/,
  "reconnected unfinished friend utterances must be watched again");
 assert.doesNotMatch(transport,/realtimeInput:\{\s*activityEnd/);
});
