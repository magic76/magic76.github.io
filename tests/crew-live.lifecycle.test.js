
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
