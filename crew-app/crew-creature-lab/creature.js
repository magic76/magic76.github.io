(()=>{'use strict';
const $=id=>document.getElementById(id);
const canvas=$('creatureCanvas'),ctx=canvas.getContext('2d');
const STATE_KEY='crew-creature-lab-v1',TAU=Math.PI*2;
const EXTERNAL_CHAT_REWARDS_KEY='crew-creature-chat-rewards-v1';
// External transcript content never enters the creature's save.
function externalChatRewardTotal(){
 try{
  const raw=JSON.parse(localStorage.getItem(EXTERNAL_CHAT_REWARDS_KEY)||'null');
  return raw&&raw.version===1&&Number.isSafeInteger(raw.total)&&raw.total>=0&&raw.total<=9999
   ?raw.total:null;
 }catch{return null;}
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const CRE=window.CrewCreatureV1;
const STAGE_NAMES=['蛋','幼體','成長體','成熟體','完全體'];
let state=CRE.empty(),reveal=null,toastTimer=0,surpriseTimer=0,renderTime=0,lastFrame=0,reduceMotion=false,sessionMessages=0;
let voiceBridge=null;
// v1.4: which line's note is expanded in the 8-line preview (tapping a
// card swaps its status line for the creature's note; re-render keeps it).
let previewNoteLine=null;
// v1.2 ceremony state. evolvePending holds the pre-evolution form so the
// canvas keeps showing it during the glow phase; evolving only drives the
// button's disabled state (never blocks doEvolve itself, so the QA hook
// stays synchronous). giftOpening guards the gift ceremony.
let evolvePending=null,evolving=false,evolveSeq=0,reactTimer=0,giftOpening=false;
let moodTimer=0,restTimer=0,creatureMood='idle',lastChatSignal=null,topicsExpanded=false;
function rng32(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function todayStr(){
 const d=new Date();
 return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function claimExternalChatRewards(){
 const total=externalChatRewardTotal();
 if(total===null||total<=state.externalEnergyClaimed)return false;
 const delta=total-state.externalEnergyClaimed;
 state.energy=Math.min(9999,state.energy+delta);
 state.externalEnergyClaimed=total;
 return true;
}
function loadState(){
 try{state=CRE.restore(JSON.parse(localStorage.getItem(STATE_KEY)||'null'));}
 catch{state=CRE.empty();}
 // The final creature remains on screen until a user chooses the next egg.
 if(claimExternalChatRewards())writeState();
}
function writeState(){
 // Another tab can earn energy before the Lab makes a new save.
 claimExternalChatRewards();
 try{localStorage.setItem(STATE_KEY,JSON.stringify(state));}catch{}
}
// v1.4: chat history lives in its own key (NOT inside the game state —
// CRE.restore() is whitelist-based and would drop an extra chat field).
// Last 30 messages, {who:'you'|'zoe', text}. Bubbles and toasts are not saved.
const CHAT_KEY='crew-creature-lab-v1-chat';
let chatLog=[];
function loadChat(){
 try{
  const raw=JSON.parse(localStorage.getItem(CHAT_KEY)||'null');
  chatLog=Array.isArray(raw)
   ?raw.filter(m=>m&&typeof m.text==='string'&&(m.who==='you'||m.who==='zoe')).slice(-30)
   :[];
 }catch{chatLog=[];}
}
function writeChat(){
 try{localStorage.setItem(CHAT_KEY,JSON.stringify(chatLog.slice(-30)));}catch{}
}
function restoreChat(){
 if(!chatLog.length)return false;
 $('messages').innerHTML='';
 for(const m of chatLog)appendMessage(m.who==='you'?'me':'zoe',m.text,{restore:true});
 return true;
}
// Topic classifier: same word lists as the tree lab (the chat side is
// shared), but every reply is about the creature, energy and evolution.
const TOPICS={
 food:{label:'食物',icon:'☕',color:'#ffcd9f',
  words:['咖啡','甜點','麵包','吃','餓','美食','蛋糕','火鍋','pizza','coffee','food','巧克力','奶茶','珍珠','糖果'],
  replies:['你說甜點，蛋殼好像聞到香味，輕輕動了一下！🍰','這句話有甜甜的能量，蛋殼上亮起一點糖霜光。','如果孵出來的生物愛吃蛋糕，我要先分牠一口！']},
 cosmos:{label:'宇宙',icon:'🪐',color:'#ddc2ff',
  words:['宇宙','星球','星星','銀河','太空','月亮','火星','外星','星際','galaxy','space','planet','星空','太陽系'],
  replies:['宇宙嗎？蛋裡的小傢伙好像想去太空冒險！','這句話帶著星星的能量，蛋殼閃了一下。✦','我們是不是不小心孵出一隻小宇宙生物？']},
 tech:{label:'科技',icon:'🤖',color:'#8deaf2',
  words:['ai','人工智慧','科技','程式','機器人','電腦','程式碼','coding','code','晶片','網路','agent','app','手機','發明'],
  replies:['等等，蛋殼上怎麼出現電路紋路了！🤖','如果牠會寫程式，你要不要讓牠幫忙工作？','這顆蛋正在偷偷更新韌體……']},
 travel:{label:'旅行',icon:'🧳',color:'#ffe7ad',
  words:['旅行','出國','海邊','海洋','山','日本','越南','飛機','旅遊','沙灘','travel','trip','冒險','地圖'],
  replies:['牠聽到旅行，蛋裡就開始躁動了！🧳','等牠孵出來，第一件事就是帶牠去冒險。','這句話有風的味道，蛋殼都想飛了。']},
 love:{label:'溫暖',icon:'💗',color:'#ffb5cc',
  words:['喜歡','愛','抱抱','想你','朋友','感謝','謝謝','開心','幸福','陪伴','戀愛','一起','love','heart'],
  replies:['聽你這樣說，蛋殼好像變溫暖了。💗','嘿，這句話讓蛋裡的小傢伙安心好多。','我有在聽喔，這段話就留在蛋殼上吧。']},
 weather:{label:'天氣',icon:'🌧',color:'#bbdbfa',
  words:['下雨','雨天','颱風','天氣','陰天','雲','風','雷','雪','冷','熱','rain','cloud','weather'],
  replies:['下雨了嗎？蛋殼上凝了一層小水珠。🌧','風一吹，蛋都輕輕搖了一下。','如果下起糖果雨，孵出來的生物一定很開心。']},
 nature:{label:'自然',icon:'🌿',color:'#b9edb1',
  words:['植物','樹','花','森林','草','陽光','種子','泥土','河','大自然','green','garden','葉子'],
  replies:['這次的能量有青草味，蛋殼上冒出一點小葉子。🌿','好多自然的能量！牠一定會喜歡森林。','我想在蛋旁邊放一朵很不守規矩的花。']},
 dream:{label:'夢境',icon:'🌙',color:'#ebd4ff',
  words:['夢','睡覺','晚安','做夢','夢想','枕頭','棉被','失眠','sleep','dream','未來','幻想'],
  replies:['牠是不是在蛋裡做夢？能量都變成月光了。🌙','今天先讓蛋休息一下，明天再努力孵。','我想把這句話掛到月亮旁邊。']},
 stress:{label:'心事',icon:'💭',color:'#cbb5e2',
  words:['壓力','煩','累','生氣','難過','工作','上班','抱怨','焦慮','辛苦','stress','sad','angry'],
  replies:['那就把煩惱變成能量吧，蛋會幫我們扛一點。','這股能量有點刺刺的，但牠好像很喜歡。','今天辛苦了，這顆蛋替我們加油。']},
 play:{label:'胡鬧',icon:'🎉',color:'#ffdf91',
  words:['哈哈','笑死','搞笑','亂','瘋','有趣','遊戲','玩','驚喜','奇怪','魔法','haha','lol','hahaha'],
  replies:['等一下，蛋剛剛是不是自己跳了一下！😂','這顆蛋根本沒有遵守孵化界的規定耶。','不行，我覺得牠還可以長得更荒謬！']},
 animals:{label:'動物',icon:'🐱',color:'#f9c3ac',
  words:['貓','狗','兔','熊','寵物','動物','小鳥','魚','恐龍','cat','dog','pet'],
  replies:['如果蛋裡真的是貓咪，你要負責餵喔！🐱','我聽到蛋殼裡有小腳印的聲音……','這顆蛋是不是想收養全世界的動物？']},
 music:{label:'音樂',icon:'🎵',color:'#d1c5ff',
  words:['音樂','唱歌','歌曲','耳機','舞蹈','跳舞','旋律','節奏','吉他','music','song','dance'],
  replies:['有聽到嗎？蛋殼正在偷偷哼歌。🎵','我們是不是孵出一隻會跟著節拍搖頭的生物？','牠長得這麼有節奏，該給牠一首主題曲！']},
 snow:{label:'雪',icon:'❄️',color:'#a8d8ff',
  words:['雪','下雪','冬天','冬季','滑雪','雪人','雪花','snow','winter','ski'],
  replies:['下雪了嗎？蛋殼上落了一片發光的雪花。❄️','這句話冷冰冰的，但蛋裡的小傢伙好像很喜歡冬天。','我想在蛋旁邊堆一個小雪人陪牠。']},
 bamboo:{label:'竹林',icon:'🎋',color:'#b9edb1',
  words:['竹子','竹林','竹','熊貓','小熊貓','森林','bamboo','panda'],
  replies:['竹林的能量！蛋殼上冒出一片小竹葉。🎋','這句話有竹子的清香，蛋都想長高了。','如果孵出來的生物愛吃竹子，我要先準備一根！']},
 ocean:{label:'海洋',icon:'🌊',color:'#5aa8ff',
  words:['海洋','海','沙灘','海邊','游泳','衝浪','海豚','ocean','sea','swim','surf','beach'],
  replies:['海的味道！蛋殼上泛起一點藍色的光。🌊','這句話有浪的聲音，蛋都輕輕搖了起來。','等牠孵出來，第一件事就是帶牠去看海。']},
 fire:{label:'火焰',icon:'🔥',color:'#ffb84d',
  words:['火','火焰','鳳凰','重生','夢想','fire','phoenix','flame'],
  replies:['這句話帶著火光，蛋殼都變暖了。🔥','鳳凰的能量！蛋裡的小傢伙好像想重生了。','這股能量熱熱的，蛋殼上亮起一點火焰。']},
 daily:{label:'日常',icon:'🌱',color:'#b7e9c4',
  words:[],replies:['你說的這件事，我想留一點能量記住。','好奇怪，隨便聊聊，能量就真的長出來了。','再說一點，我想看蛋殼會變成什麼顏色！']}
};
function classify(message){
 const input=String(message).toLowerCase();
 let scores={};for(const [key,t] of Object.entries(TOPICS)){
  if(key==='daily')continue;
  const match=t.words.reduce((n,w)=>n+(input.includes(w.toLowerCase())?1+Math.min(.7,w.length*.1):0),0);
  if(match>0)scores[key]=match;
 }
 const ordered=Object.entries(scores).sort((a,b)=>b[1]-a[1]);
 const topic=ordered.length?ordered[0][0]:'daily';
 const happy=(input.match(/開心|哈哈|幸福|好棒|喜歡|快樂|好笑|期待|happy|love|fun/gi)||[]).length;
 const sad=(input.match(/難過|煩|壓力|累|生氣|失望|焦慮|sad|stress|tired/gi)||[]).length;
 return {topic,mood:clamp((happy-sad)*.38,-1,1),energy:clamp(.35+input.length/100,0,1),
  keywords:Object.keys(scores)};
}
function sayZoe(signal,turn){
 const t=TOPICS[signal.topic];
 const idx=Math.floor(rng32((state.creature.sentences*2654435761+turn*8411)>>>0)()*t.replies.length);
 return t.replies[idx];
}
function popToast(message){
 const el=$('growthToast');el.textContent=message;el.classList.remove('show');
 void el.offsetWidth;el.classList.add('show');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1800);
}
// v1.2: a burst of sparkles over the canvas (chat reactions, evolution).
// DOM spans with a CSS pop animation; each removes itself when done.
function burstStars(n){
 const wrap=$('canvasWrap');if(!wrap||!wrap.appendChild)return;
 for(let i=0;i<n;i++){
  const s=document.createElement('span');
  s.className='sparkle';s.textContent='✨';
  s.style.left=(12+Math.random()*72)+'%';
  s.style.top=(14+Math.random()*58)+'%';
  s.style.animationDelay=(Math.random()*0.15)+'s';
  wrap.appendChild(s);
  setTimeout(()=>{if(s.remove)s.remove();},1200);
 }
}
function bounceCanvas(){
 const el=$('creatureCanvas');if(!el)return;
 el.classList.remove('bounce');void el.offsetWidth;el.classList.add('bounce');
 setTimeout(()=>{el.classList.remove('bounce');},550);
}
// v1.2: every chat sentence makes the creature react — a bounce, a few
// sparkles, and one reaction line in a bubble (never written to the chat
// log; it lives only in the creature area for 2 seconds).
const REACT_LINES={
 moonfox:'月狐開心地搖了搖尾巴。',
 stardragon:'星龍興奮地拍了拍小翅膀。',
 flowerfairy:'花妖精灑出一點發光花粉。',
 cat:'小貓咪滿足地呼嚕了一聲。',
 snowbunny:'雪兔抖了抖長耳朵，雪花都亮了。',
 redpanda:'小熊貓抱著尾巴，開心地晃了晃。',
 dolphin:'海豚躍出水面，濺起發光的水花。',
 phoenix:'鳳凰抖了抖羽毛，火光都亮了。',
 egg:'蛋輕輕晃了一下。'};
const PET_LINES={
 moonfox:'月狐親暱地用尾巴碰碰你的手。',
 stardragon:'星龍繞著你的手指興奮地轉圈。',
 flowerfairy:'花妖精在你的手心撒下一片花瓣。',
 cat:'小貓咪舒服地瞇起眼睛呼嚕呼嚕。',
 snowbunny:'雪兔把長耳朵輕輕靠向你。',
 redpanda:'小熊貓抱住你的手，翹起尾巴。',
 dolphin:'海豚開心地朝你噴出一道小水花。',
 phoenix:'鳳凰用暖暖的羽毛蹭蹭你的手。',
 egg:'蛋暖暖地動了一下，像在回應你的手。'
};
const CREATURE_SKILLS={
 moonfox:'月光守護',stardragon:'星河探險',flowerfairy:'花粉魔法',
 cat:'暖心呼嚕',snowbunny:'冰晶跳躍',redpanda:'竹葉旋舞',
 dolphin:'海浪嬉戲',phoenix:'微光重生'
};
const MOOD_ICONS={happy:'✨',play:'🎶',comfort:'💗',pet:'💕',rest:'💤'};
function setCreatureMood(mood){
 const wrap=$('canvasWrap'),sticker=$('moodSticker');
 if(!wrap||!sticker)return;
 clearTimeout(moodTimer);clearTimeout(restTimer);
 for(const type of Object.keys(MOOD_ICONS))wrap.classList.remove('mood-'+type);
 creatureMood=mood;
 sticker.hidden=mood==='idle';
 if(mood!=='idle'){
  wrap.classList.add('mood-'+mood);
  sticker.textContent=MOOD_ICONS[mood]||'✨';
 }
 // No permanent animation timers: rest is a one-shot state until interaction.
 if(mood==='idle')restTimer=setTimeout(()=>{if(!document.hidden&&!evolving)setCreatureMood('rest');},18000);
 else if(mood!=='rest')moodTimer=setTimeout(()=>setCreatureMood('idle'),2300);
}
function showReaction(text){
 const bubble=$('reactBubble');if(!bubble)return;
 bubble.textContent=text;
 bubble.hidden=false;
 bubble.classList.remove('show');void bubble.offsetWidth;bubble.classList.add('show');
 clearTimeout(reactTimer);
 reactTimer=setTimeout(()=>{bubble.classList.remove('show');bubble.hidden=true;},2000);
}
function reactToChat(){
 bounceCanvas();
 burstStars(5);
 const mood=lastChatSignal&&lastChatSignal.mood<-.3?'comfort':
  lastChatSignal&&lastChatSignal.mood>.3?'happy':
  state.creature.sentences%2?'play':'happy';
 setCreatureMood(mood);
 const line=state.creature.line||'egg';
 showReaction(REACT_LINES[line]||REACT_LINES.egg);
}
// v1.2: tap the creature to pet it — a bounce and a heart floating up
// from where you tapped. No energy, just for fun. Works while the final
// form is on display too.
function petCreature(ev){
 const wrap=$('canvasWrap');if(!wrap||!ev)return;
 if(ev.target&&ev.target.closest&&ev.target.closest('button'))return;
 bounceCanvas();
 setCreatureMood('pet');
 const line=state.creature.line||'egg';
 showReaction(PET_LINES[line]||PET_LINES.egg);
 const rect=wrap.getBoundingClientRect?wrap.getBoundingClientRect():{left:0,top:0,width:390,height:600};
 const w=rect.width||390,h=rect.height||600;
 const x=clamp(((ev.clientX-(rect.left||0))/w)*100,4,96);
 const y=clamp(((ev.clientY-(rect.top||0))/h)*100,4,96);
 const heart=document.createElement('span');
 heart.className='pet-heart';heart.textContent='💗';
 heart.style.left=(x+(Math.random()*6-3))+'%';
 heart.style.top=(y+(Math.random()*4-2))+'%';
 wrap.appendChild(heart);
 setTimeout(()=>{if(heart.remove)heart.remove();},1050);
}
function clearSurprise(){
 clearTimeout(surpriseTimer);surpriseTimer=0;
 const moment=$('surpriseMoment');
 if(moment){moment.hidden=true;moment.classList.remove('enter');}
}
function cueSurprise(event){
 if(!event)return;
 clearTimeout(toastTimer);toastTimer=0;
 $('growthToast').classList.remove('show');
 clearSurprise();
 const moment=$('surpriseMoment');moment.hidden=false;
 $('surpriseIcon').textContent=event.emoji;
 $('surpriseTitle').textContent=event.title;$('surpriseDetail').textContent=event.detail;
 moment.classList.remove('enter');void moment.offsetWidth;moment.classList.add('enter');
 surpriseTimer=setTimeout(clearSurprise,3300);
}
function creatureName(){
 const c=state.creature;
 if(!c.line)return '🥚 神秘的蛋';
 const line=CRE.CREATURE_LINES[c.line];
 return line.icon+' '+line.name+' · '+STAGE_NAMES[c.stage];
}
// The local Zoe prototype reuses the previous conversation topic for a
// creature-specific, tappable next-day invitation. No server or new endpoint.
const CARE_SCENES={
 ocean:{place:'海邊',options:['撿貝殼','看夕陽'],reactions:['把一顆漂亮的貝殼珍藏起來。','在晚霞下開心地轉了一圈。']},
 travel:{place:'旅行',options:['去探險','看地圖'],reactions:['勇敢地往前走了幾步。','用爪子在地圖上畫了一顆星星。']},
 cosmos:{place:'星空',options:['數星星','追流星'],reactions:['數到第三顆星就開心地跳了起來。','看著流星許了一個小願望。']},
 animals:{place:'小動物',options:['交朋友','玩捉迷藏'],reactions:['跟新朋友輕輕碰了碰鼻子。','從樹後探出頭跟你眨了眨眼。']},
 nature:{place:'花園',options:['澆花','找蝴蝶'],reactions:['替一朵小花澆了水。','跟著蝴蝶慢慢轉了一圈。']},
 snow:{place:'雪地',options:['堆雪人','踩腳印'],reactions:['替雪人戴上一片葉子。','在雪上留下了一串小腳印。']},
 bamboo:{place:'竹林',options:['聽竹葉','找小徑'],reactions:['閉上眼聽竹葉沙沙響。','發現了一條藏在竹林裡的小路。']},
 fire:{place:'火光',options:['看火花','許願望'],reactions:['輕輕接住了一顆溫暖的火花。','對著光點悄悄許了願。']},
 music:{place:'音樂',options:['一起唱歌','跳個舞'],reactions:['開心地哼起了小曲。','踏著節拍轉了一圈。']},
 food:{place:'甜點',options:['分享點心','烤餅乾'],reactions:['把最甜的一小口留給你。','聞著餅乾香氣開心地搖搖頭。']},
 weather:{place:'天氣',options:['聽雨聲','看彩虹'],reactions:['安靜地聽著雨點打拍子。','抬頭看見一道七彩的光。']},
 dream:{place:'夢境',options:['追月光','說個故事'],reactions:['追著地上的月光輕輕跑。','窩在你身邊聽完了一個故事。']},
 play:{place:'遊戲',options:['玩躲貓貓','一起跳舞'],reactions:['偷偷躲起來又馬上笑出聲。','跟著你一起轉圈圈。']},
 love:{place:'陪伴',options:['抱抱牠','一起散步'],reactions:['舒服地靠在你身上。','慢慢地陪你走了一小段路。']},
 stress:{place:'心事',options:['散散心','看看天空'],reactions:['安靜地陪你走過一條小路。','和你一起看著天空發呆。']},
 daily:{place:'日常',options:['一起散步','說悄悄話'],reactions:['高興地陪你走了一圈。','認真聽完後輕輕點點頭。']}
};
function careContext(){
 const c=state.creature;
 const recent=(c.memories||[]).slice(-1)[0];
 const lastTopic=(recent&&recent.topic)||(c.topics||[]).slice(-1)[0]||'daily';
 const scene=CARE_SCENES[lastTopic]||CARE_SCENES.daily;
 const line=CRE.CREATURE_LINES[c.line];
 const who=line?line.name:'小生物';
 const lead=recent?(recent.date===todayStr()?'剛剛':'上次'):'之前';
 return {topic:lastTopic,scene,who,lead,prompt:lead+'你和'+who+'聊到'+scene.place+'，今天想'+scene.options[0]+'，還是'+scene.options[1]+'？'};
}
function rememberCare(text,topic){
 const c=state.creature;
 if(!Array.isArray(c.memories))c.memories=[];
 c.memories.push({date:todayStr(),text:String(text).slice(0,160),topic:CARE_SCENES[topic]?topic:'daily'});
 c.memories=c.memories.slice(-30);
 // The newest completed entry is this same creature, not a new hatch.
 if(state.collection[0]&&state.collection[0].line===c.line&&state.collection[0].stage===4)
  state.collection[0].memories=c.memories.slice();
}
function updateUI(){
 const c=state.creature;
 $('creatureName').textContent=creatureName();
 // Stage and lifetime turns differ: avoid a misleading '0 句' progress badge.
 $('stageBadge').textContent=STAGE_NAMES[c.stage]+(c.stage===4?' · 已收藏':c.stage===0?' · 準備孵化':' · 成長中');
 document.body.dataset.creatureStage=String(c.stage);
 $('creatureSubtitle').textContent=c.stage===0?
  (c.line?'這顆蛋已指定生物，集滿能量就能孵化。':'完成 Crew 朋友或老師聊天，累積孵化能量。'):
  '能量 '+state.energy+' · '+(c.line?CRE.CREATURE_LINES[c.line].note:'繼續收集更多生物。');
 const cost=CRE.evolveCost(c.stage);
 $('energyText').textContent=cost===null?'⚡ 能量 '+state.energy:'⚡ 能量 '+state.energy+' / '+cost;
 // v1.2: energy orbs instead of a progress bar — one orb per energy the
 // next evolution costs, filled as energy arrives. A finished creature
 // shows a full glowing set of five.
 const orbs=$('energyOrbs');
 if(orbs){
  const orbCount=cost===null?5:cost;
  const filled=cost===null?5:Math.min(state.energy,cost);
  let html='';
  for(let i=0;i<orbCount;i++)html+='<span class="orb'+(i<filled?' filled':'')+'"></span>';
  orbs.innerHTML=html;
 }
 const progress=$('progressHint');
 if(progress)progress.textContent=c.stage===4?'已養成！可以摸摸牠，或開始養下一隻':
  CRE.canEvolve(state)?(c.stage===0?'✨ 能量已集滿，按下孵化！':'✨ 可以進化了！'):
  '還差 '+Math.max(0,cost-state.energy)+' 能量'+(c.stage===0?'，牠就能破殼':'，解鎖下一次進化');
 const btn=$('evolveBtn'),can=CRE.canEvolve(state);
 btn.disabled=!can||evolving;
 btn.hidden=c.stage===4;
 btn.classList.toggle('ready',can&&!evolving);
 btn.textContent=c.stage===0?(can?'🥚 孵出我的生物':'還需要 '+(cost-state.energy)+' 能量'):
  (can?'⚡ 注入能量，進化！':cost===null?'已是完全體':'還需要 '+(cost-state.energy)+' 能量');
 $('evolveHint').textContent=c.stage===0?
  (can?'能量集滿了！親手按下按鈕，看看 8 種生物會孵出哪一隻。':'和 Crew 朋友或老師對話，也能蒐集孵化能量。'):
  cost===null?'牠已住進收藏，每天可領補給禮物；想養下一隻時再決定。':
  '進化要 '+cost+' 能量；朋友或老師完成對話也能獲得。能量夠了再親手進化，每次都有禮物！';
 const storyTitle=$('growthStoryTitle'),storyDetail=$('growthStoryDetail');
 if(storyTitle&&storyDetail){
  const who=c.line&&CRE.CREATURE_LINES[c.line]?CRE.CREATURE_LINES[c.line].name:'神秘生物';
  const skill=CREATURE_SKILLS[c.line]||'神奇力量';
  const moments=[
   ['🥚 神秘蛋 · 準備孵化','收集兩點能量，按下孵化才會揭曉物種。'],
   ['🌱 第一次相遇 · '+who,'牠從蛋裡探出頭，還收到了第一份成長禮物。'],
   ['✨ 解鎖專屬能力 · '+skill,who+'的'+skill+'醒來了！'],
   ['🌟 發光成長 · '+who,skill+'變得更耀眼，距離完全體只差一步。'],
   ['🎉 完全體 · '+who,'牠留在收藏裡，可以領每日補給、摸摸牠，或開始養下一隻。']
  ];
  storyTitle.textContent=moments[c.stage][0];
  storyDetail.textContent=moments[c.stage][1];
 }
 $('canvasWrap').classList.toggle('mature-glow',c.stage>=3);
 const next=$('nextBtn');
 if(next)next.hidden=c.stage!==4;
 updateGiftUI();renderCollection();renderLinePreview();renderGiftCodex();renderMemoryArchive();
}
function updateGiftUI(){
 const n=state.gifts||0;
 const btn=$('giftBtn');if(btn){btn.textContent='🎁 禮物 ×'+n;btn.disabled=n<=0;}
 const toolCount=$('toolCount');if(toolCount)toolCount.textContent=n>0?'🎁 '+n:'';
 const count=$('giftCollectionCount');
 if(count){const seen=CRE.giftItems().filter(x=>state.giftSeen&&state.giftSeen[x.id]).length;count.textContent=seen+'/'+CRE.giftItems().length;}
 const cc=$('collectionCount');if(cc)cc.textContent=String(state.collection.length);
 const daily=$('dailyGiftBtn');if(daily){daily.hidden=state.creature.stage<1||state.lastDailyGift===todayStr();daily.disabled=state.lastDailyGift===todayStr();}
 const switchEgg=$('hatchBtn');
 if(switchEgg){switchEgg.hidden=!ownedEggs().length;switchEgg.textContent='🥚 換一顆蛋';}
}
function renderCare(){
 const panel=$('carePanel'),c=state.creature;
 if(!panel)return;
 panel.hidden=c.stage!==4;
 if(c.stage!==4)return;
 const info=careContext();
 $('carePrompt').textContent=info.prompt;
 const choices=$('careChoices');
 choices.innerHTML=info.scene.options.map((name,i)=>'<button type="button" data-care="'+i+'">'+name+'</button>').join('');
 const last=(c.memories||[]).slice(-1)[0];
 const memo=$('careMemory'),details=$('careMemoryDetails');
 details.hidden=!last;
 if(last){
  $('careMemorySummary').textContent='📖 '+(last.date===todayStr()?'今天的回憶已收藏':last.date+' 的回憶')+' · 查看';
  memo.textContent=last.date+' · '+last.text;
 }
 $('careStatus').textContent=last&&last.date===todayStr()?'今天的回憶已收藏 · 還能繼續陪牠聊天':
  '今天陪牠做個小選擇，留下屬於你們的回憶';
}
// Old memories remain accessible without starting any new conversation.
function renderMemoryArchive(){
 const section=$('memoryArchive'),list=$('memoryArchiveList'),count=$('memoryArchiveCount');
 if(!section||!list)return;
 const entries=[];
 for(const c of state.collection){
  const name=CRE.CREATURE_LINES[c.line]?.name||'生物';
  for(const m of c.memories||[])if(m&&typeof m.text==='string')
   entries.push({name,date:m.date,text:m.text});
 }
 if(state.creature.stage===4&&
    (!state.collection[0]||state.collection[0].line!==state.creature.line)){
  const name=CRE.CREATURE_LINES[state.creature.line]?.name||'生物';
  for(const m of state.creature.memories||[])if(m&&typeof m.text==='string')
   entries.push({name,date:m.date,text:m.text});
 }
 section.hidden=entries.length===0;
 if(section.hidden)return;
 if(count)count.textContent='('+entries.length+')';
 list.innerHTML='';
 for(const item of entries.slice(-30).reverse()){
  const row=document.createElement('p');
  row.textContent=item.date+' · '+item.name+'：'+item.text;
  list.appendChild(row);
 }
}
function claimDailySupply(){
 if(state.creature.stage<1||!CRE.grantGift(state,'daily',todayStr()))return false;
 writeState();updateUI();popToast('🎁 今日補給禮物 +1！明天再來領');
 return true;
}
function renderCollection(){
 const grid=$('gallery');if(!grid)return;
 if(!state.collection.length){
  grid.innerHTML='<p class="empty-forest">還沒有完全體。把第一隻生物養到完全體，牠就會住進這裡。</p>';
  return;
 }
 grid.innerHTML=state.collection.map(c=>{
  const line=CRE.CREATURE_LINES[c.line];if(!line)return '';
  const topic=CRE.dominantTopic(c.topics||[]);
  // v1.2: the card shows the creature's real final-form art (not just an
  // emoji). If the image fails to load, the emoji shows instead.
  const img='./art/creatures/'+c.line+'-final.webp';
  return '<div class="creature-card"><span class="creature-thumb" style="--lc:'+line.color+'">'
   +'<img src="'+img+'" alt="'+line.name+' 完全體" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">'
   +'<span class="creature-icon" style="display:none;--lc:'+line.color+'">'+line.icon+'</span></span>'
   +'<strong>'+line.name+'</strong>'
   +'<small>'+STAGE_NAMES[4]+' · 已收藏</small></div>';
 }).join('');
}
// v1.4: "8 種生物" preview — every line is visible to a new user, not
// just the ones already raised. Raised lines (stage 4 in the collection)
// show their real final-form art in colour with a "raised" mark; the
// rest show the egg, greyed out, with "not met yet". Tapping a card
// shows that creature's note in place of the status line (display only;
// the real collection logic in renderCollection is untouched).
function renderLinePreview(){
 const grid=$('linePreview');if(!grid)return;
 const raised={};
 for(const c of state.collection)if(c.line)raised[c.line]=true;
 grid.innerHTML=CRE.LINE_IDS.map(id=>{
  const line=CRE.CREATURE_LINES[id];if(!line)return '';
  const done=!!raised[id],seen=done||!!(state.encountered&&state.encountered[id]);
  const stage=done?'final':seen?'baby':'egg';
  const img='./art/creatures/'+id+'-'+stage+'.webp';
  const status=done?'✓ 已養成':seen?'✓ 已遇見':'還沒遇過';
  const small=previewNoteLine===id?line.note:status+' · '+CRE.CREATURE_WEIGHTS[id]+'%';
  return '<button type="button" class="line-card'+(seen?' owned':' locked')+'" data-line="'+id+'" style="--lc:'+line.color+'" title="'+line.note+'">'
   +'<span class="line-thumb"><img src="'+img+'" alt="'+line.name+' '+STAGE_NAMES[done?4:seen?1:0]+'" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">'
   +'<span class="line-icon" style="display:none">'+line.icon+'</span></span>'
   +'<strong>'+line.name+'</strong>'
   +'<small class="'+(seen?'line-status':'')+'">'+small+'</small></button>';
 }).join('');
}
function renderGiftCodex(){
 const grid=$('giftGrid');if(!grid)return;
 grid.innerHTML=CRE.giftItems().map(x=>{
  const n=state.giftCollection[x.id]||0,seen=!!(state.giftSeen&&state.giftSeen[x.id]);
  const kind=x.kind==='egg'?'蛋':x.kind==='companion'?'夥伴':'能量';
  const status=n>0?'目前持有 ×'+n:(x.id==='egg-golden'?'已轉成物種蛋':x.kind==='energy'?'已使用':'目前沒有');
  return '<div class="gift-item'+(seen?' owned':' locked')+'" style="--rc:'+x.rarityColor+'">'
   +'<span class="gift-item-ic">'+(seen?x.icon:'?')+'</span>'
   +'<span class="gift-item-nm">'+(seen?x.name:'???')+'</span>'
   +'<span class="gift-item-rt" style="color:'+(seen?x.rarityColor:'#8b8496')+'">'+(seen?x.rarityName:'未開出')+'</span>'
   +(seen?'<span class="gift-item-ct">✓ 曾開過 · '+status+' · '+kind+'</span>':'')
   +'</div>';
 }).join('');
}
function resetGiftModal(){
 $('giftClosed').hidden=false;$('giftReveal').hidden=true;
 $('giftOpenBtn').hidden=false;$('giftAgainBtn').hidden=true;
}
function openGiftModal(){
 if(!(state.gifts>0))return;
 $('giftModal').hidden=false;resetGiftModal();
}
function closeGiftModal(){
 if(giftOpening)return;
 $('giftModal').hidden=true;
 updateGiftUI();renderGiftCodex();
}
function doOpenGift(){
 if(giftOpening)return;
 // v1.2 ceremony: the gift is deducted (and the item rolled) right away
 // so a double tap cannot open twice, but the reveal waits for the shake
 // and flash. The item stays secret until the reveal.
 const item=CRE.openGift(state);
 if(!item){closeGiftModal();return;}
 giftOpening=true;
 writeState();
 $('giftOpenBtn').hidden=true;$('giftAgainBtn').hidden=true;
 $('giftClosed').hidden=false;$('giftReveal').hidden=true;
 $('giftClosed').classList.add('shaking');
 const delay=reduceMotion?0:900;
 setTimeout(()=>{
  $('giftClosed').classList.remove('shaking');
  const flash=$('giftFlash');
  if(flash){flash.classList.remove('go');void flash.offsetWidth;flash.classList.add('go');}
  $('giftClosed').hidden=true;
  $('giftReveal').hidden=false;
  $('giftItemIcon').textContent=item.icon;
  $('giftItemName').textContent=item.name;
  const rt=$('giftItemRarity');rt.textContent=item.rarityName+' · '+(item.kind==='egg'?'蛋':item.kind==='companion'?'夥伴':'能量');rt.style.color=item.rarityColor;
  $('giftItemNote').textContent=item.note+(item.kind==='energy'?' 目前能量 '+state.energy+'。':'');
  $('giftReveal').classList.remove('pop');void $('giftReveal').offsetWidth;$('giftReveal').classList.add('pop');
  $('giftAgainBtn').hidden=!(state.gifts>0);
  giftOpening=false;
  updateUI();
 },delay);
}
function ownedEggs(){
 return CRE.giftItems().filter(x=>x.kind==='egg'&&(state.giftCollection[x.id]||0)>0);
}
function askHatch(){
 const eggs=ownedEggs();
 if(!eggs.length){popToast('還沒有蛋，開禮物拿蛋！');return;}
 $('eggList').innerHTML=eggs.map(x=>{
  // v1.2: each choice shows the line's egg art (with the emoji behind it
  // as a fallback if the image fails to load).
  const img='./art/creatures/'+(x.line||'moonfox')+'-egg.webp';
  return '<button type="button" data-line="'+x.line+'" class="seed-pick">'
   +'<span class="seed-pick-egg"><img src="'+img+'" alt="'+x.name+'" loading="lazy" onerror="this.style.display=\'none\'"><span class="seed-pick-ic">'+x.icon+'</span></span>'
   +'<span class="seed-pick-nm">'+x.name+'</span>'
   +'<span>×'+(state.giftCollection[x.id]||0)+'</span></button>';
 }).join('');
 $('eggNote').textContent=state.creature.stage>0?
  '現在這隻還在養，換蛋會放棄牠的進度。':'新的蛋等著孵化，選一顆開始養。';
 $('eggModal').hidden=false;
}
function hatchEggLine(lineId){
 if(state.creature.stage>0&&window.confirm&&!window.confirm(
  state.creature.stage===4?'換蛋後，這隻完全體會留在收藏，但不能繼續陪伴牠。確定嗎？':'這隻正在成長，換蛋會放棄牠的進度，確定嗎？'))return false;
 return afterVoiceStops(()=>{
  if(!CRE.hatchEgg(state,lineId))return false;
  writeState();
  $('eggModal').hidden=true;
  CRE.preloadArt(lineId);
  updateUI();draw(0);
  popToast('🥚 '+CRE.CREATURE_LINES[lineId].name+' 開始孵化了！');
  return true;
 });
}
function doEvolve(rand){
 // v1.2 ceremony: the STATE changes immediately (energy deducted, stage
 // advanced, gifts granted, collection updated) so the QA hook stays
 // synchronous, but the VISUAL swap waits for the glow phase. The canvas
 // keeps painting the pre-evolution form (via evolvePending) for ~450ms,
 // then the new form is revealed with a flash and a scale-in.
 const before={line:state.creature.line,stage:state.creature.stage};
 const res=CRE.evolve(state,typeof rand==='function'?rand:undefined);
 if(!res)return null;
 // v1.1: every evolution grants a gift; completing a creature grants
 // one more. A full creature is 4 evolves + 1 complete = 5 gifts.
 CRE.grantGift(state,'evolve');
 if(res.completed)CRE.grantGift(state,'complete');
 writeState();
 if(res.line)CRE.preloadArt(res.line);
 const token=++evolveSeq;
 evolving=true;evolvePending=before;
 const wrap=$('canvasWrap');
 wrap.classList.add('evolving');
 if(res.completed)wrap.classList.add('evolving-complete');
 burstStars(10);
 setCreatureMood('happy');
 if(res.completed){
  const line=CRE.CREATURE_LINES[res.line];
  cueSurprise({emoji:line.icon,title:'🎉 '+line.name+' 完全體誕生了！',detail:'牠住進了你的圖鑑！你可以繼續陪伴牠、每天領補給禮物，也能自行選擇養下一隻。🎁 禮物 +2！'});
  popToast('🎁 禮物 +2！');
 }else if(res.stage===1){
  const line=CRE.CREATURE_LINES[res.line];
  cueSurprise({emoji:line.icon,title:'🥚 蛋孵化了！是'+line.name+'！',detail:line.note});
  popToast('🎁 禮物 +1！');
 }else{
  const line=CRE.CREATURE_LINES[res.line];
  const skill=CREATURE_SKILLS[res.line];
  cueSurprise(res.stage===2?
   {emoji:line.icon,title:'✨ '+line.name+'解鎖'+skill+'！',detail:'牠有自己的新本領了！🎁 禮物 +1！'}:
   {emoji:line.icon,title:'🌟 '+line.name+'的力量變亮了！',detail:skill+'正在成長，下一次進化就能成為完全體。🎁 禮物 +1！'});
  popToast('🎁 禮物 +1！');
 }
 updateUI();draw(0);
 const delay=reduceMotion?0:450;
 setTimeout(()=>{
  if(token!==evolveSeq)return;
  evolvePending=null;evolving=false;
  reveal={started:renderTime};
  wrap.classList.remove('evolving','evolving-complete');
  wrap.classList.add('evolve-reveal');
  draw(0);updateUI();
  setTimeout(()=>{wrap.classList.remove('evolve-reveal');},650);
 },delay);
 return res;
}
function doStartNext(){
 if(state.creature.stage!==4)return false;
 return afterVoiceStops(()=>{
  CRE.startNewCreature(state);
  setCreatureMood('idle');
  writeState();
  if($('messages'))resetChat('Zoe','新的蛋來了！聊聊天，蒐集能量，把牠孵出來。');
  updateUI();draw(0);
  popToast('🥚 新的蛋準備好了！');
  return true;
 });
}
function appendMessage(who,message,opts){
 opts=opts||{};
 const outer=document.createElement('div');outer.className='message '+(who==='me'?'me':'zoe');
 const label=document.createElement('span');label.className='sender';label.textContent=who==='me'?'你':'Zoe';
 const p=document.createElement('p');p.textContent=message;
 outer.append(label,p);$('messages').appendChild(outer);
 $('messages').scrollTop=$('messages').scrollHeight;
 while($('messages').children.length>45)$('messages').removeChild($('messages').firstChild);
 // v1.4: persist the chat (not on restore, or it would rewrite itself).
 if(!opts.restore){
  chatLog.push({who:who==='me'?'you':'zoe',text:String(message)});
  if(chatLog.length>30)chatLog=chatLog.slice(-30);
  writeChat();
 }
}
function syncInitialGreeting(){
 // Older local saves can display an egg welcome for a growing creature.
 // Only replace isolated generic openings; never overwrite real conversations.
 const c=state.creature,who=CRE.CREATURE_LINES[c.line]?.name||'你的生物';
 const greeting=c.stage===4?'今天也來陪'+who+'聊聊吧！牠還記得你們聊過的事。':
  c.stage>0?who+'正在長大！和 Zoe 聊聊天，存夠能量就能繼續進化。':
  '來！和 Zoe 聊兩句，替這顆蛋存能量，再親手孵出牠。';
 const stale=text=>/新的蛋來了|來！我們孵一顆蛋/.test(text||'');
 if(chatLog.length===1&&chatLog[0].who==='zoe'&&stale(chatLog[0].text)&&c.stage>0){
  chatLog[0].text=greeting;writeChat();
  $('messages').innerHTML='';appendMessage('zoe',greeting,{restore:true});
 }else if(!chatLog.length){
  const bubble=$('messages').querySelector?.('.message.zoe p');
  if(bubble)bubble.textContent=greeting;
 }
}
function afterVoiceStops(action){
 return voiceBridge?voiceBridge.afterStop(action):action();
}
function voiceContext(){
 const c=state.creature,last=c.topics[c.topics.length-1];
 return {line:CRE.LINE_IDS.includes(c.line)?c.line:null,
  stage:c.stage,energy:state.energy,topic:Object.hasOwn(TOPICS,last)?last:'daily'};
}
function growFromTurn(topic){
 CRE.gainEnergy(state);
 state.creature.topics.push(topic);
 state.creature.topics=state.creature.topics.slice(-64);
 state.creature.sentences++;
 sessionMessages++;
 return CRE.grantGift(state,'daily',todayStr());
}
function finishTurn(daily,remembered){
 writeState();updateUI();draw(0);
 reactToChat();
 if(remembered){$('reactBubble').textContent=remembered;burstStars(5);}
 if(daily)popToast('🎁 今日禮物 +1！明天再來領一個。');
 else if(CRE.canEvolve(state))popToast(state.creature.stage===0?'🥚 能量夠了！按「孵出我的生物」':'⚡ 能量夠了！可以進化了');
}
function recordVoiceTurn(input){
 // Use speech only to select an existing topic. The lab never copies the
 // transcript, the real Zoe reply, or an excerpt into either storage key.
 lastChatSignal=classify(input.slice(0,1600));
 const topic=lastChatSignal.topic;
 const daily=growFromTurn(topic);
 let remembered='';
 if(state.creature.stage===4){
  const who=CRE.CREATURE_LINES[state.creature.line]?.name||'小生物';
  remembered=who+'陪你和 Zoe 聊了'+TOPICS[topic].label+'，開心地靠了過來。';
  rememberCare(remembered,topic);
 }
 finishTurn(daily,remembered);
}
function postMessage(raw,careChoice){
 const text=String(raw||'').trim();
 if(!text||text.length>240)return false;
 const isFinal=state.creature.stage===4;
 const info=isFinal?careContext():null;
 const idx=careChoice===0||careChoice===1?careChoice:null;
 appendMessage('me',text);
 const signal=classify(text);
 lastChatSignal=signal;
 if(isFinal&&idx!==null)signal.topic=info.topic;
 const daily=growFromTurn(signal.topic);
 const turn=state.creature.sentences;
 let reply,remembered='';
 if(isFinal){
  const line=CRE.CREATURE_LINES[state.creature.line];
  const reaction=idx!==null?info.scene.reactions[idx]:'認真聽你說完，輕輕靠近了你。';
  const activity=idx!==null?info.scene.options[idx]:'聊了「'+text.slice(0,40)+'」';
  remembered=line.name+'和你一起'+activity+'，'+reaction;
  rememberCare(remembered,signal.topic);
  reply=line.icon+' '+line.name+reaction+' Zoe 幫你們把這段回憶收藏起來了。';
 }else{
  reply=sayZoe(signal,turn);
 }
 appendMessage('zoe',reply);
 finishTurn(daily,remembered);
 return {topic:signal.topic,turn,energy:state.energy,sentences:state.creature.sentences,canEvolve:CRE.canEvolve(state),reply,remembered};
}
function resetChat(who,text){
 chatLog=[];
 $('messages').innerHTML='';
 appendMessage(who,text);
}
function resetLab(){
 if(typeof window.confirm!=='function')return false;
 if(!window.confirm('這會永久刪除本機所有已養成生物、禮物、能量與收藏回憶，無法復原。確定要清除嗎？'))return false;
 if(!window.confirm('最後確認：真的要清空這台裝置的整個生物實驗室嗎？'))return false;
 return afterVoiceStops(()=>{
  state=CRE.empty();
  // Reset must not grant previously earned outside energy all over again.
  state.externalEnergyClaimed=externalChatRewardTotal()||0;
  setCreatureMood('idle');
  writeState();
  if($('messages'))resetChat('Zoe','新的蛋來了！聊聊天，蒐集能量，把牠孵出來。');
  $('labSettings').open=false;
  updateUI();draw(0);
  return true;
 });
}
function postcardDateStr(){
 const d=new Date();
 return d.getFullYear()+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getDate()).padStart(2,'0');
}
// v1.4: the download is a postcard, not the bare canvas — the creature
// art on top (780x1560, companions included since paint drew them) plus
// a dark band underneath with the creature name, sentence/energy count
// and the date. The band sits below the art, never on top of it. If the
// art has not loaded yet the canvas still holds the paint fallback
// (gradient + egg), so the postcard is never all black.
function buildPostcardDataURL(){
 const BAND=170,W2=780,H2=1560;
 const pc=document.createElement('canvas');
 pc.width=W2;pc.height=H2+BAND;
 const p=pc.getContext('2d');
 if(!p)return null;
 // Repaint once so the postcard uses the current frame — but with the
 // evolution reveal flash suppressed: draw(0) would re-trigger it
 // (0 - reveal.started is negative, hence < 260) and wash the art out.
 try{const savedReveal=reveal;reveal=null;try{draw(0);}finally{reveal=savedReveal;}}catch{}
 try{
  p.drawImage(canvas,0,0,W2,H2);
 }catch{
  p.fillStyle='#1d1533';p.fillRect(0,0,W2,H2);
  p.fillStyle='#F7F7F4';p.font='120px system-ui';p.textAlign='center';
  p.fillText('🥚',W2/2,H2/2);
 }
 p.fillStyle='#12101C';p.fillRect(0,H2,W2,BAND);
 p.textAlign='center';
 p.fillStyle='#F7F7F4';p.font='700 44px system-ui';
 p.fillText(creatureName(),W2/2,H2+62);
 p.fillStyle='#b9b3c9';p.font='400 30px system-ui';
 p.fillText(STAGE_NAMES[state.creature.stage]+' · 能量 '+state.energy,W2/2,H2+108);
 p.font='400 26px system-ui';
 p.fillText(postcardDateStr()+' · Crew · 3sssi.com',W2/2,H2+148);
 return pc.toDataURL('image/png');
}
function exportImage(){
 try{
  const png=buildPostcardDataURL();
  if(!png||!png.startsWith('data:image/png'))throw Error('PNG encoding unsupported');
  const a=document.createElement('a');a.href=png;
  a.download='crew-creature-'+(state.creature.line||'egg')+'-'+state.creature.stage+'.png';
  document.body.appendChild(a);a.click();a.remove();
  popToast('已下載生物明信片 · PNG');
  return true;
 }catch{
  popToast('這個瀏覽器暫時無法下載 PNG，請稍後再試。');
  return false;
 }
}
function draw(now=0){
 renderTime=now;
 if(!ctx)return false;
 // v1.2: during the evolution glow phase, paint the pre-evolution form
 // (evolvePending) even though the state already advanced.
 const g=evolvePending?Object.assign({},state,{creature:{line:evolvePending.line,stage:evolvePending.stage,topics:[],sentences:0}}):state;
 return CRE.paint(canvas,g,now,{width:780,height:1560,dpr:1,still:reduceMotion,
  reveal:reveal&&now-reveal.started<1000?reveal:null});
}
function render(now=0){
 if(lastFrame&&now-lastFrame<30){window.requestAnimationFrame?.(render);return;}
 lastFrame=now;
 draw(now);
 window.requestAnimationFrame?.(render);
}
// v1.4: short poll for the current art (default moonfox egg). Stops as
// soon as the image is ready, or after ~5s — the fallback is already
// showing, so a slow image just means a later repaint, never a black board.
let artWaitTries=0;
function waitForArt(){
 const line=state.creature.line||'moonfox';
 const stageName=CRE.CREATURE_STAGES[state.creature.stage]||'egg';
 if(CRE.artReady(CRE.artImage(line,stageName)))return;
 if(++artWaitTries>40)return;
 setTimeout(()=>{
  if(CRE.artReady(CRE.artImage(line,stageName)))draw(0);
  else waitForArt();
 },120);
}
function init(){
 document.body.classList.add('creature-v1');
 reduceMotion=!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 loadState();
 window.addEventListener?.('storage',event=>{
  if(event.key!==EXTERNAL_CHAT_REWARDS_KEY)return;
  if(claimExternalChatRewards()){writeState();updateUI();draw(0);}
 });
 window.addEventListener?.('pageshow',()=>{
  if(claimExternalChatRewards()){writeState();updateUI();draw(0);}
 });
 // Preserve legacy local chat history, but do not expose or start any chat.
 if($('messages'))loadChat();
 // v1.4: preload the default egg art before the first paint, so the
 // first thing the user sees is not a black board. The paint fallback
 // is a gradient + egg anyway; waitForArt repaints once the real art
 // is ready (the render loop repaints every frame regardless).
 if(state.creature.line)CRE.preloadArt(state.creature.line);
 else CRE.preloadArt('moonfox');
 draw(0);updateUI();
 setCreatureMood('idle');
 if($('messages')){restoreChat();syncInitialGreeting();}
 waitForArt();
 $('evolveBtn').addEventListener('click',ev=>{if(!ev.currentTarget.disabled)window.creatureSfx?.play('evolve');doEvolve();});
 $('nextBtn').addEventListener('click',doStartNext);
 $('canvasWrap').addEventListener('click',ev=>{window.creatureSfx?.play('pet');petCreature(ev);});
 $('petQuickBtn').addEventListener('click',ev=>{window.creatureSfx?.play('pet');
  if(ev&&ev.stopPropagation)ev.stopPropagation();
  const r=$('canvasWrap').getBoundingClientRect();
  petCreature({target:null,clientX:(r.left||0)+r.width*.5,clientY:(r.top||0)+r.height*.55});
 });
 $('petBtn').addEventListener('click',ev=>{window.creatureSfx?.play('pet');
  if(ev&&ev.stopPropagation)ev.stopPropagation();
  const r=$('canvasWrap').getBoundingClientRect();
  petCreature({target:null,clientX:(r.left||0)+r.width*.5,clientY:(r.top||0)+r.height*.55});
 });
 $('hatchBtn').addEventListener('click',()=>{window.creatureSfx?.play('hatch');askHatch();});
 $('giftBtn').addEventListener('click',openGiftModal);
 $('dailyGiftBtn').addEventListener('click',claimDailySupply);
 $('giftOpenBtn').addEventListener('click',()=>{window.creatureSfx?.play('gift');doOpenGift();});
 $('giftAgainBtn').addEventListener('click',()=>{window.creatureSfx?.play('gift');doOpenGift();});
 $('giftCloseBtn').addEventListener('click',closeGiftModal);
 $('giftModal').addEventListener('click',ev=>{if(ev.target===$('giftModal'))closeGiftModal();});
 $('eggList').addEventListener('click',ev=>{
  const t=ev.target.closest?.('button[data-line]');if(t)hatchEggLine(t.dataset.line);
 });
 $('eggCloseBtn').addEventListener('click',()=>{$('eggModal').hidden=true;});
 $('eggModal').addEventListener('click',ev=>{if(ev.target===$('eggModal'))$('eggModal').hidden=true;});
 $('saveBtn').addEventListener('click',exportImage);
 $('quickSave').addEventListener('click',exportImage);
 $('resetBtn').addEventListener('click',resetLab);
 // v1.4: tap a line-preview card to show / hide that creature's note.
 const preview=$('linePreview');
 if(preview)preview.addEventListener('click',ev=>{
  const t=ev.target.closest?.('button[data-line]');if(!t)return;
  previewNoteLine=previewNoteLine===t.dataset.line?null:t.dataset.line;
  renderLinePreview();
 });
 window.requestAnimationFrame?.(render);
}
if(new URLSearchParams(location.search).get('qa')==='1'){
 Object.defineProperty(window,'__CREATURE_QA__',{value:{
  classify,post:postMessage,evolve:doEvolve,hatch:hatchEggLine,startNext:doStartNext,
  state:()=>JSON.parse(JSON.stringify(state)),
  energy:()=>state.energy,
  canEvolve:()=>CRE.canEvolve(state),
  evolveCost:n=>CRE.evolveCost(n),
  gainEnergy:()=>{const e=CRE.gainEnergy(state);writeState();return e;},
  grantGift:(reason,today)=>{const v=CRE.grantGift(state,reason,today);writeState();updateUI();return v;},
  dailySupply:claimDailySupply,
  openGift:rand=>{const item=CRE.openGift(state,rand);writeState();updateUI();return item;},
  giftItems:()=>CRE.giftItems(),
  gifts:()=>state.gifts,
  giftCollection:()=>JSON.parse(JSON.stringify(state.giftCollection)),
 giftSeen:()=>JSON.parse(JSON.stringify(state.giftSeen)),
 carePrompt:()=>state.creature.stage===4?careContext().prompt:null,
 careSelect:i=>{const info=careContext();return state.creature.stage===4&&(i===0||i===1)?
  postMessage('我想和'+info.who+'一起'+info.scene.options[i]+'！',i):false;},
  rollLine:rand=>CRE.rollCreatureLine(rand),
  weights:()=>({...CRE.CREATURE_WEIGHTS}),
  dominantTopic:t=>CRE.dominantTopic(t),
  lines:()=>Object.keys(CRE.CREATURE_LINES),
  stages:()=>CRE.CREATURE_STAGES.slice(),
  reset:resetLab,
  exportImage,draw:()=>draw(0),
  // v1.4 test hooks: saved chat history, and the postcard data URL.
  messages:()=>chatLog.map(m=>({who:m.who,text:m.text})),
  postcardDataURL:()=>buildPostcardDataURL(),
  // v1.2 test hooks for the new UI: egg list, reaction bubble, pet, ceremony flags.
  eggList:()=>{askHatch();return $('eggList').innerHTML;},
  reactBubble:()=>({text:$('reactBubble').textContent,hidden:$('reactBubble').hidden}),
  pet:(x,y)=>petCreature({target:{closest:()=>null},clientX:x===undefined?195:x,clientY:y===undefined?200:y}),
  mood:()=>creatureMood,rest:()=>setCreatureMood('rest'),
  skill:id=>CREATURE_SKILLS[id],topicsExpanded:()=>topicsExpanded,
  evolving:()=>evolving,
  giftOpening:()=>giftOpening,
  allTopics:Object.keys(TOPICS)
 }});
}
init();
})();

