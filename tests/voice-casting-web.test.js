const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const friend=read("web-spa/src/friends/friendProfiles.ts");
const teacher=read("web-spa/src/teacher/teacherProfiles.ts");
const voiceIdentity=read("web-spa/src/live/voiceIdentity.ts");
const casting=read("web-spa/src/teacher/voiceCasting.ts");
const studio=read("web-spa/src/teacher/VoiceCastingStudio.tsx");

test("Web roster currently has 32 characters, 22 unique assigned voices, 10 collisions and 8 unused",()=>{
 const teacherVoices=[...teacher.matchAll(/recommendedVoice:"([^"]+)"/g)].map(m=>m[1]);
 const friendVoices=[...friend.matchAll(/"voice":"([^"]+)"/g)].map(m=>m[1]);
 assert.equal(teacherVoices.length,16);assert.equal(friendVoices.length,16);
 assert.equal(new Set(teacherVoices).size,16);assert.equal(new Set(friendVoices).size,16);
 const assigned=[...teacherVoices,...friendVoices],counts=new Map();
 for(const voice of assigned)counts.set(voice,(counts.get(voice)||0)+1);
 assert.equal(counts.size,22);
 assert.equal([...counts.values()].filter(n=>n>1).length,10);
 const ids=voiceIdentity.match(/export const LIVE_VOICES=\[([\s\S]*?)\] as const;/);
 assert.ok(ids,"Live catalog should remain the single source of truth");
 assert.equal((ids[1].match(/"[^"]+"/g)||[]).length,30);
 assert.equal(30-counts.size,8);
});
test("Casting uses the configured Gemini Live model and voice, but no mic or role/memory writes",()=>{
 assert.match(casting,/model:"models\/"\+model/);
 assert.match(casting,/voiceName:normalizeLiveVoice\(voice\)/);
 assert.match(casting,/responseModalities:\["AUDIO"\]/);
 assert.match(casting,/serverContent\|\|message.server_content/);
 assert.match(casting,/content.turnComplete\|\|content.turn_complete/);
 assert.doesNotMatch(casting,/getUserMedia|AudioRecord|saveLive\(|recordFriendChat|rememberFriend/);
 assert.match(casting,/signal.addEventListener\("abort"/);
});
test("Web auditions support six target languages; no character-specific English accent is assigned",()=>{
 for(const tag of ["en","ja","ko","es","fr","zh"])assert.match(casting,new RegExp(" "+tag+":\\{label:"));
 assert.match(casting,/an anonymous, neutral speaker audition/i);
 assert.match(studio,/CASTING_LINES\[language\]/);
 assert.doesNotMatch(casting,/British English|American English|accentId/);
});
test("Each WAV uses PCM signed 16 bit and IndexedDB stores sampled blobs by model, locale and voice",()=>{
 assert.match(casting,/const CACHE_DB="crew_teacher_voice_casting"/);
 assert.match(casting,/indexedDB.open\(CACHE_DB,1\)/);
 assert.match(casting,/CASTING_CACHE_VERSION,model,language,normalizeLiveVoice\(voice\)/);
 assert.match(casting,/view.setUint16\(34,16,true\)/);
 assert.match(casting,/view.setUint32\(24,sampleRate,true\)/);
 assert.match(casting,/function pcmToWav/);
 assert.match(casting,/new Blob\(\[buffer\],\{type:"audio\/wav"\}\)/);
});
test("Casting preview is opt-in, linked from Voice Lab, has batch/cache, one-click playback and blind A/B",()=>{
 const app=read("web-spa/src/App.tsx");
 const lab=read("web-spa/src/teacher/VoiceLabPage.tsx");
 assert.match(app,/path="\/teacher\/voice-casting"/);
 assert.match(lab,/\/teacher\/voice-casting\?lab=1/);
 assert.match(studio,/params.get\("lab"\)==="1"/);
 assert.match(studio,/runBatch\(LIVE_VOICES\)/);
 assert.match(studio,/runBatch\(unused\)/);
 assert.match(studio,/runBatch\(quickChoices\)/);
 assert.match(studio,/playPlaylist\(/);
 assert.match(studio,/clearCastingSamples\(/);
 assert.match(studio,/recordVote\("tie"\)/);
 assert.match(studio,/localStorage.setItem\(votesKey/);
 assert.doesNotMatch(studio,/setVoice\(|setTeacherProfile\(|setFriendProfile\(/);
});
