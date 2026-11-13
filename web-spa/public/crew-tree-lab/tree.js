(()=>{'use strict';
const $=id=>document.getElementById(id);
const canvas=$('treeCanvas'),ctx=canvas.getContext('2d');
const STORE='crew-tree-lab-v1',CURRENT='crew-tree-current-v1',MAX_GROWTH=32,MAX_SAVED=18,TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const VISUAL_KINDS=['island','jelly','round','tall','weeping','twin'];
const WORLD_CHOICES=['auto','cosmos','warmth','music','travel'];
const KIND_LABELS={island:'漂流浮島樹',jelly:'水母燈籠樹',round:'V5 圓冠樹',tall:'V5 高樹',weeping:'V5 垂柳樹',twin:'V5 雙生樹'};
const WORLD_LABELS={cosmos:'宇宙',warmth:'溫暖',music:'音樂',travel:'旅行'};
const milestone={
 island:{
  3:{emoji:'🌱',title:'第一位小居民搬進浮島！',detail:'小苗旁邊，亮起一盞新朋友的燈。'},
  8:{emoji:'🏝️',title:'新浮島出現了！',detail:'藤橋伸向第二座小島，新鄰居來了。'},
  16:{emoji:'✨',title:'漂流群島完整展開！',detail:'四座浮島和新居民一起點亮夜空。'}
 },
 jelly:{
  3:{emoji:'🫧',title:'第一隻小魚來作伴！',detail:'小水母的傘下，多了一位發光的朋友。'},
  8:{emoji:'🪼',title:'水母燈籠長出新觸鬚！',detail:'珊瑚根舒展，更多小光球游過來。'},
  16:{emoji:'🌟',title:'傳說燈籠樹完全點亮！',detail:'整座水底世界亮起來，小魚們集合了。'}
 },
 botanical:{
  3:{emoji:'🌱',title:'小樹迎來第一位朋友！',detail:'新的嫩葉和居民一起出現。'},
  8:{emoji:'🌿',title:'新枝條展開了！',detail:'新的樹冠和小夥伴正慢慢長大。'},
  16:{emoji:'✨',title:'魔法樹長成了！',detail:'枝葉茂盛，新的驚喜還在繼續。'}
 }
};
let soundEnabled=true;
function stageForTurns(n){return n<8?3:n<16?8:16;}
function resolvedWorld(tree){
 if(WORLD_CHOICES.includes(tree.world)&&tree.world!=='auto')return tree.world;
 const t=topTopic(tree);
 if(t==='cosmos'||t==='music'||t==='travel')return t;
 if(['love','stress','food','animals','weather','nature'].includes(t))return 'warmth';
 return ['cosmos','warmth','music','travel'][tree.seed%4];
}
function isFantasy(tree){return tree&&['island','jelly'].includes(tree.visualKind);}
function clearSurprise(){
 clearTimeout(surpriseTimer);surpriseTimer=0;
 const box=$('surpriseMoment');
 if(box){box.hidden=true;box.classList.remove('enter');}
}
function cueSurprise(event){
 if(!event)return;
 // The small below-art ribbon is the only milestone announcement.
 // Do not leave the previous centered growthToast obscuring the new resident.
 clearTimeout(toastTimer);toastTimer=0;
 $('growthToast').classList.remove('show');
 clearSurprise();
 const box=$('surpriseMoment');box.hidden=false;
 $('surpriseIcon').textContent=event.emoji;
 $('surpriseTitle').textContent=event.title;$('surpriseDetail').textContent=event.detail;
 box.classList.remove('enter');void box.offsetWidth;box.classList.add('enter');
 surpriseTimer=setTimeout(clearSurprise,3300);
 if(soundEnabled){try{
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(Audio){if(!audioContext)audioContext=new Audio();
   if(audioContext.state==='suspended')audioContext.resume?.();
   const at=audioContext.currentTime;
   [659.25,880,1046.5].forEach((note,i)=>{
    const o=audioContext.createOscillator(),g=audioContext.createGain();
    o.type='sine';o.frequency.value=note;
    g.gain.setValueAtTime(.0001,at+i*.093);
    g.gain.exponentialRampToValueAtTime(.038,at+i*.093+.018);
    g.gain.exponentialRampToValueAtTime(.0001,at+i*.093+.20);
    o.connect(g);g.connect(audioContext.destination);
    o.start(at+i*.093);o.stop(at+i*.093+.21);
   });
  }
 }catch{}}
 try{if(typeof navigator!=='undefined'&&typeof navigator.vibrate==='function')
  navigator.vibrate([28,45,44]);}catch{}
}
function chooseKind(value){
 if(!VISUAL_KINDS.includes(value))return false;
 clearSurprise();$('watchGrowthBtn').hidden=true;
 current.visualKind=value;
 if(['round','tall','weeping','twin'].includes(value))current.genome.treeFamily=value;
 growthMotion=null;renameTree(current);writeStorage();updateTreeUI();renderGallery();return true;
}
function chooseWorld(value){
 if(!WORLD_CHOICES.includes(value))return false;
 clearSurprise();$('watchGrowthBtn').hidden=true;
 current.world=value;growthMotion=null;writeStorage();updateTreeUI();renderGallery();return true;
}
const SILHOUETTES=[
 {name:'直衝雲端',height:1.17,spread:.70,wiggle:.07,lean:0,droop:0},
 {name:'螺旋跳舞',height:1.03,spread:1.04,wiggle:.50,lean:.03,droop:0},
 {name:'矮胖盆栽',height:.74,spread:1.55,wiggle:.18,lean:.02,droop:.12},
 {name:'垂頭楊柳',height:.98,spread:1.23,wiggle:.14,lean:-.04,droop:.72},
 {name:'分岔雙生',height:1.07,spread:1.25,wiggle:.2,lean:.03,droop:.03},
 {name:'珊瑚亂枝',height:.89,spread:1.47,wiggle:.28,lean:-.01,droop:-.26},
 {name:'繪本魔法樹',height:1.24,spread:1.12,wiggle:.21,lean:0,droop:.09},
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
let bubbles=[],toastTimer=0,surpriseTimer=0,audioContext=null,reduceMotion=false,sessionMessages=0,growthMotion=null;
function rng32(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function randomSeed(){return ((Math.floor(Math.random()*4294967296) ^ Date.now())>>>0)||1;}
function makeTree(seed=randomSeed()){
 const r=rng32(seed);
 // Four structural species share one seeded, versioned DNA contract.
 const curatedPalettes=[0,1,7,9];
 const families=['round','tall','weeping','twin'];
 return {seed,genome:{treeFamily:families[seed%4],crownVariant:(seed>>>3)&1,
  silhouette:6,leaf:Math.floor(r()*LEAVES.length),
  palette:curatedPalettes[Math.floor(r()*curatedPalettes.length)],
  lean:(r()*2-1)*.40,twist:(r()*2-1)*.42,fruit:Math.floor(r()*12)},
  growth:[],tags:{},mutations:[],visualKind:seed%2?'island':'jelly',world:'auto',name:'小小的歪樹苗',createdAt:Date.now()};
}
function validateTree(value){
 if(!value||!Number.isSafeInteger(value.seed)||!value.genome||!Array.isArray(value.growth)||value.growth.length>MAX_GROWTH)return null;
 const g=value.genome;
 if(!Number.isInteger(g.silhouette)||g.silhouette<0||g.silhouette>=SILHOUETTES.length||
 !Number.isInteger(g.leaf)||g.leaf<0||g.leaf>=LEAVES.length||
 !Number.isInteger(g.palette)||g.palette<0||g.palette>=PALETTES.length)return null;
 const t=makeTree(value.seed);
 t.genome={...t.genome,treeFamily:['round','tall','weeping','twin'].includes(g.treeFamily)?g.treeFamily:
  (g.silhouette===0?'tall':g.silhouette===3||g.silhouette===10?'weeping':g.silhouette===4?'twin':'round'),
  crownVariant:g.crownVariant===0||g.crownVariant===1?g.crownVariant:(value.seed>>>3)&1,
  silhouette:g.silhouette,leaf:g.leaf,palette:g.palette,
  lean:clamp(Number(g.lean)||0,-1,1),twist:clamp(Number(g.twist)||0,-1,1),fruit:Math.abs(Math.floor(g.fruit||0))%12};
 t.growth=value.growth.map(entry=>({topic:TOPICS[entry?.topic]?entry.topic:'daily',
  mood:clamp(Number(entry?.mood)||0,-1,1),energy:clamp(Number(entry?.energy)||.5,0,1)}));
 t.tags=Object.fromEntries(Object.entries(value.tags||{}).filter(([k,v])=>TOPICS[k]&&Number.isFinite(v)).map(([k,v])=>[k,clamp(v,0,100)]));
 t.mutations=[...new Set((value.mutations||[]).filter(k=>MUTATIONS.some(m=>m.key===k)))].slice(0,12);
 // Existing V5 saves have no visualKind; preserve their legacy family.
 t.visualKind=VISUAL_KINDS.includes(value.visualKind)?value.visualKind:t.genome.treeFamily;
 t.world=WORLD_CHOICES.includes(value.world)?value.world:'auto';
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
 const tag=topTopic(tree);
 const nick={food:'咖啡過量',cosmos:'星球出走',tech:'半夜更新',travel:'到處旅行',love:'暖呼呼',weather:'下雨忘帶傘',
 nature:'森林迷路',dream:'月亮睡過頭',stress:'今天好辛苦',play:'胡鬧亂長',animals:'貓咪佔領',music:'邊唱邊跳',daily:'閒聊亂長'};
 // V9 names use the selected living species, never the hidden V5 genome.
 // Original botanical species names already end in 樹; don't append a duplicate.
 const species=isFantasy(tree)?KIND_LABELS[tree.visualKind]:
  (window.CrewTreeV5.labels[tree.genome.treeFamily]||'圓冠魔法樹');
 tree.name=(total<4?'':nick[tag]+'·')+species;
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
function buildGeometry(tree){return window.CrewTreeV5.generate(tree);}
function treeSignature(tree){
 const geo=buildGeometry(tree);
 return [tree.visualKind,resolvedWorld(tree),tree.genome.treeFamily,tree.genome.crownVariant,tree.genome.silhouette,tree.genome.leaf,tree.genome.palette,
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
 const kind=KIND_LABELS[current.visualKind]||'圓冠魔法樹';
 $('kindSelect').value=current.visualKind;$('worldSelect').value=current.world;
 $('worldName').textContent='世界：'+WORLD_LABELS[resolvedWorld(current)];
 $('treeArtVersion').textContent=isFantasy(current)?'✨ Art V9 · 活的幻想樹':'🌿 四大樹種 · Art V5';
 const next=[3,8,16].find(x=>x>n);
 $('nextSurprise').textContent=next?'再聊 '+(next-n)+' 句，解鎖下一個驚喜':'傳說世界已解鎖 · 每句仍會繼續成長';
 const traits=[
  '🌳 '+kind,
  '🍃 '+LEAVES[current.genome.leaf],
  TOPICS[topic].icon+' '+TOPICS[topic].label,
 '🌌 '+WORLD_LABELS[resolvedWorld(current)]
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
 const previousTurns=current.growth.length;
 const previouslyVisible=previousTurns*3;
 appendMessage('me',text);
 const {signal,mutation}=evolve(text);
 growthMotion={from:previouslyVisible,fromTurns:previousTurns,start:Date.now(),duration:1250};
 const reply=sayZoe(signal,turn);
 appendMessage('zoe',reply);
 sessionMessages++;
 updateTreeUI();
 const surprise=(milestone[current.visualKind]||milestone.botanical)[current.growth.length]||null;
 $('watchGrowthBtn').hidden=false;
 $('watchGrowthBtn').textContent=surprise?surprise.emoji+' '+surprise.title+' · 看驚喜':
  '🌱 第 '+current.growth.length+' 句，樹又長大了 · 看一眼';
 if(surprise)cueSurprise(surprise);
 else popToast(mutation?'✨ 突變！'+MUTATIONS.find(m=>m.key===mutation).name:'🌱 '+TOPICS[signal.topic].label+'長出新枝！');
 sparkle();
 return {topic:signal.topic,mutation,turn,count:current.growth.length,reply,surprise:surprise?.title||null};
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
 current=makeTree();geom=buildGeometry(current);growthMotion=null;clearSurprise();$('watchGrowthBtn').hidden=true;writeStorage();
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
 geom=buildGeometry(current);growthMotion=null;clearSurprise();$('watchGrowthBtn').hidden=true;writeStorage();
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
  const meta=document.createElement('small');meta.textContent=tree.growth.length+' 句 · '+(KIND_LABELS[tree.visualKind]||window.CrewTreeV5.labels[tree.genome.treeFamily]||'圓冠魔法樹')+' · '+WORLD_LABELS[resolvedWorld(tree)];
  desc.append(name,meta);b.append(icon,desc);
  b.addEventListener('click',()=>openSaved(tree.seed));gallery.appendChild(b);
 }
}
function drawSky(c,width,height,tree,clock){
 const floor=height*.85;
 const grad=c.createLinearGradient(0,0,0,height);
 grad.addColorStop(0,'#d5e5d5');
 grad.addColorStop(.54,'#edf0dc');
 grad.addColorStop(.84,'#e6e6ca');
 grad.addColorStop(1,'#a5baa0');
 c.fillStyle=grad;c.fillRect(0,0,width,height);
 // Deliberately quiet storybook backdrop: warm daylight, distant hand-drawn hills.
 // No repeated floating glass ovals or high-gloss radial bubbles.
 c.save();
 const light=c.createRadialGradient(width*.23,height*.15,2,width*.23,height*.15,width*.65);
 light.addColorStop(0,'#fef9db9c');light.addColorStop(.42,'#fff9e836');light.addColorStop(1,'#fff9e800');
 c.fillStyle=light;c.fillRect(0,0,width,height);
 c.globalAlpha=.38;
 c.fillStyle='#b4cbb6';c.beginPath();c.moveTo(0,floor-36);
 c.bezierCurveTo(width*.19,floor-79,width*.31,floor-23,width*.53,floor-45);
 c.bezierCurveTo(width*.72,floor-80,width*.88,floor-38,width,floor-53);
 c.lineTo(width,floor);c.lineTo(0,floor);c.fill();
 c.fillStyle='#98b8a5';c.beginPath();c.moveTo(0,floor-10);
 c.bezierCurveTo(width*.16,floor-33,width*.35,floor-3,width*.52,floor-20);
 c.bezierCurveTo(width*.78,floor-43,width*.88,floor-9,width,floor-22);
 c.lineTo(width,floor);c.lineTo(0,floor);c.fill();
 c.restore();
 // Natural soil instead of the earlier hard striped floor.
 c.fillStyle='#6c8c70';c.fillRect(0,floor,width,height-floor);
 const earth=c.createLinearGradient(0,floor,0,height);
 earth.addColorStop(0,'#648765');earth.addColorStop(.9,'#3c6556');
 c.fillStyle=earth;c.fillRect(0,floor+4,width,height-floor);
 c.strokeStyle='#476d55';c.lineWidth=2;c.beginPath();
 c.moveTo(0,floor+2);c.lineTo(width,floor+2);c.stroke();
 // Hand-placed soft tufts, staying behind the hero tree.
 const dots=Math.round(width/39);
 for(let i=0;i<dots;i++){
  const x=(i+.31+((i*7)%4)*.11)*width/dots,y=floor+9+(i*17)%26;
  c.globalAlpha=.22;c.strokeStyle=i%3?'#add1a0':'#d6d3a0';
  c.lineWidth=1.15;c.beginPath();
  c.moveTo(x-6,y+2);c.quadraticCurveTo(x-9,y-6,x-10,y-7);
  c.moveTo(x-6,y+2);c.quadraticCurveTo(x-1,y-4,x,y-8);
  c.stroke();
 }
 c.globalAlpha=1;
}
function drawTree(c,tree,geometry,ox,oy,factor,clock){
 let revealFrom=geometry.branches.length,progress=1;
 if(tree===current&&c===ctx&&growthMotion&&!reduceMotion){
  progress=clamp((Date.now()-growthMotion.start)/850,0,1);
  revealFrom=growthMotion.from;
  if(progress>=1)growthMotion=null;
 }
 return window.CrewTreeV5.paint(c,tree,geometry,ox,oy,factor,clock,{
  revealFrom,progress,reducedMotion:reduceMotion,topics:TOPICS,mutations:MUTATIONS
 });
}
function scene(c,width,height,tree,geometry,clock,card=false){
 if(isFantasy(tree)&&window.CrewFantasyGameArt&&c.canvas){
  const count=tree.growth.length,stage=stageForTurns(count);
  const active=tree===current&&c===ctx&&growthMotion&&!reduceMotion&&!card;
  const progress=active?clamp((Date.now()-growthMotion.start)/1250,0,1):1;
  const from=active?stageForTurns(growthMotion.fromTurns):stage;
  const transition=active&&progress<1?{from,to:stage,progress,pulse:from===stage}:null;
  // One real scene renderer for the game, thumbnails, and exported image.
  // Explicit virtual dimensions prevent offscreen canvases from defaulting to 400px.
  window.CrewFantasyGameArt.paint(c.canvas,tree.visualKind,stage,tree.seed,
   resolvedWorld(tree),clock,reduceMotion||card,false,transition,null,
   {width,height,px:card||c!==ctx?1:dpr,turns:count,
    fromTurns:active?growthMotion.fromTurns:count});
  if(active&&progress>=1)growthMotion=null;
 }else{
  drawSky(c,width,height,tree,clock);
  const layout=window.CrewTreeV5.layout(geometry.bounds,width,height,card);
  drawTree(c,tree,geometry,layout.ox,layout.oy,layout.factor,clock);
 }
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
 $('kindSelect').addEventListener('change',ev=>chooseKind(ev.target.value));
 $('worldSelect').addEventListener('change',ev=>chooseWorld(ev.target.value));
 $('watchGrowthBtn').addEventListener('click',()=>{
  $('canvasWrap').scrollIntoView?.({behavior:reduceMotion?'auto':'smooth',block:'center'});
  $('watchGrowthBtn').hidden=true;
 });
 $('soundBtn').addEventListener('click',()=>{
  soundEnabled=!soundEnabled;
  $('soundBtn').textContent=soundEnabled?'🔊 音效開':'🔇 音效關';
  $('soundBtn').setAttribute('aria-pressed',String(soundEnabled));
 });
 window.addEventListener?.('resize',resize);
 if(window.ResizeObserver)new window.ResizeObserver(resize).observe($('canvasWrap'));
 window.addEventListener?.('crew-tree-art-ready',renderGallery);
 window.addEventListener?.('crew-tree-fantasy-ready',renderGallery);
 window.requestAnimationFrame?.(render);
}
if(new URLSearchParams(location.search).get('qa')==='1'){
 Object.defineProperty(window,'__TREE_QA__',{value:{
  classify,makeTree,validateTree,buildGeometry,treeSignature,post:postMessage,save:saveTree,newTree:createNewTree,
  chooseKind,chooseWorld,resolvedWorld,stageForTurns,
  open:openSaved,exportImage,allTopics:Object.keys(TOPICS),mutations:MUTATIONS.map(m=>m.key),
  getRendererVersion:()=>window.CrewTreeV5.modelVersion,
  families:window.CrewTreeV5.families.slice(),
  artStatus:()=>window.CrewBotany.artStatus(),
  shapes:SILHOUETTES.map(p=>p.name),leaves:LEAVES.slice(),
  state:()=>({current:JSON.parse(JSON.stringify(current)),forest:JSON.parse(JSON.stringify(forest)),
   geometry:geom,sessionMessages,renderTime,growthMotion:growthMotion?{...growthMotion}:null,soundEnabled}),
  draw:()=>scene(ctx,w,h,current,geom,renderTime)
 }});
}
init();
})();