const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=file=>fs.readFileSync(file,"utf8");

test("learning uses device speech without a neural worker or download UI",()=>{
 const speech=read("web-spa/src/teacher/learningSpeech.ts");
 assert.match(speech,/new SpeechSynthesisUtterance\(value\)/);
 assert.match(speech,/await speakText\(value,\{speed\}\)/);
 assert.doesNotMatch(speech,/new Worker|fetch\(|onnxruntime|uccharan|generateTiny/);
 assert.equal(fs.existsSync("web-spa/src/teacher/learningSpeech.worker.ts"),false);
 for(const path of ["web-spa/src/teacher/PhrasebookPage.tsx","web-spa/src/teacher/VocabularyPage.tsx","web-spa/src/live/TextChatLearning.tsx"]){
  assert.doesNotMatch(read(path),/onModelStatus|modelDownloading/);
 }
});

test("all supported locales retain phrase, vocabulary and chat learning copy",()=>{
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
