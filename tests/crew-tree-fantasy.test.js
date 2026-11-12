'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.join(__dirname,'../web-spa/public/crew-tree-lab/art-studies');
const source=fs.readFileSync(path.join(ROOT,'study.js'),'utf8');
const painter=fs.readFileSync(path.join(ROOT,'character-paint.js'),'utf8');
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
 vm.createContext(scope);vm.runInContext(painter,scope,{timeout:10000});vm.runInContext(source,scope,{timeout:10000});
 return {qa:win.__CREW_STUDIES_QA__,draw};
}
test('isolated art studies never touch current V5 storage or chat',()=>{
 assert.match(html,/data-scene="island"/);assert.match(html,/data-scene="jelly"/);
 assert.match(html,/data-stage="16"/);assert.match(html,/V5 收藏/);
 assert.match(html,/character-paint\.js\?v=2-20261113/);
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
 assert.deepEqual([qa.sceneModel('island',3,103).silhouette.mainIslandScale,qa.sceneModel('island',8,103).silhouette.mainIslandScale,qa.sceneModel('island',16,103).silhouette.mainIslandScale],[.70,.87,1]);
 assert.deepEqual(qa.sceneModel('island',16,103).units.map(x=>x.species),['spiral','weeping','lantern-fruit','crescent']);
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
  assert.deepEqual([a.silhouette.domeWidth,b.silhouette.domeWidth,c.silhouette.domeWidth],[367,465,555]);
  assert.deepEqual([a.silhouette.twistStrands,b.silhouette.twistStrands,c.silhouette.twistStrands],[3,4,6]);
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
 'crown-spiral.svg','crown-willow.svg','crown-lantern.svg','crown-moon.svg','jelly-inner-membrane.svg']){
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
 assert.equal(qa.assetStatus().loaded.length,9);
 assert.equal(qa.state().silhouette,false);
});
