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
 "\nmodule.exports={applyMagicCommand,applyMagicLiveCall,demoMagicCommand,MAGIC_INITIAL_WORLD,latestMagicSpotlight,readMagicWorldSnapshot,safeMagicAnchor,magicCreatorContext};";
const worldModule={exports:{}};
new Function("module","exports",compiled)(worldModule,worldModule.exports);
const {applyMagicCommand,applyMagicLiveCall,demoMagicCommand,MAGIC_INITIAL_WORLD,latestMagicSpotlight,readMagicWorldSnapshot,safeMagicAnchor,magicCreatorContext}=worldModule.exports;

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
  const r=Math.hypot(px/(3.7*Math.sqrt(10)),pz/(3.25*Math.sqrt(10)));
  assert.ok(r>=.58&&r<=.95);
 }
 const oldState=applyMagicCommand(MAGIC_INITIAL_WORLD,"summon_object",{kind:"owl"}).world;
 assert.ok(readMagicWorldSnapshot(JSON.stringify(oldState)));
 assert.equal(demoMagicCommand("fox",MAGIC_INITIAL_WORLD).world.objects[0].kind,"fox");
});

test("3D overview camera and world-creature locomotion are wired",()=>{
 const scene=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicScene3D.tsx"),"utf8");
 assert.ok(scene.includes("camera={{position:[39.53,36.05,59.14]"));
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
 const dialog=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicHelpDialog.tsx"),"utf8");
 assert.match(page,/<MagicHelpDialog zh=\{zh\}/);
 assert.match(dialog,/className="magic-help-dialog"/);
 assert.match(dialog,/aria-modal="true"/);
 assert.match(dialog,/onClick=\{onClose\}/);
 assert.match(dialog,/onClick=\{onStart\}/);
 assert.match(page,/className="magic-overview-button"/);
 assert.match(page,/runDemo\("portal"\)/);
 assert.match(page,/runDemo\("puzzle"\)/);
 assert.match(scene,/orbit\.current\.target\.lerp/);
 assert.match(scene,/onStart=\{\(\)=>\{scriptedView\.current=false;/);
 assert.match(scene,/reacting=\{world\.adventureStep===3\}/);
});

test("magic imagination tools build visibly diverse and persistent 3D recipes",()=>{
 const a=applyMagicCommand(MAGIC_INITIAL_WORLD,"generate_magic_wonder",{
  shape:"vortex",palette:"aurora",motion:"spin",seed:91231,x:-.7,z:.2,size:1.4
 },"en");
 assert.equal(a.ok,true);
 assert.equal(a.event,"wonder-created");
 assert.equal(a.world.wonders.length,1);
 assert.equal(a.world.wonders[0].shape,"vortex");
 const b=applyMagicCommand(a.world,"generate_magic_wonder",{
  shape:"garden",palette:"rose",motion:"bloom",seed:7761,x:.75,z:-.45,size:.8
 },"en");
 assert.equal(b.world.wonders.length,2);
 assert.notDeepEqual(b.world.wonders[0],b.world.wonders[1]);
 const restored=readMagicWorldSnapshot(JSON.stringify(b.world));
 assert.deepEqual(restored,b.world);
 assert.equal(restored.wonders[0].seed,91231);
 assert.equal(restored.adventureStep,0);
 const surprise=demoMagicCommand("wonder",MAGIC_INITIAL_WORLD,"en");
 assert.equal(surprise.ok,true);
 assert.equal(surprise.world.wonders.length,2);
 assert.notEqual(surprise.world.wonders[0].shape,surprise.world.wonders[1].shape);
 assert.equal(surprise.world.panels.length,0);
 let filled=surprise.world;
 for(let i=0;i<8;i++){
  filled=applyMagicCommand(filled,"generate_magic_wonder",{
   shape:"lanterns",palette:"gold",motion:"rise",seed:i,x:.3,z:.8,size:1
  }).world;
 }
 assert.equal(filled.wonders.length,4);
 assert.ok(filled.wonders.every(w=>w.shape==="lanterns"));
});

test("imagination tools reject unsafe shapes, unbounded values and forged snapshots",()=>{
 const valid={shape:"orbit",palette:"gold",motion:"spin",seed:4,x:0,z:.3,size:1.4};
 for(const mutation of [
  {shape:"custom_shader"},{palette:"#ff0000"},{motion:"eval"},
  {seed:-1},{seed:1.5},{seed:1000000},{x:2},{z:Infinity},{size:3},{size:0}
 ]){
  const result=applyMagicCommand(MAGIC_INITIAL_WORLD,"generate_magic_wonder",{...valid,...mutation});
  assert.equal(result.ok,false,JSON.stringify(mutation));
  assert.equal(result.world,MAGIC_INITIAL_WORLD);
 }
 const out=applyMagicCommand(MAGIC_INITIAL_WORLD,"generate_magic_wonder",valid).world;
 assert.equal(readMagicWorldSnapshot(JSON.stringify({...out,wonders:[{...out.wonders[0],shape:"evil"}]})),null);
 assert.equal(readMagicWorldSnapshot(JSON.stringify({...out,wonders:[{...out.wonders[0],x:5}]})),null);
 assert.equal(readMagicWorldSnapshot(JSON.stringify({...out,wonders:[...out.wonders,...out.wonders,...out.wonders,...out.wonders,...out.wonders]})),null);
 const legacy=JSON.stringify(MAGIC_INITIAL_WORLD).replace(',"wonders":[]','');
 assert.equal(readMagicWorldSnapshot(legacy).wonders.length,0);
 assert.equal(demoMagicCommand("reset",out).world.wonders.length,0);
});

test("visual-first stage has a surprise action and keeps the quest optional",()=>{
 const page=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicPage.tsx"),"utf8");
 const scene=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicScene3D.tsx"),"utf8");
 const wonders=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicWonders3D.tsx"),"utf8");
 const live=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/liveTools.ts"),"utf8");
 assert.match(page,/runDemo\("creator"\)/);
 assert.match(page,/className="magic-surprise"/);
 assert.match(page,/className="magic-optional-quest"/);
 assert.match(scene,/MagicWonders3D wonders=\{world\.wonders\}/);
 assert.match(wonders,/wonder\.seed/);
 assert.match(live,/name:"generate_magic_wonder"/);
 assert.match(live,/2 or 3 compatible but DISTINCT shapes/);
});

test("AI shapes produce genuinely distinct structures for repeated wishes",()=>{
 const part=(shape,x,y,z,size=1)=>({shape,material:"metal",color:"gold",x,y,z,size});
 const first=applyMagicCommand(MAGIC_INITIAL_WORLD,"create_magic_entity",{
  label:"Gear guardian",idea:"walking protector",assembly:"gather",motion:"walk",mood:"brave",seed:120,
  parts:[part("box",0,.8,0),part("sphere",0,1.8,0,.6),part("cylinder",-.6,.3,0,.4),
   part("cylinder",.6,.3,0,.4)]
 },"en");
 assert.equal(first.ok,true);assert.equal(first.world.creations.length,1);
 const clone=applyMagicCommand(first.world,"create_magic_entity",{
  label:"Pink guardian",idea:"walking protector",assembly:"stack",motion:"walk",mood:"gentle",
  parts:[...first.world.creations[0].parts.map(p=>({...p,color:"rose"}))]
 });
 assert.equal(clone.ok,false);
 assert.equal(clone.event,"duplicate-structure-try-new-geometry");
 const newOne=applyMagicCommand(first.world,"create_magic_entity",{
  label:"Sky guardian",idea:"walking protector",assembly:"bloom",motion:"hover",mood:"curious",
  friend_of:first.world.creations[0].id,
  parts:[part("torus",0,1.8,0,1.1),part("octahedron",0,.8,0,.6),
   part("cone",-.9,1,0,.6),part("cone",.9,1,0,.6)]
 },"en");
 assert.equal(newOne.ok,true);
 assert.equal(newOne.world.creations.length,2);
 assert.equal(newOne.world.creations[1].friendOf,first.world.creations[0].id);
 assert.notEqual(newOne.world.creations[0].motion,newOne.world.creations[1].motion);
 const summary=magicCreatorContext(newOne.world);
 assert.match(summary,/Sky guardian/);assert.match(summary,/Gear guardian/);
 assert.match(summary,/friendOf/);
 assert.doesNotMatch(summary,/password|apiKey/);
 const loaded=readMagicWorldSnapshot(JSON.stringify(newOne.world));
 assert.deepEqual(loaded,newOne.world);
});
test("AI edits existing creation instead of remounting a separate copy",()=>{
 const base=demoMagicCommand("creator",MAGIC_INITIAL_WORLD,"en");
 assert.equal(base.ok,true);
 const before=base.world.creations[0];
 assert.ok(before.parts.length>=3);
 const moved=applyMagicCommand(base.world,"edit_magic_entity",{id:before.id,motion:"hover",mood:"gentle"});
 assert.equal(moved.ok,true);assert.equal(moved.event,"entity-evolved");
 assert.equal(moved.world.creations.length,1);
 assert.equal(moved.world.creations[0].id,before.id);
 assert.equal(moved.world.creations[0].motion,"hover");
 assert.ok(moved.world.creations[0].revision>before.revision);
 const revised=demoMagicCommand("evolve",moved.world,"en");
 assert.equal(revised.ok,true);
 assert.equal(revised.world.creations[0].id,before.id);
 assert.notDeepEqual(revised.world.creations[0].parts,before.parts);
 assert.deepEqual(readMagicWorldSnapshot(JSON.stringify(revised.world)),revised.world);
 assert.equal(demoMagicCommand("reset",revised.world).world.creations.length,0);
});
test("creator rejects malformed geometry, oversized parts and unrelated references",()=>{
 const example=demoMagicCommand("creator",MAGIC_INITIAL_WORLD).world.creations[0];
 const payload={label:"test",idea:"test",assembly:"gather",motion:"hover",mood:"brave",parts:example.parts};
 for(const changes of [
  {parts:example.parts.slice(0,2)},{parts:Array(13).fill(example.parts[0])},
  {parts:[{...example.parts[0],shape:"script"},...example.parts.slice(1)]},
  {parts:[{...example.parts[0],x:999},...example.parts.slice(1)]},
  {parts:[{...example.parts[0],material:"javascript"},...example.parts.slice(1)]},
  {friend_of:999999},{assembly:"arbitrary_shader"},{motion:"fly_forever"},
  {label:"\u202E"},
 ]){
  const r=applyMagicCommand(MAGIC_INITIAL_WORLD,"create_magic_entity",{...payload,...changes});
  assert.equal(r.ok,false,JSON.stringify(changes));
 }
 const created=applyMagicCommand(MAGIC_INITIAL_WORLD,"create_magic_entity",payload).world;
 assert.equal(applyMagicCommand(created,"edit_magic_entity",{id:123456,motion:"spin"}).ok,false);
 assert.equal(applyMagicCommand(created,"edit_magic_entity",{id:created.creations[0].id,parts:[...example.parts,...Array(10).fill(example.parts[0])]}).ok,false);
 const corrupt={...created,creations:[{...created.creations[0],parts:[{...example.parts[0],size:500},...example.parts.slice(1)]}]};
 assert.equal(readMagicWorldSnapshot(JSON.stringify(corrupt)),null);
});
test("creator demo cycles between distinct silhouettes and honors mobile limits",()=>{
 let world=MAGIC_INITIAL_WORLD;
 const names=[];
 const geometry=[];
 for(let i=0;i<3;i++){
  const result=demoMagicCommand("creator",world,"en");
  assert.equal(result.ok,true);
  world=result.world;
  names.push(world.creations[i].label);
  geometry.push(world.creations[i].parts.map(p=>p.shape).join("-"));
 }
 assert.equal(new Set(names).size,3);
 assert.equal(new Set(geometry).size,3);
 assert.equal(demoMagicCommand("creator",world).ok,false);
 assert.deepEqual(readMagicWorldSnapshot(JSON.stringify(world)),world);
 const source=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicCreations3D.tsx"),"utf8");
 const page=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicPage.tsx"),"utf8");
 assert.match(source,/creation\.parts\.map/);
 assert.match(source,/elapsed\/3\.8/);
 assert.match(source,/creation\.assembly==="stack"/);
 assert.match(page,/magicCreatorContext\(worldRef\.current\)/);
 assert.match(page,/onSelectCreation/);
 assert.match(page,/data-magic-demo=\{item\.id\}/);
});


test("AI-authored joints persist, animate distinct structures and reject unsafe commands",()=>{
 const original=demoMagicCommand("creator",MAGIC_INITIAL_WORLD).world.creations[0];
 const parts=original.parts.map((p,i)=>i===0?{...p,joint:"flap"}:i===1?{...p,joint:"hinge"}:p);
 const payload={label:"Articulated familiar",idea:"flapping clockwork bird",assembly:"spiral",motion:"hover",mood:"curious",parts};
 const result=applyMagicCommand(MAGIC_INITIAL_WORLD,"create_magic_entity",payload,"en");
 assert.equal(result.ok,true);
 assert.equal(result.world.creations[0].parts[0].joint,"flap");
 assert.deepEqual(readMagicWorldSnapshot(JSON.stringify(result.world)),result.world);
 assert.match(magicCreatorContext(result.world),/flap/);
 // Changing motion alone must not defeat the structural novelty guard.
 const copy=applyMagicCommand(result.world,"create_magic_entity",{...payload,label:"Repeat",motion:"walk",assembly:"stack",
  parts:parts.map(p=>({...p,color:"rose"}))});
 assert.equal(copy.event,"duplicate-structure-try-new-geometry");
 const edit=applyMagicCommand(result.world,"edit_magic_entity",{id:result.world.creations[0].id,
  parts:parts.map((p,i)=>i===0?{...p,joint:"tail"}:p)});
 assert.equal(edit.ok,true);
 assert.equal(edit.world.creations[0].id,result.world.creations[0].id);
 assert.equal(edit.world.creations[0].parts[0].joint,"tail");
 assert.equal(applyMagicCommand(MAGIC_INITIAL_WORLD,"create_magic_entity",
  {...payload,parts:[{...parts[0],joint:"javascript"},...parts.slice(1)]}).ok,false);
 const forged={...result.world,creations:[{...result.world.creations[0],
  parts:[{...parts[0],joint:"execute"},...parts.slice(1)]}]};
 assert.equal(readMagicWorldSnapshot(JSON.stringify(forged)),null);
 const renderer=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicCreations3D.tsx"),"utf8");
 const live=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/liveTools.ts"),"utf8");
 assert.match(renderer,/joint==="flap"/);
 assert.match(renderer,/joint==="hinge"/);
 assert.match(renderer,/joint==="wheel"/);
 assert.match(renderer,/joint==="tail"/);
 assert.match(renderer,/animated&&assembled>\.98/);
 assert.match(live,/enum:\["fixed","hinge","flap","wheel","tail"\]/);
});

test("key-free first magic adventure demos demonstrate distinct articulated silhouettes",()=>{
 const walking=demoMagicCommand("creator",MAGIC_INITIAL_WORLD,"en");
 assert.equal(walking.ok,true);
 assert.equal(walking.world.creations[0].motion,"walk");
 assert.ok(walking.world.creations[0].parts.filter(p=>p.joint==="hinge").length>=4);
 const floating=demoMagicCommand("creator",walking.world,"en");
 assert.equal(floating.ok,true);
 assert.equal(floating.world.creations[1].motion,"hover");
 assert.ok(floating.world.creations[1].parts.filter(p=>p.joint==="tail").length>=2);
 const tower=demoMagicCommand("creator",floating.world,"en");
 assert.equal(tower.ok,true);
 assert.equal(tower.world.creations[2].motion,"spin");
 assert.ok(tower.world.creations[2].parts.some(p=>p.joint==="wheel"));
 const evolved=demoMagicCommand("evolve",walking.world,"en");
 assert.equal(evolved.ok,true);
 assert.equal(evolved.world.creations[0].id,walking.world.creations[0].id);
 assert.ok(evolved.world.creations[0].parts.filter(p=>p.joint==="flap").length>=2);
 for(const world of [walking.world,floating.world,tower.world,evolved.world]){
  assert.deepEqual(readMagicWorldSnapshot(JSON.stringify(world)),world);
 }
});

test("Magic 3D island has tenfold walkable area, spatially distributed details and explorable camera",()=>{
 const scene=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicScene3D.tsx"),"utf8");
 const page=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicPage.tsx"),"utf8");
 const navigation=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/magicNavigation.ts"),"utf8");
 assert.match(scene,/ISLAND_LINEAR_SCALE=Math.sqrt\(10\)/);
 assert.match(scene,/ISLAND_X_RADIUS=5\.65\*ISLAND_LINEAR_SCALE/);
 assert.match(scene,/ISLAND_Z_RADIUS=4\.75\*ISLAND_LINEAR_SCALE/);
 assert.match(scene,/<OuterDistricts colors=\{colors\}/);
 assert.match(scene,/enablePan enableDamping/);
 assert.match(scene,/maxDistance=\{110\}/);
 assert.match(scene,/far:180/);
 assert.match(navigation,/RING_X=3\.7\*Math.sqrt\(10\)/);
 assert.match(page,/data-magic-map-area="10"/);
 const [x,z]=safeMagicAnchor(1,0);
 assert.ok(x>10&&x<12);
 assert.equal(z,0);
 const [cx,cz]=safeMagicAnchor(0,0);
 assert.ok(cx>6&&cx<8);
 assert.equal(cz,0);
});

test("safe detailed geometry accepts capsule and leaf without accepting arbitrary parts",()=>{
 const part=(shape,x,y,z,joint)=>({shape,material:"metal",color:"azure",x,y,z,size:.8,...(joint?{joint}:{})});
 const result=applyMagicCommand(MAGIC_INITIAL_WORLD,"create_magic_entity",{
  label:"Feathered clockwork fox",idea:"rounded body with articulated feathers",
  assembly:"stack",motion:"walk",mood:"curious",seed:84621,
  parts:[part("capsule",0,.55,0),part("leaf",-.95,1.3,0,"flap"),
   part("leaf",.95,1.3,0,"flap"),part("sphere",0,1.5,.1)]
 });
 assert.equal(result.ok,true);
 assert.equal(result.world.creations[0].parts[0].shape,"capsule");
 assert.equal(result.world.creations[0].parts[1].shape,"leaf");
 assert.deepEqual(readMagicWorldSnapshot(JSON.stringify(result.world)),result.world);
 const invalid=applyMagicCommand(MAGIC_INITIAL_WORLD,"create_magic_entity",{
  label:"unsafe",idea:"unsafe",assembly:"gather",motion:"still",mood:"gentle",
  parts:[part("capsule",0,1,0),part("evilMesh",0,.4,0),part("leaf",1,1,0)]
 });
 assert.equal(invalid.ok,false);
 const live=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/liveTools.ts"),"utf8");
 assert.match(live,/enum:\["box","sphere","cone","cylinder","torus","octahedron","capsule","leaf"\]/);
});

test("parametric 3D parts preserve safe aspect ratios, finishes and indexed attachments",()=>{
 const part=(shape,x,y,z)=>({shape,material:"metal",color:"azure",x,y,z,size:.7});
 const parts=[
  {...part("capsule",0,.8,0),width:1.4,height:1.7,depth:1.1,profile:"armor"},
  {...part("sphere",0,1.9,.1),width:1.25,height:.65,depth:.9,profile:"mechanical",connectTo:0},
  {...part("leaf",-.94,1.2,0),width:1.9,height:.55,depth:.65,profile:"organic",yaw:-45,joint:"flap",connectTo:0},
  {...part("leaf",.94,1.2,0),width:1.9,height:.55,depth:.65,profile:"organic",yaw:45,joint:"flap",connectTo:0}
 ];
 const payload={label:"Articulated figure",idea:"character with shoulder armor and slim wings",
  parts,assembly:"gather",motion:"hover",mood:"curious",seed:12812};
 const made=applyMagicCommand(MAGIC_INITIAL_WORLD,"create_magic_entity",payload,"en");
 assert.equal(made.ok,true);
 const saved=readMagicWorldSnapshot(JSON.stringify(made.world));
 assert.deepEqual(saved,made.world);
 assert.equal(saved.creations[0].parts[1].connectTo,0);
 const evolved=applyMagicCommand(saved,"edit_magic_entity",{
  id:saved.creations[0].id,parts:parts.map((p,i)=>i===0?{...p,width:1.95,profile:"mechanical"}:p)
 });
 assert.equal(evolved.ok,true);
 assert.equal(evolved.world.creations[0].id,saved.creations[0].id);
 assert.equal(evolved.world.creations[0].parts[0].width,1.95);
 assert.equal(readMagicWorldSnapshot(JSON.stringify(evolved.world)).creations[0].parts[0].width,1.95);
 const variant=applyMagicCommand(saved,"create_magic_entity",{
  ...payload,label:"Different proportions",parts:parts.map((p,i)=>i===0?{...p,width:2.05}:p)
 });
 assert.equal(variant.ok,true,"proportions create new silhouettes, not merely new colors");
});
test("parametric 3D authoring rejects invalid sizes, angle, surface profiles and cyclic parents",()=>{
 const original=demoMagicCommand("creator",MAGIC_INITIAL_WORLD,"en").world.creations[0];
 const payload={label:"Invalid",idea:"test",parts:original.parts,
  assembly:"gather",motion:"walk",mood:"gentle"};
 const cases=[
  {width:0},{width:2.3},{height:NaN},{depth:-.4},{yaw:181},{yaw:"90"},
  {profile:"shader"},{profile:"pixel_streaming"},{connectTo:-1},{connectTo:99},
  {connectTo:0},{connectTo:1.5},{connectTo:"0"}
 ];
 for(const bad of cases){
  const parts=original.parts.map((p,i)=>i===(bad.connectTo===0?0:1)?{...p,...bad}:p);
  const r=applyMagicCommand(MAGIC_INITIAL_WORLD,"create_magic_entity",{...payload,parts});
  assert.equal(r.ok,false,JSON.stringify(bad));
 }
 const badSnapshot={...MAGIC_INITIAL_WORLD,creations:[{
  ...original,parts:original.parts.map((p,i)=>i===1?{...p,profile:"js-execute"}:p)
 }]};
 assert.equal(readMagicWorldSnapshot(JSON.stringify(badSnapshot)),null);
});
test("freeform parametric rendering exposes proportions and physical connectors without unsafe shaders",()=>{
 const file=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicCreations3D.tsx"),"utf8");
 const accents=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicPartAccents3D.tsx"),"utf8");
 const tools=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/liveTools.ts"),"utf8");
 assert.match(file,/part\.width\?\?1,part\.height\?\?1,part\.depth\?\?1/);
 assert.match(file,/rod\.quaternion\.setFromUnitVectors\(LINK_UP/);
 assert.match(file,/MagicPartAccents3D part=\{part\}/);
 assert.match(accents,/profile==="armor"/);
 assert.match(accents,/profile==="mechanical"/);
 assert.match(tools,/connectTo:/);
 assert.match(tools,/width:/);
});

test("semantic AI microdetails are bounded, typed and persist across creator edits",()=>{
 const base=demoMagicCommand("creator",MAGIC_INITIAL_WORLD,"en");
 assert.equal(base.ok,true);
 const robot=base.world.creations[0];
 assert.equal(robot.parts[0].detail,"core");
 assert.equal(robot.parts[1].detail,"face");
 const stored=readMagicWorldSnapshot(JSON.stringify(base.world));
 assert.deepEqual(stored,base.world);
 const geometry=robot.parts.map(p=>({...p}));
 const edited=applyMagicCommand(base.world,"edit_magic_entity",{
  id:robot.id,parts:geometry.map((p,i)=>i===2?{...p,detail:"rune"}:p)
 });
 assert.equal(edited.ok,true);
 assert.equal(edited.world.creations[0].parts[2].detail,"rune");
 assert.deepEqual(readMagicWorldSnapshot(JSON.stringify(edited.world)),edited.world);
 assert.equal(magicCreatorContext(edited.world).includes("rune"),true);
 const similar=applyMagicCommand(base.world,"create_magic_entity",{
  label:"Other optics",idea:"different identity",parts:geometry.map((p,i)=>
   i===0?{...p,detail:"vent"}:p),
  assembly:"gather",motion:"walk",mood:"brave",x:.4,z:.5
 });
 assert.equal(similar.ok,true,"a changed functional feature can change an otherwise identical shape");
});
test("unsafe AI microdetails, incompatible geometry and excessive part adornment reject",()=>{
 const original=demoMagicCommand("creator",MAGIC_INITIAL_WORLD,"en").world.creations[0];
 const payload={label:"Invalid detail",idea:"test",assembly:"gather",motion:"walk",
  mood:"gentle",parts:original.parts};
 for(const mutation of [
  {index:0,detail:"html"},{index:1,detail:"thruster"},
  {index:0,detail:"face"},{index:2,detail:"core"},
  {index:0,detail:"not-real"},
 ]){
  const parts=original.parts.map((p,i)=>i===mutation.index?{...p,detail:mutation.detail}:p);
  const r=applyMagicCommand(MAGIC_INITIAL_WORLD,"create_magic_entity",{...payload,parts});
  assert.equal(r.ok,false,"invalid detail/shape combo must fail: "+JSON.stringify(mutation));
 }
 const many=original.parts.map((p,i)=>({...p,
  ...(i>=2&&i<=6?{detail:p.shape==="capsule"?"vent":p.shape==="torus"?undefined:"rune"}:{})}));
 const over=applyMagicCommand(MAGIC_INITIAL_WORLD,"create_magic_entity",{
  ...payload,parts:many
 });
 assert.equal(over.ok,false,"per-creation detailed pieces must stay within phone budget");
 const forged={...MAGIC_INITIAL_WORLD,creations:[{
  ...original,parts:original.parts.map((p,i)=>i===1?{...p,detail:"eval"}:p)
 }]};
 assert.equal(readMagicWorldSnapshot(JSON.stringify(forged)),null);
});
test("semantic identity faces, reactors, vents and distance LOD are wired to Three.js",()=>{
 const renderer=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicCreations3D.tsx"),"utf8");
 const micro=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicPartIdentity3D.tsx"),"utf8");
 const live=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/liveTools.ts"),"utf8");
 assert.match(renderer,/MagicPartIdentity3D part=\{part\}/);
 assert.match(renderer,/detailGroups\.current/);
 assert.match(renderer,/distanceToSquared\(camera\.position\)<30\*30/);
 for(const type of ["face","core","vent","thruster"])
  assert.match(micro,new RegExp('detail==="'+type+'"'));
 assert.match(live,/name:"create_magic_entity"/);
 assert.match(live,/detail:\{type:"STRING",enum:\["face","core","vent","thruster","rune"\]/);
 assert.match(live,/name:"edit_magic_entity"/);
});
