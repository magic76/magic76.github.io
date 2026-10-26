import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {stripTypeScriptTypes} from "node:module";
function load(path,names,full){let code=stripTypeScriptTypes(readFileSync(path,"utf8"),{mode:"transform"}).replace(/^import .*;\s*$/gm,"").replace(/export /g,"");
 // Catalogue tests run against the full 16-entry list; the shipped rollout subset is checked separately below.
 if(full)code=code.replace(/MAGIC_REACTIONS_ENABLED\s*=\s*\[[^\]]*\]/,"MAGIC_REACTIONS_ENABLED=MAGIC_REACTIONS_ALL.map(r=>r.id)");return new Function("__enabled",(path.includes("magicCodexStore")?"const MAGIC_REACTIONS_ENABLED=__enabled;\n":"")+code+"\nreturn {"+names.join(",")+"}")(globalThis.__enabled??[])}
const base="web-spa/src/magic/";
const r=load(base+"magicReactions.ts",["MAGIC_REACTIONS","MAGIC_REACTIONS_ENABLED","magicCreationElements","magicFindReaction","magicFindSoloReaction","magicPickReaction"],true);
const shipped=load(base+"magicReactions.ts",["MAGIC_REACTIONS","MAGIC_REACTIONS_ALL","MAGIC_REACTIONS_ENABLED","magicFindReaction","magicFindSoloReaction"]);
const ids=r.MAGIC_REACTIONS.map(x=>x.id);
globalThis.__enabled=r.MAGIC_REACTIONS_ENABLED;
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

test("R5 signatures limit overdraw, point counts and visible glyph sizes",()=>{
 const source=readFileSync(base+"magicReactionRecipes.ts","utf8");
 const code=stripTypeScriptTypes(source,{mode:"transform"}).replace(/^import type .*\n/gm,"").replace(/export /g,"");
 const recipes=new Function(code+"\nreturn {makeReactionPool,renderMagicReaction,REACTION_VISUALS}")();
 const kinds=["sparkle","star","heart","bubble","flame","flower","leaf","snow","note","z","glow","drop","petal","crystal","streak","trail","burst","ember","spark"];
 const limits={heart_bouquet:["heart",7],petal_swirl:["petal",18],frost_carpet:["crystal",16],star_lake:["star",14],cat_fish_chase:["bubble",14],golden_pollen:["sparkle",30],ember_whirl:["ember",24],ripple_splash:["drop",14],music_dance:["note",12]};
 for(const id of ids){const pool=recipes.makeReactionPool(kinds);recipes.renderMagicReaction(id,2.4,0,0,0,pool,true,0);
  const count=Object.values(pool.counts).reduce((a,b)=>a+b,0);
  assert.ok(count<=55,id+" count "+count);assert.ok(count>0,id);
  if(limits[id]){const [kind,limit]=limits[id];assert.ok(pool.counts[kind]<=limit,id+" "+kind);}
  assert.ok(kinds.every(k=>pool.counts[k]<=64),id);
 }
 assert.doesNotMatch(source,/sparse outer signature/);
});
test("R5 mobile decals use distinct star lake, frost and triple ripple designs",()=>{
 const scene=readFileSync(base+"MagicReactions3D.tsx","utf8");
 assert.match(scene,/function drawDecal/);assert.match(scene,/id==="star_lake"/);
 assert.match(scene,/id==="frost_carpet"/);assert.match(scene,/id==="ripple_splash"/);
 assert.match(scene,/k<3/);
});

test("R6 rollout list controls paired and solo reactions and codex persistence",()=>{
 assert.deepEqual(r.MAGIC_REACTIONS.map(item=>item.id),ids);
 const original=r.MAGIC_REACTIONS_ENABLED;
 original.splice(0,1);
 assert.equal(r.magicFindReaction(["cat"],["fish"],{night:false,castleIce:false,distanceToCastle:20}),undefined);
 original.push("cat_fish_chase");
 // The full catalogue loader is test-only; disabling an entry must exclude solo matches.
 const index=original.indexOf("meteor_shower");original.splice(index,1);
 assert.equal(r.magicFindSoloReaction(["star"],{night:true,castleIce:false,distanceToCastle:20}),undefined);
 original.splice(index,0,"meteor_shower");
});

test("R6 camera-safe frost layout is finite and avoids deep castle penetration",()=>{
 const source=readFileSync(base+"magicReactionRecipes.ts","utf8");
 const code=stripTypeScriptTypes(source,{mode:"transform"}).replace(/^import type .*\n/gm,"").replace(/export /g,"");
 const recipes=new Function(code+"\nreturn {dragonFrostLayout}")();
 for(const [cx,cz] of [[15,20],[-20,10],[-15,-20]]){
  const pose=recipes.dragonFrostLayout(-6.2,-7.1,cx,cz);
  assert.ok(Number.isFinite(pose.heading)&&pose.length>=1.2&&pose.length<=3);
  assert.ok(pose.impact.every(Number.isFinite));
  const ux=Math.sin(pose.heading),uz=Math.cos(pose.heading);
  for(let i=0;i<25;i++){
   const t=(i+.5)/25,px=-6.2+ux*(.5+t*pose.length),pz=-7.1+uz*(.5+t*pose.length);
   assert.ok(Math.hypot(px,pz+.55)>=4.5,"must stay outside castle collision cylinder");
  }
 }
});

test("shipped rollout subset is a valid, non-empty part of the catalogue and disabled reactions stay silent",()=>{
 const all=shipped.MAGIC_REACTIONS_ALL.map(x=>x.id),on=[...shipped.MAGIC_REACTIONS_ENABLED];
 assert.ok(on.length>=1&&on.length<=all.length);for(const id of on)assert.ok(all.includes(id),id);
 assert.deepEqual(shipped.MAGIC_REACTIONS.map(x=>x.id),all.filter(id=>on.includes(id)));
 const env={night:false,castleIce:false,distanceToCastle:30};
 const pairs={cat_fish_chase:[["cat"],["fish"]],steam_rainbow:[["fire"],["ice"]],flower_ring:[["flower"],["water"]],star_lake:[["star"],["water"]],frost_carpet:[["ice"],["water"]],music_dance:[["music"],["cat"]],ember_whirl:[["fire"],["wind"]]};
 for(const [id,[a,b]] of Object.entries(pairs))assert.equal(shipped.magicFindReaction(a,b,env),on.includes(id)?id:undefined,id);
 assert.equal(shipped.magicFindSoloReaction(["star"],{...env,night:true}),on.includes("meteor_shower")?"meteor_shower":undefined);
 assert.equal(shipped.magicFindSoloReaction(["dragon"],{...env,castleIce:true,distanceToCastle:5}),on.includes("dragon_frost")?"dragon_frost":undefined);
});

// R8 verification deliberately loads the complete recipe catalogue. The shipping
// gate remains the unmodified three-reaction subset tested above.
const recipeSource=readFileSync(base+"magicReactionRecipes.ts","utf8");
const recipeCode=stripTypeScriptTypes(recipeSource,{mode:"transform"}).replace(/^import type .*\n/gm,"").replace(/export /g,"");
const recipe=new Function(recipeCode+"\nreturn {makeReactionPool,renderMagicReaction,dragonFrostLayout,REACTION_VISUALS}")();
const particleSource=readFileSync(base+"MagicParticleLayers3D.tsx","utf8");
const R8_KINDS=["sparkle","star","heart","bubble","flame","flower","leaf","snow","note","z","glow","drop","petal","crystal","streak","trail","burst","ember","spark"];
function render(id,t=2.4,{x=0,z=0,ground=0,aim=0,camX=12.5,camZ=18.7,animated=true}={}){
 const pool=recipe.makeReactionPool(R8_KINDS);
 recipe.renderMagicReaction(id,t,x,z,ground,pool,animated,aim,camX,camZ);
 return Object.fromEntries(R8_KINDS.map(k=>[k,pool.points[k].slice(0,pool.counts[k])]));
}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const cdist=(p,x,z)=>Math.hypot(p.x-x,p.z-z);
const notWhite=p=>!([(p.color>>16)&255,(p.color>>8)&255,p.color&255].every(c=>c>=0xf0));

test("R8 ember_whirl: normal ember shape, three tiers and no white particles",()=>{
 assert.equal(recipe.REACTION_VISUALS.ember_whirl.kind,"ember");
 assert.match(particleSource,/kind==="ember"/);assert.match(particleSource,/strokeStyle="#8a2a00"/);
 assert.match(particleSource,/\["sparkle","star","flame"\]\.includes\(kind\)\?AdditiveBlending:NormalBlending/);
 for(const p of render("ember_whirl").ember){assert.ok(notWhite(p));assert.ok(p.minPx>=12)}
 assert.deepEqual(new Set(render("ember_whirl").ember.map(p=>p.color)),new Set([0xff5a1f,0xff8c1a,0xffc21a]));
});
test("R8 golden_pollen: excluded creature body at t=1.6,2.4,3.2",()=>{
 for(const t of [1.6,2.4,3.2]){
  const points=render("golden_pollen",t);
  for(const p of Object.values(points).flat())assert.ok(cdist(p,0,0)>=1||p.y<0||p.y>2.2,`${t} ${JSON.stringify(p)}`);
 }
});
test("R8 cat_fish_chase: pale bubbles, directional 8-dot wakes, no ground dashes",()=>{
 const p=render("cat_fish_chase");assert.equal(p.bubble.length,14);assert.equal(p.trail.length,16);
 assert.ok(p.bubble.every(e=>e.color===0xa8e9ff));assert.ok(p.trail.every(e=>e.color===0x3aa0ff));
 assert.ok(p.sparkle.length===0);for(const side of [0,1]){
  const wake=p.trail.slice(side*8,side*8+8);assert.ok(wake[0].minPx>=10);assert.ok(wake[7].minPx<=5.01);
  assert.ok(wake.every(e=>e.y>1));
 }
});
test("R8 snow_fairy: white core and mobile-visible blue trailing dots",()=>{
 const p=render("snow_fairy");assert.equal(p.snow.length,2);assert.equal(p.trail.length,20);
 assert.ok(p.snow.every(e=>e.color===0xffffff));assert.equal(p.glow.length,2);
 for(let i=0;i<2;i++){const tail=p.trail.slice(i*10,(i+1)*10);
  assert.equal(tail[0].color,0x9fd8ff);assert.ok(tail[0].minPx>=12&&tail[9].minPx<=5.01);
  assert.ok(tail[0].alpha>tail[9].alpha&&tail[9].alpha>=.34*.9);
 }
});
test("R8 music_dance: at least 3 large notes on each side",()=>{
 const notes=render("music_dance").note;
 assert.ok(notes.filter(p=>p.x<0).length>=3);assert.ok(notes.filter(p=>p.x>0).length>=3);
 assert.ok(notes.every(p=>p.minPx>=22));
});
test("R8 heart_bouquet: seven separated fan heads with >=0.45 spacing",()=>{
 const hearts=render("heart_bouquet").heart;assert.equal(hearts.length,7);
 for(let i=0;i<hearts.length;i++)for(let j=i+1;j<hearts.length;j++)assert.ok(dist(hearts[i],hearts[j])>=.45,`hearts ${i},${j}`);
 assert.ok(hearts[0].x<hearts[3].x&&hearts[3].x<hearts[6].x);
});
test("R8 frost_carpet: six bifurcated radial frost-flower lines in ground decal",()=>{
 const src=readFileSync(base+"MagicReactions3D.tsx","utf8");
 const draw=src.slice(src.indexOf('if(id==="frost_carpet")'),src.indexOf('if(id==="ripple_splash")'));
 assert.match(draw,/k<6/);assert.match(draw,/j<2/);assert.match(draw,/sign of \[-1,1\]/);
 assert.match(draw,/Math\.PI\/4/);assert.equal(render("frost_carpet").crystal.length,12);
});
test("R8 dragon_fireworks: 3 disjoint normal bursts, 14 per color, no white",()=>{
 const b=render("dragon_fireworks").burst;assert.equal(b.length,42);
 for(const col of [0xff6b6b,0xffd23f,0x7b61ff]){
  const shot=b.filter(p=>p.color===col);assert.equal(shot.length,14);assert.ok(shot.every(p=>p.y>=2.73));
  assert.ok(shot.every(notWhite));
 }
 assert.match(particleSource,/kind==="burst"/);
 assert.ok(render("dragon_fireworks").trail.length>0);
});
test("R8 petal_swirl: 14 elevated inner petals and three green dotted wind lines",()=>{
 for(const t of [1.6,2.4,3.2]){
  const p=render("petal_swirl",t);assert.equal(p.petal.length,14);assert.equal(p.trail.length,18);
  const inner=p.petal.filter(e=>cdist(e,0,0)<1.2);assert.ok(inner.length>0);
  assert.ok(inner.every(e=>e.y>=2.4));assert.ok(p.trail.every(e=>e.color===0x4fbf6a&&e.minPx>=10));
 }
});
test("R8 ripple_splash: central vertical jet before the falling droplets, no enclosing ring",()=>{
 const p=render("ripple_splash",2.4).drop;assert.equal(p.length,10);
 assert.ok(p.every(e=>cdist(e,0,0)<.5));
 assert.ok(Math.max(...p.map(e=>e.y))-Math.min(...p.map(e=>e.y))>.45);
 const decal=readFileSync(base+"MagicReactions3D.tsx","utf8");assert.match(decal,/id==="ripple_splash"/);
});
test("R8 forge_sparks: 0.5s strikes, 10 distinct azimuths >=20 degrees, normal diamonds",()=>{
 assert.match(particleSource,/kind==="spark"/);assert.match(particleSource,/strokeStyle="#8a3b00"/);
 for(const t of [1.6,2.4,3.2]){
  const p=render("forge_sparks",t);assert.equal(p.spark.length,10);assert.equal(p.trail.length,30);
  const angles=p.spark.map(e=>Math.atan2(e.z-.7,e.x)).sort((a,b)=>a-b);
  for(let i=0;i<angles.length;i++){
   const next=i===angles.length-1?angles[0]+2*Math.PI:angles[i+1];
   assert.ok((next-angles[i])*180/Math.PI>=20,`t=${t}, gap=${next-angles[i]}`);
  }
  assert.ok(p.spark.every(e=>e.color===0xffb000));assert.equal(p.glow.length,1);
 }
});
test("R8 meteor_shower: large colored heads, eight fading round trails, camera-side landing",()=>{
 const p=render("meteor_shower",2.4,{camX:12.5,camZ:18.7});
 assert.ok(p.burst.length>=2);assert.ok(p.burst.every(e=>e.minPx>=26&&e.color===0xffe48a));
 assert.equal(p.streak.length,0);assert.ok(p.trail.length>=p.burst.length*8);
 assert.ok(p.burst.every(e=>e.x*12.5+e.z*18.7>0));
 assert.ok(p.trail.some(e=>e.color===0xff9f1a));
 assert.match(recipeSource,/angle\(j,8\).*\.8/);
});
// The camera is above and outside the occluder. A crystal is obscured if the
// ray from the camera crosses the finite castle cylinder before the crystal.
function rayBlocked(cam,p){
 const radius=4.5,baseZ=-.55,height=7.5;
 const dx=p.x-cam[0],dy=p.y-cam[1],dz=p.z-cam[2];
 for(let i=1;i<200;i++){
  const u=i/200,x=cam[0]+dx*u,y=cam[1]+dy*u,z=cam[2]+dz*u;
  if(x*x+(z-baseZ)**2<radius*radius&&y>=0&&y<=height)return true;
 }
 return false;
}
test("R8 dragon_frost: real-world behind/side dragon poses >=70% camera-visible blue crystals",()=>{
 const camera=[12.5*Math.sqrt(10)*.82,11.4*Math.sqrt(10)*.82,18.7*Math.sqrt(10)*.82];
 assert.match(readFileSync(base+"MagicReactions3D.tsx","utf8"),/MAGIC_OVERVIEW_POSITION/);
 // The reported world dragon (-.299,-.535), mapped to island world units,
 // plus camera-side, left-side and right-side castle approaches.
 const dragonPos=[[-.299*18,-.535*14],[5.5,4.8],[-6.0,-.5],[6.2,-.5]];
 for(const [x,z] of dragonPos)for(const t of [1.6,2.4,3.2]){
  const aim=recipe.dragonFrostLayout(x,z,camera[0],camera[2]);
  const p=render("dragon_frost",t,{x,z,aim,camX:camera[0],camZ:camera[2]});
  const crystals=p.crystal;assert.equal(crystals.length,40);
  const visible=crystals.filter(e=>!rayBlocked(camera,e)).length/crystals.length;
  assert.ok(visible>=.70,`dragon=(${x},${z}), t=${t}, visible=${visible}`);
  assert.ok(crystals.every(e=>cdist(e,0,-.55)>=4.5&&e.color===0x2f8fff&&e.minPx>=16));
 }
});
test("R8 rollout/performance contract: four new normal kinds, unchanged shipped gate/blending",()=>{
 const kinds=["trail","burst","ember","spark"];
 for(const kind of kinds)assert.match(particleSource,new RegExp('kind==="'+kind+'"'));
 assert.equal(R8_KINDS.length,19);
 for(const id of ["steam_rainbow","flower_ring","star_lake"])assert.ok(shipped.MAGIC_REACTIONS_ENABLED.includes(id),id);
 assert.match(particleSource,/\["sparkle","star","flame"\]\.includes\(kind\)\?AdditiveBlending:NormalBlending/);
 for(const id of ids){const p=render(id);assert.ok(Object.values(p).reduce((total,pts)=>total+pts.length,0)<=55,id)}
});
