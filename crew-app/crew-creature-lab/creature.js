(()=>{'use strict';
const $=id=>document.getElementById(id);
const canvas=$('creatureCanvas'),ctx=canvas.getContext('2d');
const STATE_KEY='crew-creature-lab-v1',TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const CRE=window.CrewCreatureV1;
const STAGE_NAMES=['蛋','幼體','成長體','成熟體','完全體'];
let state=CRE.empty(),reveal=null,toastTimer=0,surpriseTimer=0,renderTime=0,lastFrame=0,reduceMotion=false,sessionMessages=0;
function rng32(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function todayStr(){
 const d=new Date();
 return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function loadState(){
 try{state=CRE.restore(JSON.parse(localStorage.getItem(STATE_KEY)||'null'));}
 catch{state=CRE.empty();}
 // A stage-4 current creature can only come from a hand-edited save;
 // evolve() normally resets it, so finish it here instead of stranding it.
 if(state.creature&&state.creature.stage===4){
  state.collection.unshift({line:state.creature.line,topics:state.creature.topics.slice(),stage:4});
  state.collection=state.collection.slice(0,64);
  state.creature=CRE.newCreature();
 }
}
function writeState(){
 try{localStorage.setItem(STATE_KEY,JSON.stringify(state));}catch{}
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
function clearSurprise(){
 clearTimeout(surpriseTimer);surpriseTimer=0;
 const box=$('surpriseMoment');
 if(box){box.hidden=true;box.classList.remove('enter');}
}
function cueSurprise(event){
 if(!event)return;
 clearTimeout(toastTimer);toastTimer=0;
 $('growthToast').classList.remove('show');
 clearSurprise();
 const box=$('surpriseMoment');box.hidden=false;
 $('surpriseIcon').textContent=event.emoji;
 $('surpriseTitle').textContent=event.title;$('surpriseDetail').textContent=event.detail;
 box.classList.remove('enter');void box.offsetWidth;box.classList.add('enter');
 surpriseTimer=setTimeout(clearSurprise,3300);
}
function creatureName(){
 const c=state.creature;
 if(!c.line)return '🥚 神秘的蛋';
 const line=CRE.CREATURE_LINES[c.line];
 return line.icon+' '+line.name+' · '+STAGE_NAMES[c.stage];
}
function updateUI(){
 const c=state.creature;
 $('creatureName').textContent=creatureName();
 $('stageBadge').textContent=STAGE_NAMES[c.stage]+' · '+c.sentences+' 句';
 $('creatureSubtitle').textContent=c.stage===0?
  (c.line?'這顆蛋已經知道自己是誰了，聊聊看，存能量孵化牠。':'從第一句開始，蒐集能量，準備孵化。'):
  '第 '+c.sentences+' 句 · 能量 '+state.energy+'。'+(c.line?CRE.CREATURE_LINES[c.line].note:'');
 const cost=CRE.evolveCost(c.stage);
 $('energyText').textContent=cost===null?'完全體 · 能量 '+state.energy:'⚡ 能量 '+state.energy+' / '+cost;
 $('energyFill').style.width=cost===null?'100%':Math.min(100,state.energy/cost*100)+'%';
 const btn=$('evolveBtn'),can=CRE.canEvolve(state);
 btn.disabled=!can;
 btn.classList.toggle('ready',can);
 btn.textContent=can?'⚡ 注入能量，進化！':cost===null?'已是完全體':'還需要 '+(cost-state.energy)+' 能量';
 $('evolveHint').textContent=cost===null?'這隻已經是完全體，住進圖鑑後會有新的蛋。':
  '進化要 '+cost+' 能量，聊一句 +1，能量夠了按下去就進化。';
 updateBoxUI();renderCollection();renderBoxCodex();
}
function updateBoxUI(){
 const n=state.boxes||0;
 const btn=$('boxBtn');if(btn){btn.textContent='🎁 盲盒 ×'+n;btn.disabled=n<=0;}
 const count=$('boxCollectionCount');
 if(count){const owned=CRE.boxItems().filter(x=>(state.boxCollection[x.id]||0)>0).length;count.textContent=owned+'/'+CRE.boxItems().length;}
 const cc=$('collectionCount');if(cc)cc.textContent=String(state.collection.length);
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
  return '<div class="creature-card"><span class="creature-icon" style="--lc:'+line.color+'">'+line.icon+'</span>'
   +'<strong>'+line.name+'</strong>'
   +'<small>主導話題：'+(TOPICS[topic]?TOPICS[topic].label:topic)+' · '+STAGE_NAMES[4]+'</small></div>';
 }).join('');
}
function renderBoxCodex(){
 const grid=$('boxGrid');if(!grid)return;
 grid.innerHTML=CRE.boxItems().map(x=>{
  const n=state.boxCollection[x.id]||0,owned=n>0;
  const kind=x.kind==='egg'?'蛋':'能量';
  return '<div class="box-item'+(owned?' owned':' locked')+'" style="--rc:'+x.rarityColor+'">'
   +'<span class="box-item-ic">'+(owned?x.icon:'?')+'</span>'
   +'<span class="box-item-nm">'+(owned?x.name:'???')+'</span>'
   +'<span class="box-item-rt" style="color:'+(owned?x.rarityColor:'#8b8496')+'">'+(owned?x.rarityName:'未開出')+'</span>'
   +(owned?'<span class="box-item-ct">×'+n+' · '+kind+'</span>':'')
   +'</div>';
 }).join('');
}
function resetBoxModal(){
 $('boxClosed').hidden=false;$('boxReveal').hidden=true;
 $('boxOpenBtn').hidden=false;$('boxAgainBtn').hidden=true;
}
function openBoxModal(){
 if(!(state.boxes>0))return;
 $('boxModal').hidden=false;resetBoxModal();
}
function closeBoxModal(){
 $('boxModal').hidden=true;
 updateBoxUI();renderBoxCodex();
}
function doOpenBox(){
 const item=CRE.openBox(state);
 if(!item){closeBoxModal();return;}
 writeState();updateUI();
 $('boxClosed').hidden=true;
 $('boxReveal').hidden=false;
 $('boxItemIcon').textContent=item.icon;
 $('boxItemName').textContent=item.name;
 const rt=$('boxItemRarity');rt.textContent=item.rarityName+' · '+(item.kind==='egg'?'蛋':'能量');rt.style.color=item.rarityColor;
 $('boxItemNote').textContent=item.note+(item.kind==='energy'?' 目前能量 '+state.energy+'。':'');
 $('boxOpenBtn').hidden=true;
 $('boxAgainBtn').hidden=!(state.boxes>0);
 renderBoxCodex();
}
function ownedEggs(){
 return CRE.boxItems().filter(x=>x.kind==='egg'&&(state.boxCollection[x.id]||0)>0);
}
function askHatch(){
 const eggs=ownedEggs();
 if(!eggs.length){popToast('還沒有蛋，開盲盒拿蛋！');return;}
 $('eggList').innerHTML=eggs.map(x=>'<button type="button" data-line="'+x.line+'" class="seed-pick"><span>'+x.icon+' '+x.name+'</span><span>×'+(state.boxCollection[x.id]||0)+'</span></button>').join('');
 $('eggNote').textContent=state.creature.sentences>0?
  '現在這隻還在養，換蛋會放棄牠的進度。':'新的蛋等著孵化，選一顆開始養。';
 $('eggModal').hidden=false;
}
function hatchEggLine(lineId){
 if(state.creature.sentences>0&&window.confirm&&!window.confirm('現在這隻還沒長大，換蛋會放棄牠的進度，確定嗎？'))return false;
 if(!CRE.hatchEgg(state,lineId))return false;
 writeState();
 $('eggModal').hidden=true;
 CRE.preloadArt(lineId);
 updateUI();draw(0);
 popToast('🥚 '+CRE.CREATURE_LINES[lineId].name+' 開始孵化了！');
 return true;
}
function doEvolve(){
 const res=CRE.evolve(state);
 if(!res)return null;
 writeState();
 if(res.line)CRE.preloadArt(res.line);
 reveal={started:renderTime};
 if(res.completed){
  CRE.grantBox(state,'complete');
  writeState();
  const line=CRE.CREATURE_LINES[res.line];
  cueSurprise({emoji:line.icon,title:'🎉 '+line.name+' 完全體誕生了！',detail:'牠住進了你的圖鑑，新的蛋已經準備好。🎁 盲盒 +1！'});
  popToast('🎁 盲盒 +1！');
 }else if(res.stage===1){
  const line=CRE.CREATURE_LINES[res.line];
  cueSurprise({emoji:line.icon,title:'🥚 蛋孵化了！是'+line.name+'！',detail:line.note});
 }else{
  const line=CRE.CREATURE_LINES[res.line];
  cueSurprise({emoji:line.icon,title:'✨ 進化！'+line.name+' 長大了！',detail:'階段：'+STAGE_NAMES[res.stage]+'。'});
 }
 updateUI();draw(0);
 return res;
}
function appendMessage(who,message){
 const outer=document.createElement('div');outer.className='message '+(who==='me'?'me':'zoe');
 const label=document.createElement('span');label.className='sender';label.textContent=who==='me'?'你':'Zoe';
 const p=document.createElement('p');p.textContent=message;
 outer.append(label,p);$('messages').appendChild(outer);
 $('messages').scrollTop=$('messages').scrollHeight;
 while($('messages').children.length>45)$('messages').removeChild($('messages').firstChild);
}
function postMessage(raw){
 const text=String(raw||'').trim();
 if(!text)return false;
 if(text.length>240)return false;
 appendMessage('me',text);
 const signal=classify(text);
 const turn=state.creature.sentences+1;
 CRE.gainEnergy(state);
 state.creature.topics.push(signal.topic);
 state.creature.sentences++;
 const reply=sayZoe(signal,turn);
 appendMessage('zoe',reply);
 sessionMessages++;
 if(CRE.grantBox(state,'daily',todayStr())){writeState();updateBoxUI();popToast('🎁 今日盲盒 +1！明天再來領一個。');}
 writeState();
 updateUI();draw(0);
 if(CRE.canEvolve(state))popToast('⚡ 能量夠了，按「注入能量，進化！」');
 return {topic:signal.topic,turn,energy:state.energy,sentences:state.creature.sentences,canEvolve:CRE.canEvolve(state),reply};
}
function resetChat(who,text){
 $('messages').innerHTML='';
 appendMessage(who,text);
}
function resetLab(){
 if(window.confirm&&!window.confirm('確定重新開始？已養成的生物和能量都會清除。'))return false;
 state=CRE.empty();
 writeState();
 resetChat('Zoe','新的蛋來了！聊聊天，蒐集能量，把牠孵出來。');
 updateUI();draw(0);
 return true;
}
function exportImage(){
 try{
  const png=canvas.toDataURL('image/png');
  if(!png.startsWith('data:image/png'))throw Error('PNG encoding unsupported');
  const a=document.createElement('a');a.href=png;
  a.download='crew-creature-'+(state.creature.line||'egg')+'-'+state.creature.stage+'.png';
  document.body.appendChild(a);a.click();a.remove();
  popToast('已下載生物圖片 · PNG');
  return true;
 }catch{
  popToast('這個瀏覽器暫時無法下載 PNG，請稍後再試。');
  return false;
 }
}
function draw(now=0){
 renderTime=now;
 if(!ctx)return false;
 return CRE.paint(canvas,state,now,{width:780,height:1560,dpr:1,still:reduceMotion,
  reveal:reveal&&now-reveal.started<1000?reveal:null});
}
function render(now=0){
 if(lastFrame&&now-lastFrame<30){window.requestAnimationFrame?.(render);return;}
 lastFrame=now;
 draw(now);
 window.requestAnimationFrame?.(render);
}
function init(){
 document.body.classList.add('creature-v1');
 reduceMotion=!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 loadState();
 if(state.creature.line)CRE.preloadArt(state.creature.line);
 draw(0);updateUI();
 $('chatForm').addEventListener('submit',ev=>{ev.preventDefault();const input=$('chatInput');
  const text=input.value.trim();if(postMessage(text))input.value='';
 });
 $('ideaChips').addEventListener('click',ev=>{
  const target=ev.target.closest?.('button[data-say]');
  if(target)postMessage(target.dataset.say);
 });
 $('evolveBtn').addEventListener('click',doEvolve);
 $('hatchBtn').addEventListener('click',askHatch);
 $('boxBtn').addEventListener('click',openBoxModal);
 $('boxOpenBtn').addEventListener('click',doOpenBox);
 $('boxAgainBtn').addEventListener('click',resetBoxModal);
 $('boxCloseBtn').addEventListener('click',closeBoxModal);
 $('boxModal').addEventListener('click',ev=>{if(ev.target===$('boxModal'))closeBoxModal();});
 $('eggList').addEventListener('click',ev=>{
  const t=ev.target.closest?.('button[data-line]');if(t)hatchEggLine(t.dataset.line);
 });
 $('eggCloseBtn').addEventListener('click',()=>{$('eggModal').hidden=true;});
 $('eggModal').addEventListener('click',ev=>{if(ev.target===$('eggModal'))$('eggModal').hidden=true;});
 $('saveBtn').addEventListener('click',exportImage);
 $('quickSave').addEventListener('click',exportImage);
 $('resetBtn').addEventListener('click',resetLab);
 window.requestAnimationFrame?.(render);
}
if(new URLSearchParams(location.search).get('qa')==='1'){
 Object.defineProperty(window,'__CREATURE_QA__',{value:{
  classify,post:postMessage,evolve:doEvolve,hatch:hatchEggLine,
  state:()=>JSON.parse(JSON.stringify(state)),
  energy:()=>state.energy,
  canEvolve:()=>CRE.canEvolve(state),
  evolveCost:n=>CRE.evolveCost(n),
  gainEnergy:()=>{const e=CRE.gainEnergy(state);writeState();return e;},
  grantBox:(reason,today)=>CRE.grantBox(state,reason,today),
  openBox:rand=>CRE.openBox(state,rand),
  boxItems:()=>CRE.boxItems(),
  boxes:()=>state.boxes,
  boxCollection:()=>JSON.parse(JSON.stringify(state.boxCollection)),
  lineForTopics:t=>CRE.lineForTopics(t),
  dominantTopic:t=>CRE.dominantTopic(t),
  lines:()=>Object.keys(CRE.CREATURE_LINES),
  stages:()=>CRE.CREATURE_STAGES.slice(),
  reset:resetLab,
  exportImage,draw:()=>draw(0),
  allTopics:Object.keys(TOPICS)
 }});
}
init();
})();
