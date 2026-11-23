const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=file=>fs.readFileSync(file,"utf8");

test("learning speech routes English to Kokoro and supported European targets to Pico",()=>{
 const speech=read("web-spa/src/teacher/learningSpeech.ts");
 assert.match(speech,/kokoro-js@1\.2\.1/);
 assert.match(speech,/Kokoro-82M-v1\.0-ONNX/);
 assert.match(speech,/if\(code==="en"\)return"kokoro"/);
 assert.match(speech,/const PICO_LANGUAGES=new Set\(\["de","es","fr","it","pt"\]\)/);
 assert.match(speech,/uccharan@1\.0\.0/);
 assert.match(speech,/kitten_tts_2_pico_"\+language\+"_int4\.onnx/);
 assert.match(speech,/koolo-learning-speech-v1/);
 assert.match(speech,/if\(language==="en"\)\{await speakText\(text,\{speed\}\);return\}/);
});

test("phrasebook is an audio learning loop with daily phrases, shadowing, listening and review",()=>{
 const page=read("web-spa/src/teacher/PhrasebookPage.tsx");
 const phrases=read("web-spa/src/teacher/dailyPhrases.ts");
 const deck=read("web-spa/src/teacher/learningDeck.ts");
 const hub=read("web-spa/src/pages/CrewSectionPage.tsx");
 assert.match(page,/dailyPhrases\(code\)/);
 assert.match(page,/今天 5 句/);
 assert.match(page,/聽力小遊戲/);
 assert.match(page,/跟著說/);
 assert.match(page,/speakLearningText/);
 assert.match(page,/reviewDeckItem/);
 assert.match(page,/quizIndex%clean\.length/);
 assert.match(phrases,/Sounds good to me\./);
 assert.match(deck,/language\?:string/);
 assert.match(deck,/language\+"\|"\+input\.originalText/);
 assert.match(hub,/to:"\/teacher\/phrasebook"/);
});

test("Zoe replies can be listened to and deliberately saved into the same phrase deck",()=>{
 const learning=read("web-spa/src/live/TextChatLearning.tsx");
 const panel=read("web-spa/src/live/TextChatPanel.tsx");
 assert.match(learning,/export function FriendLearningActions/);
 assert.match(learning,/☆ 收藏成片語/);
 assert.match(learning,/speakLearningText\(value,target/);
 assert.match(learning,/addDeckItem\(/);
 assert.match(learning,/＋ 收藏/);
 assert.match(panel,/<FriendLearningActions text=\{m\.text\}\/>/);
});

test("reports keep language metadata when saving phrases",()=>{
 const reports=read("web-spa/src/teacher/ReportsPage.tsx");
 assert.match(reports,/saveReportLearning\(r,normalizeLearningLanguage\(sessionLanguage\|\|targetLanguage\)\)/);
});
