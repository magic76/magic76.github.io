const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const source=fs.readFileSync(path.resolve(__dirname,"../web-spa/src/games/werewolfEngine.ts"),"utf8");
function loadGame(){
 const code=stripTypeScriptTypes(source,{mode:"strip"}).replace(/^export /gm,"");
 return new Function(code+"\nreturn {makeWolfGame,humanRole,expectedNightActions,takeNightAction,startWolfVote,recordSpeech,castWolfVote,npcWolfView,publicWolfView};")();
}
const G=loadGame();
const rng=()=>.55;
test("six-player role counts and role test picker are valid",()=>{
 for(const role of ["wolf","seer","witch","villager","random"]){
  const g=G.makeWolfGame(rng,role);
  assert.equal(g.players.length,6);
  assert.equal(g.players.filter(p=>p.human).length,1);
  assert.equal(g.players.filter(p=>p.role==="wolf").length,1);
  assert.equal(g.players.filter(p=>p.role==="seer").length,1);
  assert.equal(g.players.filter(p=>p.role==="witch").length,1);
  if(role!=="random")assert.equal(G.humanRole(g),role);
 }
});
test("night actions are role-gated and cannot target dead or human players",()=>{
 const village=G.makeWolfGame(rng,"villager");
 assert.deepEqual(G.expectedNightActions(village),["skip"]);
 assert.throws(()=>G.takeNightAction(village,{kind:"kill",target:"zoe"}),/not allowed/);
 const wolf=G.makeWolfGame(rng,"wolf");
 assert.deepEqual(G.expectedNightActions(wolf),["kill"]);
 assert.throws(()=>G.takeNightAction(wolf,{kind:"kill",target:"you"}),/living AI/);
 assert.throws(()=>G.takeNightAction(wolf,{kind:"kill",target:"fake"}),/living AI/);
 const day=G.takeNightAction(wolf,{kind:"kill",target:"zoe"},rng);
 assert.equal(day.phase,"day");
 assert.equal(day.players.find(p=>p.id==="zoe").alive,false);
 assert.throws(()=>G.takeNightAction(day,{kind:"kill",target:"max"}),/Not night/);
});
test("seer gets private inspections; host/NPC do not see other hidden roles",()=>{
 const g=G.makeWolfGame(rng,"seer");
 const day=G.takeNightAction(g,{kind:"check",target:"zoe"},rng);
 assert.ok(day.privateNotes.some(note=>note.includes("Zoe is")));
 const publicView=G.publicWolfView(day);
 assert.equal(publicView.humanRole,"seer");
 assert.ok(publicView.players.every(p=>!Object.hasOwn(p,"role")));
 const npcView=G.npcWolfView(day,"max");
 assert.ok(npcView.alive.every(p=>!Object.hasOwn(p,"role")));
 assert.equal(JSON.stringify(npcView).includes("Zoe is"),false);
 assert.equal(JSON.stringify(npcView).includes('"seerFindings"'),false);
});
test("witch poison can remove the last wolf; server-side-style rules decide winner",()=>{
 const g=G.makeWolfGame(rng,"witch");
 const wolf=g.players.find(p=>p.role==="wolf");
 const day=G.takeNightAction(g,{kind:"poison",target:wolf.id},rng);
 assert.equal(day.phase,"finished");
 assert.equal(day.winner,"village");
 assert.equal(day.players.find(p=>p.id===wolf.id).alive,false);
});
test("discussion/voting rejects illegal phases and forged targets",()=>{
 const g=G.makeWolfGame(rng,"villager");
 assert.throws(()=>G.startWolfVote(g),/Cannot start vote/);
 const day=G.takeNightAction(g,{kind:"skip"},rng);
 assert.throws(()=>G.recordSpeech(day,"you"," "),/Empty speech/);
 const debated=G.recordSpeech(day,"you","Why did Zoe defend Max?");
 assert.equal(debated.entries.at(-1).speaker,"you");
 const vote=G.startWolfVote(debated);
 assert.throws(()=>G.castWolfVote(vote,"not-a-player",rng),/Target must be alive/);
 const resolved=G.castWolfVote(vote,null,rng);
 assert.ok(["night","finished"].includes(resolved.phase));
 assert.ok(resolved.entries.some(entry=>entry.kind==="vote"));
});
test("Live never gets the full game state and tool commands are validated",()=>{
 const live=fs.readFileSync(path.resolve(__dirname,"../web-spa/src/games/werewolfLive.ts"),"utf8");
 const ai=fs.readFileSync(path.resolve(__dirname,"../web-spa/src/games/werewolfAI.ts"),"utf8");
 const app=fs.readFileSync(path.resolve(__dirname,"../web-spa/src/App.tsx"),"utf8");
 const hub=fs.readFileSync(path.resolve(__dirname,"../web-spa/src/games/CrewPlayHubPage.tsx"),"utf8");
 assert.match(live,/publicWolfView\(initial\)/);
 assert.match(live,/functionDeclarations:\[commandTool\]/);
 assert.match(live,/onToolCall:/);
 assert.match(live,/onToolsUnavailable:/);
 assert.match(ai,/npcWolfView\(game,npcId\)/);
 assert.match(app,/games\/werewolf/);
 assert.match(hub,/werewolf-hub-card/);
});

test("Live session handles voice action tools and speaks verified NPC replies",async()=>{
 const source=fs.readFileSync(path.resolve(__dirname,"../web-spa/src/games/werewolfLive.ts"),"utf8");
 const js=stripTypeScriptTypes(source.replace(/^import .*$/gm,""),{mode:"strip"}).replace(/^export /gm,"");
 const sent=[];
 let settings,stopped=false;
 const window={
  CrewLive:{Session:class{
   constructor(options){settings=options;this.ready=true;this.running=true;this.micMuted=false;}
   async start(){settings.onState("ready")}
   async stop(){stopped=true}
   sendText(value){sent.push(value);return true}
   toggleMic(){this.micMuted=!this.micMuted}
  }}
 };
 const start=new Function("ensureLive","geminiKey","publicWolfView","window",
  js+"\nreturn startWerewolfLive;")(
  async()=>{},()=> "test-key",G.publicWolfView,window,value=>value);
 const game=G.makeWolfGame(rng,"villager");
 const heard=[],commands=[];
 const voice=await start(game,"zh",command=>{
  commands.push(command);return {ok:true};
 },{onReady:()=>heard.push("ready"),onSpeaking:()=>{},onTranscript:()=>{},
  onHostSpeech:text=>heard.push(text),onError:()=>{}});
 assert.deepEqual(heard,["ready"]);
 assert.ok(settings.tools[0].functionDeclarations.some(d=>d.name==="player_game_action"));
 const response=settings.onToolCall({name:"player_game_action",
  args:{action:"statement",text:"Zoe，妳為什麼懷疑 Max？",to:"zoe"}});
 assert.equal(response.responsePending,true);
 assert.deepEqual(commands,[{kind:"statement",text:"Zoe，妳為什麼懷疑 Max？",to:"zoe"}]);
 assert.equal(voice.update(game,"我覺得 Max 很可疑。","Zoe"),true);
 assert.match(sent[0],/VERIFIED NPC REPLY/);
 assert.match(sent[0],/Max/);
 assert.doesNotMatch(sent[0],/seerFindings|privateNotes/);
 settings.onOutputTranscript("Zoe：我覺得 Max 很可疑。");
 assert.equal(heard.at(-1),"Zoe：我覺得 Max 很可疑。");
 voice.stop();
 assert.equal(stopped,true);
});
test("voice startup uses its own lifecycle generation; replies remain next to the composer",()=>{
 const page=fs.readFileSync(path.resolve(__dirname,"../web-spa/src/games/WerewolfPage.tsx"),"utf8");
 const css=fs.readFileSync(path.resolve(__dirname,"../web-spa/src/games/werewolf.css"),"utf8");
 assert.match(page,/const stamp=\+\+voiceGenerationRef\.current;\s*setVoiceStatus\("connecting"\)/);
 assert.match(page,/voiceGenerationRef\.current!==stamp/);
 assert.match(page,/onHostSpeech:setHostSpeech/);
 assert.match(page,/ref=\{transcriptRef\}/);
 assert.match(page,/transcriptRef\.current\.scrollTop=transcriptRef\.current\.scrollHeight/);
 assert.ok(page.indexOf('className="wolf-history"')<page.indexOf('className="wolf-compose"'));
 assert.ok(page.indexOf("wolf-live-transcript")<page.indexOf('className="wolf-compose"'));
 assert.match(css,/max-height:245px;overflow-y:auto/);
});

test("Live never tells the player they said nothing when tool text arrives before audio transcript",async()=>{
 const source=fs.readFileSync(path.resolve(__dirname,"../web-spa/src/games/werewolfLive.ts"),"utf8");
 const js=stripTypeScriptTypes(source.replace(/^import .*$/gm,""),{mode:"strip"}).replace(/^export /gm,"");
 let settings;
 const window={CrewLive:{Session:class{
  constructor(options){settings=options;this.ready=true;this.running=true;this.micMuted=false;}
  async start(){settings.onState("ready")}
  async stop(){}
  sendText(){return true}
  toggleMic(){this.micMuted=!this.micMuted}
 }}};
 const start=new Function("ensureLive","geminiKey","publicWolfView","window","normalizeLiveVoice",js+"\nreturn startWerewolfLive;")(
  async()=>{},()=>"test-key",G.publicWolfView,window,value=>value);
 const game=G.makeWolfGame(rng,"villager");
 const day=G.takeNightAction(game,{kind:"skip"},rng);
 const actions=[],issues=[],mic=[];
 const voice=await start(day,"zh",a=>{actions.push(a);return {ok:true}},{
  onReady:()=>{},onSpeaking:()=>{},onTranscript:()=>{},onHostSpeech:()=>{},
  onMicPhase:phase=>mic.push(phase),onAudioIssue:issue=>issues.push(issue),onError:()=>{}
 });
 assert.equal(settings.manualInterruptOnly,false);
 settings.onListeningPhase("speaking");
 const empty=settings.onToolCall({name:"player_game_action",args:{action:"statement",text:"",to:"zoe"}});
 assert.equal(empty.ok,true);
 assert.equal(empty.waitingForTranscription,true);
 assert.equal(actions.length,0);
 assert.ok(!JSON.stringify(empty).includes("Please repeat"));
 settings.onInputTranscript("Zoe，為什麼妳一直懷疑 Max？");
 await new Promise(resolve=>setTimeout(resolve,560));
 assert.deepEqual(actions,[{kind:"statement",text:"Zoe，為什麼妳一直懷疑 Max？",to:"zoe"}]);
 assert.deepEqual(issues,[]);
 // A duplicate or late transcript from the same speech must not replay gameplay.
 settings.onTranscriptTurn({input:"Zoe，為什麼妳一直懷疑 Max？",output:""});
 assert.equal(actions.length,1);
 assert.deepEqual(mic,["speaking"]);
 voice.stop();
});
test("Live prefers real audio transcription over function-call guesses",async()=>{
 const source=fs.readFileSync(path.resolve(__dirname,"../web-spa/src/games/werewolfLive.ts"),"utf8");
 const js=stripTypeScriptTypes(source.replace(/^import .*$/gm,""),{mode:"strip"}).replace(/^export /gm,"");
 let settings;
 const window={CrewLive:{Session:class{
  constructor(options){settings=options;this.ready=true;this.micMuted=false;}
  async start(){settings.onState("ready")}
  async stop(){}
  sendText(){return true}
  toggleMic(){this.micMuted=!this.micMuted}
 }}};
 const start=new Function("ensureLive","geminiKey","publicWolfView","window","normalizeLiveVoice",js+"\nreturn startWerewolfLive;")(
  async()=>{},()=>"test-key",G.publicWolfView,window,value=>value);
 const day=G.takeNightAction(G.makeWolfGame(rng,"villager"),{kind:"skip"},rng);
 const actions=[];
 const voice=await start(day,"zh",a=>{actions.push(a);return {ok:true}},{
  onReady:()=>{},onSpeaking:()=>{},onTranscript:()=>{},onHostSpeech:()=>{},onError:()=>{}
 });
 settings.onListeningPhase("speaking");
 settings.onInputTranscript("我覺得 Iris 可疑");
 const result=settings.onToolCall({name:"player_game_action",args:{action:"statement",text:"沒有說話",to:"iris"}});
 assert.equal(result.responsePending,true);
 assert.equal(actions[0].text,"我覺得 Iris 可疑");
 assert.equal(actions.length,1);
 voice.stop();
});

test("Live referee does not echo the human, and hides non-speech token artifacts",()=>{
 const source=fs.readFileSync(path.resolve(__dirname,"../web-spa/src/games/werewolfLive.ts"),"utf8");
 const js=stripTypeScriptTypes(source.replace(/^import .*$/gm,""),{mode:"strip"}).replace(/^export /gm,"");
 const clean=new Function(js+"\nreturn cleanWolfHostCaption;")();
 assert.equal(clean("<no speech>{pause}"),"");
 assert.equal(clean(" <NO SPEECH>  {pause} "), "");
 assert.equal(clean("Yuna 回應：我有證據。 {pause}"),"Yuna 回應：我有證據。");
 assert.equal(clean("沒有說話"),"");
 assert.match(source,/THIRD-PERSON OBSERVER/);
 assert.match(source,/NEVER repeat, paraphrase, quote or read back/);
 assert.match(source,/voice:normalizeLiveVoice\(voiceChoice\)/);
});
