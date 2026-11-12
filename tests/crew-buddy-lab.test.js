const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const root=path.join(__dirname,'../web-spa/public/crew-buddy-lab');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'buddy.css'),'utf8');
const source=fs.readFileSync(path.join(root,'buddy.js'),'utf8');

function boot(){
 const elements=new Map(),storage=new Map(),raf={fn:null};
 const gradient=()=>({addColorStop(){}});
 const ctx=new Proxy({},{get:(obj,key)=>obj[key]??(
  ['createLinearGradient','createRadialGradient'].includes(String(key))?gradient:()=>{}
 ),set:(obj,key,value)=>{obj[key]=value;return true}});
 function element(id=''){
  return {id,hidden:false,style:{},innerHTML:'',textContent:'',value:'',dataset:{},
   classList:{add(){},remove(){},toggle(){}},
   setAttribute(){},getAttribute(){return null},
   getContext:()=>ctx,getBoundingClientRect:()=>({width:390,height:430,left:0,top:0}),
   addEventListener(){},setPointerCapture(){},
   querySelector:()=>element('child'),append(){},remove(){},
   focus(){}
  };
 }
 const get=id=>{if(!elements.has(id))elements.set(id,element(id));return elements.get(id)};
 const document={getElementById:get,querySelectorAll:()=>[]};
 const window={devicePixelRatio:3,addEventListener(){},
  ResizeObserver:class{observe(){}},parent:null};
 window.parent=window;
 const context={
  document,window,location:{search:'?qa=1'},
  URLSearchParams,
  performance:{now:()=>1000},
  requestAnimationFrame:fn=>{raf.fn=fn;return 1},
  ResizeObserver:window.ResizeObserver,
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  Math,console,Number,String,Array,Set,Map
 };
 vm.createContext(context);
 vm.runInContext(source,context,{timeout:10000});
 assert.ok(window.__BUDDY_QA__,'QA probes must be enabled only via ?qa=1');
 return {q:window.__BUDDY_QA__,document:get,storage,ctx,raf};
}
test('standalone accessible five-room prototype has offline-only UI and real command buttons',()=>{
 assert.match(html,/lang="zh-Hant"/);
 assert.match(html,/robots" content="noindex, nofollow"/);
 assert.match(html,/id="gameCanvas"/);
 assert.match(html,/id="jumpBtn"/);
 assert.match(html,/id="leftBtn"/);
 assert.match(html,/id="rightBtn"/);
 for(const name of ['follow','lead','wait','help'])assert.match(html,new RegExp('data-command="'+name+'"'));
 assert.match(html,/id="sayInput"/);
 assert.match(html,/目前尚未連接 Gemini Live/);
 assert.doesNotMatch(html+css+source,/https?:\/\/(?!www\.w3\.org)/);
 assert.doesNotMatch(source,/\bfetch\s*\(|WebSocket\s*\(|XMLHttpRequest|eval\s*\(/);
 assert.match(css,/@media\(max-width:670px\)/);
});
test('the player can jump and Zoe uses local commands that change state',()=>{
 const {q}=boot();
 const ids=q.rooms;
 assert.equal(ids.length,5);
 assert.equal(new Set(ids).size,5);
 q.start();
 assert.equal(q.state().phase,'playing');
 assert.equal(q.state().room,'gap');
 assert.equal(q.state().stats.runs,1);
 assert.equal(q.command('wait'),true);
 assert.equal(q.state().command,'wait');
 assert.equal(q.parseCommand('Zoe 等我一下'),'wait');
 assert.equal(q.parseCommand('你先走!'),'lead');
 assert.equal(q.parseCommand('幫幫我'),'help');
 assert.equal(q.parseCommand('跟我來'),'follow');
 assert.equal(q.parseCommand('吃飯嗎？'),null);
 assert.equal(q.jump(),true);
 assert.ok(q.state().player.vy<0);
 q.step(.033);
 assert.ok(q.state().player.y<415);
});
test('Zoe can jump the first pit and wait on the other side',()=>{
 const {q}=boot();
 q.start();
 q.place('player',298);
 let landed=false,crossed=false;
 for(let i=0;i<150;i++){
  q.step(.016);
  if(q.state().zoe.x>504)crossed=true;
  if(q.state().zoe.x>504&&q.state().zoe.onGround){landed=true;break}
 }
 assert.ok(crossed,'Zoe should autonomously cross gap when the player approaches');
 assert.ok(landed,'Zoe should land after the gap, not fall forever');
});
test('fall rescue is real and remembered rather than a dialogue-only illusion',()=>{
 const {q,storage}=boot();q.start();
 q.place('zoe',510);
 q.place('player',435,660);
 const previous=q.state().stats.savedByZoe;
 q.rescue();
 assert.equal(q.state().stats.savedByZoe,previous+1);
 assert.equal(q.state().player.onGround,true);
 assert.equal(q.state().player.y,415);
 assert.ok(q.state().events.some(x=>x.includes('拉住')));
 assert.ok(JSON.parse(storage.get('crew-buddy-lab-v1')).savedByZoe>=1);
});
test('two pressure switches unlock the gate only when the two players cooperate',()=>{
 const {q}=boot();q.start();q.room('switches');
 assert.equal(q.state().gateOpen,false);
 q.place('player',302);q.updatePuzzle();
 assert.equal(q.state().gateOpen,false,'player alone cannot open the door');
 q.place('zoe',632);q.updatePuzzle();
 assert.equal(q.state().gateOpen,true);
 assert.ok(q.state().events.some(x=>x.includes('開關')));
});
test('star relay requires separate player and Zoe pickups',()=>{
 const {q}=boot();q.start();q.room('stars');
 q.place('zoe',656);q.updatePuzzle();
 assert.equal(q.state().flags.starZ,true);
 assert.equal(q.state().gateOpen,false,'Zoe cannot finish alone');
 q.place('player',340);q.updatePuzzle();
 assert.equal(q.state().flags.starP,true);
 assert.equal(q.state().gateOpen,true);
});
test('player can free trapped Zoe through a tangible switch',()=>{
 const {q}=boot();q.start();q.room('rescue');
 assert.equal(q.state().zoe.trapped,true);
 assert.equal(q.state().gateOpen,false);
 q.place('player',365);q.updatePuzzle();
 assert.equal(q.state().zoe.trapped,false);
 assert.equal(q.state().gateOpen,true);
 assert.equal(q.state().stats.savedZoe,1);
 assert.ok(q.state().events.some(x=>x.includes('救出')));
});
test('relay bridge stays active when Zoe holds the plate, then locks after the player crosses',()=>{
 const {q}=boot();q.start();q.room('relay');
 assert.equal(q.state().bridgeActive,false);
 q.place('zoe',284);q.updatePuzzle();
 assert.equal(q.state().bridgeActive,true);
 assert.equal(q.state().gateOpen,false);
 q.place('player',671);q.updatePuzzle();
 assert.equal(q.state().flags.bridged,true);
 assert.equal(q.state().gateOpen,true);
 q.place('zoe',700);q.updatePuzzle();
 assert.equal(q.state().bridgeActive,true,'the locked bridge stays after Zoe leaves');
});
test('exit waits for both people, then next room starts automatically',()=>{
 const {q}=boot();q.start();
 q.place('player',917);q.updatePuzzle();
 assert.equal(q.state().phase,'playing','leaving Zoe behind does not finish');
 q.place('zoe',912);q.updatePuzzle();
 assert.equal(q.state().phase,'transition');
 q.step(1.2);
 assert.equal(q.state().phase,'playing');
 assert.equal(q.state().roomIndex,1);
});
test('five-room finish records a joint story and next run keeps local memories',()=>{
 const {q,storage}=boot();q.start();
 q.room('rescue');q.place('player',365);q.updatePuzzle();
 q.finish();
 assert.equal(q.state().phase,'complete');
 const stored=JSON.parse(storage.get('crew-buddy-lab-v1'));
 assert.equal(stored.runs,1);
 assert.equal(stored.savedZoe,1);
 assert.match(stored.lastSaved,/Zoe/);
 q.start();
 assert.equal(q.state().stats.runs,2);
 assert.equal(q.state().roomIndex,0);
 assert.equal(q.state().phase,'playing');
});

test('real player movement and one timed jump can cross the 135px gap',()=>{
 const {q}=boot();q.start();
 q.controls(false,true,false);
 for(let i=0;i<51;i++)q.step(.016); // ~300 px, before the first pit
 const before=q.state().player.x;
 assert.ok(before>=287&&before<365,'player should reach the runway before the pit');
 q.controls(false,true,true);
 let landed=false;
 for(let i=0;i<100;i++){
  q.step(.016);
  const p=q.state().player;
  if(p.x>510&&p.onGround){landed=true;break}
 }
 assert.ok(landed,'the player must be able to leap the first pit with regular controls');
 assert.equal(q.state().room,'gap');
});

test('Zoe reaches and holds her actual switch through autonomous pathing',()=>{
 const {q}=boot();q.start();q.room('switches');
 q.place('player',302);q.updatePuzzle();
 assert.equal(q.state().gateOpen,false);
 let opened=false;
 for(let i=0;i<210;i++){
  q.step(.016);
  if(q.state().gateOpen){opened=true;break}
 }
 assert.ok(opened,'local AI should solve its switch without teleporting');
 assert.ok(Math.abs(q.state().zoe.x-632)<43);
 assert.ok(q.state().events.some(x=>x.includes('同時踩住')));
});

test('the bridge puzzle is playable by moving, not only by changing test flags',()=>{
 const {q}=boot();q.start();q.room('relay');
 q.place('player',185);
 q.controls(false,true,false);
 let bridgeWasUp=false,completedBridge=false;
 for(let i=0;i<220;i++){
  q.step(.016);
  bridgeWasUp ||= q.state().bridgeActive;
  completedBridge ||= q.state().flags.bridged;
  if(completedBridge)break;
 }
 assert.ok(bridgeWasUp,'Zoe must stand on the left pressure plate in real time');
 assert.ok(completedBridge,'the player should cross the supported bridge and lock it');
 assert.ok(q.state().player.x>=624,'player should reach the far-side control');
 assert.equal(q.state().gateOpen,true);
});
