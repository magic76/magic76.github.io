const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const ts=fs.readFileSync(root+"/web-spa/src/teacher/teachingDirector.ts","utf8");
const src=stripTypeScriptTypes(ts,{mode:"strip"}).replace(/\bexport\s+(?=(?:const|function)\b)/g,"");
const director={};
vm.runInNewContext(src+"\nObject.assign(director,{DIRECTOR_FUNCTION,DIRECTOR_TOOL,EMPTY_DIRECTOR,validateDirectorCommand,applyDirectorCommand,directorAfterPatch,directorAfterAnswer,chooseReviewCard});",{director});
const concept={id:"rule",type:"comparison",title:"Have been vs had been",body:"",pairs:[{source:"have been",target:"now"},{source:"had been",target:"past"}],points:[],questions:[]};
const timeline={...concept,id:"time",type:"timeline",title:"Timeline",pairs:[],points:[{label:"now",note:"today"}]};
const quiz={...concept,id:"quiz",type:"quiz",title:"Practice",pairs:[],questions:[
 {question:"Which tense?",options:["have been","had been"],answerIndex:1,explanation:"past before past"},
 {question:"What next?",options:["has been","had been"],answerIndex:0,explanation:"still applies"}
]};
test("Gemini control schema offers five bounded stage operations",()=>{
 assert.equal(director.DIRECTOR_FUNCTION,"control_teaching_stage");
 const fn=director.DIRECTOR_TOOL.functionDeclarations[0];
 assert.equal(fn.name,director.DIRECTOR_FUNCTION);
 assert.equal(fn.parameters.properties.action.enum.length,5);
 const v=director.validateDirectorCommand({action:"reveal",cardId:"rule",index:1},[concept]);
 assert.equal(v.index,1);
 assert.equal(director.validateDirectorCommand({action:"reveal",cardId:"rule",index:9},[concept]),null);
 assert.equal(director.validateDirectorCommand({action:"ask",cardId:"rule",index:0},[concept]),null);
 assert.equal(director.validateDirectorCommand({action:"focus",cardId:"bogus"},[concept]),null);
 assert.equal(director.validateDirectorCommand({action:"focus",cardId:"../evil"},[concept]),null);
 assert.equal(director.validateDirectorCommand({action:"focus",cardId:"rule",html:"x".repeat(3000)},[concept]),null);
});
test("Teacher can focus and progressively reveal the same card without adding cards",()=>{
 const cards=[concept,timeline];
 let s=director.directorAfterPatch(director.EMPTY_DIRECTOR,cards,[concept]);
 assert.equal(s.cardId,"rule");assert.equal(s.phase,"explaining");
 s=director.applyDirectorCommand(s,director.validateDirectorCommand({action:"reveal",cardId:"rule",index:0},cards),cards,{});
 assert.equal(s.revealed,1);assert.equal(s.focusIndex,0);
 s=director.applyDirectorCommand(s,director.validateDirectorCommand({action:"reveal",cardId:"rule",index:1},cards),cards,{});
 assert.equal(s.revealed,2);assert.equal(s.focusIndex,1);
 s=director.applyDirectorCommand(s,director.validateDirectorCommand({action:"focus",cardId:"time",index:0},cards),cards,{});
 assert.equal(s.cardId,"time");assert.equal(s.revealed,null);
});
test("Question gate blocks new quiz and page changes until a learner answers",()=>{
 const cards=[concept,quiz];
 let s=director.directorAfterPatch(director.EMPTY_DIRECTOR,cards,[concept,quiz]);
 assert.equal(s.cardId,"quiz");assert.equal(s.phase,"awaiting");
 const other=director.validateDirectorCommand({action:"focus",cardId:"rule"},cards);
 const skip=director.validateDirectorCommand({action:"ask",cardId:"quiz",index:1},cards);
 assert.equal(director.applyDirectorCommand(s,other,cards,{}),null);
 assert.equal(director.applyDirectorCommand(s,skip,cards,{}),null);
 const same=director.validateDirectorCommand({action:"ask",cardId:"quiz",index:0},cards);
 assert.equal(director.applyDirectorCommand(s,same,cards,{}).phase,"awaiting");
 assert.equal(director.directorAfterPatch(s,[...cards,timeline],[timeline]).cardId,"quiz");
 assert.equal(director.applyDirectorCommand(s,director.validateDirectorCommand({action:"continue",cardId:"quiz"},cards),cards,{}),null);
});
test("Tap answers give deterministic feedback, review the previous concept on errors, and allow next question",()=>{
 const cards=[concept,timeline,quiz];
 const s=director.directorAfterPatch(director.EMPTY_DIRECTOR,cards,[quiz]);
 const bad=director.directorAfterAnswer(s,quiz,0,0,cards);
 assert.equal(bad.phase,"feedback");assert.equal(bad.result,"incorrect");assert.equal(bad.reviewCardId,"rule");
 const wrong={["quiz:0"]:0};
 const response=director.applyDirectorCommand(bad,director.validateDirectorCommand({action:"feedback",cardId:"quiz",index:0},cards),cards,wrong);
 assert.equal(response.result,"incorrect");
 const cont=director.applyDirectorCommand(response,director.validateDirectorCommand({action:"continue",cardId:"quiz"},cards),cards,wrong);
 assert.equal(cont.phase,"awaiting");assert.equal(cont.quizIndex,1);
 const good=director.directorAfterAnswer(cont,quiz,1,0,cards);
 assert.equal(good.result,"correct");assert.equal(good.reviewCardId,null);
 assert.equal(director.directorAfterAnswer(good,quiz,1,0,cards),null);
});
test("Only teacher board uses director tools and quiz gate; no persistence added",()=>{
 const page=fs.readFileSync(root+"/web-spa/src/teacher/TeacherBoardPage.tsx","utf8");
 const card=fs.readFileSync(root+"/web-spa/src/teacher/TeachingCard.tsx","utf8");
 assert.match(page,/DIRECTOR_TOOL\.functionDeclarations/);
 assert.match(page,/learner-answer-pending/);
 assert.match(page,/persistHistory:false,sessionKind:"teacher"/);
 assert.match(page,/directorAfterAnswer/);
 assert.match(page,/onNavigate=\{index=>navigateCard\(focusedCard\.id,index\)\}/);
 assert.doesNotMatch(page,/localStorage\.setItem|saveLive\(/);
 assert.match(card,/revealCount/);
 assert.match(card,/disabled=\{!answered\|\|index===card\.questions\.length-1\}/);
});
