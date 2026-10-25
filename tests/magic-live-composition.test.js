const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/liveTools.ts"),"utf8");

test("Lumi is explicitly instructed to compose bounded safe world primitives",()=>{
 assert.match(source,/LEGO-like world primitives/);
 assert.match(source,/compose 2-4 different primitives/);
 assert.match(source,/at most four world-mutating tool calls/);
 assert.match(source,/only from composing the allowlisted primitives/);
});

test("composable guidance preserves the executable-content safety boundary",()=>{
 assert.match(source,/Never invent a tool, parameter, HTML, JavaScript, CSS, shader, URL or executable payload/);
 assert.doesNotMatch(source,/eval\s*\(/);
 assert.doesNotMatch(source,/new Function\s*\(/);
});
