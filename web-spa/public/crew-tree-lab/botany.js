/* Crew Tree Lab botanical renderer v2.
 * Pure, seeded 2D morphology. Tree/leaf DNA and conversation events live in tree.js.
 * The attractor-guided crown layout is inspired by Runions et al. (2007):
 * https://doi.org/10.2312/NPH/NPH07/063-070
 * This is a stylized 2D approximation, not a claim to reproduce their full 3D solver.
 */
(function(root){
'use strict';
const TAU=Math.PI*2;
const C=(v,a,b)=>Math.max(a,Math.min(b,v));
const hypot=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const mix=(a,b,t)=>a+(b-a)*t;
const GOLDEN=2.399963229728653;

function seeded(seed){
 let a=seed>>>0;
 return ()=>{
  a=(a+0x6D2B79F5)>>>0;
  let t=a;
  t=Math.imul(t^(t>>>15),t|1);
  t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
 };
}
function point(t,height,profile,g){
 let x=(Math.sin(t*4.1+g.twist*2)-Math.sin(g.twist*2))*profile.wiggle*38*t
  +g.lean*25*t+profile.lean*42*t;
 if(g.silhouette===1)x+=Math.sin(t*TAU*1.5)*12*t;
 if(g.silhouette===7)x+=Math.sin(t*16)*7*t;
 if(g.silhouette===11)x+=Math.sin(t*Math.PI)*28;
 return {x,y:-t*height};
}
function targetAt(i,height,profile,g,seed,count){
 const r=seeded(seed^Math.imul(i+1,0x4f1bbcdc));
 const angle=i*GOLDEN+r()*.47+seed%11*.11;
 const radius=.38+.58*Math.sqrt(r());
 const width=(69+Math.min(count,17)*2.2)*profile.spread;
 let x=Math.sin(angle)*radius*width;
 let y=-height*.72+Math.cos(angle)*radius*height*.30;
 if(g.silhouette===2){y=-height*.65+Math.cos(angle)*radius*height*.22;}
 if(g.silhouette===3||g.silhouette===10){y+=Math.max(0,Math.abs(x)/Math.max(1,width)-.35)*height*.24;}
 if(g.silhouette===6||g.silhouette===8){y=-height*.80+Math.cos(angle)*radius*height*.17;}
 if(g.silhouette===5){y+=Math.sin(angle*3)*12;}
 if(g.silhouette===4){x+=x>=0?24:-24;}
 if(g.silhouette===9){x+=height*.19;}
 x+=g.lean*26+profile.lean*36;
 return {x,y};
}
function generate(tree,profiles,palettes){
 const growth=tree.growth||[],n=growth.length,g=tree.genome;
 const profile=profiles[g.silhouette],height=(48+Math.min(n,20)*13)*profile.height;
 const rand=seeded(tree.seed^0xa591bb61);
 const trunk=[],segCount=Math.max(9,Math.ceil(height/15));
 for(let i=0;i<=segCount;i++)trunk.push(point(i/segCount,height,profile,g));
 const branches=[],ornaments=[];
 const nBranches=Math.min(73,Math.max(2,n*3));
 const availableTargets=[];
 for(let i=0;i<nBranches;i++){
  const turn=growth.length?growth[Math.floor(i/3)%growth.length]:{topic:'daily',mood:0,energy:.5};
  const target=targetAt(i,height,profile,g,tree.seed,n);
  // Every tip follows a deterministic canopy attractor. Most later stems attach
  // to an earlier branch tip instead of directly radiating from the trunk.
  const trunkT=C(-target.y/height-.17,.22,.88);
  let parentIndex=-1,parentGen=0,start=point(trunkT,height,profile,g);
  let best=hypot(start,target)*1.05;
  if(i>=3&&i%5!==0){
   for(let j=0;j<branches.length;j++){
    const p=branches[j],candidate=p.end;
    if(p.generation>=3||candidate.y<target.y-14)continue;
    const d=hypot(candidate,target)*(p.generation===1?.75:.88);
    if(d<best){best=d;start=candidate;parentIndex=j;parentGen=p.generation;}
   }
  }
  if(parentIndex===-1){
   // Primary branches start below their intended canopy target.
   const t=C((-target.y/height)-.13,.19,.86);
   start=point(t,height,profile,g);
  }
  const generation=parentIndex<0?1:parentGen+1;
  const energy=C((Number(turn.energy)||.5)*.25+.83,.83,1.08);
  const mood=C(Number(turn.mood)||0,-1,1);
  const topic=turn.topic||'daily';
  const targetScale=(topic==='food'?1.10:topic==='travel'?1.07:topic==='tech'?.92:topic==='stress'?.89:1);
  const dx=target.x-start.x,dy=target.y-start.y;
  const maxReach=(generation===1?86: generation===2?58:42)*profile.spread*energy*targetScale;
  const wanted=Math.hypot(dx,dy),fraction=Math.min(1,maxReach/Math.max(1,wanted));
  let end={x:start.x+dx*fraction,y:start.y+dy*fraction};
  if(end.y>start.y+20&&profile.droop<.45)end.y=start.y+20;
  const side=Math.sign(end.x-start.x)||((i%2)*2-1);
  const rise=(14+rand()*16)*(1+mood*.25);
  const p1={x:mix(start.x,end.x,.52)+side*(10+rand()*13),y:mix(start.y,end.y,.48)-rise};
  if(profile.droop>.5)end.y+=Math.abs(end.x-start.x)*profile.droop*.22;
  if(topic==='weather')end.y+=8;
  if(topic==='tech')p1.x=mix(start.x,end.x,.3);
  if(topic==='cosmos')p1.y-=9;
  if(tree.mutations?.includes('heartvine')&&topic==='love')end.x+=side*9;
  if(tree.mutations?.includes('thorns')&&topic==='stress')p1.y-=11;
  if(tree.mutations?.includes('raincloud')&&topic==='weather')end.y+=11;
  // Keep every twig attached and its width bounded, including saved old seeds.
  const branch={start:{...start},p1,end,t:trunkT,width:2.4,topic,i,
   generation,parentIndex,age:Math.floor(i/3),leafGroup:i,tipWeight:1};
  branches.push(branch);
  availableTargets.push(target);
 }
 // A simple pipe model: parent sections are thicker because they carry more tips.
 for(let i=branches.length-1;i>=0;i--){
  const b=branches[i];
  b.width=C(1.35+Math.pow(b.tipWeight,.54)*(b.generation===1?2.3:1.35),1.6,11);
  if(b.parentIndex>=0)branches[b.parentIndex].tipWeight+=b.tipWeight*.63;
 }
 const canopy=[];
 for(const b of branches){
  const r=seeded(tree.seed^Math.imul(b.i+1,0x18d4ac25));
  const density=n<=2?3:n<=6?5:n<=13?6:7;
  for(let k=0;k<density;k++){
   const radius=7.5+r()*8.7+(n>10?2:0);
   const x=b.end.x+(r()-.5)*(20+(n>7?10:0));
   const y=b.end.y+(r()-.5)*(18+(n>7?8:0));
   canopy.push({x,y,r:radius,angle:(r()-.5)*1.7,type:b.topic,colorBand:Math.floor(r()*3),
    parentIndex:b.i,leafType:k%5===0?-1:g.leaf,phase:r()*TAU});
  }
  if(n>0&&b.i%Math.max(3,Math.round(nBranches/9))===1&&ornaments.length<8){
   const iconTopic=b.topic;ornaments.push({x:b.end.x,y:b.end.y-17,
    topic:iconTopic,float:r()*TAU,scale:.85+r()*.26,parentIndex:b.i});
  }
 }
 // Decorative crown mass is intentionally assembled from individual coherent
 // clusters, not uncorrelated leaves scattered around trunk x/y.
 const xVals=[...trunk.map(p=>p.x),...canopy.map(p=>p.x-p.r),...canopy.map(p=>p.x+p.r)];
 const yVals=[...trunk.map(p=>p.y),...canopy.map(p=>p.y-p.r)];
 const bounds={minX:Math.min(...xVals,-27)-16,maxX:Math.max(...xVals,27)+16,
  minY:Math.min(...yVals,-height)-21,maxY:18};
 return {height,trunk,branches,ornaments,canopy,bounds,profile,palette:palettes[g.palette],
  attractors:availableTargets,modelVersion:2};
}
function leaf(c,x,y,r,type,color,angle,opacity=1){
 c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha*=opacity;c.fillStyle=color;
 c.beginPath();
 switch(type){
  case 0:c.ellipse(0,0,r,r*.72,0,0,TAU);break;
  case 1:
   c.moveTo(0,r*.95);c.bezierCurveTo(-r*1.4,-r*.25,-r*1.18,-r*1.1,0,-r*.45);
   c.bezierCurveTo(r*1.18,-r*1.1,r*1.4,-r*.25,0,r*.95);break;
  case 2:
   c.moveTo(0,-r*1.5);c.quadraticCurveTo(r*.4,-r*.32,r*.25,r);
   c.lineTo(-r*.25,r);c.quadraticCurveTo(-r*.4,-r*.32,0,-r*1.5);break;
  case 3:
   for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,z=i%2?r*.45:r*1.2;
    if(i===0)c.moveTo(Math.cos(a)*z,Math.sin(a)*z);else c.lineTo(Math.cos(a)*z,Math.sin(a)*z)}
   break;
  case 4:c.moveTo(0,-r);c.lineTo(r*.82,0);c.lineTo(0,r);c.lineTo(-r*.82,0);break;
  case 5:c.ellipse(0,0,r*.58,r*1.25,.14,0,TAU);break;
  case 6:c.ellipse(0,0,r,r*.78,0,0,TAU);break;
  default:c.moveTo(0,-r);c.lineTo(r*.85,-r*.16);c.lineTo(r*.48,r*.84);
   c.lineTo(-r*.5,r*.84);c.lineTo(-r*.85,-r*.16);
 }
 c.closePath();c.fill();
 c.globalAlpha*=.32;c.fillStyle='#ffffff';c.beginPath();
 c.ellipse(-r*.22,-r*.26,Math.max(.8,r*.16),Math.max(1.1,r*.33),-.32,0,TAU);
 c.fill();c.restore();
}
function taperBranch(c,start,control,end,width,wood,shine,progress){
 const amt=C(progress,0,1);
 if(amt<=0)return;
 const mid={x:mix(start.x,end.x,amt),y:mix(start.y,end.y,amt)};
 const elbow={x:mix(start.x,control.x,amt),y:mix(start.y,control.y,amt)};
 c.save();c.strokeStyle=wood;c.lineCap='round';
 // Multiple smooth widths simulate a woody branch that becomes thinner at tip.
 for(let i=0;i<4;i++){
  const a=i/4,b=Math.min(1,(i+1)/4),startT=a*amt,endT=b*amt;
  if(startT>=amt)break;
  const quadratic=t=>{
   const u=1-t;return {x:u*u*start.x+2*u*t*control.x+t*t*end.x,
    y:u*u*start.y+2*u*t*control.y+t*t*end.y};
  };
  const p=quadratic(startT),q=quadratic(endT),m=quadratic((startT+endT)/2);
  c.lineWidth=Math.max(.7,width*(1-startT*.78));
  c.beginPath();c.moveTo(p.x,p.y);c.quadraticCurveTo(m.x,m.y,q.x,q.y);c.stroke();
 }
 if(width>3.5){c.strokeStyle=shine;c.lineWidth=Math.max(.6,width*.14);
  c.beginPath();c.moveTo(start.x-1.5,start.y-1);c.quadraticCurveTo(elbow.x-2,elbow.y,mid.x-2,mid.y);c.stroke();}
 c.restore();
}
// Color blends are deterministic and bounded, so every conversation keeps a
// consistent foliage palette while topic-specific accents remain discoverable.
function rgb(hex){
 const clean=String(hex).replace('#','');
 if(!/^[0-9a-f]{6}$/i.test(clean))return [114,184,137];
 return [0,2,4].map(i=>parseInt(clean.slice(i,i+2),16));
}
function blend(a,b,t){
 const x=rgb(a),y=rgb(b),f=C(t,0,1);
 return '#'+x.map((v,i)=>Math.round(mix(v,y[i],f)).toString(16).padStart(2,'0')).join('');
}
function canopyLobe(c,x,y,r,seed,color,highlight,alpha=1){
 // Rounded irregular outlines read as one botanical mass, not as scattered dots.
 const rand=seeded(seed);
 const verts=10,points=[];
 for(let j=0;j<verts;j++){
  const a=j*TAU/verts-Math.PI/2;
  const irregular=.85+rand()*.28;
  points.push({x:x+Math.cos(a)*r*irregular,y:y+Math.sin(a)*r*.85*irregular});
 }
 c.save();
 c.globalAlpha*=alpha;
 c.beginPath();
 const first=points[0],last=points[verts-1];
 c.moveTo((first.x+last.x)/2,(first.y+last.y)/2);
 for(let j=0;j<verts;j++){
  const a=points[j],b=points[(j+1)%verts];
  c.quadraticCurveTo(a.x,a.y,(a.x+b.x)/2,(a.y+b.y)/2);
 }
 c.closePath();
 c.fillStyle=blend(color,'#1b5649',.28);
 c.fill();
 // Broad directional light gives foliage form, not per-leaf confetti.
 const grad=c.createRadialGradient(x-r*.33,y-r*.45,r*.07,x+r*.09,y+r*.07,r*1.35);
 grad.addColorStop(0,blend(highlight,'#f9ffe6',.28));
 grad.addColorStop(.5,color);
 grad.addColorStop(1,blend(color,'#24554d',.40));
 c.fillStyle=grad;c.fill();
 c.lineWidth=Math.max(.8,r*.058);
 c.strokeStyle=blend(color,'#294e43',.30);
 c.stroke();
 c.save();c.globalAlpha*=.19;
 c.fillStyle='#ffffe9';c.beginPath();c.ellipse(x-r*.26,y-r*.44,r*.38,r*.12,-.40,0,TAU);c.fill();
 c.restore();
 c.restore();
}
function drawWood(c,tree,geo){
 const n=tree.growth.length;
 const trunk=geo.trunk;
 const bark=c.createLinearGradient(-45,0,55,-290);
 bark.addColorStop(0,'#72503c');bark.addColorStop(.46,'#a27758');bark.addColorStop(1,'#b5906d');
 // Rounded tapering segments join into a believable trunk base and central axis.
 c.lineJoin='round';c.lineCap='round';
 for(let i=1;i<trunk.length;i++){
  const p=trunk[i-1],q=trunk[i],t=i/(trunk.length-1);
  const thick=(15+Math.min(n,12)*.53)*Math.pow(1-t,.72)+1.6;
  c.lineWidth=thick+2.5;c.strokeStyle='#674539';
  c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();
  c.lineWidth=thick;c.strokeStyle=bark;c.stroke();
  c.lineWidth=Math.max(.7,thick*.09);c.strokeStyle='#e9c79b8c';
  c.beginPath();c.moveTo(p.x-thick*.22,p.y);c.lineTo(q.x-thick*.19,q.y);c.stroke();
 }
 if(n>4){
  c.lineWidth=5;c.strokeStyle='#644b38';c.beginPath();
  c.moveTo(-2,-5);c.quadraticCurveTo(-18,5,-26,7);
  c.moveTo(2,-5);c.quadraticCurveTo(18,5,26,7);c.stroke();
 }
 const sr=seeded(tree.seed^0x5ba28d94);
 const visible=5+Math.min(12,n);
 for(let i=0;i<visible;i++){
  const t=.12+sr()*.64,p=geo.trunk[Math.floor(t*(trunk.length-1))],len=3+sr()*9;
  c.lineWidth=.8;c.strokeStyle='#5b453655';c.beginPath();
  c.moveTo(p.x+2.6,p.y);
  c.quadraticCurveTo(p.x+3.9,p.y-len*.5,p.x+3,p.y-len);c.stroke();
 }
}
function paint(c,tree,geo,ox,oy,factor,clock,options={}){
 const n=tree.growth.length,pal=geo.palette,branches=geo.branches;
 const fromIndex=Number.isFinite(options.revealFrom)?options.revealFrom:branches.length;
 const progress=options.reducedMotion?1:C(Number.isFinite(options.progress)?options.progress:1,0,1);
 const t=Number.isFinite(clock)?clock:0;
 c.save();c.translate(ox,oy);c.scale(factor,factor);
 c.lineCap='round';c.lineJoin='round';
 // Quiet ground shadow makes trunk contact and visual weight more obvious.
 c.save();c.globalAlpha=.23;c.fillStyle='#163e32';c.beginPath();
 c.ellipse(0,3,Math.min(70,30+n*1.8),9,0,0,TAU);c.fill();c.restore();
 // Soft distant leaves behind the woody structure.
 // Each lobe follows an ACTUAL child branch, not the canvas center.
 if(n>0)for(const b of branches){
  const appear=b.i<fromIndex?1:progress;if(appear<=0)continue;
  const rand=seeded(tree.seed^Math.imul(b.i+1,0x20f69d7b));
  const radius=(n<3?13:n<7?17:n<13?21:24)*(b.generation===1?1.03:.91);
  const topicColor=options.topics?.[b.topic]?.color||pal[0];
  const main=blend(pal[(b.i+1)%3],topicColor,b.i%4===0?.30:.08);
  canopyLobe(c,b.end.x-rand()*9,b.end.y-3,radius*.98*appear,
    tree.seed^Math.imul(b.i+1,17),blend(main,'#2f7359',.22),pal[1],.80);
 }
 // The trunk now has layered bark shading, with child branches that visibly taper.
 drawWood(c,tree,geo);
 for(const b of branches){
  const appear=b.i<fromIndex?1:progress;
  if(appear<=0)continue;
  taperBranch(c,b.start,b.p1,b.end,b.width,'#785344','#dfb68b74',appear);
 }
 // Front foliage overlaps naturally into generous crown masses.
 // Use 2-3 overlapping lobes per twig rather than hundreds of isolated emoji leaves.
 if(n>0)for(const b of branches){
  const appear=b.i<fromIndex?1:progress;if(appear<=0)continue;
  const rand=seeded(tree.seed^Math.imul(b.i+1,0x1ec62d41));
  const topicColor=options.topics?.[b.topic]?.color||pal[0];
  const leafCount=n>=11?3:2;
  const baseSize=(n<3?13:n<7?17.5:n<13?21.5:25)*(b.generation===1?1:.88);
  const mixAccent=b.i%6===0?.34:.07;
  const main=blend(pal[(b.i+2)%3],topicColor,mixAccent);
  for(let j=0;j<leafCount;j++){
   const r=baseSize*(j===0?1: .68+rand()*.17)*appear;
   const dir=j===0?0:j%2?1:-1;
   const x=mix(b.start.x,b.end.x,appear)+(rand()-.5)*6+dir*(r*.51);
   const y=mix(b.start.y,b.end.y,appear)-4-(j===0?r*.31:0)+(rand()-.5)*6;
   const wind=options.reducedMotion?0:Math.sin(t*.0011+b.i*1.3+j)*.45;
   canopyLobe(c,x+wind,y,r,tree.seed^Math.imul(b.i*7+j+1,0x21a4c3e7),
    blend(main,pal[j%3],j===0?.10:.22),pal[1],.98);
  }
  // A few pronounced leaves/petals communicate leaf species at human scale.
  // The canopy silhouette itself is independent of individual leaf geometry.
  if(b.i%3===0){
   const foliage=options.topics?.[b.topic]?.color||pal[1];
   const subtype=b.topic==='tech'?4:b.topic==='cosmos'?3:b.topic==='love'?1:tree.genome.leaf;
   leaf(c,b.end.x-8,b.end.y-11,7.5*appear,subtype,
    blend(foliage,pal[1],.46),-.3,.91);
   leaf(c,b.end.x+8,b.end.y-4,6.2*appear,subtype,
    blend(foliage,pal[0],.45),.7,.9);
  }
 }
 // Fruit, flowers and conversation mutations are small decorations, not a full
 // curtain of emoji covering the tree shape.
 if(n>0)for(const a of geo.ornaments.slice(0,7)){
  const b=branches[a.parentIndex],appear=b.i<fromIndex?1:progress;
  if(appear<.9)continue;
  const icon=options.topics?.[a.topic]?.ornament||'✿';
  c.save();c.translate(a.x,a.y);
  if(!options.reducedMotion)c.translate(0,Math.sin(t*.0012+a.float)*1.7);
  c.shadowColor='#f8ffdf';c.shadowBlur=4;
  c.font=Math.round(11*a.scale)+'px system-ui,sans-serif';
  c.textAlign='center';c.textBaseline='middle';c.fillText(icon,0,0);c.restore();
 }
 if(tree.mutations?.length){
  tree.mutations.slice(0,7).forEach((key,i)=>{
   const b=branches[(i*13+3)%branches.length];
   if(!b)return;const appear=b.i<fromIndex?1:progress;
   if(appear<.8)return;
   const trait=options.mutations?.find(m=>m.key===key);if(!trait)return;
   c.save();c.translate(b.end.x,b.end.y-15);
   c.fillStyle='#fff5d7d9';c.beginPath();c.arc(0,0,10.5,0,TAU);c.fill();
   c.font='14px system-ui';c.textAlign='center';c.textBaseline='middle';
   c.fillText(trait.icon,0,0);c.restore();
  });
 }
 c.restore();
}
root.CrewBotany=Object.freeze({generate,paint,leaf,seeded,modelVersion:3});
})(window);
