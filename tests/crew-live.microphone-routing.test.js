const test=require("node:test");
const assert=require("node:assert/strict");
const CrewLive=require("../crew-live.js");

function createContext(){
  return {
    destination:{},sampleRate:48000,
    async resume(){},async close(){},
    createGain(){return {gain:{value:1},connect(){},disconnect(){}};}
  };
}

test("Live keeps the browser's default microphone and never forces a built-in device",async()=>{
  const events=[],requests=[];
  const track={
    enabled:true,stopped:false,
    getSettings:()=>({deviceId:"bluetooth-headset"}),
    stop(){this.stopped=true;}
  };
  const stream={getTracks:()=>[track],getAudioTracks:()=>[track]};
  let enumerations=0;
  const session=new CrewLive.Session({
    models:["mock"],
    deps:{
      getUserMedia:async constraints=>{
        events.push("microphone");
        requests.push(constraints);
        return stream;
      },
      // A headset and phone mic could both exist. Neither should be enumerated
      // or used to override the browser's selected input/output route.
      enumerateDevices:async()=>{
        enumerations++;
        return [
          {kind:"audioinput",deviceId:"bluetooth-headset",label:"Bluetooth Hands-Free"},
          {kind:"audioinput",deviceId:"phone",label:"Built-in Microphone"}
        ];
      },
      createAudioContext:()=>{
        events.push("playback");
        return createContext();
      }
    }
  });

  // Internal _openMedia is exercised as part of an active Live start.
  session.running=true;
  await session._openMedia();

  assert.deepEqual(events,["microphone","playback"]);
  assert.equal(requests.length,1,"opening Live must request microphone just once");
  assert.equal(enumerations,0,"device enumeration must not override the system route");
  assert.deepEqual(requests[0],{audio:{
    echoCancellation:true,
    noiseSuppression:true,
    autoGainControl:true,
    channelCount:1
  }},"default mic constraints must not include deviceId");
  assert.equal(session.mediaStream,stream,"keep the browser-selected Bluetooth stream");
  assert.equal(track.stopped,false,"do not close/reopen the chosen microphone");

  assert.equal(session.setMicMuted(true),true);
  assert.equal(track.enabled,true,"software mute keeps the device route open");
  assert.equal(requests.length,1);
  assert.equal(session.setMicMuted(false),false);
  assert.equal(track.enabled,true);
  assert.equal(requests.length,1);

  await session._cleanupMedia();
  assert.equal(track.stopped,true,"release the selected input when Live ends");
});

test("microphone denial fails without a second request or playback initialization",async()=>{
  const events=[];
  const session=new CrewLive.Session({
    models:["mock"],
    deps:{
      getUserMedia:async()=>{events.push("microphone");throw new Error("permission denied");},
      createAudioContext:()=>{events.push("playback");return createContext();}
    }
  });

  await assert.rejects(session._openMedia(),/permission denied/);
  assert.deepEqual(events,["microphone"]);
  assert.equal(session.mediaStream,null);
  assert.equal(session.outputContext,null);
});

test("a constrained microphone error retries once while keeping the OS-selected route",async()=>{
  const calls=[];
  const track={stopped:false,stop(){this.stopped=true;}};
  const stream={getTracks:()=>[track]};
  const session=new CrewLive.Session({models:["mock"],deps:{
    getUserMedia:async constraints=>{
      calls.push(constraints);
      if(calls.length===1){const error=new Error("unsupported");error.name="OverconstrainedError";throw error;}
      return stream;
    },
    createAudioContext:createContext
  }});
  session.running=true;
  await session._openMedia();
  assert.equal(calls.length,2);
  assert.deepEqual(calls[1],{audio:true});
  assert.equal(session.mediaStream,stream);
  await session._cleanupMedia();
  assert.equal(track.stopped,true);
});

for(const failure of [null,"autoplay","resume","resume timeout"]){
  const name=failure?`rebuilds the default graph after ${failure} fails`:"plays through the element";
  test(`separate capture ${name}`,async()=>{
    const contexts=[];
    const destination={};
    let microphoneRequests=0;
    let stopped=0;
    let closed=0;
    let sinkSwitches=0;
    const session=new CrewLive.Session({
      separateCaptureContext:true,
      createPlaybackRoute(context){
        assert.equal(context,contexts[0]);
        return {
          destination,
          ready:failure==="autoplay"?Promise.reject(new Error("blocked")):Promise.resolve(),
          close(){closed++;if(failure==="autoplay")throw new Error("close failed");}
        };
      },
      deps:{
        getUserMedia:async()=>{
          microphoneRequests++;
          return {getTracks:()=>[{stop(){stopped++;}}]};
        },
        setTimeout(fn,ms){return setTimeout(fn,ms===2000?10:ms);},
        createAudioContext(sinkId){
          const index=contexts.length;
          const outputs=new Set();
          const context={
            ...createContext(),sinkId,outputs,closed:false,
            async resume(){
              if(index===1&&failure==="resume")throw new Error("resume failed");
              if(index===1&&failure==="resume timeout")await new Promise(()=>{});
            },
            async setSinkId(){sinkSwitches++;throw new Error("switch failed");},
            async close(){this.closed=true;},
            createMediaStreamSource(){return {connect(){},disconnect(){}};},
            createScriptProcessor(){return {connect(){},disconnect(){}};},
            createGain(){
              return {
                gain:{value:1},
                connect(target){outputs.add(target);},
                disconnect(target){if(target)outputs.delete(target);else outputs.clear();}
              };
            }
          };
          contexts.push(context);
          return context;
        }
      }
    });
    session.running=true;
    await session._openMedia();
    assert.equal(microphoneRequests,1);
    assert.equal(stopped,0);
    assert.equal(sinkSwitches,0,"startup fallback must not rely on a sink switch");
    assert.deepEqual(contexts.slice(0,2).map(context=>context.sinkId),[{type:"none"},{type:"none"}]);
    if(failure){
      assert.equal(session.inputContext,contexts[2]);
      assert.equal(session.outputContext,contexts[2]);
      assert.equal(contexts[2].sinkId,undefined);
      assert.deepEqual([...contexts[2].outputs],[contexts[2].destination]);
      assert.ok(contexts.slice(0,2).every(context=>context.closed));
    }else{
      assert.equal(session.inputContext,contexts[1]);
      assert.equal(session.outputContext,contexts[0]);
      assert.ok(contexts[1].outputs.has(contexts[1].destination));
      assert.deepEqual([...contexts[0].outputs],[destination]);
    }
    await session.stop();
    assert.ok(contexts.every(context=>context.closed));
    assert.equal(stopped,1);
    assert.equal(closed,(!failure||failure==="autoplay")?1:0);
  });
}

test("separate playback uses the standard context when silent sinks are unsupported",async()=>{
  const context=createContext();
  let contextCount=0;
  let routeAttempts=0;
  const session=new CrewLive.Session({
    separateCaptureContext:true,
    createPlaybackRoute(){routeAttempts++;},
    deps:{
      getUserMedia:async()=>({getTracks:()=>[]}),
      createAudioContext(){
        contextCount++;
        return context;
      }
    }
  });
  session.running=true;
  await session._openMedia();
  assert.equal(contextCount,1);
  assert.equal(routeAttempts,0);
  assert.equal(session.inputContext,context);
  assert.equal(session.outputContext,context);
  await session.stop();
});

test("stopping during startup fallback waits for context cleanup without reopening audio",async()=>{
  let startedClosing;
  let finishClosing;
  const closeStarted=new Promise(resolve=>{startedClosing=resolve;});
  const closePending=new Promise(resolve=>{finishClosing=resolve;});
  const contexts=[];
  let micStops=0;
  const session=new CrewLive.Session({
    separateCaptureContext:true,
    createPlaybackRoute:()=>({
      destination:{},ready:Promise.reject(new Error("play blocked")),close(){}
    }),
    deps:{
      getUserMedia:async()=>({getTracks:()=>[{stop(){micStops++;}}]}),
      createAudioContext(sinkId){
        const context={
          ...createContext(),sinkId,
          async setSinkId(){},
          async close(){this.closeCount=(this.closeCount||0)+1;if(this===contexts[1]){startedClosing();await closePending;}}
        };
        contexts.push(context);
        return context;
      }
    }
  });
  session.running=true;
  const startup=assert.rejects(session._openMedia(),/麥克風請求已取消/);
  await closeStarted;
  let stopped=false;
  const stopping=session.stop().then(()=>{stopped=true;});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(stopped,false);
  assert.equal(micStops,1);
  finishClosing();
  await Promise.all([startup,stopping]);
  assert.deepEqual(contexts.map(context=>context.closeCount),[1,1]);
});
