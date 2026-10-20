const test=require("node:test");
const assert=require("node:assert/strict");
const CrewLive=require("../crew-live.js");

test("built-in microphone selection excludes Bluetooth and prefers explicit local inputs",()=>{
  const devices=[
    {kind:"audioinput",deviceId:"bt",label:"AirPods Hands-Free"},
    {kind:"audioinput",deviceId:"usb",label:"USB Microphone"},
    {kind:"audioinput",deviceId:"phone",label:"Built-in Microphone"},
    {kind:"audiooutput",deviceId:"speaker",label:"Built-in Speaker"}
  ];
  assert.equal(CrewLive.__test.isBluetoothMicrophoneLabel("Bluetooth Headset"),true);
  assert.equal(CrewLive.__test.isBluetoothMicrophoneLabel("Built-in Microphone"),false);
  assert.equal(CrewLive.__test.pickBuiltInAudioInput(devices).deviceId,"phone");
  assert.equal(CrewLive.__test.pickBuiltInAudioInput([
    {kind:"audioinput",deviceId:"bt",label:"Bluetooth microphone"}
  ]),null);
});

test("Live requests permission, enumerates inputs, then opens the local mic with processing enabled",async()=>{
  const calls=[];
  const initialTrack={stopped:false,getSettings:()=>({deviceId:"default"}),stop(){this.stopped=true;}};
  const localTrack={stopped:false,getSettings:()=>({deviceId:"phone-mic"}),stop(){this.stopped=true;}};
  const initialStream={getTracks:()=>[initialTrack],getAudioTracks:()=>[initialTrack]};
  const localStream={getTracks:()=>[localTrack],getAudioTracks:()=>[localTrack]};
  const context={
    destination:{},sampleRate:48000,
    async resume(){},async close(){},
    createGain(){return {gain:{value:1},connect(){},disconnect(){}};}
  };
  const session=new CrewLive.Session({
    models:["mock"],
    deps:{
      getUserMedia:async constraints=>{
        calls.push(constraints);
        return calls.length===1?initialStream:localStream;
      },
      enumerateDevices:async()=>[
        {kind:"audioinput",deviceId:"bluetooth-mic",label:"Bluetooth Hands-Free"},
        {kind:"audioinput",deviceId:"phone-mic",label:"Built-in Microphone"}
      ],
      createAudioContext:()=>context
    }
  });

  await session._openMedia();

  assert.equal(calls.length,2);
  assert.equal(calls[0].audio.deviceId,undefined,"first request only grants permission and exposes labels");
  assert.deepEqual(calls[1].audio.deviceId,{exact:"phone-mic"});
  assert.equal(calls[1].audio.echoCancellation,true);
  assert.equal(calls[1].audio.noiseSuppression,true);
  assert.equal(calls[1].audio.autoGainControl,true);
  assert.equal(initialTrack.stopped,true,"temporary permission stream is closed before selecting the local mic");
  assert.equal(session.mediaStream,localStream);

  await session._cleanupMedia();
  assert.equal(localTrack.stopped,true);
});

test("failed exact local-device request falls back to a fresh default stream",async()=>{
  const initialTrack={stopped:false,stop(){this.stopped=true;}};
  const initialStream={getTracks:()=>[initialTrack],getAudioTracks:()=>[initialTrack]};
  const fallbackTrack={stopped:false,stop(){this.stopped=true;}};
  const fallbackStream={getTracks:()=>[fallbackTrack],getAudioTracks:()=>[fallbackTrack]};
  const context={
    destination:{},sampleRate:48000,
    async resume(){},async close(){},
    createGain(){return {gain:{value:1},connect(){},disconnect(){}};}
  };
  let requests=0;
  const session=new CrewLive.Session({
    models:["mock"],
    deps:{
      getUserMedia:async()=>{
        requests++;
        if(requests===1)return initialStream;
        if(requests===2)throw new Error("exact device unavailable");
        return fallbackStream;
      },
      enumerateDevices:async()=>[{kind:"audioinput",deviceId:"phone-mic",label:"Phone Microphone"}],
      createAudioContext:()=>context
    }
  });

  await session._openMedia();
  assert.equal(requests,3);
  assert.equal(session.mediaStream,fallbackStream);
  assert.equal(initialTrack.stopped,true);
  assert.equal(fallbackTrack.stopped,false);
  await session._cleanupMedia();
  assert.equal(fallbackTrack.stopped,true);
});
