import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>readFileSync(path.join(root,p),"utf8");
const html=read("web-spa/public/neon-swarm-v2.html");
const page=read("web-spa/src/games/NeonSwarmPage.tsx");
const routes=read("web-spa/src/App.tsx");
const hub=read("web-spa/src/games/CrewPlayHubPage.tsx");
const css=read("web-spa/src/games/neonSwarmPage.css");
const ga4=read("web-spa/src/analytics/ga4.ts");

test("Neon Swarm: shipped as a genuinely playable HTML route with no Key, login or external asset requirements",()=>{
 assert.match(routes,/<Route path="\/games\/neon-swarm"/);
 assert.match(page,/src="\/neon-swarm-v2.html"/);
 assert.match(hub,/to="\/games\/neon-swarm"/);
 assert.match(hub,/noKeyGames=.*"neon-swarm"/);
 assert.match(ga4,/arcade-lab neon-swarm/);
 assert.match(html,/<canvas id="game"/);
 assert.match(html,/data:image\/webp;base64,/);
 assert.doesNotMatch(html,/<script[^>]+src=/);
 assert.doesNotMatch(html,/fetch\(|XMLHttpRequest|navigator\.sendBeacon|WebSocket\(/);
 assert.ok(css.length>100);
});
test("Neon Swarm: authored gameplay has waves, real boss HP, bullets, damage, collision, victory and restart",()=>{
 for(const anchor of ["function reset()","function begin()","function end(won)","function spawnBoss()","function spawnMob(","function harm(","function shoot()","function kill(","function playDash()","function choose(v)","function step(dt)","function draw()"]){
  assert.ok(html.includes(anchor),anchor);
 }
 assert.match(html,/boss\.hp-=s\.damage/);
 assert.match(html,/boss\.hp<=0/);
 assert.match(html,/gameTime>duration&&!boss/);
 assert.match(html,/player\.hp=Math\.max\(0,player\.hp-leftover\)/);
 assert.match(html,/resize\(\).*?devicePixelRatio/s);
 assert.match(html,/Object\.defineProperty\(window,'__NEON_STATE__'/);
});
test("Neon Swarm: tactical branching changes actual deterministic state, not just dialogue",()=>{
 assert.match(html,/if\(v==='fire'\).*?player\.fireBoost=22/);
 assert.match(html,/turrets\.push\(/);
 assert.match(html,/player\.shield=Math\.min\(80,player\.shield\+60\)/);
 assert.match(html,/player\.hp=Math\.min\(120,player\.hp\+20\)/);
 assert.match(html,/if\(helpUsed\|\|phase!=='run'\)return/);
 assert.match(html,/phase='choice'/);
 assert.match(html,/if\(phase!=='choice'\|\|helpUsed\)return/);
});
test("Neon Swarm: Zoe Gemini Live uses verified game signals and gives safe button fallback",()=>{
 assert.match(page,/buildFriendSystem\(friend/);
 assert.match(page,/useLiveSession\(/);
 assert.match(page,/persistHistory:false,teacherReport:false/);
 assert.match(page,/event\.source!==iframe\.current\?\.contentWindow/);
 assert.match(page,/event\.origin!==window\.location\.origin/);
 assert.match(page,/if\(choiceOpen\.current&&typeof turn\.input==="string"\)/);
 assert.match(page,/crew-neon-choice/);
 assert.match(page,/\[VERIFIED GAME\]/);
 assert.match(html,/data-ability="fire"/);
 assert.match(html,/data-ability="shield"/);
 assert.match(html,/DEMO 劇情台詞 · 尚未連線 AI/);
 assert.match(html,/crew-neon-live-disconnected/);
 assert.match(page,/trackUsageEvent\("game_started","neon-swarm"\)/);
 assert.match(page,/trackUsageEvent\("game_completed","neon-swarm"\)/);
});
