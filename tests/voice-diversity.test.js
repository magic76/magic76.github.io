const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Live catalog contains thirty official voice names and safe legacy mappings",()=>{
 const s=read("web-spa/src/live/voiceIdentity.ts");
 const catalog=s.match(/export const LIVE_VOICES=\[([\s\S]*?)\] as const;/);
 assert.ok(catalog);
 const voices=[...catalog[1].matchAll(/"([A-Za-z]+)"/g)].map(x=>x[1]);
 assert.equal(voices.length,30);
 assert.equal(new Set(voices).size,30);
 for(const id of ["Leda","Achernar","Zephyr","Orus","Vindemiatrix","Laomedeia"])assert.ok(voices.includes(id));
 assert.match(s,/return LIVE_VOICES\.find/);
 assert.match(s,/VOICE_ALIASES\[id\]\|\|"Kore"/);
});

test("all 32 friends and teachers have unique supported voices within their group",()=>{
 const f=read("web-spa/src/friends/friendProfiles.ts"),t=read("web-spa/src/teacher/teacherProfiles.ts");
 const catalog=read("web-spa/src/live/voiceIdentity.ts");
 const names=[...catalog.match(/export const LIVE_VOICES=\[([\s\S]*?)\] as const;/)[1].matchAll(/"([A-Za-z]+)"/g)].map(m=>m[1]);
 const friends=[...f.matchAll(/"id":"[a-z]+"[^\n]*?"voice":"([A-Za-z]+)"/g)].map(m=>m[1]);
 const teachers=[...t.matchAll(/\{id:"[a-z]+"[^\n]*?recommendedVoice:"([A-Za-z]+)"/g)].map(m=>m[1]);
 assert.equal(friends.length,16);
 assert.equal(teachers.length,16);
 assert.equal(new Set(friends).size,16);
 assert.equal(new Set(teachers).size,16);
 for(const voice of [...friends,...teachers])assert.ok(names.includes(voice),"invalid "+voice);
 assert.match(f,/"id":"zoe"[^\n]*?"voice":"Leda"/);
 assert.match(f,/"id":"bella"[^\n]*?"voice":"Laomedeia"/);
 assert.match(f,/"id":"yuna"[^\n]*?"voice":"Achernar"/);
});

test("Live and audition select normalized speaker without changing tutoring or memory",()=>{
 const f=read("web-spa/src/friends/FriendLiveConversation.tsx");
 const t=read("web-spa/src/teacher/LivePage.tsx");
 const preview=read("web-spa/src/teacher/teacherVoicePreview.ts");
 const prompt=read("web-spa/src/live/voiceIdentity.ts");
 assert.match(f,/normalizeLiveVoice\(friend\.voice\)/);
 assert.match(t,/normalizeLiveVoice\(s\.voice\)/);
 assert.match(preview,/normalizeLiveVoice\(opts\?\.voice\|\|profile\.recommendedVoice\)/);
 assert.match(prompt,/accent must never change the language/);
 assert.match(prompt,/english&&voiceAccent!==/);
});

test("Web Voice Lab is an explicit opt-in and never saves conversation/history",()=>{
 const page=read("web-spa/src/teacher/VoiceLabPage.tsx"),routes=read("web-spa/src/App.tsx");
 assert.match(routes,/\/teacher\/voice-lab/);
 assert.match(page,/params\.get\("lab"\)==="1"/);
 assert.match(page,/persistHistory:false,teacherReport:false/);
 assert.match(page,/durationMs>=20000/);
 assert.match(page,/localStorage\.setItem\(KEY/);
 assert.match(page,/30/);
});
