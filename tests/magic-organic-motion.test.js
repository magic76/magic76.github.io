const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('organic gait stays renderer-owned, bounded, and wired to fox anatomy',()=>{
 const motion=fs.readFileSync('web-spa/src/magic/magicOrganicMotion.ts','utf8');
 const figures=fs.readFileSync('web-spa/src/magic/MagicProceduralLife3D.tsx','utf8');
 assert.match(motion,/magicOrganicGaitPose/);
 assert.match(motion,/clamp\(Number\.isFinite\(motionScale\)/);
 assert.doesNotMatch(motion,/eval\(|Function\(|fetch\(|https?:\/\//);
 assert.match(figures,/magicOrganicGaitPose\(clock\.elapsedTime/);
 assert.match(figures,/body\.current\.position\.y=pose\.bodyY/);
 assert.match(figures,/head\.current\.rotation\.x=pose\.headPitch/);
 assert.match(figures,/tail\.current\.rotation\.y=pose\.tailYaw/);
 assert.match(figures,/node\.rotation\.x=pose\.legPitch\[i\]/);
});
