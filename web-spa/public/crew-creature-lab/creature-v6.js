/* Crew Creature Lab V1.1 — chat with Zoe, collect energy, inject it to evolve
 * a creature. First evolution draws a weighted-random species, while
 * a gift egg always hatches its explicitly chosen species. Energy is the fuel: one
 * sentence = 1 energy; evolution costs 2/4/5/5 (16 total) and only
 * happens when the user taps the evolve button. Every evolution grants
 * a gift; completing a creature grants one more. Gifts hold eggs,
 * energy packs, and permanent companions drawn into the scene.
 * A completed creature stays on screen (final form) until the user
 * taps "start the next one". Pure state + art loading; no procedural
 * painter for the creature itself, no backend, no dependency. The
 * creature is shown as one full-bleed AI image per (line, stage).
 */
(function(root){'use strict';
const W=780,H=1560,TAU=Math.PI*2;
const CREATURE_STAGES=['egg','baby','growing','mature','final'];
const EVOLVE_COSTS=[2,4,5,5];
const CREATURE_LINES={
 moonfox:{id:'moonfox',name:'月狐',icon:'🦊',color:'#c5b8ff',
  note:'月光下誕生的銀白狐狸，額頭的彎月會隨著你的話發光。',
  topics:['dream','love','cosmos']},
 stardragon:{id:'stardragon',name:'星龍',icon:'🐉',color:'#6ee7ff',
  note:'身上有星星紋路的小龍，喜歡冒險和遠方。',
  topics:['travel','tech','play']},
 flowerfairy:{id:'flowerfairy',name:'花妖精',icon:'🧚',color:'#ffb5cc',
  note:'花瓣翅膀的小精靈，身邊總有花粉在發光。',
  topics:['nature','food','music']},
 cat:{id:'cat',name:'小貓咪',icon:'🐱',color:'#ffc978',
  note:'圓圓胖胖的奶油橘貓，最喜歡待在你身邊。',
  topics:['animals','daily','weather','stress']},
 snowbunny:{id:'snowbunny',name:'雪兔',icon:'🐰',color:'#a8d8ff',
  note:'月光雪地裡的小白兔，耳朵尖端的冰藍光會隨著你的話發亮。',
  topics:['snow']},
 redpanda:{id:'redpanda',name:'小熊貓',icon:'🦝',color:'#ff9e7a',
  note:'竹林裡的紅褐色小傢伙，條紋尾巴總是翹得高高的。',
  topics:['bamboo']},
 dolphin:{id:'dolphin',name:'海豚',icon:'🐬',color:'#5aa8ff',
  note:'星空下躍出海面的小海豚，笑起來像一道彎彎的月亮。',
  topics:['ocean']},
 phoenix:{id:'phoenix',name:'鳳凰',icon:'🦅',color:'#ffb84d',
  note:'金紅色羽毛的小鳳凰，尾羽的火焰光會隨著你的話燃燒。',
  topics:['fire']}};
const LINE_IDS=Object.keys(CREATURE_LINES);
// Mystery-egg hatch odds (percent); gift eggs keep their specified species.
const CREATURE_WEIGHTS=Object.freeze({
 cat:18,flowerfairy:17,snowbunny:16,redpanda:14,
 dolphin:13,moonfox:10,stardragon:8,phoenix:4
});
const WEIGHTED_LINES=Object.entries(CREATURE_WEIGHTS);
const TOTAL_LINE_WEIGHT=WEIGHTED_LINES.reduce((n,[,w])=>n+w,0);
function rollCreatureLine(rand){
 const value=typeof rand==='function'?rand():Math.random();
 let ticket=Math.min(Math.max(Number.isFinite(value)?value:0,0),1-Number.EPSILON)*TOTAL_LINE_WEIGHT;
 for(const [id,weight] of WEIGHTED_LINES){
  if(ticket<weight)return id;
  ticket-=weight;
 }
 return WEIGHTED_LINES[WEIGHTED_LINES.length-1][0];
}
const ART_DIR='./art/creatures/';
const artCache=new Map();
function artImage(line,stageName){
 if(typeof Image!=='function')return null;
 const key=line+'|'+stageName;
 if(artCache.has(key))return artCache.get(key);
 if(!CREATURE_LINES[line]||!CREATURE_STAGES.includes(stageName)){artCache.set(key,null);return null;}
 const img=new Image();
 img.src=ART_DIR+line+'-'+stageName+'.webp';
 artCache.set(key,img);
 return img;
}
function artReady(img){return !!(img&&img.complete&&img.naturalWidth>0&&img.naturalHeight>0);}
function preloadArt(lineId){
 const lines=lineId&&CREATURE_LINES[lineId]?[lineId]:LINE_IDS;
 for(const line of lines)
  for(const st of CREATURE_STAGES)artImage(line,st);
}
function drawArt(c,line,stageName,alpha){
 const img=artImage(line,stageName);
 if(!artReady(img))return false;
 const iw=img.naturalWidth,ih=img.naturalHeight;
 if(!iw||!ih)return false;
 c.save();c.globalAlpha*=alpha;
 c.drawImage(img,0,0,W,H);
 c.restore();
 return true;
}
function evolveCost(stage){return stage>=0&&stage<4?EVOLVE_COSTS[stage]:null;}
function dominantTopic(topics){
 if(!Array.isArray(topics)||!topics.length)return 'daily';
 const counts={};
 for(const t of topics)counts[t]=(counts[t]||0)+1;
 let best='daily',bestN=0;
 for(const t of topics){if(counts[t]>bestN){bestN=counts[t];best=t;}}
 return best;
}
function newCreature(){return {line:null,stage:0,topics:[],sentences:0};}
function empty(){return {version:1,energy:0,creature:newCreature(),collection:[],gifts:0,giftCollection:{},lastDailyGift:null};}
const goodLine=id=>!!CREATURE_LINES[id];
function cleanCreature(c){
 if(!c||typeof c!=='object')return null;
 if(!Number.isSafeInteger(c.stage)||c.stage<0||c.stage>4)return null;
 if(c.line!==null&&!goodLine(c.line))return null;
 if(!Array.isArray(c.topics))return null;
 return {line:c.line,stage:c.stage,topics:c.topics.slice(0,64).filter(x=>typeof x==='string'),sentences:Number.isSafeInteger(c.sentences)?Math.max(0,c.sentences):0};
}
function restore(raw){
 const base=empty();
 if(!raw||raw.version!==1)return base;
 if(Number.isSafeInteger(raw.energy)&&raw.energy>=0)base.energy=Math.min(raw.energy,9999);
 const cur=cleanCreature(raw.creature);
 if(cur)base.creature=cur;
 if(Array.isArray(raw.collection))
  base.collection=raw.collection.slice(0,64).map(cleanCreature).filter(x=>x&&x.line&&x.stage===4);
 // v1.1 rename: gifts / giftCollection / lastDailyGift. Accept the old
 // v1 field names (boxes / boxCollection / lastDailyBox) and migrate them
 // so an existing save keeps its gifts instead of resetting to zero.
 const giftCount=Number.isSafeInteger(raw.gifts)?raw.gifts:raw.boxes;
 if(Number.isSafeInteger(giftCount)&&giftCount>=0)base.gifts=Math.min(giftCount,999);
 const oldCollection=(raw.giftCollection&&typeof raw.giftCollection==='object')?raw.giftCollection:
  (raw.boxCollection&&typeof raw.boxCollection==='object')?raw.boxCollection:null;
 if(oldCollection)
  for(const item of GIFT_ITEMS){
   const n=oldCollection[item.id];
   if(Number.isSafeInteger(n)&&n>0)base.giftCollection[item.id]=Math.min(n,99);
  }
 const lastDaily=typeof raw.lastDailyGift==='string'?raw.lastDailyGift:raw.lastDailyBox;
 if(typeof lastDaily==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(lastDaily))base.lastDailyGift=lastDaily;
 return base;
}
function gainEnergy(g){
 if(!g||typeof g!=='object')return 0;
 g.energy=Math.min((g.energy||0)+1,9999);
 return g.energy;
}
function canEvolve(g){
 if(!g||!g.creature)return false;
 const cost=evolveCost(g.creature.stage);
 return cost!==null&&(g.energy||0)>=cost;
}
function evolve(g,rand){
 if(!canEvolve(g))return null;
 const cost=evolveCost(g.creature.stage);
 g.energy-=cost;
 const c=g.creature;
 c.stage++;
 if(c.stage===1&&!c.line)c.line=rollCreatureLine(rand);
 const line=c.line;
 const completed=c.stage===4;
 let done=null;
 if(completed){
  // v1.1: the finished creature stays on screen (stage 4) so the user
  // can see the final form and save it. The UI calls startNewCreature()
  // when the user taps "start the next one"; only then is the creature
  // reset to a fresh egg.
  done={line,topics:c.topics.slice(),stage:4};
  g.collection.unshift(done);
  g.collection=g.collection.slice(0,64);
 }
 return {line,stage:c.stage,cost,completed,done};
}
function startNewCreature(g){
 if(!g||typeof g!=='object')return false;
 g.creature=newCreature();
 return true;
}
function hatchEgg(g,lineId){
 if(!g||typeof g!=='object'||!goodLine(lineId))return false;
 const itemId='egg-'+lineId;
 if(!(g.giftCollection&&g.giftCollection[itemId]>0))return false;
 g.giftCollection[itemId]--;
 if(g.giftCollection[itemId]<=0)delete g.giftCollection[itemId];
 g.creature=newCreature();
 g.creature.line=lineId;
 return true;
}
// Gift pool v1.3 (16 items, weights sum 173): eggs hatch a chosen line;
// energy packs top up the meter; companions are permanent and are drawn
// into the scene. A duplicate companion re-rolls into a random egg.
const GIFT_RARITY={
 common:{name:'普通',color:'#b9b3c9'},
 rare:{name:'稀有',color:'#6ee7ff'},
 epic:{name:'史詩',color:'#c5b8ff'},
 legend:{name:'傳說',color:'#ffd76a'}};
const GIFT_ITEMS=[
 {id:'egg-cat',kind:'egg',line:'cat',name:'小貓咪的蛋',icon:'🐱',rarity:'common',weight:25,note:'孵出小貓咪。'},
 {id:'egg-flowerfairy',kind:'egg',line:'flowerfairy',name:'花妖精的蛋',icon:'🧚',rarity:'common',weight:22,note:'孵出花妖精。'},
 {id:'egg-moonfox',kind:'egg',line:'moonfox',name:'月狐的蛋',icon:'🦊',rarity:'rare',weight:12,note:'孵出月狐。'},
 {id:'egg-stardragon',kind:'egg',line:'stardragon',name:'星龍的蛋',icon:'🐉',rarity:'rare',weight:10,note:'孵出星龍。'},
 {id:'egg-snowbunny',kind:'egg',line:'snowbunny',name:'雪兔的蛋',icon:'🐰',rarity:'common',weight:18,note:'孵出雪兔。'},
 {id:'egg-redpanda',kind:'egg',line:'redpanda',name:'小熊貓的蛋',icon:'🦝',rarity:'common',weight:16,note:'孵出小熊貓。'},
 {id:'egg-dolphin',kind:'egg',line:'dolphin',name:'海豚的蛋',icon:'🐬',rarity:'common',weight:14,note:'孵出海豚。'},
 {id:'egg-phoenix',kind:'egg',line:'phoenix',name:'鳳凰的蛋',icon:'🦅',rarity:'rare',weight:8,note:'孵出鳳凰。'},
 {id:'energy-small',kind:'energy',amount:3,name:'小能量包',icon:'⚡',rarity:'common',weight:15,note:'能量 +3。'},
 {id:'energy-large',kind:'energy',amount:8,name:'大能量包',icon:'🌟',rarity:'epic',weight:6,note:'能量 +8。'},
 {id:'companion-firefly',kind:'companion',name:'螢火蟲',icon:'✨',rarity:'common',weight:8,note:'螢火蟲住進來了，夜裡會繞著你的生物飛舞。'},
 {id:'companion-mushroom',kind:'companion',name:'小蘑菇',icon:'🍄',rarity:'common',weight:5,note:'小蘑菇在生物腳邊發光，超可愛。'},
 {id:'companion-butterfly',kind:'companion',name:'蝴蝶',icon:'🦋',rarity:'rare',weight:4,note:'蝴蝶來了，會在畫面中間畫 8 字飛舞。'},
 {id:'companion-lantern',kind:'companion',name:'小燈籠',icon:'🏮',rarity:'rare',weight:3,note:'小燈籠掛在右上角，輕輕搖晃發光。'},
 {id:'companion-star',kind:'companion',name:'小星星',icon:'⭐',rarity:'common',weight:6,note:'小星星住進來了，夜裡在左上方一閃一閃。'},
 {id:'egg-golden',kind:'egg',line:null,name:'金蛋',icon:'🥚',rarity:'legend',weight:1,note:'孵出隨機稀有生物（月狐或星龍）。'}];
function giftItems(){return GIFT_ITEMS.map(x=>({...x,rarityName:GIFT_RARITY[x.rarity].name,rarityColor:GIFT_RARITY[x.rarity].color}));}
function grantGift(g,reason,today){
 if(!g||typeof g!=='object')return false;
 if(reason==='daily'){
  if(typeof today!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(today))return false;
  if(g.lastDailyGift===today)return false;
  g.lastDailyGift=today;
 }else if(reason!=='evolve'&&reason!=='complete')return false;
 g.gifts=Math.min((g.gifts||0)+1,999);
 return true;
}
function rollGiftItem(rand,pool){
 const total=pool.reduce((s,x)=>s+x.weight,0);
 let r=(typeof rand==='function'?rand():Math.random())*total;
 for(const x of pool){r-=x.weight;if(r<0)return x;}
 return pool[pool.length-1];
}
function openGift(g,rand){
 if(!g||typeof g!=='object'||!(g.gifts>0))return null;
 g.gifts--;
 let item=rollGiftItem(rand,GIFT_ITEMS);
 if(item.id==='egg-golden'){
  const gl=(typeof rand==='function'?rand():Math.random())<0.5?'moonfox':'stardragon';
  item={...item,line:gl,name:'金蛋 · '+(gl==='moonfox'?'月狐':'星龍')};
 }
 if(!g.giftCollection)g.giftCollection={};
 let rerolled=false;
 if(item.kind==='companion'&&(g.giftCollection[item.id]||0)>0){
  // Already have this companion: re-roll into a random egg instead of
  // wasting the gift (same idea as the tree lab's duplicate rule).
  const eggs=GIFT_ITEMS.filter(x=>x.kind==='egg'&&x.line);
  item=rollGiftItem(rand,eggs);
  rerolled=true;
 }
 if(item.kind==='energy'){
  g.energy=Math.min((g.energy||0)+item.amount,9999);
 }else{
  const id=item.id==='egg-golden'?'egg-'+item.line:item.id;
  g.giftCollection[id]=Math.min((g.giftCollection[id]||0)+1,99);
  item={...item,id};
 }
 const out={...item,rarityName:GIFT_RARITY[item.rarity].name,rarityColor:GIFT_RARITY[item.rarity].color,rerolled};
 if(rerolled)out.note=(out.note||'')+'（已經有這位夥伴了，換成一顆蛋。）';
 return out;
}
// Procedural glowing companions, drawn on top of the creature art (same
// approach as the tree lab's drawResidents). Canvas is 780x1560.
function ellipse(c,x,y,rx,ry,color,rot=0){
 c.save();c.translate(x,y);c.rotate(rot);
 c.fillStyle=color;c.beginPath();c.ellipse(0,0,rx,ry,0,0,TAU);c.fill();c.restore();
}
function glow(c,x,y,r,color,alpha=1){
 c.save();c.globalAlpha*=alpha;
 const g=c.createRadialGradient(x,y,0,x,y,r);
 g.addColorStop(0,color);g.addColorStop(.24,color+'a8');g.addColorStop(1,color+'00');
 c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.restore();
}
function drawCompanions(c,collection,time=0,still=false){
 if(!c||!collection||typeof collection!=='object')return;
 const t=still?0:time;
 c.save();
 if(collection['companion-firefly']>0){
  for(let i=0;i<3;i++){
   const ph=i*2.0944,ang=t*.0006+ph,rad=170+Math.sin(t*.0009+ph*2)*36;
   const x=390+Math.cos(ang)*rad,y=480+Math.sin(ang)*rad*.62;
   const a=.55+.45*Math.sin(t*.004+ph*3);
   glow(c,x,y,16,'#ffe98a',.5*a+.2);
   ellipse(c,x,y,3.2,3.2,'#fff7c0');
  }
 }
 if(collection['companion-butterfly']>0){
  const a=t*.0008,bx=390+Math.sin(a)*150,by=700+Math.sin(a*2)*60;
  const flap=.6+.4*Math.sin(t*.02);
  glow(c,bx,by,26,'#c5b8ff',.35);
  ellipse(c,bx-9*flap,by,9*flap,5,'#c5b8ff',-.5);
  ellipse(c,bx+9*flap,by,9*flap,5,'#d9d2ff',.5);
  ellipse(c,bx,by,2.5,6,'#5b4390');
 }
 if(collection['companion-mushroom']>0){
  const caps=[[300,1405,11],[470,1410,13]];
  for(const [mx,my,mr] of caps){
   glow(c,mx,my-6,20,'#b48cff',.5);
   ellipse(c,mx,my,5,9,'#f2e8d5');
   c.fillStyle='#b48cff';c.beginPath();c.arc(mx,my-6,mr,Math.PI,TAU);c.fill();
  }
  ellipse(c,300,1399,3,3,'#ffffff');
  ellipse(c,470,1404,3,3,'#ffffff');
 }
 if(collection['companion-lantern']>0){
  const sw=still?0:Math.sin(t*.0012)*8,lx=560+sw;
  c.fillStyle='#8a6a4a';c.beginPath();
  c.moveTo(560,255);c.lineTo(lx,280);c.lineTo(lx+1,280);c.lineTo(561,255);c.closePath();c.fill();
  glow(c,lx,300,46,'#ffd98f',.55);
  ellipse(c,lx,300,16,20,'#ffd98f');
  c.fillStyle='#c98a4a';c.fillRect(lx-7,278,14,5);c.fillRect(lx-7,317,14,5);
 }
 if(collection['companion-star']>0){
  const tw=still?.8:.5+.5*Math.sin(t*.003);
  const sx=180,sy=170;
  glow(c,sx,sy,34,'#fff3a0',.5*tw+.15);
  ellipse(c,sx,sy,4,12,'#fff7c0');
  ellipse(c,sx,sy,12,4,'#fff7c0');
  ellipse(c,sx,sy,3,3,'#ffffff');
 }
 c.restore();
}
function paint(canvas,g,time=0,opts={}){
 if(!canvas||typeof canvas.getContext!=='function')return false;
 const c=canvas.getContext('2d');if(!c)return false;
 const width=opts.width||canvas.width||W,height=opts.height||canvas.height||H;
 const dpr=opts.dpr||1;
 c.save();c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);
 c.scale(width/W,height/H);
 const cur=g&&g.creature?g.creature:newCreature();
 const line=cur.line||'moonfox';
 const st=CREATURE_STAGES[cur.stage]||'egg';
 const shown=drawArt(c,line,st,1);
 if(!shown){
  // v1.4: never a flat black board while the art loads — a night-sky
  // gradient with a big egg and a loading line instead.
  const g2=c.createLinearGradient(0,0,0,H);
  g2.addColorStop(0,'#2b2144');g2.addColorStop(.55,'#1d1533');g2.addColorStop(1,'#14101f');
  c.fillStyle=g2;c.fillRect(0,0,W,H);
  c.fillStyle='#F7F7F4';c.font='120px system-ui';c.textAlign='center';
  c.fillText('🥚',W/2,H/2-40);
  c.font='500 28px system-ui';
  c.fillText('生物正在孵化…',W/2,H/2+60);
  c.fillStyle='#b9b3c9';c.font='400 22px system-ui';
  c.fillText('圖片載入中，稍等一下',W/2,H/2+100);
 }
 drawCompanions(c,g&&g.giftCollection?g.giftCollection:{},time,!!opts.still);
 if(opts.reveal&&opts.reveal.started&&time-opts.reveal.started<260&&!opts.still){
  c.fillStyle='#fff1c58c';c.fillRect(0,0,W,H);
 }
 c.restore();return true;
}
root.CrewCreatureV1=Object.freeze({
 W,H,CREATURE_STAGES,EVOLVE_COSTS,CREATURE_LINES,LINE_IDS,CREATURE_WEIGHTS,
 evolveCost,dominantTopic,rollCreatureLine,
 newCreature,empty,restore,gainEnergy,canEvolve,evolve,startNewCreature,hatchEgg,
 giftItems,grantGift,openGift,artImage,artReady,preloadArt,drawArt,drawCompanions,paint
});
})(typeof window!=='undefined'?window:globalThis);
