const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const read=file=>readFileSync(path.resolve(__dirname,"..",file),"utf8");
const source=read("web-spa/src/live/liveEngagement.ts");
const compiled=stripTypeScriptTypes(source,{mode:"strip"}).replace("export function ","function ");
const isValid=new Function(compiled+"\nreturn hasConfirmedTwoSidedExchange;")();
const hook=read("web-spa/src/live/useLiveSession.ts");
const soulChat=read("web-spa/src/souls/SoulChat.tsx");

test("proactive AI greetings or user-only text never count as a Souls conversation",()=>{
 assert.equal(isValid({hasValidOutput:true,input:"",output:"Hello!"},[]),false);
 assert.equal(isValid({hasValidOutput:true,input:"Hi",output:""},[]),false);
 assert.equal(isValid({hasValidOutput:false,input:"Hi",output:"Hello!"},[]),false);
 assert.equal(isValid({hasValidOutput:true},[{input:"Hi",output:""}]),false);
});
test("counts only valid two-sided output, including completed transcript ref on a late callback",()=>{
 assert.equal(isValid({hasValidOutput:true,input:"Hello",output:"Hey!"},[]),true);
 assert.equal(isValid({hasValidOutput:true},[{input:"First",output:""}, {input:"Hi",output:"Okay!"}]),true);
 assert.equal(isValid({hasValidOutput:false},[{input:"Hi",output:"Okay!"}]),false);
});
test("Souls use Friends voice recovery but never borrow Friends speech/reply usage counters",()=>{
 assert.match(soulChat,/sessionKind:"friend",usageKind:"souls",conversationFlow:"friend"/);
 assert.match(hook,/configRef\.current\.usageKind==="souls"\?"souls"/);
 assert.match(hook,/chatKind==="souls"\?"souls_user_spoke"/);
 assert.match(hook,/chatKind==="souls"\?"souls_ai_replied"/);
 assert.match(hook,/if\(chatKind==="souls"&&!completedExchange&&hasConfirmedTwoSidedExchange\(turn,turnsRef\.current\)\)/);
 assert.match(hook,/completedExchange=true;\s*trackUsageEvent\("souls_conversation"\)/);
 assert.match(hook,/let learnerSpoke=false,aiReplied=false,completedExchange=false/);
});
test("track a two-sided Souls conversation in the Live transport before guest callback gating",()=>{
 const first=hook.indexOf('trackUsageEvent("souls_conversation")');
 const guard=hook.indexOf('if(!guestModeRef.current)configRef.current.onTurnComplete?.');
 assert.ok(first>=0&&guard>first,"Guest Souls should count real conversations too");
 assert.match(soulChat,/onTurnComplete:\(_turn,turns\)=>capture\(turns\)/);
});
