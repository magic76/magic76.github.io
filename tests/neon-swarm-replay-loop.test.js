const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"../web-spa/public/neon-swarm-lab/index.html"),"utf8");
const body=html.split("<script>")[1]?.split("</script>")[0];
function boot(){
 const listeners={},elements=new Map(),store=new Map();
 const gradient=()=>({addColorStop(){}});
 const ctx=new Proxy({},{get:(t,k)=>t[k]??(["createLinearGradient","createRadialGradient"].includes(String(k))?gradient:()=>{}),set:(t,k,v)=>{t[k]=v;return true}});
 const elt=(id="")=>({id,hidden:false,disabled:false,style:{},textContent:"",innerHTML:"",
  classList:{add(){},remove(){},toggle(){}},
  getContext:()=>ctx,getBoundingClientRect:()=>({x:0,y:0,width:390,height:530,left:0,top:0}),
  addEventListener(ev,fn){(listeners[id+":"+ev]??=[]).push(fn)},
  setPointerCapture(){},append(){},cloneNode(){return elt("clone")},
  querySelector:()=>elt("child"),insertAdjacentHTML(){}});
 const el=id=>{if(!elements.has(id))elements.set(id,elt(id));return elements.get(id)};
 const W={addEventListener(ev,fn){(listeners["window:"+ev]??=[]).push(fn)}};W.parent=W;
 const doc={getElementById:el,createElement:()=>elt("canvas"),querySelector:()=>elt("avatar"),querySelectorAll:()=>[],addEventListener(){}};
 const storage={getItem:key=>store.get(key)||null,setItem:(key,value)=>{store.set(key,value)}};
 const globals={window:W,document:doc,localStorage:storage,ResizeObserver:class{observe(){}},
  Image:class{complete=true;naturalWidth=220;set src(v){this._src=v}},
  URLSearchParams,location:{search:"",origin:"http://localhost"},devicePixelRatio:1,
  performance:{now:()=>1000},requestAnimationFrame(){return 1},setTimeout(){return 1},clearTimeout(){},
  Math,console,Number,String,Array,Set,Map};
 vm.createContext(globals);
 const bootText="prepareFloor();reset();last=performance.now();raf=requestAnimationFrame(frame);";
 assert.ok(body.includes(bootText),"QA harness must find existing boot function");
 const qa="window.__REPLAY_TEST__={state:()=>({phase,gameTime,kills,score,upgradeStage,player,mobs,shots,pickupsCollected,arcBeams,record:localRecord}),"+
  "setTime:t=>{gameTime=t},start:begin,step,offer:offerUpgrade,choose:chooseUpgrade,chooseZoe:choose,finish:end,shoot,"+
  "clearEnemies:()=>{mobs.length=0;spawnT=99},clearShots:()=>{shots.length=0},"+
  "spawn:(x,y,hp=100)=>{const e={x,y,hp,maxHp:hp,r:18,kind:'drone',hit:0,speed:0,attack:99,seed:0};mobs.push(e);return e}};";
 vm.runInContext(body.replace(bootText,qa+bootText),globals,{timeout:10000});
 return {q:W.__REPLAY_TEST__,el,store};
}
test("weapon upgrade overlay is available by touch and keyboard without showing on boot",()=>{
 assert.match(html,/id="upgrade" role="dialog"/);
 assert.match(html,/\.choice\[hidden\],\.upgrade\[hidden\]\{display:none!important\}/);
 for(const key of ["arc","pierce","coolant"])assert.ok(html.includes('data-upgrade="'+key+'"'));
 assert.match(html,/phase==='upgrade'&&\['1','2','3'\]\.includes\(k\)/);
 const {q,el}=boot();
 assert.equal(el("upgrade").hidden,true);
 q.start();q.setTime(7.99);q.step(.016);
 assert.equal(q.state().phase,"upgrade");
 assert.equal(el("upgrade").hidden,false);
 const frozen=q.state().gameTime;q.step(.025);
 assert.equal(q.state().gameTime,frozen,"upgrade must pause simulation");
 q.choose("arc");
 assert.equal(q.state().phase,"run");
 assert.equal(el("upgrade").hidden,true);
 assert.equal(q.state().upgradeStage,1);
 assert.equal(q.state().player.upgrades.arc,true);
 q.choose("arc");
 assert.equal(q.state().upgradeStage,1,"cannot choose outside upgrade phase");
});
test("two upgrades coexist with the existing Zoe tactical decision",()=>{
 const {q}=boot();q.start();
 q.setTime(7.99);q.step(.016);q.choose("coolant");
 assert.equal(q.state().player.upgrades.coolant,true);
 q.setTime(14.01);q.step(.016);
 assert.equal(q.state().phase,"choice","Zoe tactical choice remains available");
 q.chooseZoe("shield");
 assert.equal(q.state().phase,"run");
 q.setTime(21.99);q.step(.016);
 assert.equal(q.state().phase,"upgrade");
 q.choose("pierce");
 assert.equal(q.state().upgradeStage,2);
 assert.equal(q.state().player.upgrades.pierce,true);
 assert.equal(q.state().player.upgrades.coolant,true);
 q.start();
 assert.equal(q.state().upgradeStage,0);
 assert.equal(q.state().player.upgrades.coolant,false);
 assert.equal(q.state().player.upgrades.pierce,false);
});
test("chain arcs damage a secondary target and are drawn from a timed effect queue",()=>{
 const {q}=boot();q.start();
 q.setTime(7.99);q.step(.016);q.choose("arc");
 q.setTime(14.01);q.step(.016);q.chooseZoe("shield");
 q.clearEnemies();
 const p=q.state().player;
 const first=q.spawn(p.x+150,p.y,200),second=q.spawn(p.x+190,p.y,70);
 q.shoot();const shot=q.state().shots[0];shot.x=first.x;shot.y=first.y;
 q.step(.001);
 assert.equal(second.hp,56);
 assert.ok(q.state().arcBeams.length>0,"lightning beam must survive until render");
});
test("armor piercing shots continue past the first enemy without hitting the same enemy twice",()=>{
 const {q}=boot();q.start();
 q.setTime(7.99);q.step(.016);q.choose("pierce");
 q.setTime(14.01);q.step(.016);q.chooseZoe("shield");
 q.clearEnemies();const p=q.state().player;
 const first=q.spawn(p.x+150,p.y,200),second=q.spawn(p.x+200,p.y,200);
 q.shoot();let shot=q.state().shots[0];assert.equal(shot.pierce,1);
 shot.x=first.x;shot.y=first.y;
 q.step(.001);
 assert.equal(first.hp,181);
 assert.equal(shot.pierce,0);
 assert.ok(q.state().shots.includes(shot),"projectile must survive first hit");
 q.step(.001);assert.equal(first.hp,181,"projectile may not damage same enemy twice");
 shot.x=second.x;shot.y=second.y;
 q.step(.001);
 assert.equal(second.hp,181);
 assert.ok(!q.state().shots.includes(shot),"projectile ends after the second target");
});
test("3-star replay result and score record are local-only",()=>{
 const {q,store}=boot();q.start();
 const p=q.state().player;
 q.finish(true);
 assert.equal(q.state().phase,"win");
 assert.equal(q.state().record.stars,1);
 assert.equal(JSON.parse(store.get("crew-neon-lab-record-v1")).stars,1);
 assert.match(html,/runStars\(won\)/);
 assert.match(html,/kills>=18/);
 assert.match(html,/pickupsCollected>=2/);
 assert.match(html,/id="missionBest"/);
});
