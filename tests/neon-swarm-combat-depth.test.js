const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"../web-spa/public/neon-swarm-lab/index.html"),"utf8");
const body=html.split("<script>")[1]?.split("</script>")[0];

function boot(){
 const listeners={},elements=new Map();let frameCb=()=>{},time=1000;
 const gradient=()=>({addColorStop(){}});
 const ctx=new Proxy({},{get:(t,k)=>t[k]??(["createLinearGradient","createRadialGradient"].includes(String(k))?gradient:()=>{}),set:(t,k,v)=>{t[k]=v;return true}});
 const elt=(id="")=>({id,hidden:false,style:{},textContent:"",innerHTML:"",
  classList:{add(){},remove(){},toggle(){}},
  getContext:()=>ctx,getBoundingClientRect:()=>({x:0,y:0,width:390,height:530,left:0,top:0}),
  addEventListener(ev,fn){(listeners[id+":"+ev]??=[]).push(fn)},
  setPointerCapture(){},append(){},cloneNode(){return elt("clone")},
  querySelector:()=>elt("child"),insertAdjacentHTML(){}});
 const el=id=>{if(!elements.has(id))elements.set(id,elt(id));return elements.get(id)};
 const W={addEventListener(ev,fn){(listeners["window:"+ev]??=[]).push(fn)}};W.parent=W;
 const d={getElementById:el,createElement:()=>elt("canvas"),querySelector:()=>elt("avatar"),querySelectorAll:()=>[],addEventListener(){}};
 const C={window:W,document:d,ResizeObserver:class{observe(){}},
  Image:class{complete=true;naturalWidth=220;set src(v){this._src=v}},
  URLSearchParams,location:{search:"",origin:"http://localhost"},devicePixelRatio:1,
  performance:{now:()=>time},requestAnimationFrame(fn){frameCb=fn;return 1},
  setTimeout(){return 1},clearTimeout(){},Math,console,Number,String,Array,Set,Map};
 vm.createContext(C);
 const replacement="window.__COMBAT_TEST__={"+
  "player:()=>player,shots:()=>shots,enemies:()=>mobs,pickups:()=>pickups,"+
  "muzzle:()=>heroMuzzlePoint(player),shoot,step,collectSupply,"+
  "clearShots:()=>{shots.length=0},clearEnemies:()=>{mobs.length=0;spawnT=99},"+
  "setEnemy:(x,y)=>{mobs.length=0;mobs.push({kind:'drone',x,y,r:18,hp:500,maxHp:500,speed:0,hit:0,attack:99,seed:0,charge:0,pulse:0})},"+
  "killFourth:()=>{const m={x:player.x+40,y:player.y,kind:'drone',r:16};kills=3;mobs.push(m);kill(m,mobs.length-1)},"+
  "spawnElite:()=>spawnMob('elite',player.x+180,player.y),"+
  "pickupsCollected:()=>pickupsCollected,"+
  "};prepareFloor();reset();last=performance.now();raf=requestAnimationFrame(frame);";
 const init="prepareFloor();reset();last=performance.now();raf=requestAnimationFrame(frame);";
 assert.ok(body?.includes(init),"test requires the exact game boot entry");
 vm.runInContext(body.replace(init,replacement),C,{timeout:10000});
 const tick=n=>{for(let i=0;i<n;i++){time+=16.667;frameCb(time)}};
 return {W,el,tick};
}

test("rifle muzzle is the authoritative origin for left and right shots",()=>{
 assert.match(html,/const CREW_FRAME_W=208,CREW_FRAME_H=184,CREW_HERO_SCALE=\.74/);
 assert.match(html,/function heroMuzzlePoint\(p\)/);
 assert.match(html,/const muzzle=heroMuzzlePoint\(player\)/);
 assert.match(html,/const muzzle=heroMuzzlePoint\(p\)/);
 const {W,el}=boot();el("start").onclick();
 const game=W.__COMBAT_TEST__;
 let player=game.player();
 game.clearEnemies();
 game.setEnemy(player.x+240,player.y);
 game.shoot();
 let shot=game.shots()[0],muzzle=game.muzzle();
 assert.ok(shot);
 assert.equal(shot.x,muzzle.x);
 assert.equal(shot.y,muzzle.y);
 assert.ok(shot.x>player.x+30,"right projectile must originate at rifle tip, not torso center");
 game.clearShots();
 game.setEnemy(player.x-240,player.y);
 game.shoot();
 shot=game.shots()[0];muzzle=game.muzzle();
 assert.ok(shot);
 assert.equal(shot.x,muzzle.x);
 assert.equal(shot.y,muzzle.y);
 assert.ok(shot.x<player.x-30,"left projectile must originate at mirrored rifle tip");
 assert.ok(shot.vx<0,"left projectile must travel towards target");
 game.clearShots();
 game.setEnemy(player.x+170,player.y-120);
 game.shoot();shot=game.shots()[0];
 assert.ok(shot.vy<0,"angled shot must travel from muzzle toward enemy, not old center-to-target angle");
});

test("battlefield pickups reward movement and reset reliably on each new game",()=>{
 assert.match(html,/id="missionSupplies"/);
 assert.match(html,/function dropSupply\(enemy\)/);
 assert.match(html,/function collectSupply\(item\)/);
 const {W,el}=boot();el("start").onclick();
 const game=W.__COMBAT_TEST__;
 game.clearEnemies();
 const p=game.player();
 p.hp=52;
 game.killFourth();
 assert.equal(game.pickups().length,1,"fourth kill must yield a supply pickup");
 const item=game.pickups()[0];
 assert.equal(item.kind,"med");
 game.collectSupply(item);
 assert.equal(p.hp,76);
 assert.equal(game.pickupsCollected(),1);
 assert.ok(game.pickups().length>=1,"collectSupply only applies reward; step owns removal");
 el("start").onclick();
 assert.equal(game.pickupsCollected(),0);
 assert.equal(game.pickups().length,0);
 assert.equal(game.player().overdrive,0);
});

test("armored elite telegraphs a multi-projectile volley",()=>{
 const {W,el}=boot();el("start").onclick();
 const game=W.__COMBAT_TEST__;
 game.clearEnemies();
 game.spawnElite();
 const elite=game.enemies()[0];
 assert.equal(elite.kind,"elite");
 assert.equal(elite.hp,175);
 assert.equal(elite.r,30);
 assert.equal(elite.maxHp,175);
 elite.attack=0;
 game.step(.016);
 assert.ok(elite.pulse>0,"elite must signal before firing");
 assert.match(html,/if\(e\.kind==='elite'\)/);
 assert.match(html,/for\(let k=-2;k<=2;k\+\+\)/);
 assert.match(html,/for\(const item of pickups\)/);
});
