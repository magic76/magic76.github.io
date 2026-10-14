const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
function read(file){return fs.readFileSync(path.join(root,file),"utf8")}
const nativeCatalogIds=["builtin_dino","builtin_moon","builtin_fox","builtin_robot","builtin_bear","builtin_redcap","builtin_frog","builtin_bremen","builtin_cinderella","builtin_hansel"];
test("Crew Story Web includes the ten native built-in stories",()=>{
 const catalog=read("web-spa/src/story/catalog.ts");
 for(const id of nativeCatalogIds)assert.ok(catalog.includes('"id": "'+id+'"'),id);
 assert.equal((catalog.match(/"sourceType": "built-in"/g)||[]).length,nativeCatalogIds.length);
 assert.ok(catalog.includes("spoilerBoundary"));
});
test("Guided creator and bedtime timer are wired",()=>{
 const creator=read("web-spa/src/story/CreatePage.tsx");
 const generator=read("features/story/create/generator.js");
 const player=read("web-spa/src/story/player/StoryPlayerView.tsx");
 assert.ok(creator.includes("ageGroup:age,estimatedMinutes:pages"));
 assert.ok(generator.includes("desiredPages"));
 assert.ok(generator.includes("pages 數量等於圖片數"));
 assert.ok(player.includes("sleepMinutes*60_000"));
 assert.ok(player.includes("activeLive.startOrResume()"));
});
