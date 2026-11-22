const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const CrewLive=require("../crew-live.js");
const read=path=>fs.readFileSync(path,"utf8");
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test("unified friend keyboard and microphone reuse one Live socket and one transcript",async()=>{
 const sockets=[];
 let micRequests=0;
 class Socket{
  constructor(url){this.url=url;this.readyState=0;this.sent=[];sockets.push(this)}
  send(raw){this.sent.push(JSON.parse(raw))}
  open(){this.readyState=1;this.onopen?.()}
  message(raw){this.onmessage?.({data:JSON.stringify(raw)})}
  close(){this.readyState=3}
 }
 class AudioContext{
  constructor(){this.sampleRate=48000;this.destination={};this.currentTime=0}
  async resume(){}
  async close(){}
  createGain(){return {gain:{value:1},connect(){},disconnect(){}}}
  createMediaStreamSource(){return {connect(){},disconnect(){}}}
  createScriptProcessor(){return {connect(){},disconnect(){},onaudioprocess:null}}
  createBuffer(){return {duration:0.03,copyToChannel(){}}}
  createBufferSource(){return {connect(){},start(){},stop(){}}}
 }
 const turns=[];
 const live=new CrewLive.Session({
  textOnly:true,allowMicUpgrade:true,trackTextTurns:true,
  models:["gemini-3.8-live"],maxLiveAttempts:1,connectTimeoutMs:1000,
  deps:{
   WebSocket:Socket,getKey:()=>"test",
   getUserMedia:async()=>{
    micRequests++;
    return {getAudioTracks:()=>[{readyState:"live",stop(){}}],getTracks:()=>[{stop(){}}]};
   },
   createAudioContext:()=>new AudioContext(),
   logger:{info(){},warn(){}}
  },
  onTranscriptTurn:turn=>turns.push(turn)
 });
 const beginning=live.start();
 for(let i=0;i<50&&!sockets.length;i++)await wait(1);
 assert.equal(sockets.length,1);
 const socket=sockets[0];
 socket.open();socket.message({setupComplete:{}});
 await beginning;
 assert.equal(live.ready,true);
 assert.equal(micRequests,0,"text-first session must not request microphone");
 assert.equal(live.sendText("Hello from keyboard"),true);
 assert.equal(socket.sent.some(m=>m.clientContent?.turns?.[0]?.parts?.[0]?.text==="Hello from keyboard"),true);
 socket.message({serverContent:{modelTurn:{parts:[{text:"Hi from Zoe"}]},turnComplete:true}});
 assert.equal(turns.at(-1)?.input,"Hello from keyboard");
 assert.equal(turns.at(-1)?.output,"Hi from Zoe");
 await live.enableMicrophone();
 assert.equal(micRequests,1);
 assert.equal(sockets.length,1,"enable microphone must preserve the Live WS and transcript");
 assert.equal(live.textOnly,false);
 assert.equal(live.sendText("Second typed message"),true);
 socket.message({serverContent:{outputTranscription:{text:"Another reply"},turnComplete:true}});
 assert.equal(turns.length,2);
 assert.equal(turns[0].input,"Hello from keyboard");
 assert.equal(turns[1].input,"Second typed message");
 assert.equal(live.getTranscript().length,2);
 await live.stop();
});

test("friend route renders one composer and one shared caption timeline",()=>{
 const route=read("web-spa/src/friends/FriendLivePage.tsx");
 const friend=read("web-spa/src/friends/FriendLiveConversation.tsx");
 const composer=read("web-spa/src/friends/FriendUnifiedComposer.tsx");
 const bubble=read("web-spa/src/friends/FriendCallBubbleList.tsx");
 const style=read("web-spa/src/friends/friendUnifiedComposer.css");
 assert.match(route,/FriendLiveConversation/);
 assert.doesNotMatch(friend,/TextChatPanel|crew-chat-mode-switch/);
 assert.match(friend,/FriendCallCaptions name=\{friend\.name\} turns=\{live\.turns\}/);
 assert.match(friend,/<FriendUnifiedComposer live=\{live\}/);
 assert.match(friend,/focusOnMount=\{params\.get\("chat"\)==="text"\}/);
 assert.match(friend,/onTextGrant=\{async grant=>/);
 assert.match(friend,/useAuxiliaryLiveSession\(active,false\)/);
 assert.match(composer,/live\.start\(undefined,true\)/);
 assert.match(composer,/live\.sendText\(text\)/);
 assert.match(composer,/live\.enableMicrophone\(\)/);
 assert.match(bubble,/friend-bubble-user/);
 assert.match(bubble,/friend-bubble-ai/);
 assert.match(bubble,/\{renderTranslation\(turn\.output\.trim\(\),/);
 assert.match(bubble,/\{renderSuggestions\(turn\.index\)\}/);
 assert.match(style,/min-height:44px/);
 assert.match(style,/--crew-friend-viewport-height/);
 assert.match(style,/overflow-y:auto/);
 assert.match(style,/min-width:0/);
 for(const p of [
  "web-spa/src/friends/FriendLivePage.tsx",
  "web-spa/src/friends/FriendLiveConversation.tsx",
  "web-spa/src/friends/FriendUnifiedComposer.tsx",
 ])assert.ok(Buffer.byteLength(read(p))<26000,p);
});

test("guest 300 seconds remain one grant for either input without a microphone in text-first",()=>{
 const starter=read("web-spa/src/live/GuestLiveStarter.tsx");
 const hook=read("web-spa/src/live/useLiveSession.ts");
 const transport=read("crew-live.js");
 assert.match(starter,/if\(!textOnly\)\{/);
 assert.match(starter,/await \(textOnly&&onTextGrant\?onTextGrant:onGrant\)\(data\)/);
 assert.match(hook,/textOnly:textOnly&&configRef\.current\.sessionKind==="friend"/);
 assert.match(hook,/guestDeadlineRef\.current=performance\.now\(\)\+ms/);
 assert.match(hook,/Math\.min\(300000,/);
 assert.match(transport,/LiveSession\.prototype\.enableMicrophone/);
});
