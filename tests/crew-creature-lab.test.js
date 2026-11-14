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
 assert.deepEqual([...qa.lines()],['moonfox','stardragon','flowerfairy','cat']);
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
test('first evolution line is decided by the dominant topic',()=>{
 const {qa}=boot();
 qa.post('我昨天夢到在月亮上散步');
 qa.post('晚上睡覺一直做夢');
 const res=qa.evolve();
 assert.equal(res.line,'moonfox');
 assert.equal(qa.state().creature.line,'moonfox');
 const {qa:qa2}=boot();
 qa2.post('我家貓咪今天又偷吃我的魚');
 qa2.post('貓咪真的超可愛');
 const res2=qa2.evolve();
 assert.equal(res2.line,'cat');
 assert.equal(qa2.state().creature.line,'cat');
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
test('gift pool has 12 items (weights sum 117) including 5 permanent companions',()=>{
 const {qa}=boot();
 const items=qa.giftItems();
 assert.equal(items.length,12);
 assert.equal(items.reduce((s,x)=>s+x.weight,0),117);
 const companions=items.filter(x=>x.kind==='companion');
 assert.deepEqual([...companions.map(x=>x.id)].sort(),
  ['companion-butterfly','companion-firefly','companion-lantern','companion-mushroom','companion-star']);
 assert.equal(items.filter(x=>x.kind==='egg').length,5,'4 line eggs + golden egg');
 assert.equal(items.filter(x=>x.kind==='energy').length,2);
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
 const pack=qa.openGift(()=>0.7);
 assert.equal(pack.kind,'energy');
 assert.equal(pack.id,'energy-small');
 assert.equal(qa.energy(),3);
 assert.equal(qa.gifts(),2);
 const buddy=qa.openGift(()=>0.89);
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
 // rand 0.80 rolls companion-firefly again (weight band 90-98 of 117).
 const item=qa.openGift(()=>0.80);
 assert.equal(item.rerolled,true);
 assert.equal(item.kind,'egg');
 assert.equal(item.id,'egg-moonfox');
 assert.equal(qa.giftCollection()['companion-firefly'],1,'companion count unchanged');
 assert.equal(qa.giftCollection()['egg-moonfox'],1,'an egg lands instead');
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
test('creature UI is wired: energy bar, evolve button, next button, modals, codex, QA hook',()=>{
 assert.match(html,/id="evolveBtn"/);
 assert.match(html,/id="nextBtn"/);
 assert.match(html,/id="energyFill"/);
 assert.match(html,/id="energyText"/);
 assert.match(html,/id="giftModal"/);
 assert.match(html,/id="eggModal"/);
 assert.match(html,/id="gallery"/);
 assert.match(html,/id="giftGrid"/);
 assert.match(html,/id="creatureCanvas"/);
 assert.match(html,/creature-v6\.js\?v=__CREW_COMMIT__/);
 assert.match(html,/creature\.js\?v=__CREW_COMMIT__/);
 assert.doesNotMatch(html,/botany\.js|family-art\.js|art-studies/);
 assert.doesNotMatch(html,/盲盒|boxBtn|boxModal|boxGrid/);
 assert.match(html,/禮物收藏/);
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
 assert.match(script,/__CREATURE_QA__/);
 assert.match(script,/crew-creature-lab-v1/);
 assert.match(script,/toDataURL\('image\/png'\)/);
 assert.match(css,/\.evolve-btn/);
 assert.match(css,/\.evolve-btn\.ready/);
 assert.match(css,/\.next-btn/);
 assert.match(css,/\.energy-track/);
 assert.match(css,/#12101C/);
 assert.match(css,/#6257E7/);
});
test('creature lab is mirrored byte-identically in crew-app',()=>{
 for(const name of ['creature.js','index.html','creature.css','creature-v6.js']){
  assert.equal(fs.readFileSync(path.join(dir,name),'utf8'),
   fs.readFileSync(path.join(__dirname,'../crew-app/crew-creature-lab',name),'utf8'));
 }
 for(const name of fs.readdirSync(path.join(dir,'art/creatures'))){
  assert.deepEqual(fs.readFileSync(path.join(dir,'art/creatures',name)),
   fs.readFileSync(path.join(__dirname,'../crew-app/crew-creature-lab/art/creatures',name)));
 }
});
