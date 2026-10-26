const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../web-spa/src/magic/magicCreatureIdle.ts"),"utf8");
// Portable TypeScript pure-function testing for the supported TS/Node toolchain.
const js=source.replace(/:number/g,"").replace(/:boolean/g,"").replace(/export /g,"");
const get=new Function(`${js}; return {magicBlink,magicCreatureIdle};`)();
test("reduced motion is fully static",()=>{for(const t of [0,1,7,29])assert.deepEqual(get.magicCreatureIdle(t,false,4),{bob:0,look:0,tilt:0,breath:1,blink:1,tail:0,squash:1})});
test("idle limits and finite values",()=>{for(let t=0;t<20;t+=.031){const p=get.magicCreatureIdle(t,true,3);for(const v of Object.values(p))assert.ok(Number.isFinite(v));assert.ok(Math.abs(p.bob)<=.05);assert.ok(p.blink>=.1&&p.blink<=1);assert.ok(Math.abs(p.squash-1)<=.04)}});
test("blink is deterministic and closes briefly",()=>{assert.equal(get.magicBlink(2,4),get.magicBlink(2,4));assert.equal(get.magicBlink(1.5,0),1);assert.ok(get.magicBlink(.08,0)<=.101)});
