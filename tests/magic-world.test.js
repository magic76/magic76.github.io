const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
// TypeScript 7 no longer exposes the legacy transpileModule/ModuleKind runtime
// API. This pure reducer can be stripped with Node 22's built-in TS support.
const source=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/world.ts"),"utf8");
const stripped=stripTypeScriptTypes(source,{mode:"strip"});
const compiled=stripped.replace(/\bexport\s+(?=(?:function|const|class)\b)/g,"")+
 "\nmodule.exports={applyMagicCommand,applyMagicLiveCall,demoMagicCommand,MAGIC_INITIAL_WORLD,latestMagicSpotlight,readMagicWorldSnapshot,safeMagicAnchor};";
const worldModule={exports:{}};
new Function("module","exports",compiled)(worldModule,worldModule.exports);
const {applyMagicCommand,applyMagicLiveCall,demoMagicCommand,MAGIC_INITIAL_WORLD,latestMagicSpotlight,readMagicWorldSnapshot,safeMagicAnchor}=worldModule.exports;

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

test("Live tool retries with the same call id replay a bounded cached result",()=>{
 const seen=new Map();
 const first=applyMagicLiveCall(MAGIC_INITIAL_WORLD,{id:"call-1",name:"summon_object",args:{kind:"dragon"}},seen);
 assert.equal(first.duplicate,false);
 assert.equal(first.result.world.objects.length,1);
 const newer=applyMagicCommand(first.result.world,"cast_spell",{spell:"sparkles"}).world;
 const retry=applyMagicLiveCall(newer,{id:"call-1",name:"summon_object",args:{kind:"dragon"}},seen);
 assert.equal(retry.duplicate,true);
 assert.equal(retry.result.world.objects.length,1);
 for(let n=2;n<=66;n++)applyMagicLiveCall(newer,{id:"call-"+n,name:"tell_story",args:{message:"story "+n}},seen);
 assert.equal(seen.size,64);
 assert.equal(seen.has("call-1"),false);
 const noId=applyMagicLiveCall(newer,{name:"summon_object",args:{kind:"owl"}},seen);
 assert.equal(noId.duplicate,false);
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

test("3D scene presets produce genuinely different allowed theme and weather states",()=>{
 const snowy=demoMagicCommand("snow",MAGIC_INITIAL_WORLD,"en");
 assert.equal(snowy.ok,true);
 assert.equal(snowy.world.weather,"snow");
 assert.equal(snowy.world.time,"night");
 const forest=demoMagicCommand("forest",snowy.world,"en");
 assert.equal(forest.ok,true);
 assert.equal(forest.world.theme,"forest");
 assert.equal(forest.world.weather,"clear");
 const candy=demoMagicCommand("candy",forest.world,"en");
 assert.equal(candy.ok,true);
 assert.equal(candy.world.theme,"candy");
 const storm=demoMagicCommand("rain",candy.world,"en");
 assert.equal(storm.ok,true);
 assert.equal(storm.world.weather,"rain");
 const sunny=demoMagicCommand("sunny",storm.world,"en");
 assert.equal(sunny.ok,true);
 assert.equal(sunny.world.theme,"sky");
 assert.equal(sunny.world.weather,"clear");
 assert.equal(sunny.world.time,"day");
 assert.equal(sunny.world.revision,MAGIC_INITIAL_WORLD.revision+5);
});

test("Gemini world events are whitelisted and safely create distinct visual state",()=>{
 const events=["meteor","rainbow","festival","aurora"];
 let world=MAGIC_INITIAL_WORLD;
 for(const kind of events){
  const outcome=applyMagicCommand(world,"trigger_world_event",{kind},"en");
  assert.equal(outcome.ok,true);
  assert.equal(outcome.world.event,kind);
  assert.equal(outcome.event,"world-event-started");
  world=outcome.world;
 }
 assert.equal(world.time,"night");
 const invalid=applyMagicCommand(world,"trigger_world_event",{kind:"execute_html"});
 assert.equal(invalid.ok,false);
 assert.equal(invalid.world,world);
 const reset=demoMagicCommand("reset",world);
 assert.equal(reset.world.event,null);
 const meteor=demoMagicCommand("meteor",MAGIC_INITIAL_WORLD);
 assert.equal(meteor.world.event,"meteor");
 const rainbow=demoMagicCommand("rainbow",MAGIC_INITIAL_WORLD);
 assert.equal(rainbow.world.event,"rainbow");
 const aurora=demoMagicCommand("aurora",MAGIC_INITIAL_WORLD);
 assert.equal(aurora.world.time,"night");
});

test("destination portal changes real 3D world state and advances the story",()=>{
 const first=demoMagicCommand("portal",MAGIC_INITIAL_WORLD,"en");
 assert.equal(first.ok,true);
 assert.equal(first.world.objects[0].kind,"portal");
 assert.equal(first.world.panels[0].portalTravel,true);
 for(const [choice,theme,time,weather] of [["A","forest","day","clear"],["B","candy","day","clear"],["C","sky","night","stars"]]){
  const traveled=applyMagicCommand(first.world,"select_magic_panel",{choice},"en");
  assert.equal(traveled.ok,true);
  assert.equal(traveled.event,"portal-traveled");
  assert.equal(traveled.world.theme,theme);
  assert.equal(traveled.world.time,time);
  assert.equal(traveled.world.weather,weather);
  assert.equal(traveled.world.chapter,2);
  assert.equal(traveled.world.panels[0].selected,choice);
  assert.equal(applyMagicCommand(traveled.world,"select_magic_panel",{choice:"A"}).ok,false);
 }
 const custom=applyMagicCommand(MAGIC_INITIAL_WORLD,"create_magic_panel",{
  panel_type:"quest",title:"Normal quest",description:"Pick",
  item_a:"A",item_b:"B",item_c:"C"
 });
 const selected=applyMagicCommand(custom.world,"select_magic_panel",{choice:"B"});
 assert.equal(selected.event,"panel-selected");
 assert.equal(selected.world.theme,"sky");
});

test("portal still opens destination UI when the world is full",()=>{
 let state=MAGIC_INITIAL_WORLD;
 for(let i=0;i<6;i++)state=applyMagicCommand(state,"summon_object",{kind:"owl"}).world;
 const result=applyMagicCommand(state,"open_world_portal",{});
 assert.equal(result.ok,true);
 assert.equal(result.world.objects.length,6);
 assert.equal(result.world.panels.at(-1).portalTravel,true);
});

test("refresh restores safe tab-local world, selected destination and chapter",()=>{
 const start=demoMagicCommand("portal",MAGIC_INITIAL_WORLD,"en").world;
 const visited=applyMagicCommand(start,"select_magic_panel",{choice:"B"}).world;
 const altered=applyMagicCommand(visited,"trigger_world_event",{kind:"rainbow"}).world;
 const restored=readMagicWorldSnapshot(JSON.stringify(altered));
 assert.ok(restored);
 assert.deepEqual(restored,altered);
 assert.equal(restored.chapter,2);
 assert.equal(restored.theme,"candy");
 assert.equal(restored.panels[0].portalTravel,true);
 assert.equal(readMagicWorldSnapshot(null),null);
 assert.equal(readMagicWorldSnapshot("{bad"),null);
 assert.equal(readMagicWorldSnapshot("a".repeat(16001)),null);
 assert.equal(readMagicWorldSnapshot(JSON.stringify({...altered,theme:"hacked"})),null);
 assert.equal(readMagicWorldSnapshot(JSON.stringify({...altered,objects:[{kind:"evil",slot:0,id:1}]})),null);
 assert.equal(readMagicWorldSnapshot(JSON.stringify({...altered,chapter:-1})),null);
});

test("restore sanitizes untrusted saved text and refuses invalid panels",()=>{
 const base=demoMagicCommand("portal",MAGIC_INITIAL_WORLD).world;
 const control=String.fromCharCode(0x202e);
 const input=JSON.stringify({...base,message:"Safe"+control+" legend",
  panels:[{...base.panels[0],title:"Hello"+control+"World"}]});
 const restored=readMagicWorldSnapshot(input);
 assert.ok(restored);
 assert.equal(restored.message.includes(control),false);
 assert.equal(restored.panels[0].title.includes(control),false);
 const corrupted=JSON.stringify({...base,panels:[{...base.panels[0],items:["A","B",""]}]});
 assert.equal(readMagicWorldSnapshot(corrupted),null);
});

test("castle ice transformation is allowlisted, reversible and persistent",()=>{
 const ice=applyMagicCommand(MAGIC_INITIAL_WORLD,"transform_castle",{form:"ice"},"en");
 assert.equal(ice.ok,true);
 assert.equal(ice.event,"castle-transformed");
 assert.equal(ice.world.castle,"ice");
 assert.equal(ice.world.weather,"snow");
 assert.equal(ice.world.time,"night");
 assert.equal(ice.world.cue,"castle_transformation");
 assert.equal(ice.world.revision,MAGIC_INITIAL_WORLD.revision+1);
 const stored=readMagicWorldSnapshot(JSON.stringify(ice.world));
 assert.ok(stored);
 assert.equal(stored.castle,"ice");
 assert.equal(stored.cue,"castle_transformation");
 assert.equal(applyMagicCommand(stored,"transform_castle",{form:"ice"}).ok,false);
 const thaw=applyMagicCommand(stored,"transform_castle",{form:"stone"},"en");
 assert.equal(thaw.ok,true);
 assert.equal(thaw.world.castle,"stone");
 assert.equal(thaw.world.weather,"clear");
 assert.equal(thaw.world.time,"day");
 const reset=demoMagicCommand("reset",ice.world);
 assert.equal(reset.world.castle,"stone");
 assert.equal(reset.world.cue,null);
});
test("dragon entrance and composite ice spell retain visual changes",()=>{
 const summoned=applyMagicCommand(MAGIC_INITIAL_WORLD,"summon_object",{kind:"dragon"});
 assert.equal(summoned.world.cue,"dragon_arrival");
 const spell=demoMagicCommand("dragonice",MAGIC_INITIAL_WORLD,"en");
 assert.equal(spell.ok,true);
 assert.equal(spell.world.objects.filter(o=>o.kind==="dragon").length,1);
 assert.equal(spell.world.castle,"ice");
 assert.equal(spell.world.cue,"castle_transformation");
 assert.equal(spell.world.revision,2);
 const later=applyMagicCommand(spell.world,"tell_story",{message:"Next chapter"});
 assert.equal(later.world.castle,"ice");
 assert.equal(later.world.cue,null);
 const malformed=applyMagicCommand(MAGIC_INITIAL_WORLD,"transform_castle",{form:"<script>alert(1)</script>"});
 assert.equal(malformed.ok,false);
 assert.equal(malformed.world,MAGIC_INITIAL_WORLD);
 const corrupt=JSON.stringify({...spell.world,castle:"execute_html"});
 assert.equal(readMagicWorldSnapshot(corrupt),null);
 const migrated=JSON.stringify(MAGIC_INITIAL_WORLD).replace(/,"castle":"stone"/,"").replace(/,"cue":null/,"");
 assert.equal(readMagicWorldSnapshot(migrated).castle,"stone");
});
test("2D world renderer and switch have been removed, 3D fallback is explicit",()=>{
 const page=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicPage.tsx"),"utf8");
 assert.doesNotMatch(page,/className="magic-island"/);
 assert.doesNotMatch(page,/magic-view-switch/);
 assert.doesNotMatch(page,/useThreeWorld/);
 assert.match(page,/magic-3d-unavailable/);
 assert.match(page,/MagicScene3D/);
});

test("Gemini can place and relocate animals without unbounded coordinates or code",()=>{
 const fox=applyMagicCommand(MAGIC_INITIAL_WORLD,"summon_object",{kind:"fox",x:-.8,z:.35},"en");
 assert.equal(fox.ok,true);
 assert.equal(fox.world.objects[0].kind,"fox");
 assert.equal(fox.world.objects[0].x,-.8);
 const moved=applyMagicCommand(fox.world,"move_object",{kind:"fox",x:.45,z:.8},"en");
 assert.equal(moved.ok,true);
 assert.equal(moved.world.objects[0].x,.45);
 assert.equal(moved.world.objects[0].z,.8);
 assert.equal(moved.world.objects[0].id,fox.world.objects[0].id);
 assert.equal(moved.world.objects[0].slot,fox.world.objects[0].slot);
 assert.equal(moved.event,"object-moved");
 assert.equal(applyMagicCommand(moved.world,"move_object",{id:fox.world.objects[0].id,x:.45,z:.8}).ok,false);
 assert.equal(applyMagicCommand(moved.world,"move_object",{id:999999,x:0,z:0}).ok,false);
 const saved=readMagicWorldSnapshot(JSON.stringify(moved.world));
 assert.ok(saved);
 assert.deepEqual(saved.objects,moved.world.objects);
 const outOfBounds=applyMagicCommand(moved.world,"move_object",{kind:"fox",x:999,z:0});
 assert.equal(outOfBounds.ok,false);
 assert.equal(outOfBounds.world,moved.world);
 for(const invalid of [Infinity,"0.2",null,NaN]){
  assert.equal(applyMagicCommand(moved.world,"move_object",{kind:"fox",x:invalid,z:0}).ok,false);
 }
 assert.equal(applyMagicCommand(moved.world,"summon_object",{kind:"owl",x:.6}).ok,false);
 assert.equal(readMagicWorldSnapshot(JSON.stringify({...moved.world,objects:[{id:1,kind:"fox",slot:0,x:40,z:0}]})),null);
});

test("stage coordinate projection keeps roaming animals on the island path",()=>{
 for(const [x,z] of [[0,0],[-1,-1],[1,1],[0,1],[.8,-.1]]){
  const [px,pz]=safeMagicAnchor(x,z);
  assert.equal(Number.isFinite(px),true);
  assert.equal(Number.isFinite(pz),true);
  const r=Math.hypot(px/3.7,pz/3.25);
  assert.ok(r>=.58&&r<=.95);
 }
 const oldState=applyMagicCommand(MAGIC_INITIAL_WORLD,"summon_object",{kind:"owl"}).world;
 assert.ok(readMagicWorldSnapshot(JSON.stringify(oldState)));
 assert.equal(demoMagicCommand("fox",MAGIC_INITIAL_WORLD).world.objects[0].kind,"fox");
});

test("3D overview camera and world-creature locomotion are wired",()=>{
 const scene=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicScene3D.tsx"),"utf8");
 assert.ok(scene.includes("camera={{position:[12.5,11.4,18.7]"));
 assert.ok(scene.includes("safeMagicAnchor(obj.x,obj.z)"));
 assert.ok(scene.includes('kind==="fox"'));
 assert.ok(scene.includes("root.current.position"));
 assert.ok(scene.includes('kind==="dragon"?1.75'));
});

test("first magic adventure is a real portal, companion, spell, clue loop",()=>{
 const opened=demoMagicCommand("portal",MAGIC_INITIAL_WORLD,"en");
 assert.equal(opened.world.adventureStep,0);
 const traveled=applyMagicCommand(opened.world,"select_magic_panel",{choice:"A"},"en");
 assert.equal(traveled.ok,true);
 assert.equal(traveled.world.theme,"forest");
 assert.equal(traveled.world.adventureStep,1);
 const friend=demoMagicCommand("dragon",traveled.world,"en");
 assert.equal(friend.world.adventureStep,2);
 assert.equal(friend.world.objects.some(o=>o.kind==="dragon"),true);
 const ice=demoMagicCommand("icecastle",friend.world,"en");
 assert.equal(ice.ok,true);
 assert.equal(ice.world.adventureStep,3);
 assert.equal(ice.world.castle,"ice");
 assert.equal(ice.world.weather,"snow");
 assert.equal(ice.world.event,"aurora");
 assert.equal(ice.world.objects.some(o=>o.kind==="crystal"),true);
 const reloaded=readMagicWorldSnapshot(JSON.stringify(ice.world));
 assert.deepEqual(reloaded,ice.world);
 const tappedCrystal=demoMagicCommand("puzzle",reloaded,"en");
 assert.equal(tappedCrystal.world.challenge?.title,"The Star Gate");
 assert.equal(tappedCrystal.world.adventureStep,3);
 const reset=demoMagicCommand("reset",tappedCrystal.world,"en");
 assert.equal(reset.world.adventureStep,0);
 assert.equal(reset.world.objects.length,0);
});

test("unrelated spells cannot skip adventure stages",()=>{
 const spell=applyMagicCommand(MAGIC_INITIAL_WORLD,"cast_spell",{spell:"fire"});
 assert.equal(spell.world.adventureStep,0);
 const companion=demoMagicCommand("dragon",MAGIC_INITIAL_WORLD);
 assert.equal(companion.world.adventureStep,0);
 const opening=demoMagicCommand("portal",companion.world);
 const traveled=applyMagicCommand(opening.world,"select_magic_panel",{choice:"C"});
 assert.equal(traveled.world.adventureStep,1);
 const unrelated=applyMagicCommand(traveled.world,"transform_castle",{form:"ice"});
 assert.equal(unrelated.world.adventureStep,1);
 const saved=readMagicWorldSnapshot(JSON.stringify({...traveled.world,adventureStep:99}));
 assert.equal(saved,null);
 const legacy=readMagicWorldSnapshot(JSON.stringify(MAGIC_INITIAL_WORLD).replace(',"adventureStep":0',''));
 assert.equal(legacy?.adventureStep,0);
});

test("the guided adventure provides a visible action and a working help dialog",()=>{
 const page=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicPage.tsx"),"utf8");
 const scene=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicScene3D.tsx"),"utf8");
 assert.match(page,/className="magic-adventure-guide"/);
 assert.match(page,/className="magic-help-dialog"/);
 assert.match(page,/aria-modal="true"/);
 assert.match(page,/className="magic-overview-button"/);
 assert.match(page,/runDemo\("portal"\)/);
 assert.match(page,/runDemo\("puzzle"\)/);
 assert.match(scene,/orbit\.current\.target\.lerp/);
 assert.match(scene,/onStart=\{\(\)=>\{scriptedView\.current=false;/);
 assert.match(scene,/reacting=\{world\.adventureStep===3\}/);
});
