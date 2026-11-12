/* Crew Tree Art V5 — independent, seeded botanical morphologies.
 * One event generates three stable attached branches. Earlier event coordinates
 * never depend on the number of later events: growth is additive, not a reroll.
 * All artwork in this module is original vector paint on Canvas 2D.
 */
(function(root){
'use strict';
const PI=Math.PI,TAU=PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const FAMILIES=['round','tall','weeping','twin'];
const LABELS={round:'圓冠魔法樹',tall:'高瘦月光樹',weeping:'垂枝微風樹',twin:'雙生分岔樹'};
const SPREAD={round:1,tall:.41,weeping:1.2,twin:1.08};
const PALETTES={
 round:['#466e53','#6f9870','#a7bc86','#d6d5a1'],
 tall:['#345a64','#4f8387','#88a8a2','#cad1ad'],
 weeping:['#527b6c','#74a394','#a9c7ac','#c6d6b8'],
 twin:['#5e7868','#80a18b','#b3b99c','#e0c9a2']
};
function rng(seed){let a=seed>>>0;return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function familyOf(tree){const f=tree.genome?.treeFamily;return FAMILIES.includes(f)?f:'round';}
function variantOf(tree){return tree.genome?.crownVariant===1?1:0;}
function trunkPoint(f,age,side=1,seed=0){
 const r=rng(seed^0x439ae10e),bias=(r()-.5)*14;
 if(f==='round')return {x:bias*age/18+Math.sin(age*.31)*2.5,y:-38-age*11.8};
 if(f==='tall')return {x:Math.sin(age*.35)*3+bias*.28,y:-35-age*18};
 if(f==='weeping')return {x:Math.sin(age*.28)*3+bias*.24,y:-38-age*13.1};
 return {x:side*(14+Math.max(0,age-2)*3.0)+bias*.13,y:-34-age*12.8};
}
function outline(f,age,variant,side,r){
 const t=clamp(age/17,0,1);
 if(f==='round'){
  const sign=side,arc=variant?0.86:1;
  return {x:sign*(29+Math.sin(t*PI)*104*arc+r()*26),y:-74-t*155+((r()-.5)*27)+(variant?Math.sin(age*1.5)*15:0)};
 }
 if(f==='tall')return {x:side*(15+r()*44+(variant?Math.sin(age*1.8)*8:0)),
  y:-70-age*17.2-(r()*24)};
 if(f==='weeping'){
  // Main limbs form an umbrella; fine daughter stems hang below them.
  const shoulder=(variant?112:143)+(r()-.5)*19;
  return {x:side*(38+shoulder*(.50+.5*Math.sin(t*PI*.9))),
   y:-160-age*4.6+(variant?Math.sin(age*.9)*27:0)+(r()-.5)*14};
 }
 const separate=variant?117:100;
 return {x:side*(separate+Math.sin(t*PI)*34+r()*18),
  y:-100-age*8.7+(variant?(side===1?-17:17):0)+(r()-.5)*21};
}
function generate(tree){
 const f=familyOf(tree),variant=variantOf(tree),seed=tree.seed>>>0,n=(tree.growth||[]).length;
 const r=rng(seed^0x18a443),limbs=[],canopy=[],ornaments=[],trunks=[];
 const young=Math.max(1,n);
 const trunkMax=f==='tall'?young*18+49:f==='weeping'?young*13.1+46:young*12+51;
 function pushTrunk(pts,side){trunks.push({points:pts,side});}
 if(f==='twin'){
  pushTrunk([{x:0,y:5},{x:1,y:-20},{x:0,y:-51}],0);
  for(const side of [-1,1]){
   const pts=[{x:0,y:-49}];
   for(let i=2;i<=Math.max(3,n+2);i++)pts.push(trunkPoint(f,i,side,seed));
   pushTrunk(pts,side);
  }
 }else{
  const pts=[{x:0,y:5}];
  for(let i=0;i<=Math.max(2,n+1);i++)pts.push(trunkPoint(f,i,1,seed));
  pushTrunk(pts,0);
 }
 for(let age=0;age<n;age++){
  const turn=tree.growth[age]||{},rr=rng(seed^Math.imul(age+1,0x45d9f3b)),topic=turn.topic||'daily';
  const side=(age%2?1:-1),stem=trunkPoint(f,age+1,side,seed);
  const anchor=f==='twin'?trunkPoint(f,age+2,side,seed):stem;
  const target=outline(f,age+1,variant,side,rr);
  const positive=(turn.mood||0)*5,energy=clamp(Number(turn.energy)||.5,0,1);
  target.x+=side*(energy*10+positive);
  if(topic==='travel')target.x+=side*13;
  if(topic==='cosmos')target.y-=12;
  if(topic==='weather')target.y+=9;
  const start={x:anchor.x,y:anchor.y};
  let control={x:lerp(start.x,target.x,.52),y:Math.min(start.y,target.y)-26};
  if(f==='tall')control={x:lerp(start.x,target.x,.28),y:start.y-35};
  if(f==='weeping')control={x:lerp(start.x,target.x,.60),y:Math.min(start.y,target.y)-30};
  if(f==='twin')control={x:lerp(start.x,target.x,.56),y:Math.min(start.y,target.y)-19};
  const primary={i:age*3,age,topic,start,p1:control,end:target,width:f==='tall'?3.8:5.5,
   parentIndex:-1,generation:1,side,downward:false};
  limbs.push(primary);
  for(let k=1;k<=2;k++){
   const start={x:target.x,y:target.y};
   let end={x:start.x+side*(12+rr()*22),y:start.y-(8+rr()*30)};
   if(f==='tall')end={x:start.x+side*(2+rr()*9),y:start.y-18-rr()*34};
   if(f==='weeping')end={x:start.x+side*(4+rr()*14),y:start.y+40+rr()*47+(variant?13:0)};
   if(f==='twin')end={x:start.x+side*(12+rr()*19),y:start.y-(7+rr()*18)};
   const p1={x:lerp(start.x,end.x,f==='weeping'?.2:.5)+side*(f==='weeping'?0:3),
    y:f==='weeping'?start.y+10:Math.min(start.y,end.y)-8};
   limbs.push({i:age*3+k,age,topic,start,p1,end,width:1.85,parentIndex:age*3,
    generation:2,side,downward:f==='weeping'});
  }
  for(let k=0;k<6;k++){
   const p=limbs[age*3+(k%3)].end,az=k*2.399963+rr()*.37;
   const rx=f==='tall'?13:f==='weeping'?18:f==='twin'?18:23;
   const ry=f==='tall'?22:f==='weeping'?14:18;
   const x=p.x+Math.cos(az)*rx*(.3+rr()*.7),y=p.y+Math.sin(az)*ry*(.3+rr()*.7);
   canopy.push({x,y,r:5+rr()*7,parentIndex:age*3+(k%3),topic,colorBand:k%3,phase:rr()*TAU});
  }
  ornaments.push({x:limbs[age*3+2].end.x,y:limbs[age*3+2].end.y,topic,parentIndex:age*3+2});
 }
 const xs=[-36,36],ys=[8,-trunkMax];
 for(const t of trunks)for(const p of t.points){xs.push(p.x);ys.push(p.y);}
 for(const b of limbs){xs.push(b.start.x,b.end.x,b.p1.x);ys.push(b.start.y,b.end.y,b.p1.y);}
 for(const p of canopy){xs.push(p.x-17,p.x+17);ys.push(p.y-19,p.y+19);}
 // Conservative bounds cover painted sprigs and hanging flower stems.
 const bounds={minX:Math.min(...xs)-38,maxX:Math.max(...xs)+38,
  minY:Math.min(...ys)-38,maxY:16};
 const trunk=trunks[0].points;
 return {height:trunkMax,trunk,trunks,branches:limbs,canopy,ornaments,bounds,
  profile:{height:f==='tall'?1.45:1,spread:SPREAD[f]},palette:PALETTES[f],
  family:f,crownVariant:variant,modelVersion:5,
  metrics:{primaryTrunks:f==='twin'?2:1,downwardBranches:limbs.filter(x=>x.downward).length,
   crownWidth:Math.max(...xs)-Math.min(...xs),height:trunkMax}};
}
function layout(bounds,width,height,card=false){
 const bw=bounds.maxX-bounds.minX,bh=bounds.maxY-bounds.minY;
 const scale=Math.min(width*.90/Math.max(1,bw),height*(card?.68:.75)/Math.max(1,bh),1.75);
 return {factor:scale,ox:width/2-(bounds.minX+bw/2)*scale,oy:height*.83};
}
function Q(c,a,b,d){c.moveTo(a.x,a.y);c.quadraticCurveTo(b.x,b.y,d.x,d.y);}
function drawLine(c,points,width,color,light){
 if(points.length<2)return;
 c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.beginPath();
 c.moveTo(points[0].x,points[0].y);
 for(let k=1;k<points.length;k++)c.lineTo(points[k].x,points[k].y);
 c.stroke();
 if(width>3){c.globalAlpha=.43;c.strokeStyle=light;c.lineWidth=Math.max(.55,width*.13);
 c.beginPath();c.moveTo(points[0].x-2,points[0].y);
 for(let k=1;k<points.length;k++)c.lineTo(points[k].x-2,points[k].y);
 c.stroke();c.globalAlpha=1;}
}
function leaf(c,x,y,size,rotation,family,color,light){
 c.save();c.translate(x,y);c.rotate(rotation);
 c.fillStyle=color;c.strokeStyle='#334e414c';c.lineWidth=.7;
 c.beginPath();
 if(family==='tall'){
  c.moveTo(0,-size*1.55);c.bezierCurveTo(size*.72,-size*.8,size*.58,size*.9,0,size*.95);
  c.bezierCurveTo(-size*.58,size*.9,-size*.72,-size*.8,0,-size*1.55);
 }else if(family==='weeping'){
  c.moveTo(0,-size*1.25);c.bezierCurveTo(size*.65,-size*.55,size*.45,size*.65,0,size*1.45);
  c.bezierCurveTo(-size*.45,size*.65,-size*.65,-size*.55,0,-size*1.25);
 }else if(family==='twin'){
  c.moveTo(0,-size);c.bezierCurveTo(size*1.0,-size*.8,size*.90,size*.8,0,size*1.15);
  c.bezierCurveTo(-size*.9,size*.8,-size*1,-size*.8,0,-size);
 }else{
  c.moveTo(0,-size);c.bezierCurveTo(size*1.2,-size*1.0,size*1.2,size*.45,0,size*1.1);
  c.bezierCurveTo(-size*1.2,size*.45,-size*1.2,-size,0,-size);
 }
 c.closePath();c.fill();c.stroke();c.strokeStyle=light;c.lineWidth=.75;
 c.beginPath();c.moveTo(0,size*.7);c.quadraticCurveTo(-size*.15,0,0,-size*.74);c.stroke();
 c.restore();
}
function paintWood(c,geo,seed){
 const f=geo.family,wood='#70513f',light='#c6a17b';
 for(const t of geo.trunks){
  const base=f==='round'?17:f==='tall'?9:f==='weeping'?13:13;
  drawLine(c,t.points,base,wood,light);
  drawLine(c,t.points,Math.max(1,base*.35),'#8c674c','#d1ac86');
  const r=rng(seed^((t.side+2)*47));
  for(let i=2;i<t.points.length-2;i+=2){
   const p=t.points[i];c.strokeStyle=i%4?'#4c3d32b0':'#dbb78a7a';c.lineWidth=.8;
   c.beginPath();c.moveTo(p.x+(r()-.5)*base*.4,p.y-8);
   c.quadraticCurveTo(p.x+(r()-.5)*base*.5,p.y-2,p.x+(r()-.5)*base*.4,p.y+7);c.stroke();
  }
 }
 c.strokeStyle='#795d48';c.lineWidth=3;c.beginPath();c.moveTo(-5,0);c.quadraticCurveTo(-16,7,-24,8);
 c.moveTo(5,0);c.quadraticCurveTo(15,7,23,8);c.stroke();
}
function branch(c,b,progress){
 if(progress<=0)return;
 const t=clamp(progress,0,1);
 const end={x:lerp(b.start.x,b.end.x,t),y:lerp(b.start.y,b.end.y,t)};
 c.beginPath();c.moveTo(b.start.x,b.start.y);
 c.quadraticCurveTo(lerp(b.start.x,b.p1.x,t),lerp(b.start.y,b.p1.y,t),end.x,end.y);
 c.strokeStyle=b.generation===1?'#765640':'#886950';
 c.lineWidth=b.width;c.lineCap='round';c.stroke();
 if(b.generation===1){c.beginPath();c.moveTo(b.start.x-1.3,b.start.y);
  c.quadraticCurveTo(b.p1.x-2,b.p1.y,end.x-1.3,end.y);
  c.strokeStyle='#cfb08599';c.lineWidth=.8;c.stroke();}
}
function sprig(c,b,seed,family,palette,variant,progress,back=false){
 if(progress<=0)return;
 const r=rng(seed^Math.imul(b.i+1,0x9e3779b1)),s=clamp(progress,0,1);
 const tip={x:lerp(b.start.x,b.end.x,s),y:lerp(b.start.y,b.end.y,s)};
 if(b.generation===1&&family==='weeping')return;
 const count=family==='tall'?8:family==='weeping'?9:family==='round'?11:10;
 c.save();c.globalAlpha=back?.68:.98;
 for(let k=0;k<count;k++){
  const theta=k*2.39996+r()*.38;
  const radius=family==='tall'?18:family==='weeping'?23:family==='round'?27:24;
  const x=tip.x+Math.cos(theta)*(radius*(.36+r()*.65));
  const y=tip.y+Math.sin(theta)*(radius*(.35+r()*.65));
  const size=(family==='tall'?8.6:family==='weeping'?8.0:family==='round'?9.6:9.1)*(0.76+r()*.42);
  // Filament visibly joins the leaf to its source twig, including rear leaves.
  c.strokeStyle='#68826c';c.lineWidth=.75;c.beginPath();c.moveTo(tip.x,tip.y);
  c.quadraticCurveTo(lerp(tip.x,x,.55),lerp(tip.y,y,.43)-5,x,y);c.stroke();
  leaf(c,x,y,size,theta+PI/2+(family==='weeping'?.3:0),family,
   palette[(k+(back?0:1)+variant)%palette.length],palette[3]);
 }
 c.restore();
}
function feature(c,b,topic,family,palette,progress,seed){
 if(progress<.95||topic==='daily'||topic==='nature'||topic==='play'||topic==='animals'||topic==='stress'||topic==='dream')return;
 const p=b.end,rand=rng(seed^b.i),offset=family==='tall'?-9:family==='weeping'?15:-5;
 const x=p.x+((b.side||1)*(3+rand()*5)),y=p.y+offset;
 const accent={tech:'#96d8c8',cosmos:'#ebdda5',food:'#ead0a3',music:'#c5d4a2',love:'#e7b4ad',weather:'#adc6dc',travel:'#cfbfa4'}[topic];
 if(!accent)return;
 c.save();c.strokeStyle='#64816d';c.lineWidth=1;c.beginPath();c.moveTo(p.x,p.y);
 c.quadraticCurveTo(x,y-8,x,y);c.stroke();c.fillStyle=accent;c.strokeStyle='#68816b';
 c.lineWidth=.7;
 if(topic==='music'){ // bell-flower with narrow calyx, attached by a pedicel
  c.beginPath();c.moveTo(x-4,y);c.quadraticCurveTo(x-4,y+10,x-7,y+11);
  c.quadraticCurveTo(x,y+17,x+7,y+11);c.quadraticCurveTo(x+4,y+10,x+4,y);
  c.closePath();c.fill();c.stroke();
 }else if(topic==='love'){
  leaf(c,x,y+3,5,-.25,'round',accent,'#fff6d8');
 }else if(topic==='weather'){
  c.beginPath();c.moveTo(x,y-7);c.quadraticCurveTo(x+9,y+4,x,y+9);
  c.quadraticCurveTo(x-9,y+4,x,y-7);c.fill();c.stroke();
 }else if(topic==='cosmos'){
  c.beginPath();for(let i=0;i<10;i++){const a=i*PI/5-PI/2,z=i%2?3:7;
   if(!i)c.moveTo(x+Math.cos(a)*z,y+Math.sin(a)*z);
   else c.lineTo(x+Math.cos(a)*z,y+Math.sin(a)*z);}
  c.closePath();c.fill();c.stroke();
 }else if(topic==='tech'){
  c.beginPath();c.ellipse(x,y,5,7,0,0,TAU);c.fill();
  c.strokeStyle='#468d85';c.lineWidth=.7;c.beginPath();c.moveTo(x-3,y-3);c.lineTo(x,y);c.lineTo(x+3,y+3);
  c.moveTo(x,y);c.lineTo(x+2,y-5);c.stroke();
 }else if(topic==='travel'){
  leaf(c,x,y,5,-.8,'tall',accent,'#fff0c7');
 }else{
  c.beginPath();c.ellipse(x,y,6,7,0,0,TAU);c.fill();c.stroke();
  c.fillStyle='#fff2d3';c.beginPath();c.ellipse(x-2,y-2,2,2,0,0,TAU);c.fill();
 }
 c.restore();
}
const motifs={};
function loadMotifs(){
 const ImageCtor=root.Image||(typeof Image!=='undefined'?Image:null);
 if(!ImageCtor)return;
 for(const f of FAMILIES){
  const img=new ImageCtor();motifs[f]=img;
  img.onload=()=>{if(typeof root.dispatchEvent==='function'&&typeof root.Event==='function')
    root.dispatchEvent(new root.Event('crew-tree-art-ready'));};
  img.onerror=()=>{};img.src='/crew-tree-lab/art/v5-'+f+'-sprig.svg';
 }
}
function assetStatus(){
 const loaded=FAMILIES.filter(f=>motifs[f]?.complete&&motifs[f]?.naturalWidth>0);
 return {version:5,loaded,missing:FAMILIES.filter(f=>!loaded.includes(f)),allLoaded:loaded.length===4};
}
function paint(c,tree,geo,ox,oy,scale,clock,opts={}){
 const f=geo.family,n=tree.growth.length,palette=PALETTES[f],variant=geo.crownVariant;
 const from=Number.isFinite(opts.revealFrom)?opts.revealFrom:geo.branches.length;
 const progress=opts.reducedMotion?1:clamp(Number.isFinite(opts.progress)?opts.progress:1,0,1);
 c.save();c.translate(ox,oy);c.scale(scale,scale);c.lineCap='round';c.lineJoin='round';
 c.fillStyle='#2e52432c';c.beginPath();c.ellipse(0,5,48+n,8,0,0,TAU);c.fill();
 const selected=geo.branches.filter(b=>b.generation===2&&b.i%3!==0);
 for(const b of selected){const p=b.i<from?1:progress;
  if(p>0)sprig(c,b,tree.seed,f,palette,variant,p,true);}
 // Transparent authored botanical plates attach to first-generation limb tips.
 // The fully procedural leaves below remain available for offline asset failures.
 const img=motifs[f];
 if(img?.complete&&img.naturalWidth>0)for(const b of geo.branches){
  if(b.generation!==1)continue;
  const p=b.i<from?1:progress;if(p<=0)continue;
  const width=f==='tall'?72:f==='round'?108:f==='weeping'?94:92;
  const ht=width*(f==='tall'?1.45:1.22);
  c.save();c.globalAlpha=.66*p;c.drawImage(img,b.end.x-width*.52,b.end.y-ht*.68,width,ht);c.restore();
 }
 paintWood(c,geo,tree.seed);
 for(const b of geo.branches){const p=b.i<from?1:progress;branch(c,b,p);}
 for(const b of selected){const p=b.i<from?1:progress;if(p>0)sprig(c,b,tree.seed,f,palette,variant,p);}
 // Only one botanically attached accent per spoken event, never floating emoji.
 for(const b of geo.branches){if(b.i%3!==2)continue;
  const p=b.i<from?1:progress;
  feature(c,b,b.topic,f,palette,p,tree.seed);
 }
 c.restore();
}
root.CrewTreeV5=Object.freeze({generate,paint,layout,families:FAMILIES.slice(),labels:LABELS,modelVersion:5,assetStatus});
loadMotifs();
})(window);
