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
 const bounds={minX:Math.min(...xVals,-27)-49,maxX:Math.max(...xVals,27)+49,
  minY:Math.min(...yVals,-height)-57,maxY:18};
 return {height,trunk,branches,ornaments,canopy,bounds,profile,palette:palettes[g.palette],
  attractors:availableTargets,modelVersion:4};
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
/* Art V4: authored matte SVG foliage instead of glossy procedural bubbles.
 * Each leaf sprite is composed and shaded by hand, while branch placement,
 * growth and variation remain deterministic from the tree DNA. */
const ART_FILES=[
 'foliage-olive.svg','foliage-sage.svg','foliage-sunlit.svg','foliage-teal.svg',
 'detail-bloom.svg','detail-fruit.svg','detail-star.svg'
];
const spriteBank={};
function loadArtSprites(){
 const ImageClass=root.Image||(typeof Image==='function'?Image:null);
 if(!ImageClass)return;
 for(const name of ART_FILES){
  try{
   const img=new ImageClass();
   spriteBank[name]={image:img,loaded:false,failed:false};
   img.onload=()=>{
    spriteBank[name].loaded=true;
    if(typeof root.dispatchEvent==='function'&&typeof root.Event==='function')
      root.dispatchEvent(new root.Event('crew-tree-art-ready'));
   };
   img.onerror=()=>{spriteBank[name].failed=true;};
   img.src='/crew-tree-lab/art/'+name;
  }catch{spriteBank[name]={image:null,loaded:false,failed:true};}
 }
}
function artReady(name){
 const entry=spriteBank[name];return !!(entry?.image&&entry.image.complete&&entry.image.naturalWidth>0);
}
function artStatus(){
 return {loaded:ART_FILES.filter(artReady),missing:ART_FILES.filter(name=>!artReady(name)),
  allLoaded:ART_FILES.every(artReady),version:4};
}
function paletteSprite(branch,tree){
 const topic=branch.topic||'daily';
 if(topic==='cosmos'||topic==='weather'||topic==='tech')return 'foliage-teal.svg';
 if(topic==='food'||topic==='travel'||topic==='music')return 'foliage-sunlit.svg';
 if(topic==='dream'||topic==='stress')return 'foliage-sage.svg';
 const num=(tree.seed+branch.i*7+tree.genome.leaf*3)>>>0;
 return ['foliage-olive.svg','foliage-sage.svg','foliage-sunlit.svg'][num%3];
}
function makeSceneLayout(bounds,width,height,card=false){
 const left=Math.min(bounds.minX,-42),right=Math.max(bounds.maxX,42);
 const top=bounds.minY,bottom=Math.max(12,bounds.maxY);
 const bw=Math.max(1,right-left),bh=Math.max(1,bottom-top);
 const stageFraction=card?.73:.78;
 const factor=Math.min(width*.86/bw,height*stageFraction/bh,Math.min(width/435,height/470)*1.88);
 const ox=width*.5-(left+right)*.5*factor;
 return {factor,ox,oy:height*.85,bw,bh};
}
function bezierPoint(a,b,c,t){
 const q=1-t;
 return {x:q*q*a.x+2*q*t*b.x+t*t*c.x,y:q*q*a.y+2*q*t*b.y+t*t*c.y};
}
function drawPaintedWood(c,tree,geo){
 const trunk=geo.trunk,n=tree.growth.length;
 if(!trunk.length)return;
 const widthAt=t=>(15+Math.min(n,15)*.57)*Math.pow(1-t,.82)+1.2;
 const normals=[];
 for(let i=0;i<trunk.length;i++){
  const before=trunk[Math.max(0,i-1)],after=trunk[Math.min(trunk.length-1,i+1)];
  const dx=after.x-before.x,dy=after.y-before.y,mag=Math.max(.0001,Math.hypot(dx,dy));
  normals.push({x:-dy/mag,y:dx/mag});
 }
 const wood=c.createLinearGradient(-25,-210,30,0);
 wood.addColorStop(0,'#ae8a67');
 wood.addColorStop(.38,'#927057');
 wood.addColorStop(1,'#624737');
 c.save();c.lineJoin='round';c.lineCap='round';
 c.beginPath();
 for(let i=0;i<trunk.length;i++){
  const t=i/(trunk.length-1),p=trunk[i],nrm=normals[i],w=widthAt(t)*.5;
  if(i===0)c.moveTo(p.x+nrm.x*w,p.y+nrm.y*w);
  else c.lineTo(p.x+nrm.x*w,p.y+nrm.y*w);
 }
 for(let i=trunk.length-1;i>=0;i--){
  const t=i/(trunk.length-1),p=trunk[i],nrm=normals[i],w=widthAt(t)*.5;
  c.lineTo(p.x-nrm.x*w,p.y-nrm.y*w);
 }
 c.closePath();c.fillStyle=wood;c.fill();c.strokeStyle='#5d4739';c.lineWidth=1.25;c.stroke();
 c.strokeStyle='#d9ac83';c.globalAlpha=.42;c.lineWidth=1.8;c.beginPath();
 for(let i=0;i<trunk.length;i++){
  const t=i/(trunk.length-1),p=trunk[i],nrm=normals[i],w=widthAt(t)*.21;
  if(i===0)c.moveTo(p.x+nrm.x*w,p.y+nrm.y*w);
  else c.lineTo(p.x+nrm.x*w,p.y+nrm.y*w);
 }c.stroke();c.globalAlpha=1;
 // Rare delicate bark grains; no repeating horizontal rings.
 const r=seeded(tree.seed^0x5a38df);
 for(let i=0;i<Math.min(15,4+n);i++){
  const t=.1+r()*.72,p=trunk[Math.floor(t*(trunk.length-1))];
  c.strokeStyle=i%2?'#563f325e':'#ead2aa4d';c.lineWidth=.7+r()*.5;
  const dy=5+r()*12;
  c.beginPath();c.moveTo(p.x+(r()-.5)*5,p.y-dy);
  c.quadraticCurveTo(p.x+(r()-.5)*4,p.y-dy*.5,p.x+(r()-.5)*5,p.y);
  c.stroke();
 }
 // Organic roots connect into soil and don't resemble a tripod.
 c.strokeStyle='#795942';c.lineWidth=5;c.beginPath();
 c.moveTo(trunk[0].x-3,-2);c.quadraticCurveTo(-15,6,-27,7);
 c.moveTo(trunk[0].x+3,-2);c.quadraticCurveTo(16,5,28,8);c.stroke();
 c.restore();
}
function drawPaintedBranch(c,b,progress){
 if(progress<=0)return;
 const steps=9,max=Math.max(1,Math.round(steps*progress)),left=[],right=[];
 for(let i=0;i<=max;i++){
  const t=Math.min(progress,i/steps);
  const p=bezierPoint(b.start,b.p1,b.end,t),q=bezierPoint(b.start,b.p1,b.end,Math.min(.999,t+.01));
  const dx=q.x-p.x,dy=q.y-p.y,mag=Math.max(.001,Math.hypot(dx,dy));
  const w=Math.max(.65,b.width*(1-t*.87))*.5;
  const norm={x:-dy/mag,y:dx/mag};
  left.push({x:p.x+norm.x*w,y:p.y+norm.y*w});
  right.push({x:p.x-norm.x*w,y:p.y-norm.y*w});
 }
 c.beginPath();for(let i=0;i<left.length;i++){
  if(i===0)c.moveTo(left[i].x,left[i].y);else c.lineTo(left[i].x,left[i].y);
 }
 for(let i=right.length-1;i>=0;i--)c.lineTo(right[i].x,right[i].y);
 c.closePath();c.fillStyle=b.generation>=2?'#81624a':'#866248';
 c.fill();
 c.strokeStyle='#674a38';c.lineWidth=.56;c.stroke();
}
function drawFallbackLeaves(c,seed,x,y,w,h,alpha){
 // Natural pointed fallback rather than the old bubble renderer.
 const r=seeded(seed);
 c.save();c.globalAlpha*=alpha;
 for(let i=0;i<12;i++){
  const a=i*2.3999632+r()*.6;
  const radius=(.15+r()*.36)*w,xx=x+Math.cos(a)*radius*.75,yy=y+Math.sin(a)*radius*.5-h*.4;
  leaf(c,xx,yy,3+r()*6,i%3,'#6f9c75',a,.85);
 }c.restore();
}
function drawSprig(c,name,x,y,width,age,seed,alpha=1,dark=false){
 const img=spriteBank[name]?.image,ratio=.84;
 const w=width*age,h=w*ratio;
 if(w<=1)return;
 c.save();c.globalAlpha*=alpha;
 if(artReady(name)){
  // Twig base in the original transparent SVG sits near (120, 190).
  // Align that base with the actual procedurally grown branch endpoint.
  if(dark)c.filter='brightness(.80) saturate(.85)';
  const flip=((seed>>>3)&1)?-1:1;
  c.translate(x,y);c.scale(flip,1);
  c.drawImage(img,-w*.48,-h*.91,w,h);
  c.filter='none';
 }else{
  drawFallbackLeaves(c,seed,x,y,w,h,1);
 }
 c.restore();
}
function decorationKind(topic){
 if(topic==='food'||topic==='travel')return 'detail-fruit.svg';
 if(topic==='cosmos'||topic==='tech'||topic==='music'||topic==='dream')return 'detail-star.svg';
 return 'detail-bloom.svg';
}
function paint(c,tree,geo,ox,oy,factor,clock,options={}){
 const count=tree.growth.length,branches=geo.branches;
 const fromIndex=Number.isFinite(options.revealFrom)?options.revealFrom:branches.length;
 const progress=options.reducedMotion?1:C(Number.isFinite(options.progress)?options.progress:1,0,1);
 const stageScale=count<3?.71:count<6?.86:count<10?1:1.10;
 const stride=count<5?2:count<11?2:3;
 const visibleBranches=branches.filter(b=>b.i%stride===0||(b.generation>=3&&b.i%5===1));
 c.save();c.translate(ox,oy);c.scale(factor,factor);
 c.lineCap='round';c.lineJoin='round';
 // The ground is deliberately quiet: botanical silhouette remains the focus.
 c.save();c.globalAlpha=.20;c.fillStyle='#234332';c.beginPath();
 c.ellipse(0,5,Math.min(62,32+count*1.35),9,0,0,TAU);c.fill();c.restore();
 // Depth layer: a few distant muted leaf sprigs peek through the branches.
 for(const b of visibleBranches){
  if(b.i%3!==0||count===0)continue;
  const p=b.i<fromIndex?1:progress;if(p<=0)continue;
  drawSprig(c,paletteSprite(b,tree),b.end.x-4,b.end.y-3,
    (70+Math.min(count,13)*1.2)*stageScale,p,tree.seed^Math.imul(b.i+1,67),.65,true);
 }
 drawPaintedWood(c,tree,geo);
 for(const b of branches){
  const p=b.i<fromIndex?1:progress;
  drawPaintedBranch(c,b,p);
 }
 if(count>0){
  // Curated clusters replace all 3.0 sphere lobes. Sparse enough to reveal
  // natural gaps but overlap to form a readable canopy silhouette.
  for(const b of visibleBranches){
   const p=b.i<fromIndex?1:progress;if(p<=0)continue;
   const r=seeded(tree.seed^Math.imul(b.i+1,0x3dca13a7));
   const sway=options.reducedMotion?0:Math.sin((clock||0)*.001+b.i*.73)*.50;
   const w=(81+Math.min(count,13)*1.5)*(b.generation===1?.98:.90)*stageScale*(.91+r()*.17);
   const x=b.end.x+(r()-.5)*8+sway,y=b.end.y+(r()-.5)*5;
   drawSprig(c,paletteSprite(b,tree),x,y,w,p,tree.seed^Math.imul(b.i+1,97),.97);
  }
 }
 // Special ornaments are designed SVG motifs, not raw emoji pasted to leaves.
 const mutationBranches=branches.filter(b=>b.i%4===2);
 for(let i=0;i<Math.min(5,tree.mutations?.length||0);i++){
  const key=tree.mutations[i],trait=options.mutations?.find(m=>m.key===key);
  const b=mutationBranches[(i*5+tree.seed)%Math.max(1,mutationBranches.length)];
  if(!b||!trait)continue;
  const p=b.i<fromIndex?1:progress;if(p<.73)continue;
  const kind=decorationKind(b.topic==='daily'?(
    ['sugar','bubbles'].includes(key)?'food':['starlight','circuit','moon','song'].includes(key)?'cosmos':'love'
  ):b.topic);
  drawSprig(c,kind,b.end.x+9,b.end.y+4,42,p,tree.seed^i*.29,1);
 }
 if(count>=8){
  // A single tiny intentional bloom makes the tree feel magical at maturity.
  const b=branches[Math.min(branches.length-1,Math.floor(branches.length*.69))];
  if(b)drawSprig(c,'detail-bloom.svg',b.end.x-13,b.end.y+8,29,1,tree.seed^61,.92);
 }
 c.restore();
}
root.CrewBotany=Object.freeze({generate,paint,leaf,seeded,modelVersion:4,loadArtSprites,artStatus,makeSceneLayout});
loadArtSprites();
})(window);
