import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {stripTypeScriptTypes} from "node:module";
function load(path,names){const code=stripTypeScriptTypes(readFileSync(path,"utf8"),{mode:"transform"}).replace(/export /g,"");return new Function(code+"\nreturn {"+names.join(",")+"}")()}
const base="web-spa/src/magic/";
const r=load(base+"magicReactions.ts",["MAGIC_REACTIONS","magicCreationElements","magicFindReaction","magicFindSoloReaction","magicPickReaction"]);
const ids=r.MAGIC_REACTIONS.map(x=>x.id);
test("16 distinct reactions",()=>{assert.equal(ids.length,16);assert.equal(new Set(ids).size,16)});
test("fire, ice, and new elemental keywords",()=>{
 const tags=s=>r.magicCreationElements({label:s,idea:"",parts:[]},{kind:s.includes("dragon")?"dragon":undefined});
 assert.deepEqual(tags("火焰飛龍"),["fire","dragon"]);
 assert.deepEqual(r.magicCreationElements({label:"冰晶花園守護者",idea:"",parts:[]},{aura:"ice"}),["ice","flower"]);
 assert.deepEqual(r.magicCreationElements({label:"會噴泡泡的雲朵貓",idea:"",parts:[]},{kind:"cat",aura:"bubbles"}),["water","cat","wind","cloud"]);
 assert.deepEqual(r.magicCreationElements({label:"a musical star robot",idea:"",parts:[]},{kind:"robot",aura:"music"}),["music","robot","star"]);
});
test("symmetry, music paired with any tagged neighbor and environmental solo",()=>{
 const env={night:false,castleIce:false,distanceToCastle:30};
 assert.equal(r.magicFindReaction(["fire"],["ice"],env),"steam_rainbow");
 assert.equal(r.magicFindReaction(["ice"],["fire"],env),"steam_rainbow");
 assert.equal(r.magicFindReaction(["music"],["cat"],env),"music_dance");
 assert.equal(r.magicFindSoloReaction(["star"],{...env,night:true}),"meteor_shower");
 assert.equal(r.magicFindSoloReaction(["dragon"],{...env,castleIce:true,distanceToCastle:7.9}),"dragon_frost");
 assert.equal(r.magicFindSoloReaction(["dragon"],{...env,castleIce:true,distanceToCastle:8.1}),undefined);
});
test("picker handles 40s pair cooldown, 8s global cooldown and sleep",()=>{
 const c={id:"steam_rainbow",key:"1:2",distance:4};const s={pairs:{"1:2":95},lastStart:80,active:0,limit:1};
 assert.equal(r.magicPickReaction([c],s,100),undefined);
 assert.ok(r.magicPickReaction([c],{...s,pairs:{}},100));
 assert.equal(r.magicPickReaction([{...c,asleep:true}],{...s,pairs:{}},100),undefined);
 assert.equal(r.magicPickReaction([c],{...s,pairs:{},lastStart:96},100),undefined);
 assert.equal(r.magicPickReaction([c],{...s,pairs:{},active:1},100),undefined);
 assert.equal(r.magicPickReaction([{...c,distance:7.21}],{...s,pairs:{}},100),undefined);
});
test("codex invalid input and persistence pure parser",()=>{
 const c=load(base+"magicCodexStore.ts",["parseMagicCodex","MAGIC_CODEX_KEY"]);
 assert.deepEqual(c.parseMagicCodex("invalid"),{v:1,found:[]});
 assert.deepEqual(c.parseMagicCodex(JSON.stringify({v:1,found:[{id:"cat_fish_chase",at:12},{id:"cat_fish_chase",at:13},{id:"bad",at:14}]})).found,[{id:"cat_fish_chase",at:12}]);
 assert.equal(c.MAGIC_CODEX_KEY,"crew.magic.codex");
});
test("rendering includes shared particle caps and correct shader anchor",()=>{
 const p=readFileSync(base+"MagicParticleLayers3D.tsx","utf8");
 assert.match(p,/logdepthbuf_vertex/);assert.doesNotMatch(p,/points_vertex/);
 assert.match(p,/onBeforeCompile/);assert.match(p,/setDrawRange\(0,count\)/);
 assert.match(p,/Float32Array\(256\*3\)/);assert.match(p,/diffuseColor\.a \*= vAlpha/);
 for(const key of ['"glow"','"drop"','"petal"','"crystal"'])assert.ok(p.includes(key));
 const code=readFileSync(base+"MagicReactions3D.tsx","utf8");
 assert.match(code,/setInterval\(tick,250\)/);assert.match(code,/polygonOffset/);
 assert.match(code,/depthWrite=\{false\}/);assert.match(code,/invalidate\(\)/);
 assert.match(code,/magicFindSoloReaction/);assert.match(code,/performance\.now\(\)/);
 assert.doesNotMatch(code,/<points|EffectComposer|castShadow/);
});
test("16 recipes have dedicated visual cases, at most 2 fixed slots",()=>{
 const s=readFileSync(base+"magicReactionRecipes.ts","utf8");for(const id of ids)assert.ok(s.includes('case "'+id+'"'),id);
 const a=readFileSync(base+"MagicReactions3D.tsx","utf8");assert.match(a,/length:2/);assert.match(a,/rainbowGeometry/);
});
test("11 locale entries are translated and no old stubs survive",()=>{
 const langs=["en","zh-TW","ja","es","pt-BR","id","fr","de","ko","vi","th"];
 const en=JSON.parse(readFileSync("web-spa/src/i18n/locales/en/magic.json","utf8"));
 for(const lang of langs){const data=JSON.parse(readFileSync(`web-spa/src/i18n/locales/${lang}/magic.json`,"utf8"));
  assert.deepEqual(Object.keys(data).sort(),Object.keys(en).sort(),lang);
  for(const id of ids)for(const suffix of [""," description"," hint"]){const val=data[id+suffix];assert.ok(val&&typeof val==="string",lang+id+suffix);
   assert.doesNotMatch(val,/Find the magic|魔法図鑑 \d+|Zauberbuch \d+|✨$/);if(lang!=="en")assert.notEqual(val,en[id+suffix],lang+id+suffix);
  }
 }
});

test("R3 visual fixes keep pool bounded and reaction-specific colors",()=>{
 const recipes=readFileSync(base+"magicReactionRecipes.ts","utf8");
 const scene=readFileSync(base+"MagicReactions3D.tsx","utf8");
 const creations=readFileSync(base+"MagicCreations3D.tsx","utf8");
 assert.match(recipes,/makeReactionPool/);assert.match(recipes,/length:64/);
 assert.match(recipes,/REACTION_VISUALS/);
 for(const id of ids)assert.match(recipes,new RegExp(id+':\\{kind'));
 assert.doesNotMatch(scene,/a\.motion===\"still\"&&night/);
 assert.match(scene,/Math\.atan2\(-r\.ax,-\.55-r\.az\)/);
 assert.match(scene,/r\.distance\/2\+\.6/);
 assert.match(creations,/react\?\.dance&&animated.*react\.w/);
});

test("R4 every recipe has enough readable principal points and footprint at sample frames",()=>{
 const source=readFileSync(base+"magicReactionRecipes.ts","utf8");
 const code=stripTypeScriptTypes(source,{mode:"transform"}).replace(/^import type .*\n/gm,"").replace(/export /g,"");
 const recipes=new Function(code+"\nreturn {makeReactionPool,renderMagicReaction,REACTION_VISUALS}")();
 const kinds=["sparkle","star","heart","bubble","flame","flower","leaf","snow","note","z","glow","drop","petal","crystal"];
 for(const id of ids)for(const t of [1.6,2.4,3.2]){
  const pool=recipes.makeReactionPool(kinds);
  recipes.renderMagicReaction(id,t,0,0,0,pool,true,0);
  const kind=recipes.REACTION_VISUALS[id].kind;
  const main=pool.points[kind].slice(0,pool.counts[kind]);
  assert.ok(main.length>=10,id+" @"+t+" principal count="+main.length);
  assert.ok(Math.max(...main.map(p=>p.minPx??0))>=22,id+" @"+t+" too small");
  assert.ok(Math.max(...main.map(p=>p.x))-Math.min(...main.map(p=>p.x))>=5,id+" @"+t+" narrow");
  assert.ok(main.some(p=>p.alpha>0),id+" @"+t+" invisible");
  assert.ok(main.some(p=>{const hex=p.color??0;return ((hex>>16)&255)<218||((hex>>8)&255)<218||(hex&255)<218}),id+" entirely pale");
  assert.ok(kinds.every(k=>pool.counts[k]<=64),id+" pool overflow");
 }
});
test("R4 reduced motion uses recipe signature rather than a common eight-point ring",()=>{
 const source=readFileSync(base+"magicReactionRecipes.ts","utf8");
 const code=stripTypeScriptTypes(source,{mode:"transform"}).replace(/^import type .*\n/gm,"").replace(/export /g,"");
 const recipes=new Function(code+"\nreturn {makeReactionPool,renderMagicReaction,REACTION_VISUALS}")();
 const kinds=["sparkle","star","heart","bubble","flame","flower","leaf","snow","note","z","glow","drop","petal","crystal"];
 for(const id of ids){const pool=recipes.makeReactionPool(kinds);recipes.renderMagicReaction(id,0.5,0,0,0,pool,false);
  assert.ok(pool.counts[recipes.REACTION_VISUALS[id].kind]>=10,id);
 }
});
