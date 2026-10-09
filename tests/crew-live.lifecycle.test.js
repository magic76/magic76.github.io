
const test=require("node:test");
const assert=require("node:assert/strict");

if(typeof globalThis.btoa!=="function"){
  globalThis.btoa=(value)=>Buffer.from(value,"binary").toString("base64");
  globalThis.atob=(value)=>Buffer.from(value,"base64").toString("binary");
}

const CrewLive=require("../crew-live.js");

function wait(ms=0){return new Promise(resolve=>setTimeout(resolve,ms));}

class MockWebSocket{
  static instances=[];
  static OPEN=1;
  constructor(url){
    this.url=url;
    this.readyState=0;
    this.sent=[];
    this.onopen=null;
    this.onmessage=null;
    this.onerror=null;
    this.onclose=null;
    MockWebSocket.instances.push(this);
  }
  send(value){this.sent.push(JSON.parse(value));return true;}
  close(code=1000,reason=""){this.clientClose={code,reason};this.readyState=3;}
  open(){this.readyState=1;if(this.onopen)this.onopen();}
  message(value){if(this.onmessage)this.onmessage({data:JSON.stringify(value)});}
  binaryMessage(value){
    if(!this.onmessage)return;
    const bytes=Buffer.from(JSON.stringify(value),"utf8");
    const arrayBuffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
    this.onmessage({data:arrayBuffer});
  }
  error(){if(this.onerror)this.onerror({});}
  serverClose(code=1000,reason="",wasClean=true){
    this.readyState=3;
    if(this.onclose)this.onclose({code,reason,wasClean});
  }
}

class FakeAudioContext{
  constructor(){
    this.started=Date.now();
    this.sampleRate=48000;
    this.destination={};
  }
  get currentTime(){return (Date.now()-this.started)/1000;}
  async resume(){}
  async close(){}
  createGain(){return {gain:{value:1},connect(){},disconnect(){}};}
  createMediaStreamSource(){return {connect(){},disconnect(){}};}
  createScriptProcessor(){return {onaudioprocess:null,connect(){},disconnect(){}};}
  createBuffer(channels,samples,rate){
    return {duration:samples/rate,copyToChannel(){}};
  }
  createBufferSource(){
    const source={
      buffer:null,
      onended:null,
      connect(){},
      stop(){if(source.onended)source.onended();},
      start(){setTimeout(()=>{if(source.onended)source.onended();},40);}
    };
    return source;
  }
}

function makeDeps(logs){
  const track={stopped:false,stop(){this.stopped=true;}};
  const stream={getTracks(){return [track];}};
  return {
    track,
    deps:{
      WebSocket:MockWebSocket,
      getKey:()=>"test-key",
      getUserMedia:async()=>stream,
      createAudioContext:()=>new FakeAudioContext(),
      logger:{info:(label,data)=>logs.push({label,data})}
    }
  };
}

function resetSockets(){MockWebSocket.instances.length=0;}

async function waitForSocket(index){
  for(let i=0;i<40;i++){
    if(MockWebSocket.instances[index])return MockWebSocket.instances[index];
    await wait(2);
  }
  throw new Error("socket "+index+" was not created");
}

test("old socket late close cannot overwrite active fallback socket",async()=>{
  resetSockets();
  const logs=[],errors=[];
  const {deps}=makeDeps(logs);
  const session=new CrewLive.Session({
    models:["m1","m2"],maxLiveAttempts:2,connectTimeoutMs:100,
    deps,onError:e=>errors.push(e.message)
  });

  const starting=session.start();
  const first=await waitForSocket(0);
  first.open();
  first.error();

  const second=await waitForSocket(1);
  second.open();
  second.message({setupComplete:{}});
  await starting;

  assert.equal(session.model,"m2");
  assert.equal(session.ready,true);

  first.serverClose(1000,"late close",true);
  await wait(5);

  assert.equal(session.model,"m2");
  assert.equal(session.ready,true);
  assert.equal(session.ws,second);
  assert.deepEqual(errors,[]);

  await session.stop({silentStatus:true,emitTerminal:false});
});

test("setup error rejects immediately and redacts secrets",async()=>{
  resetSockets();
  const logs=[];
  const {deps,track}=makeDeps(logs);
  const session=new CrewLive.Session({
    models:["m1"],maxLiveAttempts:1,connectTimeoutMs:100,deps
  });

  const starting=session.start();
  const socket=await waitForSocket(0);
  socket.open();
  socket.message({
    error:{
      code:400,
      status:"INVALID_ARGUMENT",
      message:"bad key AIza1234567890abcdefghijklmnop at wss://example.test/live?key=super-secret"
    }
  });

  await assert.rejects(starting,error=>{
    assert.match(error.message,/INVALID_ARGUMENT/);
    assert.doesNotMatch(error.message,/AIza123/);
    assert.doesNotMatch(error.message,/super-secret/);
    return true;
  });

  assert.equal(session.running,false);
  assert.equal(session.ready,false);
  assert.equal(track.stopped,true);
});

test("setup complete then no reply plus 1000 is not success",async()=>{
  resetSockets();
  const logs=[],errors=[],turns=[];
  const {deps}=makeDeps(logs);
  const session=new CrewLive.Session({
    models:["m1"],maxLiveAttempts:1,connectTimeoutMs:100,deps,
    onError:e=>errors.push(e.message),
    onTurnComplete:turn=>turns.push(turn)
  });

  const starting=session.start();
  const socket=await waitForSocket(0);
  socket.open();
  socket.message({setupComplete:{}});
  await starting;

  socket.serverClose(1000,"server ended",true);
  await wait(20);

  assert.equal(turns.length,0);
  assert.equal(errors.length,1);
  assert.match(errors[0],/ended before a valid reply/);
  assert.equal(session.running,false);
  assert.equal(session.ready,false);

  const closeLog=logs.find(x=>x.data&&x.data.classification==="server-early");
  assert.ok(closeLog);
  assert.equal(closeLog.data.code,1000);
});

test("normal voice test succeeds only after valid output and playback drain",async()=>{
  resetSockets();
  const logs=[];
  const {deps,track}=makeDeps(logs);
  let successResolve;
  const success=new Promise(resolve=>{successResolve=resolve;});
  let observedOutput="";
  let session;

  session=new CrewLive.Session({
    models:["m1"],maxLiveAttempts:1,connectTimeoutMs:100,replyTimeoutMs:250,deps,
    openingPrompt:"say test",
    onTurnComplete:async turn=>{
      if(!turn.hasValidOutput)return;
      observedOutput=turn.output;
      await session.waitForPlaybackDrain(1000);
      await session.stop({
        reason:"test-complete",
        silentStatus:true,
        emitTerminal:false,
        emitState:false
      });
      successResolve();
    }
  });

  const starting=session.start();
  const socket=await waitForSocket(0);
  socket.open();
  socket.message({setupComplete:{}});
  await starting;

  const pcm=Buffer.alloc(4800).toString("base64");
  socket.message({
    serverContent:{
      outputTranscription:{text:"Live 連線成功"},
      modelTurn:{parts:[{inlineData:{mimeType:"audio/pcm;rate=24000",data:pcm}}]},
      turnComplete:true
    }
  });

  await success;

  assert.equal(observedOutput,"Live 連線成功");
  assert.equal(session.running,false);
  assert.equal(track.stopped,true);
});

test("turnComplete does not imply local playback is already drained",async()=>{
  resetSockets();
  const logs=[];
  const {deps}=makeDeps(logs);
  let pendingAtTurn=false;
  const session=new CrewLive.Session({
    models:["m1"],maxLiveAttempts:1,connectTimeoutMs:100,deps,
    onTurnComplete:()=>{pendingAtTurn=session.hasPendingPlayback();}
  });

  const starting=session.start();
  const socket=await waitForSocket(0);
  socket.open();
  socket.message({setupComplete:{}});
  await starting;

  const pcm=Buffer.alloc(9600).toString("base64");
  socket.message({
    serverContent:{
      modelTurn:{parts:[{inlineData:{mimeType:"audio/pcm;rate=24000",data:pcm}}]},
      turnComplete:true
    }
  });

  assert.equal(pendingAtTurn,true);
  await session.waitForPlaybackDrain(1000);
  assert.equal(session.hasPendingPlayback(),false);

  await session.stop({silentStatus:true,emitTerminal:false});
});

test("fallback second socket keeps its own setup timeout",async()=>{
  resetSockets();
  const logs=[];
  const {deps}=makeDeps(logs);
  const session=new CrewLive.Session({
    models:["m1","m2"],maxLiveAttempts:2,connectTimeoutMs:100,deps
  });

  const starting=session.start();
  const first=await waitForSocket(0);
  first.open();
  first.serverClose(1006,"first failed",false);

  const second=await waitForSocket(1);
  second.open();

  await assert.rejects(starting,error=>{
    assert.match(error.message,/m2 setup timeout/);
    return true;
  });

  assert.equal(MockWebSocket.instances.length,2);
  assert.equal(session.running,false);
  assert.equal(session.ready,false);
});


test("default handshake matches Crew Teacher v1alpha path and model priority",async()=>{
  resetSockets();
  const logs=[];
  const {deps}=makeDeps(logs);
  const session=new CrewLive.Session({
    maxLiveAttempts:1,
    connectTimeoutMs:100,
    deps
  });

  const starting=session.start();
  const socket=await waitForSocket(0);

  assert.match(socket.url,/google\.ai\.generativelanguage\.v1alpha\.GenerativeService\.BidiGenerateContent/);
  assert.doesNotMatch(socket.url,/v1beta/);

  socket.open();

  const setup=socket.sent[0].setup;
  assert.equal(setup.model,"models/gemini-3.1-flash-live-preview");
  assert.deepEqual(setup.generationConfig.responseModalities,["AUDIO"]);
  assert.deepEqual(setup.contextWindowCompression,{slidingWindow:{}});
  assert.deepEqual(setup.sessionResumption,{});
  assert.deepEqual(setup.inputAudioTranscription,{});
  assert.deepEqual(setup.outputAudioTranscription,{});
  assert.equal("realtimeInputConfig" in setup,false);

  socket.message({setupComplete:{}});
  await starting;

  assert.equal(session.model,"gemini-3.1-flash-live-preview");
  assert.equal(session.ready,true);

  await session.stop({silentStatus:true,emitTerminal:false});
});

test("binary setupComplete frame is decoded instead of timing out",async()=>{
  resetSockets();
  const logs=[];
  const {deps}=makeDeps(logs);
  const session=new CrewLive.Session({
    models:["gemini-3.1-flash-live-preview"],
    maxLiveAttempts:1,
    connectTimeoutMs:100,
    deps
  });

  const starting=session.start();
  const socket=await waitForSocket(0);
  socket.open();
  socket.binaryMessage({setupComplete:{}});

  await starting;

  assert.equal(session.ready,true);
  assert.equal(session.model,"gemini-3.1-flash-live-preview");

  await session.stop({silentStatus:true,emitTerminal:false});
});


test("GoAway resumes same Live model with session handle",async()=>{
  resetSockets();
  const logs=[],resumed=[];
  const {deps}=makeDeps(logs);
  const session=new CrewLive.Session({
    models:["gemini-3.1-flash-live-preview","gemini-3.8-live"],
    maxLiveAttempts:2,
    maxResumeAttempts:2,
    connectTimeoutMs:100,
    deps,
    onResumed:info=>resumed.push(info)
  });

  const starting=session.start();
  const first=await waitForSocket(0);
  first.open();
  first.message({setupComplete:{}});
  await starting;

  first.message({
    sessionResumptionUpdate:{
      resumable:true,
      newHandle:"resume-123"
    }
  });
  first.message({goAway:{timeLeft:"5s"}});

  const second=await waitForSocket(1);
  second.open();

  const setup=second.sent[0].setup;
  assert.equal(setup.model,"models/gemini-3.1-flash-live-preview");
  assert.deepEqual(setup.sessionResumption,{handle:"resume-123"});

  second.message({setupComplete:{}});
  await wait(5);

  assert.equal(session.ready,true);
  assert.equal(session.model,"gemini-3.1-flash-live-preview");
  assert.equal(session.resumeAttempts,1);
  assert.equal(resumed.length,1);

  await session.stop({silentStatus:true,emitTerminal:false});
});

test("mic mute volume interrupt and transcript controls stay inside active Live session",async()=>{
  resetSockets();
  const logs=[];
  const {deps,track}=makeDeps(logs);
  const turns=[];
  const session=new CrewLive.Session({
    models:["m1"],
    maxLiveAttempts:1,
    connectTimeoutMs:100,
    deps,
    onTranscriptTurn:turn=>turns.push(turn)
  });

  const starting=session.start();
  const socket=await waitForSocket(0);
  socket.open();
  socket.message({setupComplete:{}});
  await starting;

  assert.equal(session.setVolume(35),35);
  assert.equal(session.outputGain.gain.value,0.35);

  assert.equal(session.setMicMuted(true),true);
  assert.equal(track.enabled,false);
  assert.equal(session.toggleMic(),false);
  assert.equal(track.enabled,true);

  const pcm=Buffer.alloc(2400).toString("base64");
  socket.message({serverContent:{modelTurn:{parts:[{inlineData:{mimeType:"audio/pcm;rate=24000",data:pcm}}]}}});
  assert.equal(session.interrupt(),true);
  const interruptMessage=socket.sent.find(item=>item.clientContent?.turns?.[0]?.parts?.[0]?.text?.includes("[INTERRUPT CONTROL]"));
  assert.ok(interruptMessage);
  assert.equal(interruptMessage.clientContent.turnComplete,true);
  socket.message({serverContent:{interrupted:true}});
  socket.message({serverContent:{turnComplete:true}});
  socket.message({serverContent:{inputTranscription:{text:"你好"}}});
  socket.message({serverContent:{
    outputTranscription:{text:"你好，很高興見到你"},
    turnComplete:false
  }});
  socket.message({serverContent:{turnComplete:true}});

  assert.equal(turns.length,1);
  assert.equal(session.getTranscript().length,1);
  assert.equal(session.getTranscript()[0].input,"你好");
  assert.equal(session.getTranscript()[0].output,"你好，很高興見到你");
  assert.ok(session.getDurationMs()>=0);

  await session.stop({silentStatus:true,emitTerminal:false});
});


test("still image and prompt are sent together as the newest Gemini Live realtime input",async()=>{
  resetSockets();
  const logs=[];
  const {deps}=makeDeps(logs);
  const vision=[];
  const session=new CrewLive.Session({
    models:["m1"],
    maxLiveAttempts:1,
    connectTimeoutMs:100,
    deps,
    onVisionSent:info=>vision.push(info)
  });

  const starting=session.start();
  const socket=await waitForSocket(0);
  socket.open();
  socket.message({setupComplete:{}});
  await starting;

  const ok=session.sendImage(
    {data:"YWJj",mimeType:"image/jpeg"},
    {prompt:"請看這張圖並問我一個問題。"}
  );

  assert.equal(ok,true);

  const message=socket.sent.find(item=>item.realtimeInput&&item.realtimeInput.video&&item.realtimeInput.text);
  assert.ok(message);
  assert.equal(message.realtimeInput.video.data,"YWJj");
  assert.equal(message.realtimeInput.video.mimeType,"image/jpeg");
  assert.match(message.realtimeInput.text,/\[NEW PHOTO 1\]/);
  assert.match(message.realtimeInput.text,/Ignore all earlier photos/);
  assert.match(message.realtimeInput.text,/請看這張圖並問我一個問題。/);
  assert.equal(socket.sent.some(item=>item.clientContent&&JSON.stringify(item.clientContent).includes("請看這張圖並問我一個問題。")),false);
  assert.equal(vision.length,1);
  assert.equal(vision[0].seq,1);
  assert.equal(vision[0].mimeType,"image/jpeg");

  await session.stop({silentStatus:true,emitTerminal:false});
});

test("data URL image input is normalized before Live send",async()=>{
  resetSockets();
  const logs=[];
  const {deps}=makeDeps(logs);
  const session=new CrewLive.Session({
    models:["m1"],
    maxLiveAttempts:1,
    connectTimeoutMs:100,
    deps
  });

  const starting=session.start();
  const socket=await waitForSocket(0);
  socket.open();
  socket.message({setupComplete:{}});
  await starting;

  assert.equal(session.sendImage("data:image/png;base64,eHl6"),true);
  const videoMessage=socket.sent.find(item=>item.realtimeInput&&item.realtimeInput.video);
  assert.equal(videoMessage.realtimeInput.video.data,"eHl6");
  assert.equal(videoMessage.realtimeInput.video.mimeType,"image/png");

  assert.equal(session.sendImage({data:"abc",mimeType:"application/pdf"}),false);

  await session.stop({silentStatus:true,emitTerminal:false});
});


test("Android-safe startup opens mic before warm output worklet and queues first audio there",async()=>{
  resetSockets();
  const order=[];
  const track={stopped:false,stop(){this.stopped=true;}};
  const stream={getTracks(){return [track];}};
  let context=null,node=null;

  class WarmAudioContext extends FakeAudioContext{
    constructor(){
      super();
      this.bufferSourceCalls=0;
      this.audioWorklet={
        addModule:async url=>{order.push("worklet:"+url);}
      };
    }
    createBufferSource(){
      this.bufferSourceCalls++;
      return super.createBufferSource();
    }
  }

  class FakeWorkletNode{
    constructor(){
      this.connected=false;
      this.messages=[];
      const self=this;
      this.port={
        onmessage:null,
        postMessage(message){
          self.messages.push(message);
          if(message.type==="output"){
            if(self.port.onmessage)self.port.onmessage({data:{type:"queue-state",samples:4800}});
            if(self.port.onmessage)self.port.onmessage({data:{type:"output-started"}});
          }
          if(message.type==="turn-complete"){
            setTimeout(()=>{
              if(self.port.onmessage)self.port.onmessage({data:{type:"output-drained"}});
            },15);
          }
          if(message.type==="clear-output"){
            if(self.port.onmessage)self.port.onmessage({data:{type:"output-drained"}});
          }
        }
      };
    }
    connect(){this.connected=true;}
    disconnect(){this.connected=false;}
  }

  const session=new CrewLive.Session({
    models:["m1"],
    maxLiveAttempts:1,
    connectTimeoutMs:100,
    deps:{
      WebSocket:MockWebSocket,
      getKey:()=>"test-key",
      getUserMedia:async()=>{order.push("mic");return stream;},
      createAudioContext:()=>{order.push("audio-context");context=new WarmAudioContext();return context;},
      createAudioWorkletNode:()=>{node=new FakeWorkletNode();return node;},
      logger:{info(){}}
    }
  });

  const starting=session.start();
  const socket=await waitForSocket(0);
  socket.open();
  socket.message({setupComplete:{}});
  await starting;

  assert.equal(order[0],"mic");
  assert.equal(order[1],"audio-context");
  assert.match(order[2],/^worklet:/);
  assert.equal(session.outputWorkletReady,true);
  assert.equal(node.connected,true);

  const pcm=Buffer.alloc(4800).toString("base64");
  socket.message({
    serverContent:{
      modelTurn:{parts:[{inlineData:{mimeType:"audio/pcm;rate=24000",data:pcm}}]},
      turnComplete:true
    }
  });

  const output=node.messages.find(message=>message.type==="output");
  assert.ok(output);
  assert.equal(output.sampleRate,24000);
  assert.equal(context.bufferSourceCalls,0);
  assert.equal(session.hasPendingPlayback(),true);

  await session.waitForPlaybackDrain(500);
  assert.equal(session.hasPendingPlayback(),false);

  await session.stop({silentStatus:true,emitTerminal:false});
  assert.equal(track.stopped,true);
});


test("browser Live socket requests ordered ArrayBuffer binary frames",async()=>{
  resetSockets();
  const logs=[];
  const {deps}=makeDeps(logs);
  const session=new CrewLive.Session({
    models:["m1"],maxLiveAttempts:1,connectTimeoutMs:100,deps
  });

  const starting=session.start();
  const socket=await waitForSocket(0);
  assert.equal(socket.binaryType,"arraybuffer");
  socket.open();
  socket.message({setupComplete:{}});
  await starting;
  await session.stop({silentStatus:true,emitTerminal:false});
});

test("first Gemini PCM resumes a transiently suspended Android output context",async()=>{
  resetSockets();
  const logs=[];
  const track={stopped:false,stop(){this.stopped=true;}};
  const stream={getTracks(){return [track];}};
  let context=null;

  class SuspendedAudioContext extends FakeAudioContext{
    constructor(){
      super();
      this.state="running";
      this.resumeCalls=0;
    }
    async resume(){
      this.resumeCalls++;
      this.state="running";
    }
  }

  const session=new CrewLive.Session({
    models:["m1"],
    maxLiveAttempts:1,
    connectTimeoutMs:100,
    deps:{
      WebSocket:MockWebSocket,
      getKey:()=>"test-key",
      getUserMedia:async()=>stream,
      createAudioContext:()=>{context=new SuspendedAudioContext();return context;},
      logger:{info:(label,data)=>logs.push({label,data})}
    }
  });

  const starting=session.start();
  const socket=await waitForSocket(0);
  socket.open();
  socket.message({setupComplete:{}});
  await starting;

  const before=context.resumeCalls;
  context.state="suspended";

  const pcm=Buffer.alloc(4800).toString("base64");
  socket.message({
    serverContent:{
      modelTurn:{parts:[{inlineData:{mimeType:"audio/pcm;rate=24000",data:pcm}}]}
    }
  });
  await wait(0);

  assert.equal(context.state,"running");
  assert.equal(context.resumeCalls,before+1);

  await session.stop({silentStatus:true,emitTerminal:false});
});

test("output worklet prebuffers 120ms before the first spoken audio",()=>{
  const fs=require("node:fs");
  const path=require("node:path");
  const source=fs.readFileSync(path.resolve(__dirname,"../crew-live-output-worklet.js"),"utf8");
  assert.match(source,/sampleRate\*0\.12/);
});


test("teacher playback ignores mic noise until explicit interrupt button",async()=>{
  resetSockets();
  const logs=[];
  const {deps}=makeDeps(logs);
  const session=new CrewLive.Session({
    models:["m1"],
    maxLiveAttempts:1,
    connectTimeoutMs:100,
    deps
  });

  const starting=session.start();
  const socket=await waitForSocket(0);
  socket.open();
  socket.message({setupComplete:{}});
  await starting;

  const pcm=Buffer.alloc(2400).toString("base64");
  socket.message({
    serverContent:{
      modelTurn:{parts:[{inlineData:{mimeType:"audio/pcm;rate=24000",data:pcm}}]}
    }
  });
  assert.equal(session.modelSpeaking,true);

  const beforeNoise=socket.sent.length;
  session.processor.onaudioprocess({
    inputBuffer:{getChannelData(){return new Float32Array(2048).fill(0.2)}}
  });
  assert.equal(socket.sent.length,beforeNoise,"mic frames must be suppressed while teacher audio is playing");

  assert.equal(session.interrupt(),true);
  assert.equal(session.modelSpeaking,false);
  const afterInterrupt=socket.sent.length;

  session.processor.onaudioprocess({
    inputBuffer:{getChannelData(){return new Float32Array(2048).fill(0.2)}}
  });
  assert.equal(socket.sent.length,afterInterrupt+1,"mic frames resume only after explicit interrupt");

  await session.stop({silentStatus:true,emitTerminal:false});
});


test("proactive opening is sent only once across fallback reconnects",async()=>{
  resetSockets();
  const logs=[];
  const {deps}=makeDeps(logs);
  const session=new CrewLive.Session({
    models:["m1","m2"],
    maxLiveAttempts:2,
    connectTimeoutMs:100,
    openingPrompt:"start this session once",
    deps
  });

  const starting=session.start();
  const first=await waitForSocket(0);
  first.open();
  first.message({setupComplete:{}});
  await starting;

  const firstOpenings=first.sent.filter(item=>
    item.clientContent&&
    item.clientContent.turns&&
    item.clientContent.turns[0]?.parts?.[0]?.text==="start this session once"
  );
  assert.equal(firstOpenings.length,1);

  first.message({error:{code:500,status:"INTERNAL",message:"retry another candidate"}});

  const second=await waitForSocket(1);
  second.open();
  second.message({setupComplete:{}});
  await wait(10);

  const secondOpenings=second.sent.filter(item=>
    item.clientContent&&
    item.clientContent.turns&&
    item.clientContent.turns[0]?.parts?.[0]?.text==="start this session once"
  );
  assert.equal(secondOpenings.length,0,"fallback reconnect must not restart the tutor greeting");
  assert.equal(session.openingSent,true);

  await session.stop({silentStatus:true,emitTerminal:false});
});


test("manual interrupt cancels the server turn and rejects late audio until new user speech",async()=>{
  resetSockets();
  const logs=[],speaking=[],outputs=[],completed=[];
  const {deps}=makeDeps(logs);
  const session=new CrewLive.Session({
    models:["m1"],maxLiveAttempts:1,connectTimeoutMs:100,deps,
    onSpeaking:v=>speaking.push(v),
    onOutputTranscript:v=>outputs.push(v),
    onTurnComplete:t=>completed.push(t)
  });
  const starting=session.start();
  const socket=await waitForSocket(0);
  socket.open();
  socket.message({setupComplete:{}});
  await starting;

  const pcm=Buffer.alloc(4800).toString("base64");
  const audio=()=>({modelTurn:{parts:[{inlineData:{mimeType:"audio/pcm;rate=24000",data:pcm}}]}});
  socket.message({serverContent:audio()});
  assert.equal(session.modelSpeaking,true);
  assert.equal(session.interrupt(),true);
  assert.equal(session.modelSpeaking,false);
  assert.equal(session.hasPendingPlayback(),false);
  assert.equal(session.interrupt(),true,"repeat tap should not send another control");

  const controls=socket.sent.filter(x=>x.clientContent?.turns?.[0]?.parts?.[0]?.text?.includes("[INTERRUPT CONTROL]"));
  assert.equal(controls.length,1);
  assert.equal(controls[0].clientContent.turnComplete,true);
  assert.equal(socket.sent.filter(x=>x.realtimeInput?.audio).length,0,"do not synthesize silence instead of real interrupt");

  socket.message({serverContent:{...audio(),outputTranscription:{text:"Stale speech"}}});
  assert.equal(session.modelSpeaking,false);
  assert.equal(session.hasPendingPlayback(),false);
  assert.deepEqual(outputs,[]);

  socket.message({serverContent:{interrupted:true}});
  socket.message({serverContent:{...audio(),outputTranscription:{text:"Still stale"}}});
  socket.message({serverContent:{turnComplete:true}});
  assert.equal(session.modelSpeaking,false);
  assert.deepEqual(completed,[],"canceled answer must not enter saved history");
  assert.deepEqual(outputs,[],"canceled transcripts must not be displayed");

  socket.message({serverContent:{inputTranscription:{text:"Tell me about the next period."}}});
  socket.message({serverContent:audio()});
  assert.equal(session.modelSpeaking,true,"new real question must unlock the next response");
  socket.message({serverContent:{outputTranscription:{text:"A fresh answer"},turnComplete:true}});
  assert.deepEqual(outputs,["A fresh answer"]);
  assert.equal(completed.length,1);
  assert.equal(completed[0].output,"A fresh answer");
  await session.stop({silentStatus:true,emitTerminal:false});
});

test("Fortune voice prompt avoids leading every reply with conclusion headers",()=>{
 const fs=require("node:fs");
 const path=require("node:path");
 const source=fs.readFileSync(path.resolve(__dirname,"../web-spa/src/fortune/LivePage.tsx"),"utf8");
 assert.ok(!source.includes("先講結論，再補"));
 assert.match(source,/不要以「結論」/);
 assert.match(source,/真人感語音對話/);
 assert.match(source,/\[INTERRUPT CONTROL\]/);
});


test("interrupt also accepts a new explicit preset question without voice transcription",async()=>{
  resetSockets();
  const {deps}=makeDeps([]);
  const spoken=[];
  const session=new CrewLive.Session({models:["m1"],maxLiveAttempts:1,connectTimeoutMs:100,deps,onSpeaking:v=>spoken.push(v)});
  const starting=session.start();
  const socket=await waitForSocket(0);
  socket.open();
  socket.message({setupComplete:{}});
  await starting;
  const pcm=Buffer.alloc(2400).toString("base64");
  const audio={modelTurn:{parts:[{inlineData:{mimeType:"audio/pcm;rate=24000",data:pcm}}]}};
  socket.message({serverContent:audio});
  assert.equal(session.interrupt(),true);
  socket.message({serverContent:{turnComplete:true}});
  assert.equal(session.interruptPending,true);
  assert.equal(session.sendText("請談財運"),true);
  assert.equal(session.interruptInputSeen,true);
  socket.message({serverContent:audio});
  assert.equal(session.interruptPending,false);
  assert.equal(session.modelSpeaking,true);
  await session.stop({silentStatus:true,emitTerminal:false});
});

test("late worklet output-started event cannot restart canceled teacher speech",async()=>{
  resetSockets();
  let node=null;
  class Context extends FakeAudioContext{
    constructor(){super();this.audioWorklet={addModule:async()=>{}};}
  }
  class Node{
    constructor(){
      this.port={onmessage:null,postMessage(){}};
    }
    connect(){}
    disconnect(){}
  }
  const {track,deps}=makeDeps([]);
  const spoken=[];
  deps.createAudioContext=()=>new Context();
  deps.createAudioWorkletNode=()=>{node=new Node();return node;};
  const session=new CrewLive.Session({models:["m1"],maxLiveAttempts:1,connectTimeoutMs:100,deps,onSpeaking:v=>spoken.push(v)});
  const starting=session.start();
  const socket=await waitForSocket(0);
  socket.open();
  socket.message({setupComplete:{}});
  await starting;
  const pcm=Buffer.alloc(2400).toString("base64");
  socket.message({serverContent:{modelTurn:{parts:[{inlineData:{mimeType:"audio/pcm;rate=24000",data:pcm}}]}}});
  assert.equal(session.interrupt(),true);
  node.port.onmessage({data:{type:"output-started"}});
  assert.equal(spoken.at(-1),false);
  assert.equal(session.hasPendingPlayback(),false);
  await session.stop({silentStatus:true,emitTerminal:false});
  assert.equal(track.stopped,true);
});
