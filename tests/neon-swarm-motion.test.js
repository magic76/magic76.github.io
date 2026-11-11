const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");

const html=fs.readFileSync(path.join(__dirname,"../web-spa/public/neon-swarm-lab/index.html"),"utf8");
const body=html.split("<script>")[1]?.split("</script>")[0];

test("Neon Swarm playtest loads only same-origin sprite assets and keeps the fallback rig",()=>{
 assert.match(html,/<meta name="robots" content="noindex, nofollow"/);
 assert.match(html,/function drawMotionLeg\(/);
 assert.match(html,/function drawHeroPose\(/);
 assert.match(html,/heroUpper\.src='data:image\/webp;base64/);
 assert.match(html,/heroHair\.src='data:image\/webp;base64/);
 assert.match(html,/function updateHeroAnimation\(/);
 assert.match(html,/heroAction:animationAction\(player\)/);
 assert.deepEqual([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(x=>x[1]),["/neon-swarm-lab/hero-sprites.js"]);
 assert.doesNotMatch(html,/fetch\(|XMLHttpRequest|navigator\.sendBeacon|WebSocket\(/);
 assert.ok(body?.length>70000);
});

test("character animation transitions through idle, running, firing, dash, hit, death and victory",()=>{
 const listeners={},elements=new Map();let frameCb=()=>{},time=1000;
 const gradient=()=>({addColorStop(){}});
 const ctx=new Proxy({},{get:(t,k)=>t[k]??(["createLinearGradient","createRadialGradient"].includes(String(k))?gradient:()=>{}),set:(t,k,v)=>{t[k]=v;return true}});
 const elt=(id="")=>({
  id,hidden:false,style:{},textContent:"",innerHTML:"",
  classList:{add(){},remove(){},toggle(){}},
  getContext:()=>ctx,getBoundingClientRect:()=>({x:0,y:0,width:390,height:530,left:0,top:0}),
  addEventListener(ev,fn){(listeners[id+":"+ev]??=[]).push(fn)},
  setPointerCapture(){},append(){},cloneNode(){return elt("clone")},
  querySelector:()=>elt("child"),insertAdjacentHTML(){}
 });
 const el=id=>{if(!elements.has(id))elements.set(id,elt(id));return elements.get(id)};
 const W={addEventListener(ev,fn){(listeners["window:"+ev]??=[]).push(fn)},requestAnimationFrame(fn){frameCb=fn;return 1}};
 W.parent=W;
 const d={getElementById:el,createElement:()=>elt("canvas"),querySelector:()=>elt("avatar"),querySelectorAll:()=>[],addEventListener(){}};
 const C={
  window:W,document:d,ResizeObserver:class{observe(){}},
  Image:class{complete=true;naturalWidth=220;set src(v){this._src=v}},
  URLSearchParams,location:{search:"",origin:"http://localhost"},devicePixelRatio:1,
  performance:{now:()=>time},requestAnimationFrame(fn){frameCb=fn;return 1},
  setTimeout(){return 1},clearTimeout(){},Math,console,Number,String,Array,Set,Map
 };
 vm.createContext(C);
 const injected=body.replace("prepareFloor();reset();last=performance.now();raf=requestAnimationFrame(frame);",
  "window.__TEST__={harm,end,clearInv:()=>{player.inv=0}};prepareFloor();reset();last=performance.now();raf=requestAnimationFrame(frame);");
 assert.notEqual(injected,body,"QA harness must find the exact engine initialization");
 vm.runInContext(injected,C,{timeout:10000});
 const state=()=>W.__NEON_STATE__;
 const tick=n=>{for(let i=0;i<n;i++){time+=16.667;frameCb(time)}};
 const key=(type,k)=>{for(const cb of listeners["window:"+type]||[])cb({key:k,repeat:false,preventDefault(){}})};
 assert.equal(state().heroAction,"idle");
 el("start").onclick();tick(4);assert.equal(state().heroAction,"fire");
 key("keydown","d");tick(19);assert.equal(state().heroAction,"run");assert.ok(state().heroGait>1);
 key("keydown"," ");tick(4);assert.equal(state().heroAction,"dash");
 key("keyup"," ");key("keyup","d");tick(30);
 W.__TEST__.clearInv();W.__TEST__.harm(14);tick(1);assert.equal(state().heroAction,"hit");
 W.__TEST__.end(false);tick(23);assert.equal(state().heroAction,"death");assert.ok(state().heroDeathPose>.3);
 el("start").onclick();W.__TEST__.end(true);tick(10);
 assert.equal(state().heroAction,"victory");assert.ok(state().heroVictoryPose>.3);
});
