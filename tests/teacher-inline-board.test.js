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
vm.runInNewContext(strip(read("boardProtocol.ts"))+"\n"+strip(read("inlineBoardGate.ts"))+"\n"+strip(read("boardLessons.ts"))+"\n"+strip(read("inlineBoardFallback.ts"))+"\n"+strip(read("targetLanguages.ts"))+"\n"+strip(read("inlineLessonCatalog.ts"))+"\n"+strip(read("inlineLessonEngine.ts"))+"\n"+strip(read("visualReplyJournal.ts"))+"\n"+strip(read("teacherReplyComposer.ts"))+"\n"+strip(read("teacherReplyTemplates.ts"))+"\nObject.assign(api,{newInlineGate,proposeInlineBoard,finishInlineTurn,dismissInlineBoard,observeInlineInput,BOARD_FUNCTION,backupCard,INLINE_BOARD_POLICY,INLINE_FOCUS_FUNCTION,inlineFocusIndex,visualClaim,inlineLessonsFor,findInlineLesson,TARGET_LANGUAGES,startGuidedLesson,guidedCard,guidedPhase,guidedAnswer,guidedAttempt,guidedExplained,guidedCanAdvance,advanceGuidedLesson,guidedPrompt,appendVisualReply,sealVisualReplies,updateVisualReply,discardPendingVisualReplies,visualRepliesAt,teacherReplyTemplates,parseComposerChoice,replyFingerprint,composerPrompt});",{api});
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
test("one card per turn, no time cooldown, exact duplicate rejected",()=>{
 const g=api.newInlineGate();begin(g);assert.ok(proposal(g,100).card);assert.equal(proposal(g,101,true,card("New","new")).error,"already-shown-this-turn");finish(g,"",102);
 begin(g);assert.ok(proposal(g,103,true,card("New","new")).card);finish(g,"",104);
 begin(g);assert.equal(proposal(g,105,true,card("New","different-id")).error,"duplicate");
 const revised=card("New","new");revised.pairs[0].target="new explanation";
 assert.ok(proposal(g,106,true,revised).card);
});
test("OFF never accepts a manual or late tool call, opt-out respected, reopening has no dismissal cooldown",()=>{
 const g=api.newInlineGate();begin(g);assert.ok(proposal(g,1).card);finish(g,"",2);
 api.dismissInlineBoard(g,10);begin(g,"請打開白板");g.requested=true;
 assert.equal(proposal(g,11,false,card("New","new")).error,"mode-off");finish(g,"",12,false);
 begin(g,"請打開白板");assert.ok(proposal(g,13,true,card("New","new")).card);finish(g,"",14);
 begin(g,"不要使用白板");assert.equal(proposal(g,15,true).error,"learner-opt-out");finish(g,"",16);
 assert.equal(g.outcome,"dismissed");
});
test("invalid cards, OFF rejects even manual requests; ON permits explicit request",()=>{
 const g=api.newInlineGate();begin(g);
 assert.equal(proposal(g,1,true,{id:"empty",type:"comparison",title:"Empty"}).error,"invalid-or-low-value-card");
 assert.equal(proposal(g,2,false).error,"mode-off");
 g.requested=true;assert.equal(proposal(g,3,false).error,"mode-off");
 assert.ok(proposal(g,4,true).card);assert.equal(finish(g,"",5,true),null);assert.equal(g.outcome,"shown");
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
 g.requested=true;assert.equal(finish(g,"",101,true,true,plain).body,plain);
});
test("failed explicit request is observable and no fake card appears",()=>{
 const g=api.newInlineGate();g.requested=true;assert.equal(finish(g,"",100),null);assert.equal(g.outcome,"missing");assert.equal(g.lastReason,"no-matching-card");
 assert.equal(g.events.some(e=>e.reason==="no-matching-card"),true);
});
test("diagnostics are bounded, record rejection reason and never include transcript or card payload",()=>{
 const g=api.newInlineGate();begin(g,"PRIVATE learner text");for(let i=0;i<60;i++)proposal(g,i,false);
 assert.ok(g.events.length<=40);assert.equal(g.reasons["mode-off"],60);
 assert.doesNotMatch(JSON.stringify(g.events),/PRIVATE|Past tenses|went/);
});
test("integration renders from tool callback, keeps rollback and existing standalone board, admin diagnostic gate",()=>{
 const live=read("LivePage.tsx"),gate=read("inlineBoardGate.ts"),ui=read("InlineTeacherBoard.tsx");
 assert.match(gate,/INLINE_TEACHER_BOARD_ENABLED=true/);
 assert.match(live,/tools:inlineBoard\.tools,onToolCall:inlineBoard\.onToolCall/);
 assert.match(live,/onLearnerTranscript:inlineBoard\.observe/);
 assert.match(ui,/if\(result\.card\)\{show\(result\.card\)/);
 assert.match(ui,/enabled\?INLINE_BOARD_TOOLS:undefined/);
 assert.doesNotMatch(ui,/modeRef|modePending|setModeState/);
 assert.doesNotMatch(live,/navigate\("\/teacher\/board"\)/);
 assert.match(ui,/fetch\("\/api\/usage\/admin"/);assert.match(ui,/v\?\.admin===true/);assert.match(ui,/admin&&/);
 assert.ok(Buffer.byteLength(live)<26000);
});

test("positive proactive instruction explicitly calls tool for educational questions, not all small talk",()=>{
 assert.match(api.INLINE_BOARD_POLICY,/CALL update_teaching_board/);
 assert.match(api.INLINE_BOARD_POLICY,/Do not wait for the learner to request a board/);
 assert.match(api.INLINE_BOARD_POLICY,/Skip the tool for greetings/);
});
test("each supported learning language has distinct curated lesson content; unknown languages never fall back to English",()=>{
 assert.ok(api.inlineLessonsFor("英文").length>=20);
 for(const lang of api.TARGET_LANGUAGES){
  const items=api.inlineLessonsFor(lang.value);
  assert.ok(items.length>0,lang.value);
  assert.ok(items.every(l=>l.language===lang.code&&l.cards.length>0));
  assert.deepEqual(Array.from(api.inlineLessonsFor(lang.code),l=>l.id),Array.from(items,l=>l.id));
  for(const l of items)for(const c of l.cards)for(const q of c.questions){
   assert.ok(q.answerIndex>=0&&q.answerIndex<q.options.length);
   assert.equal(new Set(q.options).size,q.options.length);
  }
 }
 assert.equal(api.inlineLessonsFor("unknown").length,0);
 assert.equal(api.findInlineLesson("日文","ed-sounds"),undefined);
 assert.match(api.findInlineLesson("日文","ja-particles").cards[0].pairs[0].source,/は/);
 assert.match(api.findInlineLesson("韓文","ko-particles").cards[0].pairs[0].source,/은/);
 assert.equal(api.backupCard("ed ending",screenshotSpeech,false,"","ja"),null);
});
test("guided curriculum progresses deterministically without a tool; quiz and practice require learner actions",()=>{
 const l=api.findInlineLesson("日文","ja-particles");
 let s=api.startGuidedLesson(l);
 assert.equal(api.guidedCard(s).id,"ja-particles-rule");assert.equal(api.advanceGuidedLesson(s),null);
 s=api.advanceGuidedLesson(api.guidedExplained(s,true));assert.equal(api.guidedPhase(s),"examples");
 s=api.advanceGuidedLesson(api.guidedExplained(s,true));assert.equal(api.guidedPhase(s),"quiz");
 s=api.guidedExplained(s,true);assert.equal(api.guidedCanAdvance(s),false);
 assert.doesNotMatch(api.guidedPrompt(s,"日文"),/answerIndex|marks the questioned subject/);
 const first=s;s=api.guidedAnswer(s,0,8);assert.equal(s,first);
 s=api.guidedAnswer(s,0,1);assert.equal(s.correct,1);assert.equal(api.guidedAnswer(s,0,0),s);
 s=api.advanceGuidedLesson(s);assert.equal(api.guidedPhase(s),"practice");
 s=api.guidedExplained(s,true);assert.equal(api.guidedCanAdvance(s),false);
 assert.equal(api.guidedAttempt(s,"再說一次"),s);
 s=api.guidedAttempt(s,"私は学生です。");assert.equal(api.guidedCanAdvance(s),true);
 s=api.advanceGuidedLesson(s);assert.equal(api.guidedPhase(s),"recap");assert.match(api.guidedPrompt(s,"日文"),/1 correct out of 1/);
 assert.equal(api.advanceGuidedLesson(api.guidedExplained(s,true)),null);
});
test("guided lesson launch uses local card independent of tool result and tools cannot change curriculum",()=>{
 const ui=read("InlineTeacherBoard.tsx"),live=read("LivePage.tsx");
 assert.match(ui,/syncGuided\(next\);show\(guidedCard\(next\)\)/);
 assert.match(ui,/if\(guidedRef\.current\).*guided-curriculum/);
 assert.match(ui,/guidedCanAdvance\(board\.guided\)/);
 assert.match(live,/Boolean\(geminiKey\(\)\),s\.targetLanguage/);
 assert.match(ui,/schema:3,model:wire\.current\.model/);
 assert.match(live,/onToolDiagnostics:inlineBoard\.diagnostics/);
});

test("mode prompt is explicit, focus accepts only current valid item, not quiz answers",()=>{
 assert.match(api.INLINE_BOARD_POLICY,/always available/);
 assert.match(api.INLINE_BOARD_POLICY,/Never say you displayed/);
 const c={...card(),points:[],questions:[],body:""};
 assert.equal(api.inlineFocusIndex(c,{cardId:c.id,index:1}),1);
 assert.equal(api.inlineFocusIndex(c,{cardId:"old",index:1}),null);
 assert.equal(api.inlineFocusIndex(c,{cardId:c.id,index:-1}),null);
 assert.equal(api.inlineFocusIndex(c,{cardId:c.id,index:2}),null);
 assert.equal(api.inlineFocusIndex({...c,type:"quiz"},{cardId:c.id,index:0}),null);
});
test("visual replies stay in caption thread, no mode or button is required",()=>{
 const ui=read("InlineTeacherBoard.tsx"),live=read("LivePage.tsx");
 const bubble=fs.readFileSync(root+"/web-spa/src/friends/FriendCallBubbleList.tsx","utf8");
 const hook=fs.readFileSync(root+"/web-spa/src/live/useLiveSession.ts","utf8");
 assert.match(live,/<FriendCallControls live=\{live\}/);
 assert.doesNotMatch(ui,/inline-board-mode-button|modeRef|modePending|syncMode/);
 assert.match(ui,/if\(!board\.enabled\)return undefined/);
 assert.doesNotMatch(live,/<InlineTeacherBoard board=/);
 assert.match(live,/onVisualTurnComplete:inlineBoard\.finish/);
 assert.match(hook,/if\(!guestModeRef\.current\)configRef\.current\.onVisualTurnComplete\?\.\(turn,/);
 assert.match(live,/visualReply=\{visualReplyProps/);
 assert.match(hook,/attempt\.captionOffset\+turnsRef\.current\.length-1/);
 assert.match(bubble,/visualReply\?\.render\(turn\.index\)/);
 assert.match(bubble,/visualReply\?\.render\("stream"\)/);
 assert.match(bubble,/if\(!followRef\.current\)return/);
 assert.match(ui,/board\.markRendered\(entryId\)/);
 assert.match(ui,/board\.missingTurn/);
});
test("journal attaches a streaming card to the actual completed caption index and retains old answers",()=>{
 let j=api.appendVisualReply([],1,card());
 assert.equal(api.visualRepliesAt(j,"stream").length,1);
 j=api.sealVisualReplies(j,5);
 assert.equal(api.visualRepliesAt(j,"stream").length,0);
 assert.equal(api.visualRepliesAt(j,5)[0].id,1);
 j=api.updateVisualReply(j,1,{answers:{"past:0":1}});
 j=api.appendVisualReply(j,2,card("Next","past"));
 j=api.sealVisualReplies(j,6);
 assert.equal(api.visualRepliesAt(j,5)[0].answers["past:0"],1);
 assert.equal(api.visualRepliesAt(j,6)[0].id,2);
 j=api.appendVisualReply(j,3,card("Interrupted","interrupt"));
 assert.equal(api.discardPendingVisualReplies(j).length,2);
 assert.equal(api.discardPendingVisualReplies(j,3).length,3);
});
test("timeline, steps, dialogue and flashcards validated as rich visual replies",()=>{
 for(const type of ["timeline","steps","dialogue","flashcard"]){
  const g=api.newInlineGate();begin(g);
  const points=[{label:"Past",note:"Before"},{label:"Now",note:"Present"}];
  const result=proposal(g,100,true,{...card(),type,points});
  assert.ok(result.ok,type);
  assert.equal(result.card.type,type);
  if(type==="timeline"||type==="steps")assert.equal(result.card.points.length,2);
 }
});

test("exact November 28 screenshot display-only claim yields real -ed teaching card",()=>{
 const g=api.newInlineGate();
 const claim="Yes, I'm using the teaching board to show you the rules visually. You can see the breakdown of -ed endings right here on the screen.";
 const result=finish(g,"那你有视觉教学方式让我知道吗?",100,true,true,claim);
 assert.equal(result?.id,"ed-sounds-concept");
 assert.deepEqual(Array.from(result.pairs,p=>p.source),["/t/","/d/","/ɪd/"]);
 assert.equal(g.outcome,"shown");assert.equal(g.toolCalls,0);
});
test("display claim without teaching content is not a successful visual reply",()=>{
 const g=api.newInlineGate();
 assert.equal(finish(g,"Can you show me a visual aid?",100,true,true,"Yes, you can see the whiteboard on the screen."),null);
 assert.equal(g.outcome,"missing");assert.equal(g.fallbacks,0);
});
test("visual followup preserves earlier explanation, does not copy a claim into material",()=>{
 const g=api.newInlineGate();
 const plain="Present simple describes habits and repeated actions. The third person singular usually takes an s.";
 finish(g,"How does present simple work?",100,true,true,plain);
 const result=finish(g,"那你有視覺教學嗎?",200,true,true,"Yes, look at the teaching board on the screen.");
 assert.equal(result?.body,plain);
 assert.equal(g.lastOutput,plain);
});
test("no persistent opt-out; the next eligible teaching turn can produce a card",()=>{
 const g=api.newInlineGate();finish(g,"不要使用白板",100,true,true,"Okay.");
 begin(g,"Please explain the grammar rule.");assert.ok(proposal(g,101).card);
});
test("language-specific fallback only uses spoken material outside English",()=>{
 const result=api.backupCard("文法規則","日本語の助詞は文の中で役割を示します。は話題を示し、が主語を示すことがあります。これは使い分けるときに重要です。",false,"","ja");
 assert.equal(result?.type,"steps");
 assert.match(result.points[0].note,/日本語/);
});

const latestClaim="I have updated the board to show the three different ways we pronounce the '-ed'ending, along with examples for each rule.";
test("exact 13:44 screenshot: plain board and joined ASR suffix recover real material",()=>{
 const g=api.newInlineGate();
 const result=finish(g,"讓我有一個比較友善的 UI。",100,true,true,latestClaim);
 assert.equal(result?.id,"ed-sounds-concept");
 assert.deepEqual(Array.from(result.pairs,p=>p.source),["/t/","/d/","/ɪd/"]);
});
test("each visible reply has a template; render fallback works without any tool or completion callback",()=>{
 const turns=[{input:"Hello",output:"Hi, how are you?"},{input:"讓我有一個比較友善的 UI。",output:latestClaim}];
 const result=api.teacherReplyTemplates(turns,{},[],"en");
 assert.equal(result.get(0).kind,"text");
 assert.equal(result.get(1).kind,"material");assert.equal(result.get(1).source,"caption");
 assert.equal(result.get(1).card.id,"ed-sounds-concept");
 const pending=api.teacherReplyTemplates(turns.slice(0,1),turns[1],[],"en");
 assert.equal(pending.get("stream").card.id,"ed-sounds-concept");
 assert.equal(api.teacherReplyTemplates(turns,turns[1],[],"en").has("stream"),false);
 const actual=api.appendVisualReply([],1,{...card(),points:[],questions:[],body:""});
 const journal=api.sealVisualReplies(actual,1);
 assert.equal(api.teacherReplyTemplates(turns,{},journal,"en").get(1).source,"journal");
 assert.equal(api.teacherReplyTemplates(turns,{},[],"ja").get(1).kind,"missing");
 assert.equal(api.teacherReplyTemplates([{input:"不要使用白板",output:latestClaim}],{},[],"en").get(0).kind,"text");
});
test("actual React reply markup includes caption-derived teaching card before suggestions without any tool result",async()=>{
 const {createServer}=await import("vite");
 const React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
 const server=await createServer({configFile:path.join(root,"vite.web.config.ts"),server:{middlewareMode:true,watch:null},appType:"custom",logLevel:"silent"});
 try{
  const {visualReplyProps}=await server.ssrLoadModule("/src/teacher/InlineTeacherBoard.tsx");
  const {FriendCallBubbleList}=await server.ssrLoadModule("/src/friends/FriendCallBubbleList.tsx");
  const turns=[{input:"Hello",output:"Hi, how are you?"},{input:"讓我有一個比較友善的 UI。",output:latestClaim}];
  const board={enabled:true,journal:[],delivery:"idle",missingTurn:null,latestReplyTurn:null,activeEntry:null,guided:null,focus:-1,request:()=>false};
  const visualReply=visualReplyProps(board,true,()=>false,true,turns,"","","英文");
  const html=renderToStaticMarkup(React.createElement(FriendCallBubbleList,{name:"Lina",turns,input:"",output:"",source:"en",nativeLanguage:"zh-TW",translationRows:[],historicalTranslations:new Map(),suggestions:[{text:"A suggestion",translation:""}],suggestionsEnabled:true,translationEnabled:false,needTranslation:false,speaking:false,waitingText:"Waiting",youLabel:"You",recognizingLabel:"Recognizing",recognizedLabel:"Recognized",translateStatus:x=>x,visualReply}));
  assert.match(html,/data-reply-template="text"/);
  assert.match(html,/data-reply-template="material"/);
  assert.match(html,/data-visual-source="caption"/);
  assert.match(html,/data-kind="comparison"/);
  assert.match(html,/\/ɪd\//);
  assert.ok(html.indexOf('data-kind="comparison"')<html.indexOf("A suggestion"));
  const choice=api.parseComposerChoice({kind:"material",card:{type:"vocabulary",title:"Semantic material",pairs:[{source:"walked",target:"走路",pronunciation:"/wɔːkt/"},{source:"played",target:"玩",pronunciation:"/pleɪd/"}]}});
  const decisions={1:{fingerprint:api.replyFingerprint(turns[1]),status:"ready",choice}};
  const composed=visualReplyProps(board,true,()=>false,true,turns,"","","英文",decisions);
  const aiHtml=renderToStaticMarkup(composed.render(1));
  assert.match(aiHtml,/data-visual-source="composer"/);
  assert.match(aiHtml,/Semantic material/);
  assert.match(aiHtml,/data-kind="vocabulary"/);
 }finally{await server.close()}
});

test("composer accepts semantic template or plain text, rejects invalid cards and markup",()=>{
 assert.equal(api.parseComposerChoice({kind:"text"}).kind,"text");
 assert.equal(api.parseComposerChoice({kind:"material",card:{type:"comparison",title:"Japanese particles",pairs:[{source:"は",target:"Topic"},{source:"が",target:"Subject"}]}}).card.type,"comparison");
 assert.equal(api.parseComposerChoice({kind:"material",card:{type:"quiz",title:"Bad quiz",questions:[{question:"Q",options:["A","A"],answerIndex:0}]}}),null);
 assert.equal(api.parseComposerChoice({kind:"material",card:{type:"comparison",title:"Empty"}}),null);
 assert.equal(api.parseComposerChoice({kind:"material",card:{type:"html",title:"<script>"}}),null);
 const prompt=JSON.parse(api.composerPrompt({input:"は and が",output:"A distinction."},[{input:"old"},{input:"recent"},{input:"latest"}],"日文","zh-TW"));
 assert.equal(prompt.targetLanguage,"日文");assert.equal(prompt.recent.length,2);assert.equal(prompt.current.learner,"は and が");
});
test("AI choice is authoritative: pending text, arbitrary semantic template, failed rule fallback; journal wins",()=>{
 const turns=[{input:"Hello",output:"Hi."},{input:"Explain particles",output:"There are differences."},{input:"比較發音",output:latestClaim}];
 const fp=i=>api.replyFingerprint(turns[i]);
 const choices={0:{fingerprint:fp(0),status:"ready",choice:{kind:"text"}},1:{fingerprint:fp(1),status:"pending"},2:{fingerprint:fp(2),status:"pending"}};
 assert.equal(api.teacherReplyTemplates(turns,{},[],"en",false,choices).get(2).kind,"text");
 choices[1]={fingerprint:fp(1),status:"ready",choice:api.parseComposerChoice({kind:"material",card:{type:"comparison",title:"Particles",pairs:[{source:"は",target:"Topic"},{source:"が",target:"Subject"}]}})};
 choices[2]={fingerprint:fp(2),status:"failed"};
 const projected=api.teacherReplyTemplates(turns,{},[],"en",false,choices);
 assert.equal(projected.get(0).kind,"text");assert.equal(projected.get(1).source,"composer");assert.equal(projected.get(2).source,"caption");
 choices[2]={fingerprint:fp(2),status:"ready",choice:{kind:"text"}};
 assert.equal(api.teacherReplyTemplates(turns,{},[],"en",false,choices).get(2).kind,"text");
 const journal=api.sealVisualReplies(api.appendVisualReply([],1,{...card(),points:[],questions:[],body:""}),1);
 assert.equal(api.teacherReplyTemplates(turns,{},journal,"en",false,choices).get(1).source,"journal");
 assert.equal(api.teacherReplyTemplates([{...turns[1],output:"Changed"}],{},[],"en",false,{0:choices[1]}).get(0).kind,"text");
});
test("composer queue is bounded, deduplicated, cancelable and cannot deliver stale caption results",async()=>{
 const {createServer}=await import("vite");
 const server=await createServer({configFile:path.join(root,"vite.web.config.ts"),server:{middlewareMode:true,watch:null},appType:"custom",logLevel:"silent"});
 try{
  const {ReplyComposerQueue}=await server.ssrLoadModule("/src/teacher/useTeacherReplyComposer.ts");
  const jobs=[];let decisions={};
  const queue=new ReplyComposerQueue((turn,recent,signal)=>new Promise(resolve=>jobs.push({turn,signal,resolve})),v=>{decisions=v});
  const turns=Array.from({length:8},(_,i)=>({input:"Question "+i,output:"Reply "+i}));
  queue.scan(turns,new Set());queue.scan(turns,new Set());await Promise.resolve();
  assert.equal(jobs.length,2);assert.equal(decisions[7].status,"failed");
  const original=jobs[0];queue.scan([{input:"Changed",output:"New reply"}],new Set());await Promise.resolve();
  assert.equal(original.signal.aborted,true);original.resolve({kind:"text"});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(decisions[0].status,"pending");
  jobs.at(-1).resolve({kind:"text"});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(decisions[0].status,"ready");
  queue.close();
 }finally{await server.close()}
});
