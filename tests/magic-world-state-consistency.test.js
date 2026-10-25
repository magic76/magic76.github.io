const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");

// world.ts is runtime-erasable TypeScript with no imports. Node's eraser
// keeps this behavior test independent of TypeScript compiler API versions.
const source=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/world.ts"),"utf8");
const compiled=stripTypeScriptTypes(source,{mode:"strip"}).replace(/^export /gm,"");
const {demoMagicCommand,MAGIC_INITIAL_WORLD}=new Function(compiled+"\nreturn {demoMagicCommand,MAGIC_INITIAL_WORLD};")();

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
