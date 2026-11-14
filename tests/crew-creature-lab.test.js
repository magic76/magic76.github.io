const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.join(__dirname,'../web-spa/public/crew-creature-lab');
const script=fs.readFileSync(path.join(dir,'creature.js'),'utf8');
const modelScript=fs.readFileSync(path.join(dir,'creature-v6.js'),'utf8');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'creature.css'),'utf8');
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
 const c={document,window,location:{search:'?qa=1'},URLSearchParams,localStorage:{
  getItem:key=>memory.get(key)||null,setItem:(key,v)=>memory.set(key,v)
 },setTimeout(fn){const id=++timerId;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)},Date,Math,console,Number,String,Array,Set,Map};
 vm.createContext(c);vm.runInContext(modelScript,c,{timeout:10000});vm.runInContext(script,c,{timeout:10000});
 const qa=window.__CREATURE_QA__;
 assert.ok(qa,'QA interface is exposed only behind ?qa=1');
 return {qa,memory,get,paint,document,timers};
}
test('creature lab boots and paints the egg fallback without images',()=>{
 const {qa,paint}=boot();
 assert.ok(qa);
 assert.equal(qa.draw(),true);
 assert.ok(paint.texts.some(t=>String(t.text).includes('生物正在孵化')));
 assert.deepEqual([...qa.lines()],['moonfox','stardragon','flowerfairy','cat','snowbunny','redpanda','dolphin','phoenix']);
 assert.deepEqual([...qa.stages()],['egg','baby','growing','mature','final']);
 assert.equal(qa.energy(),0);
 assert.equal(qa.state().creature.stage,0);
 assert.equal(qa.state().creature.line,null);
});
test('gainEnergy adds exactly 1 per sentence',()=>{
 const {qa}=boot();
 assert.equal(qa.post('我今天喝了超多咖啡').energy,1);
 assert.equal(qa.post('星星宇宙').energy,2);
 assert.equal(qa.post('天空好漂亮').energy,3);
 assert.equal(qa.energy(),3);
 assert.equal(qa.state().creature.sentences,3);
});
test('EVOLVE_COSTS is [2,4,5,5] and stage 4 has no further cost',()=>{
 const {qa}=boot();
 assert.deepEqual([0,1,2,3].map(n=>qa.evolveCost(n)),[2,4,5,5]);
 assert.equal(qa.evolveCost(4),null);
 assert.equal(qa.evolveCost(-1),null);
});
test('cannot evolve without enough energy, can with enough and energy is deducted',()=>{
 const {qa}=boot();
 assert.equal(qa.canEvolve(),false);
 assert.equal(qa.evolve(),null);
 qa.post('我今天喝了超多咖啡');
 assert.equal(qa.energy(),1);
 assert.equal(qa.canEvolve(),false);
 assert.equal(qa.evolve(),null);
 qa.post('星星宇宙');
 assert.equal(qa.energy(),2);
 assert.equal(qa.canEvolve(),true);
 const res=qa.evolve();
 assert.equal(res.stage,1);
 assert.equal(res.cost,2);
 assert.equal(qa.energy(),0);
 assert.equal(qa.canEvolve(),false);
 assert.equal(qa.state().creature.stage,1);
});
test('first evolution uses weighted random odds, not the chat topic',()=>{
 const {qa}=boot();
 qa.post('我昨天夢到在月亮上散步');
 qa.post('晚上睡覺一直做夢');
 assert.equal(qa.evolve(()=>0).line,'cat');
 assert.equal(qa.state().creature.line,'cat');
 const {qa:qa2}=boot();
 qa2.post('我家貓咪今天又偷吃我的魚');
 qa2.post('貓咪真的超可愛');
 assert.equal(qa2.evolve(()=>0.99).line,'phoenix');
});

test('weighted random odds cover all eight species and total 100%',()=>{
 const {qa}=boot();
 assert.deepEqual(Object.entries(qa.weights()),[
  ['cat',18],['flowerfairy',17],['snowbunny',16],['redpanda',14],
  ['dolphin',13],['moonfox',10],['stardragon',8],['phoenix',4]
 ]);
 assert.equal(Object.values(qa.weights()).reduce((sum,n)=>sum+n,0),100);
 for(const [r,id] of [[0,'cat'],[0.18,'flowerfairy'],[0.35,'snowbunny'],
  [0.51,'redpanda'],[0.65,'dolphin'],[0.78,'moonfox'],
  [0.88,'stardragon'],[0.96,'phoenix'],[0.999,'phoenix']
 ])assert.equal(qa.rollLine(()=>r),id,'weighted ticket '+r);
});
test('every evolution grants a gift: a finished creature is 5 gifts + 1 daily',()=>{
 const {qa}=boot();
 for(let i=0;i<16;i++)qa.post('天空好漂亮');
 assert.equal(qa.energy(),16);
 assert.equal(qa.gifts(),1,'only the daily gift so far');
 let res;
 res=qa.evolve();assert.equal(res.stage,1);assert.equal(qa.energy(),14);assert.equal(qa.gifts(),2,'evolve 1 grants a gift');
 res=qa.evolve();assert.equal(res.stage,2);assert.equal(qa.energy(),10);assert.equal(qa.gifts(),3,'evolve 2 grants a gift');
 res=qa.evolve();assert.equal(res.stage,3);assert.equal(qa.energy(),5);assert.equal(qa.gifts(),4,'evolve 3 grants a gift');
 res=qa.evolve();assert.equal(res.stage,4);assert.equal(res.completed,true);assert.equal(qa.energy(),0);
 assert.equal(qa.gifts(),6,'evolve 4 grants a gift and completion grants one more (4+1), plus daily 1');
 const st=qa.state();
 assert.equal(st.collection.length,1);
 assert.equal(st.collection[0].stage,4);
 assert.ok(st.collection[0].line);
});
test('the final form stays on screen until startNext, and chatting is blocked meanwhile',()=>{
 const {qa,get}=boot();
 for(let i=0;i<16;i++)qa.post('天空好漂亮');
 qa.evolve();qa.evolve();qa.evolve();qa.evolve();
 const st=qa.state();
 assert.equal(st.creature.stage,4,'final form stays as the current creature');
 assert.ok(st.creature.line);
 assert.equal(st.collection.length,1);
 assert.equal(get('nextBtn').hidden,false,'the start-next button is shown');
 assert.equal(qa.post('再聊一句'),false,'chatting is blocked while celebrating');
 assert.equal(qa.state().creature.sentences,16,'no sentence lands on the finished creature');
 assert.equal(qa.startNext(),true);
 const st2=qa.state();
 assert.equal(st2.creature.stage,0,'a fresh egg follows');
 assert.equal(st2.creature.line,null);
 assert.equal(st2.creature.sentences,0);
 assert.equal(get('nextBtn').hidden,true,'the button hides again');
 assert.notEqual(qa.post('新的開始'),false,'chatting works again');
 assert.equal(qa.state().creature.sentences,1);
});
test('gift pool has 16 items (weights sum 173) including 5 permanent companions',()=>{
 const {qa}=boot();
 const items=qa.giftItems();
 assert.equal(items.length,16);
 assert.equal(items.reduce((s,x)=>s+x.weight,0),173);
 const companions=items.filter(x=>x.kind==='companion');
 assert.deepEqual([...companions.map(x=>x.id)].sort(),
  ['companion-butterfly','companion-firefly','companion-lantern','companion-mushroom','companion-star']);
 assert.equal(items.filter(x=>x.kind==='egg').length,9,'8 line eggs + golden egg');
 assert.equal(items.filter(x=>x.kind==='energy').length,2);
 // The 4 new line eggs are in the pool with the specified weights.
 assert.deepEqual([...items.filter(x=>x.kind==='egg'&&x.line).map(x=>[x.id,x.weight])],
  [['egg-cat',25],['egg-flowerfairy',22],['egg-moonfox',12],['egg-stardragon',10],
   ['egg-snowbunny',18],['egg-redpanda',16],['egg-dolphin',14],['egg-phoenix',8]]);
});
test('gift daily grant is deduped and opening yields eggs, energy, companions, golden egg',()=>{
 const {qa:qa0}=boot();
 assert.equal(qa0.openGift(()=>0),null,'no gifts, nothing to open');
 const {qa}=boot();
 assert.equal(qa.grantGift('daily','2026-11-14'),true);
 assert.equal(qa.gifts(),1);
 assert.equal(qa.grantGift('daily','2026-11-14'),false);
 assert.equal(qa.gifts(),1);
 assert.equal(qa.grantGift('daily','2026-11-15'),true);
 assert.equal(qa.grantGift('evolve'),true);
 assert.equal(qa.grantGift('complete'),true);
 assert.equal(qa.grantGift('bogus'),false);
 assert.equal(qa.gifts(),4);
 const egg=qa.openGift(()=>0);
 assert.equal(egg.id,'egg-cat');
 assert.equal(qa.giftCollection()['egg-cat'],1);
 assert.equal(qa.gifts(),3);
 // Weight bands of 173: energy-small is 125-140, so rand 0.75 lands there.
 const pack=qa.openGift(()=>0.75);
 assert.equal(pack.kind,'energy');
 assert.equal(pack.id,'energy-small');
 assert.equal(qa.energy(),3);
 assert.equal(qa.gifts(),2);
 // companion-butterfly is 159-163 of 173, so rand 0.93 lands there.
 const buddy=qa.openGift(()=>0.93);
 assert.equal(buddy.kind,'companion');
 assert.equal(buddy.id,'companion-butterfly');
 assert.equal(qa.giftCollection()['companion-butterfly'],1);
 assert.equal(qa.gifts(),1);
 const golden=qa.openGift(()=>0.999);
 assert.equal(golden.id,'egg-stardragon');
 assert.equal(qa.giftCollection()['egg-stardragon'],1);
 assert.equal(qa.gifts(),0);
});
test('a duplicate companion re-rolls into a random egg instead of being wasted',()=>{
 const saved=JSON.stringify({version:1,energy:0,creature:{line:null,stage:0,topics:[],sentences:0},collection:[],gifts:1,giftCollection:{'companion-firefly':1},lastDailyGift:null});
 const {qa}=boot({storage:{'crew-creature-lab-v1':saved}});
 assert.equal(qa.giftCollection()['companion-firefly'],1);
 // rand 0.87 rolls companion-firefly again (weight band 146-154 of 173).
 const item=qa.openGift(()=>0.87);
 assert.equal(item.rerolled,true);
 assert.equal(item.kind,'egg');
 // The re-roll draws from the 8 line eggs (total weight 125); 0.87 lands
 // on the dolphin band (103-117), so the egg is a dolphin egg.
 assert.equal(item.id,'egg-dolphin');
 assert.equal(qa.giftCollection()['companion-firefly'],1,'companion count unchanged');
 assert.equal(qa.giftCollection()['egg-dolphin'],1,'an egg lands instead');
 assert.equal(qa.gifts(),0);
});
test('hatching an owned egg sets the creature line and spends the egg',()=>{
 const {qa}=boot();
 assert.equal(qa.hatch('cat'),false);
 qa.grantGift('evolve');
 qa.openGift(()=>0);
 assert.equal(qa.giftCollection()['egg-cat'],1);
 assert.equal(qa.hatch('cat'),true);
 assert.equal(qa.state().creature.line,'cat');
 qa.post('鳳凰浴火重生');qa.post('鳳凰浴火重生');
 assert.equal(qa.evolve(()=>0.999).line,'cat','gift egg is always fixed');
 assert.equal(qa.giftCollection()['egg-cat'],undefined);
 assert.equal(qa.hatch('bogus'),false);
});
test('restore keeps valid saves, migrates old v1 box fields, and gives safe defaults',()=>{
 const saved=JSON.stringify({version:1,energy:5,creature:{line:'cat',stage:2,topics:['animals','daily'],sentences:6},collection:[{line:'moonfox',topics:['dream'],stage:4}],gifts:2,giftCollection:{'egg-cat':1},lastDailyGift:'2026-11-14'});
 const {qa}=boot({storage:{'crew-creature-lab-v1':saved}});
 assert.equal(qa.energy(),5);
 assert.equal(qa.state().creature.line,'cat');
 assert.equal(qa.state().creature.stage,2);
 assert.equal(qa.state().collection.length,1);
 assert.equal(qa.gifts(),2);
 assert.equal(qa.giftCollection()['egg-cat'],1);
 assert.equal(qa.state().lastDailyGift,'2026-11-14');
 // Old v1 save (boxes / boxCollection / lastDailyBox) migrates, nothing is lost.
 const old=JSON.stringify({version:1,energy:3,creature:{line:null,stage:0,topics:[],sentences:0},collection:[],boxes:2,boxCollection:{'egg-cat':1,'energy-small':2},lastDailyBox:'2026-11-13'});
 const {qa:qaOld}=boot({storage:{'crew-creature-lab-v1':old}});
 assert.equal(qaOld.gifts(),2,'old boxes count carries over');
 assert.equal(qaOld.giftCollection()['egg-cat'],1);
 assert.equal(qaOld.giftCollection()['energy-small'],2);
 assert.equal(qaOld.state().lastDailyGift,'2026-11-13');
 const {qa:qa2}=boot({storage:{'crew-creature-lab-v1':JSON.stringify({version:0})}});
 assert.equal(qa2.energy(),0);
 assert.equal(qa2.state().creature.stage,0);
 assert.equal(qa2.state().creature.line,null);
 assert.equal(qa2.gifts(),0);
 const bad=JSON.stringify({version:1,energy:-5,creature:{line:'bogus',stage:9,topics:'nope',sentences:-1},collection:[{line:'cat',topics:[],stage:2}],gifts:-1,giftCollection:{'bogus':3},lastDailyGift:'yesterday'});
 const {qa:qa3}=boot({storage:{'crew-creature-lab-v1':bad}});
 assert.equal(qa3.energy(),0);
 assert.equal(qa3.state().creature.stage,0);
 assert.equal(qa3.state().collection.length,0);
 assert.equal(qa3.gifts(),0);
 assert.equal(Object.keys(qa3.giftCollection()).length,0);
 assert.equal(qa3.state().lastDailyGift,null);
});
test('chatting the first sentence of the day grants a daily gift',()=>{
 const {qa,get}=boot();
 assert.equal(qa.gifts(),0);
 qa.post('我喜歡喝咖啡');
 assert.equal(qa.gifts(),1);
 qa.post('星星宇宙');
 assert.equal(qa.gifts(),1,'second chat the same day grants nothing more');
 assert.equal(get('giftBtn').textContent,'🎁 禮物 ×1');
});
test('creature UI is wired: energy orbs, evolve button, next button, modals, codex, QA hook',()=>{
 assert.match(html,/id="evolveBtn"/);
 assert.match(html,/id="nextBtn"/);
 assert.match(html,/id="energyOrbs"/);
 assert.match(html,/id="energyText"/);
 assert.match(html,/id="reactBubble"/);
 assert.match(html,/id="canvasBreathe"/);
 assert.match(html,/id="canvasGlow"/);
 assert.match(html,/class="twinkle"/);
 assert.match(html,/id="giftModal"/);
 assert.match(html,/id="giftFlash"/);
 assert.match(html,/id="eggModal"/);
 assert.match(html,/id="gallery"/);
 assert.match(html,/id="giftGrid"/);
 assert.match(html,/id="creatureCanvas"/);
 assert.match(html,/creature-v6\.js\?v=__CREW_COMMIT__/);
 assert.match(html,/creature\.js\?v=__CREW_COMMIT__/);
 assert.doesNotMatch(html,/botany\.js|family-art\.js|art-studies/);
 assert.doesNotMatch(html,/id="energyFill"/);
 assert.doesNotMatch(html,/class="energy-track"/);
 assert.doesNotMatch(html,/盲盒|boxBtn|boxModal|boxGrid/);
 assert.match(html,/禮物收藏/);
 assert.match(html,/0\/16/);
 assert.match(html,/開始養下一隻/);
 assert.match(script,/CRE\.gainEnergy\(state\)/);
 assert.match(script,/CRE\.canEvolve\(state\)/);
 assert.match(script,/CRE\.hatchEgg\(state,lineId\)/);
 assert.match(script,/CRE\.startNewCreature\(state\)/);
 assert.match(script,/CRE\.grantGift\(state,'evolve'\)/);
 assert.match(script,/CRE\.grantGift\(state,'complete'\)/);
 assert.match(script,/CRE\.grantGift\(state,'daily'/);
 assert.match(script,/CRE\.openGift\(state\)/);
 assert.match(script,/stage===4/);
 assert.match(script,/reactToChat\(\)/);
 assert.match(script,/petCreature/);
 assert.match(script,/giftOpening/);
 assert.match(script,/evolvePending/);
 assert.match(script,/REACT_LINES/);
 assert.match(script,/__CREATURE_QA__/);
 assert.match(script,/crew-creature-lab-v1/);
 assert.match(script,/toDataURL\('image\/png'\)/);
 assert.match(css,/\.evolve-btn/);
 assert.match(css,/\.evolve-btn\.ready/);
 assert.match(css,/\.next-btn/);
 assert.match(css,/\.energy-orbs/);
 assert.match(css,/\.orb\.filled/);
 assert.match(css,/\.canvas-breathe/);
 assert.match(css,/@keyframes breathe/);
 assert.match(css,/@keyframes canvasBounce/);
 assert.match(css,/@keyframes revealIn/);
 assert.match(css,/@keyframes twinkle/);
 assert.match(css,/@keyframes sparklePop/);
 assert.match(css,/@keyframes heartFloat/);
 assert.match(css,/@keyframes giftShake/);
 assert.match(css,/@keyframes giftFlash/);
 assert.match(css,/100dvh/);
 assert.match(css,/\.creature-thumb/);
 assert.match(css,/\.seed-pick-egg/);
 assert.match(css,/#12101C/);
 assert.match(css,/#6257E7/);
});
test('v1.2: every chat sentence makes the creature react (bubble, not chat log)',()=>{
 const {qa,get}=boot();
 qa.post('我昨天夢到在月亮上散步');
 const r=qa.reactBubble();
 assert.equal(r.hidden,false);
 assert.equal(r.text,'蛋輕輕晃了一下。');
 // The reaction is not written to the chat log (only the 2 messages:
 // my sentence + Zoe's reply; the greeting lives in the real HTML).
 assert.equal(get('messages').children.length,2,'my sentence + Zoe reply only');
 const {qa:qa2}=boot();
 qa2.post('我昨天夢到在月亮上散步');
 qa2.post('晚上睡覺一直做夢');
 qa2.evolve(()=>0.83);
 qa2.post('月亮好美');
 assert.equal(qa2.reactBubble().text,'月狐開心地搖了搖尾巴。');
});
test('v1.2: energy orbs match the evolve cost and fill as energy arrives',()=>{
 const {qa,get}=boot();
 const orbs=()=>get('energyOrbs').innerHTML;
 assert.equal((orbs().match(/class="orb/g)||[]).length,2,'cost 2 -> 2 orbs');
 assert.equal((orbs().match(/class="orb filled"/g)||[]).length,0);
 qa.post('天空好漂亮');
 assert.equal((orbs().match(/class="orb filled"/g)||[]).length,1);
 qa.post('星星宇宙');
 assert.equal((orbs().match(/class="orb filled"/g)||[]).length,2,'both filled');
 assert.equal(get('energyText').textContent,'⚡ 能量 2 / 2');
});
test('v1.2: the creature codex shows the real final-form art with an emoji fallback',()=>{
 const saved=JSON.stringify({version:1,energy:0,creature:{line:null,stage:0,topics:[],sentences:0},collection:[{line:'moonfox',topics:['dream','love'],stage:4}],gifts:0,giftCollection:{},lastDailyGift:null});
 const {get}=boot({storage:{'crew-creature-lab-v1':saved}});
 const html=get('gallery').innerHTML;
 assert.match(html,/moonfox-final\.webp/);
 assert.match(html,/onerror/);
 assert.match(html,/月狐/);
 assert.match(html,/夢境/);
});
test('v1.2: egg choices show the egg art',()=>{
 const saved=JSON.stringify({version:1,energy:0,creature:{line:null,stage:0,topics:[],sentences:0},collection:[],gifts:0,giftCollection:{'egg-cat':2,'egg-moonfox':1},lastDailyGift:null});
 const {qa}=boot({storage:{'crew-creature-lab-v1':saved}});
 const list=qa.eggList();
 assert.match(list,/cat-egg\.webp/);
 assert.match(list,/moonfox-egg\.webp/);
 assert.match(list,/小貓咪的蛋/);
 assert.match(list,/×2/);
});
test('v1.2: petting the creature floats a heart and gives no energy',()=>{
 const {qa,get}=boot();
 assert.equal(get('canvasWrap').children.length,0);
 qa.pet(195,200);
 assert.equal(get('canvasWrap').children.length,1);
 const heart=get('canvasWrap').children[0];
 assert.equal(heart.className,'pet-heart');
 assert.equal(heart.textContent,'💗');
 assert.equal(qa.energy(),0,'petting is just for fun');
 qa.pet(100,300);
 assert.equal(get('canvasWrap').children.length,2,'tapping again floats another heart');
 assert.equal(qa.energy(),0);
});
test('v1.2: evolution changes state synchronously while the ceremony runs',()=>{
 const {qa}=boot();
 qa.post('我昨天夢到在月亮上散步');
 qa.post('晚上睡覺一直做夢');
 const res=qa.evolve();
 assert.equal(res.stage,1,'QA evolve still returns the result synchronously');
 assert.equal(qa.state().creature.stage,1,'state advanced immediately');
 assert.equal(qa.evolving(),true,'the visual ceremony is in progress');
 assert.equal(qa.gifts(),2,'daily 1 + evolve 1, unchanged by the ceremony');
});
test('v1.3: newer topics classify but do not control species',()=>{
 for(const [msg,topic] of [
  ['我喜歡下雪天去滑雪','snow'],['竹林裡的熊貓好可愛','bamboo'],
  ['夏天去海邊游泳衝浪','ocean'],['鳳凰浴火重生','fire']
 ]){
  const {qa}=boot();
  assert.equal(qa.classify(msg).topic,topic,msg);
  qa.post(msg);qa.post(msg);
  assert.equal(qa.evolve(()=>0.715).line,'dolphin');
 }
});
test('v1.3: older topics still classify but do not control species',()=>{
 for(const msg of [
  '我昨天夢到在月亮上散步','我們去日本旅行',
  '我想吃蛋糕','我家貓咪今天又偷吃我的魚'
 ]){
  const {qa}=boot();
  assert.notEqual(qa.classify(msg).topic,'daily');
  qa.post(msg);qa.post(msg);
  assert.equal(qa.evolve(()=>0.715).line,'dolphin');
 }
});
test('v1.3: the four new lines have their own reaction lines',()=>{
 const cases=[
  ['我喜歡下雪天去滑雪','雪兔抖了抖長耳朵，雪花都亮了。',0.43],
  ['竹林裡的熊貓好可愛','小熊貓抱著尾巴，開心地晃了晃。',0.58],
  ['夏天去海邊游泳衝浪','海豚躍出水面，濺起發光的水花。',0.715],
  ['鳳凰浴火重生','鳳凰抖了抖羽毛，火光都亮了。',0.98]];
 for(const [msg,react,ticket] of cases){
  const {qa}=boot();
  qa.post(msg);qa.post(msg);
  qa.evolve(()=>ticket);
  qa.post('再說一句');
  assert.equal(qa.reactBubble().text,react,msg);
 }
});
test('v1.3: the egg picker lists all 8 line eggs with their art',()=>{
 const saved=JSON.stringify({version:1,energy:0,creature:{line:null,stage:0,topics:[],sentences:0},collection:[],gifts:0,giftCollection:{'egg-snowbunny':1,'egg-redpanda':1,'egg-dolphin':1,'egg-phoenix':1},lastDailyGift:null});
 const {qa}=boot({storage:{'crew-creature-lab-v1':saved}});
 const list=qa.eggList();
 assert.match(list,/snowbunny-egg\.webp/);
 assert.match(list,/redpanda-egg\.webp/);
 assert.match(list,/dolphin-egg\.webp/);
 assert.match(list,/phoenix-egg\.webp/);
 assert.match(list,/雪兔的蛋/);
 assert.match(list,/小熊貓的蛋/);
 assert.match(list,/海豚的蛋/);
 assert.match(list,/鳳凰的蛋/);
});
test('v1.4: eight opening chips cover all eight lines',()=>{
 assert.equal((html.match(/data-say="/g)||[]).length,8,'eight chips');
 assert.match(html,/id="linePreview"/);
 assert.match(html,/8 種生物/);
 const {qa}=boot();
 const cases=[
  ['今天下雪了，好想堆一個雪人！','snow'],
  ['我在竹林裡散步，聽到竹葉沙沙響。','bamboo'],
  ['夏天就想去海邊游泳、看海豚！','ocean'],
  ['聽說鳳凰會在火焰裡重生，好神奇！','fire']];
 for(const [msg,topic] of cases){
  assert.ok(html.includes(msg),msg);
  assert.equal(qa.classify(msg).topic,topic,msg);
 }
});
test('v1.4: the 8-line preview shows every line, owned ones as final art',()=>{
 const {get}=boot();
 const preview=get('linePreview').innerHTML;
 for(const name of ['月狐','星龍','花妖精','小貓咪','雪兔','小熊貓','海豚','鳳凰'])assert.match(preview,new RegExp(name));
 for(const id of ['moonfox','stardragon','flowerfairy','cat','snowbunny','redpanda','dolphin','phoenix'])assert.match(preview,new RegExp(id+'-egg\\.webp'));
 assert.match(preview,/還沒遇過/);
 const saved=JSON.stringify({version:1,energy:0,creature:{line:null,stage:0,topics:[],sentences:0},collection:[{line:'moonfox',topics:['dream'],stage:4}],gifts:0,giftCollection:{},lastDailyGift:null});
 const {get:get2}=boot({storage:{'crew-creature-lab-v1':saved}});
 const preview2=get2('linePreview').innerHTML;
 assert.match(preview2,/moonfox-final\.webp/);
 assert.match(preview2,/已養成/);
 assert.match(preview2,/snowbunny-egg\.webp/,'other lines still show eggs');
});
test('v1.4: exportImage downloads a 780x1730 postcard with a text band',()=>{
 const {qa,paint}=boot();
 assert.equal(qa.exportImage(),true);
 assert.ok(paint.canvasSizes.some(s=>s[0]===780&&s[1]===1730),'postcard canvas is 780x1730');
 assert.equal(paint.downloads,1);
 const texts=paint.texts.map(t=>String(t.text));
 assert.ok(texts.some(t=>t.includes('神秘的蛋')),'creature name + stage');
 assert.ok(texts.some(t=>t.includes('聊了 0 句')&&t.includes('能量 0')),'sentence + energy count');
 assert.ok(texts.some(t=>t.includes('Crew · 3sssi.com')),'date + Crew');
 assert.match(script,/a\.download='crew-creature-'/);
 // A final-form postcard names the creature and stage.
 const {qa:qa2,paint:paint2}=boot();
 for(let i=0;i<16;i++)qa2.post('天空好漂亮');
 qa2.evolve();qa2.evolve();qa2.evolve();qa2.evolve();
 assert.equal(qa2.exportImage(),true);
 const texts2=paint2.texts.map(t=>String(t.text));
 assert.ok(texts2.some(t=>t.includes('完全體')),'final-form postcard names the stage');
 assert.ok(texts2.some(t=>t.includes('聊了 16 句')),'final-form postcard counts sentences');
});
test('v1.4: the loading fallback is a gradient + egg, never a flat black board',()=>{
 const {qa,paint}=boot();
 assert.equal(qa.draw(),true);
 assert.ok(!paint.rects.some(r=>r.color==='#12101C'&&r.w===780&&r.h===1560),'no flat #12101C full-canvas fill');
 assert.ok(paint.texts.some(t=>String(t.text).includes('圖片載入中')));
 assert.ok(paint.texts.some(t=>String(t.text).includes('生物正在孵化')));
});
test('v1.4: chat history is saved and restored across reloads',()=>{
 const {qa,memory}=boot();
 qa.post('我昨天夢到在月亮上散步');
 qa.post('星星宇宙');
 const saved=memory.get('crew-creature-lab-v1-chat');
 assert.ok(saved,'chat is saved to localStorage');
 const log=JSON.parse(saved);
 assert.equal(log.length,4,'two posts = 4 messages');
 assert.equal(log[0].who,'you');
 assert.equal(log[0].text,'我昨天夢到在月亮上散步');
 assert.equal(log[1].who,'zoe');
 assert.equal(qa.messages().length,4);
 // Reload with the saved chat: messages come back, and the stored value is not rewritten.
 const {qa:qa2,get,memory:mem2}=boot({storage:{'crew-creature-lab-v1-chat':saved}});
 assert.equal(qa2.messages().length,4);
 assert.equal(qa2.messages()[0].text,'我昨天夢到在月亮上散步');
 assert.equal(get('messages').children.length,4,'restored messages show in the DOM');
 assert.equal(mem2.get('crew-creature-lab-v1-chat'),saved,'restore does not rewrite the log');
 // The log caps at the most recent 30 messages.
 const {qa:qa3,memory:mem3}=boot();
 for(let i=0;i<16;i++)qa3.post('天空好漂亮');
 assert.equal(qa3.messages().length,30,'32 messages capped to 30');
 assert.equal(JSON.parse(mem3.get('crew-creature-lab-v1-chat')).length,30,'stored log capped to 30');
});
test('v1.4: first screen shows the whole animal (taller canvas, capped desktop)',()=>{
 assert.match(css,/54dvh/,'mobile canvas raised to 54dvh');
 assert.match(css,/78vh/,'desktop canvas capped at 78vh');
 assert.match(css,/min-height:100dvh/,'mobile layout uses min-height so the composer is reachable');
 assert.match(css,/object-fit:contain/,'contain keeps the whole animal visible');
 assert.match(css,/\.line-grid/);
 assert.match(css,/\.line-card/);
});
test('creature lab mirrors crew-app except intended HTML cache versions',()=>{
 for(const name of ['creature.js','index.html','creature.css','creature-v6.js']){
  const site=fs.readFileSync(path.join(dir,name),'utf8');
  const app=fs.readFileSync(path.join(__dirname,'../crew-app/crew-creature-lab',name),'utf8');
  const normalize=value=>name==='index.html'?value.replace(/\?v=(?:__CREW_COMMIT__|[0-9a-f]{8})/g,'?v=HASH'):value;
  assert.equal(normalize(site),normalize(app),name);
 }
 for(const name of fs.readdirSync(path.join(dir,'art/creatures'))){
  assert.deepEqual(fs.readFileSync(path.join(dir,'art/creatures',name)),
   fs.readFileSync(path.join(__dirname,'../crew-app/crew-creature-lab/art/creatures',name)));
 }
});
