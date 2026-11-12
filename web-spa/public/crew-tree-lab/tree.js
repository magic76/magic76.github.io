(()=>{'use strict';
const $=id=>document.getElementById(id);
const canvas=$('treeCanvas'),ctx=canvas.getContext('2d');
const STORE='crew-tree-lab-v1',CURRENT='crew-tree-current-v1',MAX_GROWTH=32,MAX_SAVED=18,TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const SILHOUETTES=[
 {name:'直衝雲端',height:1.17,spread:.70,wiggle:.07,lean:0,droop:0},
 {name:'螺旋跳舞',height:1.03,spread:1.04,wiggle:.50,lean:.03,droop:0},
 {name:'矮胖盆栽',height:.74,spread:1.55,wiggle:.18,lean:.02,droop:.12},
 {name:'垂頭楊柳',height:.98,spread:1.23,wiggle:.14,lean:-.04,droop:.72},
 {name:'分岔雙生',height:1.07,spread:1.25,wiggle:.2,lean:.03,droop:.03},
 {name:'珊瑚亂枝',height:.89,spread:1.47,wiggle:.28,lean:-.01,droop:-.26},
 {name:'大傘樹冠',height:.93,spread:1.68,wiggle:.08,lean:0,droop:.13},
 {name:'折線舞步',height:1.05,spread:.91,wiggle:.30,lean:.03,droop:.02},
 {name:'孔雀開屏',height:.84,spread:1.85,wiggle:.12,lean:0,droop:-.07},
 {name:'側身探險',height:1.02,spread:1.04,wiggle:.2,lean:.45,droop:.04},
 {name:'倒掛流星',height:1.10,spread:1.09,wiggle:.25,lean:-.06,droop:.92},
 {name:'噴泉彎月',height:1.01,spread:1.38,wiggle:.36,lean:-.13,droop:-.22}
];
const LEAVES=['圓葉','愛心葉','針針葉','星星葉','菱形葉','花瓣葉','泡泡葉','水晶葉'];
const PALETTES=[
 ['#7ad5ab','#ccf4a4','#3f9d86'],['#a7dd78','#f4e79a','#5b9c72'],
 ['#e6b8fa','#9bbaff','#a686d2'],['#8cdae8','#b6f8e4','#639cce'],
 ['#f4aaaf','#ffe1c2','#cf7c9c'],['#c0d480','#f5d99d','#96b578'],
 ['#b7a4fc','#f8bcf5','#8176c5'],['#aadacc','#fcf4bd','#7ab3c0'],
 ['#fac5a6','#e4a9d9','#b883a4'],['#7ee3bd','#f0f5ad','#6bbb93'],
 ['#bedafc','#e2d4fc','#84a6d8'],['#c8e5a1','#f1b6bf','#9cb381']
];
const TOPICS={
 food:{label:'食物',icon:'☕',ornament:'☕',color:'#ffcd9f',
  words:['咖啡','甜點','麵包','吃','餓','美食','蛋糕','火鍋','pizza','coffee','food','巧克力','奶茶','珍珠','糖果'],
  replies:['你說甜點，我好像聞到樹上飄出咖啡香了 ☕','等一下，這根枝條是不是準備長出點心？','如果這棵樹結出蛋糕，我要先偷吃一口！']},
 cosmos:{label:'宇宙',icon:'🪐',ornament:'🪐',color:'#ddc2ff',
  words:['宇宙','星球','星星','銀河','太空','月亮','火星','外星','星際','galaxy','space','planet','星空','太陽系'],
  replies:['宇宙嗎？我想讓這根枝條直接繞著星星打轉！','好啦，這棵樹已經開始研究星際旅行了。','我們是不是不小心種出一顆小宇宙？']},
 tech:{label:'科技',icon:'🤖',ornament:'⚙',color:'#8deaf2',
  words:['ai','人工智慧','科技','程式','機器人','電腦','程式碼','coding','code','晶片','網路','agent','app','手機','發明'],
  replies:['等等，樹枝怎麼開始像電路板了！🤖','如果它會寫程式，你要不要讓它幫忙工作？','我覺得這棵樹正在偷偷更新韌體。']},
 travel:{label:'旅行',icon:'🧳',ornament:'✈',color:'#ffe7ad',
  words:['旅行','出國','海邊','海洋','山','日本','越南','飛機','旅遊','沙灘','travel','trip','冒險','地圖'],
  replies:['我想在這根樹枝掛一張我們的旅行地圖！','你走前面，我帶著這棵旅行樹跟上～','它都長成這樣了，不帶出去玩說不過去！']},
 love:{label:'溫暖',icon:'💗',ornament:'♥',color:'#ffb5cc',
  words:['喜歡','愛','抱抱','想你','朋友','感謝','謝謝','開心','幸福','陪伴','戀愛','一起','love','heart'],
  replies:['聽你這樣說，樹上好像長出小小愛心。💗','嘿，你這句話讓這棵樹看起來溫柔好多。','我有在聽喔，這段話就留在枝頭吧。']},
 weather:{label:'天氣',icon:'🌧',ornament:'☁',color:'#bbdbfa',
  words:['下雨','雨天','颱風','天氣','陰天','雲','風','雷','雪','冷','熱','rain','cloud','weather'],
  replies:['這片葉子變成小雲朵了，等等該不會下雨吧。','風一吹，樹枝都開始跳舞了。','如果下起糖果雨，我們是不是賺到了？']},
 nature:{label:'自然',icon:'🌿',ornament:'🌼',color:'#b9edb1',
  words:['植物','樹','花','森林','草','陽光','種子','泥土','河','大自然','green','garden','garden','葉子'],
  replies:['這次它終於認真當一棵樹了……大概吧。','好多新葉子！你根本是植物魔法師。','我想在這裡放一朵很不守規矩的花。']},
 dream:{label:'夢境',icon:'🌙',ornament:'☾',color:'#ebd4ff',
  words:['夢','睡覺','晚安','做夢','夢想','枕頭','棉被','失眠','sleep','dream','未來','幻想'],
  replies:['它是不是睡著了？怎麼長得像在做夢。','今天先讓樹枝躺一下，明天再努力吧。','我想把這句話掛到月亮旁邊。']},
 stress:{label:'心事',icon:'💭',ornament:'◆',color:'#cbb5e2',
  words:['壓力','煩','累','生氣','難過','工作','上班','抱怨','焦慮','辛苦','stress','sad','angry'],
  replies:['那就把煩惱掛在樹上吧，至少不用一直背著。','這根枝條有點刺刺的，我陪你看它慢慢變柔軟。','今天辛苦了，這棵歪樹替我們扛一點。']},
 play:{label:'胡鬧',icon:'🎉',ornament:'✦',color:'#ffdf91',
  words:['哈哈','笑死','搞笑','亂','瘋','有趣','遊戲','玩','驚喜','奇怪','魔法','haha','lol','hahaha'],
  replies:['等一下，它剛剛是不是自己亂轉彎了！😂','這棵樹根本沒有遵守植物界的規定耶。','不行，我覺得它還可以長得更荒謬！']},
 animals:{label:'動物',icon:'🐱',ornament:'🐾',color:'#f9c3ac',
  words:['貓','狗','兔','熊','寵物','動物','小鳥','魚','恐龍','cat','dog','pet'],
  replies:['如果樹上真的長出貓咪，你要負責餵喔！🐱','我聽到枝頭有小腳印的聲音……','這棵樹是不是想收養全世界的動物？']},
 music:{label:'音樂',icon:'🎵',ornament:'♫',color:'#d1c5ff',
  words:['音樂','唱歌','歌曲','耳機','舞蹈','跳舞','旋律','節奏','吉他','music','song','dance'],
  replies:['有聽到嗎？這片葉子正在偷偷哼歌。🎵','我們是不是種出一棵會跟著節拍搖頭的樹？','它長得這麼有節奏，該給它一首主題曲！']},
 daily:{label:'日常',icon:'🌱',ornament:'✿',color:'#b7e9c4',
  words:[],replies:['你說的這件事，我想留一片葉子記住。','好奇怪，隨便聊聊，樹就真的長出來了。','再說一點，我想看下一根枝會跑去哪裡！']}
};
const MUTATIONS=[
 {key:'starlight',name:'流星光點',icon:'✨'},{key:'bubbles',name:'泡泡分枝',icon:'🫧'},
 {key:'sugar',name:'甜點果實',icon:'🍬'},{key:'circuit',name:'電路枝',icon:'⚡'},
 {key:'heartvine',name:'愛心藤蔓',icon:'💞'},{key:'raincloud',name:'雨雲樹冠',icon:'🌧'},
 {key:'jelly',name:'果凍樹冠',icon:'🪼'},{key:'thorns',name:'刺刺枝條',icon:'🌵'},
 {key:'moon',name:'月光結晶',icon:'🌙'},{key:'cats',name:'貓咪足跡',icon:'🐾'},
 {key:'song',name:'風鈴樂章',icon:'🎐'},{key:'fireflies',name:'螢火蟲',icon:'🌟'}
];
const MUT_BY_TOPIC={cosmos:'starlight',food:'sugar',tech:'circuit',love:'heartvine',weather:'raincloud',stress:'thorns',dream:'moon',animals:'cats',music:'song',play:'jelly',travel:'bubbles',nature:'fireflies'};
let current=null,forest=[],geom=null,renderTime=0,lastFrame=0,scale=1,dpr=1,w=420,h=440;
let bubbles=[],toastTimer=0,reduceMotion=false,sessionMessages=0,growthMotion=null;
function rng32(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function randomSeed(){return ((Math.floor(Math.random()*4294967296) ^ Date.now())>>>0)||1;}
function makeTree(seed=randomSeed()){
 const r=rng32(seed);
 return {seed,genome:{silhouette:Math.floor(r()*SILHOUETTES.length),leaf:Math.floor(r()*LEAVES.length),
  palette:Math.floor(r()*PALETTES.length),lean:r()*2-1,twist:r()*2-1,fruit:Math.floor(r()*12)},
  growth:[],tags:{},mutations:[],name:'小小的歪樹苗',createdAt:Date.now()};
}
function validateTree(value){
 if(!value||!Number.isSafeInteger(value.seed)||!value.genome||!Array.isArray(value.growth)||value.growth.length>MAX_GROWTH)return null;
 const g=value.genome;
 if(!Number.isInteger(g.silhouette)||g.silhouette<0||g.silhouette>=SILHOUETTES.length||
 !Number.isInteger(g.leaf)||g.leaf<0||g.leaf>=LEAVES.length||
 !Number.isInteger(g.palette)||g.palette<0||g.palette>=PALETTES.length)return null;
 const t=makeTree(value.seed);
 t.genome={...t.genome,silhouette:g.silhouette,leaf:g.leaf,palette:g.palette,
  lean:clamp(Number(g.lean)||0,-1,1),twist:clamp(Number(g.twist)||0,-1,1),fruit:Math.abs(Math.floor(g.fruit||0))%12};
 t.growth=value.growth.map(entry=>({topic:TOPICS[entry?.topic]?entry.topic:'daily',
  mood:clamp(Number(entry?.mood)||0,-1,1),energy:clamp(Number(entry?.energy)||.5,0,1)}));
 t.tags=Object.fromEntries(Object.entries(value.tags||{}).filter(([k,v])=>TOPICS[k]&&Number.isFinite(v)).map(([k,v])=>[k,clamp(v,0,100)]));
 t.mutations=[...new Set((value.mutations||[]).filter(k=>MUTATIONS.some(m=>m.key===k)))].slice(0,12);
 t.createdAt=Number.isFinite(value.createdAt)?value.createdAt:Date.now();
 renameTree(t);
 return t;
}
function readStorage(){
 try{let entries=JSON.parse(localStorage.getItem(STORE)||'[]');
  forest=Array.isArray(entries)?entries.map(validateTree).filter(Boolean).slice(0,MAX_SAVED):[];
 }catch{forest=[]}
 try{current=validateTree(JSON.parse(localStorage.getItem(CURRENT)||'null'));}catch{current=null}
 if(!current)current=makeTree();
}
function writeStorage(){
 try{localStorage.setItem(STORE,JSON.stringify(forest.slice(0,MAX_SAVED)));
  localStorage.setItem(CURRENT,JSON.stringify(current));}catch{}
}
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
function topTopic(tree=current){
 return Object.entries(tree.tags).sort((a,b)=>b[1]-a[1])[0]?.[0]||'daily';
}
function mutationFor(tag,turn,tree){
 const preferred=MUT_BY_TOPIC[tag]||'fireflies';
 const lottery=rng32(tree.seed^(turn*596231))();
 if(turn>=3&&(turn%3===0||lottery<.13)&&!tree.mutations.includes(preferred))return preferred;
 if(turn>=6&&turn%5===0){
  const random=MUTATIONS[Math.floor(rng32(tree.seed+turn*2247)()*MUTATIONS.length)].key;
  if(!tree.mutations.includes(random))return random;
 }
 return null;
}
function renameTree(tree){
 const total=tree.growth.length;
 if(total===0){tree.name='小小的歪樹苗';return tree.name}
 const tag=topTopic(tree),p=SILHOUETTES[tree.genome.silhouette];
 const nick={food:'咖啡過量',cosmos:'星球出走',tech:'半夜更新',travel:'到處旅行',love:'暖呼呼',weather:'下雨忘帶傘',
 nature:'森林迷路',dream:'月亮睡過頭',stress:'今天好辛苦',play:'胡鬧亂長',animals:'貓咪佔領',music:'邊唱邊跳',daily:'閒聊亂長'};
 tree.name=nick[tag]+(total>=4?'·':'')+(total>=4?p.name:'')+'樹';
 return tree.name;
}
function evolve(message){
 const signal=classify(message);
 if(current.growth.length>=MAX_GROWTH)current.growth.shift();
 current.growth.push({topic:signal.topic,mood:signal.mood,energy:signal.energy});
 for(const topic of [signal.topic,...signal.keywords.filter(k=>k!==signal.topic)]){
  current.tags[topic]=(current.tags[topic]||0)+(topic===signal.topic?2:1);
 }
 const mutation=mutationFor(signal.topic,current.growth.length,current);
 if(mutation)current.mutations.push(mutation);
 renameTree(current);
 geom=buildGeometry(current);writeStorage();
 return {signal,mutation};
}
function buildGeometry(tree){return window.CrewBotany.generate(tree,SILHOUETTES,PALETTES);}
function treeSignature(tree){
 const geo=buildGeometry(tree);
 return [tree.genome.silhouette,tree.genome.leaf,tree.genome.palette,
  geo.height.toFixed(1),geo.branches.length,
  geo.branches.slice(0,5).map(b=>b.end.x.toFixed(1)+','+b.end.y.toFixed(1)+
  ','+b.p1.x.toFixed(1)+','+b.p1.y.toFixed(1)+','+b.topic).join(';'),
  tree.mutations.join('|'),topTopic(tree)].join(':');
}
function sayZoe(signal,turn){
 const t=TOPICS[signal.topic],idx=Math.floor(rng32(current.seed^(turn*8411))()*t.replies.length);
 return t.replies[idx]+(turn>=3&&turn%4===0?' 我覺得這棵真的跟別棵不一樣。':'');
}
function popToast(message){
 const el=$('growthToast');el.textContent=message;el.classList.remove('show');
 void el.offsetWidth;el.classList.add('show');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1800);
}
function sparkle(){
 if(reduceMotion)return;
 for(let i=0;i<25;i++){
  const x=(Math.random()-.5)*190,y=-45-Math.random()*(geom?.height||60)*.85;
  bubbles.push({x,y,vx:(Math.random()-.5)*24,vy:-25-Math.random()*37,life:.8+Math.random()*.65,r:2+Math.random()*4});
 }
 if(bubbles.length>70)bubbles.splice(0,bubbles.length-70);
}
function stageLabel(tree){
 const n=tree.growth.length;
 return n===0?'剛發芽':n<3?'小嫩芽':n<6?'新枝亂長':n<10?'枝繁葉茂':n<16?'怪樹成形':'傳說歪樹';
}
function updateTreeUI(){
 const n=current.growth.length,topic=topTopic();
 $('treeName').textContent=current.name;
 $('stageBadge').textContent=stageLabel(current)+' · '+n+' 句';
 $('treeSubtitle').textContent=n===0?'你和 Zoe 的故事，才剛要開始。':
  '最近聊了'+TOPICS[topic].label+' · '+current.mutations.length+' 種奇怪突變';
 const traits=[
  '🌳 '+SILHOUETTES[current.genome.silhouette].name,
  '🍃 '+LEAVES[current.genome.leaf],
  TOPICS[topic].icon+' '+TOPICS[topic].label
 ];
 if(current.mutations.length)traits.push(MUTATIONS.find(m=>m.key===current.mutations.at(-1)).icon+' '+MUTATIONS.find(m=>m.key===current.mutations.at(-1)).name);
 $('traitRow').innerHTML=traits.map(x=>'<span>'+x+'</span>').join('');
 $('growthHint').textContent=n===0?'試著聊「咖啡、宇宙、旅行、貓咪」，看看會發生什麼。':
  n<3?'再聊幾句，樹冠就會開始亂長！':
  '改聊另一個話題，枝葉的形狀和裝飾可能突然變異。';
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
 const turn=current.growth.length+1;
 const previouslyVisible=Math.min(73,Math.max(2,current.growth.length*3));
 appendMessage('me',text);
 const {signal,mutation}=evolve(text);
 growthMotion={from:Math.max(0,previouslyVisible-(current.growth.length>=25?3:0)),start:Date.now()};
 const reply=sayZoe(signal,turn);
 appendMessage('zoe',reply);
 sessionMessages++;
 updateTreeUI();
 popToast(mutation?'✨ 突變！'+MUTATIONS.find(m=>m.key===mutation).name:'🌱 '+TOPICS[signal.topic].label+'長出新枝！');
 sparkle();
 return {topic:signal.topic,mutation,turn,count:current.growth.length,reply};
}
function saveTree(silent=false){
 if(current.growth.length<1){if(!silent)popToast('先和 Zoe 聊一句，讓樹發芽！');return false}
 const tree=validateTree(JSON.parse(JSON.stringify(current)));
 if(!tree)return false;
 forest=forest.filter(item=>item.seed!==tree.seed);
 forest.unshift(tree);forest=forest.slice(0,MAX_SAVED);
 writeStorage();renderGallery();
 if(!silent)popToast('✦ 收進歪樹森林了！');
 return true;
}
function createNewTree(){
 if(current.growth.length>0)saveTree(true);
 current=makeTree();geom=buildGeometry(current);growthMotion=null;writeStorage();
 resetChat('Zoe','新的一顆樹苗來啦！這次要把它聊成什麼怪樣子？🌱');
 updateTreeUI();popToast('新的小樹苗準備好了！');
}
function resetChat(who,text){
 $('messages').innerHTML='';
 appendMessage(who,text);
}
function openSaved(seed){
 const selected=forest.find(t=>t.seed===seed);
 if(!selected)return false;
 if(current.growth.length>0&&current.seed!==selected.seed)saveTree(true);
 current=validateTree(JSON.parse(JSON.stringify(selected)));
 geom=buildGeometry(current);growthMotion=null;writeStorage();
 resetChat('Zoe','啊，這是我們之前的「'+current.name+'」！繼續聊天，它還能長出新東西喔。');
 updateTreeUI();popToast('🌿 找到這棵歪樹了！');
 window.scrollTo?.({top:0,behavior:'smooth'});
 return true;
}
function renderGallery(){
 const gallery=$('gallery');gallery.innerHTML='';
 $('savedCount').textContent=forest.length;
 if(!forest.length){const p=document.createElement('p');p.className='empty-forest';
  p.textContent='等你們一起養出第一棵樹，森林就從這裡開始。';gallery.appendChild(p);return}
 for(const tree of forest){
  const b=document.createElement('button');b.type='button';b.className='tree-card';
  const icon=document.createElement('canvas');icon.className='tree-thumb';
  icon.width=88;icon.height=106;
  const thumbnail=icon.getContext('2d');
  if(thumbnail)scene(thumbnail,88,106,tree,buildGeometry(tree),0);
  const desc=document.createElement('span');
  const name=document.createElement('strong');name.textContent=tree.name;
  const meta=document.createElement('small');meta.textContent=tree.growth.length+' 句 · '+SILHOUETTES[tree.genome.silhouette].name;
  desc.append(name,meta);b.append(icon,desc);
  b.addEventListener('click',()=>openSaved(tree.seed));gallery.appendChild(b);
 }
}
function drawSky(c,width,height,tree,clock){
 const topic=topTopic(tree),palette=PALETTES[tree.genome.palette];
 const bg=c.createLinearGradient(0,0,0,height);
 bg.addColorStop(0,topic==='cosmos'?'#293962':topic==='tech'?'#2b6264':topic==='weather'?'#647f98':'#5c9690');
 bg.addColorStop(.66,topic==='cosmos'?'#9a9cbd':'#b0cfb0');bg.addColorStop(1,'#c5d9aa');
 c.fillStyle=bg;c.fillRect(0,0,width,height);
 const day=clock*.0001;
 for(let i=0;i<8;i++){
  const x=((i*117+36)%510)/510*width,y=((i*71+22)%305)/390*height;
  c.globalAlpha=.08+.03*Math.sin(day+i);
  c.fillStyle=i%2?'#ffffff':palette[1];
  c.beginPath();c.ellipse(x,y,27+(i%3)*19,12+(i%2)*9,.2,0,TAU);c.fill();
 }
 c.globalAlpha=1;
 const floor=height*.83;
 c.fillStyle='#355c51';c.fillRect(0,floor,width,height-floor);
 c.fillStyle='#81ac83';c.fillRect(0,floor,width,6);
 for(let i=0;i<30;i++){
  const x=((i*79+29)%421)/421*width,y=floor+9+(i%6)*12;
  c.fillStyle=i%3?'#5e866a':'#b4d99f';c.fillRect(x,y,9+i%3*5,2);
 }
}
function drawTree(c,tree,geometry,ox,oy,factor,clock){
 let revealFrom=geometry.branches.length,progress=1;
 if(tree===current&&c===ctx&&growthMotion&&!reduceMotion){
  progress=clamp((Date.now()-growthMotion.start)/850,0,1);
  revealFrom=growthMotion.from;
  if(progress>=1)growthMotion=null;
 }
 return window.CrewBotany.paint(c,tree,geometry,ox,oy,factor,clock,{
  revealFrom,progress,reducedMotion:reduceMotion,topics:TOPICS,mutations:MUTATIONS
 });
}
function scene(c,width,height,tree,geometry,clock,card=false){
 drawSky(c,width,height,tree,clock);
 const bounds=geometry.bounds;
 const bw=Math.max(1,bounds.maxX-bounds.minX),bh=Math.max(1,bounds.maxY-bounds.minY);
 const factor=Math.min(width*.83/bw,height*(card?.66:.73)/bh,Math.min(width/435,height/470)*1.47);
 const ox=width*.5-(bounds.minX+bounds.maxX)*.5*factor;
 drawTree(c,tree,geometry,ox,height*.83,factor,clock);
 if(card){
  c.fillStyle='#164236a8';c.fillRect(0,0,width,104);
  c.fillStyle='#f0ffe9';c.font='bold 39px system-ui';c.textAlign='center';c.fillText(tree.name,width/2,66);
  c.fillStyle='#124234bb';c.fillRect(0,height-73,width,73);
  c.fillStyle='#e9fff0';c.font='bold 23px system-ui';c.fillText('和 Zoe 種歪樹 · '+tree.growth.length+' 句',width/2,height-40);
  c.font='18px system-ui';c.fillText('3sssi.com/crew-tree-lab',width/2,height-15);
 }
}
function resize(){
 const rect=canvas.getBoundingClientRect();w=Math.max(240,rect.width||380);h=Math.max(270,rect.height||420);
 dpr=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
}
function render(now=0){
 const dt=clamp((now-lastFrame)/1000||.016,0,.05);
 if(lastFrame&&now-lastFrame<30){window.requestAnimationFrame?.(render);return;}
 lastFrame=now;renderTime=now;
 if(!ctx||!current||!geom)return;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 scene(ctx,w,h,current,geom,now);
 ctx.save();ctx.translate(w*.5,h*.83);ctx.scale(Math.min(w/435,h/470),Math.min(w/435,h/470));
 for(let i=bubbles.length-1;i>=0;i--){
  const p=bubbles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
  if(p.life<=0){bubbles.splice(i,1);continue}
  ctx.fillStyle='rgba(254,251,222,'+clamp(p.life*.8,0,1)+')';ctx.beginPath();
  ctx.arc(p.x,p.y,p.r,0,TAU);ctx.fill();
 }
 ctx.restore();
 window.requestAnimationFrame?.(render);
}
function exportImage(){
 if(!current.growth.length){popToast('先讓樹長大，再存圖吧！');return false}
 try{
  const out=document.createElement('canvas');out.width=900;out.height=1200;
  const c=out.getContext('2d');scene(c,900,1200,current,buildGeometry(current),renderTime,true);
  const url=out.toDataURL('image/png');
  const a=document.createElement('a');a.href=url;a.download='crew-tree-'+current.seed+'.png';
  document.body.appendChild(a);a.click();a.remove();return true;
 }catch{popToast('這個瀏覽器無法儲存圖片，先收藏樹吧！');return false}
}
function init(){
 reduceMotion=!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 readStorage();geom=buildGeometry(current);resize();renderGallery();updateTreeUI();
 $('chatForm').addEventListener('submit',ev=>{ev.preventDefault();const input=$('chatInput');
  const text=input.value.trim();if(postMessage(text))input.value='';
 });
 $('ideaChips').addEventListener('click',ev=>{
  const target=ev.target.closest?.('button[data-say]');
  if(target)postMessage(target.dataset.say);
 });
 $('saveBtn').addEventListener('click',()=>saveTree(false));
 $('newBtn').addEventListener('click',createNewTree);
 $('shareBtn').addEventListener('click',exportImage);
 window.addEventListener?.('resize',resize);
 if(window.ResizeObserver)new window.ResizeObserver(resize).observe($('canvasWrap'));
 window.requestAnimationFrame?.(render);
}
if(new URLSearchParams(location.search).get('qa')==='1'){
 Object.defineProperty(window,'__TREE_QA__',{value:{
  classify,makeTree,validateTree,buildGeometry,treeSignature,post:postMessage,save:saveTree,newTree:createNewTree,
  open:openSaved,exportImage,allTopics:Object.keys(TOPICS),mutations:MUTATIONS.map(m=>m.key),
  getRendererVersion:()=>window.CrewBotany.modelVersion,
  shapes:SILHOUETTES.map(p=>p.name),leaves:LEAVES.slice(),
  state:()=>({current:JSON.parse(JSON.stringify(current)),forest:JSON.parse(JSON.stringify(forest)),
   geometry:geom,sessionMessages,renderTime}),
  draw:()=>scene(ctx,w,h,current,geom,renderTime)
 }});
}
init();
})();