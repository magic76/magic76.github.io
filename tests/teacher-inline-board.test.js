const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(root+"/web-spa/src/teacher/"+p,"utf8");
const strip=s=>stripTypeScriptTypes(s,{mode:"strip"}).replace(/^import .*;\s*$/gm,"").replace(/\bexport\s+(?=(?:const|function)\b)/g,"");
const api={};
vm.runInNewContext(strip(read("boardProtocol.ts"))+"\n"+strip(read("inlineBoardGate.ts"))+"\n"+strip(read("boardLessons.ts"))+"\n"+strip(read("inlineBoardFallback.ts"))+"\nObject.assign(api,{newInlineGate,proposeInlineBoard,finishInlineTurn,dismissInlineBoard,observeInlineInput,BOARD_FUNCTION,backupCard});",{api});
const card=(title="Past tenses",id="past")=>({id,type:"comparison",title,pairs:[{source:"went",target:"finished past"},{source:"have gone",target:"present relevance"}]});
const proposal=(g,now=100,auto=true,c=card())=>api.proposeInlineBoard(g,{name:api.BOARD_FUNCTION,args:{action:"upsert",cards:[c]}},auto,now);
const finish=(g,input="",now=100,auto=true,valid=true,output="")=>api.finishInlineTurn(g,input,valid,auto,now,api.backupCard,output);
const begin=(g,input="Can you help me?")=>api.observeInlineInput(g,input);
test("opening rejects automatic tool; valid tool displays before turn completion without keywords or transcript",()=>{
 const g=api.newInlineGate();assert.equal(proposal(g).error,"opening");
 finish(g,"",101);
 const result=proposal(g,102);
 assert.equal(result.card.id,"past");assert.equal(g.accepted,1);assert.equal(g.completedTurns,1);
 assert.equal(finish(g,"",103),null);assert.equal(g.accepted,1);
});
test("semantic decision is the model's, not the learner keyword regex",()=>{
 const g=api.newInlineGate();begin(g,"Why is that?");
 assert.equal(proposal(g).card.id,"past");assert.equal(g.validCards,1);
 assert.equal(proposal(g,101).error,"already-shown-this-turn");
});
test("90 second cooldown without 3-turn restriction; same material deduplicated",()=>{
 const g=api.newInlineGate();begin(g);assert.ok(proposal(g,100).card);finish(g,"",101);
 begin(g);assert.equal(proposal(g,90099,true,card("New","new")).error,"cooldown");finish(g,"",90099);
 begin(g);assert.ok(proposal(g,90100,true,card("New","new")).card);finish(g,"",90101);
 begin(g);assert.equal(proposal(g,200000,true,card("New","different-id")).error,"duplicate");
});
test("manual request bypasses cooldown, auto off and dismissal; explicit opt-out never bypasses",()=>{
 const g=api.newInlineGate();begin(g);assert.ok(proposal(g,1).card);finish(g,"",2);
 api.dismissInlineBoard(g,10);begin(g);assert.equal(proposal(g,100000,true,card("New","new")).error,"dismiss-cooldown");
 begin(g,"請打開白板");assert.ok(proposal(g,100001,false,card("New","new")).card);finish(g,"",100002);
 begin(g,"不要使用白板");assert.equal(proposal(g,100003,false).error,"learner-opt-out");finish(g,"",100004);
 assert.equal(g.outcome,"dismissed");
});
test("invalid cards, auto disabled, and manual menu request",()=>{
 const g=api.newInlineGate();begin(g);
 assert.equal(proposal(g,1,true,{id:"empty",type:"comparison",title:"Empty"}).error,"invalid-or-low-value-card");
 assert.equal(proposal(g,2,false).error,"automatic-disabled");
 g.requested=true;assert.ok(proposal(g,3,false).card);assert.equal(finish(g,"",4,false),null);assert.equal(g.outcome,"shown");
});
const screenshotSpeech='The "-ed" ending has three sounds. It sounds like a "t" after unvoiced sounds,like a "d" after voiced sounds,and like an "id"syllable after\'t\' or \'d\' sounds.';
test("exact screenshot transcript restores actual curated card even with ASR mismatch, without manual request",()=>{
 const g=api.newInlineGate();begin(g,"Eddie how do I say it?");
 const result=finish(g,"Eddie how do I say it?",100,true,true,screenshotSpeech);
 assert.equal(result.id,"ed-sounds-concept");assert.deepEqual(Array.from(result.pairs,p=>p.source),["/t/","/d/","/ɪd/"]);assert.equal(g.fallbacks,1);
});
test("no generic note automatically, manual explicit notes grounded in actual spoken text",()=>{
 const g=api.newInlineGate();const plain="Present simple describes habits and repeated actions. The third person singular usually takes an s.";
 assert.equal(finish(g,"Good morning",100,true,true,plain),null);
 g.requested=true;assert.equal(finish(g,"",101,false,true,plain).body,plain);
});
test("failed explicit request is observable and no fake card appears",()=>{
 const g=api.newInlineGate();g.requested=true;assert.equal(finish(g,"",100),null);assert.equal(g.outcome,"missing");assert.equal(g.lastReason,"no-matching-card");
 assert.equal(g.events.some(e=>e.reason==="no-matching-card"),true);
});
test("diagnostics are bounded, record rejection reason and never include transcript or card payload",()=>{
 const g=api.newInlineGate();begin(g,"PRIVATE learner text");for(let i=0;i<60;i++)proposal(g,i,false);
 assert.ok(g.events.length<=40);assert.equal(g.reasons["automatic-disabled"],60);
 assert.doesNotMatch(JSON.stringify(g.events),/PRIVATE|Past tenses|went/);
});
test("integration renders from tool callback, keeps rollback and existing standalone board, admin diagnostic gate",()=>{
 const live=read("LivePage.tsx"),gate=read("inlineBoardGate.ts"),ui=read("InlineTeacherBoard.tsx");
 assert.match(gate,/INLINE_TEACHER_BOARD_ENABLED=true/);
 assert.match(live,/tools:inlineBoard\.tools,onToolCall:inlineBoard\.onToolCall/);
 assert.match(live,/onLearnerTranscript:inlineBoard\.observe/);
 assert.match(ui,/if\(result\.card\)\{show\(result\.card\)/);
 assert.match(ui,/enabled\?INLINE_BOARD_TOOLS:undefined/);
 assert.match(ui,/localStorage\.setItem\(PREF/);
 assert.match(live,/navigate\("\/teacher\/board"\)/);
 assert.match(ui,/fetch\("\/api\/usage\/admin"/);assert.match(ui,/v\?\.admin===true/);assert.match(ui,/admin&&/);
 assert.ok(Buffer.byteLength(live)<26000);
});
