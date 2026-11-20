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

test("audioDebug trace retains cleanup across calls and identifies guest preflight",async()=>{
  const originalLocation=Object.getOwnPropertyDescriptor(globalThis,"location");
  try{
    Object.defineProperty(globalThis,"location",{configurable:true,value:{search:""}});
    CrewLive.markGuestMicDebug("request");
    assert.equal(CrewLive.getAudioDebugTrace().length,0);
    Object.defineProperty(globalThis,"location",{configurable:true,value:{search:"?audioDebug=1"}});
    CrewLive.markGuestMicDebug("request");
    CrewLive.markGuestMicDebug("acquired");
    CrewLive.markGuestMicDebug("stopped");
    const makeSession=()=>new CrewLive.Session({deps:{
      getUserMedia:async()=>({getTracks:()=>[{stop(){}}]}),
      createAudioContext:createContext
    }});
    for(let index=0;index<2;index++){
      const session=makeSession();
      session.running=true;
      await session._openMedia();
      await session.stop();
    }
    const trace=CrewLive.getAudioDebugTrace();
    assert.deepEqual(trace.slice(0,3).map(({callId,event})=>[callId,event]),[
      [null,"guest-preflight-request"],[null,"guest-preflight-acquired"],[null,"guest-preflight-stopped"]
    ]);
    const first=trace.slice(3).filter(entry=>entry.callId===1).map(entry=>entry.event);
    assert.deepEqual(first.slice(-5),[
      "cleanup-start","mic-tracks-stopped","shared-context-close-start",
      "shared-context-close-resolved","cleanup-complete"
    ]);
    assert.equal(trace.find(entry=>entry.callId===2)?.event,"mic-request-start");
    trace[0].event="changed";
    assert.equal(CrewLive.getAudioDebugTrace()[0].event,"guest-preflight-request");
  }finally{
    if(originalLocation)Object.defineProperty(globalThis,"location",originalLocation);
    else delete globalThis.location;
  }
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
