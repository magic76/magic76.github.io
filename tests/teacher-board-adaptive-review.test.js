const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const load=(file,names,extra={})=>{
 const src=stripTypeScriptTypes(read(file),{mode:"strip"}).replace(/^import .+?;\s*$/gm,"").replace(/\bexport\s+(?=(?:function|const|type)\b)/g,"");
 const ctx={...extra};vm.runInNewContext(src+"\nObject.assign(this,{"+names.join(",")+"});",ctx);return ctx;
};
const storage=()=>{
 const m=new Map();return {
  getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),
  get length(){return m.size},key:i=>[...m.keys()][i]||null,_entries:m
 };
};

test("only self-rated, non-sensitive vocabulary is stored; grades never inferred",()=>{
 const store=storage();
 const api=load("web-spa/src/teacher/boardReviewSchedule.ts",["recordBoardReview","loadBoardReviews","dueBoardReviews"],{localStorage:store});
 const now=Date.UTC(2026,9,24);
 api.recordBoardReview("en","emma",{source:"reservation",target:"訂房"},"again",true,now);
 const a=api.dueBoardReviews("en","emma",true,now);
 assert.equal(a.length,1);assert.equal(a[0].level,0);assert.equal(a[0].source,"reservation");
 assert.equal(api.loadBoardReviews("en","alex",true,now).length,0);
 assert.equal(api.loadBoardReviews("ja","emma",true,now).length,0);
 assert.equal(api.loadBoardReviews("en","emma",false,now).length,0);
 api.recordBoardReview("en","emma",{source:"my email",target:"test@example.com"},"known",true,now);
 assert.equal(api.loadBoardReviews("en","emma",true,now).length,1);
 assert.equal(store._entries.size,1);
 assert.doesNotMatch([...store._entries.values()].join(" "),"test@example.com");
});

test("review intervals reset when missed, progress 1/3/7 days if known, with bounded storage",()=>{
 const api=load("web-spa/src/teacher/boardReviewSchedule.ts",["recordBoardReview","loadBoardReviews","dueBoardReviews","clearBoardReviews","clearAllBoardReviews","clearBoardReviewsForLanguage"],{localStorage:storage()});
 const now=Date.UTC(2026,9,24),DAY=86400000;
 const pair={source:"check in",target:"arrive and register"};
 let a=api.recordBoardReview("English","alex",pair,"known",true,now)[0];assert.equal(a.level,1);assert.equal(a.dueAt,now+DAY);
 a=api.recordBoardReview("English","alex",pair,"known",true,now+DAY)[0];assert.equal(a.level,2);assert.equal(a.dueAt,now+4*DAY);
 a=api.recordBoardReview("English","alex",pair,"again",true,now+2*DAY)[0];assert.equal(a.level,0);assert.equal(a.dueAt,now+2*DAY);
 for(let i=0;i<80;i++)api.recordBoardReview("English","alex",{source:"word "+i,target:"meaning "+i},"again",true,now+3*DAY);
 assert.equal(api.loadBoardReviews("English","alex",true,now+3*DAY).length,64);
 assert.equal(api.dueBoardReviews("English","alex",true,now+3*DAY).length,8);
 api.recordBoardReview("English","emma",pair,"again",true,now+3*DAY);
 api.clearBoardReviewsForLanguage("English");
 assert.equal(api.loadBoardReviews("English","emma",true,now+3*DAY).length,0);
 assert.equal(api.loadBoardReviews("English","alex",true,now+3*DAY).length,0);
});

test("disabled memory and clearing all remove local next-session traces",()=>{
 const storageMock=storage();
 const api=load("web-spa/src/teacher/boardReviewSchedule.ts",["recordBoardReview","loadBoardReviews","clearAllBoardReviews"],{localStorage:storageMock});
 const now=Date.UTC(2026,9,24),pair={source:"please",target:"拜託"};
 api.recordBoardReview("English","emma",pair,"again",false,now);
 assert.equal(storageMock.length,0);
 api.recordBoardReview("English","emma",pair,"again",true,now);
 api.recordBoardReview("Japanese","hana",pair,"again",true,now);
 assert.equal(storageMock.length,2);
 api.clearAllBoardReviews();assert.equal(storageMock.length,0);
 const memory=read("web-spa/src/teacher/studentMemory.ts");
 assert.match(memory,/if\(!enabled\)clearAllBoardReviews\(\)/);
 assert.match(memory,/clearBoardReviewsForLanguage\(language\)/);
});

test("adaptive quiz branching never advances unanswered or wrong answers",()=>{
 const api=load("web-spa/src/teacher/boardAdaptive.ts",["planAdaptiveNext"],{
  chooseReviewCard:(cards,id)=>cards.find(c=>c.id!==id&&c.type==="comparison")?.id||null
 });
 const concept={id:"rule",type:"comparison",pairs:[],points:[],questions:[]};
 const quiz={id:"quiz",type:"quiz",pairs:[],points:[],questions:[{question:"X",options:["a","b"],answerIndex:1},{question:"Y",options:["a","b"],answerIndex:0}]};
 const speaking={id:"say",type:"speaking",pairs:[],points:[],questions:[]};
 const cards=[concept,quiz,speaking];
 assert.equal(api.planAdaptiveNext(quiz,0,false,cards,true).kind,"review");
 assert.equal(api.planAdaptiveNext(quiz,0,false,cards,true).cardId,"rule");
 assert.equal(api.planAdaptiveNext(quiz,0,true,cards,true).kind,"next-question");
 assert.equal(api.planAdaptiveNext(quiz,1,true,cards,true).kind,"next-lesson");
 assert.equal(api.planAdaptiveNext(quiz,1,true,cards,false).kind,"next-exercise");
 assert.equal(api.planAdaptiveNext(quiz,-1,true,cards,true).kind,"stay");
 assert.equal(api.planAdaptiveNext(quiz,99,true,cards,true).kind,"stay");
 assert.equal(api.planAdaptiveNext(speaking,0,true,cards,true).kind,"stay");
});

test("adaptive triggering waits for real transcript plus completed teacher feedback, and honors lesson locks",()=>{
 const p=read("web-spa/src/teacher/TeacherBoardPage.tsx");
 assert.match(p,/pendingQuizRef\.current=\{cardId:card\.id,index,correct:next\.result==="correct"\}/);
 assert.match(p,/if\(pending&&turn\.output\?\.trim\(\)&&d\.phase==="feedback"/);
 assert.match(p,/pendingQuizRef\.current=null;/);
 assert.match(p,/if\(next\.kind==="review"\)reviewCard\(\)/);
 assert.match(p,/else if\(next\.kind==="next-question"\)navigateCard\(card\.id,next\.index\)/);
 assert.match(p,/else if\(next\.kind==="next-lesson"\)goLessonStep\(next\.index\)/);
 assert.match(p,/directorRef\.current\.phase==="awaiting"\|\|!reviews\.due\.length/);
 assert.match(p,/onFlashcardRate=\{rateFlashcard\}/);
 assert.match(p,/persistHistory:false/);
});
