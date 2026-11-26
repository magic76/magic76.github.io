const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const protocol=fs.readFileSync(root+"/web-spa/src/teacher/boardProtocol.ts","utf8");
const src=stripTypeScriptTypes(protocol,{mode:"strip"}).replace(/\bexport\s+(?=(?:const|function)\b)/g,"");
const board={};
vm.runInNewContext(src+"\nObject.assign(board,{fallbackBoard,exampleBoardFormats,validateBoardPatch,applyBoardPatch});",{board});
const format=(turn,cards=[])=>board.fallbackBoard(turn,cards);
test("non-tool demo explicitly covers all eleven safe board formats",()=>{
 const output=format({input:"請展示多一點卡片種類",output:""});
 assert.ok(output);
 assert.equal(output.action,"replace");
 const types=Array.from(new Set(Array.from(output.cards,c=>c.type)));
 assert.equal(types.length,11);
 assert.ok(types.includes("flashcard"));assert.ok(types.includes("dialogue"));
 assert.ok(types.includes("timeline"));assert.ok(types.includes("quiz"));
 assert.ok(types.includes("speaking"));assert.ok(types.includes("comparison"));
 for(const card of output.cards){
  assert.match(card.title,/格式示範/);
  assert.ok(board.validateBoardPatch({action:"upsert",cards:[card]}));
 }
});
test("no-tool mode uses grounded dialogue, comparison, vocabulary and chronology",()=>{
 const dialogue=format({input:"用情境對話卡整理",output:"Clerk: Do you have a reservation?\nGuest: Yes, under Chen."});
 assert.equal(dialogue.cards[0].type,"dialogue");
 assert.deepEqual(Array.from(dialogue.cards[0].pairs,p=>p.source),["Clerk","Guest"]);
 const compare=format({input:"請給我比較卡",output:"have been: related to now\nhad been: before another past event"});
 assert.equal(compare.cards[0].type,"comparison");
 assert.equal(compare.cards[0].pairs[1].target,"before another past event");
 const vocab=format({input:"請做單字表",output:"reservation: a booking\ncheck in: arrive and register"});
 assert.equal(vocab.cards[0].type,"vocabulary");
 const timeline=format({input:"給我一條時間軸",output:"First we arrive. Then we check in. Finally we enter our room."});
 assert.equal(timeline.cards[0].type,"timeline");
 assert.equal(timeline.cards[0].points.length,3);
 assert.match(timeline.cards[0].points[2].note,/Finally/);
});
test("flashcards and grounded multiple-choice checks reuse actual previous pairs",()=>{
 const cards=[{id:"vocab",type:"vocabulary",title:"Two words",body:"",pairs:[
  {source:"apple",target:"蘋果"},{source:"orange",target:"柳橙"}
 ],points:[],questions:[]}];
 const flash=format({input:"做翻面卡",output:""},cards);
 assert.equal(flash.cards[0].type,"flashcard");
 assert.equal(flash.cards[0].pairs[1].source,"orange");
 const quiz=format({input:"考我",output:""},cards);
 assert.equal(quiz.cards[0].type,"quiz");
 assert.equal(quiz.cards[0].questions.length,2);
 assert.ok(board.validateBoardPatch(quiz));
});
test("prior dedicated have-been quiz remains stable; ordinary transcript has safe fallback",()=>{
 const cards=board.applyBoardPatch([],format({input:"have been 跟 had been 差在哪裡",output:"Let me explain."},[]));
 assert.ok(cards.some(card=>card.type==="timeline"));
 const quiz=format({input:"考我三題",output:"Try these"},cards);
 assert.equal(quiz.action,"replace");
 assert.equal(quiz.cards[0].questions[1].answerIndex,1);
 assert.ok(["steps","explanation"].includes(format({input:"Explain a general topic",output:"Only one sentence."}).cards[0].type));
});
test("3.8 model gets same first-party tools and cannot falsely mark demo as Live",()=>{
 const page=fs.readFileSync(root+"/web-spa/src/teacher/TeacherBoardPage.tsx","utf8");
 const zh=JSON.parse(fs.readFileSync(root+"/web-spa/src/i18n/locales/zh-TW/teacher.json","utf8"));
 assert.match(page,/tools:\[\{functionDeclarations:\[\.\.\.BOARD_TOOLS\[0\]\.functionDeclarations/);
 assert.doesNotMatch(page,/tools:liveEnabled\?/);
 assert.doesNotMatch(page,/s\.liveModel==="gemini-3\.1-flash-live-preview"/);
 assert.match(page,/onToolsUnavailable:\(\)=>setToolsUnavailable\(true\)/);
 assert.match(page,/className="teaching-board-formats-button" onClick=\{showFormats\}/);
 assert.match(page,/setShowingDemo\(true\)/);
 assert.ok(zh.board.demoHint.includes("並非即時 AI"));
 assert.ok(!zh.board.modelFallbackHint.includes("3.1"));
});


test("natural role-labelled teaching turns create actual dialogue cards without format commands",()=>{
 const turn={input:"Let's practice checking into a hotel.",output:"Receptionist: Welcome! Do you have a booking?\nGuest: Yes, under Chen."};
 const patch=format(turn);
 assert.equal(patch.cards[0].type,"dialogue");
 assert.deepEqual(Array.from(patch.cards[0].pairs,p=>p.source),["Receptionist","Guest"]);
 assert.ok(patch.cards[0].pairs[0].target.includes("booking"));
});
test("natural term-definition pairs become vocabulary, but comparison requests stay comparison",()=>{
 const spoken="reservation: a room booking\ncheck in: arrive and register";
 assert.equal(format({input:"Please teach me hotel expressions",output:spoken}).cards[0].type,"vocabulary");
 const comparison=format({input:"Please compare the terms",output:spoken});
 assert.equal(comparison.cards[0].type,"comparison");
});
test("single page scroll places the lesson navigator before the card and exposes context tools",()=>{
 const page=fs.readFileSync(root+"/web-spa/src/teacher/TeacherBoardPage.tsx","utf8");
 const styles=fs.readFileSync(root+"/web-spa/src/teacher/teachingBoard.css","utf8");
 const picker=fs.readFileSync(root+"/web-spa/src/teacher/GuidedLessonPanel.tsx","utf8");
 const controls=fs.readFileSync(root+"/web-spa/src/teacher/BoardPresentationBar.tsx","utf8");
 assert.ok(page.indexOf('className={"teaching-board-navigator"')<page.indexOf('className={"teaching-board-stage"'));
 assert.match(page,/<BoardPresentationBar onChoose=\{choosePresentation\}/);
 assert.match(page,/PRESENTATION_CUES\[format\]/);
 assert.match(page,/formatRequestRef\.current=kind/);
 assert.match(styles,/\.teaching-board-stage\{height:auto;min-height:235px;overflow:visible/);
 assert.match(styles,/\.teaching-board-stage\{height:auto;min-height:210px/);
 assert.doesNotMatch(page,/stage\.scrollTop/);
 assert.match(picker,/<section className="teaching-board-lesson-picker teaching-board-catalog"/);
 assert.match(controls,/type BoardPresentation="compare"\|"timeline"\|"dialogue"\|"flashcard"\|"quiz"/);
 assert.ok(!controls.includes("fetch("));
});

test("whiteboard prep exposes a category catalog and queued topic; active teaching hides the picker",()=>{
 const page=fs.readFileSync(root+"/web-spa/src/teacher/TeacherBoardPage.tsx","utf8");
 const picker=fs.readFileSync(root+"/web-spa/src/teacher/GuidedLessonPanel.tsx","utf8");
 const quick=fs.readFileSync(root+"/web-spa/src/teacher/BoardQuickControls.tsx","utf8");
 assert.match(picker,/!active&&\(!selected\|\|expanded\)/);
 assert.match(picker,/LESSON_CATEGORIES\.map/);
 assert.match(picker,/aria-pressed=\{category===c.id\}/);
 assert.match(picker,/onTopic\(topic.trim\(\)\)/);
 assert.match(page,/setPendingTopic\(topic\)/);
 assert.match(page,/const opening=\(pendingTopic&&!lessonId\?/);
 assert.match(page,/lessonPrompt\(findLesson\(lessonRef.current\)!,lessonStep\)/);
 assert.match(quick,/\{active&&<div className="teaching-board-quick-row"/);
 assert.match(quick,/\{hasCards&&<button/);
 assert.doesNotMatch(page,/CREW · LIVE BOARD/);
 assert.ok(page.indexOf('className={"teaching-board-stage"')<page.indexOf('className="teaching-board-more"'));
});
