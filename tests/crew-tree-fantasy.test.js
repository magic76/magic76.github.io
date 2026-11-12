'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.join(__dirname,'../web-spa/public/crew-tree-lab/art-studies');
const source=fs.readFileSync(path.join(ROOT,'study.js'),'utf8');
const painter=fs.readFileSync(path.join(ROOT,'character-paint.js'),'utf8');
const v3=fs.readFileSync(path.join(ROOT,'v3-art.js'),'utf8');
const v4=fs.readFileSync(path.join(ROOT,'v4-art.js'),'utf8');
const v5=fs.readFileSync(path.join(ROOT,'v5-art.js'),'utf8');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
function boot(){
 const nodes=new Map(),gradient=()=>({addColorStop(){}}),draw={paths:0};
 const ctx=new Proxy({createLinearGradient:gradient,createRadialGradient:gradient,beginPath(){draw.paths++;}},
  {get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>{o[k]=v;return true;}});
 const element=id=>({id,dataset:{},textContent:'',width:0,height:0,addEventListener(){},
  setAttribute(){},getBoundingClientRect(){return {width:390,height:420}},getContext(){return ctx}});
 const get=id=>{if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id);};
 const previews=[3,8,16].map(n=>{const e=element('p');e.dataset.preview=String(n);return e;});
 const buttons=Object.fromEntries(['scene','stage','topic'].map(key=>[key,
  (key==='scene'?['island','jelly']:key==='stage'?['3','8','16']:['cosmos','warmth','music','travel'])
  .map(value=>{const e=element('b');e.dataset[key]=value;return e;})]));
 const doc={getElementById:get,querySelectorAll(sel){
  if(sel==='[data-preview]')return previews;
  const key=sel.replace('[data-','').replace(']','');
  return buttons[key]||[];
 }};
 class MockImage{complete=true;naturalWidth=500;set src(v){this.path=v;}}
 const win={matchMedia:()=>({matches:true,addEventListener(){}}),Image:MockImage,addEventListener(){}};
 const scope={window:win,document:doc,location:{search:'?qa=1'},Math,URLSearchParams,Number,Map,
  requestAnimationFrame(){throw Error('Reduced-motion page should be still');}};
 vm.createContext(scope);vm.runInContext(v3,scope,{timeout:10000});vm.runInContext(v4,scope,{timeout:10000});vm.runInContext(v5,scope,{timeout:10000});vm.runInContext(painter,scope,{timeout:10000});vm.runInContext(source,scope,{timeout:10000});
 return {qa:win.__CREW_STUDIES_QA__,draw};
}
test('isolated art studies never touch current V5 storage or chat',()=>{
 assert.match(html,/data-scene="island"/);assert.match(html,/data-scene="jelly"/);
 assert.match(html,/data-stage="16"/);assert.match(html,/V5 收藏/);
 assert.match(html,/character-paint\.js\?v=5-20261113/);
 assert.match(html,/v3-art\.js\?v=5-20261113/);
 assert.match(html,/v4-art\.js\?v=5-20261113/);
 assert.match(html,/v5-art\.js\?v=5-20261113/);
 assert.match(html,/simulateChatBtn/);
 assert.match(html,/tabindex="0"/);
 assert.match(html,/silhouetteBtn/);
 assert.doesNotMatch(source,/\blocalStorage\b|\bfetch\s*\(|\bWebSocket\b/);
});
test('same floating islands survive later stages',()=>{
 const {qa,draw}=boot();assert.equal(qa.previews(),3);
 for(const seed of [1,103,241,4097]){
  const a=qa.sceneModel('island',3,seed,'cosmos');
  const b=qa.sceneModel('island',8,seed,'cosmos');
  const c=qa.sceneModel('island',16,seed,'cosmos');
  assert.deepEqual([a.units.length,b.units.length,c.units.length],[1,2,4]);
  assert.deepEqual(JSON.parse(JSON.stringify(a.units)),JSON.parse(JSON.stringify(c.units.slice(0,1))));
  assert.deepEqual(JSON.parse(JSON.stringify(b.units)),JSON.parse(JSON.stringify(c.units.slice(0,2))));
  assert.equal(JSON.stringify(c),JSON.stringify(qa.sceneModel('island',16,seed,'cosmos')));
 }
 assert.ok(draw.paths>150,'islands use layered mineral washes, roots and falling debris');
 assert.deepEqual([qa.sceneModel('island',3,103).silhouette.mainIslandScale,qa.sceneModel('island',8,103).silhouette.mainIslandScale,qa.sceneModel('island',16,103).silhouette.mainIslandScale],[.44,.82,1]);
 assert.deepEqual(JSON.parse(JSON.stringify(qa.sceneModel('island',16,103).units.map(x=>x.species))),['spiral','weeping','lantern-fruit','crescent']);
});
test('jellyfish grows new bones without relocating existing ones',()=>{
 const {qa}=boot();
 for(const seed of [103,241]){
  const a=qa.sceneModel('jelly',3,seed,'music');
  const b=qa.sceneModel('jelly',8,seed,'music');
  const c=qa.sceneModel('jelly',16,seed,'music');
  assert.deepEqual([a.arms.length,b.arms.length,c.arms.length],[6,11,19]);
  assert.deepEqual(JSON.parse(JSON.stringify(a.arms)),JSON.parse(JSON.stringify(c.arms.slice(0,6))));
  assert.deepEqual(JSON.parse(JSON.stringify(b.arms)),JSON.parse(JSON.stringify(c.arms.slice(0,11))));
  assert.deepEqual([a.silhouette.domeWidth,b.silhouette.domeWidth,c.silhouette.domeWidth],[136,365,555]);
  assert.deepEqual([a.silhouette.twistStrands,b.silhouette.twistStrands,c.silhouette.twistStrands],[0,4,6]);
  assert.equal(c.silhouette.secondaryCanopy,1);
 }
});
test('topic branches represent distinct attached structures',()=>{
 const {qa}=boot();
 for(const scene of ['island','jelly']){
  const values=['cosmos','warmth','music','travel'].map(t=>qa.sceneModel(scene,16,103,t).attachment);
  assert.equal(new Set(values).size,4);
 }
});
test('all four original plates and explicitly named authoring tools are present',()=>{
 for(const name of ['floating-island.svg','island-crown.svg','jelly-canopy.svg','lantern-bud.svg',
 'crown-spiral.svg','crown-willow.svg','crown-lantern.svg','crown-moon.svg','jelly-inner-membrane.svg','spiral-leaf-tiers.svg']){
  const svg=fs.readFileSync(path.join(ROOT,'assets',name),'utf8');
  assert.match(svg,/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg,/<title>/);assert.doesNotMatch(svg,/<script|<foreignObject/);
 }
 const bake=fs.readFileSync(path.join(ROOT,'bake.js'),'utf8');
 assert.match(bake,/p5\.brush@3\.0\.0/);assert.match(bake,/paper\.PaperScope/);
 assert.match(bake,/brush\.render\(\)/);assert.match(bake,/readSkeletonJson/);
 assert.match(bake,/vendor\/rigby2d\/src\/core\/interop\.js/);
 const license=fs.readFileSync(path.join(ROOT,'vendor/rigby2d/LICENSE-MIT'),'utf8');
 assert.match(license,/MIT License/);
 const upstream=fs.readFileSync(path.join(ROOT,'vendor/rigby2d/src/core/interop.js'),'utf8');
 assert.match(upstream,/SPDX-License-Identifier: MIT OR Apache-2.0/);
 const rig=JSON.parse(fs.readFileSync(path.join(ROOT,'rig/jelly-tree.skeleton.json'),'utf8'));
 assert.equal(rig.bones.length,21);assert.ok(rig.animations.sway);
 const names=new Set();
 for(const bone of rig.bones){if(bone.parent)assert.ok(names.has(bone.parent));names.add(bone.name);}
});
test('art has explicit stage-specific species, magic glow, waterfalls and wildlife geometry',()=>{
 assert.match(painter,/crown-willow\.svg/);
 assert.match(painter,/crown-spiral\.svg/);
 assert.match(painter,/crown-lantern\.svg/);
 assert.match(painter,/islandWash\(/);
 assert.match(painter,/cascade\(/);
 assert.match(painter,/hangingRoots\(/);
 assert.match(painter,/twistedTrunk\(/);
 assert.match(painter,/lanternLight\(/);
 assert.match(painter,/bird\(/);
 assert.match(painter,/fish\(/);
 assert.match(painter,/firefly\(/);
 const {qa}=boot();
 assert.equal(qa.assetStatus().loaded.length,10);
 assert.equal(qa.state().silhouette,false);
});

test('V3 real hatchlings, collectible character details and palettes',()=>{
 const {qa}=boot(),seed=103;
 const island=qa.sceneModel('island',3,seed,'cosmos');
 const medusa=qa.sceneModel('jelly',3,seed,'cosmos');
 assert.equal(island.lifeStage,'seedling');
 assert.equal(island.silhouette.crownScale,0);
 assert.equal(medusa.lifeStage,'hatchling');
 assert.equal(medusa.silhouette.domeWidth,136);
 assert.equal(qa.sceneModel('jelly',8,seed).lifeStage,'juvenile');
 assert.equal(qa.sceneModel('jelly',16,seed).lifeStage,'mature');
 assert.match(v3,/function islandBud\(/);
 assert.match(v3,/function juvenileMedusa\(/);
 assert.match(v3,/function islandHollow\(/);
 assert.match(v3,/function fishResident\(/);
 assert.match(v3,/function topicAccessories\(/);
 const bubble=fs.readFileSync(path.join(ROOT,'assets/crown-spiral.svg'),'utf8');
 assert.doesNotMatch(bubble,/M93 213Q60.*opacity="\.46"/);
 for(const topic of ['cosmos','warmth','music','travel'])assert.match(v3,new RegExp(topic));
});

test('V4 staged composition, botanical spiral and exploratory travel art are active',()=>{
 const {qa}=boot();
 assert.equal(qa.previews(),3);
 assert.match(v4,/function islandSeedling\(/);
 assert.match(v4,/function jellyHatchling\(/);
 assert.match(v4,/function travelSky\(/);
 assert.match(v4,/function travelCliff\(/);
 assert.match(v4,/function refract\(/);
 assert.match(v4,/function fishHero\(/);
 assert.match(painter,/spiral-leaf-tiers\.svg/);
 assert.match(html,/futureHint/);
 assert.match(html,/剩下的世界|還有好多故事/);
 const leaf=fs.readFileSync(path.join(ROOT,'assets/spiral-leaf-tiers.svg'),'utf8');
 assert.ok((leaf.match(/<g transform=/g)||[]).length>=35,'layered leaves must be individually shaped');
 const m8=qa.sceneModel('island',8,103,'travel');
 assert.equal(m8.lifeStage,'sapling');
 assert.equal(m8.units.length,2);
 for(const scene of ['island','jelly'])for(const age of [3,8,16]){
  const a=qa.sceneModel(scene,age,103,'travel');
  assert.equal(JSON.stringify(a),JSON.stringify(qa.sceneModel(scene,age,103,'travel')));
 }
});

test('V5 morphs full-size leaf staircase instead of scribble-ring plates',()=>{
 assert.match(v5,/leaves=mature\?10:8/);
 assert.match(v5,/function spiralStair\(/);
 assert.match(v5,/function emergence\(/);
 assert.match(v5,/function jellyGrowth\(/);
 assert.match(v5,/function capOcclusion\(/);
 assert.match(painter,/CrewFantasyV5\.spiralStair/);
 assert.doesNotMatch(painter,/art\(c,'spiral-leaf-tiers\.svg'/);
 const {qa}=boot();assert.equal(qa.sceneModel('island',16,103).units[0].species,'spiral');
});
test('V5 has real transition frames and keyboard accessible hit reactions',()=>{
 assert.match(source,/function beginGrowth\(/);
 assert.match(source,/state\.turns/);
 assert.match(source,/addEventListener\('pointerdown'/);
 assert.match(source,/addEventListener\('keydown'/);
 assert.match(source,/window\.CrewFantasyV5\.capOcclusion/);
 const {qa}=boot();
 assert.equal(typeof qa.growthFrame,'function');
 assert.equal(typeof qa.touchFrame,'function');
 for(const scene of ['island','jelly']){
  for(const [from,to] of [[3,8],[8,16]]){
   const zero=qa.growthFrame(scene,from,to,0);
   const middle=qa.growthFrame(scene,from,to,.5);
   const full=qa.growthFrame(scene,from,to,1);
   assert.equal(zero.stage,to);
   assert.equal(middle.stage,to);
   assert.equal(full.stage,to);
  }
  const model=qa.touchFrame(scene,.4);
  assert.equal(model.stage,16);
 }
 assert.equal(qa.hitTest('island',16,397,450),true);
 assert.equal(qa.hitTest('jelly',16,400,294),true);
 assert.equal(qa.hitTest('island',16,50,50),false);
});
