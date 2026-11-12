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
    if(p.generation>=3||candidate.y<target.y+35)continue;
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
function paint(c,tree,geo,ox,oy,factor,clock,options={}){
 const count=tree.growth.length,pal=geo.palette,branches=geo.branches;
 const fromIndex=Number.isFinite(options.revealFrom)?options.revealFrom:branches.length;
 const progress=options.reducedMotion?1:C(Number.isFinite(options.progress)?options.progress:1,0,1);
 c.save();c.translate(ox,oy);c.scale(factor,factor);c.lineCap='round';c.lineJoin='round';
 // Roots and tapered trunk: explicit graded widths, not a single thick line.
 const mainWood=c.createLinearGradient(-20,0,40,-270);
 mainWood.addColorStop(0,'#684d42');mainWood.addColorStop(.45,'#8d6452');mainWood.addColorStop(1,'#a27b61');
 c.lineCap='round';
 for(let i=1;i<geo.trunk.length;i++){
  const p=geo.trunk[i-1],q=geo.trunk[i],t=i/geo.trunk.length;
  c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);
  c.strokeStyle=mainWood;c.lineWidth=(14+Math.min(count,12)*.48)*(1-t*.76);c.stroke();
  c.lineWidth=Math.max(.7,(2.1-t*1.1));c.strokeStyle='#e3b38b5b';
  c.beginPath();c.moveTo(p.x-2,p.y);c.lineTo(q.x-2,q.y);c.stroke();
 }
 if(geo.profile?.spread>1.42&&count>2){
  c.lineWidth=3;c.strokeStyle='#6c5647';c.beginPath();
  c.moveTo(-3,-7);c.quadraticCurveTo(-17,2,-27,5);
  c.moveTo(3,-7);c.quadraticCurveTo(17,2,27,5);c.stroke();
 }
 // Crown backdrop makes the leaves read as coherent, soft masses.
 // Each cluster stays anchored to a branch endpoint and is reproducible.
 for(const b of branches){
  const step=b.i<fromIndex?1:progress;
  if(step<=0)continue;
  taperBranch(c,b.start,b.p1,b.end,b.width,mainWood,'#e0a88866',step);
 }
 for(const l of geo.canopy){
  const b=branches[l.parentIndex],step=b.i<fromIndex?1:progress;
  if(step<=0)continue;
  const wx=mix(b.start.x,l.x,step),wy=mix(b.start.y,l.y,step);
  const size=l.r*(b.i<fromIndex?1:step);
  if(size<1)continue;
  const topicColor=options.topics?.[l.type]?.color||pal[0];
  const color=l.type==='daily'?pal[l.colorBand]:
   l.colorBand===0?topicColor:pal[l.colorBand];
  const wind=(options.reducedMotion?0:Math.sin(clock*.0016+l.phase)*.62);
  // Overlapping shaded foliage builds a canopy instead of emoji confetti.
  if(l.colorBand===1){
   c.save();c.globalAlpha=.10;c.fillStyle='#204f3c';
   c.beginPath();c.ellipse(wx+1,wy+2,size*1.45,size*.95,.3,0,TAU);c.fill();c.restore();
  }
  let type=l.leafType;
  if(l.type==='tech'&&l.colorBand===0)type=4;
  if(l.type==='cosmos'&&l.colorBand===0)type=3;
  if(l.type==='weather'&&l.colorBand===0)type=6;
  if(l.type==='love'&&l.colorBand===0)type=1;
  if(type<0)type=tree.genome.leaf;
  leaf(c,wx+wind,wy,size,type,color,l.angle,1);
 }
 if(count>0){
  // Only a few decorations per tree; talking about coffee shouldn't turn
  // the entire crown into a wall of giant emoji.
  for(const a of geo.ornaments){
   const b=branches[a.parentIndex],step=b.i<fromIndex?1:progress;
   if(step<.85)continue;
   const icon=options.topics?.[a.topic]?.ornament||'✿';
   c.save();c.translate(a.x,a.y);
   if(!options.reducedMotion)c.translate(0,Math.sin(clock*.0014+a.float)*1.4);
   c.font=Math.round(12*a.scale)+'px system-ui, sans-serif';
   c.textAlign='center';c.textBaseline='middle';
   c.shadowColor='#e5fff2';c.shadowBlur=3;c.fillText(icon,0,0);c.restore();
  }
 }
 if(tree.mutations?.length){
  tree.mutations.slice(0,10).forEach((key,i)=>{
   if(!branches.length)return;
   const b=branches[(i*11+5)%branches.length];
   const step=b.i<fromIndex?1:progress;if(step<.6)return;
   const trait=options.mutations?.find(m=>m.key===key);
   if(!trait)return;
   c.save();c.translate(b.end.x,b.end.y-18);
   c.fillStyle='#fff9dbbd';c.beginPath();c.arc(0,0,12,0,TAU);c.fill();
   c.font='16px system-ui';c.textAlign='center';c.textBaseline='middle';
   c.fillText(trait.icon,0,0);c.restore();
  });
 }
 c.restore();
}
root.CrewBotany=Object.freeze({generate,paint,leaf,seeded,modelVersion:2});
})(window);
