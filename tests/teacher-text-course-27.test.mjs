import{test}from"node:test";
import assert from"node:assert/strict";
import{textCourseTasksDone}from"../web-spa/src/teacher/courseTextAssessment.mjs";
const goals=[{keywords:["latte","coffee","tea"]},{keywords:["oat milk","almond milk","less ice"]},{keywords:["pay","card","cash"]}];
const dialogue=[
 {role:"assistant",text:"Try saying coffee, oat milk and card."},
 {role:"user",text:"I'd like a latte with oat milk, please."},
 {role:"assistant",text:"Sure, how would you like to pay?"},
 {role:"user",text:"Can I pay by card?"},
 {role:"assistant",text:"Yes, of course."}
];
test("two confirmed exchanges with all scenario tasks finish text practice",()=>{
 assert.equal(textCourseTasksDone(goals,dialogue),true);
});
test("teacher hints alone do not complete any student mission",()=>{
 assert.equal(textCourseTasksDone(goals,[
  {role:"assistant",text:"latte oat milk pay card"},
  {role:"user",text:"hello"},{role:"assistant",text:"sure"},
  {role:"user",text:"thanks"},{role:"assistant",text:"bye"}
 ]),false);
});
test("pending user turn and single exchange cannot finish a lesson",()=>{
 assert.equal(textCourseTasksDone(goals,dialogue.slice(0,-1)),false);
 assert.equal(textCourseTasksDone(goals,[
  {role:"user",text:"A latte with oat milk, can I pay by card?"},
  {role:"assistant",text:"Sure!"}
 ]),false);
});
test("whole phrase match avoids accidental keyword substrings",()=>{
 assert.equal(textCourseTasksDone([{keywords:["ice"]},{keywords:["card"]}],[
  {role:"user",text:"The spice was nice."},{role:"assistant",text:"Okay"},
  {role:"user",text:"I'll use a card"},{role:"assistant",text:"Sure"}
 ]),false);
});
test("malformed goals and messages cannot award completion",()=>{
 assert.equal(textCourseTasksDone([],dialogue),false);
 assert.equal(textCourseTasksDone(goals,[]),false);
 assert.equal(textCourseTasksDone([{keywords:[]}],dialogue),false);
});
