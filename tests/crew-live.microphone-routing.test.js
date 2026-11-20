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

test("optional WebRTC playback routes only output and falls back if the route is lost",async()=>{
  const context=createContext();
  const routes=new Set();
  context.createGain=()=>({
    gain:{value:1},
    connect(destination){routes.add(destination);},
    disconnect(destination){if(destination)routes.delete(destination);else routes.clear();}
  });
  const destination={};
  const modes=[];
  let loseRoute;
  let closes=0;
  let stops=0;
  const session=new CrewLive.Session({
    createPlaybackRoute(ctx,onLost){
      assert.equal(ctx,context);
      loseRoute=onLost;
      return {destination,ready:Promise.resolve(),close(){closes++;}};
    },
    onPlaybackRoute:mode=>modes.push(mode),
    deps:{
      getUserMedia:async()=>({getTracks:()=>[{stop(){stops++;}}]}),
      createAudioContext:()=>context
    }
  });
  session.running=true;
  await session._openMedia();
  assert.deepEqual([...routes],[destination]);
  assert.equal(stops,0);
  loseRoute();
  assert.deepEqual([...routes],[context.destination]);
  assert.deepEqual(modes,["rtc","standard"]);
  await session.stop();
  assert.equal(closes,1);
  assert.equal(stops,1);
});

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

for(const works of [true,false]){
  test(`separate capture uses silent sinks and ${works?"plays through the element":"falls back when autoplay fails"}`,async()=>{
    const contexts=[];
    const modes=[];
    const destination={};
    let stopped=0;
    let closed=0;
    const session=new CrewLive.Session({
      separateCaptureContext:true,
      createPlaybackRoute(context){
        assert.equal(context,contexts[0]);
        return {
          destination,
          ready:works?Promise.resolve():Promise.reject(new Error("blocked")),
          close(){closed++;}
        };
      },
      onPlaybackRoute:mode=>modes.push(mode),
      deps:{
        getUserMedia:async()=>({getTracks:()=>[{stop(){stopped++;}}]}),
        createAudioContext(sinkId){
          assert.deepEqual(sinkId,{type:"none"});
          const outputs=new Set();
          const context={
            ...createContext(),sinkId,outputs,closed:false,
            async setSinkId(sink){this.sinkId=sink;},
            async close(){this.closed=true;},
            createMediaStreamSource(){return {connect(){},disconnect(){}};},
            createScriptProcessor(){return {connect(){},disconnect(){}};},
            createGain(){
              return {
                gain:{value:1},
                connect(target){outputs.add(target);},
                disconnect(target){outputs.delete(target);}
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
    assert.equal(session.inputContext,contexts[1]);
    assert.equal(session.outputContext,contexts[0]);
    assert.deepEqual(contexts[1].sinkId,{type:"none"});
    assert.ok(contexts[1].outputs.has(contexts[1].destination));
    assert.deepEqual(contexts[0].sinkId,works?{type:"none"}:"");
    assert.deepEqual([...contexts[0].outputs],[works?destination:contexts[0].destination]);
    assert.deepEqual(modes,[works?"separate":"standard"]);
    await session.stop();
    assert.ok(contexts.every(context=>context.closed));
    assert.equal(stopped,1);
    assert.equal(closed,1);
  });
}

test("separate playback uses the standard context when silent sinks are unsupported",async()=>{
  const context=createContext();
  const modes=[];
  let contextCount=0;
  let routeAttempts=0;
  const session=new CrewLive.Session({
    separateCaptureContext:true,
    createPlaybackRoute(){routeAttempts++;},
    onPlaybackRoute:mode=>modes.push(mode),
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
  assert.deepEqual(modes,["standard"]);
  await session.stop();
});
