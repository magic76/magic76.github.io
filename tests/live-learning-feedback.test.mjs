import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {appendLearningFeedbackTool,createLearningFeedbackQueue,validateLearningFeedback,LEARNING_FEEDBACK_FUNCTION} from "../web-spa/src/live/learningFeedback.mjs";
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
 assert.deepEqual(queue.complete("Yesterday I go home!"),correction);
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
