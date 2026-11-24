const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=file=>fs.readFileSync(file,"utf8");

test("English uses lazy Kokoro Lab and European languages retain Pico",()=>{
 const speech=read("web-spa/src/teacher/learningSpeech.ts");
 const pico=read("web-spa/src/teacher/learningSpeech.worker.ts");
 const kokoro=read("web-spa/src/teacher/learningSpeechKokoro.ts");
 const routes=read("web-spa/src/teacher/learningSpeechRoutes.ts");
 const lab=read("web-spa/public/tts-lab/kokoro/index.html");
 assert.match(speech,/return learningSpeechRoute\(code\).engine/);
 assert.match(speech,/const PICO_LANGUAGES=new Set\(\["de"\]\)/);
 assert.match(speech,/new Worker\(new URL\("\.\/learningSpeech\.worker\.ts",import\.meta\.url\),\{type:"classic"\}\)/);
 assert.match(speech,/new Worker\(new URL\("\.\/learningSpeech\.kokoro\.worker\.ts",import\.meta\.url\),\{type:"module"\}\)/);
 assert.match(speech,/koolo-learning-speech-v1/);
 for(const token of ["kokoro-js@1.2.1/dist/kokoro.web.js","onnx-community/Kokoro-82M-v1.0-ONNX","af_heart","webgpu","fp32","wasm","q8"]){
  assert.ok(lab.includes(token),"Lab "+token);
  assert.ok(kokoro.includes(token)||speech.includes(token)||routes.includes(token),"learning "+token);
 }
 assert.match(kokoro,/KokoroTTS\.from_pretrained\(MODEL_ID/);
 assert.match(kokoro,/tts\.generate\(text,\{voice:route.voice,speed:rate\}\)/);
 assert.doesNotMatch(speech+pico+kokoro,/kitten_tts_2_nano_en_int4|en-us\.ucd/);
 assert.match(pico,/kitten_tts_2_pico_"\+language\+"_int4\.onnx/);
 assert.match(pico,/voices_"\+language\+"\.npz"/);
 assert.match(pico,/vocab\.json/);
 assert.match(pico,/uccharan@1\.0\.0/);
 assert.match(pico,/lang:g2pLanguage\(language\),profile:"kitten"/);
 assert.doesNotMatch(kokoro,/trimTiny\(/);
 assert.match(speech,/await systemSpeak\(value,language,speed\)/);
 assert.match(speech,/next=generateTiny\(chunks\[index\+1\],language,speed,false\)/);
 assert.match(speech,/await playBlob\(blob,id\)/);
});

test("all supported locales include phrase, vocabulary neural-voice and chat learning copy",()=>{
 for(const locale of ["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"]){
  const teacher=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/teacher.json"));
  const voice=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/voice.json"));
  for(const key of ["phrases","phrasesDesc"])assert.ok(teacher.learn[key],locale+" learn."+key);
  for(const key of ["neuralVoiceHint","modelDownloading","listenExample","saved","saveExample","fromWord"])assert.ok(teacher.vocabulary[key],locale+" vocabulary."+key);
  for(const key of ["title","todayTitle","listeningTitle","listen","save","modelDownloading","delete","shadow","reviewed"])assert.ok(teacher.phrasebook[key],locale+" phrasebook."+key);
  for(const key of ["listen","saved","savePhrase","save","originalPrefix","savedNote","modelDownloading"])assert.ok(voice.textChat.learning[key],locale+" textChat.learning."+key);
  assert.equal(teacher.phrasebook.modelDownloading,teacher.vocabulary.modelDownloading);
  assert.equal(voice.textChat.learning.modelDownloading,teacher.vocabulary.modelDownloading);
  for(const group of [teacher.phrasebook,teacher.vocabulary,voice.textChat.learning]){
   assert.equal(group.modelReady,undefined);
   assert.equal(group.modelDownloadingPico,undefined);
   assert.doesNotMatch(group.modelDownloading,/Kokoro|Pico|MB|\{\{/);
  }
  if(locale==="zh-TW")assert.equal(teacher.vocabulary.modelDownloading,"模型下載中");

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
