const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {stripTypeScriptTypes}=require('node:module');
const path=require('node:path');
const raw=fs.readFileSync(path.join(__dirname,'../web-spa/src/magic/magicFocus.ts'),'utf8');
const js=stripTypeScriptTypes(raw,{mode:'strip'}).replace(/\bexport\s+(?=(?:function|const|class)\b)/g,'');
const {getMagicFocusPose,magicOccludes}=new Function(js+';return {getMagicFocusPose,magicOccludes}').call(null);
const layout=fs.readFileSync(path.join(__dirname,'../web-spa/src/magic/magicLayout.ts'),'utf8');
// Same deterministic tree/district layout, without importing TS modules.
const groups=[[-10,-6,10,2.25],[10,-6,9,2.3],[-11,5.8,10,2.45],[11,6.2,9,2.45],[0,-11,8,2.1],[0,10.5,8,2.3]];
const trees=groups.flatMap(([x,z,n,spread],g)=>Array.from({length:n},(_,i)=>{
 const a=i*2.39996+g*.67,r=Math.sqrt((i+.42)/n)*spread;
 return {x:x+Math.cos(a)*r,z:z+Math.sin(a)*r*.9,scale:.7+((i*7+g*3)%9)/9*.7};
})).filter(p=>Math.hypot(p.x/17.87,p.z/15.0)<.91&&!(Math.abs(p.x)<2.6&&p.z>3.5&&p.z<12.5));
const obstacles=[...trees.map((p,index)=>({x:p.x,z:p.z,ground:1.5,height:2.55*p.scale,radius:.88*p.scale,index,kind:'tree'})),
 ...Array.from({length:8},(_,id)=>{const a=id*Math.PI/4+.18;return {x:Math.cos(a)*12.5,z:Math.sin(a)*10.4,ground:1.5,height:2.6,radius:2.15,kind:'district'};}),
 {x:0,z:-.55,ground:1.5,height:7.5,radius:4.5,kind:'castle'}];
const points=[[-.73,.45],[.25,.45],[.75,-.4],[-.83,-.23],[.65,-.5],[-.3,.84],[.18,-.86],[-.95,.1],[.91,.3]];
for(const [nx,nz] of points)test('focus pose keeps non-hidden occluders out '+nx+','+nz,()=>{
 const subject={x:nx*11.7,z:nz*10.3,ground:1.5,height:3.2,radius:1.2};
 const pose=getMagicFocusPose(subject,obstacles,.62);
 assert.ok(pose.camera[1]>=subject.ground+3);
 const samples=[[subject.x,subject.ground+.18,subject.z],[subject.x,subject.ground+1.5,subject.z],[subject.x,subject.ground+3.2,subject.z],
 [subject.x-.9,subject.ground+1.5,subject.z],[subject.x+.9,subject.ground+1.5,subject.z]];
 for(const o of obstacles.filter(o=>o.kind==='tree'&&!pose.hiddenTrees.includes(o.index)))
  for(const p of samples)assert.ok(!magicOccludes(pose.camera,p,o));
 const desktop=getMagicFocusPose(subject,obstacles,1.6);
 assert.ok(Math.hypot(pose.camera[0]-subject.x,pose.camera[2]-subject.z)>Math.hypot(desktop.camera[0]-subject.x,desktop.camera[2]-subject.z));
});
test('small chibi subjects are framed closer than tall ones, portrait still farther',()=>{
 const at=h=>({x:.25*11.7,z:.45*10.3,ground:1.5,height:h,radius:1.2});
 const gap=(p,s)=>Math.hypot(p.camera[0]-s.x,p.camera[2]-s.z);
 const small=at(2),tall=at(3.8);
 const ds=getMagicFocusPose(small,[],1.6),dt=getMagicFocusPose(tall,[],1.6),ms=getMagicFocusPose(small,[],.46);
 assert.ok(gap(ds,small)<gap(dt,tall)*.7);
 assert.ok(gap(ms,small)>gap(ds,small));
 assert.ok(ds.camera[1]>=small.ground+3);
 assert.ok(Math.hypot(ds.camera[0]-ds.target[0],ds.camera[1]-ds.target[1],ds.camera[2]-ds.target[2])>7.2);
});
