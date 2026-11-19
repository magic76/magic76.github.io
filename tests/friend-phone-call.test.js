import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=path=>fs.readFileSync(path,"utf8");
test("friend call uses actual two-way transcription and preserves the Live transport",()=>{
 const page=read("web-spa/src/friends/FriendLivePage.tsx");
 const captions=read("web-spa/src/friends/FriendCallCaptions.tsx");
 const controls=read("web-spa/src/friends/FriendCallControls.tsx");
 const transport=read("crew-live.js");
 assert.match(page,/FriendCallCaptions name=\{friend\.name\}/);
 assert.match(page,/FriendCallControls live=\{live\}/);
 assert.match(page,/friend-phone-stage/);
 assert.match(page,/textMode\?" friend-text-stage"/);
 assert.match(captions,/input\.trim\(\)\|\|latestInput/);
 assert.match(captions,/output\.trim\(\)/);
 assert.match(captions,/splitCallSentences\(text\)/);
 assert.match(captions,/advance\(currentReply,false\)/);
 assert.match(captions,/advance\(complete,true\)/);
 assert.match(captions,/translateCallSentence\(part\.source,source,nativeLanguage/);
 assert.doesNotMatch(captions,/sendText\(|sendControl\(/);
 assert.match(controls,/live\.toggleMute/);
 assert.match(controls,/live\.interrupt\(\)/);
 assert.match(controls,/onEnd\(\)/);
 assert.match(transport,/inputAudioTranscription:\{\}/);
 assert.match(transport,/outputAudioTranscription:\{\}/);
});
test("call captions exist in all 11 voice locales",()=>{
 const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];
 const expected=Object.keys(JSON.parse(read("web-spa/src/i18n/locales/en/voice.json")).callCaptions).sort();
 for(const locale of locales){
  const keys=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/voice.json")).callCaptions;
  assert.deepEqual(Object.keys(keys).sort(),expected,locale);
  for(const [key,value] of Object.entries(keys))assert.ok(typeof value==="string"&&value.trim(),locale+" "+key);
 }
});

test("friend and teacher call controls expose no app volume sliders",()=>{
 const friend=read("web-spa/src/friends/FriendCallControls.tsx");
 const teacher=read("web-spa/src/live/LiveControls.tsx");
 const live=read("web-spa/src/live/useLiveSession.ts");
 const settings=read("web-spa/src/pages/GeminiConnectionPanel.tsx");
 const preview=read("web-spa/src/teacher/teacherVoicePreview.ts");
 for(const [name,source] of [["friend",friend],["teacher",teacher]]){
  assert.doesNotMatch(source,/type="range"|setVolume\(|volume-quick|volume-stepper|friend-phone-volume/,name);
 }
 assert.match(live,/const volume=100/);
 assert.match(live,/session\.setVolume\(volume\)/);
 assert.doesNotMatch(live,/crew_live_volume/);
 assert.doesNotMatch(settings,/crew-live-volume|crew_live_volume|type="range"/);
 assert.match(settings,/voice:"Kore",volume:100/);
 assert.doesNotMatch(preview,/crew_live_volume/);
 assert.match(preview,/gain\.gain\.value=1/);
});
