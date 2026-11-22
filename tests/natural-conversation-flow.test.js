const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

function conversationFlow(){
 const source=read("web-spa/src/live/conversationFlow.ts").replace(/^import type .*;\s*$/gm,"");
 const js=stripTypeScriptTypes(source,{mode:"strip"}).replace(/\bexport\s+(?=(?:function|class))/g,"");
 const context={};vm.runInNewContext(js+"\nthis.flow={freeChatRhythmPrompt,ConversationFlowState,isBriefAcknowledgement,wantsToEndConversation};",context);
 return context.flow;
}

test("natural chat should react, share, explore, or pivot, not interrogate",()=>{
 const flow=conversationFlow();
 const p=flow.freeChatRhythmPrompt();
 assert.match(p,/SHARE/);assert.match(p,/PIVOT/);
 assert.match(p,/NOT have to ask a question/);
 assert.match(p,/Do not invent human experiences/);
});

test("two short replies or three consecutive questions trigger a pivot",()=>{
 const flow=conversationFlow();
 let state=new flow.ConversationFlowState();
 state.observe({input:"Yes",output:"Did you like it?"});
 assert.equal(state.needsPivot(),false);
 state.observe({input:"Okay.",output:"Which part?"});
 assert.equal(state.needsPivot(),true);
 assert.match(state.rescue("friend"),/Stop probing this subject/);
 assert.match(state.rescue("friend"),/NEVER switch to teaching/);
 state=new flow.ConversationFlowState();
 for(let i=0;i<3;i++)state.observe({input:"I took the train today.",output:"Really?"});
 assert.equal(state.needsPivot(),true);
 state.observe({input:"The train was late.",output:"That's frustrating."});
 assert.equal(state.needsPivot(),false);
});

test("short answers are narrow acknowledgements, not every short personal fact",()=>{
 const {isBriefAcknowledgement}=conversationFlow();
 assert.equal(isBriefAcknowledgement("No."),true);
 assert.equal(isBriefAcknowledgement("不知道"),true);
 assert.equal(isBriefAcknowledgement("My dog died."),false);
});

test("only free chat gets automatic silence rescue",()=>{
 const teacher=read("web-spa/src/teacher/LivePage.tsx");
 const friend=read("web-spa/src/friends/FriendLiveConversation.tsx");
 const hook=read("web-spa/src/live/useLiveSession.ts");
 const transport=read("crew-live.js");
 const policy=read("web-spa/src/teacher/teacherPolicy.ts");
 assert.match(friend,/conversationFlow:"friend"/);
 assert.match(teacher,/conversationFlow:!isRoleplay&&\(intent==="continue"\|\|s\.conversationMode==="natural"\)/);
 assert.match(hook,/rescueCountRef\.current>=\(kind==="friend"\?1:2\)/);
 assert.match(hook,/onInputTranscript:v=>\{[\s\S]*?cancelRescue\(\);cancelUnrecognizedSpeechTimer\(\);[\s\S]*?rescueCountRef\.current=0/);
 assert.match(transport,/realtimeInput:\{text:instruction\}/);
 assert.match(policy,/freeChatRhythmPrompt\(\)/);
 assert.match(policy,/\[CONVERSATION STYLE: ACTIVE SPEAKING COACH\]/);
});

test("conversation momentum offers one natural hook without mandatory question loops",()=>{
 const p=conversationFlow().freeChatRhythmPrompt();
 assert.match(p,/conversational hook/);
 assert.match(p,/detailed answer/);
 assert.match(p,/respect silence/);
 assert.match(p,/not unsolicited correction/i);
});

test("engagement adapts the first pause; second nudge is delayed and bounded",()=>{
 const {ConversationFlowState}=conversationFlow();
 const state=new ConversationFlowState();
 assert.equal(state.silenceDelayMs(0,"friend"),20000);
 assert.equal(state.silenceDelayMs(1,"friend"),30000);
 state.observe({input:"I had a wonderful time at the cinema with my family.",output:"What did you see?"});
 assert.equal(state.silenceDelayMs(0,"friend"),20000);
 state.observe({input:"Yes.",output:"Was it fun?"});
 state.observe({input:"Okay.",output:"Which part was your favorite?"});
 assert.equal(state.needsPivot(),true);
 assert.equal(state.silenceDelayMs(0,"teacher"),8000);
 assert.match(state.rescue("friend",0),/WITHOUT requiring an answer/);
 assert.match(state.rescue("teacher",0),/no drills or compulsory repetition/);
 assert.equal(state.silenceDelayMs(1,"teacher"),16000);
});

test("farewell stops silence recovery without stopping a new learner turn",()=>{
 const {ConversationFlowState,wantsToEndConversation}=conversationFlow();
 const state=new ConversationFlowState();
 state.observe({input:"Goodbye!",output:"See you next time."});
 assert.equal(state.shouldRescue(),false);
 assert.equal(wantsToEndConversation("Bye."),true);
 state.observe({input:"Actually, what was the movie called?",output:"It was a comedy."});
 assert.equal(state.shouldRescue(),true);
});

test("silence countdown uses ephemeral engagement state, not a hardcoded 14/20 second timer",()=>{
 const hook=read("web-spa/src/live/useLiveSession.ts");
 assert.match(hook,/cadenceRef\.current\.silenceDelayMs\(rescueCountRef\.current,kind\)/);
 assert.match(hook,/!cadenceRef\.current\.shouldRescue\(\)/);
 assert.match(hook,/if\(v==="connecting"\|\|v==="error"\)\{cancelRescue\(\);cancelFriendReplyTimer\(\);cancelUnrecognizedSpeechTimer\(\);setFriendPhase\("idle"\)\}/);
 assert.doesNotMatch(hook,/14000:20000/);
});

test("short meaningful replies stay on topic, unlike repeated empty acknowledgements",()=>{
 const {ConversationFlowState}=conversationFlow();
 const state=new ConversationFlowState();
 state.observe({input:"Comedy",output:"That would be fun."});
 state.observe({input:"I love it",output:"It sounds like your style."});
 assert.equal(state.needsPivot(),false);
 assert.equal(state.silenceDelayMs(0,"friend"),20000);
});
