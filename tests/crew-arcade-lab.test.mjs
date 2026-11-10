import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>readFileSync(path.join(root,p),"utf8");
const html=read("web-spa/src/games/crewArcadeLab.html");
const wrapper=read("web-spa/src/games/CrewArcadeLabPage.tsx");
const route=read("web-spa/src/App.tsx");
const hub=read("web-spa/src/games/CrewPlayHubPage.tsx");
const web=read("web-spa/src/analytics/usage.ts");
const worker=read("functions/api/usage/event.ts");

test("Crew Arcade Lab is a route and discoverable as a keyless four-game collection",()=>{
 assert.match(route,/const CrewArcadeLabPage=lazy/);
 assert.match(route,/<Route path="\/games\/arcade-lab"/);
 assert.match(hub,/to="\/games\/arcade-lab"/);
 assert.match(hub,/noKeyGames=.*"arcade-lab"/);
 for(const name of ["Sky Sprint","Neon Swarm","Tiny Quest","Robo Escape"])assert.ok(html.includes(name));
});

test("All four games are real local engines with controls and collision/goal logic",()=>{
 for(const mode of ["runner","shooter","rpg","blaster"])assert.match(html,new RegExp("mode==='"+mode+"'"));
 for(const engine of ["stepRunner","stepShooter","stepRpg","stepBlaster"])assert.ok(html.includes("function "+engine+"("));
 for(const action of ["jump","slide","dash","talk","fire","pause"])assert.ok(html.includes("'"+action+"'"));
 assert.match(html,/world=initial\(mode\)/);
 assert.match(html,/function finish\(win,detail\)/);
 assert.match(html,/onFloor\(x\)/);
 assert.match(html,/Math\.hypot\(s\.x-e\.x,s\.y-e\.y\)/);
});

test("Zoe Live is real BYOK, while offline scripts are visibly labeled and isolated",()=>{
 assert.match(html,/遊戲劇情台詞（非 AI 即時回覆）/);
 assert.match(html,/window\.parent\.postMessage/);
 assert.match(wrapper,/useLiveSession\(/);
 assert.match(wrapper,/buildFriendSystem\(friend/);
 assert.match(wrapper,/sessionKind:"friend",persistHistory:false,teacherReport:false/);
 assert.match(wrapper,/event\.source!==iframe\.current\?\.contentWindow/);
 assert.match(wrapper,/sendText\("\[VERIFIED GAME\] "/);
 assert.match(wrapper,/keyAvailable|hasKey/);
 assert.match(wrapper,/srcDoc=\{arcadeHtml\}/);
 assert.doesNotMatch(html,/<script[^>]*src=/i);
});

test("Cloudflare and browser analytics allow the exact four privacy-safe game identifiers",()=>{
 for(const id of ["sky-sprint","neon-swarm","tiny-quest","robo-escape"]){
  assert.ok(web.includes('"'+id+'"'),"Web "+id);
  assert.ok(worker.includes('"'+id+'"'),"Worker "+id);
 }
});
