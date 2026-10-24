const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("flashcards are two-sided real 180-degree 3D turns, no fake two-degree flip",()=>{
 const css=read("web-spa/src/teacher/teachingBoard.css");
 assert.match(css,/\.teaching-board-flash-study \.teaching-board-flash\.is-flipped \.teaching-board-flash-inner\{transform:rotateY\(180deg\)\}/);
 assert.match(css,/backface-visibility:hidden/);
 assert.match(css,/perspective:1200px/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.teaching-board-flash-inner\{transition:none/);
 const card=read("web-spa/src/teacher/BoardFlashcards.tsx");
 assert.match(card,/aria-pressed=\{flipped\}/);
 assert.match(card,/aria-hidden=\{flipped\}/);
 assert.match(card,/aria-hidden=\{!flipped\}/);
 assert.match(card,/setFlipped\(old=>!old\)/);
 assert.match(card,/focusIndex/);
});

test("learner ratings are self-reported and request teacher practice explicitly",()=>{
 const card=read("web-spa/src/teacher/BoardFlashcards.tsx");
 const page=read("web-spa/src/teacher/TeacherBoardPage.tsx");
 const policy=read("web-spa/src/teacher/boardVisualPolicy.ts");
 assert.match(card,/ratings\[index\]/);
 assert.match(card,/rate\("again"\)/);
 assert.match(card,/rate\("known"\)/);
 assert.match(card,/onPractice\?\.\(card,chosen\.slice\(0,5\),scope\)/);
 assert.match(page,/onFlashcardPractice=\{coachFlashcard\}/);
 assert.match(policy,/flashcards?/i);
 const source=read("web-spa/src/teacher/boardRecallCoach.ts")
  .replace(/import type [^\n]+\n/g,"").replace(/export /g,"");
 const context={};vm.runInNewContext(stripTypeScriptTypes(source,{mode:"strip"})+"\nthis.prompt=flashcardTeacherPrompt;",context);
 const prompt=context.prompt({title:"Hotel",pairs:[]},[{source:"reservation",target:"訂房",rating:"again"}],"item");
 assert.match(prompt,/reservation/);
 assert.match(prompt,/self-rated/i);
 assert.match(prompt,/WAIT/);
 assert.match(prompt,/not an objective score/);
 assert.doesNotMatch(prompt,/correct answer is/i);
});

test("review copy is localized for all teacher UI locales",()=>{
 for(const lang of ["zh-TW","en","ja","ko","de","es","fr","id","pt-BR","th","vi"]){
  const o=JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/teacher.json"));
  for(const k of ["front","back","tap","recallFirst","again","known","practice","progress","reviewWithTeacher","restart"])
   assert.ok(typeof o.board.flash[k]==="string"&&o.board.flash[k].trim(),lang+" "+k);
 }
});
