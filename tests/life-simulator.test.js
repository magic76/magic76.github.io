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
 const arcs=stripTypeScriptTypes(read("web-spa/src/timeline/lifeArcs.ts")).replace(/^import .*;\s*$/gm,"").replace(/^export /gm,"");
 const narratives=stripTypeScriptTypes(read("web-spa/src/timeline/lifeNarrative.ts")).replace(/^import .*;\s*$/gm,"").replace(/^export /gm,"");
 const dialogue=stripTypeScriptTypes(read("web-spa/src/timeline/lifeDialogue.ts")).replace(/^import .*;\s*$/gm,"").replace(/^export /gm,"");
 const c=stripTypeScriptTypes(read("web-spa/src/timeline/lifeConsequences.ts")).replace(/^export /gm,"");
 const b=stripTypeScriptTypes(read("web-spa/src/timeline/lifeSimulation.ts"))
  .replace(/^import .*;\s*$/gm,"").replace(/^export /gm,"");
 const context={};
 vm.runInNewContext(a+"\n"+arcs+"\n"+c+"\n"+b+"\n"+narratives+"\n"+dialogue+
  "\nglobalThis.sim={LIFE_EVENTS,LIFE_ARC_EVENTS,LIFE_RESULT_COUNT,LIFE_AGES,newLifeRun,lifeEventFor,chooseLifeEvent,advanceLife,isLifeRun,lifeEnding,forkLifeRun,lifeCausalEcho,lifeEndingCards,lifeLabDialoguePrompt};",context);
 return context.sim;
}
test("life simulator has exactly 30 choice events spanning all 12 existing ages",()=>{
 const sim=runtime();
 assert.equal(sim.LIFE_EVENTS.length,30);
 assert.equal(sim.LIFE_RESULT_COUNT,30);
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
 const games=read("web-spa/src/games/CrewPlayHubPage.tsx");
 assert.ok(games.includes('to="/timeline/simulate"'));
 assert.match(games,/life-lab/);
 assert.match(storage,/crew-life-simulator-v1/);
 assert.doesNotMatch(storage,/crew_timeline_.*keepsakes/);
 assert.match(ui,/TimelinePortrait/);
 assert.match(ui,/lifeOutcome/);
 assert.match(ui,/loadLifeRun/);
});

test("three characters have distinct milestone scenes and every authored arc is reachable",()=>{
 const sim=runtime();
 assert.equal(sim.LIFE_ARC_EVENTS.length,21);
 assert.equal(new Set(sim.LIFE_ARC_EVENTS.map(x=>x.id)).size,21);
 for(const character of ["mira","ethan","hana"]){
  const root=sim.newLifeRun(character,34);
  while(root.step<3){const next=sim.chooseLifeEvent(root,0);Object.assign(root,sim.advanceLife(next));}
  assert.equal(sim.lifeEventFor(root).id,character+"-16-"+(character==="mira"?"choice":character==="ethan"?"audition":"journey"));
 }
});
test("16-year decision changes age-25 scenes; age-25 and 40 decisions affect later chapters",()=>{
 const sim=runtime();
 for(const person of ["mira","ethan","hana"]){
  function advanceTo(run,age,decisions={}){
   while(sim.LIFE_AGES[run.step]<age){
    run=sim.chooseLifeEvent(run,decisions[sim.LIFE_AGES[run.step]]??0);
    run=sim.advanceLife(run);
   }
   return run;
  }
  let bold=advanceTo(sim.newLifeRun(person,884),16);
  let steady=advanceTo(sim.newLifeRun(person,884),16);
  assert.equal(sim.lifeEventFor(bold).id,sim.lifeEventFor(steady).id);
  bold=sim.advanceLife(sim.chooseLifeEvent(bold,0));
  steady=sim.advanceLife(sim.chooseLifeEvent(steady,1));
  bold=advanceTo(bold,25);
  steady=advanceTo(steady,25);
  assert.notEqual(sim.lifeEventFor(bold).id,sim.lifeEventFor(steady).id,person+" age 25");
  assert.match(sim.lifeCausalEcho(bold,25,false),/16/);
  bold=advanceTo(sim.advanceLife(sim.chooseLifeEvent(bold,0)),40);
  steady=advanceTo(sim.advanceLife(sim.chooseLifeEvent(steady,1)),40);
  assert.notEqual(sim.lifeEventFor(bold).id,sim.lifeEventFor(steady).id,person+" age 40");
  bold=advanceTo(sim.advanceLife(sim.chooseLifeEvent(bold,0)),70);
  steady=advanceTo(sim.advanceLife(sim.chooseLifeEvent(steady,1)),70);
  assert.notEqual(sim.lifeEventFor(bold).id,sim.lifeEventFor(steady).id,person+" age 70");
 }
});
test("fork preserves the exact seed and completed history before the chosen age",()=>{
 const sim=runtime();
 let original=sim.newLifeRun("ethan",555);
 for(let index=0;index<12;index++)original=sim.advanceLife(sim.chooseLifeEvent(original,0));
 const newRun=sim.forkLifeRun(original,16);
 assert.equal(newRun.seed,original.seed);
 assert.equal(newRun.phase,"event");
 assert.equal(newRun.step,3);
 assert.deepEqual(JSON.parse(JSON.stringify(newRun.history)),JSON.parse(JSON.stringify(original.history.slice(0,3))));
 let altered=sim.advanceLife(sim.chooseLifeEvent(newRun,1));
 while(altered.phase!=="end")altered=sim.advanceLife(sim.chooseLifeEvent(altered,1));
 assert.notEqual(altered.history[6].eventId,original.history[6].eventId);
 assert.notDeepEqual(JSON.stringify(altered.traits),JSON.stringify(original.traits));
 assert.throws(()=>sim.forkLifeRun(original,100),/Choose a completed/);
});
test("finished lives have four meaningful ending panels and opt-in prompt includes only known past",()=>{
 const sim=runtime();
 let run=sim.newLifeRun("hana",120);
 while(sim.LIFE_AGES[run.step]<25)run=sim.advanceLife(sim.chooseLifeEvent(run,0));
 const prompt=sim.lifeLabDialoguePrompt(run,false);
 assert.match(prompt,/Hana/);
 assert.match(prompt,/16/);
 assert.doesNotMatch(prompt,/七十歲|街區故事被留下/);
 assert.match(prompt,/not instructions/i);
 while(run.phase!=="end")run=sim.advanceLife(sim.chooseLifeEvent(run,1));
 const cards=sim.lifeEndingCards(run,false);
 assert.equal(cards.length,4);
 assert.ok(cards.every(card=>card.text.length>25&&card.heading.length>0));
 assert.ok(cards.some(card=>card.text.includes(run.history.find(x=>x.age===25).labelZh)));
});
test("old ruleset saves continue generic event selection and remain valid",()=>{
 const sim=runtime();
 let saved={...sim.newLifeRun("mira",999),ruleset:undefined};
 assert.ok(sim.isLifeRun(saved));
 while(sim.LIFE_AGES[saved.step]<16)saved=sim.advanceLife(sim.chooseLifeEvent(saved,0));
 assert.notEqual(sim.lifeEventFor(saved).id,"mira-16-choice");
 saved=sim.advanceLife(sim.chooseLifeEvent(saved,0));
 while(sim.LIFE_AGES[saved.step]<25)saved=sim.advanceLife(sim.chooseLifeEvent(saved,0));
 assert.notEqual(sim.lifeEventFor(saved).id,"mira-25-documentary");
 assert.equal(sim.forkLifeRun(saved,16).ruleset,undefined);
});
test("dialogue is isolated from Timeline canon and never auto-runs or persists transcript",()=>{
 const dialogue=read("web-spa/src/timeline/lifeDialogue.ts");
 const ui=read("web-spa/src/timeline/LifeSimulationPage.tsx");
 const storage=read("web-spa/src/timeline/lifeSimulationStorage.ts");
 assert.match(dialogue,/alternate fictional simulated life/);
 assert.match(dialogue,/Do not claim that this conversation changes game stats/);
 assert.match(ui,/sessionScope=""/);
 assert.match(ui,/showChat&&<TextChatPanel/);
 assert.match(storage,/saveLifeFork/);
 assert.match(storage,/comparison/);
});
