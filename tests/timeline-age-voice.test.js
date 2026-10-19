const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("Mira uses one Gemini Live voice across all twelve age-delivery profiles",()=>{
 const voice=read("web-spa/src/timeline/timelineVoice.ts");
 const live=read("web-spa/src/timeline/TimelineLivePage.tsx");
 const transport=read("crew-live.js");
 const ages=[...voice.matchAll(/^\s*(7|10|13|16|19|22|25|35|40|50|55|70):"([^"]+)"[,\n]/gm)];
 assert.deepEqual(ages.map(m=>Number(m[1])),[7,10,13,16,19,22,25,35,40,50,55,70]);
 assert.equal(new Set(ages.map(m=>m[2])).size,12,"Every age needs distinct delivery instructions");
 assert.match(voice,/MIRA_LIVE_VOICE="Aoede"/);
 assert.match(live,/voice:normalizeLiveVoice\(characterId==="ethan"\?"Orus":characterId==="hana"\?"Leda":MIRA_LIVE_VOICE\)/);
 assert.match(transport,/prebuiltVoiceConfig:\{voiceName:self\.options\.voice\|\|"Kore"\}/);
 assert.doesNotMatch(voice,/voiceName\s*:/,"Age must not select different voices");
});

test("Age directions prioritize recognizable timbre over artificial pitch changes",()=>{
 const profile=read("web-spa/src/timeline/timelineVoice.ts");
 assert.match(profile,/underlying speaker identity, vocal timbre, pronunciation and language consistent/);
 assert.match(profile,/Only change conversational rhythm, emphasis, emotional energy and pauses/);
 assert.match(profile,/Never switch speaker, force a pitch shift/);
 assert.match(profile,/cartoon child voice/);
 assert.match(profile,/Do not add forced rasp, breathlessness, shakiness or frailty/);
 assert.match(profile,/selected target language remains unchanged/);
});

test("Live session defaults to age delivery but original mode gives an A/B baseline",()=>{
 const profile=read("web-spa/src/timeline/timelineVoice.ts");
 const live=read("web-spa/src/timeline/TimelineLivePage.tsx");
 assert.match(profile,/value==="original"\?"original":"age"/);
 assert.match(profile,/if\(mode==="original"\)return "";/);
 assert.match(live,/timelineVoiceMode\(params\.get\("voiceStyle"\)\)/);
 assert.match(live,/timelineBuildSystem\(age,language,characterId\)\+buildTimelineAgeVoicePrompt\(age,voiceMode,characterId\)/);
 assert.match(live,/persistHistory:false/);
 assert.match(live,/sessionKind:"timeline"/);
});
