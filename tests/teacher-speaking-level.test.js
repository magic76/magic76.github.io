"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
function subject(){
 const src=fs.readFileSync("web-spa/src/teacher/speakingLevelMemory.ts","utf8");
 const compiled=stripTypeScriptTypes(src,{mode:"strip"}).replace(/\\bexport\\s+(?=(?:function|const))/g,"");
 const data=new Map();
 const storage={getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),
  removeItem:k=>data.delete(k),key:i=>[...data.keys()][i]??null,get length(){return data.size}};
 const module={exports:{}};
 vm.runInNewContext(compiled+"\\nObject.assign(exports,{verifiedSpeakingQuote,nextStableSpeakingLevel,recordSpeakingLevel,storedSpeakingLevel,effectiveSpeakingLevel,clearSpeakingLevel});",{module,exports:module.exports,localStorage:storage});
 return module.exports;
}
test("evidence from one student turn, not tutor or split turns",()=>{
 const p=subject();
 assert.equal(p.verifiedSpeakingQuote("I visited the museum yesterday",["I visited the museum yesterday"]),true);
 assert.equal(p.verifiedSpeakingQuote("I visited the museum yesterday",["I visited","the museum yesterday"]),false);
 assert.equal(p.verifiedSpeakingQuote("Yes",["Yes"]),false);
});
test("three sessions required and changes cannot leap multiple levels",()=>{
 const p=subject();
 assert.equal(p.nextStableSpeakingLevel(null,["B2","B2"]),null);
 assert.equal(p.nextStableSpeakingLevel("A1",["B2","B2","B2"]),"A2");
 assert.equal(p.nextStableSpeakingLevel("A2",["B2","B2","B2"]),"B1");
});
test("scoped, deduplicated and erasable with opt-out",()=>{
 const p=subject(),quote="I visited the museum yesterday";
 assert.equal(p.recordSpeakingLevel("英文","1",{level:"B1",quote},[quote],true),true);
 assert.equal(p.recordSpeakingLevel("英文","1",{level:"B1",quote},[quote],true),false);
 assert.equal(p.recordSpeakingLevel("英文","2",{level:"B1",quote},[quote],true),true);
 assert.equal(p.storedSpeakingLevel("英文"),null);
 assert.equal(p.recordSpeakingLevel("英文","3",{level:"B1",quote},[quote],true),true);
 assert.equal(p.storedSpeakingLevel("英文"),"B1");
 assert.equal(p.storedSpeakingLevel("日文"),null);
 assert.equal(p.effectiveSpeakingLevel("英文","A1"),"A1");
 assert.equal(p.recordSpeakingLevel("英文","4",{level:"A1",quote},[quote],false),false);
 assert.equal(p.storedSpeakingLevel("英文",false),null);
 p.clearSpeakingLevel("英文");
 assert.equal(p.storedSpeakingLevel("英文"),null);
});
