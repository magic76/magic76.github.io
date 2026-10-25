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

test("live group movement is declared, bounded and connected to active voice session",()=>{
 const {stripTypeScriptTypes}=require("node:module");
 const module={exports:{}};
 const compiled=stripTypeScriptTypes(source,{mode:"strip"})
  .replace(/\bexport\s+(?=(?:function|const|class)\b)/g,"");
 new Function("module","exports",compiled+"\nmodule.exports={MAGIC_TOOLS,magicSystemPrompt};")(module,module.exports);
 const {MAGIC_TOOLS,magicSystemPrompt}=module.exports;
 const functions=MAGIC_TOOLS.flatMap(group=>group.functionDeclarations);
 assert.equal(functions.filter(tool=>tool.name==="move_creatures").length,1);
 const move=functions.find(tool=>tool.name==="move_creatures");
 assert.deepEqual(move.parameters.required,["x","z"]);
 assert.deepEqual(move.parameters.properties.kinds.items.enum,["dragon","owl","fox"]);
 for(const axis of ["x","z"])assert.equal(move.parameters.properties[axis].type,"NUMBER");
 const prompt=magicSystemPrompt(false);
 assert.match(prompt,/call move_creatures once/);
 assert.match(prompt,/need to be summoned first/);
 const page=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/MagicPage.tsx"),"utf8");
 assert.match(page,/tools:MAGIC_TOOLS/);
 assert.match(page,/applyMagicLiveCall\(worldRef\.current,call/);
});
