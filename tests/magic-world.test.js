import test from "node:test";
import assert from "node:assert/strict";
import {applyMagicCommand,demoMagicCommand,MAGIC_INITIAL_WORLD} from "../web-spa/src/magic/world.ts";

test("world transformations retain summoned objects and story progress",()=>{
 const d=applyMagicCommand(MAGIC_INITIAL_WORLD,"summon_object",{kind:"dragon"});
 assert.equal(d.ok,true);
 const n=applyMagicCommand(d.world,"change_world",{theme:"forest",time:"night",weather:"stars"});
 assert.equal(n.ok,true);
 assert.equal(n.world.objects.length,1);
 assert.equal(n.world.objects[0].kind,"dragon");
 assert.equal(n.world.time,"night");
});

test("the renderer rejects untrusted scripts and unknown tools",()=>{
 const html=applyMagicCommand(MAGIC_INITIAL_WORLD,"render_html",{html:"<script>throw Error()</script>"});
 assert.equal(html.ok,false);
 assert.equal(html.world,MAGIC_INITIAL_WORLD);
 const bad=applyMagicCommand(MAGIC_INITIAL_WORLD,"summon_object",{kind:"<img src=x onerror=alert(1)>"});
 assert.equal(bad.ok,false);
 const bogus=applyMagicCommand(MAGIC_INITIAL_WORLD,"change_world",{theme:"hacked"});
 assert.equal(bogus.ok,false);
});

test("limits object count and validates each challenge option",()=>{
 let state=MAGIC_INITIAL_WORLD;
 for(let n=0;n<10;n++)state=applyMagicCommand(state,"summon_object",{kind:"owl"}).world;
 assert.equal(applyMagicCommand(state,"summon_object",{kind:"owl"}).ok,false);
 assert.equal(applyMagicCommand(state,"create_challenge",{title:"Question",question:"?",option_a:"A",option_b:"B",correct_option:"B"}).ok,false);
});

test("challenge choices are graded exactly once and increment chapters for correct answers",()=>{
 const q=demoMagicCommand("puzzle",MAGIC_INITIAL_WORLD);
 const done=applyMagicCommand(q.world,"answer_challenge",JSON.stringify({choice:"B"}));
 assert.equal(done.event,"challenge-won");
 assert.equal(done.world.chapter,2);
 assert.equal(applyMagicCommand(done.world,"answer_challenge",{choice:"B"}).ok,false);
 const wrong=applyMagicCommand(q.world,"answer_challenge",{choice:"A"});
 assert.equal(wrong.event,"challenge-missed");
 assert.equal(wrong.world.chapter,1);
});

test("reset starts a new world without replaying content",()=>{
 const d=demoMagicCommand("dragon",MAGIC_INITIAL_WORLD);
 const clear=demoMagicCommand("reset",d.world);
 assert.equal(clear.world.objects.length,0);
 assert.equal(clear.world.weather,"clear");
 assert.ok(clear.world.revision>d.world.revision);
});

test("malformed tool arguments never crash the world",()=>{
 const bad=[null,[],123,"{broken",{"__proto__":"bad"}];
 for(const arg of bad)assert.equal(applyMagicCommand(MAGIC_INITIAL_WORLD,"summon_object",arg).ok,false);
});
