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
