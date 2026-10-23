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
