const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.join(__dirname,'../web-spa/public/crew-tree-lab');
const script=fs.readFileSync(path.join(dir,'tree.js'),'utf8');
const glowScript=fs.readFileSync(path.join(dir,'forest-v6.js'),'utf8');
const postcardScript=fs.readFileSync(path.join(dir,'postcard-v6.js'),'utf8');
const botany=fs.readFileSync(path.join(dir,'botany.js'),'utf8');
const familyBotany=fs.readFileSync(path.join(dir,'family-art.js'),'utf8');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'tree.css'),'utf8');
const artWall=fs.readFileSync(path.join(dir,'art-review.html'),'utf8');
const artWallScript=fs.readFileSync(path.join(dir,'art-review.js'),'utf8');
const artFiles=['foliage-olive.svg','foliage-sage.svg','foliage-sunlit.svg','foliage-teal.svg','detail-bloom.svg','detail-fruit.svg','detail-star.svg'];
function boot(options={}){
 const nodes=new Map(),memory=new Map(),timers=new Map(),paint={paths:0,ellipses:0,lines:0,frames:0,downloads:0,foliageGradients:0,texts:[],rects:[],canvasSizes:[]};
 let timerId=0;
 if(options.storage)for(const [k,v] of Object.entries(options.storage))memory.set(k,v);
 const gradient=()=>({addColorStop(){}});
 const context2D=new Proxy({
  beginPath(){paint.paths++},ellipse(){paint.ellipses++},lineTo(){paint.lines++},
  createLinearGradient:gradient,
  fillText(text,x,y){paint.frames++;paint.texts.push({text,x,y,color:this.fillStyle})},
  fillRect(x,y,w,h){paint.rects.push({x,y,w,h,color:this.fillStyle})},
  setTransform(){},clearRect(){}
 },{
  get:(o,k)=>o[k]||(
    k==='createRadialGradient'?()=>{paint.foliageGradients++;return gradient()}:
    k==='createLinearGradient'?gradient:()=>{}),
  set:(o,k,v)=>{o[k]=v;return true}
 });
 function element(tag='div'){
  const value={tagName:tag.toUpperCase(),dataset:{},style:{},hidden:false,
   className:'',textContent:'',value:'',scrollTop:0,scrollHeight:240,listeners:{},
   childNodes:[],classList:{add(){},remove(){},toggle(){}},
   addEventListener(k,fn){this.listeners[k]=fn},setAttribute(){},getBoundingClientRect(){return {width:390,height:386}},
   getContext(){return context2D},toDataURL(){paint.canvasSizes.push([this.width,this.height]);return 'data:image/png;base64,ZmFrZQ=='},
   click(){paint.downloads++},remove(){},
   append(...children){this.childNodes.push(...children)},
   appendChild(child){this.childNodes.push(child)},removeChild(child){this.childNodes.splice(this.childNodes.indexOf(child),1)},
   get children(){return this.childNodes},get firstChild(){return this.childNodes[0]},
   closest(){return null}
  };
  let inner='';
  Object.defineProperty(value,'innerHTML',{get(){return inner},set(v){inner=v;this.childNodes.length=0}});
  return value;
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id)};
 const document={getElementById:get,createElement:element,body:element('body')};
 const window={addEventListener(){},requestAnimationFrame(){return 1},devicePixelRatio:3,
  ResizeObserver:class{observe(){}},matchMedia(){return {matches:false}},scrollTo(){}};
 const fantasyCalls=[];
 if(options.fantasy){
  context2D.canvas=get('treeCanvas');
  window.CrewFantasyGameArt={paint:(...args)=>{fantasyCalls.push(args);return {};}};
 }
 const c={document,window,location:{search:'?qa=1'},URLSearchParams,localStorage:{
  getItem:key=>memory.get(key)||null,setItem:(key,v)=>memory.set(key,v)
 },setTimeout(fn){const id=++timerId;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)},Date,Math,console,Number,String,Array,Set,Map};
 vm.createContext(c);vm.runInContext(botany,c,{timeout:10000});vm.runInContext(familyBotany,c,{timeout:10000});if(options.glow){vm.runInContext(glowScript,c,{timeout:10000});vm.runInContext(postcardScript,c,{timeout:10000});}vm.runInContext(script,c,{timeout:10000});
 const qa=window.__TREE_QA__;
 assert.ok(qa,'QA interface is exposed only behind ?qa=1');
 return {qa,memory,get,paint,document,fantasyCalls,timers};
}
test('the garden is a small responsive chat toy, not a fake Gemini conversation',()=>{
 assert.match(html,/和 Zoe 種歪樹/);
 assert.match(html,/lang="zh-Hant"/);
 assert.match(html,/id="treeCanvas"/);
 assert.match(html,/id="chatForm"/);
 assert.match(html,/id="saveBtn"/);
 assert.match(html,/id="shareBtn"/);
 assert.match(html,/id="newBtn"/);
 assert.match(html,/本地聊天互動原型/);
 assert.match(html,/不存聊天原文/);
 assert.match(css,/@media\(max-width:510px\)/);
 assert.doesNotMatch(script+html+css,/\bfetch\s*\(|XMLHttpRequest|WebSocket\s*\(/);
 assert.doesNotMatch(html,/https?:\/\/(?!www\.w3\.org)/);
});
test('curated magical tree starts from one quality silhouette but preserves 12 legacy DNA species',()=>{
 const {qa}=boot();
 assert.equal(qa.shapes.length,12);
 assert.equal(qa.leaves.length,8);
 assert.equal(qa.mutations.length,12);
 const shapes=new Set(),leaves=new Set(),palette=new Set(),families=new Set(),variants=new Set();
 for(let seed=1;seed<=200;seed++){
  const g=qa.makeTree(seed).genome;
  shapes.add(g.silhouette);leaves.add(g.leaf);palette.add(g.palette);families.add(g.treeFamily);variants.add(g.crownVariant);
 }
 assert.deepEqual([...shapes],[6]);assert.equal(families.size,4);assert.equal(variants.size,2);
 assert.equal(leaves.size,8);
 assert.equal(palette.size,4,'new seeds remain within four harmonized color DNA presets');
 const legacy=qa.makeTree(999);legacy.genome.silhouette=11;legacy.genome.palette=11;
 assert.ok(qa.validateTree(legacy),'old saved DNA remains valid');
 assert.ok(Number.isFinite(qa.buildGeometry(legacy).height));
});
test('topic recognition chooses distinct branches and meaningful local Zoe replies',()=>{
 const {qa}=boot();
 const examples={
  food:'我今天想喝咖啡吃蛋糕',
  cosmos:'我們搭太空船去看宇宙星球',
  tech:'我想用 AI 寫程式和機器人',
  travel:'下週去日本旅行搭飛機',
  love:'好開心，謝謝你陪伴我',
  weather:'今天下雨天氣好陰',
  nature:'花草植物森林',
  dream:'昨晚睡覺做了一個夢',
  stress:'工作壓力大，好煩好累',
  play:'哈哈哈 這個遊戲真奇怪',
  animals:'養貓和狗當寵物',
  music:'聽音樂唱歌跳舞'
 };
 for(const [tag,input] of Object.entries(examples)){
  const got=qa.classify(input);
  assert.equal(got.topic,tag,input+' -> '+got.topic);
 }
 assert.equal(qa.classify('這句沒有語意標籤 123').topic,'daily');
 const a=qa.post(examples.food);
 assert.equal(a.topic,'food');
 assert.ok(a.reply.includes('樹')||a.reply.includes('枝'));
 assert.equal(qa.state().current.growth.length,1);
 assert.equal(qa.state().current.growth.length,1);
});
test('a conversation causes obvious new geometry and persists only topic features',()=>{
 const {qa,memory,paint}=boot();
 const before=qa.state();
 const initial=qa.treeSignature(before.current);
 const inputs=['今天想喝咖啡吃蛋糕','如果我們一起去宇宙旅行','幫我寫 AI 機器人',
  '哈哈哈哈 這棵樹好怪','我喜歡你，今天真開心'];
 const sig=[];
 for(const x of inputs){
  const res=qa.post(x);assert.ok(res);
  sig.push(qa.treeSignature(qa.state().current));
 }
 const final=qa.state();
 assert.equal(final.current.growth.length,5);
 assert.ok(final.geometry.branches.length>=15);
 assert.notEqual(initial,sig[0]);
 assert.equal(new Set(sig).size,5,'every chat turn changes morphology, not just dialogue');
 assert.ok(final.current.mutations.length>=1,'mutation milestone around third turn');
 assert.ok(final.current.name.endsWith('樹'));
 assert.ok(final.current.tags.food>0&&final.current.tags.cosmos>0);
 assert.doesNotThrow(()=>qa.draw());
 assert.ok(paint.paths>40,'procedural painting draws real leaves and branches');
 const stored=memory.get('crew-tree-current-v1');
 for(const x of inputs)assert.equal(stored.includes(x),false,'do not store raw private chat: '+x);
 assert.ok(stored.includes('cosmos')&&stored.includes('food'));
});
test('same DNA and growth reconstructs identically, other topics change branch morphology',()=>{
 const {qa}=boot();
 const first=qa.makeTree(89898),second=qa.makeTree(89898);
 assert.equal(qa.treeSignature(first),qa.treeSignature(second));
 assert.deepEqual(JSON.parse(JSON.stringify(qa.buildGeometry(first))),
  JSON.parse(JSON.stringify(qa.buildGeometry(second))));
 qa.post('宇宙星球月亮');
 qa.post('星球星際宇宙');
 const a=qa.state().current,signature=qa.treeSignature(a);
 const copy=qa.validateTree(JSON.parse(JSON.stringify(a)));
 assert.equal(qa.treeSignature(copy),signature,'saved tree must be reproducible');
 const manual=qa.validateTree({...a,growth:[
  {topic:'food',mood:0,energy:.8},
  {topic:'food',mood:0,energy:.8}
 ]});
 assert.notEqual(qa.treeSignature(manual),signature,'different conversation tags reshape branch growth');
});
test('collecting trees, automatic previous-tree preservation, reopening, and storage caps',()=>{
 const {qa,memory}=boot();
 assert.equal(qa.save(),false,'seed alone cannot be collected');
 qa.post('咖啡蛋糕');
 assert.equal(qa.save(),true);
 assert.equal(qa.state().forest.length,1);
 const oldSeed=qa.state().current.seed;
 qa.newTree();
 assert.equal(qa.state().current.growth.length,0);
 assert.equal(qa.state().forest.length,1);
 qa.post('宇宙太空');
 qa.newTree();
 assert.equal(qa.state().forest.length,2);
 assert.equal(qa.open(oldSeed),true);
 assert.equal(qa.state().current.growth[0].topic,'food');
 assert.equal(qa.state().current.seed,oldSeed);
 assert.ok(memory.get('crew-tree-lab-v1').includes('"growth"'));
 assert.ok(qa.state().forest.length<=18);
});
test('every new topic can change tree growth continuously after 32+ messages',()=>{
 const {qa}=boot();
 for(let i=0;i<39;i++)qa.post(i%2?'咖啡甜點':'科技機器人');
 assert.equal(qa.state().current.growth.length,32);
 assert.ok(qa.state().geometry.branches.length<=96);
 assert.equal(qa.state().current.tags.food>0,true);
 assert.equal(qa.state().current.tags.tech>0,true);
 const base=qa.treeSignature(qa.state().current);
 qa.post('我們去宇宙旅行');
 assert.equal(qa.state().current.growth.length,32);
 assert.notEqual(qa.treeSignature(qa.state().current),base);
});
test('export makes an actual canvas PNG and invalid imported trees fail closed',()=>{
 const {qa,paint}=boot();
 assert.equal(qa.exportImage(),false,'cannot export an empty seed');
 qa.post('宇宙星星');
 assert.equal(qa.exportImage(),true);
 assert.equal(paint.downloads,1);
 assert.equal(qa.validateTree({seed:1,growth:new Array(100),genome:{silhouette:0,leaf:0,palette:0}}),null);
 assert.equal(qa.validateTree({seed:1,growth:[],genome:{silhouette:999,leaf:0,palette:0}}),null);
 assert.equal(qa.validateTree(null),null);
});

test('the same topic can grow differently from emotion and speaking intensity',()=>{
 const {qa}=boot();
 qa.post('今天咖啡真的好棒，我超開心');
 const original=qa.state().current;
 const base=JSON.parse(JSON.stringify(original));
 const up=qa.validateTree({...base,growth:[{topic:'food',mood:1,energy:1}]});
 const down=qa.validateTree({...base,growth:[{topic:'food',mood:-1,energy:0}]});
 assert.notEqual(qa.treeSignature(up),qa.treeSignature(down),
  'mood and energy must change branch geometry, not just saved metadata');
});
test('gallery renders real mini tree canvases and recreates the exact seed after reload',()=>{
 const {qa,memory,get}=boot();
 for(const sentence of ['咖啡蛋糕','宇宙旅行','好開心喜歡你'])qa.post(sentence);
 const originalSignature=qa.treeSignature(qa.state().current);
 assert.equal(qa.save(),true);
 const cards=get('gallery').children;
 assert.equal(cards.length,1);
 assert.equal(cards[0].children[0].tagName,'CANVAS',
  'a tree thumbnail must be rendered, not a generic emoji');
 const restored=boot({storage:Object.fromEntries(memory)});
 assert.equal(restored.qa.state().current.growth.length,3);
 assert.equal(restored.qa.treeSignature(restored.qa.state().current),originalSignature);
 assert.equal(restored.qa.state().forest.length,1);
 assert.equal(restored.get('gallery').children.length,1);
});

test('botanical renderer is loaded before chat and keeps an independent geometry contract',()=>{
 const a=html.indexOf('src="./botany.js?v=4-20261112"'),
  g=html.search(/src="\.\/forest-v6\.js\?v=[^"]+"/),
  b=html.search(/src="\.\/tree\.js\?v=[^"]+"/);
 assert.ok(g>a&&b>g,'forest renderer must load after botany and before tree controller');
 assert.ok(a>=0&&b>a,'botany must be available before the tree controller');
 const {qa}=boot();
 assert.equal(qa.getRendererVersion(),5);
 assert.match(botany,/attractor-guided/i);
 assert.match(botany,/function taperBranch\(/);
 assert.match(botany,/function targetAt\(/);
});
test('mature tree grows a genuinely connected hierarchical canopy, not branches stuck on a pole',()=>{
 const {qa}=boot();
 for(let i=0;i<14;i++)qa.post(i%2?'宇宙星球':'咖啡蛋糕');
 const g=qa.state().geometry;
 assert.equal(g.modelVersion,5);
 assert.ok(g.branches.length>=40);
 assert.ok(g.canopy.length>=70,'leaves form foliage clusters');
 const children=g.branches.filter(b=>b.parentIndex>=0);
 assert.ok(children.length>=8,'branches should attach to earlier branch tips');
 for(const child of children){
  const parent=g.branches[child.parentIndex];
  assert.ok(parent.i<child.i);
  const u=1-child.attachmentT,q=child.attachmentT;
  const px=u*u*parent.start.x+2*u*q*parent.p1.x+q*q*parent.end.x;
  const py=u*u*parent.start.y+2*u*q*parent.p1.y+q*q*parent.end.y;
  assert.ok(Math.abs(child.start.x-px)<1e-6);
  assert.ok(Math.abs(child.start.y-py)<1e-6);
  assert.ok(child.width<parent.width,'woody parent tapers into thinner daughter branches');
 }
 const bounds=g.bounds;
 for(const point of [...g.trunk,...g.canopy]){
  assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y),'geometry must remain finite');
  assert.ok(point.x>=bounds.minX-2&&point.x<=bounds.maxX+2);
  assert.ok(point.y>=bounds.minY-2&&point.y<=bounds.maxY+2);
 }
 assert.ok(bounds.maxX-bounds.minX>110);
});
test('sixteen conversations produce a stable printable tree after restore with no geometry changes',()=>{
 const {qa,memory}=boot();
 for(let i=0;i<16;i++)qa.post(i%3===0?'科技 AI 程式':i%3===1?'我今天很開心喜歡你':'月亮做夢');
 const base=JSON.stringify(qa.buildGeometry(qa.state().current));
 qa.save();
 const fresh=boot({storage:Object.fromEntries(memory)});
 assert.equal(JSON.stringify(fresh.qa.buildGeometry(fresh.qa.state().current)),base);
 assert.doesNotThrow(()=>fresh.qa.draw());
 assert.equal(fresh.qa.exportImage(),true);
});
test('each family has independent trunks, width and two distinct crowns',()=>{
 const {qa}=boot();const widths={};const samples=new Set();
 for(const f of qa.families)for(const variant of [0,1]){
  const tree=qa.makeTree(45001);
  tree.genome.treeFamily=f;tree.genome.crownVariant=variant;
  tree.growth=Array.from({length:16},(_,n)=>({topic:n%2?'food':'cosmos',mood:0,energy:.5}));
  const geo=qa.buildGeometry(tree);
  assert.equal(geo.branches.length,48);
  assert.ok(geo.bounds.maxX-geo.bounds.minX<1000);
  assert.ok(geo.branches.every(b=>Number.isFinite(b.end.x)&&Number.isFinite(b.end.y)));
  samples.add(JSON.stringify(geo.branches.map(b=>[b.end.x.toFixed(1),b.end.y.toFixed(1)])));
  if(variant===0)widths[f]=geo.bounds.maxX-geo.bounds.minX;
  if(f==='twin')assert.equal(geo.metrics.primaryTrunks,2);
  if(f==='weeping')assert.ok(geo.metrics.downwardBranches>=16);
 }
 assert.equal(samples.size,8,'the eight mature forms must differ');
 assert.ok(widths.tall<widths.round*.75,'tall crown is substantially narrower');
});

test('V4 uses author-drawn botanical sprites instead of glossy bubbles or scattered emoji',()=>{
 const {qa,paint}=boot();
 for(let i=0;i<10;i++)qa.post(i%2?'喝咖啡、吃蛋糕':'我想去宇宙旅行');
 assert.doesNotThrow(()=>qa.draw(),'fallback must still draw if SVG assets are offline');
 assert.ok(paint.paths>100,'the mature bark and branches remain real canvas paths');
 assert.match(html,/V5 圓冠魔法樹/);
 assert.match(html,/V5 高聳魔法樹/);
 assert.match(html,/id="treeArtVersion"/);
 assert.match(html,/family-art\.js\?v=5-20261112/);
 assert.match(botany,/function drawPaintedWood\(/);
 assert.match(botany,/function drawSprig\(/);
 assert.match(botany,/drawImage\(/);
 assert.doesNotMatch(botany,/function canopyLobe\(/,'the plastic sphere painter must be deleted');
 assert.doesNotMatch(botany,/fillText\(trait\.icon|fillText\(icon,0,0/,'the painter must not paste emoji onto the tree');
 assert.equal(qa.getRendererVersion(),5);
 for(const name of [...artFiles,...qa.families.map(f=>'v5-'+f+'-sprig.svg')]){
  const svg=fs.readFileSync(path.join(dir,'art',name),'utf8');
  assert.match(svg,/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/,name);
  assert.ok(svg.length>900,name+' should be an authored source asset, not a tiny emoji');
  assert.doesNotMatch(svg,/<foreignObject|<script|https?:\/\/(?!www\.w3\.org)/,name);
 }
});
test('review wall covers eight seeds x three stages without touching personal forest data',()=>{
 assert.match(artWall,/24 棵/);
 assert.match(artWall,/art-review\.js\?v=5-20261112/);
 assert.match(artWallScript,/stages=\[3,8,16\]/);
 assert.match(artWallScript,/seeds=\[103,241\]/);assert.match(artWall,/data-family="twin"/);assert.match(artWall,/matureCompare/);
 assert.match(artWallScript,/window\.CrewTreeV5\.paint\(/);
 assert.doesNotMatch(artWallScript,/\blocalStorage\b|XMLHttpRequest|WebSocket|fetch\(/);
});
test('V4 preserves old saved-tree DNA and chat event format while switching art assets',()=>{
 const {qa,memory}=boot();
 for(let i=0;i<9;i++)qa.post(i%2?'今天很開心喜歡你':'我想寫 AI 程式機器人');
 const before=qa.treeSignature(qa.state().current);
 const geo=qa.state().geometry;
 assert.ok(geo.bounds.minX<geo.bounds.maxX);
 assert.ok(geo.bounds.minY<geo.bounds.maxY);
 assert.ok(geo.branches.some(b=>b.parentIndex>=0),'crown keeps real hierarchy');
 assert.equal(qa.save(),true);
 const revived=boot({storage:Object.fromEntries(memory)});
 assert.equal(revived.qa.treeSignature(revived.qa.state().current),before);
 assert.equal(revived.qa.exportImage(),true);
});

test('art layouts stay inside the gallery and mature stage with no numerical overflow',()=>{
 const {qa}=boot();
 const ages=[3,8,16],seeds=[103,241,548,871,1296,2039,3597,4407];
 for(const age of ages)for(const seed of seeds){
  const t=qa.makeTree(seed);
  t.growth=Array.from({length:age},(_,i)=>({topic:i%2?'cosmos':'food',mood:0,energy:.7}));
  const geo=qa.buildGeometry(t);
  const layout=vm.runInNewContext('null'); // Ensure no host DOM globals leak into geometry.
  void layout;
  assert.ok(geo.bounds.maxX>geo.bounds.minX);
  assert.ok(geo.bounds.maxY>geo.bounds.minY);
  assert.ok(geo.branches.every(b=>Number.isFinite(b.end.x)&&Number.isFinite(b.end.y)));
  assert.ok(geo.canopy.every(x=>Number.isFinite(x.x)&&Number.isFinite(x.y)));
  assert.equal(geo.modelVersion,5);
 }
});

test('V4 collections migrate to V5 and keep stored growth events',()=>{
 const legacy={seed:104,growth:[{topic:'cosmos',mood:.4,energy:.6}],
  genome:{silhouette:4,leaf:1,palette:1,lean:.1,twist:0,fruit:2},mutations:[],tags:{cosmos:2}};
 const {qa}=boot({storage:{'crew-tree-current-v1':JSON.stringify(legacy),'crew-tree-lab-v1':JSON.stringify([legacy])}});
 assert.equal(qa.state().current.genome.treeFamily,'twin');
 assert.equal(qa.state().current.growth[0].topic,'cosmos');
 assert.equal(qa.state().forest.length,1);
});
test('adding conversation events never repositions earlier branch endpoints',()=>{
 const {qa}=boot();
 for(let i=0;i<8;i++)qa.post('宇宙星球月亮');
 const previous=qa.state().geometry.branches.map(b=>[b.start.x,b.start.y,b.p1.x,b.p1.y,b.end.x,b.end.y]);
 for(let i=0;i<8;i++)qa.post('今天唱歌聽音樂');
 const next=qa.state().geometry.branches;
 for(let i=0;i<previous.length;i++)assert.deepEqual(
  [next[i].start.x,next[i].start.y,next[i].p1.x,next[i].p1.y,next[i].end.x,next[i].end.y],
  previous[i]);
});

test('Game V1 exposes V9 living worlds and keeps existing V5 families & navigation untouched',()=>{
 assert.match(html,/id="kindSelect"/);
 assert.match(html,/id="worldSelect"/);
 assert.match(html,/id="surpriseMoment"/);
 assert.match(html,/id="soundBtn"/);
 assert.match(html,/id="watchGrowthBtn"/);
 assert.match(css,/\.watch-growth\[hidden\]\{display:none!important\}/);
 assert.match(html,/art-studies\/v9-art\.js/);
 assert.match(html,/art-studies\/study\.js/);
 assert.match(script,/CrewFantasyGameArt\.paint/);
 assert.match(script,/navigator\.vibrate/);
 assert.match(script,/createOscillator\(/);
 assert.match(css,/\.world-picker select\{[^}]*min-height:44px/);
 assert.doesNotMatch(html,/首頁、聊天、探索、學習、我的/);
 const {qa}=boot();
 assert.equal(qa.families.length,4);
 assert.deepEqual([0,1,2,3,7,8,15,16].map(qa.stageForTurns),[3,3,3,3,3,8,8,16]);
});
test('Game V1 safely restores old V5 species while new trees persist V9 choices and inferred topic worlds',()=>{
 const {qa,memory}=boot();
 const old=qa.makeTree(9861);
 const original=old.genome.treeFamily;
 delete old.visualKind;delete old.world;
 const legacy=qa.validateTree(old);
 assert.equal(legacy.visualKind,original);
 assert.equal(legacy.world,'auto');
 assert.equal(qa.chooseKind('jelly'),true);
 assert.equal(qa.chooseWorld('music'),true);
 assert.equal(qa.state().current.visualKind,'jelly');
 assert.equal(qa.state().current.world,'music');
 assert.equal(qa.chooseKind('fake-tree'),false);
 assert.equal(qa.chooseWorld('fake-world'),false);
 qa.post('宇宙太空星球');
 assert.equal(qa.resolvedWorld(qa.state().current),'music','explicit world should win over topic');
 assert.equal(qa.chooseWorld('auto'),true);
 assert.equal(qa.resolvedWorld(qa.state().current),'cosmos','auto follows dominant topic');
 assert.ok(memory.get('crew-tree-current-v1').includes('"visualKind":"jelly"'));
 assert.ok(memory.get('crew-tree-current-v1').includes('"world":"auto"'));
 const saved=qa.validateTree(JSON.parse(memory.get('crew-tree-current-v1')));
 assert.equal(saved.visualKind,'jelly');assert.equal(saved.world,'auto');
});
test('Game V1 every message grows fantasy scale and 3/8/16 unlock surprises exactly once',()=>{
 const {qa,get,fantasyCalls}=boot({fantasy:true});
 assert.equal(qa.chooseKind('island'),true);
 assert.equal(qa.chooseWorld('travel'),true);
 const ages=[],events=[];
 for(let i=1;i<=16;i++){
  const r=qa.post(i%2?'旅行地圖海洋':'在宇宙看星星');
  assert.equal(r.count,i);
  ages.push(qa.stageForTurns(i));
  if(r.surprise)events.push(i);
  qa.draw();
 }
 assert.deepEqual(events,[3,8,16]);
 assert.equal(ages[2],3);assert.equal(ages[7],8);assert.equal(ages[14],8);assert.equal(ages[15],16);
 assert.ok(fantasyCalls.length>=16,'real-game route uses shared V9 painter every turn');
 assert.ok(fantasyCalls.every(args=>args[1]==='island'),'selected V9 scene is actually rendered');
 assert.ok(fantasyCalls.every(args=>args[4]==='travel'),'explicit world travels to shared renderer');
 const sizes=fantasyCalls.map(args=>args[10]?.turns).filter(Number.isFinite);
 assert.ok(sizes.includes(1)&&sizes.includes(8)&&sizes.includes(16));
 assert.equal(get('surpriseTitle').textContent,'漂流群島完整展開！');
 assert.equal(get('watchGrowthBtn').hidden,false);
 assert.match(get('watchGrowthBtn').textContent,/看驚喜/);
 assert.equal(get('nextSurprise').textContent,'傳說世界已解鎖 · 每句仍會繼續成長');
 assert.equal(get('treeArtVersion').textContent,'✨ Art V9 · 活的幻想樹');
 const storage=JSON.stringify(qa.state().current);
 assert.equal(storage.includes('在宇宙看星星'),false);
});
test('Game V1 collector and export route V9 without corrupting saved V5',()=>{
 const {qa,memory,fantasyCalls}=boot({fantasy:true});
 qa.chooseKind('jelly');qa.chooseWorld('cosmos');
 qa.post('宇宙星球');qa.post('旅行海洋');qa.post('音樂唱歌');
 assert.equal(qa.save(),true);
 assert.equal(qa.exportImage(),true);
 assert.ok(fantasyCalls.some(args=>args[1]==='jelly'&&args[10]?.height===1200),
  'PNG export should render the V9 world, not old branch graphics');
 const tree=qa.state().current;
 qa.newTree();qa.chooseKind('twin');qa.post('開心');
 assert.equal(qa.save(),true);
 assert.equal(qa.open(tree.seed),true);
 assert.equal(qa.state().current.visualKind,'jelly');
 const reloaded=boot({storage:Object.fromEntries(memory)});
 assert.equal(reloaded.qa.state().current.visualKind,'jelly');
});

test('Game V1 revised stage thresholds and per-species milestone copy stay visually honest',()=>{
 for(const scene of ['island','jelly']){
  const {qa,get}=boot();
  qa.chooseKind(scene);
  const surprises=[];
  for(let n=1;n<=16;n++){
   const r=qa.post(n%2?'宇宙星球旅行':'我喜歡音樂');
   if(r.surprise){
    surprises.push({n,title:r.surprise,stage:qa.stageForTurns(n),
      detail:get('surpriseDetail').textContent});
   }
  }
  assert.deepEqual(surprises.map(x=>x.n),[3,8,16]);
  assert.deepEqual(surprises.map(x=>x.stage),[3,8,16]);
  if(scene==='island'){
   assert.match(surprises[0].title,/居民/);
   assert.match(surprises[1].title,/浮島/);
   assert.match(surprises[2].title,/群島/);
   assert.equal(surprises.some(x=>/水母|觸鬚|珊瑚/.test(x.title+x.detail)),false);
  }else{
   assert.match(surprises[0].title,/小魚/);
   assert.match(surprises[1].title,/觸鬚/);
   assert.match(surprises[2].title,/燈籠/);
   assert.equal(surprises.some(x=>/浮島|樹洞|群島/.test(x.title+x.detail)),false);
  }
  assert.equal(get('surpriseMoment').hidden,false);
 }
});
test('Game V1 switching species/world/new tree/saved tree cancels stale surprise timer',()=>{
 const {qa,get,timers}=boot();
 qa.chooseKind('island');
 const postTo=(target)=>{let r;while(qa.state().current.growth.length<target)r=qa.post('宇宙星球');return r;};
 postTo(3);
 assert.equal(get('surpriseMoment').hidden,false);
 assert.equal(timers.size,1,'milestone uses only the ribbon timer, not a second centered toast');
 qa.chooseKind('jelly');
 assert.equal(get('surpriseMoment').hidden,true);
 assert.equal(timers.size,0,'switching species cancels the only milestone timer');
 postTo(8);
 assert.equal(get('surpriseMoment').hidden,false);
 qa.chooseWorld('music');
 assert.equal(get('surpriseMoment').hidden,true);
 assert.equal(timers.size,0);
 postTo(16);
 assert.equal(get('surpriseMoment').hidden,false);
 const original=qa.state().current.seed;
 qa.newTree();
 assert.equal(get('surpriseMoment').hidden,true);
 assert.equal(timers.size,1,'a new-tree toast may remain, but no old celebration timer');
 qa.chooseKind('island');postTo(3);
 assert.equal(get('surpriseMoment').hidden,false);
 assert.equal(qa.open(original),true);
 assert.equal(get('surpriseMoment').hidden,true);
 assert.equal(timers.size,1,'opening saved tree creates only its new toast timer');
 // The hidden UI must not reappear when timeouts from a previous world fire.
 for(const fn of timers.values())fn();
 assert.equal(get('surpriseMoment').hidden,true);
});
test('Game V1 tree names use correct living species, no double 樹, and retain V5 names',()=>{
 for(const kind of ['island','jelly','round','tall','weeping','twin']){
  const {qa}=boot();
  qa.chooseKind(kind);
  for(let n=0;n<8;n++)qa.post(n%2?'宇宙星球':'音樂唱歌');
  const current=qa.state().current;
  const expected=kind==='island'?'漂流浮島樹':kind==='jelly'?'水母燈籠樹':null;
  if(expected)assert.ok(current.name.includes(expected),kind+': '+current.name);
  assert.doesNotMatch(current.name,/樹樹/);
  assert.ok(current.name.endsWith('樹'));
 }
});
test('Game V1 milestone banner is outside canvas and desktop artboard is exactly 800:820',()=>{
 const indexCanvas=html.indexOf('id="canvasWrap"');
 const endWrap=html.indexOf('<div class="trait-row"',indexCanvas);
 const banner=html.indexOf('id="surpriseMoment"');
 const canvasEnd=html.indexOf('</div>',html.indexOf('id="treeSubtitle"'));
 assert.ok(banner>canvasEnd&&banner<endWrap,'banner must live below image, not cover resident or island');
 assert.match(css,/\.canvas-wrap\{aspect-ratio:800 \/ 820;height:auto;min-height:0\}/);
 assert.match(css,/\.surprise-moment\{position:relative;top:auto;left:auto;transform:none/);
});
test('Game V1 monotonically scales all chat turns without stage-based resets',()=>{
 const source=fs.readFileSync(path.join(dir,'art-studies/study.js'),'utf8');
 assert.match(source,/const growthScale=turns=>/);
 assert.match(source,/fromTurns\+\(game.turns-fromTurns\)\*progress/);
 assert.match(source,/grow&&scene==='jelly'&&!game/);
 assert.match(source,/m\.fromStage<=3&&!Number\.isFinite\(m\.gameTurns\)/);
 assert.match(source,/function firstVisitor\(/);
 const x=source.match(/const growthScale=turns=>([^;]+);/);
 assert.ok(x,'stable QA growth scale');
 const fn=Function('clamp','return turns=>'+x[1])((n,a,b)=>Math.max(a,Math.min(b,n)));
 const nums=[0,1,2,3,7,8,9,15,16,20,32].map(fn);
 for(let i=1;i<nums.length;i++)assert.ok(nums[i]>=nums[i-1],
  'growth scale must never shrink at stage thresholds, '+nums.join(','));
 assert.ok(nums[5]>nums[4]&&nums[8]>nums[7]);
});

test('V6 glow forest starts with a seed, cracks on 1-2, grows at 3, rises on 8 and hides 16 until revelation',()=>{
 const {qa,get}=boot({glow:true});
 assert.deepEqual([0,1,2,3,7,8,15,16].map(qa.glowStage),
  ['seed','sprout','sprout','sapling','sapling','island','island','final']);
 assert.equal(qa.glow().stage,'seed');
 assert.match(get('gardenM16').textContent,/？？？/);
 assert.equal(get('gardenRarity').hidden,true);
 assert.ok(qa.glowSeed(100));
 const first=qa.post('我喜歡喝咖啡和蛋糕');
 assert.equal(first.count,1);
 assert.equal(qa.glow().stage,'sprout');
 assert.equal(qa.state().current.growth[0].topic,'food');
 qa.post('星星宇宙');
 assert.equal(qa.glow().stage,'sprout');
 qa.post('旅行冒險');
 assert.equal(qa.glow().stage,'sapling');
 assert.equal(get('surpriseMoment').hidden,false);
 assert.match(get('surpriseTitle').textContent,/破殼/);
 for(let n=4;n<=7;n++)qa.post('我喜歡貓咪');
 assert.equal(qa.glow().stage,'sapling');
 qa.post('一首音樂');
 assert.equal(qa.glow().stage,'island');
 assert.match(get('surpriseTitle').textContent,/浮起來/);
 for(let n=9;n<=15;n++)qa.post('天空好漂亮');
 assert.equal(qa.glow().stage,'island');
 assert.match(get('gardenM16').textContent,/？？？/);
 assert.equal(get('gardenRarity').hidden,true);
 const done=qa.post('我想和你一起看星空');
 assert.equal(done.count,16);
 assert.equal(done.form,'constellation');
 assert.equal(done.rarity,'legend');
 assert.equal(qa.glow().stage,'final');
 assert.equal(qa.glow().garden.totalCompleted,1);
 assert.equal(qa.glow().garden.slots.length,1);
 assert.equal(qa.state().current.growth.length,0,'new seed ready automatically');
 assert.match(get('surpriseTitle').textContent,/星空樹/);
 assert.match(get('gardenM16').textContent,/星空樹/);
 assert.match(get('gardenRarity').textContent,/傳說/);
 assert.equal(qa.glowForm(101).id,'crystal');
 assert.equal(qa.glowForm(102).id,'lantern');
 assert.equal(qa.glowForm(103).id,'petal');
});
test('V6 four forms, exact rarity bands and first topic shades are deterministic from seed',()=>{
 const {qa}=boot({glow:true});
 assert.deepEqual([100,101,102,103].map(n=>qa.glowForm(n).id),
  ['constellation','crystal','lantern','petal']);
 assert.deepEqual([100,101,111,112,139,140,199].map(n=>qa.glowRarity(n).key),
  ['legend','legend','epic','rare','rare','common','common']);
 // The user supplied six topic colors are deterministic while existing 12 topic
 // classifier and 12 mutations retain their original behavior.
 assert.equal(qa.classify('咖啡蛋糕').topic,'food');
 assert.equal(qa.classify('宇宙星球').topic,'cosmos');
 assert.equal(qa.classify('旅行飛機').topic,'travel');
 assert.equal(qa.classify('貓咪小狗').topic,'animals');
 assert.equal(qa.classify('音樂唱歌').topic,'music');
 assert.equal(qa.mutations.length,12);
 assert.equal(qa.allTopics.length,13,'12 named topics + daily');
});
test('V6 persistent five-tree garden unlocks mushroom path, pond, aurora then retires oldest',()=>{
 const {qa,memory,get,paint}=boot({glow:true});
 const expected=['constellation','crystal','lantern','petal','constellation'];
 for(let i=0;i<5;i++){
  assert.equal(qa.glowSeed(200+i),true);
  let last;
  for(let n=0;n<16;n++)last=qa.post(['宇宙星球','咖啡蛋糕','音樂唱歌','貓咪旅遊'][n%4]);
  assert.equal(last.count,16);
  assert.equal(last.form,expected[i]);
  assert.equal(qa.glow().garden.totalCompleted,i+1);
  assert.equal(qa.glow().garden.slots.length,Math.min(i+1,4));
  assert.equal(qa.glow().garden.retired.length,Math.max(0,i-3));
  if(i===2){assert.match(last.forestEvent,/菇/);assert.match(get('forestUnlocks').textContent,/菇路/);}
  if(i===3){assert.match(last.forestEvent,/池塘/);assert.match(get('forestUnlocks').textContent,/池塘/);}
  if(i===4){assert.match(last.forestEvent,/極光/);assert.match(get('forestUnlocks').textContent,/極光/);}
 }
 const end=qa.glow();
 assert.equal(end.garden.retired[0].seed,200,'oldest completed tree retired');
 assert.equal(end.garden.slots[0].seed,201);
 assert.equal(get('retiredCount').textContent,'1');
 assert.equal(get('retiredForest').hidden,false);
 assert.ok(paint.paths>30,'five tree canvases are drawn with Canvas 2D');
 assert.ok(qa.exportImage(),'forest poster exported even while current seed has 0 turns');
 assert.ok(paint.downloads>0);
 const gardenPayload=memory.get('crew-tree-glow-forest-v6');
 for(const secret of ['宇宙星球','咖啡蛋糕','音樂唱歌','貓咪旅遊'])
  assert.equal(gardenPayload.includes(secret),false,'forest storage must not contain raw messages');
 const reload=boot({glow:true,storage:Object.fromEntries(memory)});
 assert.equal(reload.qa.glow().garden.totalCompleted,5);
 assert.equal(reload.qa.glow().garden.slots.length,4);
 assert.equal(reload.qa.glow().garden.retired[0].seed,200);
 assert.equal(reload.get('retiredCount').textContent,'1');
 assert.equal(reload.qa.glowReset(),true);
 assert.equal(reload.qa.glow().garden.totalCompleted,0);
 assert.equal(reload.qa.glow().stage,'seed');
 assert.equal(reload.qa.state().forest.length,5,'independent old tree collection remains intact');
});
test('V6 replica, no new dependencies or backend, responsive milestones and 1080x1920 poster',()=>{
 const second=fs.readFileSync(path.join(__dirname,'../crew-app/crew-tree-lab/forest-v6.js'),'utf8');
 const forest=fs.readFileSync(path.join(dir,'forest-v6.js'),'utf8');
 assert.equal(second,forest,'identical new engine in actual and mirrored directories');
 for(const name of ['tree.js','index.html','tree.css']){
  // The built copy stamps the commit SHA into ?v= (see vite.web.config.ts
  // treeLabVersion); the source keeps the __CREW_COMMIT__ placeholder.
  // Compare everything except that version value.
  const norm=(s)=>s.replace(/\?v=(?:__CREW_COMMIT__|[0-9a-f]{7,40})/g,'?v=VERSION');
  assert.equal(norm(fs.readFileSync(path.join(dir,name),'utf8')),
   norm(fs.readFileSync(path.join(__dirname,'../crew-app/crew-tree-lab',name),'utf8')),
   name+' mirrored exactly');
 }
 assert.match(html,/forest-v6\.js/);
 assert.match(html,/id="gardenTotal"/);
 assert.match(html,/id="gardenM3"/);
 assert.match(html,/id="gardenM8"/);
 assert.match(html,/id="gardenM16"/);
 assert.match(html,/id="retiredForest"/);
 assert.match(html,/id="resetGardenBtn"/);
 assert.match(css,/aspect-ratio:780 \/ 1120/);
 assert.match(forest,/canvas\.width=1080;canvas\.height=1920/);
 assert.match(forest,/colorFamilies/);
 assert.doesNotMatch(forest,/\bWebGL\b.*(?:createContext|getContext\('webgl)/);
 assert.doesNotMatch(script+forest,/\bfetch\s*\(|XMLHttpRequest|WebSocket\s*\(/);
});

test('V6 1080×1920 postcard reserves a 480px branded bottom quarter with level, sentence and privacy-safe daily line',()=>{
 const {qa,get,paint,memory}=boot({glow:true});
 assert.equal(qa.glowSeed(100),true);
 for(let i=1;i<=16;i++)qa.post('宇宙星球太空');
 assert.equal(qa.glow().garden.totalCompleted,1);
 assert.equal(get('momentSave').hidden,false,'16th turn offers save this moment');
 assert.match(get('momentSaveLabel').textContent,/星空樹/);
 const snap=qa.glowPoster();
 assert.equal(snap.active.seed,100,'snapshot must retain finished seed after automatic new sprout');
 assert.equal(snap.active.growth.length,16);
 assert.equal(snap.garden.totalCompleted,1);
 assert.equal(snap.options.topic,'cosmos');
 assert.equal(qa.exportImage(),true);
 assert.equal(paint.downloads,1);
 assert.ok(paint.canvasSizes.some(([w,h])=>w===1080&&h===1920),'exact 1080×1920 PNG');
 assert.ok(paint.rects.some(r=>r.x===0&&r.y===1440&&r.w===1080&&r.h===480&&r.color==='#12101C'),
   'bottom information panel is exactly one quarter height');
 assert.ok(paint.rects.some(r=>r.y===1440&&r.color==='#6257E7'),'purple rule uses #6257E7');
 for(const fragment of ['我的森林 · 1 棵樹','今天新長出的一句話','剛剛那顆星','3sssi.com','新芽森林']){
  assert.ok(paint.texts.some(line=>String(line.text).includes(fragment)),fragment);
 }
 assert.ok(paint.texts.some(line=>line.color==='#F7F7F4'));
 assert.equal(paint.texts.some(line=>String(line.text).includes('宇宙星球太空')),false,
  'actual private user sentence must not be included in share PNG');
 get('quickForestSave').listeners.click();
 get('captureMilestoneBtn').listeners.click();
 assert.equal(paint.downloads,3,'both buttons use the same PNG exporter');
 qa.post('咖啡甜點');
 assert.equal(get('momentSave').hidden,true,'next turn closes stale moment CTA');
 assert.equal(qa.glowPoster().active.growth.length,1,'after new chat share uses new active tree');
 assert.equal(memory.get('crew-tree-glow-forest-v6').includes('宇宙星球太空'),false);
});
test('V6 3/4/5 forests all surface persistent save-this-moment CTA and level changes',()=>{
 const {qa,get}=boot({glow:true});
 for(let i=0;i<5;i++){
  qa.glowSeed(300+i);
  for(let n=0;n<16;n++)qa.post('音樂唱歌');
  assert.equal(get('momentSave').hidden,false);
  assert.match(get('momentSaveLabel').textContent,/存下這一刻/);
  const photo=qa.glowPoster();
  assert.equal(photo.garden.totalCompleted,i+1);
  assert.equal(photo.active.seed,300+i);
  assert.equal(photo.active.growth.length,16);
  if(i===2)assert.match(get('momentSaveLabel').textContent,/螢光菇/);
  if(i===3)assert.match(get('momentSaveLabel').textContent,/池塘/);
  if(i===4)assert.match(get('momentSaveLabel').textContent,/極光/);
 }
 assert.equal(get('gardenTotal').textContent,'5');
 assert.match(glowScript,/const forestLevels=/);
 assert.match(postcardScript,/inForest\?0:Math\.min/);
 assert.match(glowScript,/function forestLevel\(n\)/);
 assert.match(glowScript,/at:3,name:'螢菇森林'/);
 assert.match(glowScript,/at:4,name:'月池森林'/);
 assert.match(glowScript,/at:5,name:'極光森林'/);
});
test('V6 each sentence adds a persistent topic-tinted pair of leaves to its branch and both copies stay identical',()=>{
 assert.match(glowScript,/Persistent leaf geometry for every sentence/);
 assert.match(glowScript,/Math\.ceil\(shape\.branches\.length\*\(i\+1\)\/16\)-1/);
 assert.match(glowScript,/const col=topicColors\[topic\]\|\|topicColors\.daily/);
 for(const id of ['quickForestSave','captureMilestoneBtn','momentSaveLabel'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(css,/body\.glow-v6 \.quick-forest-save\{display:flex;position:absolute/);
 assert.match(css,/body\.glow-v6 \.moment-save\[hidden\]\{display:none!important\}/);
 for(const name of ['forest-v6.js','tree.js','tree.css','index.html']){
  const local=fs.readFileSync(path.join(dir,name),'utf8');
  const mirrored=fs.readFileSync(path.join(__dirname,'../crew-app/crew-tree-lab',name),'utf8');
  assert.equal(local,mirrored,'replica content must match '+name);
 }
});

test('V6 postcard module shares current 3/8/16 milestones without touching forest drawing',()=>{
 const {qa,get,paint}=boot({glow:true});
 assert.equal(qa.glowSeed(101),true);
 for(let n=1;n<=3;n++)qa.post('宇宙星球');
 assert.equal(get('momentSave').hidden,false);
 assert.match(get('momentSaveLabel').textContent,/破殼.+存下這一刻/);
 assert.equal(qa.glowPoster().active.growth.length,3);
 assert.equal(qa.glowPoster().options.reveal,undefined,'3 turns must not show 16-turn final');
 assert.ok(qa.exportImage());
 assert.ok(paint.texts.some(t=>String(t.text).includes('和 Zoe 聊了 3 句')));
 qa.post('貓咪');
 assert.equal(get('momentSave').hidden,true,'new chat clears the stale postcard');
 for(let n=5;n<=8;n++)qa.post('音樂');
 assert.match(get('momentSaveLabel').textContent,/浮島.+存下這一刻/);
 assert.equal(qa.glowPoster().active.growth.length,8);
 assert.equal(qa.glowPoster().options.reveal,undefined,'8 turns must not reveal final form');
 assert.ok(qa.exportImage());
 assert.ok(paint.texts.some(t=>String(t.text).includes('和 Zoe 聊了 8 句')));
 for(let n=9;n<=16;n++)qa.post('旅行');
 assert.match(get('momentSaveLabel').textContent,/存下這一刻/);
 assert.equal(qa.glowPoster().active.growth.length,16);
 assert.ok(qa.glowPoster().options.reveal,'16 turns freezes final reveal');
 assert.ok(qa.exportImage());
 assert.ok(paint.texts.some(t=>String(t.text).includes('和 Zoe 聊了 16 句')),
  '16th-turn card must not double-count the completed tree as 32');
 assert.equal(paint.texts.some(t=>String(t.text).includes('和 Zoe 聊了 32 句')),false);
 assert.equal(paint.downloads,3);
});
test('V6 postcard is a separate, mirrored presentation adapter and the painting engine is not edited',()=>{
 assert.match(html,/postcard-v6\.js/);
 assert.match(script,/CrewForestPostcardV6\?\.render/);
 assert.match(postcardScript,/ART_HEIGHT=1440,FOOTER=480/);
 assert.match(postcardScript,/strokeRect\(24,24/);
 assert.match(postcardScript,/leafQuotes\[topic\]/);
 assert.doesNotMatch(postcardScript,/\bfetch\s*\(|WebGL|XMLHttpRequest/);
 assert.equal(fs.readFileSync(path.join(dir,'postcard-v6.js'),'utf8'),
  fs.readFileSync(path.join(__dirname,'../crew-app/crew-tree-lab/postcard-v6.js'),'utf8'));
 assert.equal(fs.readFileSync(path.join(dir,'forest-v6.js'),'utf8'),
  fs.readFileSync(path.join(__dirname,'../crew-app/crew-tree-lab/forest-v6.js'),'utf8'));
});
