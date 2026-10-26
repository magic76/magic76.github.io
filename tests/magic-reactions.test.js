import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {stripTypeScriptTypes} from "node:module";
function load(path,names){let code=stripTypeScriptTypes(readFileSync(path,"utf8"),{mode:"transform"}).replace(/export /g,"");return new Function(code+"\nreturn {"+names.join(",")+"}")()}
const base="web-spa/src/magic/";
const r=load(base+"magicReactions.ts",["MAGIC_REACTIONS","magicCreationElements","magicFindReaction","magicPickReaction"]);
test("16 unique reactions",()=>{assert.equal(r.MAGIC_REACTIONS.length,16);assert.equal(new Set(r.MAGIC_REACTIONS.map(x=>x.id)).size,16)});
test("tags and symmetric recipes",()=>{
 const a=r.magicCreationElements({label:"火焰飛龍",idea:"",parts:[]},{kind:"dragon"});
 assert.deepEqual(a,["dragon","fire"]);
 assert.equal(r.magicFindReaction(["ice"],["fire"],{night:false,castleIce:false,distanceToCastle:10}),"steam_rainbow");
 assert.equal(r.magicFindReaction(["fire"],["ice"],{night:false,castleIce:false,distanceToCastle:10}),"steam_rainbow");
});
test("cooldown and asleep",()=>{const c=[{id:"steam_rainbow",key:"1:2",distance:4}];const s={pairs:{"1:2":95},lastStart:80,active:0,limit:1};assert.equal(r.magicPickReaction(c,s,100),undefined);assert.ok(r.magicPickReaction(c,{...s,pairs:{}},100));assert.equal(r.magicPickReaction([{...c[0],asleep:true}],{...s,pairs:{}},100),undefined)});
test("code structure",()=>{const t=readFileSync(base+"MagicReactions3D.tsx","utf8");assert.match(t,/setInterval\(tick,250\)/);assert.match(t,/polygonOffset/);assert.doesNotMatch(t,/EffectComposer|castShadow/);const p=readFileSync(base+"MagicParticleLayers3D.tsx","utf8");assert.match(p,/onBeforeCompile/);assert.match(p,/aAlpha/);assert.match(p,/setDrawRange/);});
