"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");

const src=fs.readFileSync("web-spa/src/live/turnTiming.ts","utf8");
const compiled=stripTypeScriptTypes(src,{mode:"strip"}).replace(/\bexport\s+(?=function)/g,"");
const exports={};
vm.runInNewContext(compiled+"\nexports.turnTimingForLevel=turnTimingForLevel;",{exports});
test("more speaking time for A1 and A2; same values as Android policy",()=>{
 for(const [level,ms,sensitivity] of [
  ["A1",2000,"END_SENSITIVITY_LOW"],
  ["A2",1400,"END_SENSITIVITY_LOW"],
  ["B1",1000,"END_SENSITIVITY_HIGH"],
  ["B2",800,"END_SENSITIVITY_HIGH"],
  ["auto",1200,"END_SENSITIVITY_HIGH"]]){
  const result=exports.turnTimingForLevel(level);
  assert.equal(result.silenceDurationMs,ms);
  assert.equal(result.endOfSpeechSensitivity,sensitivity);
 }
});
