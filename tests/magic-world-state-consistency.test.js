const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ts=require("typescript");

const source=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/world.ts"),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const worldModule={exports:{}};
new Function("module","exports",compiled)(worldModule,worldModule.exports);
const {demoMagicCommand,MAGIC_INITIAL_WORLD}=worldModule.exports;

test("starry-night quick spell is idempotent and never produces daylight stars",()=>{
 const first=demoMagicCommand("night",MAGIC_INITIAL_WORLD,"en");
 assert.equal(first.ok,true);
 assert.equal(first.world.time,"night");
 assert.equal(first.world.weather,"stars");

 const second=demoMagicCommand("night",first.world,"en");
 // Repeating an already-applied preset is intentionally a no-op rather than
 // flipping time while keeping the stars, which was the production QA failure.
 assert.equal(second.ok,false);
 assert.equal(second.event,"no-valid-world-change");
 assert.equal(second.world.time,"night");
 assert.equal(second.world.weather,"stars");
});

test("snow, forest and sunny presets keep their visible state tuples deterministic",()=>{
 const snow=demoMagicCommand("snow",MAGIC_INITIAL_WORLD,"en");
 assert.deepEqual([snow.world.theme,snow.world.time,snow.world.weather],["sky","night","snow"]);
 const forest=demoMagicCommand("forest",snow.world,"en");
 assert.deepEqual([forest.world.theme,forest.world.time,forest.world.weather],["forest","day","clear"]);
 const sunny=demoMagicCommand("sunny",forest.world,"en");
 assert.deepEqual([sunny.world.theme,sunny.world.time,sunny.world.weather],["sky","day","clear"]);
});
