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
const FILES=['floating-island.svg','island-crown.svg','jelly-canopy.svg','lantern-bud.svg'],images=new Map();
const state={scene:'island',stage:16,topic:'cosmos',seed:103,paused:false,reduced:!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches};
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
  return {scene,stage,seed,topic,phase,units:units.slice(0,count),
   attachment:stage>=8?{cosmos:'moon-isle',warmth:'living-bridge',music:'chime-garden',travel:'winged-island'}[topic]:null,
   bones:[],unitCount:count+(stage>=8?1:0)};
 }
 const count=stage<=3?6:stage<=8?11:19;
 const arms=Array.from({length:count},(_,i)=>{
  const q=rng(seed^Math.imul(i+1,0x4efc923));const t=i/Math.max(1,count-1);
  return {id:'arm-'+i,baseX:210+t*376,baseY:398-Math.sin(t*Math.PI)*29,side:(t-.5)*2,
   length:180+q()*105+(stage>=16?40:0),bend:(q()-.5)*57,phase:q()*TAU,thickness:1.3+q()*2.6};
 });
 return {scene,stage,seed,topic,phase,arms,attachment:topic==='music'?'chime-buds':topic==='travel'?'wing-fins':topic==='warmth'?'heart-calyx':'star-nectar',unitCount:arms.length,bones:arms};
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
 const r=rng(model.seed^Math.imul(index+1,21919));const yDrift=staticMode?0:Math.sin(time*.00062+model.phase+index*1.46)*7;
 const xDrift=staticMode?0:Math.sin(time*.00029+index)*4;
 const x=u.x+xDrift,y=u.y+yDrift,w=u.w,plateH=w*.62,sy=y-w*.29;
 c.save();c.translate(x,y);c.rotate(u.lean+(staticMode?0:Math.sin(time*.00034+index)*.009));c.translate(-x,-y);
 // Floating shadow and negative space beneath the island.
 const shadow=c.createRadialGradient(x,y+w*.32,0,x,y+w*.32,w*.46);
 shadow.addColorStop(0,'#50696935');shadow.addColorStop(1,'#50696900');
 c.fillStyle=shadow;c.beginPath();c.ellipse(x,y+w*.32,w*.46,w*.14,0,0,TAU);c.fill();
 art(c,'floating-island.svg',x-w*.5,sy,w,plateH);
 // The trunk is part of a real painted plate, aligned to the island top.
 art(c,'island-crown.svg',x-w*.36,sy-w*.67,w*.72,w*.70);
 if(model.stage>=8&&index===0){
  c.save();c.fillStyle='#e3bd97';c.strokeStyle='#776763';c.lineWidth=2.2;
  c.beginPath();c.moveTo(x+w*.13,sy+w*.09);c.lineTo(x+w*.13,sy-w*.09);
  c.lineTo(x+w*.18,sy-w*.16);c.lineTo(x+w*.23,sy-w*.08);c.lineTo(x+w*.23,sy+w*.09);
  c.closePath();c.fill();c.stroke();
  c.fillStyle='#665763';c.beginPath();c.moveTo(x+w*.11,sy-w*.085);c.lineTo(x+w*.18,sy-w*.20);c.lineTo(x+w*.25,sy-w*.08);c.fill();
  c.fillStyle='#f4eabb';c.fillRect(x+w*.175,sy-w*.025,w*.035,w*.045);c.restore();
 }
 if(model.stage>=16||index===0)for(let k=0;k<4;k++){
  const a=r()*TAU,px=x+(r()-.5)*w*.79,py=sy+w*(.15+r()*.10);
  leaf(c,px,py,3.5+r()*4,a,['#e7ce9b','#bad4a5','#e2b6a9'][k%3]);
 }
 c.restore();
}
function floatScene(c,m,time,staticMode){
 const units=m.units;
 // Filaments connect actual land masses: topics can grow a bridge or a satellite.
 if(units.length>=2)vineBridge(c,units[1],units[0],m.topic);
 if(units.length>=3)vineBridge(c,units[0],units[2],m.topic);
 if(units.length>=4)vineBridge(c,units[3],units[2],m.topic);
 for(let i=units.length-1;i>=0;i--)floatUnit(c,units[i],i,m,time,staticMode);
 if(m.attachment){
  const anchor=units[units.length-1];
  const x=m.topic==='cosmos'?660:m.topic==='travel'?665:m.topic==='music'?580:350;
  const y=m.topic==='cosmos'?190:m.topic==='travel'?185:m.topic==='music'?190:247;
  c.save();c.globalAlpha=.9;
  charm(c,x,y,m.topic,m.stage>=16?1.05:.83);
  if(m.topic==='warmth'&&units.length>1){
   c.strokeStyle='#cb9e99';c.lineWidth=4;c.beginPath();
   c.moveTo(units[1].x+20,units[1].y-23);
   c.bezierCurveTo(245,245,270,237,units[0].x-50,units[0].y-75);c.stroke();
  }
  if(m.topic==='travel')for(let i=0;i<5;i++)leaf(c,x-35+i*16,y+30+i%2*6,6,-.8,'#c1d4b5');
  if(m.topic==='music')for(let i=0;i<3;i++)charm(c,units[0].x+75+i*20,units[0].y-140-i*10,'music',.23);
  c.restore();
 }
}
function jellyTrunk(c,stage){
 const x=401,base=766;
 c.save();c.fillStyle='#607b76';c.strokeStyle='#5b7779';c.lineWidth=2;
 c.beginPath();c.moveTo(x-12,base);c.bezierCurveTo(353,684,408,570,393,445);
 c.bezierCurveTo(392,430,404,404,412,404);
 c.bezierCurveTo(438,572,391,707,x+12,base);c.closePath();c.fill();c.stroke();
 c.strokeStyle='#a2b8a6aa';c.lineWidth=3;c.beginPath();c.moveTo(402,733);c.quadraticCurveTo(385,615,405,492);c.stroke();
 c.strokeStyle='#638577';c.lineWidth=7;c.beginPath();c.moveTo(398,746);c.quadraticCurveTo(344,769,323,779);
 c.moveTo(400,746);c.quadraticCurveTo(458,770,487,774);c.stroke();c.restore();
}
function bonePath(c,arm,time,staticMode,topic){
 const sway=staticMode?0:Math.sin(time*.00115+arm.phase)*15;
 const x=arm.baseX,y=arm.baseY,len=arm.length;
 const b1x=x+arm.side*24+arm.bend*.35+sway*.4,b1y=y+len*.25;
 const b2x=x+arm.side*45+arm.bend+sway,b2y=y+len*.56;
 const ex=x+arm.side*28+arm.bend*.7+sway,ey=y+len;
 const grad=c.createLinearGradient(x,y,ex,ey);grad.addColorStop(0,'#6e9f9dac');grad.addColorStop(.58,'#abc1adbd');grad.addColorStop(1,'#dec5b299');
 c.strokeStyle=grad;c.lineWidth=arm.thickness;c.lineCap='round';
 c.beginPath();c.moveTo(x,y);c.bezierCurveTo(b1x,b1y,b2x,b2y,ex,ey);c.stroke();
 c.strokeStyle='#f9e9c185';c.lineWidth=.8;c.beginPath();c.moveTo(x+2,y+2);c.bezierCurveTo(b1x+2,b1y,b2x+2,b2y,ex+2,ey);c.stroke();
 return {x:ex,y:ey};
}
function jellyScene(c,m,time,staticMode){
 // Wide canopy / moving curtain / rooted trunk have distinct draw depths.
 const bob=staticMode?0:Math.sin(time*.00068+m.phase)*5;
 c.save();c.translate(0,bob);
 for(const arm of m.arms.filter((_,i)=>i%2===0)){
  const end=bonePath(c,arm,time,staticMode,m.topic);
  if(m.stage>=8&&arm.id.endsWith('0'))art(c,'lantern-bud.svg',end.x-20,end.y-16,40,54);
 }
 jellyTrunk(c,m.stage);
 // Rich original plate, not a procedural oval or a standard plant leaf crown.
 art(c,'jelly-canopy.svg',122,121,555,352);
 for(const [i,arm] of m.arms.entries()){
  if(i%2===0)continue;
  const end=bonePath(c,arm,time,staticMode,m.topic);
  if((i+m.seed)%4===0&&m.stage>=8){
   const size=m.stage>=16?47:34;art(c,'lantern-bud.svg',end.x-size*.45,end.y-6,size,size*1.36);
  }
 }
 if(m.stage>=8){
  const sprigs=m.stage>=16?6:3;
  for(let i=0;i<sprigs;i++){
   const x=310+i*31,y=498-(i%3)*19;
   c.strokeStyle='#6e9690';c.lineWidth=2;c.beginPath();c.moveTo(401,562);
   c.quadraticCurveTo(x+50,y-38,x,y);c.stroke();
   leaf(c,x,y,10+(i%3)*3,i*.9,m.topic==='warmth'?'#eab9b1':'#afd3b9');
  }
 }
 if(m.stage>=16){
  // Separate secondary nursery medusa grows from the main trunk.
  c.globalAlpha=.80;art(c,'jelly-canopy.svg',469,391,147,94);c.globalAlpha=1;
  for(let i=0;i<5;i++){c.strokeStyle='#8db1a8c0';c.lineWidth=1.5;c.beginPath();
   const x=503+i*18;c.moveTo(x,459);c.quadraticCurveTo(x+Math.sin(time*.0006+i)*7,510,x-4,538+i%3*6);c.stroke();}
 }
 if(m.attachment){
  const pos=m.topic==='cosmos'?[624,206]:m.topic==='music'?[203,430]:m.topic==='travel'?[625,457]:[193,352];
  charm(c,pos[0],pos[1],m.topic,m.stage>=16?1.05:.75);
 }
 c.restore();
}
function paint(canvas,scene,stage,seed,topic,time=0,staticMode=true){
 const bounds=canvas.getBoundingClientRect(),width=Math.max(180,bounds.width||400),height=Math.max(180,bounds.height||420);
 const px=Math.min(2,window.devicePixelRatio||1);
 const cw=Math.round(width*px),ch=Math.round(height*px);
 if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
 const c=canvas.getContext('2d');if(!c)return null;
 c.setTransform(px,0,0,px,0,0);c.clearRect(0,0,width,height);
 const scale=Math.min(width/W,height/H),ox=(width-W*scale)/2,oy=(height-H*scale)/2;
 c.fillStyle=scene==='island'?'#e0e9dc':'#c7dcda';c.fillRect(0,0,width,height);
 c.translate(ox,oy);c.scale(scale,scale);
 backdrop(c,scene,seed);
 const model=sceneModel(scene,stage,seed,topic);
 if(scene==='island')floatScene(c,model,time,staticMode);
 else jellyScene(c,model,time,staticMode);
 return model;
}
function drawMain(now){
 const canvas=$('heroCanvas');if(!canvas)return;
 paint(canvas,state.scene,state.stage,state.seed,state.topic,now,state.paused||state.reduced);
}
function refreshStatic(){
 for(const c of document.querySelectorAll('[data-preview]'))
  paint(c,state.scene,Number(c.dataset.preview),state.seed,state.topic,0,true);
}
function updateStatus(){
 const loaded=FILES.filter(ready).length;
 $('statusText').textContent=loaded===FILES.length?'4 / 4 原創素材已載入':'原創素材 '+loaded+' / 4（缺少時使用備用繪製）';
}
function changeUI(){
 $('artName').textContent=state.scene==='island'?'漂流群島':'水母燈籠樹';
 $('artSub').textContent=state.scene==='island'?'FAMILY 01 / FLOATING ISLES':'FAMILY 02 / JELLY LANTERN';
 $('artDetail').textContent=state.scene==='island'?'新聊天會長出獨立浮島、藤橋與植物。':'根莖不動，傘冠與新觸鬚沿骨架生長。';
 $('stageText').textContent=state.stage+' 句 · '+(state.stage===16?'成熟':state.stage===8?'成長':'萌芽');
 $('unitCount').textContent=String(sceneModel().unitCount).padStart(2,'0');
 $('renderTech').textContent='Canvas 2D';
 for(const [field,key] of [['scene','scene'],['stage','stage'],['topic','topic']])
  document.querySelectorAll('[data-'+field+']').forEach(el=>el.setAttribute('aria-pressed',String(String(state[key])===el.dataset[field])));
 $('freezeBtn').textContent=state.paused?'恢復動態':'暫停動態';
 $('freezeBtn').setAttribute('aria-pressed',String(state.paused));
 refreshStatic();drawMain(0);
}
function wire(){
 for(const field of ['scene','stage','topic'])
  document.querySelectorAll('[data-'+field+']').forEach(el=>el.addEventListener('click',()=>{
   state[field]=field==='stage'?Number(el.dataset[field]):el.dataset[field];changeUI();
  }));
 $('seedBtn').addEventListener('click',()=>{
  const n=Number($('seedInput').value);if(!Number.isSafeInteger(n)||n<1||n>999999){
   $('statusText').textContent='Seed 必須是 1～999999 的整數';return;
  }
  state.seed=n;changeUI();
 });
 $('freezeBtn').addEventListener('click',()=>{state.paused=!state.paused;changeUI();});
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
  previews:()=>document.querySelectorAll('[data-preview]').length};
}
wire();updateStatus();changeUI();load();
if(!state.reduced)requestAnimationFrame(frame);
})();