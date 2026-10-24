const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const gameRoot=path.resolve(__dirname,"../web-spa/src/games");
const read=name=>fs.readFileSync(path.join(gameRoot,name),"utf8");

test("all Crew Play Gemini Live entry points expose persistent selected voice",()=>{
 const picker=read("GameVoicePicker.tsx");
 const identity=fs.readFileSync(path.resolve(__dirname,"../web-spa/src/live/voiceIdentity.ts"),"utf8");
 assert.match(picker,/crew_play_live_voice_v1/);
 assert.match(picker,/LIVE_VOICES.map/);
 assert.match(picker,/localStorage.setItem/);
 assert.match(picker,/select aria-label/);
 assert.match(identity,/export const LIVE_VOICES/);
 for(const name of ["WerewolfPage.tsx","MiniGameFrame.tsx","CrewPlayGamePage.tsx","NonsenseLiveNewsPage.tsx","NonsenseChampionshipPage.tsx"]){
  const page=read(name);
  assert.match(page,/useGameVoice\(/,name);
  assert.match(page,/<GameVoicePicker\b/,name);
  assert.match(page,/resolveGameVoice\(/,name);
 }
 for(const name of ["werewolfLive.ts","nonsenseNewsLive.ts","nonsenseHost.ts"]){
  assert.match(read(name),/normalizeLiveVoice/,name);
 }
});
test("game voice selections do not modify teacher or friend voice identity",()=>{
 const picker=read("GameVoicePicker.tsx");
 assert.doesNotMatch(picker,/teacherStore|buildFriendSystem|FriendProfile/);
 assert.match(picker,/value==="auto"/);
 assert.match(picker,/normalizeLiveVoice\(defaultVoice\)/);
});
