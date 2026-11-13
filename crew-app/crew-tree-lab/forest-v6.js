/* Crew Glow Forest V6 — independent Canvas 2D garden scene and pure garden model.
 * Adapted from the supplied 780×1120 glow-forest prototype. It never reads
 * chat messages, touches the backend, uses WebGL or adds a dependency.
 * Four final botanical forms are determined by seed; nothing is pre-revealed.
 */
(function(root){'use strict';
const W=780,H=1120,TAU=Math.PI*2,MAX=16,MAX_RETIRED=18;
const slots=[{x:150,y:930,s:.50,a:.75},{x:630,y:930,s:.50,a:.75},
 {x:95,y:960,s:.68,a:.90},{x:685,y:960,s:.68,a:.90}];
const forms=[
 {id:'constellation',name:'星空樹',icon:'✦',note:'每片枝梢都連成星座。'},
 {id:'crystal',name:'水晶樹',icon:'💎',note:'冰藍晶簇順著枝幹向天空生長。'},
 {id:'lantern',name:'燈籠樹',icon:'🏮',note:'琥珀燈籠掛滿枝條，照亮整座森林。'},
 {id:'petal',name:'花瀑樹',icon:'🌸',note:'粉色花瀑傾瀉而下，花瓣落滿小島。'}];
const topicColors={food:'#ffc978',cosmos:'#6ee7ff',travel:'#ffb37e',animals:'#ffb5cc',
 music:'#c5b8ff',daily:'#7fe7c4',tech:'#9bf3e7',love:'#ffb5cc',
 weather:'#9fd8ff',nature:'#7fe7c4',dream:'#c5b8ff',stress:'#ffc978',play:'#ffdf91'};
const colorFamilies=['#7fe7c4','#6ee7ff','#ffc978'];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function rng(seed){let x=seed>>>0;return ()=>{x=(x+0x6d2b79f5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function stage(n){return n===0?'seed':n<3?'sprout':n<8?'sapling':n<16?'island':'final';}
function form(seed){return forms[(seed>>>0)%4];}
function rarity(seed){const v=(seed>>>0)%100;return v<2?{key:'legend',name:'傳說',color:'#ffd76a'}:
 v<12?{key:'epic',name:'史詩',color:'#c5b8ff'}:
 v<40?{key:'rare',name:'稀有',color:'#6ee7ff'}:
 {key:'common',name:'普通',color:'#b9b3c9'};}
function empty(){return {version:6,totalCompleted:0,slots:[],retired:[]};}
const goodSeed=n=>Number.isSafeInteger(n)&&n>=0&&n<=4294967295;
const topicNames=Object.keys(topicColors);
function snapshot(tree){
 return {seed:tree.seed>>>0,topics:tree.growth.slice(0,16).map(e=>topicColors[e.topic]?e.topic:'daily')};
}
function cleanSlot(s){
 if(!s||!goodSeed(s.seed)||!Array.isArray(s.topics))return null;
 return {seed:s.seed,topics:s.topics.slice(0,16).filter(x=>topicNames.includes(x))};
}
function restore(raw){
 const base=empty();
 if(!raw||raw.version!==6||!Number.isSafeInteger(raw.totalCompleted)||raw.totalCompleted<0)return base;
 const seen=new Set();
 const cleaned=(xs,limit)=>Array.isArray(xs)?xs.slice(0,32).map(cleanSlot).filter(s=>{
  if(!s||seen.has(s.seed))return false;seen.add(s.seed);return true;
 }).slice(0,limit):[];
 base.slots=cleaned(raw.slots,4);
 base.retired=cleaned(raw.retired,MAX_RETIRED);
 base.totalCompleted=Math.max(raw.totalCompleted,base.slots.length+base.retired.length);
 return base;
}
function complete(g,tree){
 const done=snapshot(tree);
 if(!goodSeed(done.seed)||done.topics.length!==16)return null;
 g.totalCompleted++;
 if(g.slots.length===4)g.retired.unshift(g.slots.shift());
 g.slots.push(done);
 g.retired=g.retired.slice(0,MAX_RETIRED);
 const forestEvent={3:'🍄 螢光菇小路出現了',4:'💧 森林長出一座小池塘',5:'🌌 極光點亮森林'}[g.totalCompleted]||null;
 return {form:form(done.seed),rarity:rarity(done.seed),forestEvent,tree:done};
}
function progress(g,n){return {
 stage:stage(n),completed:g.totalCompleted,visible:g.slots.length,retired:g.retired.length,
 next:g.totalCompleted<3?'再長滿 '+(3-g.totalCompleted)+' 棵，解鎖螢光菇小路':
 g.totalCompleted===3?'再長滿 1 棵，解鎖小池塘':
 g.totalCompleted===4?'再長滿 1 棵，解鎖極光':'極光已點亮 · 森林仍會成長',
 revealed:n>=16,form:n>=16?form(0):null
};}
const shapeCache=new Map();
function bones(seed){
 if(shapeCache.has(seed))return shapeCache.get(seed);
 const r=rng(seed^0x9F7A113),branches=[],tips=[];
 function walk(x,y,a,len,w,d){
  if(d>5||len<11)return;
  const x1=x+Math.cos(a)*len,y1=y+Math.sin(a)*len;
  branches.push({x,y,x1,y1,w,d});
  if(d>=4)tips.push({x:x1,y:y1,phase:r()*TAU,size:2.2+r()*3.2});
  if(d===5)return;
  const n=d===0?3:r()<.76?2:3;
  for(let i=0;i<n;i++){
   const spread=(i-(n-1)/2)*(.42+r()*.15)+(r()-.5)*.40;
   walk(x1,y1,a+spread,len*(.65+r()*.14),Math.max(1.1,w*.65),d+1);
  }
 }
 walk(390,940,-Math.PI/2+(r()-.5)*.23,163,13.5,0);
 const obj={branches,tips};
 if(shapeCache.size>110)shapeCache.delete(shapeCache.keys().next().value);
 shapeCache.set(seed,obj);return obj;
}
function ellipse(c,x,y,rx,ry,color,rot=0){
 c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,rot,0,TAU);c.fill();
}
function glow(c,x,y,r,color,alpha=1){
 c.save();c.globalAlpha*=alpha;
 const g=c.createRadialGradient(x,y,0,x,y,r);
 g.addColorStop(0,color);g.addColorStop(.24,color+'a8');g.addColorStop(1,color+'00');
 c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.restore();
}
function stroke(c,x,y,xx,yy,color,w){
 c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.beginPath();
 c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();
}
function night(c,time,seed,count,still){
 const sky=c.createLinearGradient(0,0,0,H);
 sky.addColorStop(0,'#0a0914');sky.addColorStop(.51,'#17132f');sky.addColorStop(.79,'#302240');
 sky.addColorStop(1,'#161021');c.fillStyle=sky;c.fillRect(0,0,W,H);
 const moon=c.createRadialGradient(590,257,4,590,257,380);
 moon.addColorStop(0,'#9385c426');moon.addColorStop(1,'#6b4c9400');
 c.fillStyle=moon;c.fillRect(0,0,W,800);
 const r=rng(seed^0x15A2DC);
 for(let i=0;i<100;i++){
  const x=r()*W,y=r()*760,rad=.5+r()*1.8;
  c.globalAlpha=still?.62:.35+.48*Math.abs(Math.sin(time*.001+i*2.1));
  c.fillStyle=i%11?'#f3f0ef':'#77e8dd';c.beginPath();c.arc(x,y,rad,0,TAU);c.fill();
 }
 c.globalAlpha=1;
 if(count>=5){
  for(let b=0;b<3;b++){
   c.save();c.globalCompositeOperation='screen';
   const y=128+b*76,grad=c.createLinearGradient(0,y-70,0,y+130);
   grad.addColorStop(0,'#7ff8db00');grad.addColorStop(.45,b===1?'#bc90ff4a':'#72f4c84a');
   grad.addColorStop(1,'#7fe7c400');
   c.fillStyle=grad;c.beginPath();c.moveTo(-50,y+105);
   for(let x=-50;x<=W+50;x+=28)c.lineTo(x,y+Math.sin(x*.010+b*1.8+(still?0:time*.00035))*44);
   c.lineTo(W+50,y+155);c.closePath();c.fill();c.restore();
  }
 }
 if(count>=1){
  glow(c,600,236,138,'#ffe3a6',.45);
  ellipse(c,600,236,33,33,'#ffe8b9');
  ellipse(c,589,231,6,6,'#e9cd96');
 }
 c.fillStyle='#110e22';c.beginPath();c.moveTo(0,H);
 c.lineTo(0,976);c.quadraticCurveTo(370,918,W,966);c.lineTo(W,H);c.closePath();c.fill();
 const hill=c.createLinearGradient(0,970,0,H);
 hill.addColorStop(0,'#203044');hill.addColorStop(1,'#100e21');c.fillStyle=hill;
 c.beginPath();c.moveTo(0,1023);c.quadraticCurveTo(430,968,W,1044);c.lineTo(W,H);c.lineTo(0,H);c.fill();
 if(count>=3){
  for(let i=0;i<8;i++){
   const x=102+i*81,y=1026+Math.sin(i*1.25)*8;
   glow(c,x,y,19,i%2?'#7fe7c4':'#c8abff',.48);
   ellipse(c,x,y,7,4,'#bdf1d4');stroke(c,x,y,x,y+8,'#d5d4cf',2);
  }
 }
 if(count>=4){
  ellipse(c,220,1038,120,21,'#1d3550');
  c.strokeStyle='#74e4f6a8';c.lineWidth=2;
  for(let i=0;i<3;i++){c.beginPath();c.ellipse(218,1036+i*4,70-i*13,7,0,0,Math.PI);c.stroke();}
  ellipse(c,302,1025,15,6,'#63bc87');
 }
}
function island(c,y,lift=0){
 const top=y-4+lift;
 glow(c,390,top+18,165,'#59dabf',.19);
 const g=c.createLinearGradient(390,top-10,390,top+108);
 g.addColorStop(0,'#59426c');g.addColorStop(.2,'#2b274f');g.addColorStop(1,'#15152d');
 c.fillStyle=g;c.beginPath();c.moveTo(245,top);
 c.bezierCurveTo(305,top-23,482,top-28,535,top);
 c.bezierCurveTo(503,top+42,435,top+107,383,top+102);
 c.bezierCurveTo(310,top+94,265,top+34,245,top);c.fill();
 stroke(c,246,top,535,top,'#82efcf',3);
 for(let i=0;i<5;i++){
  const x=299+i*43;stroke(c,x,top+30,x-8,top+93-i%3*12,'#5aa2ad77',1.5);
 }
 for(let i=0;i<4;i++){
  const x=311+i*50;glow(c,x,top-7,15,'#86ffe5',.56);
  ellipse(c,x,top-9,6,3.8,'#d6ffe6');stroke(c,x,top-4,x,top+3,'#e2f6d8',1.5);
 }
}
function seed(c,s,time,topic){
 const pulse=.85+(time?Math.sin(time*.002)*.10:0),y=950;
 glow(c,390,y,108,topic||'#7fe7c4',.7*pulse);
 ellipse(c,390,y,36,47,'#261b42');
 const gr=c.createLinearGradient(363,y-48,412,y+49);
 gr.addColorStop(0,'#5e467b');gr.addColorStop(1,'#24182e');
 ellipse(c,390,y,30,41,gr,-.16);
 c.strokeStyle='#d6e9dc';c.lineWidth=2;c.beginPath();c.ellipse(390,y,31,42,.1,Math.PI*.93,Math.PI*1.56);c.stroke();
 if(s>0){stroke(c,387,y-40,383,y-24,'#ffecbf',2.2);stroke(c,383,y-24,393,y-15,'#ffecbf',2.2);}
 if(s>1)stroke(c,399,y-24,395,y-3,'#ffecbf',2);
 if(s>0){
  const h=s===1?51:81;
  stroke(c,390,y-27,390,y-h,'#53c5a7',6);
  for(const side of [-1,1]){
   c.save();c.translate(390+side*14,y-h+8);c.rotate(side*.7);
   ellipse(c,0,0,20,9,topic||'#7fe7c4');c.restore();
  }
  glow(c,390,y-h,35,topic||'#7fe7c4',.65);
 }
}
function paintGeneric(c,tips,time,seedNum,color,s,n){
 const r=rng(seedNum^0xCC01),visible=Math.min(tips.length,Math.ceil(tips.length*n/16));
 for(let i=0;i<visible;i+=2){
  const tip=tips[i],p=.65+.35*Math.sin(time*.0015+tip.phase);
  glow(c,tip.x,tip.y,13,color,.36*p);
  ellipse(c,tip.x,tip.y,3.7,6.6,i%4===0?'#d8fff2':color,(r()-.5)*1.2);
 }
}
function stars(c,tips,time){
 let prev=null;
 for(let i=0;i<tips.length;i+=6){
  const p=tips[i];if(prev)stroke(c,prev.x,prev.y,p.x,p.y,'#a0eeff80',1.3);
  glow(c,p.x,p.y,23,'#baf3ff',.73);
  c.strokeStyle='#e9ffff';c.lineWidth=2;c.beginPath();c.moveTo(p.x-9,p.y);
  c.lineTo(p.x+9,p.y);c.moveTo(p.x,p.y-9);c.lineTo(p.x,p.y+9);c.stroke();
  prev=p;
 }
 c.save();c.globalCompositeOperation='screen';
 glow(c,390,530,220,'#4389ec',.20);c.restore();void time;
}
function crystals(c,tips){
 for(let i=0;i<tips.length;i+=3){
  const p=tips[i],len=16+(i%4)*5;
  glow(c,p.x,p.y-8,31,'#9fdbff',.62);
  c.fillStyle=i%2?'#66e4f4':'#b8d6ff';c.strokeStyle='#eaffff';c.lineWidth=1.5;
  c.beginPath();c.moveTo(p.x,p.y-len);
  c.lineTo(p.x+8,p.y-4);c.lineTo(p.x,p.y+8);c.lineTo(p.x-8,p.y-4);c.closePath();
  c.fill();c.stroke();stroke(c,p.x,p.y-len,p.x,p.y+8,'#f2ffffbb',1);
 }
}
function lanterns(c,tips,time){
 for(let i=0;i<tips.length;i+=5){
  const p=tips[i],y=p.y+16+Math.sin(time*.0015+p.phase)*1.5;
  stroke(c,p.x,p.y,p.x,y-8,'#eec48b',1.3);
  glow(c,p.x,y,38,'#ffc978',.89);
  const light=c.createLinearGradient(p.x,y-12,p.x,y+12);
  light.addColorStop(0,'#ffcf92');light.addColorStop(1,'#d46c52');
  ellipse(c,p.x,y,10,13,light);
  stroke(c,p.x-8,y-2,p.x+8,y-2,'#ffe9ae',1.3);
  stroke(c,p.x,y+12,p.x,y+18,'#ffd48e',1.4);
 }
}
function petals(c,tips,time){
 for(let i=0;i<tips.length;i+=3){
  const p=tips[i],len=20+i%4*22;
  c.strokeStyle='#f5a8d6a6';c.lineWidth=2;c.beginPath();c.moveTo(p.x,p.y);
  c.quadraticCurveTo(p.x+Math.sin(i)*12,p.y+len*.6,p.x+5,p.y+len);c.stroke();
  for(let k=0;k<3;k++){
   const x=p.x+Math.sin(i*6+k*2.2)*11,y=p.y+k*9;
   glow(c,x,y,17,'#ffb5df',.35);
   ellipse(c,x,y,8,4,k===0?'#ffe7f7':'#f4a1d0',k*1.5);
  }
 }
 for(let i=0;i<18;i++){
  const p=tips[i%tips.length];if(!p)continue;
  const offset=(time*.015+i*47)%140;
  ellipse(c,p.x+Math.sin(i*.76)*12,p.y+offset,3.9,2,'#ffbfdc',i*.8);
 }
}
function shape(c,tree,n,x,y,scale,alpha,time,staticMode,marks){
 if(!tree||!goodSeed(tree.seed))return;
 const seedNum=tree.seed,stageNow=stage(n),shape=bones(seedNum);
 const palette=colorFamilies[seedNum%3],sx=scale,sy=scale;
 c.save();c.globalAlpha*=alpha;c.translate(x,y);c.scale(sx,sy);c.translate(-390,-940);
 if(stageNow==='seed'||stageNow==='sprout'){
  seed(c,n,time,marks&&marks.length?topicColors[marks[0]]:palette);c.restore();return;
 }
 const vis=Math.ceil(shape.branches.length*clamp(n/16,.2,1)),tips=shape.tips;
 const end=stageNow==='final';
 for(let i=0;i<vis;i++){
  const b=shape.branches[i],sway=staticMode?0:Math.sin(time*.0012+seedNum*.01)*Math.max(0,(5-b.d))*1.1;
  c.lineCap='round';c.strokeStyle='#0e1027';c.lineWidth=b.w+3;
  c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x1+sway,b.y1);c.stroke();
  c.strokeStyle=i%4?'#4e9b96':'#9f8cbb';c.lineWidth=Math.max(1.1,b.w*.37);
  c.beginPath();c.moveTo(b.x-2,b.y);c.lineTo(b.x1-2+sway,b.y1);c.stroke();
 }
 if(end){
  const formId=form(seedNum).id;
  if(formId==='constellation')stars(c,tips,time);
  else if(formId==='crystal')crystals(c,tips);
  else if(formId==='lantern')lanterns(c,tips,time);
  else petals(c,tips,time);
 }else paintGeneric(c,tips,time,seedNum,palette,scale,n);
 if(Array.isArray(marks)){
  const shown=Math.min(n,marks.length);
  for(let i=0;i<shown;i++){
   const p=tips[(i*7+seedNum%5)%Math.max(1,tips.length)];
   if(!p)continue;
   const col=topicColors[marks[i]]||topicColors.daily;
   glow(c,p.x,p.y,23,col,.61);
   ellipse(c,p.x,p.y,4.4,4.4,'#ffffff');
   ellipse(c,p.x+1,p.y,2.8,2.8,col);
  }
 }
 c.restore();
}
function paint(canvas,g,active,time=0,opts={}){
 if(!canvas||typeof canvas.getContext!=='function')return false;
 const c=canvas.getContext('2d');if(!c)return false;
 const width=opts.width||canvas.width||W,height=opts.height||canvas.height||H;
 const dpr=opts.dpr||1,still=!!opts.still;
 c.save();c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);
 c.scale(width/W,height/H);
 const n=clamp(Number(active?.growth?.length)||0,0,16);
 const display=opts.reveal?.tree||active;
 const showN=opts.reveal?16:n;
 night(c,time,display?.seed||314159,g.totalCompleted,still);
 for(let i=0;i<g.slots.length;i++){
  const slot=slots[i],tree=g.slots[i];
  if(!slot||!tree)continue;
  shape(c,tree,16,slot.x,slot.y,slot.s,slot.a,time,still,tree.topics);
 }
 const current=display&&goodSeed(display.seed)?display:{seed:314159,growth:[]};
 const p=opts.motion&&!still?clamp((time-opts.motion.start)/1250,0,1):1;
 const prev=opts.motion?opts.motion.fromTurns:n;
 const turns=prev+(showN-prev)*p;
 const st=stage(showN);
 let growth=st==='seed'||st==='sprout'?1:st==='sapling'?.66+.16*clamp((turns-3)/5,0,1):
 .82+.18*clamp((turns-8)/8,0,1);
 if(showN>=8)island(c,940,(1-p)*(opts.motion?.fromTurns<8?86:0));
 // The foreground tree is anchored in the same place at every age.
 shape(c,current,showN,390,940,growth,1,time,still,current.growth?.map(x=>x.topic));
 if(opts.reveal){
  glow(c,390,553,240,'#ffde9f',.20);
  for(let i=0;i<20;i++){
   const angle=i*2.39996,rad=32+i*9;
   const x=390+Math.cos(angle)*rad,y=560+Math.sin(angle)*rad;
   glow(c,x,y,12,i%3?'#7fe7c4':'#ffeab6',.76);
  }
  if(opts.reveal.started&&time-opts.reveal.started<260&&!still){
   c.fillStyle='#fff1c58c';c.fillRect(0,0,W,H);
  }
 }
 for(let i=0;i<Math.min(3+g.totalCompleted*2,15);i++){
  const a=i*2.29+current.seed*.001,x=390+Math.sin(a)*250,
   y=680+Math.cos(a)*220+(still?0:Math.sin(time*.001+i)*10);
  glow(c,x,y,15,i%2?'#7fe7c4':'#ffe9a8',.59);
 }
 c.restore();return true;
}
function poster(canvas,g,active,now){
 if(!canvas)return false;
 canvas.width=1080;canvas.height=1920;
 const c=canvas.getContext('2d');if(!c)return false;
 c.fillStyle='#12101c';c.fillRect(0,0,1080,1920);
 paint(canvas,g,active,now,{width:1080,height:1560,still:true});
 c.fillStyle='#141024';c.fillRect(0,1560,1080,360);
 c.textAlign='center';c.fillStyle='#7fe7c4';c.font='700 42px system-ui';
 c.fillText('我的森林 · '+g.totalCompleted+' 棵樹',540,1655);
 const total=g.totalCompleted*16+(active?.growth?.length||0);
 c.fillStyle='#f5eee6';c.font='700 35px system-ui';
 c.fillText('和 Zoe 聊了 '+total+' 句，種出這片森林',540,1736);
 const date=new Date();
 c.fillStyle='#b9b3c9';c.font='29px system-ui';
 c.fillText(date.getFullYear()+'/'+(date.getMonth()+1)+'/'+date.getDate()+' · Crew 種樹',540,1797);
 c.fillStyle='#7fe7c4';c.font='700 32px system-ui';c.fillText('3sssi.com',540,1868);
 return true;
}
root.CrewGlowForestV6=Object.freeze({
 W,H,MAX,forms,slots,topicColors,stage,form,rarity,empty,restore,snapshot,complete,progress,
 paint,poster
});
})(typeof window!=='undefined'?window:globalThis);
