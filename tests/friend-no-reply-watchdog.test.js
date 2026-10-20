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
 const factory=new Function("window","configRef","awaitingTutorRef","friendReplyRescueSentRef","session","sessionRef","cancelFriendReplyTimer","friendReplyTimerRef","setStatus",source.slice(from,to)+"\nreturn scheduleFriendReplyCheck;");
 const schedule=factory(window,configRef,awaitingTutorRef,friendReplyRescueSentRef,session,sessionRef,cancelFriendReplyTimer,friendReplyTimerRef,setStatus);
 const fire=()=>{const item=timers.entries().next().value;assert.ok(item,"a timer should be armed");const [id,{callback,ms}]=item;timers.delete(id);callback();return ms};
 return {schedule,fire,timers,requests,statuses,session,sessionRef,awaitingTutorRef,friendReplyRescueSentRef};
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
 assert.match(source,/onTerminal:info=>\{cancelRescue\(\);cancelFriendReplyTimer\(\)/);
 assert.match(source,/cancelRescue\(\);cancelFriendReplyTimer\(\);setState\("ending"\)/);
 assert.match(source,/const interrupt=useCallback\(\(\)=>\{[\s\S]*?cancelFriendReplyTimer\(\)/);
 assert.match(source,/trackUsageEvent\(chatKind==="teacher"\?"teacher_user_spoke"/);
 assert.match(source,/trackUsageEvent\(chatKind==="teacher"\?"teacher_ai_replied"/);
});