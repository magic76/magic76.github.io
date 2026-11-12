(()=>{'use strict';
const $=id=>document.getElementById(id);
const canvas=$('gameCanvas'),ctx=canvas.getContext('2d');
const WORLD=1000,FLOOR=415,GRAVITY=1700,JUMP=715,EXIT_X=917,EXIT_GATE=850,TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const ROOM_DEFS=[
 {id:'gap',name:'小小斷橋',objective:'一起跳過斷橋',hint:'空白鍵或「跳！」跨過缺口。Zoe 會先過去接你。',pits:[[365,500]],platforms:[{x:406,y:327,w:43,h:12}]},
 {id:'switches',name:'雙人密碼門',objective:'同時踩亮兩個開關',hint:'你站左邊的藍色開關，讓 Zoe 站右邊的紫色開關。',pits:[],platforms:[]},
 {id:'stars',name:'星星接力',objective:'一人收集一顆星星',hint:'你拿藍色星星，Zoe 會去拿紫色星星。兩顆都拿到門才開。',pits:[],platforms:[]},
 {id:'rescue',name:'救出 Zoe',objective:'踩住開關，救出被困住的 Zoe',hint:'Zoe 被泡泡困住了！走到中央藍色救援開關。',pits:[],platforms:[]},
 {id:'relay',name:'我們的魔法橋',objective:'Zoe 踩開關，你過橋按下另一邊的按鈕',hint:'Zoe 守住左側開關，橋才會出現。你過橋按亮右側按鈕！',pits:[[426,580]],platforms:[]}
];
const TEXT={
 gap:['我先跳過去，等等你！','別急，這裡可以跳過來。','你跳，我在前面接應！'],
 switches:['我去右邊的開關！','你踩藍色的，我踩紫色的！','我們要同時站上去喔。'],
 stars:['我去找紫色星星，你找藍色的！','兩顆星星都亮了就能開門。','我這邊快拿到了！'],
 rescue:['唔……我好像被困住了！','那個藍色開關，拜託你了！','我就知道你會來救我。'],
 relay:['我幫你守住橋！','快過去按右邊的按鈕！','換我過來找你啦！']
};
let P=null,Z=null,room=null,last=0,raf=0,width=390,height=450,dpr=1,scale=1,viewW=700,viewH=700,camX=0,camY=0;
let input={left:false,right:false,jump:false},pressedJump=false;
let bubble={text:'',until:0},particles=[],skyStars=[];
const G={
 phase:'ready',roomIndex:0,sequence:[0,1,2,3,4],time:0,roomTime:0,transitionTime:0,
 command:'lead',commandAnchor:0,roomFlags:{},events:[],rescueFx:0,
 stats:{runs:0,savedByZoe:0,savedZoe:0},lastSaved:'',completed:0,roomFails:0,softHint:false
};
function readMemory(){
 try{
  const data=JSON.parse(localStorage.getItem('crew-buddy-lab-v1')||'{}');
  const num=(x)=>Number.isFinite(x)?clamp(Math.floor(x),0,99999):0;
  G.stats={runs:num(data.runs),savedByZoe:num(data.savedByZoe),savedZoe:num(data.savedZoe)};
  G.lastSaved=typeof data.lastSaved==='string'?data.lastSaved.slice(0,240):'';
 }catch{}
 updateMemory();
}
function storeMemory(){
 try{localStorage.setItem('crew-buddy-lab-v1',JSON.stringify({...G.stats,lastSaved:G.lastSaved}))}catch{}
 updateMemory();
}
function updateMemory(){
 $('runsTotal').textContent=G.stats.runs;
 $('zoeRescues').textContent=G.stats.savedByZoe;
 $('playerRescues').textContent=G.stats.savedZoe;
 $('lastMemory').textContent=G.lastSaved||'我們的冒險故事，從這裡開始。';
}
function sample(arr){return arr[Math.floor(Math.random()*arr.length)];}
function orderRooms(){let rest=[1,2,3,4];for(let i=rest.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[rest[i],rest[j]]=[rest[j],rest[i]]}return [0,...rest];}
function makeEntity(x,isBuddy=false){
 return {x,y:FLOOR,vx:0,vy:0,onGround:true,speed:isBuddy?235:264,
  w:25,h:52,face:1,walk:0,helped:0,trapped:false,isBuddy,checkpoint:85};
}
function announce(message,force=false){
 if(!force&&G.time<bubble.until-.8)return;
 bubble={text:String(message).slice(0,85),until:G.time+3.7};
 $('zoeLine').textContent=bubble.text;
 $('friendMood').textContent=message.includes('救')?'🥹 互相幫忙':message.includes('等')?'🙂 在等你':message.includes('太棒')?'🥳 好開心':'😊 一起加油';
}
function note(event){G.events.push(String(event).slice(0,90));if(G.events.length>14)G.events.shift();}
function updateCommandButtons(){
 for(const b of document.querySelectorAll('[data-command]')){
  const active=b.dataset.command===G.command;
  b.classList.toggle('selected',active);
  b.setAttribute('aria-pressed',active?'true':'false');
 }
}
function setCommand(cmd,quiet=false){
 if(!['follow','lead','wait','help'].includes(cmd))return false;
 G.command=cmd;G.commandAnchor=Z?Z.x:0;updateCommandButtons();
 if(!quiet){
  const words={follow:'好，我跟著你！',lead:'收到！我先去探路，你慢慢來。',wait:'沒問題，我在這裡等你！',help:'我來幫你！別擔心。'};
  announce(words[cmd],true);
 }
 return true;
}
function getRoom(){return ROOM_DEFS[G.sequence[G.roomIndex]];}
function resetRoom(){
 room=getRoom();
 P=makeEntity(85,false);Z=makeEntity(room.id==='rescue'?590:160,true);
 if(room.id==='rescue'){Z.trapped=true;Z.y=337;}
 if(room.id==='relay')Z.x=170;
 G.roomFlags={gate:false,left:false,right:false,bridged:false,starP:false,starZ:false,released:false};
 G.roomTime=0;G.roomFails=0;G.softHint=false;G.rescueFx=0;
 input.left=false;input.right=false;input.jump=false;pressedJump=false;
 particles.length=0;
 const role=(room.id==='switches'||room.id==='stars'||room.id==='relay'||room.id==='gap')?'lead':'follow';
 setCommand(role,true);
 $('roomIndex').textContent=String(G.roomIndex+1).padStart(2,'0');
 $('roomName').textContent=room.name;
 $('objectiveLabel').textContent=room.objective;
 $('objectiveHint').textContent=room.hint;
 $('coStatus').textContent='你 + Zoe';
 $('roomDots').innerHTML=ROOM_DEFS.map((d,i)=>'<i class="'+(i<G.roomIndex?'done':i===G.roomIndex?'active':'')+'"></i>').join('');
 bubble.until=G.time+4;
 announce(TEXT[room.id][0],true);
 camX=0;updateHud();
}
function startRun(){
 G.phase='playing';G.time=0;G.roomIndex=0;G.completed=0;G.events=[];
 G.sequence=G.stats.runs>0?orderRooms():[0,1,2,3,4];
 G.stats.runs++;storeMemory();
 $('gameOverlay').hidden=true;
 resetRoom();updateMemory();
}
function updateHud(){
 $('timer').textContent=String(Math.floor(G.time/60)).padStart(2,'0')+':'+String(Math.floor(G.time%60)).padStart(2,'0');
}
function isGap(x){
 for(const pit of room.pits){
  if(x>pit[0]+6&&x<pit[1]-6&&!(room.id==='relay'&&bridgeActive()))return true;
 }
 return false;
}
function bridgeActive(){return room.id==='relay'&&(G.roomFlags.bridged||Math.abs(Z.x-285)<42&&Z.onGround&&!Z.trapped);}
function gateOpen(){
 return room.id==='switches'?G.roomFlags.gate:
 room.id==='stars'?G.roomFlags.starP&&G.roomFlags.starZ:
 room.id==='rescue'?G.roomFlags.released:
 room.id==='relay'?G.roomFlags.bridged:true;
}
function tryJump(e){
 if(!e||!e.onGround||e.trapped)return false;
 e.vy=-JUMP;e.onGround=false;burst(e.x,e.y-3,'#dbeeff',6);
 return true;
}
function burst(x,y,color,n=9){
 for(let i=0;i<n&&particles.length<100;i++){
  const a=Math.random()*TAU,r=40+Math.random()*95;
  particles.push({x,y,vx:Math.cos(a)*r,vy:Math.sin(a)*r-28,life:.45+Math.random()*.25,max:.7,color,size:1.8+Math.random()*3});
 }
}
function movePerson(e,dir,dt){
 if(e.trapped)return;
 e.vx=dir*e.speed;
 if(Math.abs(dir)>.01)e.face=Math.sign(dir);
 e.x=clamp(e.x+e.vx*dt,23,WORLD-20);
 if(!gateOpen()&&e.x>EXIT_GATE-18&&e.x<EXIT_GATE+38){
  if(dir>0)e.x=Math.min(e.x,EXIT_GATE-19);
  else if(dir<0)e.x=Math.max(e.x,EXIT_GATE+39);
 }
 const oldY=e.y;
 e.vy=clamp(e.vy+GRAVITY*dt,-1000,1050);
 e.y+=e.vy*dt;
 e.onGround=false;
 if(e.vy>=0){
  const surfaces=[{x:0,x2:WORLD,y:FLOOR,ground:true},...room.platforms.map(p=>({x:p.x,x2:p.x+p.w,y:p.y,ground:false}))];
  if(room.id==='relay'&&bridgeActive())surfaces.push({x:426,x2:580,y:FLOOR,ground:false});
  for(const sf of surfaces){
   if(e.x<sf.x-2||e.x>sf.x2+2)continue;
   if(sf.ground&&isGap(e.x))continue;
   if(oldY<=sf.y+10&&e.y>=sf.y){
    e.y=sf.y;e.vy=0;e.onGround=true;break;
   }
  }
 }
 e.walk+=Math.abs(dir)*dt*12;
 if(e.onGround&&!isGap(e.x)&&e.x>e.checkpoint+28)e.checkpoint=e.x;
 if(e.y>FLOOR+180)rescue(e);
}
function rescue(e){
 const buddy=e===P?Z:P;
 const close=buddy&&!buddy.trapped&&Math.abs(buddy.x-e.x)<370;
 if(e===P){
  if(close){
   P.x=clamp(buddy.x-40,60,EXIT_X-40);P.y=FLOOR;P.vy=0;P.onGround=true;
   G.stats.savedByZoe++;G.rescueFx=1.1;
   note('Zoe 在斷橋拉住了你');
   announce(sample(['抓到了！這次真的差一點點！','等等！我拉你上來！','嘿，我在這裡，不要怕！']),true);
  }else{
   P.x=Math.max(78,Math.min(P.checkpoint,325));P.y=FLOOR;P.vy=0;P.onGround=true;
   announce('沒關係，我們再跳一次！',true);
  }
  G.roomFails++;
 }else{
  if(close){
   Z.x=P.x+42;Z.y=FLOOR;Z.vy=0;Z.onGround=true;G.stats.savedZoe++;G.rescueFx=1.1;
   note('你伸手救起了失足的 Zoe');
   announce('哇！謝謝你救我，換我跟緊一點！',true);
  }else{
   Z.x=Math.max(100,Math.min(Z.checkpoint,322));Z.y=FLOOR;Z.vy=0;Z.onGround=true;
   announce('哎呀，我也會失誤嘛！',true);
  }
 }
 burst(e.x,e.y-30,'#fff0ac',20);storeMemory();
}
function aiTarget(){
 if(Z.trapped)return Z.x;
 if(G.command==='wait')return G.commandAnchor;
 if(room.id==='switches'&&!G.roomFlags.gate){
  if(G.command==='follow')return P.x+48;
  return 630;
 }
 if(room.id==='stars'&&!G.roomFlags.starZ)return 660;
 if(room.id==='relay'&&!G.roomFlags.bridged)return 284;
 if(G.command==='help')return P.x+(P.x<Z.x?32:-32);
 let target=G.command==='lead'?Math.min(EXIT_X-37,P.x+210):P.x+72;
 for(const pit of room.pits){
  if(P.x<pit[0]-10&&Z.x>pit[1]+10)target=Math.max(target,pit[1]+45);
  else if(P.x>pit[1]+10&&Z.x<pit[0]-10)target=Math.max(target,pit[1]+55);
  else if(Z.x<pit[0]&&target>pit[0]&&target<pit[1]+60)target=pit[1]+70;
 }
 return clamp(target,60,EXIT_X-15);
}
function aiStep(dt){
 if(Z.trapped)return;
 const target=aiTarget(),delta=target-Z.x;
 let dir=Math.abs(delta)<9?0:clamp(delta/55,-1,1);
 if(room.id==='relay'&&!G.roomFlags.bridged&&Math.abs(Z.x-284)<17)dir=0;
 if(Z.onGround&&Math.abs(dir)>.1){
  for(const pit of room.pits){
   if(dir>0&&Z.x<pit[0]&&pit[0]-Z.x<71&&target>pit[1]-25)tryJump(Z);
   if(dir<0&&Z.x>pit[1]&&Z.x-pit[1]<71&&target<pit[0]+25)tryJump(Z);
  }
 }
 movePerson(Z,dir,dt);
}
function updatePuzzle(){
 const f=G.roomFlags;
 if(room.id==='switches'){
  f.left=Math.abs(P.x-302)<44&&P.onGround;
  f.right=Math.abs(Z.x-632)<43&&Z.onGround;
  if(f.left&&f.right&&!f.gate){
   f.gate=true;burst(815,330,'#a3f7d8',19);note('你們同時踩住兩個開關，打開了門');
   announce('耶！我們真的同時按到了！',true);
  }
 }else if(room.id==='stars'){
  if(!f.starP&&Math.abs(P.x-340)<37&&P.onGround){
   f.starP=true;burst(340,350,'#9cfff8',18);announce('你拿到藍色星星了！我的也快了！',true);
  }
  if(!f.starZ&&Math.abs(Z.x-656)<35&&Z.onGround){
   f.starZ=true;burst(656,350,'#ddbbff',18);announce('紫色星星收集！我們都有一顆！',true);
  }
  if(f.starP&&f.starZ&&!f.gate){
   f.gate=true;note('你們分頭找回兩顆星星');burst(815,325,'#fff0af',18);
  }
 }else if(room.id==='rescue'){
  if(!f.released&&Math.abs(P.x-365)<43&&P.onGround){
   f.released=true;Z.trapped=false;Z.x=580;Z.y=FLOOR;Z.vy=0;Z.onGround=true;
   G.stats.savedZoe++;storeMemory();G.rescueFx=1.2;
   note('你按下開關，救出泡泡裡的 Zoe');
   burst(580,345,'#d5afff',28);
   announce('得救啦！你真的有回來找我！🥹',true);
  }
 }else if(room.id==='relay'){
  if(!f.bridged&&Math.abs(P.x-671)<47&&P.onGround){
   f.bridged=true;burst(677,355,'#91ffe6',22);
   note('Zoe 幫你架橋，你替她把橋固定住');
   announce('橋固定好了！這次輪到我過去！',true);
  }
 }
 if(gateOpen()&&P.x>EXIT_X-46&&Z.x>EXIT_X-75&&Z.onGround&&P.onGround)finishRoom();
 if(P.x>EXIT_X-75&&Z.x<EXIT_X-160&&!G.softHint){
  G.softHint=true;announce('等等我！我們要一起到終點呀！',true);
 }
}
function finishRoom(){
 if(G.phase!=='playing')return;
 G.phase='transition';G.completed++;G.transitionTime=0;
 const words={
  gap:'耶！剛剛那一跳太帥了！',
  switches:'兩個人一起配合，果然更快！',
  stars:'分工合作，兩顆星星都到手！',
  rescue:'謝謝你回來找我，真的。 ',
  relay:'你走過去、我守住橋，我們完成啦！'
 };
 note('第 '+(G.roomIndex+1)+' 關：'+room.name+'順利過關');
 announce(words[room.id],true);
 burst(P.x,FLOOR-40,'#ffe5a6',25);
 $('coStatus').textContent='✓ 合作成功';
 updateHud();
}
function finishRun(){
 G.phase='complete';
 G.lastSaved=G.events.length?
 'Zoe：「'+(G.stats.savedByZoe?'這次有幾次驚險救援，但我們還是一起過來了！':'五個小地方，我們居然真的一起走完了！')+'」 '+G.events.slice(-3).join('、')+'。':
 'Zoe：「我們過了五關！下一輪我還想一起去冒險。」';
 storeMemory();
 $('overlayTitle').textContent='這次我們一起過關了！';
 $('overlayText').textContent='花了 '+Math.round(G.time)+' 秒，完成 5 個合作挑戰。'+
  '你們留下 '+G.events.length+' 段小回憶。下局會換關卡順序，Zoe 也會記得你們的救援次數。';
 $('startBtn').innerHTML='再玩一局 <span>↻</span>';
 $('overlayFootnote').textContent=G.lastSaved;
 $('gameOverlay').hidden=false;
 announce('下一局也一起玩，好不好？',true);
}
function gameStep(dt){
 if(G.phase==='transition'){
  G.transitionTime+=dt;G.time+=dt;
  if(G.transitionTime>=1.15){
   G.roomIndex++;
   if(G.roomIndex>=G.sequence.length)finishRun();
   else {G.phase='playing';resetRoom()}
  }
  updateHud();return;
 }
 if(G.phase!=='playing')return;
 G.time+=dt;G.roomTime+=dt;G.rescueFx=Math.max(0,G.rescueFx-dt);
 const dir=(input.right?1:0)-(input.left?1:0);
 if(input.jump){tryJump(P);input.jump=false}
 movePerson(P,dir,dt);aiStep(dt);
 updatePuzzle();
 if(G.roomTime>12&&!G.softHint&&room.id==='gap'&&Math.abs(P.x-365)<115){
  G.softHint=true;announce('你可以在斷橋前按「跳！」，我在對面等你！',true);
 }
 for(let i=particles.length-1;i>=0;i--){
  const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=120*dt;p.life-=dt;
  if(p.life<=0)particles.splice(i,1);
 }
 updateHud();
}
function resize(){
 const rect=canvas.getBoundingClientRect();
 width=Math.max(320,rect.width||390);height=Math.max(340,rect.height||450);
 dpr=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
 viewW=width<590?680:970;scale=width/viewW;viewH=height/scale;
 camY=FLOOR-viewH*.71;
}
function rr(x,y,w,h,r,fill,stroke){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);
 if(fill){ctx.fillStyle=fill;ctx.fill()}
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}
}
function circle(x,y,r,fill,stroke,width=1){
 ctx.beginPath();ctx.arc(x,y,r,0,TAU);
 if(fill){ctx.fillStyle=fill;ctx.fill()}
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}
}
function text(str,x,y,size=13,color='#ffffff',align='center',weight='800'){
 ctx.font=weight+' '+size+'px Nunito, system-ui, sans-serif';
 ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(str,x,y);
}
function renderSky(){
 const g=ctx.createLinearGradient(0,camY,0,camY+viewH);
 g.addColorStop(0,'#2c315f');g.addColorStop(.6,'#3a5a78');g.addColorStop(1,'#8c91af');
 ctx.fillStyle=g;ctx.fillRect(camX-20,camY-20,viewW+50,viewH+50);
 ctx.globalAlpha=.18;
 for(let i=0;i<12;i++){
  const x=(i*239+83)%1350,y=80+(i*57)%175;
  circle(x,y,38+i%4*14,i%3?'#b9e9f3':'#e0c5ff');
 }
 ctx.globalAlpha=1;
 for(let layer=0;layer<2;layer++){
  const par=layer===0?.25:.47,baseY=FLOOR-(layer===0?70:35);
  ctx.fillStyle=layer===0?'#364b71':'#48587c';
  const offset=camX*par;
  for(let i=-2;i<17;i++){
   const x=i*110-offset,y=baseY-(i%3)*13-(i%5)*9,w=74+(i%4)*15;
   rr(x,y,w,FLOOR-y+50,5,ctx.fillStyle);
   if(layer===1){ctx.fillStyle='#e5d5a24d';for(let j=0;j<3;j++)rr(x+13+j*17,y+19,6,8,1,ctx.fillStyle);ctx.fillStyle='#48587c'}
  }
 }
}
function renderGround(){
 ctx.fillStyle='#29364e';ctx.fillRect(0,FLOOR,WORLD,230);
 for(const pit of room.pits){
  const active=room.id==='relay'&&bridgeActive();
  if(!active){
   const under=ctx.createLinearGradient(0,FLOOR,0,FLOOR+120);
   under.addColorStop(0,'#171b36');under.addColorStop(1,'#222849');
   ctx.fillStyle=under;ctx.fillRect(pit[0],FLOOR,pit[1]-pit[0],230);
   ctx.fillStyle='#e8a7d960';ctx.fillRect(pit[0],FLOOR-4,5,8);ctx.fillRect(pit[1]-5,FLOOR-4,5,8);
  }else{
   rr(pit[0],FLOOR-7,pit[1]-pit[0],15,3,'#8bead1','#e0fff6');
   for(let x=pit[0]+8;x<pit[1];x+=24)rr(x,FLOOR-5,6,10,2,'#367f88');
  }
 }
 for(const platform of room.platforms){
  rr(platform.x,platform.y,platform.w,12,4,'#7d98ae','#c6e8e3');
  rr(platform.x+8,platform.y+12,platform.w-16,6,2,'#4e607e');
 }
 for(let x=0;x<WORLD;x+=42){
  if(isGap(x))continue;
  rr(x,FLOOR+7,38,5,2,x%3?'#38435c':'#606a7b');
 }
 for(let x=0;x<WORLD;x+=85){
  if(isGap(x))continue;
  ctx.strokeStyle='#b0e9dd60';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(x,FLOOR);ctx.lineTo(x+5,FLOOR-5);ctx.lineTo(x+11,FLOOR);ctx.stroke();
 }
 ctx.fillStyle='#93e5c2';for(let x=0;x<WORLD;x+=12)if(!isGap(x))ctx.fillRect(x,FLOOR-4,12,4);
}
function renderPlate(x,color,active,label){
 const light=active?'#e2ffe9':color;
 ctx.save();ctx.shadowColor=light;ctx.shadowBlur=active?22:10;
 rr(x-37,FLOOR-10,74,12,7,active?'#b6ffd5':'#27395b',light);
 circle(x,FLOOR-15,active?14:10,active?'#d9fff4':color);
 ctx.restore();
 text(label,x,FLOOR-35,11,active?'#ffffff':'#dce9ff');
}
function renderGoal(){
 const open=gateOpen(),x=EXIT_GATE;
 ctx.save();ctx.globalAlpha=open?.92:1;
 rr(x-9,FLOOR-119,18,119,5,open?'#4f967d':'#646485',open?'#adffdc':'#d7b5ff');
 circle(x,FLOOR-105,9,open?'#aaffcf':'#f4aeca');
 if(open){
  ctx.globalAlpha=.26;
  rr(x+17,FLOOR-93,85,92,10,'#b2ffdc','#d6fff8');
  ctx.globalAlpha=1;
  text('一起到終點 →',x+52,FLOOR-109,12,'#ffffff');
 }else text('LOCKED',x,FLOOR-135,12,'#ffcce5');
 ctx.restore();
 const exit=EXIT_X;
 rr(exit-7,FLOOR-6,45,8,4,'#a9f2db');
 circle(exit+12,FLOOR-30,14,'#ffda9d','#fff1cf',3);
 text('GO!',exit+12,FLOOR-26,11,'#583d6c');
}
function renderPuzzle(){
 const f=G.roomFlags;
 if(room.id==='switches'){
  renderPlate(302,'#8beaff',f.left,'你');
  renderPlate(632,'#d5b6ff',f.right,'Zoe');
  if(f.left&&f.right){
   ctx.strokeStyle='#befff0';ctx.lineWidth=3;ctx.setLineDash([11,8]);
   ctx.beginPath();ctx.moveTo(302,FLOOR-15);ctx.lineTo(632,FLOOR-15);ctx.stroke();ctx.setLineDash([]);
  }
 }else if(room.id==='stars'){
  for(const star of [{x:340,color:'#9afff3',got:f.starP,label:'你的星星'},{x:656,color:'#e1bbff',got:f.starZ,label:'Zoe 的星星'}]){
   if(star.got)continue;
   ctx.save();ctx.translate(star.x,FLOOR-63+Math.sin(G.time*3+star.x)*5);
   ctx.rotate(G.time*.85);ctx.shadowBlur=17;ctx.shadowColor=star.color;
   ctx.fillStyle=star.color;ctx.beginPath();
   for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?10:22;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}
   ctx.closePath();ctx.fill();ctx.restore();
   text(star.label,star.x,FLOOR-103,11,'#fff4ff');
  }
 }else if(room.id==='rescue'){
  renderPlate(365,'#9aeaf0',f.released,'救援開關');
  if(!f.released){
   const x=Z.x,y=Z.y-46;
   ctx.save();ctx.globalAlpha=.27;circle(x,y,67,'#e7bdff');
   ctx.globalAlpha=.86;circle(x,y,67,null,'#e2adff',5);
   circle(x-31,y-20,7,'#fff5ff');circle(x+34,y+17,4,'#fff5ff');
   ctx.restore();text('快救我！',x,y-88,15,'#ffe6fb');
  }
 }else if(room.id==='relay'){
  renderPlate(284,'#c3a1ff',Math.abs(Z.x-284)<43&&Z.onGround,'Zoe 守橋');
  renderPlate(671,'#9cf9ec',f.bridged,'你來固定');
  if(!bridgeActive())text('需要 Zoe 踩住左邊',504,FLOOR-31,12,'#ffe0df');
 }
}
function renderCharacter(e){
 if(!e)return;
 const buddy=e.isBuddy,palette=buddy?{
  coat:'#a98be2',coat2:'#7659ad',hair:'#cab1fd',hairDark:'#9475c9',face:'#f3c8b6',shoe:'#514b83',
  edge:'#f7d8ff',name:'Zoe'
 }:{
  coat:'#62bfd2',coat2:'#287fa4',hair:'#35466a',hairDark:'#263851',face:'#f0caac',shoe:'#305473',
  edge:'#b5fcf5',name:'你'
 };
 const bob=e.onGround?Math.sin(e.walk)*1.6:0;
 const x=e.x,y=e.y-bob;
 ctx.save();ctx.translate(x,y);
 if(e.trapped)ctx.globalAlpha=.65;
 ctx.fillStyle='#17223855';ctx.beginPath();ctx.ellipse(0,1,21,6,0,0,TAU);ctx.fill();
 ctx.scale(e.face,1);
 const moving=Math.abs(e.vx)>.05?Math.sin(e.walk):0;
 ctx.lineWidth=6;ctx.lineCap='round';
 ctx.strokeStyle=palette.shoe;
 ctx.beginPath();ctx.moveTo(-7,-18);ctx.lineTo(-7-moving*5,-2);
 ctx.moveTo(7,-18);ctx.lineTo(7+moving*5,-2);ctx.stroke();
 ctx.strokeStyle=palette.coat2;ctx.lineWidth=7;
 ctx.beginPath();ctx.moveTo(-12,-41);ctx.lineTo(-18+moving*3,-27);
 ctx.moveTo(12,-41);ctx.lineTo(18-moving*3,-25);ctx.stroke();
 rr(-16,-48,32,30,9,palette.coat,palette.edge);
 rr(-11,-42,22,17,5,palette.coat2);
 circle(0,-63,19,palette.face);
 if(buddy){
  ctx.fillStyle=palette.hairDark;
  ctx.beginPath();ctx.arc(0,-65,22,Math.PI,TAU);ctx.lineTo(22,-43);ctx.lineTo(12,-45);ctx.lineTo(-21,-45);ctx.closePath();ctx.fill();
  ctx.fillStyle=palette.hair;
  ctx.beginPath();ctx.moveTo(-21,-63);ctx.quadraticCurveTo(-19,-93,0,-86);
  ctx.quadraticCurveTo(26,-86,21,-61);ctx.lineTo(12,-69);
  ctx.quadraticCurveTo(2,-57,-7,-68);ctx.lineTo(-21,-60);ctx.fill();
  rr(-22,-64,9,24,5,palette.hair);rr(14,-62,9,23,5,palette.hair);
 }else{
  ctx.fillStyle=palette.hair;ctx.beginPath();ctx.arc(0,-69,21,Math.PI,TAU);ctx.lineTo(14,-67);ctx.lineTo(-15,-62);ctx.closePath();ctx.fill();
 }
 circle(-6,-61,2.2,'#2b3c56');circle(7,-61,2.2,'#2b3c56');
 ctx.strokeStyle='#8c5265';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,-57,4,.12,Math.PI-.12);ctx.stroke();
 ctx.restore();
 ctx.save();ctx.font='900 11px Nunito,system-ui,sans-serif';ctx.textAlign='center';ctx.fillStyle='#18233d99';
 rr(x-28,y-113,buddy?56:52,17,8,'#18233ddd');
 text(palette.name,x,y-101,10,palette.edge);
 ctx.restore();
}
function renderParticles(){
 for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);
  circle(p.x,p.y,p.size,p.color);
 }
 ctx.globalAlpha=1;
 if(G.rescueFx>0&&P&&Z){
  ctx.save();ctx.globalAlpha=clamp(G.rescueFx,0,1);
  ctx.setLineDash([8,7]);ctx.lineWidth=4;ctx.strokeStyle='#ffe6aa';
  ctx.beginPath();ctx.moveTo(P.x,P.y-34);ctx.quadraticCurveTo((P.x+Z.x)/2,(P.y+Z.y)/2-115,Z.x,Z.y-34);ctx.stroke();ctx.restore();
 }
}
function render(){
 if(!ctx)return;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
 scale=width/viewW;viewH=height/scale;camY=FLOOR-viewH*.71;
 if(P){let target=clamp(P.x-viewW*.38,0,Math.max(0,WORLD-viewW));camX+=(target-camX)*.12}
 ctx.save();ctx.scale(scale,scale);ctx.translate(-camX,-camY);
 if(!room)room=ROOM_DEFS[0];
 renderSky();renderGround();renderPuzzle();renderGoal();
 renderCharacter(P);renderCharacter(Z);renderParticles();
 ctx.restore();
}
function frame(t){
 const dt=clamp((t-last)/1000||.016,0,.033);last=t;
 gameStep(dt);render();raf=requestAnimationFrame(frame);
}
function keyState(key,on){
 if(key==='arrowleft'||key==='a')input.left=on;
 if(key==='arrowright'||key==='d')input.right=on;
 if(on&&(key===' '||key==='arrowup'||key==='w'))input.jump=true;
}
function bindTouch(elId,action){
 const el=$(elId);if(!el)return;
 const down=e=>{if(e.cancelable)e.preventDefault();el.classList.add('pressed');
  if(action==='jump')input.jump=true;else input[action]=true;
  try{el.setPointerCapture(e.pointerId)}catch{}
 };
 const up=e=>{if(e.cancelable)e.preventDefault();el.classList.remove('pressed');
  if(action!=='jump')input[action]=false;
 };
 el.addEventListener('pointerdown',down);el.addEventListener('pointerup',up);
 el.addEventListener('pointercancel',up);el.addEventListener('lostpointercapture',up);
}
function parseCommand(str){
 const t=str.trim().toLowerCase();
 if(!t)return null;
 if(/等|停一下|別動|停住|wait/.test(t))return 'wait';
 if(/幫|救|過來|help/.test(t))return 'help';
 if(/先走|探路|去前面|lead|先去/.test(t))return 'lead';
 if(/跟|一起走|follow|回來/.test(t))return 'follow';
 return null;
}
function init(){
 readMemory();resetRoom();G.phase='ready';
 $('startBtn').addEventListener('click',startRun);
 for(const b of document.querySelectorAll('[data-command]'))b.addEventListener('click',()=>setCommand(b.dataset.command));
 $('sayForm').addEventListener('submit',e=>{
  e.preventDefault();const text=$('sayInput').value;const cmd=parseCommand(text);
  if(cmd)setCommand(cmd);
  else announce('我現在聽得懂「跟著我、你先走、等我、幫幫我」這幾種指令喔！',true);
  $('sayInput').value='';
 });
 bindTouch('leftBtn','left');bindTouch('rightBtn','right');bindTouch('jumpBtn','jump');
 window.addEventListener('keydown',e=>{
  const t=e.target;if(t&&['INPUT','TEXTAREA'].includes(t.tagName))return;
  const k=e.key.toLowerCase();
  if(['arrowleft','arrowright','arrowup',' ','w','a','d'].includes(k))e.preventDefault();
  keyState(k,true);
 });
 window.addEventListener('keyup',e=>keyState(e.key.toLowerCase(),false));
 window.addEventListener('blur',()=>{input.left=false;input.right=false;input.jump=false;});
 window.addEventListener('resize',resize);
 if(window.ResizeObserver)new ResizeObserver(resize).observe($('stageFrame'));
 resize();last=performance.now();raf=requestAnimationFrame(frame);
}
const params=new URLSearchParams(location.search);
if(params.get('qa')==='1'){
 Object.defineProperty(window,'__BUDDY_QA__',{value:{
  state:()=>({phase:G.phase,room:room.id,roomIndex:G.roomIndex,sequence:[...G.sequence],time:G.time,
   player:{...P},zoe:{...Z},flags:{...G.roomFlags},command:G.command,stats:{...G.stats},
   events:[...G.events],gateOpen:gateOpen(),bridgeActive:bridgeActive(),done:G.completed}),
  start:startRun,room:(id)=>{const pos=G.sequence.indexOf(ROOM_DEFS.findIndex(r=>r.id===id));if(pos<0)throw Error('Unknown room');G.roomIndex=pos;G.phase='playing';resetRoom()},
  step:gameStep,command:setCommand,jump:()=>tryJump(P),
  place:(who,x,y=FLOOR)=>{const obj=who==='zoe'?Z:P;obj.x=x;obj.y=y;obj.vy=0;obj.onGround=true},
  rescue:()=>rescue(P),finish:finishRun,updatePuzzle,aiStep,
  parseCommand,rooms:ROOM_DEFS.map(r=>r.id)
 }});
}
init();
})();