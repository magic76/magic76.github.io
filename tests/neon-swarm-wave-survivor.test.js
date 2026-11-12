const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");

const html=fs.readFileSync(path.join(__dirname,"../web-spa/public/neon-swarm-lab/index.html"),"utf8");
const script=html.split("<script>")[1]?.split("</script>")[0];

function boot(){
 const elements=new Map(),stored=new Map();
 const ctx=new Proxy({},{get:(obj,key)=>obj[key]??(
  ["createLinearGradient","createRadialGradient"].includes(String(key))
  ?()=>({addColorStop(){}}):()=>{}),set:(obj,key,value)=>{obj[key]=value;return true}});
 const elFactory=(id="")=>({
  id,hidden:false,disabled:false,style:{},textContent:"",innerHTML:"",
  classList:{add(){},remove(){},toggle(){}},
  getContext:()=>ctx,getBoundingClientRect:()=>({x:0,y:0,width:390,height:530,left:0,top:0}),
  addEventListener(){},setPointerCapture(){},append(){},
  cloneNode(){return elFactory("clone")},querySelector(){return elFactory("child")},
  insertAdjacentHTML(){}
 });
 const el=id=>{if(!elements.has(id))elements.set(id,elFactory(id));return elements.get(id)};
 const W={addEventListener(){},parent:null};W.parent=W;
 const context={
  window:W,document:{getElementById:el,createElement:()=>elFactory("canvas"),
   querySelector:()=>elFactory("avatar"),querySelectorAll:()=>[],addEventListener(){}},
  ResizeObserver:class{observe(){}},
  Image:class{complete=true;naturalWidth=220;set src(v){this._src=v}},
  URLSearchParams,location:{search:"",origin:"http://localhost"},
  devicePixelRatio:3,performance:{now:()=>1000},
  requestAnimationFrame(){return 1},setTimeout(){return 1},clearTimeout(){},
  localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},
  Math,console,Number,String,Array,Set,Map
 };
 vm.createContext(context);
 const init="prepareFloor();reset();last=performance.now();raf=requestAnimationFrame(frame);";
 assert.ok(script?.includes(init),"QA hook must match actual game boot");
 const api="window.__WAVE_QA__={"+
  "start:begin,step,chooseUpgrade,chooseZoe:choose,spawn:spawnMob,spawnBoss,waveAt,"+
  "evolve:evolveArsenal,burst:burstClear,direct:directEnemyWaves,"+
  "state:()=>({phase,gameTime,wave,upgradeStage,evolutionStage,mobs,kills,score,boss,"+
  "hero:player,zoom,viewBaseZoom,dpr,fxQuality,perfFps,shots,shockwaves,particlePool,particles}),"+
  "setTime:t=>{gameTime=t},setSpawnT:t=>{spawnT=t},setPerfFps:v=>{perfFps=v},"+
  "clear:()=>{mobs.length=0;spawnT=999;shootT=999;player.inv=999}};";
 vm.runInContext(script.replace(init,api+init),context,{timeout:10000});
 return {q:W.__WAVE_QA__,dom:el,publicState:()=>W.__NEON_STATE__};
}
function unlock(q){
 q.start();
 q.setTime(7.99);q.step(.02);
 assert.equal(q.state().phase,"upgrade");
 q.chooseUpgrade("arc");
 q.setTime(14.01);q.step(.016);
 assert.equal(q.state().phase,"choice");
 q.chooseZoe("shield");
 q.setTime(21.99);q.step(.02);
 assert.equal(q.state().phase,"upgrade");
 q.chooseUpgrade("pierce");
 assert.equal(q.state().upgradeStage,2);
}

test("390px camera shows much more of the arena, but keeps sprite and muzzle anchors intact",()=>{
 const {q,publicState}=boot();
 const state=q.state();
 assert.ok(state.zoom>=.78&&state.zoom<=.85,{zoom:state.zoom});
 assert.equal(state.dpr,1.5,"cap mobile DPR so crowded canvas stays affordable");
 assert.equal(publicState().maxMobs,54);
 assert.match(html,/heroMuzzlePoint\(player\)/);
 assert.match(html,/CREW_FRAME_W=208,CREW_FRAME_H=184,CREW_HERO_SCALE=\.74/);
});
test("wave director spans six increasing targets and never exceeds the live-mob cap",()=>{
 const {q}=boot();q.start();const defs=q.state();
 for(const [t,i] of [[0,0],[10,1],[20,2],[32,3],[44,4],[58,5],[71.99,5]]){
  assert.equal(q.waveAt(t),i,"wave index at t="+t);
 }
 q.clear();
 const player=q.state().hero;
 for(let i=0;i<99;i++)q.spawn("swarm",player.x+i*.01,player.y+i*.01);
 assert.equal(q.state().mobs.length,54,"hard limit for live enemies");
 assert.ok(q.state().mobs.every(m=>m.kind==="swarm"&&m.hp===16));
 assert.match(html,/target:9,burst:3/);
 assert.match(html,/target:52,burst:8/);
 assert.match(html,/pattern:'corners'/);
});
test("the first upgrade and Zoe choice still work before six-wave escalation",()=>{
 const {q}=boot();unlock(q);
 q.setTime(31.99);q.step(.02);
 assert.equal(q.state().wave,4);
 q.setTime(44.01);q.step(.02);
 assert.equal(q.state().wave,5);
 assert.equal(q.state().evolutionStage,1);
 assert.equal(q.state().hero.evolved.arc,true);
 assert.ok(q.state().shockwaves.length>0,"evolution creates a visible large clear");
 q.setTime(59.99);q.step(.02);
 assert.equal(q.state().wave,6);
 assert.equal(q.state().evolutionStage,2);
 assert.equal(q.state().hero.evolved.pierce,true);
 assert.ok(q.state().mobs.length<=54);
});
test("evolved chain damages several targets; evolved armor piercing traverses four total",()=>{
 const {q}=boot();unlock(q);
 q.clear();q.setTime(41.99);q.step(.02);
 const player=q.state().hero;
 const first=q.spawn("drone",player.x+100,player.y);
 const second=q.spawn("drone",player.x+120,player.y+10);
 const third=q.spawn("drone",player.x+150,player.y+20);
 first.hp=150;second.hp=100;third.hp=100;
 q.burst(1,0);
 assert.equal(q.state().hero.evolved.arc,true);
 assert.match(html,/count=evolved\?4:1/);
 assert.match(html,/pierce:player\.evolved\.pierce\?3/);
});
test("boss arrives after 72 seconds and clears remaining crowd without respawning",()=>{
 const {q}=boot();unlock(q);
 q.setTime(41.99);q.step(.02);
 q.setTime(59.99);q.step(.02);
 q.clear();
 const player=q.state().hero;
 for(let i=0;i<25;i++)q.spawn("swarm",player.x+200+i,player.y+80);
 const oldKills=q.state().kills;
 q.setTime(71.99);q.step(.02);
 assert.ok(q.state().boss,"boss spawns at 72 seconds");
 assert.equal(q.state().wave,7);
 assert.equal(q.state().mobs.length,0,"remaining crowd is cleared for the boss encounter");
 assert.ok(q.state().kills>=oldKills+25,"clear is counted in the result");
 q.step(.4);
 assert.equal(q.state().boss?.stage,1);
});
test("late-wave density falls gracefully on low FPS and low HP",()=>{
 const {q}=boot();unlock(q);
 q.clear();q.setPerfFps(30);q.state().hero.hp=29;
 q.setTime(59.99);q.step(.02);
 assert.equal(q.state().wave,6);
 q.clear();q.setSpawnT(0);
 for(let i=0;i<10;i++){q.direct();q.setSpawnT(0)}
 assert.ok(q.state().mobs.length<=30,"health and FPS pressure limits combine");
 assert.match(html,/function recycleParticle\(i\)/);
 assert.match(html,/particlePool\.pop\(\)/);
});
