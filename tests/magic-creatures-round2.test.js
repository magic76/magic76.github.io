const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const root='web-spa/src/magic/';
const read=name=>fs.readFileSync(root+name,'utf8');
test('focused residents stay on a short roaming leash',()=>{
 const s=read('MagicScene3D.tsx');
 assert.match(s,/focused\?\[position\[0\]\+Math\.cos/);
 assert.match(s,/focused=\{focusId===obj\.id\}/);
});
test('tower faces camera while rotating only its wheel joint',()=>{
 const s=read('MagicCreations3D.tsx');
 assert.doesNotMatch(s,/base\.current\.rotation\.y=t\*\.55/);
 assert.match(s,/joint==="wheel"\?t\*\.78/);
});
test('shadow instances share forest hidden list',()=>{
 const scene=read('MagicScene3D.tsx'),shadow=read('MagicGroundShadows3D.tsx');
 assert.match(scene,/<MagicGroundShadows3D hidden=\{hiddenTrees\}/);
 assert.match(shadow,/hide\.has\(i\)/);
});
test('portal glow uses an additive, depth-write-free halo',()=>{
 const s=read('MagicResidents3D.tsx');
 assert.match(s,/<ringGeometry args=/);
 assert.match(s,/emissiveIntensity=\{\.78\}/);
 assert.match(s,/depthWrite=\{false\}/);
});
test('manual orbit recomputes hidden trees instead of revealing all of them',()=>{
 const scene=read('MagicScene3D.tsx'),focus=read('magicFocus.ts');
 assert.match(focus,/export function magicHiddenTrees\(/);
 assert.match(scene,/onChange=\{\(\)=>\{if\(!manualOrbit\.current\|\|!selected\)return;const next=magicHiddenTrees\(camera\.position\.toArray\(\)/);
});
