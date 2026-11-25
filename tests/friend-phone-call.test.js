import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=path=>fs.readFileSync(path,"utf8");
test("friend call uses actual two-way transcription and preserves the Live transport",()=>{
 const page=read("web-spa/src/friends/FriendLiveConversation.tsx");
 const captions=read("web-spa/src/friends/FriendCallCaptions.tsx");
 const bubbles=read("web-spa/src/friends/FriendCallBubbleList.tsx");
 const controls=read("web-spa/src/friends/FriendCallControls.tsx");
 const transport=read("crew-live.js");
 assert.match(page,/FriendCallCaptions name=\{friend\.name\}/);
 assert.match(page,/FriendCallControls live=\{live\}/);
 assert.match(page,/friend-phone-stage/);
 assert.match(page,/FriendUnifiedComposer live=\{live\}/);
 assert.match(bubbles,/const showCurrentInput=!!currentInput&&currentInput!==lastInput/);
 assert.match(captions,/output\.trim\(\)/);
 assert.match(captions,/splitCallSentences\(text\)/);
 assert.match(captions,/advance\(currentReply,false\)/);
 assert.match(captions,/advance\(complete,true\)/);
 assert.match(captions,/translateWithProvider\(part\.source,source,nativeLanguage/);
 assert.doesNotMatch(captions,/sendText\(|sendControl\(/);
 assert.match(controls,/live\.toggleMute/);
 assert.match(controls,/live\.interrupt\(\)/);
 assert.match(controls,/onEnd\(\)/);
 assert.match(transport,/inputAudioTranscription:inputLanguageCodes\.length\?\{languageCodes:inputLanguageCodes\}:\{\}/);
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

test("call controls use device volume and give AI playback a separate fine-grained slider",()=>{
 const friend=read("web-spa/src/friends/FriendCallControls.tsx");
 const friendPage=read("web-spa/src/friends/FriendLiveConversation.tsx");
 const teacher=read("web-spa/src/live/LiveControls.tsx");
 const settings=read("web-spa/src/pages/GeminiConnectionPanel.tsx");
 const preview=read("web-spa/src/teacher/teacherVoicePreview.ts");
 assert.doesNotMatch(friend,/type="range"|friend-phone-volume|setVolume\(/);
 assert.doesNotMatch(friendPage,/showPlaybackVolume|playbackVolumeStorageKey/);
 const voiceMute=read("web-spa/src/friends/FriendVoiceMute.tsx");
 assert.match(friendPage,/friend-voice-avatar-anchor[\s\S]*?<FriendAvatar[\s\S]*?<FriendVoiceMute/);
 assert.match(friendPage,/volume:live\.volume,onVolume:live\.setVolume/);
 assert.match(voiceMute,/aria-expanded=\{open\}/);
 assert.match(voiceMute,/type="range" min="0" max="100" step="1"/);
 assert.match(voiceMute,/onVolume\(Number\(e\.target\.value\)\)/);
 assert.match(voiceMute,/onVolume\(0\)/);
 assert.match(voiceMute,/data-muted=\{muted\}/);
 const teacherPage=read("web-spa/src/teacher/LivePage.tsx");
 assert.match(teacherPage,/<FriendVoiceMute volume=\{live\.volume\} onVolume=\{live\.setVolume\}/);
 assert.doesNotMatch(voiceMute,/toggleMute\(/);
 assert.doesNotMatch(teacher,/type="range"|setVolume\(|volume-quick|volume-stepper|friend-phone-volume/);
 assert.doesNotMatch(settings,/crew-live-volume|crew_live_volume|type="range"/);
 assert.match(settings,/voice:"Kore",volume:100/);
 assert.doesNotMatch(preview,/crew_live_volume/);
 assert.match(preview,/gain\.gain\.value=1/);
});

test("mobile call hides the avatar and post only when the composer textarea is focused",()=>{
 const css=read("web-spa/src/friends/friendUnifiedComposer.css");
 assert.doesNotMatch(css,/\.friend-phone-stage:focus-within\s*>/);
 for(const target of ["live-identity","friend-live-post"]){
  assert.ok(css.includes(".friend-phone-stage:has(>.friend-unified-composer .friend-unified-input-row textarea:focus)>."+target+"{display:none}"),target);
 }
});
