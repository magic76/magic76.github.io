const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
function runtime(){
 const a=stripTypeScriptTypes(read("web-spa/src/timeline/lifeEvents.ts")).replace(/^export /gm,"");
 const b=stripTypeScriptTypes(read("web-spa/src/timeline/lifeSimulation.ts"))
  .replace(/^import .*;\s*$/gm,"").replace(/^export /gm,"");
 const context={};
 vm.runInNewContext(a+"\n"+b+"\nglobalThis.sim={LIFE_EVENTS,LIFE_AGES,newLifeRun,lifeEventFor,chooseLifeEvent,advanceLife,isLifeRun,lifeEnding};",context);
 return context.sim;
}
test("life simulator has exactly 30 choice events spanning all 12 existing ages",()=>{
 const sim=runtime();
 assert.equal(sim.LIFE_EVENTS.length,30);
 assert.deepEqual(Array.from(sim.LIFE_AGES),[7,10,13,16,19,22,25,35,40,50,55,70]);
 for(const age of sim.LIFE_AGES)assert.ok(sim.LIFE_EVENTS.some(event=>event.age===age),"Missing age "+age);
 assert.equal(new Set(sim.LIFE_EVENTS.map(x=>x.id)).size,30);
 for(const event of sim.LIFE_EVENTS){
  assert.equal(event.choices.length,3);
  assert.ok(event.title.zh&&event.title.en&&event.story.zh&&event.story.en);
 }
});
test("same character seed and decisions replay the same events and consequences",()=>{
 const sim=runtime();
 const play=()=>{
  let run=sim.newLifeRun("ethan",123456);
  const events=[];
  for(let i=0;i<12;i++){
   events.push(sim.lifeEventFor(run).id);
   run=sim.chooseLifeEvent(run,i%3);
   assert.ok(sim.isLifeRun(run));
   run=sim.advanceLife(run);
  }
  return {run,events};
 };
 const a=play(),b=play();
 assert.equal(a.run.phase,"end");assert.equal(a.run.history.length,12);
 assert.deepEqual(a.events,b.events);
 assert.deepEqual(JSON.parse(JSON.stringify(a.run.traits)),JSON.parse(JSON.stringify(b.run.traits)));
 assert.deepEqual(a.run.history.map(x=>x.eventId),b.run.history.map(x=>x.eventId));
 assert.match(sim.lifeEnding(a.run),/70/);
});
test("different choices produce persistent, causal trait differences",()=>{
 const sim=runtime();let a=sim.newLifeRun("mira",42),b=sim.newLifeRun("mira",42);
 assert.equal(sim.lifeEventFor(a).id,sim.lifeEventFor(b).id);
 a=sim.chooseLifeEvent(a,0);b=sim.chooseLifeEvent(b,1);
 assert.notDeepEqual(JSON.stringify(a.traits),JSON.stringify(b.traits));
 assert.equal(a.history[0].age,7);
 assert.equal(a.history[0].eventId,b.history[0].eventId);
 assert.notEqual(a.history[0].labelZh,b.history[0].labelZh);
 a=sim.advanceLife(a);b=sim.advanceLife(b);
 assert.equal(a.step,1);assert.equal(b.step,1);
});
test("can't skip decisions, keep playing after ending or load malformed save",()=>{
 const sim=runtime();
 const run=sim.newLifeRun("hana",8);
 assert.throws(()=>sim.advanceLife(run),/Resolve event/);
 assert.throws(()=>sim.chooseLifeEvent(run,9),/not available/);
 assert.equal(sim.isLifeRun({...run,step:99}),false);
 assert.equal(sim.isLifeRun({...run,character:"invalid"}),false);
 assert.equal(sim.isLifeRun({...run,traits:{...run.traits,trust:999}}),false);
 let next=run;
 for(let i=0;i<12;i++)next=sim.advanceLife(sim.chooseLifeEvent(next,2));
 assert.equal(next.phase,"end");
 assert.throws(()=>sim.chooseLifeEvent(next,0),/not available/);
 assert.throws(()=>sim.lifeEventFor(next),/No pending/);
});
test("simulator is an opt-in route and never overwrites Timeline memory",()=>{
 const app=read("web-spa/src/App.tsx");
 const page=read("web-spa/src/timeline/TimelinePage.tsx");
 const storage=read("web-spa/src/timeline/lifeSimulationStorage.ts");
 const ui=read("web-spa/src/timeline/LifeSimulationPage.tsx");
 assert.match(app,/path="\/timeline\/simulate"/);
 assert.match(page,/to="\/timeline\/simulate"/);
 assert.match(storage,/crew-life-simulator-v1/);
 assert.doesNotMatch(storage,/crew_timeline_.*keepsakes/);
 assert.match(ui,/TimelinePortrait/);
 assert.match(ui,/lifeOutcome/);
 assert.match(ui,/loadLifeRun/);
});
