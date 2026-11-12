const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
function engine(){
 const ts=stripTypeScriptTypes(read("web-spa/src/timeline/lifeObservatory.ts"))
  .replace(/^import .*;\s*$/gm,"").replace(/^export /gm,"");
 const box={};
 vm.runInNewContext(ts+"\nglobalThis.game={createObserverRun,observerAge,observerScenes,chooseObserverIntervention,observerInterventionCount,settleObserverChapter,advanceObserverRun,observerValidRun,observerEnding,OBSERVER_AGES,OBSERVER_ACTORS,OBSERVER_PAIRS};",box);
 return box.game;
}
function complete(seed,actions={}){
 const game=engine();
 let r=game.createObserverRun(seed);
 for(const age of game.OBSERVER_AGES){
  const options=actions[age]||{};
  for(const [actor,choice] of Object.entries(options))r=game.chooseObserverIntervention(r,actor,choice);
  r=game.settleObserverChapter(r);
  r=game.advanceObserverRun(r);
 }
 return r;
}
test("V3 has three autonomous actors and three joint time phases",()=>{
 const g=engine(),r=g.createObserverRun(123);
 assert.deepEqual(Array.from(g.OBSERVER_AGES),[16,25,40]);
 assert.deepEqual(Array.from(g.OBSERVER_ACTORS),["mira","ethan","hana"]);
 assert.equal(g.observerScenes(r).length,3);
 assert.equal(g.observerInterventionCount(r),0);
 assert.ok(g.observerValidRun(r));
});
test("intervention budget is exactly two, can toggle before settling",()=>{
 const g=engine();let r=g.createObserverRun(4);
 r=g.chooseObserverIntervention(r,"mira",0);
 r=g.chooseObserverIntervention(r,"ethan",1);
 assert.equal(g.observerInterventionCount(r),2);
 assert.throws(()=>g.chooseObserverIntervention(r,"hana",0),/No interventions/);
 r=g.chooseObserverIntervention(r,"mira",0);
 assert.equal(g.observerInterventionCount(r),1);
 r=g.chooseObserverIntervention(r,"hana",1);
 assert.equal(g.observerInterventionCount(r),2);
 r=g.settleObserverChapter(r);
 assert.equal(r.phase,"recap");
 assert.equal(r.history[0].decisions.filter(x=>x.source==="player").length,2);
 assert.equal(r.history[0].decisions.filter(x=>x.source==="self").length,1);
 assert.throws(()=>g.chooseObserverIntervention(r,"mira",0),/Invalid intervention/);
});
test("with zero interventions, three characters independently decide and world advances",()=>{
 const g=engine();let r=g.createObserverRun(77);
 for(let step=0;step<3;step++){
  assert.equal(g.observerAge(r),g.OBSERVER_AGES[step]);
  assert.equal(g.observerScenes(r).length,3);
  r=g.settleObserverChapter(r);
  assert.equal(r.history.at(-1).decisions.length,3);
  assert.ok(r.history.at(-1).decisions.every(x=>x.source==="self"));
  assert.ok(g.observerValidRun(r));
  r=g.advanceObserverRun(r);
 }
 assert.equal(r.phase,"end");assert.equal(r.history.length,3);
 assert.equal(r.flags.length,9);
 assert.match(g.observerEnding(r).zh,/他們|人生/);
 assert.throws(()=>g.advanceObserverRun(r),/Finish the chapter/);
});
test("same seed and same interventions yield identical outcomes, pairs and flags",()=>{
 const a=complete(20261112,{16:{hana:0},25:{ethan:0},40:{mira:0,hana:0}});
 const b=complete(20261112,{16:{hana:0},25:{ethan:0},40:{mira:0,hana:0}});
 assert.deepEqual(JSON.parse(JSON.stringify(a.history)),JSON.parse(JSON.stringify(b.history)));
 assert.deepEqual(JSON.parse(JSON.stringify(a.bonds)),JSON.parse(JSON.stringify(b.bonds)));
 assert.deepEqual(Array.from(a.flags),Array.from(b.flags));
});
test("Hana's silent departure and audition cause missed farewell at 16 and an echo at 25",()=>{
 const g=engine();
 let r=g.createObserverRun(123);
 r=g.chooseObserverIntervention(r,"ethan",0);
 r=g.chooseObserverIntervention(r,"hana",1);
 r=g.settleObserverChapter(r);
 assert.equal(r.history[0].ripple.id,"farewell-missed");
 assert.ok(r.bonds["ethan-hana"]<68);
 r=g.advanceObserverRun(r);
 assert.match(g.observerScenes(r).find(x=>x.actor==="hana").title.zh,/九年/);
 r=g.settleObserverChapter(r);
 assert.equal(r.history[1].ripple.fromAge,16);
});
test("different interventions from identical seed cause clearly different joint histories",()=>{
 const a=complete(555,{16:{ethan:0,hana:1},25:{mira:0},40:{ethan:0,hana:0}});
 const b=complete(555,{16:{ethan:1,hana:0},25:{mira:1},40:{mira:1,hana:1}});
 assert.equal(a.history[0].ripple.id,"farewell-missed");
 assert.equal(b.history[0].ripple.id,"farewell-gathered");
 assert.notEqual(a.history[1].decisions[1].title.zh,b.history[1].decisions[1].title.zh);
 assert.notEqual(JSON.stringify(a.bonds),JSON.stringify(b.bonds));
 assert.notEqual(a.history[2].ripple.id,b.history[2].ripple.id);
});
test("saved world is fail-closed and original Timeline memories remain isolated",()=>{
 const g=engine();const r=complete(321);
 assert.equal(g.observerValidRun(r),true);
 assert.equal(g.observerValidRun({...r,step:9}),false);
 assert.equal(g.observerValidRun({...r,version:2}),false);
 assert.equal(g.observerValidRun({...r,bonds:{"mira-ethan":200,"mira-hana":60,"ethan-hana":62}}),false);
 assert.equal(g.observerValidRun({...r,history:[]}),false);
 const storage=read("web-spa/src/timeline/lifeObservatoryStorage.ts");
 assert.match(storage,/crew-life-observatory-v3/);
 assert.doesNotMatch(storage,/crew-life-simulator-v1|crew_text_transcript_v1/);
 const app=read("web-spa/src/App.tsx");
 assert.match(app,/path="\/timeline\/observe"/);
 const hub=read("web-spa/src/games/CrewPlayHubPage.tsx");
 assert.ok(hub.includes('to="/timeline/observe"'));
 const page=read("web-spa/src/timeline/LifeObservatoryPage.tsx");
 assert.match(page,/SceneWorld/);assert.match(page,/CompareWorlds/);
 assert.doesNotMatch(page,/TextChatPanel|LiveTextConversation|useLiveSession/);
 assert.match(page,/lo-scene-tabs/);
 assert.match(page,/lo-person-focus/);
 assert.match(page,/id="lo-recap"/);
 assert.ok(page.indexOf('className="lo-ripple"')<page.indexOf('className="lo-outcomes"'),"Reveal ripple before detailed outcomes");
 assert.match(app,/path="\/timeline\/simulate" element=\{<Navigate to="\/timeline\/observe" replace\/>\}/);
 assert.doesNotMatch(app,/LifeSimulationPage/,"Remove obsolete V2 bundle");
 assert.doesNotMatch(hub,/to="\/timeline\/simulate"/,"One life game catalog entry");
 const gone=[
  "web-spa/src/timeline/LifeSimulationPage.tsx","web-spa/src/timeline/lifeSimulation.ts",
  "web-spa/src/timeline/lifeSimulationStorage.ts","web-spa/src/timeline/lifeSimulation.css",
  "web-spa/src/timeline/lifeEvents.ts","web-spa/src/timeline/lifeArcs.ts",
  "web-spa/src/timeline/lifeConsequences.ts","web-spa/src/timeline/lifeArcConsequences.ts",
  "web-spa/src/timeline/lifeNarrative.ts","web-spa/src/timeline/lifeDialogue.ts",
  "tests/life-simulator.test.js","tests/life-lab-browser.mjs",".github/workflows/life-simulator.yml"
 ];
 for(const file of gone)assert.equal(fs.existsSync(path.join(root,file)),false,"Retired V2 source remains: "+file);

});
