import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>readFileSync(path.join(root,file),"utf8");
const run=read("web-spa/src/games/CrewRunPage.tsx");
const app=read("web-spa/src/App.tsx");
const hub=read("web-spa/src/games/CrewPlayHubPage.tsx");
const usage=read("web-spa/src/analytics/usage.ts");

test("Crew Run is a lazy route reachable from Play hub, free-play filter, and recent history",()=>{
 assert.match(app,/const CrewRunPage=lazy/);
 assert.match(app,/<Route path="\/games\/crew-run"/);
 assert.match(hub,/to="\/games\/crew-run"/);
 assert.match(hub,/noKeyGames=.*"crew-run"/);
 assert.match(hub,/extraGames=.*"crew-run"/);
 assert.match(app,/werewolf\|crew-run/);
 assert.match(usage,/\|"crew-run"/);
});

test("Crew Run owns obstacle collisions locally and never requires voice to start",()=>{
 assert.match(run,/function tick\(s:Run,dt:number\)/);
 assert.match(run,/if\(s\.phase!=="running"\)return null/);
 assert.match(run,/if\(s\.hits>=3\)/);
 assert.match(run,/s\.phase="fork"/);
 assert.match(run,/Math\.min\(END/);
 assert.match(run,/onClick=\{start\}/);
 assert.match(run,/onTouchStart=/);
 assert.match(run,/onTouchEnd=/);
 assert.match(run,/onClick=\{\(\)=>action\("jump"\)\}/);
 assert.doesNotMatch(run,/GuestLiveStarter/);
});

test("Crew Run AI comments on verified events but never decides score or chooses route by its own output",()=>{
 assert.match(run,/buildFriendSystem\(zoe/);
 assert.match(run,/persistHistory:false,teacherReport:false/);
 assert.match(run,/sendText\("\[VERIFIED GAME\] "/);
 assert.match(run,/const route=parseRoute\(input\)/);
 assert.match(run,/if\(route\)chooseRef\.current\(route\)/);
 assert.match(run,/keyAvailable\?/);
 assert.match(run,/<Link to="\/settings">/);
});
