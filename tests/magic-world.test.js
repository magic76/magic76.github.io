const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ts=require("typescript");
// Keep repository tests runnable on the existing Node 22 runner without special
// experimental .ts import flags. This module is a pure state reducer.
const source=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/world.ts"),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const worldModule={exports:{}};
new Function("module","exports",compiled)(worldModule,worldModule.exports);
const {applyMagicCommand,demoMagicCommand,MAGIC_INITIAL_WORLD,latestMagicSpotlight}=worldModule.exports;

test("world transformations retain summoned objects and story progress",()=>{
 const d=applyMagicCommand(MAGIC_INITIAL_WORLD,"summon_object",{kind:"dragon"});
 assert.equal(d.ok,true);
 const n=applyMagicCommand(d.world,"change_world",{theme:"forest",time:"night",weather:"stars"});
 assert.equal(n.ok,true);
 assert.equal(n.world.objects.length,1);
 assert.equal(n.world.objects[0].kind,"dragon");
 assert.equal(n.world.time,"night");
});

test("the renderer rejects untrusted scripts and unknown tools",()=>{
 const html=applyMagicCommand(MAGIC_INITIAL_WORLD,"render_html",{html:"<script>throw Error()</script>"});
 assert.equal(html.ok,false);
 assert.equal(html.world,MAGIC_INITIAL_WORLD);
 const bad=applyMagicCommand(MAGIC_INITIAL_WORLD,"summon_object",{kind:"<img src=x onerror=alert(1)>"});
 assert.equal(bad.ok,false);
 const bogus=applyMagicCommand(MAGIC_INITIAL_WORLD,"change_world",{theme:"hacked"});
 assert.equal(bogus.ok,false);
});

test("generated copy strips invisible bidi controls before rendering",()=>{
 const story=applyMagicCommand(MAGIC_INITIAL_WORLD,"tell_story",{message:"safe\u202Etxt\u2066end"});
 assert.equal(story.ok,true);
 assert.equal(story.world.message,"safetxtend");
 const panel=applyMagicCommand(MAGIC_INITIAL_WORLD,"create_magic_panel",{
  panel_type:"quest",title:"Star\u202D Gate",description:"Choose\u2069 wisely",
  item_a:"North\u202E",item_b:"East",item_c:"West"
 });
 assert.equal(panel.ok,true);
 assert.equal(panel.world.panels[0].title,"Star Gate");
 assert.equal(panel.world.panels[0].description,"Choose wisely");
 assert.equal(panel.world.panels[0].items[0],"North");
});

test("stage object limit matches the six unique mobile hit targets",()=>{
 let state=MAGIC_INITIAL_WORLD;
 for(let n=0;n<6;n++){
  const result=applyMagicCommand(state,"summon_object",{kind:"owl"});
  assert.equal(result.ok,true);
  assert.equal(result.world.objects[n].slot,n);
  state=result.world;
 }
 const overflow=applyMagicCommand(state,"summon_object",{kind:"dragon"});
 assert.equal(overflow.ok,false);
 assert.equal(overflow.event,"world-is-full");
 assert.equal(overflow.world.objects.length,6);
 assert.equal(applyMagicCommand(state,"create_challenge",{title:"Question",question:"?",option_a:"A",option_b:"B",correct_option:"B"}).ok,false);
});

test("tool arguments ignore inherited prototype properties",()=>{
 const inherited=Object.create({kind:"dragon"});
 assert.equal(applyMagicCommand(MAGIC_INITIAL_WORLD,"summon_object",inherited).ok,false);
 const nullProto=Object.assign(Object.create(null),{kind:"owl"});
 assert.equal(applyMagicCommand(MAGIC_INITIAL_WORLD,"summon_object",nullProto).ok,true);
});

test("serialized tool arguments are size and parse-depth bounded",()=>{
 const valid=JSON.stringify({kind:"owl"});
 assert.equal(applyMagicCommand(MAGIC_INITIAL_WORLD,"summon_object",valid).ok,true);
 const nested=JSON.stringify(valid);
 assert.equal(applyMagicCommand(MAGIC_INITIAL_WORLD,"summon_object",nested).ok,false);
 const oversized=JSON.stringify({kind:"owl",padding:"x".repeat(5000)});
 assert.equal(applyMagicCommand(MAGIC_INITIAL_WORLD,"summon_object",oversized).ok,false);
});

test("challenge choices are graded exactly once and increment chapters for correct answers",()=>{
 const q=demoMagicCommand("puzzle",MAGIC_INITIAL_WORLD);
 const done=applyMagicCommand(q.world,"answer_challenge",JSON.stringify({choice:"B"}));
 assert.equal(done.event,"challenge-won");
 assert.equal(done.world.chapter,2);
 assert.equal(applyMagicCommand(done.world,"answer_challenge",{choice:"B"}).ok,false);
 const wrong=applyMagicCommand(q.world,"answer_challenge",{choice:"A"});
 assert.equal(wrong.event,"challenge-missed");
 assert.equal(wrong.world.chapter,1);
});

test("reset starts a new world without replaying content",()=>{
 const d=demoMagicCommand("dragon",MAGIC_INITIAL_WORLD);
 const clear=demoMagicCommand("reset",d.world);
 assert.equal(clear.world.objects.length,0);
 assert.equal(clear.world.weather,"clear");
 assert.ok(clear.world.revision>d.world.revision);
});

test("malformed tool arguments never crash the world",()=>{
 const bad=[null,[],123,"{broken",{"__proto__":"bad"}];
 for(const arg of bad)assert.equal(applyMagicCommand(MAGIC_INITIAL_WORLD,"summon_object",arg).ok,false);
});

test("generated panels are strictly typed, bounded and selectable once",()=>{
 const created=applyMagicCommand(MAGIC_INITIAL_WORLD,"create_magic_panel",{
  panel_type:"treasure",title:"Mystery",description:"Pick a box",
  item_a:"Moon crystal",item_b:"Star key",item_c:"Golden feather"
 },"en");
 assert.equal(created.ok,true);
 assert.equal(created.world.panels[0].kind,"treasure");
 const selected=applyMagicCommand(created.world,"select_magic_panel",{choice:"B"});
 assert.equal(selected.ok,true);
 assert.equal(selected.world.panels[0].selected,"B");
 assert.equal(selected.world.message,"Star key");
 assert.equal(applyMagicCommand(selected.world,"select_magic_panel",{choice:"A"}).ok,false);
 const unknown=applyMagicCommand(created.world,"create_magic_panel",{
  panel_type:"raw-html",title:"Unsafe",description:"Unsafe",item_a:"a",item_b:"b",item_c:"c"
 });
 assert.equal(unknown.ok,false);
});

test("portal demo creates a complete quest panel without Gemini",()=>{
 const world=demoMagicCommand("portal",MAGIC_INITIAL_WORLD,"en").world;
 assert.equal(world.objects[0].kind,"portal");
 assert.equal(world.panels.length,1);
 assert.equal(world.panels[0].kind,"quest");
 assert.match(world.message,/magical panel/);
});

test("generated panels replace old panels at a bounded count",()=>{
 let world=MAGIC_INITIAL_WORLD;
 for(let n=0;n<8;n++){
  const result=applyMagicCommand(world,"create_magic_panel",{
   panel_type:"spellbook",title:"Rune",description:"Magic",item_a:"A",item_b:"B",item_c:"C"
  });
  assert.equal(result.ok,true);
  world=result.world;
 }
 assert.equal(world.panels.length,2);
});

test("mobile spotlight picks the newest generated interaction and keeps result visible",()=>{
 const {latestMagicSpotlight}=worldModule.exports;
 assert.equal(latestMagicSpotlight(null,[]),null);
 const challenge=demoMagicCommand("puzzle",MAGIC_INITIAL_WORLD).world;
 assert.deepEqual(latestMagicSpotlight(challenge.challenge,challenge.panels),{
  kind:"challenge",id:challenge.challenge.id
 });
 const portal=demoMagicCommand("portal",challenge).world;
 const newestPanel=portal.panels[portal.panels.length-1];
 assert.deepEqual(latestMagicSpotlight(portal.challenge,portal.panels),{
  kind:"panel",id:newestPanel.id
 });
 const selected=applyMagicCommand(portal,"select_magic_panel",{choice:"A"});
 assert.equal(selected.ok,true);
 assert.deepEqual(latestMagicSpotlight(selected.world.challenge,selected.world.panels),{
  kind:"panel",id:newestPanel.id
 });
 const newer=applyMagicCommand(selected.world,"create_challenge",{
  title:"New spell",question:"Which one?",option_a:"Fire",option_b:"Earth",option_c:"Water",correct_option:"A"
 });
 assert.equal(newer.ok,true);
 assert.deepEqual(latestMagicSpotlight(newer.world.challenge,newer.world.panels),{
  kind:"challenge",id:newer.world.challenge.id
 });
});
