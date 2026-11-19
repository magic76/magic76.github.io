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

test("Teacher and Friends mobile Live use fixed gain without app volume controls",()=>{
 const controls=source("web-spa/src/live/LiveControls.tsx");
 const friendControls=source("web-spa/src/friends/FriendCallControls.tsx");
 const settings=source("web-spa/src/pages/GeminiConnectionPanel.tsx");
 const hook=source("web-spa/src/live/useLiveSession.ts");
 const teacher=source("web-spa/src/teacher/LivePage.tsx");
 const friend=source("web-spa/src/friends/FriendLivePage.tsx");
 for(const control of [controls,friendControls]){
  assert.doesNotMatch(control,/live-audio-settings|friend-phone-volume|live-volume-quick|type="range"|setVolume\(/);
 }
 assert.doesNotMatch(settings,/crew-live-volume|crew_live_volume/);
 assert.match(hook,/const volume=100/);
 assert.match(hook,/session\.setVolume\(volume\)/);
 assert.doesNotMatch(hook,/crew_live_volume/);
 assert.match(teacher,/<LiveControls live=\{live\}/);
 assert.match(friend,/<LiveControls live=\{live\}/);
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
  // Internal _openMedia is exercised as part of an active Live start.
  session.running=true;
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

// Regression: every shared Web Live surface must honor the same 0–300% setting.
test("settings and voice auditions use fixed gain while Story and legacy retain their range",()=>{
 const settings=source("web-spa/src/pages/GeminiConnectionPanel.tsx");
 const story=source("web-spa/src/story/player/StoryPlayerView.tsx");
 const legacy=source("crew-live-ui.js");
 const audition=source("web-spa/src/teacher/teacherVoicePreview.ts");
 assert.doesNotMatch(settings,/crew-live-volume|crew_live_volume|type="range"/);
 assert.match(settings,/volume:100/);
 assert.match(story,/type="range" min="0" max="300" step="5" value=\{live.volume\}/);
 assert.match(legacy,/volume.max="300"/);
 assert.match(legacy,/Math\.min\(300,Number\(volume.value\)/);
 assert.doesNotMatch(audition,/crew_live_volume/);
 assert.match(audition,/gain.gain.value=1/);
 assert.match(audition,/node.connect\(playbackGain\|\|ctx.destination\)/);
 assert.match(audition,/limiter.threshold.value=-3/);
});
