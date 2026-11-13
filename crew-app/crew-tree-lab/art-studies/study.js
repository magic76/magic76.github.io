/* Crew Tree fantasy art proof of concept.
 * All plates are Crew-original hand-authored SVG. Two independent morphology
 * solvers share only a seeded event interface, not their silhouette logic.
 * p5.brush and Rigby2D remain offline authoring investigations; this preview
 * deliberately uses the same lightweight Canvas 2D path as the existing game.
 */
(()=>{'use strict';
const W=800,H=820,$=id=>document.getElementById(id),TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function rng(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const FILES=['floating-island.svg','island-crown.svg','jelly-canopy.svg','lantern-bud.svg',
 'crown-spiral.svg','crown-willow.svg','crown-lantern.svg','crown-moon.svg','jelly-inner-membrane.svg','spiral-leaf-tiers.svg'],images=new Map();
const state={scene:'island',stage:16,topic:'cosmos',seed:103,turns:16,growth:null,reaction:null,paused:false,silhouette:false,reduced:!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches};
let last=0,visible=true;
function load(){
 const ImageCtor=window.Image;
 if(!ImageCtor)return;
 for(const name of FILES){
  const im=new ImageCtor();images.set(name,im);
  im.onload=()=>{refreshStatic();if(state.reduced||state.paused)drawMain(0);updateStatus();};
  im.onerror=()=>{updateStatus();};
  im.src='./assets/'+name;
 }
}
function ready(name){const img=images.get(name);return !!(img?.complete&&img.naturalWidth>0);}
function art(c,name,x,y,w,h){
 if(ready(name)){c.drawImage(images.get(name),x,y,w,h);return;}
 c.fillStyle=name.includes('jelly')?'#9fb5ba':name.includes('island')?'#83a99a':'#b3bfac';
 c.beginPath();c.ellipse(x+w/2,y+h/2,w*.4,h*.3,0,0,TAU);c.fill();
}
function sceneModel(scene=state.scene,stage=state.stage,seed=state.seed,topic=state.topic){
 const r=rng(seed^0x85b4a);const phase=(seed%19)*.31;
 if(scene==='island'){
  const units=[
   {id:'core',x:397+(r()-.5)*26,y:558+(r()-.5)*15,w:395,lean:(r()-.5)*.05},
   {id:'west',x:152+(r()-.5)*33,y:380+(r()-.5)*30,w:237,lean:(r()-.5)*.10},
   {id:'east',x:659+(r()-.5)*31,y:412+(r()-.5)*32,w:237,lean:(r()-.5)*.10},
   {id:'upper',x:467+(r()-.5)*42,y:200+(r()-.5)*29,w:176,lean:(r()-.5)*.11}
  ];
  const count=stage<=3?1:stage<=8?2:4;
  const species=['spiral','weeping','lantern-fruit','crescent'];
  units.forEach((u,i)=>{u.species=species[i];});
  return {scene,stage,seed,topic,phase,units:units.slice(0,count),
   silhouette:{mainIslandScale:stage<=3?.44:stage<=8?.82:1,
    crownScale:stage<=3?0:stage<=8?.72:1,distinctSpecies:count},
   lifeStage:stage<=3?'seedling':stage<=8?'sapling':'mature',
   attachment:stage>=8?{cosmos:'moon-isle',warmth:'living-bridge',music:'chime-garden',travel:'winged-island'}[topic]:null,
   bones:[],unitCount:count+(stage>=8?1:0)};
 }
 const count=stage<=3?6:stage<=8?11:19;
 const arms=Array.from({length:count},(_,i)=>{
  const q=rng(seed^Math.imul(i+1,0x4efc923));
  const positions=[.50,.26,.74,.12,.88,.39,.61,.04,.96,.19,.81,.32,.68,.45,.55,.08,.92,.36,.64];
  const t=positions[i];
  return {id:'arm-'+i,baseX:210+t*376,baseY:398-Math.sin(t*Math.PI)*29,side:(t-.5)*2,
   length:180+q()*105,bend:(q()-.5)*57,phase:q()*TAU,
   delay:Math.floor(q()*1600),thickness:2.7+q()*3.8};
 });
 return {scene,stage,seed,topic,phase,arms,
  silhouette:{domeWidth:stage<=3?136:stage<=8?365:555,twistStrands:stage<=3?0:stage<=8?4:6,
   secondaryCanopy:stage>=16?1:0},lifeStage:stage<=3?'hatchling':stage<=8?'juvenile':'mature',attachment:topic==='music'?'chime-buds':topic==='travel'?'wing-fins':topic==='warmth'?'heart-calyx':'star-nectar',unitCount:arms.length,bones:arms};
}
function backdrop(c,scene,seed){
 const g=c.createLinearGradient(0,0,0,H);
 if(scene==='island'){g.addColorStop(0,'#b9d9d3');g.addColorStop(.42,'#e1ebdc');g.addColorStop(.79,'#eee6d1');g.addColorStop(1,'#e3d2c2');}
 else{g.addColorStop(0,'#acc8c7');g.addColorStop(.44,'#d8ddd4');g.addColorStop(.83,'#eee2d0');g.addColorStop(1,'#b6c9b4');}
 c.fillStyle=g;c.fillRect(0,0,W,H);
 const sun=c.createRadialGradient(scene==='island'?170:570,195,10,scene==='island'?170:570,195,340);
 sun.addColorStop(0,'#fff7d5b3');sun.addColorStop(.4,'#f7f0d256');sun.addColorStop(1,'#fff1d100');
 c.fillStyle=sun;c.fillRect(0,0,W,H);
 const r=rng(seed^0x451c4);c.save();
 for(let i=0;i<50;i++){const x=r()*W,y=r()*750,rr=.7+r()*2.6;
  c.fillStyle=i%3===0?'#fff4dd8c':'#f6eed659';c.beginPath();c.ellipse(x,y,rr*1.5,rr*.65,0,0,TAU);c.fill();
 }
 c.globalAlpha=.30;c.fillStyle='#a9c9bd';c.beginPath();c.moveTo(-50,701);
 c.bezierCurveTo(132,641,205,719,348,681);c.bezierCurveTo(504,629,621,678,850,642);
 c.lineTo(W,H);c.lineTo(0,H);c.fill();
 c.globalAlpha=.32;c.fillStyle=scene==='island'?'#f3eddf':'#abc7bb';c.beginPath();c.moveTo(-50,764);
 c.bezierCurveTo(210,725,305,775,496,742);c.bezierCurveTo(650,714,720,747,850,708);
 c.lineTo(W,H);c.lineTo(0,H);c.fill();c.restore();
}
function delicateLine(c,points,color,width=2){
 c.beginPath();c.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)c.lineTo(points[i][0],points[i][1]);
 c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();
}
function vineBridge(c,a,b,topic){
 const x1=a.x+a.w*.23,y1=a.y-a.w*.07,x2=b.x-b.w*.23,y2=b.y-b.w*.07;
 c.save();c.strokeStyle='#647a7199';c.lineWidth=3.2;c.beginPath();c.moveTo(x1,y1);
 c.bezierCurveTo((x1+x2)*.45,y1+45,(x1+x2)*.55,y2+43,x2,y2);c.stroke();
 c.strokeStyle='#e9daa7bd';c.lineWidth=1.2;c.beginPath();c.moveTo(x1,y1+5);
 c.bezierCurveTo((x1+x2)*.45,y1+50,(x1+x2)*.55,y2+49,x2,y2+4);c.stroke();
 for(let k=1;k<=8;k++){const t=k/9,x=x1+(x2-x1)*t,y=y1+(y2-y1)*t+Math.sin(t*Math.PI)*29;
  c.strokeStyle='#6f9781a6';c.lineWidth=1.5;c.beginPath();c.moveTo(x,y);c.lineTo(x+7,y+7);c.stroke();
 }
 c.restore();
}
function leaf(c,x,y,s,rotation,color){
 c.save();c.translate(x,y);c.rotate(rotation);c.fillStyle=color;c.strokeStyle='#567d6c8a';c.lineWidth=1.4;
 c.beginPath();c.moveTo(0,-s);c.bezierCurveTo(s*.95,-s*.80,s*.85,s*.6,0,s*1.1);
 c.bezierCurveTo(-s*.85,s*.6,-s*.95,-s*.8,0,-s);c.fill();c.stroke();
 c.strokeStyle='#f5f0ca8a';c.beginPath();c.moveTo(0,s*.8);c.lineTo(0,-s*.67);c.stroke();c.restore();
}
function charm(c,x,y,topic,scale=1){
 c.save();c.translate(x,y);c.scale(scale,scale);
 if(topic==='cosmos'){
  c.strokeStyle='#7a8f8b';c.lineWidth=2;c.beginPath();c.ellipse(0,0,27,12,-.26,0,TAU);c.stroke();
  c.fillStyle='#eed8ab';c.beginPath();c.arc(0,0,16,0,TAU);c.fill();c.fillStyle='#c4b3b8';c.beginPath();c.arc(-5,4,5,0,TAU);c.fill();
 }else if(topic==='warmth'){
  c.strokeStyle='#a97879';c.lineWidth=5;c.beginPath();c.moveTo(-28,18);c.bezierCurveTo(-49,-20,-17,-40,0,-13);
  c.bezierCurveTo(20,-40,50,-20,27,18);c.stroke();leaf(c,0,-16,14,0,'#e3adb0');
 }else if(topic==='music'){
  for(let i=-1;i<=1;i++){c.strokeStyle='#618980';c.lineWidth=1.5;c.beginPath();c.moveTo(i*19,-18);c.lineTo(i*19,10+i%2*12);c.stroke();
   c.fillStyle='#f0d5a5';c.beginPath();c.arc(i*19,14+i%2*12,5,0,TAU);c.fill();}
 }else{c.strokeStyle='#6e8f8a';c.lineWidth=2;c.beginPath();c.moveTo(-37,12);c.quadraticCurveTo(0,-27,36,12);c.stroke();
  leaf(c,-19,0,17,-.85,'#bdd3b1');leaf(c,19,-2,18,.9,'#b4d3b9');}
 c.restore();
}
function floatUnit(c,u,index,model,time,staticMode){
 window.CrewFantasyPaint.floatUnit(c,u,index,model,time,staticMode,art);
}

function floatScene(c,m,time,staticMode){
 const units=m.units;
 // Filaments connect actual land masses: topics can grow a bridge or a satellite.
 if(units.length>=2)vineBridge(c,units[1],units[0],m.topic);
 if(units.length>=3)vineBridge(c,units[0],units[2],m.topic);
 if(units.length>=4)vineBridge(c,units[3],units[2],m.topic);
 for(let i=units.length-1;i>=0;i--){
  c.save();
  if(m.growthProgress!==undefined){
   const previousCount=m.fromStage<=3?1:m.fromStage<=8?2:4;
   if(i>=previousCount)window.CrewFantasyV5.emergence(c,units[i],i-previousCount+1,m.growthProgress);
   else if(i===0&&m.fromStage<=3){
    const t=window.CrewFantasyV5.ease(m.growthProgress),u=units[i];
    c.translate(u.x,u.y+70*(1-t));c.scale(.7+.3*t,.7+.3*t);c.translate(-u.x,-u.y);
   }
  }
  floatUnit(c,units[i],i,m,time,staticMode);c.restore();
 }
 if(m.attachment){
  // Cosmic conversations sprout a real satellite island, not an unattached icon.
  if(m.topic==='cosmos'){
   const moon={id:'moonling',x:660+(m.seed%7-3)*3,y:234,w:m.stage>=16?116:88,lean:-.13};
   c.save();c.strokeStyle='#77968ba8';c.lineWidth=2;
   c.beginPath();c.moveTo(units[0].x+units[0].w*.29,units[0].y-53);
   c.bezierCurveTo(550,384,602,350,moon.x-40,moon.y-19);c.stroke();c.restore();
   floatUnit(c,moon,5,m,time,staticMode);
  }
  const anchor=units[units.length-1];
  const x=m.topic==='cosmos'?660:m.topic==='travel'?665:m.topic==='music'?580:350;
  const y=m.topic==='cosmos'?190:m.topic==='travel'?185:m.topic==='music'?190:247;
  c.save();c.globalAlpha*=.9;
  charm(c,x,y,m.topic,m.stage>=16?1.05:.83);
  if(m.topic==='warmth'&&units.length>1){
   c.strokeStyle='#cb9e99';c.lineWidth=4;c.beginPath();
   c.moveTo(units[1].x+20,units[1].y-23);
   c.bezierCurveTo(245,245,270,237,units[0].x-50,units[0].y-75);c.stroke();
  }
  if(m.topic==='travel'){
   // Wing-shaped islands leave a trail of wind-blown propagules.
   for(let i=0;i<7;i++)leaf(c,x-61+i*22,y+22+Math.sin(i*1.4)*13,7+(i%3)*3,-.8,'#c1d4b5');
   c.strokeStyle='#7da79aa3';c.lineWidth=2.3;c.beginPath();c.moveTo(x-91,y+38);
   c.quadraticCurveTo(x+10,y-45,x+72,y+16);c.stroke();
  }
  if(m.topic==='music')for(let i=0;i<3;i++)charm(c,units[0].x+75+i*20,units[0].y-140-i*10,'music',.23);
  c.restore();
 }
}
// Stable seeded bone identity; the display scale changes with maturity,
 // not the recorded origin of earlier DNA bones.
function bonePath(c,arm,time,staticMode,topic,stage){
 const scale=stage<=3?.64:stage<=8?.82:1;
 const delay=arm.delay||0;
 const t=staticMode?0:Math.max(0,time-delay);
 const sway=staticMode?0:Math.sin(t*.00124+arm.phase)*18;
 const second=staticMode?0:Math.sin(t*.00185+arm.phase*.68)*10;
 const x=400+(arm.baseX-400)*scale;
 const y=stage<=3?650:stage<=8?483:383;
 const len=arm.length*(stage<=3?.18:stage<=8?.64:1);
 const side=arm.side;
 const b1x=x+side*24+arm.bend*.35*scale+sway*.27,b1y=y+len*.23;
 const b2x=x+side*45+arm.bend*scale+sway*.84,b2y=y+len*.60;
 const ex=x+side*28+arm.bend*.7*scale+sway+second,ey=y+len;
 const grad=c.createLinearGradient(x,y,ex,ey);
 grad.addColorStop(0,'#538e92c9');grad.addColorStop(.61,'#8fc8c1d1');grad.addColorStop(1,'#dbc6bcb8');
 c.strokeStyle=grad;c.lineWidth=arm.thickness*(stage<=3?.68:stage<=8?.85:1);
 c.lineCap='round';c.beginPath();c.moveTo(x,y);
 c.bezierCurveTo(b1x,b1y,b2x,b2y,ex,ey);c.stroke();
 c.strokeStyle='#f9ebcf80';c.lineWidth=1.05;c.beginPath();
 c.moveTo(x+1.8,y+1);c.bezierCurveTo(b1x+2,b1y,b2x+2,b2y,ex+1,ey);c.stroke();
 if(stage>=16&&Math.abs(side)>.35){
  c.strokeStyle='#78b0b3a0';c.lineWidth=1.5;c.beginPath();
  c.moveTo(ex,ey-25);c.quadraticCurveTo(ex+side*18+second*.5,ey-15,ex+side*6,ey+5);c.stroke();
 }
 return {x:ex,y:ey};
}

function jellyScene(c,m,time,staticMode){
 const bob=staticMode?0:Math.sin(time*.00072+m.phase)*5;
 c.save();c.translate(0,bob);
 if(m.stage<=3){
  window.CrewFantasyV4.jellyHatchling(c,m,time,staticMode,art);
  c.restore();return;
 }
 // Every tentacle and living trunk branch belongs BEHIND the bell tissue.
 // Draw all bones first, rather than half on top of the translucent cap.
 const endpoints=[];
 for(const [i,arm] of m.arms.entries()){
  endpoints.push(bonePath(c,arm,time,staticMode,m.topic,m.stage));
 }
 window.CrewFantasyV8.braidedRoots(c,m.stage,m.seed,m.topic,time,staticMode);
 window.CrewFantasyV6.coralRoots(c,m.stage,m.topic,m.seed,time,staticMode);
 // Fewer, grounded lanterns; delayed light follows actual tendril endpoints.
 endpoints.forEach((end,i)=>{
  if(i%4!==0)return;
  const size=m.stage>=16?34:24;
  window.CrewFantasyPaint.lanternLight(c,art,end.x-size*.5,end.y-size*.12,size,i,time,staticMode,m.stage);
 });
 for(let i=0;i<(m.stage>=16?5:3);i++){
  const xx=325+i*35,yy=532-(i%3)*13;
  c.strokeStyle='#669a969a';c.lineWidth=2.5;c.beginPath();c.moveTo(401,568);
  c.quadraticCurveTo(xx+42,yy-43,xx,yy);c.stroke();
  leaf(c,xx,yy,11+(i%3)*2,i*.7,m.topic==='warmth'?'#e7b7b3':'#b9d9bc');
 }
 const capSpec=m.stage>=16?{w:555,h:352,y:121}:{w:365,h:248,y:278};
 c.save();
 if(m.reactionProgress!==undefined)
  window.CrewFantasyV5.capBounce(c,m.reactionProgress,m.stage);
 window.CrewFantasyV5.capOcclusion(c,capSpec);
 const cap=window.CrewFantasyPaint.canopy(c,art,m.stage,time,staticMode,m.seed);
 window.CrewFantasyV6.tintCanopy(c,cap,m.topic,m.stage,time,staticMode);
 window.CrewFantasyV9.bellGlow(c,cap,m.topic,m.stage,time,staticMode);
 window.CrewFantasyV6.bellLeaves(c,cap,m.topic,m.stage,time,staticMode);
 if(m.stage>=16)window.CrewFantasyV4.fishHero(c,cap,time,staticMode,m.seed);
 else window.CrewFantasyV3.fishResident(c,cap,time,staticMode,m.seed,m.stage);
 window.CrewFantasyV8.moonRim(c,'jelly',m.stage,m.topic,time,staticMode);
 window.CrewFantasyV9.rimLights(c,cap,m.topic,m.stage,time,staticMode);
 c.restore();
 if(m.stage>=16){
  c.save();c.globalAlpha*=.78;
  art(c,'jelly-canopy.svg',480,406,133,89);
  art(c,'jelly-inner-membrane.svg',489,420,114,75);c.restore();
  for(let i=0;i<4;i++){
   const bx=510+i*24;
   c.strokeStyle='#76aeadbb';c.lineWidth=2;c.beginPath();c.moveTo(bx,472);
   c.quadraticCurveTo(bx+Math.sin(time*.0007+i)*8,508,bx-4,539+(i%3)*4);c.stroke();
  }
 }
 if(m.attachment){
  const pos=m.topic==='cosmos'?[610,211]:m.topic==='music'?[193,443]:m.topic==='travel'?[638,460]:[205,370];
  c.strokeStyle='#739e9a';c.lineWidth=2;c.beginPath();c.moveTo(405,455);
  c.quadraticCurveTo((pos[0]+405)*.5,pos[1]-25,pos[0],pos[1]+10);c.stroke();
  charm(c,pos[0],pos[1],m.topic,m.stage>=16?1.0:.76);
 }
 c.restore();
}

function paint(canvas,scene,stage,seed,topic,time=0,staticMode=true,silhouette=false,transition=null,reaction=null){
 const bounds=canvas.getBoundingClientRect(),width=Math.max(180,bounds.width||400),height=Math.max(180,bounds.height||420);
 const px=Math.min(2,window.devicePixelRatio||1);
 const cw=Math.round(width*px),ch=Math.round(height*px);
 if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
 const c=canvas.getContext('2d');if(!c)return null;
 c.setTransform(px,0,0,px,0,0);c.clearRect(0,0,width,height);
 const scale=Math.min(width/W,height/H),ox=(width-W*scale)/2,oy=(height-H*scale)/2;
 c.fillStyle=scene==='island'?'#e0e9dc':'#c7dcda';c.fillRect(0,0,width,height);
 c.translate(ox,oy);c.scale(scale,scale);
 const model=sceneModel(scene,stage,seed,topic);
 if(silhouette){c.fillStyle='#faf5e7';c.fillRect(0,0,W,H);}
 else{
  window.CrewFantasyV3.themeBackdrop(c,topic,seed,scene);
  window.CrewFantasyV9.nightSky(c,topic,seed,scene);
  window.CrewFantasyPaint.forest(c,seed,scene);
  window.CrewFantasyV9.distantLayer(c,topic,scene);
  if(topic==='travel')window.CrewFantasyV4.travelSky(c,seed,stage,time,staticMode);
  // Paper pigment belongs on the environment, under the living subject.
  // This prevents V7's gray veil from desaturating the luminous canopy/fish.
  window.CrewFantasyV6.paperWash(c,seed,scene,stage);
  window.CrewFantasyV7.picturebookFinish(c,seed,scene,stage);
  window.CrewFantasyV8.organismHalo(c,model,time,staticMode);
 }
 if(silhouette){c.save();c.filter='brightness(0)';}
 const sceneLayer=(m,opacity=1,grow=null)=>{
  c.save();c.globalAlpha*=opacity;
  if(reaction&&reaction.scene===scene)m.reactionProgress=reaction.progress;
  if(grow&&scene==='jelly')window.CrewFantasyV5.jellyGrowth(c,grow.from,stage,grow.progress);
  if(scene==='island')floatScene(c,m,time,staticMode);
  else jellyScene(c,m,time,staticMode);
  c.restore();
 };
 const p=transition?window.CrewFantasyV5.ease(transition.progress):1;
 if(transition&&transition.from!==stage&&transition.progress<1){
  const previous=sceneModel(scene,transition.from,seed,topic);
  sceneLayer(previous,1-p);
  model.growthProgress=transition.progress;model.fromStage=transition.from;
  sceneLayer(model,p,transition);
 }else if(transition&&transition.pulse&&transition.progress<1){
  c.save();const zoom=1+.025*Math.sin(Math.PI*transition.progress);
  c.translate(400,570);c.scale(zoom,zoom);c.translate(-400,-570);
  sceneLayer(model);c.restore();
 }else sceneLayer(model);
 if(silhouette){c.restore();}
 else{
  c.save();c.globalAlpha*=transition?Math.max(.18,p):1;
  window.CrewFantasyV3.topicAccessories(c,model,time,staticMode);
  if(topic==='travel'&&scene==='island')window.CrewFantasyV4.travelStamp(c,model);
  window.CrewFantasyPaint.life(c,model,time,staticMode);
  c.restore();
  window.CrewFantasyV9.foregroundContrast(c,scene,seed);
  if(transition&&transition.progress<1)
   window.CrewFantasyV5.particles(c,seed,scene,transition.progress,'growth');
  if(reaction&&reaction.scene===scene&&reaction.progress<1)
   window.CrewFantasyV5.reactionOverlay(c,scene,reaction.progress,seed,model);
  window.CrewFantasyPaint.frame(c,scene,seed);
 }
 return model;
}
function drawMain(now){
 const canvas=$('heroCanvas');if(!canvas)return;
 const tick=now||window.performance?.now?.()||0;
 let growth=null,react=null;
 if(state.growth){
  const p=clamp((tick-state.growth.started)/state.growth.duration,0,1);
  if(p>=1)state.growth=null;
  else growth={...state.growth,progress:p};
 }
 if(state.reaction){
  const p=clamp((tick-state.reaction.started)/state.reaction.duration,0,1);
  if(p>=1)state.reaction=null;
  else react={...state.reaction,progress:p};
 }
 paint(canvas,state.scene,state.stage,state.seed,state.topic,tick,state.paused||state.reduced,state.silhouette,growth,react);
}
function refreshStatic(){
 for(const c of document.querySelectorAll('[data-preview]'))
  paint(c,state.scene,Number(c.dataset.preview),state.seed,state.topic,0,true,state.silhouette);
}
function updateStatus(){
 const loaded=FILES.filter(ready).length;
 $('statusText').textContent=loaded===FILES.length?'10 / 10 原創素材已載入':'原創素材 '+loaded+' / 10（缺少時使用備用繪製）';
}
function changeUI(){
 $('artName').textContent=state.scene==='island'?'漂流群島':'水母燈籠樹';
 $('artSub').textContent=state.scene==='island'?'FAMILY 01 / FLOATING ISLES':'FAMILY 02 / JELLY LANTERN';
 $('artDetail').textContent=state.stage===3?'剩下的世界還在等你 · 再聊幾句，看看它會長成什麼樣子。':
  state.scene==='island'?'新聊天會長出獨立浮島、藤橋與植物。':'根莖不動，傘冠與新觸鬚沿骨架生長。';
 $('futureHint').hidden=state.stage!==3;
 $('stageText').textContent=state.turns+' 句 · '+(state.stage===16?'成熟':state.stage===8?'成長':'萌芽');
 $('simulateChatBtn').textContent='模擬新增一句聊天（目前 '+state.turns+' 句）';
 $('unitCount').textContent=String(sceneModel().unitCount).padStart(2,'0');
 $('renderTech').textContent='Canvas 2D';
 for(const [field,key] of [['scene','scene'],['stage','stage'],['topic','topic']])
  document.querySelectorAll('[data-'+field+']').forEach(el=>el.setAttribute('aria-pressed',String(String(state[key])===el.dataset[field])));
 $('freezeBtn').textContent=state.paused?'恢復動態':'暫停動態';
 $('freezeBtn').setAttribute('aria-pressed',String(state.paused));
 $('silhouetteBtn').textContent=state.silhouette?'恢復水彩':'純黑剪影';
 $('silhouetteBtn').setAttribute('aria-pressed',String(state.silhouette));
 refreshStatic();drawMain(0);
}
function beginGrowth(next,pulse=false){
 const previous=state.stage;
 state.reaction=null;
 state.stage=next;
 if(!state.reduced&&!state.paused&&!state.silhouette){
  state.growth={from:previous,to:next,pulse,started:window.performance?.now?.()||0,duration:1250};
 }else state.growth=null;
 changeUI();
}
function triggerReaction(scene){
 if(scene!==state.scene)return;
 state.reaction={scene,started:window.performance?.now?.()||0,duration:920};
 $('reactionStatus').textContent=scene==='island'?'樹洞居民向你揮手！':'水母彈了一下，掉出小光球！';
 drawMain(window.performance?.now?.()||0);
}
function wire(){
 for(const field of ['scene','stage','topic'])
  document.querySelectorAll('[data-'+field+']').forEach(el=>el.addEventListener('click',()=>{
   if(field==='stage'){state.turns=Number(el.dataset.stage);beginGrowth(state.turns);return;}
   state[field]=el.dataset[field];state.growth=null;state.reaction=null;changeUI();
  }));
 $('simulateChatBtn').addEventListener('click',()=>{
  state.turns=Math.min(99,state.turns+1);
  const next=state.turns<8?3:state.turns<16?8:16;
  beginGrowth(next,true);
 });
 const hero=$('heroCanvas');
 hero.addEventListener('pointerdown',ev=>{
  const b=hero.getBoundingClientRect(),scale=Math.min(b.width/W,b.height/H);
  const ox=(b.width-W*scale)/2,oy=(b.height-H*scale)/2;
  const x=(ev.clientX-b.left-ox)/scale,y=(ev.clientY-b.top-oy)/scale;
  if(window.CrewFantasyV5.hitTest(state.scene,state.stage,x,y,sceneModel()))
   triggerReaction(state.scene);
 });
 hero.addEventListener('keydown',ev=>{
  if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();triggerReaction(state.scene);}
 });
 $('seedBtn').addEventListener('click',()=>{
  const n=Number($('seedInput').value);if(!Number.isSafeInteger(n)||n<1||n>999999){
   $('statusText').textContent='Seed 必須是 1～999999 的整數';return;
  }
  state.seed=n;state.growth=null;state.reaction=null;changeUI();
 });
 $('freezeBtn').addEventListener('click',()=>{state.paused=!state.paused;state.growth=null;changeUI();});
 $('silhouetteBtn').addEventListener('click',()=>{state.silhouette=!state.silhouette;state.growth=null;changeUI();});
 window.addEventListener('resize',()=>{refreshStatic();drawMain(0);});
 const mq=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 mq?.addEventListener?.('change',ev=>{state.reduced=ev.matches;if(!state.reduced)requestAnimationFrame(frame);drawMain(0);});
 if(window.IntersectionObserver){
  const obs=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);if(visible)drawMain(0);},{threshold:0.01});
  obs.observe($('heroCanvas'));
 }
}
function frame(now){
 if(state.reduced)return;
 if(now-last>33&&visible&&!state.paused){drawMain(now);last=now;}
 requestAnimationFrame(frame);
}
if(new URLSearchParams(location.search).get('qa')==='1'){
 window.__CREW_STUDIES_QA__={sceneModel,assetStatus:()=>({loaded:FILES.filter(ready),missing:FILES.filter(x=>!ready(x))}),
  state:()=>({...state}),paint:(scene,stage,seed,topic)=>paint($('heroCanvas'),scene,stage,seed,topic,0,true),
  previews:()=>document.querySelectorAll('[data-preview]').length,
  paintAt:(scene,stage,seed,topic,time)=>paint($('heroCanvas'),scene,stage,seed,topic,time,false,false),
  spiralGeometry:(stage=16)=>{const u=sceneModel('island',stage).units[0],w=u.w*(stage===8?.82:1),
    cw=w*.97*(stage===8?.72:1),ch=w*.94*(stage===8?.72:1);
    const ground=u.y-w*.12,top=ground-ch*.95+w*.07;
    return window.CrewFantasyV6.spiralGeometry(u.x-cw*.5,top,cw,ch,ground,stage);
  },
  growthFrame:(scene,from,to,progress,topic='cosmos')=>paint($('heroCanvas'),scene,to,state.seed,topic,1000,true,false,
   {from,to,progress:clamp(progress,0,1),pulse:from===to}),
  touchFrame:(scene,progress,topic='cosmos')=>paint($('heroCanvas'),scene,16,state.seed,topic,1000,true,false,null,
   {scene,progress:clamp(progress,0,1)}),
  hitTest:(scene,stage,x,y)=>window.CrewFantasyV5.hitTest(scene,stage,x,y,sceneModel(scene,stage)),
  silhouette:()=>state.silhouette};
}
wire();updateStatus();changeUI();load();
if(!state.reduced)requestAnimationFrame(frame);
})();