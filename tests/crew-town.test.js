const assert=require("node:assert/strict");
const {readFileSync,existsSync}=require("node:fs");
const path=require("node:path");
const test=require("node:test");
const root=path.join(__dirname,"..");
const read=file=>readFileSync(path.join(root,file),"utf8");
const town=read("web-spa/src/town/Town3DPage.tsx");
const app=read("web-spa/src/App.tsx");
const explore=read("web-spa/src/pages/CrewSectionPage.tsx");
const nav=read("web-spa/src/pages/crewNavigation.ts");
const world=read("web-spa/src/town/three/world.ts");
const overlay=read("web-spa/src/town/three/TownOverlay.tsx");
test("Crew Town only mounts 3D while all 16 friends remain canonical",()=>{
 assert.match(app,/import\("\.\/town\/Town3DPage"\)/);
 assert.match(world,/\bPEOPLE\b/);
 assert.match(overlay,/CREW_FRIENDS/);
 assert.match(overlay,/\/friend\/live\?id=/);
 assert.doesNotMatch(town,/TownPage|2\.5D/);
 assert.doesNotMatch(overlay,/new WebSocket|startLiveSession|generateContent/);
});
test("town stays available by direct route, hidden in Explore, and supports reduced motion",()=>{
 assert.match(app,/<Route path="\/town"/);
 assert.doesNotMatch(explore,/to="\/town"/);
 assert.match(nav,/"town"/);
 assert.match(town,/prefers-reduced-motion: reduce/);
 assert.match(town,/aria-label/);
 assert.match(read("web-spa/src/town/three/town3d.css"),/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(explore,/TownIllustration/);
 for(const file of ["TownPage.tsx","TownIllustration.tsx","TownCharacter.tsx","town.css"])
  assert.equal(existsSync(path.join(root,"web-spa/src/town",file)),false);
});
