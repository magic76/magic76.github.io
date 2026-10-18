const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const source=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const CrewLive=require("../crew-live.js");

test("a saved zero AI volume remains muted when a Live session starts",()=>{
  const session=new CrewLive.Session({volume:0,models:["mock"]});
  assert.equal(session.volume,0,"zero is intentional, not missing");
  session.outputGain={gain:{value:1}};
  assert.equal(session.setVolume(50),50);
  assert.equal(session.outputGain.gain.value,0.5);
  assert.equal(session.setVolume(0),0);
  assert.equal(session.outputGain.gain.value,0);
  assert.equal(session.setVolume(250),250);
  assert.equal(session.outputGain.gain.value,2.5);
  assert.equal(session.setVolume(350),300,"prevent unbounded amplification");
  assert.equal(session.outputGain.gain.value,3);
  assert.equal(new CrewLive.Session({volume:200,models:["mock"]}).volume,200);
  assert.equal(new CrewLive.Session({models:["mock"]}).volume,100);
});

test("Teacher and Friends mobile Live expose their own AI-volume slider",()=>{
  const controls=source("web-spa/src/live/LiveControls.tsx");
  const css=source("web-spa/src/teacher/parity.css");
  const teacher=source("web-spa/src/teacher/LivePage.tsx");
  const friend=source("web-spa/src/friends/FriendLivePage.tsx");
  const hook=source("web-spa/src/live/useLiveSession.ts");

  assert.match(controls,/className="live-audio-settings"/);
  assert.match(controls,/aria-label="調整 AI 播放音量"/);
  assert.match(controls,/type="range" min="0" max="300"/);
  assert.match(controls,/live\.setVolume\(Number\(e\.target\.value\)\)/);
  assert.match(controls,/實體音量鍵可能控制通話音量/);
  assert.match(controls,/100% 以上增強播放/);
  assert.match(css,/session-page \.crew-voice-dock \.live-audio-settings\{display:block\}/);
  assert.doesNotMatch(css,/session-page \.crew-voice-dock \.live-audio-settings\{display:none\}/);
  assert.match(css,/\.live-stage\{padding-bottom:calc\(210px/);
  assert.match(teacher,/<LiveControls live=\{live\}/);
  assert.match(friend,/<LiveControls live=\{live\}/);
  assert.match(hook,/crew_live_volume/);
  assert.match(hook,/Math\.min\(300/);
  assert.match(hook,/sessionRef\.current\?\.setVolume\(n\)/);
});

test("AI playback boost is peak-limited and does not alter the microphone path",async()=>{
  const routing=[];
  const destination={name:"speaker"};
  const limiter={
    threshold:{value:0},knee:{value:0},ratio:{value:0},
    attack:{value:0},release:{value:0},
    connect:target=>routing.push(["limiter",target]),disconnect(){}
  };
  const gain={gain:{value:1},connect:target=>routing.push(["gain",target]),disconnect(){}};
  const track={stopped:false,stop(){this.stopped=true;}};
  const events=[];
  const context={
    destination,
    createGain:()=>gain,
    createDynamicsCompressor:()=>limiter,
    async resume(){},
    async close(){}
  };
  const session=new CrewLive.Session({
    volume:225,models:["mock"],
    deps:{
      getUserMedia:async()=>{
        events.push("microphone");
        return{getTracks:()=>[track]};
      },
      createAudioContext:()=>{
        events.push("playback");
        return context;
      }
    }
  });
  await session._openMedia();
  assert.deepEqual(events,["microphone","playback"]);
  assert.equal(gain.gain.value,2.25);
  assert.equal(limiter.threshold.value,-3);
  assert.equal(limiter.ratio.value,20);
  assert.equal(session.outputLimiter,limiter);
  assert.deepEqual(routing,[["limiter",destination],["gain",limiter]]);
  assert.equal(track.stopped,false);
  assert.equal(session.setVolume(300),300);
  assert.equal(gain.gain.value,3);
  await session._cleanupMedia();
  assert.equal(track.stopped,true);
  assert.equal(session.outputLimiter,null);
});
