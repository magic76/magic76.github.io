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
  assert.match(controls,/type="range" min="0" max="100"/);
  assert.match(controls,/live\.setVolume\(Number\(e\.target\.value\)\)/);
  assert.match(controls,/若手機音量鍵顯示通話音量/);
  assert.match(css,/session-page \.crew-voice-dock \.live-audio-settings\{display:block\}/);
  assert.doesNotMatch(css,/session-page \.crew-voice-dock \.live-audio-settings\{display:none\}/);
  assert.match(css,/\.live-stage\{padding-bottom:calc\(210px/);
  assert.match(teacher,/<LiveControls live=\{live\}/);
  assert.match(friend,/<LiveControls live=\{live\}/);
  assert.match(hook,/crew_live_volume/);
  assert.match(hook,/sessionRef\.current\?\.setVolume\(n\)/);
});
