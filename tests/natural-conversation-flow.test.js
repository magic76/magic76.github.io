const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

function conversationFlow(){
 const source=read("web-spa/src/live/conversationFlow.ts").replace(/^import type .*;\s*$/gm,"");
 const js=stripTypeScriptTypes(source,{mode:"strip"}).replace(/\bexport\s+(?=(?:function|class))/g,"");
 const context={};vm.runInNewContext(js+"\nthis.flow={freeChatRhythmPrompt,ConversationFlowState,isBriefAcknowledgement};",context);
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
 const friend=read("web-spa/src/friends/FriendLivePage.tsx");
 const hook=read("web-spa/src/live/useLiveSession.ts");
 const transport=read("crew-live.js");
 const policy=read("web-spa/src/teacher/teacherPolicy.ts");
 assert.match(friend,/conversationFlow:"friend"/);
 assert.match(teacher,/conversationFlow:!isRoleplay&&s\.conversationMode==="natural"/);
 assert.match(hook,/rescueCountRef\.current>=2/);
 assert.match(hook,/onInputTranscript:v=>\{if\(v\.trim\(\)\)\{cancelRescue\(\)/);
 assert.match(transport,/realtimeInput:\{text:instruction\}/);
 assert.match(policy,/freeChatRhythmPrompt\(\)/);
 assert.match(policy,/\[CONVERSATION STYLE: ACTIVE SPEAKING COACH\]/);
});
