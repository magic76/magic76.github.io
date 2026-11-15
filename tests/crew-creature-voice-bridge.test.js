const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../web-spa/public/crew-creature-lab/voice-bridge.js'),'utf8');

function boot(pathname='/crew-creature-lab/'){
 const nodes=new Map(),listeners={},outgoing=[],turns=[],timers=new Map();
 const context={line:null,stage:0,energy:0,topic:'daily'};
 let frame=null,timerId=0;
 function node(id){
  if(!nodes.has(id))nodes.set(id,{id,hidden:false,disabled:false,textContent:'',handlers:{},
   addEventListener(type,fn){this.handlers[type]=fn},setAttribute(){},focus(){},scrollIntoView(){},
   appendChild(child){frame=child},remove(){this.removed=true}});
  return nodes.get(id);
 }
 node('energyText').textContent='能量 0 / 2';
 node('creatureName').textContent='神秘的蛋';
 node('evolveBtn').disabled=true;
 const document={getElementById:node,createElement(tag){
  assert.equal(tag,'iframe');
  const el={contentWindow:{postMessage:(msg,origin)=>outgoing.push({msg,origin})},remove(){this.removed=true}};
  return el;
 }};
 const window={crypto:{randomUUID:()=> 'test-channel'},addEventListener:(type,fn)=>{listeners[type]=fn}};
 const clock={setTimeout(fn){const id=++timerId;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)}};
 vm.runInNewContext(source,{window,document,location:{origin:'https://crew.test',pathname},...clock,Uint8Array});
 let evolves=0;
 const bridge=window.CrewCreatureVoice.mount({getContext:()=>context,recordTurn:input=>turns.push(input),evolve:()=>{evolves++}});
 const send=(msg,opts={})=>listeners.message({origin:opts.origin??'https://crew.test',source:opts.source??frame.contentWindow,data:msg});
 return {node,bridge,send,outgoing,turns,timers,get frame(){return frame},get evolves(){return evolves}};
}

test('voice frame starts on click and only trusts the current frame and channel',()=>{
 const h=boot();
 assert.equal(h.frame,null);
 h.node('openVoice').handlers.click();
 assert.equal(h.frame.allow,'microphone');
 assert.match(h.frame.src,/from=creature&embed=1/);
 h.send({type:'CREW_CREATURE_VOICE_READY'},{origin:'https://other.test'});
 h.send({type:'CREW_CREATURE_VOICE_READY'},{source:{}});
 assert.equal(h.outgoing.length,0);
 h.send({type:'CREW_CREATURE_VOICE_READY'});
 assert.equal(h.outgoing[0].msg.type,'CREW_CREATURE_VOICE_CONTEXT');
 assert.equal(h.outgoing[0].msg.channelId,'test-channel');
 for(const msg of [
  {type:'CREW_CREATURE_VOICE_TURN',channelId:'wrong',turnId:'1',input:'hi',output:'hello'},
  {type:'CREW_CREATURE_VOICE_TURN',channelId:'test-channel',turnId:'2',input:'hi',output:''},
  {type:'CREW_CREATURE_VOICE_TURN',channelId:'test-channel',turnId:'bad id',input:'hi',output:'hello'}
 ])h.send(msg);
 assert.equal(h.turns.length,0);
 const turn={type:'CREW_CREATURE_VOICE_TURN',channelId:'test-channel',turnId:'turn-1',input:'看海',output:'好'};
 h.send(turn);h.send(turn);
 h.send({...turn,turnId:'turn-2'});
 assert.deepEqual(h.turns,['看海','看海']);
});

test('changing a creature waits for the voice session to stop and accepts its last completed turn',()=>{
 const h=boot();h.node('openVoice').handlers.click();h.send({type:'CREW_CREATURE_VOICE_READY'});
 let switched=0;h.bridge.afterStop(()=>{switched++});
 assert.equal(switched,0);
 assert.equal(h.frame.removed,undefined);
 assert.equal(h.outgoing.at(-1).msg.type,'CREW_CREATURE_VOICE_STOP');
 h.send({type:'CREW_CREATURE_VOICE_TURN',channelId:'test-channel',turnId:'last',input:'再見',output:'下次見'});
 assert.deepEqual(h.turns,['再見']);
 h.send({type:'CREW_CREATURE_VOICE_STOPPED',channelId:'other'});
 assert.equal(switched,0);
 h.send({type:'CREW_CREATURE_VOICE_STOPPED',channelId:'test-channel'});
 assert.equal(switched,1);
 assert.equal(h.frame.removed,true);
 h.send({type:'CREW_CREATURE_VOICE_TURN',channelId:'test-channel',turnId:'late',input:'hi',output:'hello'});
 assert.equal(h.turns.length,1);
});

test('stop has a bounded fallback if the child never acknowledges',()=>{
 const h=boot();h.node('openVoice').handlers.click();
 let switched=0;h.bridge.afterStop(()=>{switched++});
 const timeout=[...h.timers.values()].at(-1);timeout();
 assert.equal(switched,1);
 assert.equal(h.frame.removed,true);
});

test('legacy crew-app opens the friend route in its HashRouter',()=>{
 const h=boot('/crew-app/crew-creature-lab/');
 h.node('openVoice').handlers.click();
 assert.equal(h.frame.src,'/crew-app/#/friend/live?id=zoe&from=creature&embed=1');
});
