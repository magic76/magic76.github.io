import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {appendLearningFeedbackTool,createLearningFeedbackQueue,validateLearningFeedback,preservesEnglishGrammarContent,LEARNING_FEEDBACK_FUNCTION} from "../web-spa/src/live/learningFeedback.mjs";
const correction={original:"Yesterday I go home.",corrected:"Yesterday I went home.",explanation:"Past tense.",type:"grammar"};
test("feedback accepts bounded corrections, not unchanged text or pronunciation claims",()=>{
 assert.deepEqual(validateLearningFeedback(correction),correction);
 for(const args of [null,{...correction,type:"pronunciation"},{...correction,corrected:"Yesterday I go home!"},{...correction,explanation:"x".repeat(241)}])assert.equal(validateLearningFeedback(args),null);
});
test("only matching learner transcript receives feedback; duplicates and pending data do not leak",()=>{
 const queue=createLearningFeedbackQueue();
 assert.deepEqual(queue.propose({id:"a",args:correction}),{ok:true});
 assert.equal(queue.complete("Other speech."),null);
 assert.equal(queue.complete(correction.original),null);
 queue.propose({id:"b",args:correction});
 assert.deepEqual(queue.complete("Yesterday I go home!","en"),{...correction,original:"Yesterday I go home!"});
 queue.propose({id:"b",args:correction});
 assert.equal(queue.complete(correction.original),null);
 queue.propose({id:"c",args:correction});queue.clear();
 assert.equal(queue.complete(correction.original),null);
});
test("feedback tool preserves existing declarations and is deduplicated",()=>{
 const existing={name:"save_friend_memory"};
 const tools=appendLearningFeedbackTool([{functionDeclarations:[existing]}]);
 assert.deepEqual(tools[0].functionDeclarations.map(x=>x.name),[existing.name,LEARNING_FEEDBACK_FUNCTION]);
 assert.deepEqual(appendLearningFeedbackTool(tools),tools);
});
test("friend and teacher opt in; guest tool is explicitly negotiated",()=>{
 const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
 assert.match(read("web-spa/src/friends/FriendLiveConversation.tsx"),/learningFeedback:true/);
 assert.match(read("web-spa/src/teacher/LivePage.tsx"),/learningFeedback:!fortuneKind/);
 assert.match(read("web-spa/src/teacher/TeacherBoardPage.tsx"),/learningFeedback:true/);
 assert.match(read("functions/api/guest/token.js"),/guestLearningFeedbackRequested/);
 assert.match(read("web-spa/src/live/useLiveSession.ts"),/grant\.learningFeedback===true/);
});

test("reported school-to-cafe regression is rejected; tense-only repair is accepted",()=>{
 const queue=createLearningFeedbackQueue();
 const original="I go to school today.";
 const wrong={original,corrected:"I went to a new cafe today.",explanation:"Past tense.",type:"grammar"};
 queue.propose({id:"bad",args:wrong});
 assert.equal(queue.complete(original,"英文"),null);
 queue.propose({id:"good",args:{...wrong,corrected:"I went to school today."}});
 assert.equal(queue.complete(original,"英文")?.corrected,"I went to school today.");
 queue.propose({id:"fragment",args:{...wrong,original:"I go",corrected:"I went"}});
 assert.equal(queue.complete(original,"en"),null);
});
test("English grammar repairs preserve content words, quantities and polarity",()=>{
 for(const [a,b] of [["She go to school.","She goes to school."],["I buy some apples.","I bought some apples."],["He is play football.","He is playing football."],["I have two child.","I have two children."]])assert.equal(preservesEnglishGrammarContent(a,b),true,a);
 for(const [a,b] of [["I go to school today.","I went to a new cafe today."],["I like tea.","I like coffee."],["I bought 2 books.","I bought 3 books."],["I do not like tea.","I like tea."]])assert.equal(preservesEnglishGrammarContent(a,b),false,a);
});
