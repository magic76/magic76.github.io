const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");

const source=fs.readFileSync("web-spa/src/teacher/vocabularyQueue.ts","utf8");
const base=[
 ["apple","蘋果","I like apples.","A1","food",45],
 ["book","書","Read a book.","A1","school",46],
 ["chair","椅子","Sit on a chair.","A1","home",47],
 ["school","學校","Go to school.","A1","school",49],
 ["music","音樂","Listen to music.","A2","arts",50],
 ["water","水","Drink water.","A1","food",51],
 ["friend","朋友","Meet my friend.","A1","people",52],
 ["window","窗戶","Open the window.","A2","home",53],
 ["train","火車","Take a train.","A2","travel",54]
];
function loadQueue(translations={}){
 const localizedVocabulary=native=>base.map(w=>[w[0],native==="zh-TW"?w[1]:(translations[w[0]]||w[1]),...w.slice(2)]);
 const hasLocalizedGloss=(native,word)=>native==="zh-TW"||Boolean(translations[word]);
 const js=stripTypeScriptTypes(source
  .replace(/\bimport[^;]*;/g,"")
  .replace(/\bexport\s+(?=function\b)/g,""),{mode:"strip"});
 const create=vm.runInNewContext(
  "(function(vocabularyCatalog,localizedVocabulary,hasLocalizedGloss,dueVocabulary,placementState,nextBandFloor,vocabProgress){"
  +js+"\nreturn {chooseVocabulary,vocabularyChoices,nativeVocabularyChoicesReady};})"
 );
 return create(()=>base,localizedVocabulary,hasLocalizedGloss,()=>[],
  ()=>({recovery:1,forceProbe:false,calibrationRemaining:12}),()=>61,()=>({lastSeenAt:0}));
}
function checkThreeChoices(queue,native){
 for(let i=0;i<30;i++){
  const word=queue.chooseVocabulary(50,undefined,i,native);
  const choices=queue.vocabularyChoices(word,native);
  assert.equal(choices.length,3,"every question should show three choices");
  assert.equal(new Set(choices).size,3,"choices should not duplicate meanings");
  assert.equal(choices.filter(x=>x===word[1]).length,1,"exactly one correct choice");
 }
}
test("Traditional Chinese built-in vocabulary works offline without generated content",()=>{
 const q=loadQueue();
 checkThreeChoices(q,"zh-TW");
});
test("untranslated and partially translated native-language pools fall back to playable built-in choices",()=>{
 const empty=loadQueue();
 assert.equal(empty.nativeVocabularyChoicesReady("ja"),false);
 checkThreeChoices(empty,"ja");
 const partial=loadQueue({apple:"りんご"});
 assert.equal(partial.nativeVocabularyChoicesReady("ja"),false);
 checkThreeChoices(partial,"ja");
 const identical=loadQueue({apple:"同じ",book:"同じ",chair:"同じ"});
 assert.equal(identical.nativeVocabularyChoicesReady("ja"),false);
 checkThreeChoices(identical,"ja");
});
test("native-language choices activate when three distinct translations are available",()=>{
 const localized=loadQueue({apple:"りんご",book:"本",chair:"いす",school:"学校",music:"音楽",water:"みず"});
 assert.equal(localized.nativeVocabularyChoicesReady("ja"),true);
 checkThreeChoices(localized,"ja");
 for(let i=0;i<20;i++){
  const selected=localized.chooseVocabulary(50,undefined,i,"ja");
  assert.notEqual(selected[1],base.find(w=>w[0]===selected[0])[1]);
 }
});
test("the page does not lock answers while AI content is pending or failed",()=>{
 const page=fs.readFileSync("web-spa/src/teacher/VocabularyPage.tsx","utf8");
 assert.match(page,/if\(answerLockRef\.current\|\|revealed\|\|showCompletion\)return/);
 assert.match(page,/disabled=\{revealed\}/);
 assert.doesNotMatch(page,/disabled=\{revealed\|\|needsContent\}/);
 assert.match(page,/recordVocab\(word\[0\],correct,language\)/);
 assert.match(page,/setWord\(previous=>chooseVocabulary\(score,previous,done,native,language\)\)/);
 assert.doesNotMatch(page,/setTimeout\s*\(\s*\(\)\s*=>\s*\{\s*setWord/,"Answer reveal must wait for explicit next");
 assert.match(page,/setShowCompletion\(true\)/);
 assert.match(page,/onClick=\{nextQuestion\}/);
 assert.match(page,/onClick=\{continuePractice\}/);
 for(const locale of ["en","zh-TW"]){
  const translations=JSON.parse(fs.readFileSync("web-spa/src/i18n/locales/"+locale+"/teacher.json","utf8"));
  assert.ok(translations.vocabulary.fallbackNotice);
  assert.ok(translations.vocabulary.partialNotice);
 }
});
