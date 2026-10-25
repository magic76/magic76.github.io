const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('organic gait stays renderer-owned and bounded',()=>{
 const source=fs.readFileSync('web-spa/src/magic/magicOrganicMotion.ts','utf8');
 assert.match(source,/magicOrganicGaitPose/);
 assert.match(source,/clamp\(Number\.isFinite\(motionScale\)/);
 assert.doesNotMatch(source,/eval\(|Function\(|fetch\(|https?:\/\//);
 assert.match(source,/legPitch/);
 assert.match(source,/legRoll/);
 assert.match(source,/tailYaw/);
 assert.match(source,/tailPitch/);
 assert.match(source,/headPitch/);
 assert.match(source,/headYaw/);
});

test('procedural fox consumes the bounded pose for body, head, legs and tail',()=>{
 const source=fs.readFileSync('web-spa/src/magic/MagicProceduralLife3D.tsx','utf8');
 assert.match(source,/magicOrganicGaitPose\(clock\.elapsedTime,animated\?1:0\)/);
 assert.match(source,/body\.current\.position\.y=pose\.bodyY/);
 assert.match(source,/head\.current\.rotation\.y=pose\.headYaw/);
 assert.match(source,/node\.rotation\.x=pose\.legPitch\[i\]/);
 assert.match(source,/tail\.current\.rotation\.y=pose\.tailYaw/);
 assert.doesNotMatch(source,/Math\.sin\(t\*5\.8/);
});
