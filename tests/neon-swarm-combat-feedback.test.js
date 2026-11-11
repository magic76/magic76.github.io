const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"../web-spa/public/neon-swarm-lab/index.html"),"utf8");
const body=html.split("<script>")[1]?.split("</script>")[0];

function boot(){
 const nodes={osc:0,noise:0,gain:0},vibrations=[],elements=new Map(),store=new Map();
 const ctx=new Proxy({},{
  get:(obj,key)=>obj[key]??(
   ["createLinearGradient","createRadialGradient"].includes(String(key))
    ?()=>({addColorStop(){}}):()=>{}),
  set:(obj,key,value)=>{obj[key]=value;return true}
 });
 const elFactory=(id="")=>({
  id,hidden:false,disabled:false,style:{},textContent:"",innerHTML:"",
  classList:{add(){},remove(){},toggle(){}},
  getContext:()=>ctx,
  getBoundingClientRect:()=>({x:0,y:0,width:390,height:530,left:0,top:0}),
  addEventListener(){},setPointerCapture(){},append(){},
  cloneNode(){return elFactory("clone")},
  querySelector(){return elFactory("child")},
  insertAdjacentHTML(){}
 });
 const el=id=>{if(!elements.has(id))elements.set(id,elFactory(id));return elements.get(id)};
 const param=()=>({setValueAtTime(){},exponentialRampToValueAtTime(){},value:2400});
 let audio;
 class Audio{
  constructor(){this.currentTime=0;this.state="running";this.sampleRate=48000;this.destination={};audio=this}
  createOscillator(){nodes.osc++;return {type:"sine",frequency:param(),connect(){return this},start(){},stop(){}}}
  createGain(){nodes.gain++;return {gain:param(),connect(){return this}}}
  createBiquadFilter(){return {type:"lowpass",frequency:param(),connect(){return this}}}
  createBuffer(channels,length){return {getChannelData(){return new Float32Array(length)}}}
  createBufferSource(){nodes.noise++;return {buffer:null,connect(){return this},start(){},stop(){}}}
  resume(){return Promise.resolve()}
 }
 const W={addEventListener(){},AudioContext:Audio,
  navigator:{vibrate:pattern=>{vibrations.push(pattern);return true}},
  matchMedia:()=>({matches:false})};
 W.parent=W;
 const globals={
  window:W,
  document:{getElementById:el,createElement:()=>elFactory("canvas"),
   querySelector:()=>elFactory("avatar"),querySelectorAll:()=>[],addEventListener(){}},
  ResizeObserver:class{observe(){}},
  Image:class{complete=true;naturalWidth=220;set src(v){this._src=v}},
  URLSearchParams,location:{search:"",origin:"http://localhost"},
  devicePixelRatio:1,performance:{now:()=>1000},
  requestAnimationFrame(){return 1},setTimeout(){return 1},clearTimeout(){},
  localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)},
  Math,console,Number,String,Array,Set,Map
 };
 vm.createContext(globals);
 const init="prepareFloor();reset();last=performance.now();raf=requestAnimationFrame(frame);";
 assert.ok(body?.includes(init));
 const qa="window.__FX_QA__={"+
  "start:begin,step,shoot,kill,harm,sound,haptic,impact,draw,drawImpacts,frame,"+
  "phase:()=>phase,muted:()=>muted,setMute:value=>{muted=value},"+
  "player:()=>player,shots:()=>shots,mobs:()=>mobs,impacts:()=>impacts,"+
  "hitstop:()=>hitstop,spawnBoss, boss:()=>boss,"+
  "clear:()=>{mobs.length=0;spawnT=999;shootT=999;shots.length=0;player.inv=0},"+
  "spawn:(x,y,hp)=>{const m={x,y,hp,maxHp:hp,r:18,kind:'drone',hit:0,speed:0,attack:99,seed:0};mobs.push(m);return m}"+
  "};";
 vm.runInContext(body.replace(init,qa+init),globals,{timeout:10000});
 return {q:W.__FX_QA__,nodes,vibrations,audio:()=>audio};
}

test("WebAudio creates different layered voices, and throttles rapid gunshots",()=>{
 const {q,nodes,audio}=boot();
 assert.equal(nodes.osc,0);
 q.start(); // Audio unlock runs from real start gesture in production.
 assert.ok(audio(),"first game action creates an AudioContext");
 const before=nodes.osc;
 q.sound("shot");
 assert.ok(nodes.osc>=before+2,"gunfire uses layered oscillators, not one beep");
 assert.ok(nodes.noise>=1,"transient noise layer adds texture");
 const first=nodes.osc;
 q.sound("shot");
 assert.equal(nodes.osc,first,"same-frame gunshot burst must be throttled");
 audio().currentTime+=.09;
 q.sound("shot");
 assert.ok(nodes.osc>first,"later shot can be heard");
 audio().currentTime+=.3;
 const afterShot=nodes.osc;
 q.sound("hit");
 q.sound("armor");
 q.sound("kill");
 q.sound("combo");
 q.sound("bossBreak");
 assert.ok(nodes.osc>=afterShot+8,"hits, armor, kills, combo, boss break use distinct SFX");
});
test("mute and reduced-motion opt out do not block game play",()=>{
 const {q,nodes,vibrations}=boot();q.start();
 q.setMute(true);
 const before=nodes.osc;
 q.sound("kill");
 q.haptic([12,22,12]);
 assert.equal(nodes.osc,before,"mute silences all new sounds");
 assert.equal(vibrations.length,0,"mute suppresses optional vibration");
 q.setMute(false);
 q.sound("kill");
 assert.ok(nodes.osc>before);
 q.haptic(10);
 assert.equal(vibrations.length,1);
});
test("projectile collision creates a short readable impact and metallic SFX without extra damage",()=>{
 const {q,nodes}=boot();q.start();q.clear();
 const p=q.player(),enemy=q.spawn(p.x+150,p.y,100);
 q.shoot();
 const bullet=q.shots()[0];
 assert.ok(bullet,"player auto-aim creates a bullet");
 bullet.x=enemy.x;bullet.y=enemy.y;
 const before=nodes.osc;q.step(.001);
 assert.equal(enemy.hp,81);
 assert.ok(q.impacts().some(i=>i.type==="metal"),"metal contact arc should render");
 assert.ok(nodes.osc>before,"contact triggers sound without calling the game engine twice");
 assert.doesNotThrow(()=>q.draw(),"active impact effect should never crash Canvas render");
});
test("destroying a robot applies a capped hitstop and screen-space hit feedback",()=>{
 const {q}=boot();q.start();q.clear();
 const p=q.player(),m=q.spawn(p.x+160,p.y,5);
 q.shoot();const bullet=q.shots()[0];bullet.x=m.x;bullet.y=m.y;
 q.step(.001);
 assert.equal(q.mobs().length,0);
 assert.ok(q.hitstop()>=.025&&q.hitstop()<=.035,"kill freeze should be about two 60fps frames");
 assert.ok(q.impacts().some(i=>i.type==="kill"),"explosion creates its own impact ring");
 assert.doesNotThrow(()=>q.draw());
});
test("Boss defeat has stronger burst, while player hurt uses separate feedback",()=>{
 const {q,vibrations}=boot();q.start();q.clear();
 const p=q.player();
 q.harm(16);
 assert.ok(p.hp<120);
 assert.ok(q.impacts().some(i=>i.type==="hurt"));
 assert.equal(vibrations.length,1,"damage vibrates once");
 q.start();q.clear();q.spawnBoss();
 const b=q.boss();b.hp=10;b.stage=3;b.phaseAttackDone=true;
 q.shots().push({x:b.x,y:b.y,vx:0,vy:0,r:4,damage:19,life:1,trail:[],pierce:0,hitRefs:[]});
 q.step(.001);
 assert.equal(q.phase(),"win");
 assert.ok(q.impacts().some(i=>i.type==="bossBreak"));
 assert.ok(q.hitstop()>=.06,"boss defeat gives a stronger pause");
 assert.ok(vibrations.length>=2);
 for(let now=1016;now<=2016;now+=16)q.frame(now);
 assert.equal(q.impacts().length,0,"victory explosion must fade, not freeze on screen");
});
