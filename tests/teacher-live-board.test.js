const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=require("node:path").resolve(__dirname,"..");
const protocol=fs.readFileSync(root+"/web-spa/src/teacher/boardProtocol.ts","utf8");
const src=stripTypeScriptTypes(protocol,{mode:"strip"}).replace(/\bexport\s+(?=(?:const|function)\b)/g,"");
const board={};
vm.runInNewContext(src+"\nObject.assign(board,{validateBoardPatch,applyBoardPatch,fallbackBoard,boardNotes,BOARD_TOOLS});",{board});
const sample={id:"rule",type:"comparison",title:"Have been",body:"Grammar",pairs:[{source:"have been",target:"until now"}]};

test("model board payload is data only with strict limits, no arbitrary HTML",()=>{
 const parsed=board.validateBoardPatch({action:"upsert",cards:[{...sample,title:"<script>alert(1)</script>"}]});
 assert.ok(parsed);
 assert.equal(parsed.cards[0].title.includes("<"),false);
 assert.equal(parsed.cards[0].questions.length,0);
 assert.equal(board.validateBoardPatch({action:"upsert",cards:[{...sample,id:"../../../etc/passwd"}]}),null);
 assert.equal(board.validateBoardPatch({action:"upsert",cards:[{...sample,type:"iframe"}]}),null);
 assert.equal(board.validateBoardPatch({action:"upsert",cards:new Array(13).fill(sample)}),null);
 assert.equal(board.validateBoardPatch({action:"upsert",cards:[{...sample,body:"x".repeat(17000)}]}),null);
 assert.equal(board.BOARD_TOOLS[0].functionDeclarations[0].name,"update_teaching_board");
});
test("upsert edits stable cards; replace, remove and notes remain session-only",()=>{
 const first=board.validateBoardPatch({action:"upsert",cards:[sample]});
 const list=board.applyBoardPatch([],first);
 assert.equal(list.length,1);
 const edited=board.applyBoardPatch(list,board.validateBoardPatch({action:"upsert",cards:[{...sample,title:"Simplified"}]}));
 assert.equal(edited.length,1);
 assert.equal(edited[0].title,"Simplified");
 assert.equal(list[0].title,"Have been");
 assert.match(board.boardNotes(edited),/until now/);
 assert.equal(board.applyBoardPatch(edited,{action:"remove",cards:[],ids:["rule"]}).length,0);
 assert.equal(board.applyBoardPatch(edited,{action:"replace",cards:[{...sample,id:"quiz"}],ids:[]})[0].id,"quiz");
});
test("deterministic no-second-model fallback provides timelines, simpler explanation and a 3-question quiz",()=>{
 const first=board.fallbackBoard({input:"have been 跟 had been 差在哪裡？",output:"Let me explain"},[]);
 const cards=board.applyBoardPatch([],first);
 assert.equal(cards.some(c=>c.type==="comparison"),true);
 assert.equal(cards.some(c=>c.type==="timeline"),true);
 const simpler=board.applyBoardPatch(cards,board.fallbackBoard({input:"可以再簡單一點嗎？",output:"Sure"},cards));
 assert.equal(simpler.length,3);
 assert.ok(simpler[0].body.length<cards[0].body.length);
 const quiz=board.applyBoardPatch(simpler,board.fallbackBoard({input:"考我三題",output:"Try these"},simpler));
 assert.equal(quiz.length,1);
 assert.equal(quiz[0].questions.length,3);
 assert.equal(quiz[0].questions[1].answerIndex,1);
});
test("runtime and feature boundaries preserve ordinary Teacher/Friend without tools or board memory persistence",()=>{
 const runtime=fs.readFileSync(root+"/crew-live.js","utf8");
 const hook=fs.readFileSync(root+"/web-spa/src/live/useLiveSession.ts","utf8");
 const page=fs.readFileSync(root+"/web-spa/src/teacher/TeacherBoardPage.tsx","utf8");
 const app=fs.readFileSync(root+"/web-spa/src/App.tsx","utf8");
 assert.match(runtime,/self\.options\.tools&&self\.options\.tools\.length/);
 assert.match(runtime,/toolResponse:\{functionResponses:responses\}/);
 assert.match(hook,/pageKey==="teacher-board"/);
 assert.match(page,/persistHistory:false,sessionKind:"teacher"/);
 assert.match(page,/teacherReport:false,trackSpeakingLevel:false/);
 assert.doesNotMatch(page,/rememberTeacherConversation|ingestStudentReport|saveLive\(/);
 assert.match(app,/path="\/teacher\/board"/);
});
class Socket{
 static instances=[];
 constructor(){this.sent=[];this.readyState=0;Socket.instances.push(this)}
 send(v){this.sent.push(JSON.parse(v))}
 close(){this.readyState=3}
 open(){this.readyState=1;this.onopen?.()}
 message(v){this.onmessage?.({data:JSON.stringify(v)})}
}
class Audio{
 constructor(){this.started=Date.now();this.sampleRate=48000;this.destination={}}
 get currentTime(){return (Date.now()-this.started)/1000}
 async resume(){}async close(){}
 createGain(){return {gain:{value:1},connect(){},disconnect(){}}}
 createMediaStreamSource(){return {connect(){},disconnect(){}}}
 createScriptProcessor(){return {connect(){},disconnect(){}}}
}
const live=require("../crew-live.js");
const deps=()=>({WebSocket:Socket,getKey:()=>"unit-test-key",getUserMedia:async()=>({getTracks:()=>[{stop(){}}],getAudioTracks:()=>[]}),createAudioContext:()=>new Audio(),logger:{info(){},warn(){}}});
async function waitForSocket(index){for(let i=0;i<80;i++){if(Socket.instances[index])return Socket.instances[index];await new Promise(r=>setTimeout(r,2))}throw Error("Missing socket "+index)}
test("Gemini Live tool events are acknowledged on the same socket; no extra model call",async()=>{
 Socket.instances=[];
 const calls=[];
 const session=new live.Session({models:["gemini-3.1-flash-live-preview"],maxLiveAttempts:1,connectTimeoutMs:300,deps:deps(),
  tools:[{functionDeclarations:[{name:"update_teaching_board"}]}],
  onToolCall:call=>{calls.push(call);return {ok:true}}
 });
 const starting=session.start();
 const socket=await waitForSocket(0);socket.open();
 assert.equal(socket.sent[0].setup.tools[0].functionDeclarations[0].name,"update_teaching_board");
 socket.message({setupComplete:{}});await starting;
 socket.message({toolCall:{functionCalls:[{id:"tool-1",name:"update_teaching_board",args:{action:"upsert",cards:[]}}]}});
 assert.equal(calls.length,1);
 const response=socket.sent.find(m=>m.toolResponse);
 assert.deepEqual(response.toolResponse.functionResponses[0].response,{ok:true});
 assert.equal(response.toolResponse.functionResponses[0].id,"tool-1");
 assert.equal(Socket.instances.length,1);
 await session.stop({silentStatus:true,emitTerminal:false});
});
test("unsupported tools retry selected model without tools and without switching model",async()=>{
 Socket.instances=[];let fallback=0;
 const session=new live.Session({models:["gemini-3.1-flash-live-preview"],maxLiveAttempts:1,connectTimeoutMs:300,deps:deps(),
  tools:[{functionDeclarations:[{name:"update_teaching_board"}]}],
  onToolsUnavailable:()=>fallback++
 });
 const starting=session.start();
 const first=await waitForSocket(0);first.open();
 first.message({error:{code:400,status:"INVALID_ARGUMENT",message:"function tools not supported"}});
 const second=await waitForSocket(1);second.open();
 assert.equal(second.sent[0].setup.model,"models/gemini-3.1-flash-live-preview");
 assert.equal(second.sent[0].setup.tools,undefined);
 second.message({setupComplete:{}});await starting;
 assert.equal(fallback,1);assert.equal(session.model,"gemini-3.1-flash-live-preview");
 await session.stop({silentStatus:true,emitTerminal:false});
});

test("stage supports distinct cards with bounded JSON payloads",()=>{
 const cards=[
  {id:"walkthrough",type:"steps",title:"How it works",points:[{label:"First",note:"Read the sentence"},{label:"Then",note:"Speak aloud"}]},
  {id:"memory-card",type:"flashcard",title:"Recall",pairs:[{source:"apple",target:"蘋果"}]},
  {id:"roleplay",type:"dialogue",title:"At the shop",pairs:[{source:"Staff",target:"How may I help you?"}]}
 ];
 const patch=board.validateBoardPatch({action:"upsert",cards});
 assert.ok(patch);
 assert.deepEqual(Array.from(patch.cards,x=>x.type),["steps","flashcard","dialogue"]);
 assert.match(JSON.stringify(board.BOARD_TOOLS),/"flashcard"/);
 assert.match(JSON.stringify(board.BOARD_TOOLS),/"dialogue"/);
 assert.match(board.boardNotes(patch.cards),/How may I help you/);
});
test("generic fallback can show real spoken sentences as steps without making up material",()=>{
 const speech="First, we will explain how this works. Next, try to practice with your own examples. Finally, check the result.";
 const patch=board.fallbackBoard({input:"Please teach me this process",output:speech},[]);
 assert.equal(patch.cards[0].type,"steps");
 assert.equal(patch.cards[0].points.length,3);
 assert.ok(patch.cards[0].points.every(x=>speech.includes(x.note)));
});
test("teacher board shows one focused stage with explicit lesson tabs and follow-latest control",()=>{
 const page=fs.readFileSync(root+"/web-spa/src/teacher/TeacherBoardPage.tsx","utf8");
 const cards=fs.readFileSync(root+"/web-spa/src/teacher/TeachingCard.tsx","utf8");
 const styles=fs.readFileSync(root+"/web-spa/src/teacher/teachingBoard.css","utf8");
 assert.match(page,/className=\{"teaching-board-stage"/);
 assert.match(page,/role="tablist"/);
 assert.match(page,/setFollowing\(false\)/);
 assert.match(page,/setFollowing\(true\)/);
 assert.doesNotMatch(page,/teaching-board-stack/);
 assert.match(cards,/function Flashcards/);
 assert.match(cards,/function Dialogue/);
 assert.match(cards,/function Steps/);
 assert.match(cards,/const \[localStep,setLocalStep\]/);
 assert.match(styles,/\.teaching-board-stage\{height:auto;min-height:/);
 assert.doesNotMatch(styles,/\.teaching-board-stage\{[^}]*overflow-y:auto/);
});

test("new or revised teaching cards resume live focus after manual browsing",()=>{
 const page=fs.readFileSync(root+"/web-spa/src/teacher/TeacherBoardPage.tsx","utf8");
 const commit=page.split("function commitPatch(patch:BoardPatch):boolean{")[1]?.split("\n const live=useLiveSession({")[0]||"";
 assert.ok(commit,"Board patch handler must exist");
 assert.match(commit,/if\(changedId&&followingRef\.current\)\{setFocusedId\(null\)\}/);
 assert.match(commit,/setLatestId\(changedId\)/);
 assert.match(page,/record\("card-selected",\{cardId:card\.id\}\);setFollowing\(false\);setFocusedId\(card\.id\)/);
 // The visible stage is driven by the newly updated ID once following resumes.
 assert.match(page,/following\?latestId:focusedId/);
 assert.match(page,/ref=\{deckRef\} role="tablist"/);
 assert.match(page,/rail\.getBoundingClientRect\(\)/);
 assert.doesNotMatch(page,/stage\.scrollTop/);
});
