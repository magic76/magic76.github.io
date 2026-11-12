const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.join(__dirname,'../web-spa/public/crew-buddy-lab');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const js=fs.readFileSync(path.join(dir,'buddy.js'),'utf8');
const sprites=fs.readFileSync(path.join(__dirname,'../web-spa/public/neon-swarm-lab/hero-sprites.js'),'utf8');
function boot(){
 const elements=new Map(),memory=new Map(),stats={drawImages:0};
 const ctx=new Proxy({drawImage(){stats.drawImages++}},{
  get:(o,k)=>o[k]||(['createLinearGradient','createRadialGradient'].includes(String(k))?()=>({addColorStop(){}}):()=>{}),
  set:(o,k,v)=>{o[k]=v;return true}});
 const element=(id='')=>({id,hidden:false,style:{},innerHTML:'',textContent:'',value:'',dataset:{},
  classList:{add(){},remove(){},toggle(){}},setAttribute(){},getContext:()=>ctx,
  getBoundingClientRect:()=>({width:390,height:440,left:0,top:0}),addEventListener(){},
  setPointerCapture(){},focus(){},querySelector(){return element('child')}});
 const get=id=>{if(!elements.has(id))elements.set(id,element(id));return elements.get(id)};
 class FakeImage{constructor(){this.complete=true;this.naturalWidth=800}set src(s){this.uri=s}}
 const window={devicePixelRatio:2,addEventListener(){},ResizeObserver:class{observe(){}},parent:null};window.parent=window;
 const c={window,Image:FakeImage,ResizeObserver:window.ResizeObserver,document:{getElementById:get,querySelectorAll:()=>[]},
  location:{search:'?qa=1'},URLSearchParams,performance:{now:()=>1000},
  requestAnimationFrame(){return 1},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},
  Math,console,Number,String,Array,Set,Map};
 vm.createContext(c);vm.runInContext(sprites,c,{timeout:10000});
 vm.runInContext(js,c,{timeout:10000});
 assert.ok(window.__BUDDY_QA__);
 return {q:window.__BUDDY_QA__,memory,stats,spriteBank:window.CREW_NEON_SPRITES};
}
function clear(q){for(let i=q.combat().enemies.length-1;i>=0;i--)q.hitEnemy(i,999)}
test('reuse original sniper motion atlas, character sprites draw for both heroes',()=>{
 assert.match(html,/\/neon-swarm-lab\/hero-sprites\.js/);
 assert.match(html,/id="fireBtn"/);
 assert.match(html,/id="soundBtn"/);
 const {q,stats,spriteBank}=boot();
 for(const key of ['run','idle','dash','hit','death','victory']){
  assert.ok(spriteBank[key].src.startsWith('data:image/webp;base64,'));
  assert.equal(spriteBank[key].w,208);
 }
 q.start();q.render();
 assert.ok(stats.drawImages>=2,'two animated heroes must be rendered');
});
test('gun muzzle, cooldown, facing and real projectile damage',()=>{
 const {q}=boot();q.start();const p=q.state().player;
 assert.equal(q.fire(),true);
 const s=q.combat().shots[0];
 assert.equal(s.x,p.x+35);assert.equal(s.y,p.y-45);
 assert.equal(q.fire(),false,'rate limit');
 q.controls(true,false,false,false);q.step(.17);
 assert.equal(q.state().player.face,-1);
 assert.equal(q.fire(),true);
 assert.ok(q.combat().shots.at(-1).vx<0);
 q.spawnWave();
 const amount=q.combat().enemies.length;
 assert.ok(amount>=3);
 q.hitEnemy(0,999);
 assert.equal(q.combat().enemies.length,amount-1);
 assert.equal(q.combat().kills,1);
});
test('Zoe shoots independently while player fires and can obey tactical commands',()=>{
 const {q}=boot();q.start();q.place('player',245);q.step(.016);
 assert.equal(q.combat().wave,1);
 q.controls(false,false,false,true);
 for(let i=0;i<90;i++)q.step(.016);
 assert.ok(q.combat().shotsFired>=3);
 assert.ok(q.combat().zoeShots>=1);
 assert.equal(q.parseCommand('Zoe 請掩護我'),'help');
 assert.equal(q.command('wait'),true);
 q.step(.016);
 assert.equal(q.state().command,'wait');
 assert.equal(q.toggleSound(),false);assert.equal(q.toggleSound(),true);
});
test('two enemy waves lock the exit, and final room has a miniboss',()=>{
 const {q}=boot();q.start();q.spawnWave();
 q.place('player',917);q.place('zoe',912);q.updatePuzzle();
 assert.equal(q.state().phase,'playing','cannot skip active shooting wave');
 clear(q);assert.equal(q.spawnWave(),true);
 clear(q);assert.equal(q.combat().cleared,true);
 q.updatePuzzle();assert.equal(q.state().phase,'transition');
 q.room('relay');q.spawnWave();clear(q);q.spawnWave();
 assert.ok(q.combat().enemies.some(x=>x.kind==='mech'&&x.hp===12));
});
test('solid cover blocks projectiles, and two heroes revive each other',()=>{
 const {q,memory}=boot();q.start();
 const cover=q.combat().covers[0];
 q.addEnemyShot(cover.x+cover.w/2,cover.y+cover.h/2,5,0);
 q.step(.016);
 assert.equal(q.combat().enemyShots.length,0);
 q.hurt('player',5);assert.equal(q.state().player.down,true);
 q.place('zoe',q.state().player.x+30);q.step(.016);
 assert.equal(q.state().player.down,false);
 assert.equal(q.state().stats.savedByZoe,1);
 q.hurt('zoe',5);q.place('zoe',q.state().player.x+15);
 q.step(.016);assert.equal(q.state().zoe.down,false);
 assert.equal(q.state().stats.savedZoe,1);
 assert.equal(JSON.parse(memory.get('crew-buddy-lab-v1')).savedZoe,1);
});
test('prototype is local-only: sprite reuse does not add network AI or original game IP',()=>{
 assert.doesNotMatch(js,/\bfetch\(|XMLHttpRequest|WebSocket\(/);
 assert.doesNotMatch(html,/https?:\/\/(?!www\.w3\.org)/);
 assert.match(html,/尚未連接 Gemini Live/);
 assert.match(js,/function combatStep\(dt\)/);
 assert.match(js,/function reviveAvatar\(/);
});
