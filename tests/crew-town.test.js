const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const test=require("node:test");

const read=(file)=>readFileSync(path.join(__dirname,"..",file),"utf8");
const town=read("web-spa/src/town/TownPage.tsx");
const app=read("web-spa/src/App.tsx");
const explore=read("web-spa/src/pages/CrewSectionPage.tsx");
const nav=read("web-spa/src/pages/crewNavigation.ts");
const profiles=read("web-spa/src/friends/friendProfiles.ts");
const styles=read("web-spa/src/town/town.css");

test("town uses only real Crew Friends and distinct pins",()=>{
 const ids=[...town.matchAll(/\{id:"([a-z]+)",x:\d+,y:\d+,clothes:/g)].map(match=>match[1]);
 assert.deepEqual(ids,["zoe","yuna","theo","hugo","bella","noah"]);
 for(const id of ids)assert.match(profiles,new RegExp('"id":"'+id+'"'));
 assert.match(town,/CREW_FRIENDS/);
});
test("ambient conversations remain scripted, with no fake Gemini Live in town",()=>{
 assert.match(town,/const MOMENTS:/);
 assert.match(town,/scripted preview/);
 assert.match(town,/情境預覽/);
 assert.match(town,/\/friend\/live\?id=/);
 assert.doesNotMatch(town,/new WebSocket|startLiveSession|generateContent/);
});
test("town stays opt-in within Explore and supports reduced motion",()=>{
 assert.match(app,/<Route path="\/town"/);
 assert.match(explore,/to="\/town"/);
 assert.match(nav,/"town"/);
 assert.match(town,/prefers-reduced-motion: reduce/);
 assert.match(town,/aria-label/);
 assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/);
});
