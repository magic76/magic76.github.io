const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=file=>fs.readFileSync(file,"utf8");

test("learning speech uses Nano int4 English and worker-backed Pico for European targets",()=>{
 const speech=read("web-spa/src/teacher/learningSpeech.ts");
 const worker=read("web-spa/src/teacher/learningSpeech.worker.ts");
 assert.match(speech,/if\(code==="en"\)return"nano"/);
 assert.match(speech,/const PICO_LANGUAGES=new Set\(\["de","es","fr","it","pt"\]\)/);
 assert.match(speech,/new Worker\(new URL\("\.\/learningSpeech\.worker\.ts",import\.meta\.url\)/);
 assert.match(speech,/koolo-learning-speech-v1/);
 assert.match(worker,/kitten_tts_2_nano_en_int4\.onnx/);
 assert.match(worker,/kitten_tts_2_pico_"\+language\+"_int4\.onnx/);
 assert.match(worker,/voices_"\+language\+"\.npz"/);
 assert.match(worker,/vocab\.json/);
 assert.match(worker,/uccharan@1\.0\.0/);
 assert.match(worker,/lang:g2pLanguage\(language\),profile:"kitten"/);
 assert.match(worker,/const voice=voices\[language==="en"\?"eleanor"/);
 assert.doesNotMatch(speech,/Kokoro|kokoro-js|transformers-cache|kokoro-voices/i);
 assert.doesNotMatch(worker,/Kokoro|kokoro-js|transformers-cache|kokoro-voices/i);
 assert.match(speech,/if\(!hit\)options\.onModelStatus\?\.\("loading"\)/);
 assert.match(speech,/await systemSpeak\(value,language,speed\)/);
 assert.match(speech,/next=generateTiny\(chunks\[index\+1\],language,speed\)/);
 assert.match(speech,/await playBlob\(blob,id\)/);
});

test("all supported locales include phrase, vocabulary neural-voice and chat learning copy",()=>{
 for(const locale of ["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"]){
  const teacher=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/teacher.json"));
  const voice=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/voice.json"));
  for(const key of ["phrases","phrasesDesc"])assert.ok(teacher.learn[key],locale+" learn."+key);
  for(const key of ["neuralVoiceHint","modelDownloading","modelReady","listenExample","saved","saveExample","fromWord"])assert.ok(teacher.vocabulary[key],locale+" vocabulary."+key);
  for(const key of ["title","todayTitle","listeningTitle","listen","save","modelDownloading","modelReady","delete","shadow","reviewed"])assert.ok(teacher.phrasebook[key],locale+" phrasebook."+key);
  for(const key of ["listen","saved","savePhrase","save","originalPrefix","savedNote","modelDownloading","modelReady"])assert.ok(voice.textChat.learning[key],locale+" textChat.learning."+key);
  for(const hint of [teacher.phrasebook.modelDownloading,teacher.vocabulary.modelDownloading,voice.textChat.learning.modelDownloading]){
   assert.match(hint,/13/,locale+" should describe Nano download size");
   assert.doesNotMatch(hint,/88|Kokoro/,locale+" must not promise old Kokoro download");
  }
  assert.match(teacher.vocabulary.neuralVoiceHint,/Kitten Nano/);

 }
});

test("phrasebook is an audio learning loop with daily phrases, shadowing, listening and review",()=>{
 const page=read("web-spa/src/teacher/PhrasebookPage.tsx");
 const phrases=read("web-spa/src/teacher/dailyPhrases.ts");
 const deck=read("web-spa/src/teacher/learningDeck.ts");
 const hub=read("web-spa/src/pages/CrewSectionPage.tsx");
 assert.match(page,/dailyPhrases\(code\)/);
 assert.match(page,/phrasebook\.todayTitle/);
 assert.match(page,/phrasebook\.listeningTitle/);
 assert.match(page,/phrasebook\.shadow/);
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
 assert.match(learning,/textChat\.learning\.savePhrase/);
 assert.match(learning,/speakLearningText\(value,target/);
 assert.match(learning,/addDeckItem\(/);
 assert.match(learning,/textChat\.learning\.save/);
 assert.match(panel,/<FriendLearningActions text=\{m\.text\}\/>/);
});

test("reports keep language metadata when saving phrases",()=>{
 const reports=read("web-spa/src/teacher/ReportsPage.tsx");
 assert.match(reports,/saveReportLearning\(r,normalizeLearningLanguage\(sessionLanguage\|\|targetLanguage\)\)/);
});
