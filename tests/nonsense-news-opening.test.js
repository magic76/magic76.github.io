const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const read=name=>fs.readFileSync(path.resolve(__dirname,"../web-spa/src/games",name),"utf8");
const asJS=source=>stripTypeScriptTypes(source.replace(/^import .*$/gm,""),{mode:"strip"}).replace(/^export /gm,"");
const {NewsRoundTracker}=new Function(asJS(read("nonsenseDirector.ts"))+"\nreturn {NewsRoundTracker};")();
const topic={id:"elevator",category:"city",zh:"電梯集體罷工",en:"All elevators are on strike"};
const breaking={type:"breaking",headline:"Breaking!",detail:"Unbelievable",question:"What happened?",character:"Anchor",ticker:"LIVE",reaction:"",options:[],audience:null,ending:"",outcome:null};

async function liveHarness(totalRounds=5){
 let callbacks,session,opening=[],spoken=[],ready=0,started=0,finished=0;
 class FakeSession{
  ready=false;micMuted=false;
  constructor(opts){callbacks=opts;session=this;}
  async start(){this.ready=true;callbacks.onState("ready");}
  async stop(){this.ready=false;}
  toggleMic(){this.micMuted=!this.micMuted;return this.micMuted;}
  sendText(text){opening.push(text);return true;}
  async waitForPlaybackDrain(){return;}
 }
 const window={CrewLive:{Session:FakeSession}};
 const start=new Function("ensureLive","geminiKey","normalizeLiveVoice","parseNewsScene","NewsRoundTracker","parseDirectorEvent","directorToolKind","window",
  asJS(read("nonsenseNewsLive.ts"))+"\nreturn startNonsenseNewsLive;")(
  async()=>{},()=> "test-key",value=>value,args=>args,NewsRoundTracker,()=>({}),()=>null,window
 );
 const controller=await start(topic,"zh",{
  onScene:()=>{},onDirector:()=>{},onPlayerTurn:(input)=>spoken.push(input),
  onHostDraft:()=>{},onPlayerDraft:()=>{},onReady:()=>{ready++;},
  onIntroReady:()=>{started++;},onSpeaking:()=>{},onChoiceBusy:()=>{},
  onDone:()=>{finished++;},onFailure:reason=>{throw Error(reason);}
 },"Puck",totalRounds);
 return {session,callbacks,controller,opening,spoken,get ready(){return ready},get started(){return started},get finished(){return finished}};
}

test("opening sends exactly one explicit cue and shields the microphone until host audio drains",async()=>{
 const h=await liveHarness();
 try{
  assert.equal(h.ready,1);
  assert.equal(h.session.micMuted,true);
  assert.equal(h.callbacks.openingPrompt,"");
  h.callbacks.onInputTranscript("background audio");
  h.callbacks.onTranscriptTurn({input:"background audio",output:""});
  await new Promise(resolve=>setTimeout(resolve,140));
  assert.equal(h.opening.length,1);
  assert.match(h.opening[0],/OPENING ONLY/);
  assert.equal(h.spoken.length,0);
  assert.equal(h.controller.choose("skip opening"),false);

  // The model cannot switch to round two's witness scene before a real answer.
  assert.equal(h.callbacks.onToolCall({name:"render_scene",args:{...breaking,type:"witness"}}).ok,false);
  assert.equal(h.callbacks.onToolCall({name:"render_scene",args:breaking}).ok,true);
  h.callbacks.onSpeaking(true);
  h.callbacks.onTranscriptTurn({input:h.opening[0],output:"Breaking news!"});
  assert.equal(h.spoken.length,0);
  h.callbacks.onTurnComplete();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.started,1);
  assert.equal(h.session.micMuted,false);

  h.callbacks.onTranscriptTurn({input:"The elevators demand three days off",id:"player-1",output:"The witness arrives."});
  assert.deepEqual(h.spoken,["The elevators demand three days off"]);
  h.callbacks.onTranscriptTurn({input:"The elevators demand three days off",id:"player-1",output:""});
  assert.equal(h.spoken.length,1);
 }finally{h.controller.stop();}
});

test("no opening turn is accepted before first spoken scene, even after connection",async()=>{
 const h=await liveHarness();
 try{
  await new Promise(resolve=>setTimeout(resolve,140));
  h.callbacks.onToolCall({name:"render_scene",args:breaking});
  h.callbacks.onTranscriptTurn({input:"accidental first reply",output:""});
  h.callbacks.onTurnComplete(); // render_scene without spoken intro must not open mic
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.started,0);
  assert.equal(h.session.micMuted,true);
  assert.equal(h.spoken.length,0);
 }finally{h.controller.stop();}
});

test("newsroom UI locks options and explains that the anchor is introducing the show",()=>{
 const page=read("NonsenseLiveNewsPage.tsx");
 assert.match(page,/onIntroReady:/);
 assert.match(page,/!introReady\|\|choiceBusy\|\|aiSpeaking/);
 assert.match(page,/mode==="voice"&&!introReady/);
 assert.match(page,/主播正在開場，等他問完第一題再回答/);
 assert.match(page,/disabled=\{!introReady\|\|choiceBusy\}/);
});

test("a rendered finale remains live until the AI has really spoken the ending",async()=>{
 const h=await liveHarness(1);
 const finale={...breaking,type:"finale",question:"",ending:"電梯們終於同意輪休，全城恢復運轉！",outcome:"good"};
 try{
  await new Promise(resolve=>setTimeout(resolve,140));
  h.callbacks.onToolCall({name:"render_scene",args:breaking});
  h.callbacks.onSpeaking(true);
  h.callbacks.onTurnComplete({hadAudio:true});
  await new Promise(resolve=>setImmediate(resolve));
  h.callbacks.onTranscriptTurn({input:"讓電梯輪流休假",output:"",id:"last-player"});
  assert.equal(h.session.micMuted,true,"mute the mic while the final sign-off is pending");
  assert.equal(h.callbacks.onToolCall({name:"render_scene",args:finale}).ok,true);
  h.callbacks.onTurnComplete({hadAudio:false});
  assert.equal(h.finished,0,"a silent finale scene cannot end the voice session");
  await new Promise(resolve=>setTimeout(resolve,970));
  assert.equal(h.opening.length,2,"one additional Live narration cue");
  assert.match(h.opening[1],/ENDING VOICE ONLY/);
  assert.match(h.opening[1],/輪休/);
  assert.equal(h.finished,0,"narration request is not proof of audible playback");
  h.callbacks.onTurnComplete({hadAudio:true});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.finished,1,"finish only after an audio-bearing turn");
 }finally{h.controller.stop();}
});

test("late finale tool frame also waits for audio and never counts the control cue as a player reply",async()=>{
 const h=await liveHarness(1);
 const finale={...breaking,type:"finale",question:"",ending:"全城恢復運轉",outcome:"good"};
 try{
  await new Promise(resolve=>setTimeout(resolve,140));
  h.callbacks.onToolCall({name:"render_scene",args:breaking});
  h.callbacks.onSpeaking(true);
  h.callbacks.onTurnComplete({hadAudio:true});
  await new Promise(resolve=>setImmediate(resolve));
  h.callbacks.onTranscriptTurn({input:"同意輪休",output:"播報結局",id:"final-player"});
  h.callbacks.onTurnComplete({hadAudio:true});
  assert.equal(h.finished,0,"audio without a final scene is not a complete ending");
  assert.equal(h.callbacks.onToolCall({name:"render_scene",args:finale}).ok,true);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.finished,1,"once the late finale tool arrives, finished audio may close the show");
  assert.deepEqual(h.spoken,["同意輪休"]);
 }finally{h.controller.stop();}
});
