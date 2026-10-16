import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {stripTypeScriptTypes} from "node:module";

const src=fs.readFileSync("web-spa/src/live/turnTiming.ts","utf8");
const compiled=stripTypeScriptTypes(src,{mode:"strip"}).replace(/\\bexport\\s+(?=function)/g,"");
const subject={};
vm.runInNewContext(compiled+"\nresult.turnTimingForLevel=turnTimingForLevel;",{result:subject});
test("more speaking time for A1 and A2; same values as Android policy",()=>{
 for(const [level,ms,sensitivity] of [
  ["A1",2000,"END_SENSITIVITY_LOW"],
  ["A2",1400,"END_SENSITIVITY_LOW"],
  ["B1",1000,"END_SENSITIVITY_HIGH"],
  ["B2",800,"END_SENSITIVITY_HIGH"],
  ["auto",1200,"END_SENSITIVITY_HIGH"]]){
  const value=subject.turnTimingForLevel(level);
  assert.equal(value.silenceDurationMs,ms);
  assert.equal(value.endOfSpeechSensitivity,sensitivity);
 }
});
