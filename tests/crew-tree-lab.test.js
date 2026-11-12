const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.join(__dirname,'../web-spa/public/crew-tree-lab');
const script=fs.readFileSync(path.join(dir,'tree.js'),'utf8');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'tree.css'),'utf8');
function boot(options={}){
 const nodes=new Map(),memory=new Map(),paint={paths:0,ellipses:0,lines:0,frames:0,downloads:0};
 if(options.storage)for(const [k,v] of Object.entries(options.storage))memory.set(k,v);
 const gradient=()=>({addColorStop(){}});
 const context2D=new Proxy({
  beginPath(){paint.paths++},ellipse(){paint.ellipses++},lineTo(){paint.lines++},
  createLinearGradient:gradient,
  fillText(){paint.frames++},
  setTransform(){},clearRect(){}
 },{
  get:(o,k)=>o[k]||(['createRadialGradient','createLinearGradient'].includes(String(k))?gradient:()=>{}),
  set:(o,k,v)=>{o[k]=v;return true}
 });
 function element(tag='div'){
  const value={tagName:tag.toUpperCase(),dataset:{},style:{},hidden:false,
   className:'',textContent:'',value:'',scrollTop:0,scrollHeight:240,
   childNodes:[],classList:{add(){},remove(){},toggle(){}},
   addEventListener(){},setAttribute(){},getBoundingClientRect(){return {width:390,height:386}},
   getContext(){return context2D},toDataURL(){return 'data:image/png;base64,ZmFrZQ=='},
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
 const c={document,window,location:{search:'?qa=1'},URLSearchParams,localStorage:{
  getItem:key=>memory.get(key)||null,setItem:(key,v)=>memory.set(key,v)
 },setTimeout(){return 1},clearTimeout(){},Date,Math,console,Number,String,Array,Set,Map};
 vm.createContext(c);vm.runInContext(script,c,{timeout:10000});
 const qa=window.__TREE_QA__;
 assert.ok(qa,'QA interface is exposed only behind ?qa=1');
 return {qa,memory,get,paint,document};
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
test('twelve organic silhouettes, eight leaf geometries, twelve palettes, twelve mutations',()=>{
 const {qa}=boot();
 assert.equal(qa.shapes.length,12);
 assert.equal(qa.leaves.length,8);
 assert.equal(qa.mutations.length,12);
 const shapes=new Set(),leaves=new Set(),palette=new Set();
 for(let seed=1;seed<=200;seed++){
  const g=qa.makeTree(seed).genome;
  shapes.add(g.silhouette);leaves.add(g.leaf);palette.add(g.palette);
 }
 assert.equal(shapes.size,12);
 assert.equal(leaves.size,8);
 assert.equal(palette.size,12);
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
 assert.ok(qa.state().geometry.branches.length<=73);
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
