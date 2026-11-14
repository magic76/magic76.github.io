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
test('evolving to final enters the collection and a fresh egg follows',()=>{
 const {qa}=boot();
 for(let i=0;i<16;i++)qa.post('天空好漂亮');
 assert.equal(qa.energy(),16);
 let res;
 res=qa.evolve();assert.equal(res.stage,1);assert.equal(qa.energy(),14);
 res=qa.evolve();assert.equal(res.stage,2);assert.equal(qa.energy(),10);
 res=qa.evolve();assert.equal(res.stage,3);assert.equal(qa.energy(),5);
 res=qa.evolve();assert.equal(res.stage,4);assert.equal(res.completed,true);assert.equal(qa.energy(),0);
 const st=qa.state();
 assert.equal(st.collection.length,1);
 assert.equal(st.collection[0].stage,4);
 assert.ok(st.collection[0].line);
 assert.equal(st.creature.stage,0);
 assert.equal(st.creature.line,null);
 assert.equal(st.creature.sentences,0);
 assert.equal(qa.boxes(),2,'daily box + completion box');
});
test('blind box daily grant is deduped and opening yields an egg or energy',()=>{
 const {qa:qa0}=boot();
 assert.equal(qa0.openBox(()=>0),null,'no boxes, nothing to open');
 const {qa}=boot();
 assert.equal(qa.grantBox('daily','2026-11-14'),true);
 assert.equal(qa.boxes(),1);
 assert.equal(qa.grantBox('daily','2026-11-14'),false);
 assert.equal(qa.boxes(),1);
 assert.equal(qa.grantBox('daily','2026-11-15'),true);
 assert.equal(qa.grantBox('complete'),true);
 assert.equal(qa.boxes(),3);
 const egg=qa.openBox(()=>0);
 assert.equal(egg.id,'egg-cat');
 assert.equal(qa.boxCollection()['egg-cat'],1);
 assert.equal(qa.boxes(),2);
 const pack=qa.openBox(()=>0.8);
 assert.equal(pack.kind,'energy');
 assert.equal(pack.id,'energy-small');
 assert.equal(qa.energy(),3);
 const golden=qa.openBox(()=>0.99);
 assert.equal(golden.id,'egg-stardragon');
 assert.equal(qa.boxCollection()['egg-stardragon'],1);
 assert.equal(qa.boxes(),0);
});
test('hatching an owned egg sets the creature line and spends the egg',()=>{
 const {qa}=boot();
 assert.equal(qa.hatch('cat'),false);
 qa.grantBox('complete');
 qa.openBox(()=>0);
 assert.equal(qa.boxCollection()['egg-cat'],1);
 assert.equal(qa.hatch('cat'),true);
 assert.equal(qa.state().creature.line,'cat');
 assert.equal(qa.boxCollection()['egg-cat'],undefined);
 assert.equal(qa.hatch('bogus'),false);
});
test('restore keeps valid saves and gives safe defaults to old or corrupt ones',()=>{
 const saved=JSON.stringify({version:1,energy:5,creature:{line:'cat',stage:2,topics:['animals','daily'],sentences:6},collection:[{line:'moonfox',topics:['dream'],stage:4}],boxes:2,boxCollection:{'egg-cat':1},lastDailyBox:'2026-11-14'});
 const {qa}=boot({storage:{'crew-creature-lab-v1':saved}});
 assert.equal(qa.energy(),5);
 assert.equal(qa.state().creature.line,'cat');
 assert.equal(qa.state().creature.stage,2);
 assert.equal(qa.state().collection.length,1);
 assert.equal(qa.boxes(),2);
 assert.equal(qa.boxCollection()['egg-cat'],1);
 assert.equal(qa.state().lastDailyBox,'2026-11-14');
 const {qa:qa2}=boot({storage:{'crew-creature-lab-v1':JSON.stringify({version:0})}});
 assert.equal(qa2.energy(),0);
 assert.equal(qa2.state().creature.stage,0);
 assert.equal(qa2.state().creature.line,null);
 assert.equal(qa2.boxes(),0);
 const bad=JSON.stringify({version:1,energy:-5,creature:{line:'bogus',stage:9,topics:'nope',sentences:-1},collection:[{line:'cat',topics:[],stage:2}],boxes:-1,boxCollection:{'bogus':3},lastDailyBox:'yesterday'});
 const {qa:qa3}=boot({storage:{'crew-creature-lab-v1':bad}});
 assert.equal(qa3.energy(),0);
 assert.equal(qa3.state().creature.stage,0);
 assert.equal(qa3.state().collection.length,0);
 assert.equal(qa3.boxes(),0);
 assert.equal(Object.keys(qa3.boxCollection()).length,0);
 assert.equal(qa3.state().lastDailyBox,null);
});
test('chatting the first sentence of the day grants a daily box',()=>{
 const {qa,get}=boot();
 assert.equal(qa.boxes(),0);
 qa.post('我喜歡喝咖啡');
 assert.equal(qa.boxes(),1);
 qa.post('星星宇宙');
 assert.equal(qa.boxes(),1,'second chat the same day grants nothing more');
 assert.equal(get('boxBtn').textContent,'🎁 盲盒 ×1');
});
test('creature UI is wired: energy bar, evolve button, modals, codex, QA hook',()=>{
 assert.match(html,/id="evolveBtn"/);
 assert.match(html,/id="energyFill"/);
 assert.match(html,/id="energyText"/);
 assert.match(html,/id="boxModal"/);
 assert.match(html,/id="eggModal"/);
 assert.match(html,/id="gallery"/);
 assert.match(html,/id="creatureCanvas"/);
 assert.match(html,/creature-v6\.js\?v=__CREW_COMMIT__/);
 assert.match(html,/creature\.js\?v=__CREW_COMMIT__/);
 assert.doesNotMatch(html,/botany\.js|family-art\.js|art-studies/);
 assert.match(script,/CRE\.gainEnergy\(state\)/);
 assert.match(script,/CRE\.canEvolve\(state\)/);
 assert.match(script,/CRE\.hatchEgg\(state,lineId\)/);
 assert.match(script,/__CREATURE_QA__/);
 assert.match(script,/crew-creature-lab-v1/);
 assert.match(script,/toDataURL\('image\/png'\)/);
 assert.match(css,/\.evolve-btn/);
 assert.match(css,/\.evolve-btn\.ready/);
 assert.match(css,/\.energy-track/);
 assert.match(css,/#12101C/);
 assert.match(css,/#6257E7/);
});
test('creature lab is mirrored byte-identically in crew-app',()=>{
 for(const name of ['creature.js','index.html','creature.css','creature-v6.js']){
  assert.equal(fs.readFileSync(path.join(dir,name),'utf8'),
   fs.readFileSync(path.join(__dirname,'../crew-app/crew-creature-lab',name),'utf8'));
 }
});
