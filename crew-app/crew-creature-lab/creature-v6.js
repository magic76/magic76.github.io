/* Crew Creature Lab V1 — chat with Zoe, collect energy, inject it to evolve
 * a creature. A creature's line is decided by the dominant topic of the
 * conversation (revealed at the first evolution, egg -> baby), or by
 * hatching a specific egg from a blind box. Energy is the fuel: one
 * sentence = 1 energy; evolution costs 2/4/5/5 (16 total) and only
 * happens when the user taps the evolve button. Pure state + art
 * loading; no procedural painter, no backend, no dependency. The
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
  topics:['animals','daily','weather','stress']}};
const LINE_IDS=Object.keys(CREATURE_LINES);
const TOPIC_TO_LINE={};
for(const id of LINE_IDS)for(const t of CREATURE_LINES[id].topics)TOPIC_TO_LINE[t]=id;
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
function lineForTopics(topics){
 const topic=dominantTopic(topics);
 return TOPIC_TO_LINE[topic]||'cat';
}
function newCreature(){return {line:null,stage:0,topics:[],sentences:0};}
function empty(){return {version:1,energy:0,creature:newCreature(),collection:[],boxes:0,boxCollection:{},lastDailyBox:null};}
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
 if(Number.isSafeInteger(raw.boxes)&&raw.boxes>=0)base.boxes=Math.min(raw.boxes,999);
 if(raw.boxCollection&&typeof raw.boxCollection==='object')
  for(const item of BOX_ITEMS){
   const n=raw.boxCollection[item.id];
   if(Number.isSafeInteger(n)&&n>0)base.boxCollection[item.id]=item.kind==='egg'?Math.min(n,99):Math.min(n,99);
  }
 if(typeof raw.lastDailyBox==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(raw.lastDailyBox))base.lastDailyBox=raw.lastDailyBox;
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
function evolve(g){
 if(!canEvolve(g))return null;
 const cost=evolveCost(g.creature.stage);
 g.energy-=cost;
 const c=g.creature;
 c.stage++;
 if(c.stage===1&&!c.line)c.line=lineForTopics(c.topics);
 const line=c.line;
 const completed=c.stage===4;
 let done=null;
 if(completed){
  done={line,topics:c.topics.slice(),stage:4};
  g.collection.unshift(done);
  g.collection=g.collection.slice(0,64);
  g.creature=newCreature();
 }
 return {line,stage:c.stage,cost,completed,done};
}
function hatchEgg(g,lineId){
 if(!g||typeof g!=='object'||!goodLine(lineId))return false;
 const itemId='egg-'+lineId;
 if(!(g.boxCollection&&g.boxCollection[itemId]>0))return false;
 g.boxCollection[itemId]--;
 if(g.boxCollection[itemId]<=0)delete g.boxCollection[itemId];
 g.creature=newCreature();
 g.creature.line=lineId;
 return true;
}
// Blind box v1 (creatures): eggs hatch a chosen line; energy packs top up
// the meter. A duplicate egg is still useful (it is consumable), so no
// re-roll is needed.
const BOX_RARITY={
 common:{name:'普通',color:'#b9b3c9'},
 rare:{name:'稀有',color:'#6ee7ff'},
 epic:{name:'史詩',color:'#c5b8ff'},
 legend:{name:'傳說',color:'#ffd76a'}};
const BOX_ITEMS=[
 {id:'egg-cat',kind:'egg',line:'cat',name:'小貓咪的蛋',icon:'🐱',rarity:'common',weight:26,note:'孵出小貓咪。'},
 {id:'egg-flowerfairy',kind:'egg',line:'flowerfairy',name:'花妖精的蛋',icon:'🧚',rarity:'common',weight:22,note:'孵出花妖精。'},
 {id:'egg-moonfox',kind:'egg',line:'moonfox',name:'月狐的蛋',icon:'🦊',rarity:'rare',weight:14,note:'孵出月狐。'},
 {id:'egg-stardragon',kind:'egg',line:'stardragon',name:'星龍的蛋',icon:'🐉',rarity:'rare',weight:12,note:'孵出星龍。'},
 {id:'energy-small',kind:'energy',amount:3,name:'小能量包',icon:'⚡',rarity:'common',weight:14,note:'能量 +3。'},
 {id:'energy-large',kind:'energy',amount:8,name:'大能量包',icon:'🌟',rarity:'epic',weight:8,note:'能量 +8。'},
 {id:'egg-golden',kind:'egg',line:null,name:'金蛋',icon:'🥚',rarity:'legend',weight:4,note:'孵出隨機稀有生物（月狐或星龍）。'}];
function boxItems(){return BOX_ITEMS.map(x=>({...x,rarityName:BOX_RARITY[x.rarity].name,rarityColor:BOX_RARITY[x.rarity].color}));}
function grantBox(g,reason,today){
 if(!g||typeof g!=='object')return false;
 if(reason==='daily'){
  if(typeof today!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(today))return false;
  if(g.lastDailyBox===today)return false;
  g.lastDailyBox=today;
 }else if(reason!=='complete')return false;
 g.boxes=Math.min((g.boxes||0)+1,999);
 return true;
}
function rollBoxItem(rand,pool){
 const total=pool.reduce((s,x)=>s+x.weight,0);
 let r=(typeof rand==='function'?rand():Math.random())*total;
 for(const x of pool){r-=x.weight;if(r<0)return x;}
 return pool[pool.length-1];
}
function openBox(g,rand){
 if(!g||typeof g!=='object'||!(g.boxes>0))return null;
 g.boxes--;
 let item=rollBoxItem(rand,BOX_ITEMS);
 if(item.id==='egg-golden'){
  const gl=(typeof rand==='function'?rand():Math.random())<0.5?'moonfox':'stardragon';
  item={...item,line:gl,name:'金蛋 · '+(gl==='moonfox'?'月狐':'星龍')};
 }
 if(!g.boxCollection)g.boxCollection={};
 if(item.kind==='energy'){
  g.energy=Math.min((g.energy||0)+item.amount,9999);
 }else{
  const id=item.id==='egg-golden'?'egg-'+item.line:item.id;
  g.boxCollection[id]=Math.min((g.boxCollection[id]||0)+1,99);
  item={...item,id};
 }
 return {...item,rarityName:BOX_RARITY[item.rarity].name,rarityColor:BOX_RARITY[item.rarity].color};
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
  c.fillStyle='#12101C';c.fillRect(0,0,W,H);
  c.fillStyle='#F7F7F4';c.font='700 44px system-ui';c.textAlign='center';
  c.fillText('🥚',W/2,H/2-20);
  c.font='500 28px system-ui';
  c.fillText('生物正在孵化…',W/2,H/2+40);
 }
 if(opts.reveal&&opts.reveal.started&&time-opts.reveal.started<260&&!opts.still){
  c.fillStyle='#fff1c58c';c.fillRect(0,0,W,H);
 }
 c.restore();return true;
}
root.CrewCreatureV1=Object.freeze({
 W,H,CREATURE_STAGES,EVOLVE_COSTS,CREATURE_LINES,LINE_IDS,TOPIC_TO_LINE,
 evolveCost,dominantTopic,lineForTopics,lineForTopic:t=>TOPIC_TO_LINE[t]||'cat',
 newCreature,empty,restore,gainEnergy,canEvolve,evolve,hatchEgg,
 boxItems,grantBox,openBox,artImage,artReady,preloadArt,drawArt,paint
});
})(typeof window!=='undefined'?window:globalThis);
