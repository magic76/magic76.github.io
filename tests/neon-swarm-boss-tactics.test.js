const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");

const html=fs.readFileSync(path.join(__dirname,"../web-spa/public/neon-swarm-lab/index.html"),"utf8");
const script=html.split("<script>")[1]?.split("</script>")[0];

function boot(){
 const elements=new Map();
 const ctx=new Proxy({},{
  get:(obj,key)=>obj[key]??(
   ["createLinearGradient","createRadialGradient"].includes(String(key))
    ?()=>({addColorStop(){}}):()=>{}),
  set:(obj,key,value)=>{obj[key]=value;return true}
 });
 const element=(id="")=>({
  id,hidden:false,style:{},textContent:"",innerHTML:"",
  classList:{add(){},remove(){},toggle(){}},
  getContext:()=>ctx,
  getBoundingClientRect:()=>({x:0,y:0,width:390,height:530,left:0,top:0}),
  addEventListener(){},setPointerCapture(){},append(){},
  cloneNode(){return element("clone")},querySelector(){return element("child")},
  insertAdjacentHTML(){}
 });
 const el=id=>{if(!elements.has(id))elements.set(id,element(id));return elements.get(id)};
 const W={addEventListener(){}};W.parent=W;
 const context={
  window:W,document:{
   getElementById:el,createElement:()=>element("canvas"),
   querySelector:()=>element("avatar"),querySelectorAll:()=>[],addEventListener(){}
  },
  ResizeObserver:class{observe(){}},
  Image:class{complete=true;naturalWidth=220;set src(value){this._src=value}},
  URLSearchParams,location:{search:"",origin:"http://localhost"},
  devicePixelRatio:1,performance:{now:()=>1000},
  requestAnimationFrame(){return 1},setTimeout(){return 1},clearTimeout(){},
  localStorage:{getItem(){return null},setItem(){}},
  Math,console,Number,String,Array,Set,Map
 };
 vm.createContext(context);
 const init="prepareFloor();reset();last=performance.now();raf=requestAnimationFrame(frame);";
 assert.ok(script?.includes(init),"game engine boot anchor must remain unchanged");
 const hooks="window.__BOSS_TEST__={"+
  "start:begin,spawn:spawnBoss,boss:()=>boss,step,attack:beginBossAttack,"+
  "shots:()=>enemyShots,clear:()=>{mobs.length=0;spawnT=999;shootT=999;enemyShots.length=0;player.inv=999},"+
  "phase:()=>phase,player:()=>player,mobs:()=>mobs,draw,"+
  "floor:bossDamageFloor,mob:(kind)=>{spawnMob(kind,player.x+185,player.y);"+
  "const e=mobs[mobs.length-1];e.attack=0;return e}};";
 vm.runInContext(script.replace(init,hooks+init),context,{timeout:10000});
 return W.__BOSS_TEST__;
}
function ticks(q,count,dt=.016){for(let i=0;i<count;i++)q.step(dt)}

test("Boss has 3 readable phases; large bursts cannot skip the combat mechanics",()=>{
 const q=boot();q.start();q.clear();q.spawn();
 const b=q.boss();
 assert.equal(b.hp,360);
 assert.equal(b.stage,1);
 assert.equal(q.floor(b),241,"armor locks until a fan attack happens");
 q.attack(b);
 assert.equal(b.telegraph?.type,"fan");
 q.step(.2);
 assert.equal(q.shots().length,0,"no instant projectiles during warning");
 ticks(q,60);
 assert.equal(q.shots().length,5,"stage 1 shoots a readable fan");
 assert.equal(q.floor(b),240,"after the attack, stage 1 cannot jump below stage-2 threshold");

 q.shots().length=0;
 b.hp=235;q.step(.02);
 assert.equal(b.stage,2);
 assert.equal(q.floor(b),121);
 b.shootT=0;q.step(.02);
 assert.equal(b.telegraph?.type,"nova");
 ticks(q,65);
 assert.ok(q.shots().length>=10&&q.shots().length<=14,
  "phase 2 nova must contain a clear safe gap");
 assert.equal(q.floor(b),120);

 q.shots().length=0;
 b.hp=110;q.step(.02);
 assert.equal(b.stage,3);
 assert.equal(q.floor(b),1);
 b.shootT=0;q.step(.02);
 assert.equal(b.telegraph?.type,"charge");
 const start=[b.x,b.y];
 ticks(q,70);
 assert.equal(q.floor(b),1,"first phase-3 dash remains protected until the motion completes");
 ticks(q,35);
 assert.ok(Math.hypot(b.x-start[0],b.y-start[1])>50,"boss physically charges after warning");
 assert.equal(q.floor(b),0,"boss becomes defeatable after its charge");
 assert.equal(q.phase(),"run");
});

test("Enemy tactics telegraph before they fire or charge",()=>{
 const q=boot();q.start();q.clear();
 const sniper=q.mob("sniper");
 q.step(.016);
 assert.ok(sniper.snipeWind>.6);
 assert.equal(q.shots().length,0);
 ticks(q,53);
 assert.equal(q.shots().length,1,"sniper waits before firing");

 q.shots().length=0;
 const charger=q.mob("charger");
 q.step(.016);
 assert.ok(charger.wind>.5,"charger announces its rush");
 assert.equal(charger.charge,0,"charger must not attack instantly");
 ticks(q,40);
 assert.ok(charger.charge>0,"rush starts after wind-up");
});

test("Boss and enemy telegraphs render through the same local canvas, with no network calls",()=>{
 assert.match(html,/function drawBossTelegraph\(b\)/);
 assert.match(html,/function drawMobTelegraph\(e\)/);
 assert.match(html,/if\(boss\)drawBossTelegraph\(boss\)/);
 assert.match(html,/for\(const e of mobs\)drawMobTelegraph\(e\)/);
 assert.match(html,/function bossDamageFloor\(b\)/);
 assert.match(html,/OVERMIND P/);
 assert.doesNotMatch(script,/fetch\(|XMLHttpRequest|WebSocket\(/);
 const q=boot();q.start();q.clear();q.spawn();q.attack(q.boss());
 q.mob("sniper");q.step(.016);
 assert.doesNotThrow(()=>q.draw(),"drawing a live warning cannot crash the render loop");
});
