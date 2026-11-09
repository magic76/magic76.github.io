const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");

const source=fs.readFileSync(path.join(__dirname,"../web-spa/src/fortune/displayNumber.ts"),"utf8");
const code=stripTypeScriptTypes(source,{mode:"strip"}).replace(/^export /gm,"");
const formatFortuneProse=Function(code+"\nreturn formatFortuneProse;")();

test("existing AI explanations do not show binary float tails",()=>{
 const text="而，五行能量中火元素高達3.3999999999999995，而金元素僅為1.1。";
 assert.equal(formatFortuneProse(text),"而，五行能量中火元素高達3.4，而金元素僅為1.1。");
 assert.equal(formatFortuneProse("元素 0.30000000000000004"),"元素 0.3");
});
test("precision-bearing content is not indiscriminately rounded",()=>{
 assert.equal(formatFortuneProse("12.123456789123456"),"12.123456789123456");
 assert.equal(formatFortuneProse("2026-11-09 11:23"),"2026-11-09 11:23");
});
test("Card keeps descriptive panels but excludes private chart and overprecise values",()=>{
 const canvas=fs.readFileSync(path.join(__dirname,"../web-spa/src/fortune/fortuneCardCanvas.ts"),"utf8");
 assert.match(canvas,/model\.identity/);
 assert.match(canvas,/copy\.headings\[0\]/);
 assert.match(canvas,/copy\.headings\[1\]/);
 assert.match(canvas,/copy\.headings\[2\]/);
 assert.match(canvas,/3sssi\.com\/fortune|model\.cta/);
 assert.doesNotMatch(canvas,/weightedFiveElements|reading\.profile|birthDate|birthTime/);
});
