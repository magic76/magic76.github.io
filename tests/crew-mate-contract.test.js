const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const enHome=()=>fs.readFileSync(path.join(root,"web-spa/src/i18n/locales/en/mate.json"),"utf8");
// Node 22.23+ supports TypeScript type stripping, matching the repository CI runtime.
const mate=require("../web-spa/src/mate/mateState.ts");
const consensus={
 target:"Hotel",goal:"Request early check-in",constraints:"Do not pay a surcharge",
 escalation:"Ask me before any payment change",userLanguage:"zh-TW",otherLanguage:"en"
};
test("Mate briefing readiness is explicit, not guessed",()=>{
 assert.equal(mate.mateConsensusReady(consensus),true);
 assert.equal(mate.mateConsensusReady({...consensus,constraints:""}),false);
 assert.equal(mate.mateConsensusReady({...consensus,goal:" "}),false);
});
test("model consensus updates cannot mutate user languages or approval state",()=>{
 const updated=mate.applyMateConsensusPatch(consensus,{
  goal:"Request a room",constraints:"No cash",otherLanguage:"ru",phase:"external",approved:true
 });
 assert.equal(updated.goal,"Request a room");
 assert.equal(updated.otherLanguage,"en");
 assert.deepEqual(Object.keys(updated).sort(),Object.keys(consensus).sort());
 assert.equal(updated.escalation,consensus.escalation);
});
test("Mate speech audience strictly limits tools",()=>{
 const allow=mate.mateToolAllowed;
 assert.equal(allow("private","PRIVATE_TO_MATE","update_task_consensus",false,false),true);
 assert.equal(allow("external","EXTERNAL_WITH_MATE","update_task_consensus",true,true),false);
 assert.equal(allow("external","PRIVATE_TO_MATE","request_user_input",true,true),false);
 assert.equal(allow("external","EXTERNAL_WITH_MATE","request_user_input",false,false),false);
 assert.equal(allow("external","EXTERNAL_WITH_MATE","request_user_input",true,false),true);
 assert.equal(allow("external","EXTERNAL_WITH_MATE","complete_task",true,false),false);
 assert.equal(allow("external","EXTERNAL_WITH_MATE","complete_task",true,true),true);
 assert.equal(allow("decision","MATE_HANDLING","complete_task",true,true),false);
});
test("external Mate knows the reviewed owner rules without revealing them to the other person",()=>{
 const page=fs.readFileSync(path.join(root,"web-spa/src/mate/MatePage.tsx"),"utf8");
 const prompts=fs.readFileSync(path.join(root,"web-spa/src/mate/matePrompts.ts"),"utf8");
 const review=fs.readFileSync(path.join(root,"web-spa/src/mate/MateConsensusFields.tsx"),"utf8");
 const external=prompts.split("export const externalInstruction =")[1].split("export const externalOpening =")[0];
 const opening=prompts.split("export const externalOpening =")[1].split("export const privateInstruction =")[0];
 assert.match(external,/c\.constraints/);
 assert.match(external,/c\.escalation/);
 assert.match(external,/never quote, summarize, disclose or read aloud/i);
 assert.match(external,/NEVER pretend the other person replied/);
 assert.doesNotMatch(opening,/c\.constraints|c\.escalation/);
 assert.match(opening,/Please speak your brief greeting NOW/);
 assert.match(page,/mode==="private"\?privateInstruction\(c,startedExternal/);
 assert.match(page,/externalInstruction\(c,scopedOwnerDecision,turnsRef\.current\.slice\(-16\),continuing\)/);
 assert.match(page,/externalOpening\(c\)/);
 assert.match(page,/volume:100/);
 assert.match(page,/const session=new window\.CrewLive\.Session\(voiceOptions\)/);
 assert.match(review,/t\("mate\.fields\.limits"\)/);
 assert.match(enHome(),/Private limits \(Mate follows these without revealing them\)/);
});
test("first Mate greeting is audible, logged and does not count as external consent",()=>{
 const page=fs.readFileSync(path.join(root,"web-spa/src/mate/MatePage.tsx"),"utf8");
 assert.match(page,/if\(turn\.output\?\.trim\(\)\)appendTurn\("mate",turn\.output\)/);
 assert.match(page,/else if\(value\.trim\(\)\)\{externalOutputSeen\.current=true/);
 assert.match(page,/if\(turn\.input\?\.trim\(\)\)appendTurn\("other",turn\.input\)/);
 assert.match(page,/externalInputSeen\.current=true/);
 assert.match(page,/voice:"Aoede",volume:100/);
 assert.match(page,/if\(mode==="external"\)\{\s*if\(session\.ready&&session\.running\)trackUsageEvent\("mate_handoff_started"\);\s*session\.setVolume\(100\)/);
 assert.match(page,/t\("mate\.askStart"\)/);
 assert.match(enHome(),/Ask Mate to start speaking/);
 assert.equal(mate.mateToolAllowed("external","EXTERNAL_WITH_MATE","complete_task",false,true),false);
 assert.equal(mate.mateToolAllowed("external","EXTERNAL_WITH_MATE","request_user_input",false,true),false);
});
test("last uncompleted private utterance is retained at briefing finalization",()=>{
 const page=fs.readFileSync(path.join(root,"web-spa/src/mate/MatePage.tsx"),"utf8");
 assert.match(page,/privateInputRef\.current=value/);
 assert.match(page,/const pendingSpeech=privateInputRef\.current\.trim\(\)/);
 assert.match(page,/pendingSpeech\?\[pendingSpeech\]:\[\]/);
});

test("invalid tool payloads don't cause exceptions",()=>{
 assert.deepEqual(mate.parseMateToolArgs("invalid json"),{});
 assert.deepEqual(mate.parseMateToolArgs(null),{});
 assert.deepEqual(mate.parseMateToolArgs('{"goal":"fine"}'),{goal:"fine"});
});
test("all externally available tools exclude private consensus mutation",()=>{
 const tools=mate.mateToolDeclarations("external")[0].functionDeclarations;
 assert.deepEqual(tools.map(x=>x.name),["request_user_input","complete_task"]);
});

// P1: stopped records can resume only with a complete private consensus.
test("resuming historical tasks never reopens completed tasks or an incomplete snapshot",()=>{
 const base={...consensus};
 const item={id:"task-1",status:"stopped",consensus:base};
 assert.equal(mate.mateHistoryResumable(item),true);
 assert.equal(mate.mateHistoryResumable({...item,status:"completed"}),false);
 assert.equal(mate.mateHistoryResumable({...item,consensus:undefined}),false);
 assert.equal(mate.mateHistoryResumable({...item,consensus:{...base,target:""}}),false);
});
test("saved snapshots are bounded, deletable and never affect other task IDs",()=>{
 const saved=new Map();
 const original=global.localStorage;
 global.localStorage={
  getItem:key=>saved.get(key)||null,
  setItem:(key,value)=>saved.set(key,value)
 };
 try{
  for(let index=0;index<25;index++)mate.storeMateHistory({
   id:"mate-"+index,status:"stopped",target:"Hotel",goal:"Ask reception",
   userLanguage:"zh-TW",otherLanguage:"en",turns:[],outcome:"",
   updatedAt:index,consensus:{...consensus}
  });
  assert.equal(mate.readMateHistory().length,20);
  const before=mate.readMateHistory()[1].id;
  mate.deleteMateHistory(before);
  assert.equal(mate.readMateHistory().length,19);
  assert.equal(mate.readMateHistory().some(x=>x.id===before),false);
 }finally{global.localStorage=original}
});
test("briefing is finalized from confirmed speech and unsent typed text before external handoff",()=>{
 const page=fs.readFileSync(path.join(root,"web-spa/src/mate/MatePage.tsx"),"utf8");
 const briefing=fs.readFileSync(path.join(root,"web-spa/src/mate/mateBriefing.ts"),"utf8");
 assert.match(page,/privateStatements\.current\.push\(turn\.input\.trim\(\)\)/);
 assert.match(page,/const pendingSpeech=privateInputRef\.current\.trim\(\)/);
 assert.match(page,/const statements=\[\.\.\.privateStatements\.current,\.\.\.\(pendingSpeech\?\[pendingSpeech\]:\[\]\),\.\.\.\(raw\?\[raw\]:\[\]\)\]/);
 assert.match(page,/await finalizeMateBriefing\(consensusRef\.current,statements,startedExternal\?"supplement":"initial"\)/);
 assert.match(briefing,/Do not guess missing fields/);
 assert.match(page,/setConfirmOwner\(false\);\s*advance\("review"/);
});
test("P1 external view has a dedicated transcript and explicit reconnect path",()=>{
 const page=fs.readFileSync(path.join(root,"web-spa/src/mate/MatePage.tsx"),"utf8");
 const transcript=fs.readFileSync(path.join(root,"web-spa/src/mate/MateTranscript.tsx"),"utf8");
 assert.match(page,/showHistory&&phase!=="external"&&phase!=="decision"/);
 assert.match(page,/MateTranscript turns=\{turns\}/);
 assert.match(page,/t\("mate\.reviewReconnect"\)/);
 assert.match(enHome(),/Review and reconnect/);
 assert.match(transcript,/shouldFollow\.current=nearBottom/);
 assert.match(transcript,/role="log"/);
});

test("Mate local task history is always saved without a consent toggle",()=>{
 const page=fs.readFileSync(path.join(root,"web-spa/src/mate/MatePage.tsx"),"utf8");
 const panel=fs.readFileSync(path.join(root,"web-spa/src/mate/MateHistoryPanel.tsx"),"utf8");
 assert.doesNotMatch(page,/saveHistory|setSaveHistory|mate-save/);
 assert.match(page,/function saveResult\(completed:boolean,result:string\)/);
 assert.match(page,/storeMateHistory\(record\)/);
 assert.match(page,/saveResult\(false,t\("mate\.outcome\.resumable"/);
 assert.match(page,/saveResult\(false,t\("mate\.outcome\.inProgress"/);
 assert.match(page,/saveResult\(result\.achieved===true,finalSummary\)/);
 assert.match(page,/saveResult\(fromAi,fallback\)/);
 assert.match(panel,/t\("mate\.history\.saved"\)/);
 assert.match(enHome(),/Tasks and transcripts are saved here automatically/);
 assert.match(panel,/onDelete\(item\.id\)/);
});

test("private supplement keeps the task, dialogue and continuation mode instead of restarting",()=>{
 const page=fs.readFileSync(path.join(root,"web-spa/src/mate/MatePage.tsx"),"utf8");
 const prompts=fs.readFileSync(path.join(root,"web-spa/src/mate/matePrompts.ts"),"utf8");
 const briefing=fs.readFileSync(path.join(root,"web-spa/src/mate/mateBriefing.ts"),"utf8");
 const fields=fs.readFileSync(path.join(root,"web-spa/src/mate/MateConsensusFields.tsx"),"utf8");
 const supplement=page.split("async function editSupplement()")[1].split("function restart()")[0];
 assert.match(supplement,/advance\("supplement","USER_DIRECT"\)/);
 assert.match(supplement,/await stopConnection\(\)/);
 assert.doesNotMatch(supplement,/timestampId|setTurns\(\[\]\)|EMPTY_CONSENSUS/);
 assert.match(page,/phase==="setup"\|\|phase==="supplement"/);
 assert.match(page,/showPresets=\{!startedExternal\}/);
 assert.match(fields,/canEdit&&showPresets/);
 assert.match(page,/const continuing=mode==="external"&&startedExternal/);
 assert.match(page,/continuing\?externalContinuation\(c,turnsRef\.current\.slice\(-16\)\):externalOpening\(c\)/);
 assert.match(page,/finalizeMateBriefing\(consensusRef\.current,statements,startedExternal\?"supplement":"initial"\)/);
 assert.match(prompts,/This is an ONGOING handoff/);
 assert.match(prompts,/Do NOT introduce yourself again/);
 assert.match(prompts,/export const externalContinuation/);
 assert.match(briefing,/SUPPLEMENT to the existing, ongoing task/);
 assert.match(briefing,/return the FULL combined restriction/);
 assert.match(page,/t\("mate\.continueConversation"\)/);
 assert.match(enHome(),/Continue conversation/);
 assert.match(page,/continuingSessionRef\.current\?externalContinuation\(consensusRef\.current,turnsRef\.current\.slice\(-16\)\):externalOpening\(consensusRef\.current\)/);
});

// Four Crew Mate UX changes: preserve the underlying safety and provenance contracts.
test("review reports every missing field and keeps readiness identical",()=>{
 assert.deepEqual(mate.mateMissingFields(consensus),[]);
 assert.deepEqual(mate.mateMissingFields({...consensus,target:" ",goal:"",constraints:"  ",escalation:""}),
  ["target","goal","constraints","escalation"]);
 assert.deepEqual(mate.mateMissingFields({...consensus,otherLanguage:""}),["otherLanguage"]);
 assert.equal(mate.mateConsensusReady({...consensus,otherLanguage:""}),false);
 const page=fs.readFileSync(path.join(root,"web-spa/src/mate/MatePage.tsx"),"utf8");
 const fields=fs.readFileSync(path.join(root,"web-spa/src/mate/MateConsensusFields.tsx"),"utf8");
 const notice=fs.readFileSync(path.join(root,"web-spa/src/mate/MateMissingNotice.tsx"),"utf8");
 assert.match(page,/onClick=\{handoffToGate\}/);
 assert.doesNotMatch(page,/disabled=\{!ready\|\|!confirmOwner\}/);
 assert.match(page,/focusMateField\(missing\[0\]\|\|"confirmation"\)/);
 assert.match(page,/data-mate-confirm/);
 assert.ok(page.indexOf('data-mate-confirm')<page.indexOf('onClick={handoffToGate}'));
 assert.match(page,/mate\.validation\.emptyBriefing/);
 assert.match(fields,/aria-invalid=\{invalid\("constraints"\)\}/);
 assert.match(fields,/data-mate-field="target"/);
 assert.match(fields,/mate-field-error/);
 assert.match(notice,/role="alert"/);
});
test("external handoff is gated until a distinct user Start action",()=>{
 const page=fs.readFileSync(path.join(root,"web-spa/src/mate/MatePage.tsx"),"utf8");
 const gate=fs.readFileSync(path.join(root,"web-spa/src/mate/MateStartGate.tsx"),"utf8");
 const handoff=page.split('function handoffToGate()')[1].split('async function startVoice(')[0];
 assert.match(handoff,/advance\("external","IDLE"\)/);
 assert.doesNotMatch(handoff,/ensureLive\(|startVoice\(|CrewLive\.Session/);
 assert.match(page,/!externalArmed\?<MateStartGate onStart=\{\(\)=>\{setExternalArmed\(true\);void startVoice\("external"\)\}\}/);
 assert.match(page,/const continuing=mode==="external"&&startedExternal/);
 assert.match(page,/ownerDecisionForExternal\.current=""/);
 assert.match(gate,/mate-start-button/);
});
test("transcript viewport and touch targets meet Mate requirements",()=>{
 const css=fs.readFileSync(path.join(root,"web-spa/src/mate/mate.css"),"utf8");
 assert.match(css,/\.is-external \.mate-transcript-wrap\{[^}]*min-height:55dvh/);
 assert.match(css,/height:max\(55dvh,calc\(100dvh - 390px\)\)/);
 assert.match(css,/height:max\(60dvh,calc\(100dvh - 360px\)\)/);
 assert.match(css,/\.mate-message p\{font-size:16px\}/);
 assert.match(css,/\.mate-message strong,\.mate-message small/);
 assert.match(css,/min-height:56px/);
 assert.match(css,/bottom:calc\(var\(--nav-h, 0px\)/);
});
test("result summary is evidence-only, bounded, and allows a same-task continuation",()=>{
 const page=fs.readFileSync(path.join(root,"web-spa/src/mate/MatePage.tsx"),"utf8");
 const summary=fs.readFileSync(path.join(root,"web-spa/src/mate/mateSummary.ts"),"utf8");
 const result=fs.readFileSync(path.join(root,"web-spa/src/mate/MateResultPanel.tsx"),"utf8");
 assert.match(summary,/summarizeMateConversation\(consensus:MateConsensus,turns:MateTurn\[\]\)/);
 assert.match(summary,/turns\.slice\(-80\)/);
 assert.match(summary,/json:true,temperature:0,maxOutputTokens:380/);
 assert.match(summary,/preferLive:false/);
 assert.match(summary,/ONLY evidence/);
 assert.match(page,/void summarizeMateConversation\(approved,recorded\)/);
 assert.match(page,/setOutcome\(finalSummary\)/);
 assert.match(page,/saveResult\(result\.achieved===true,finalSummary\)/);
 assert.match(page,/closeTask\(true,result,true\)/);
 const continuation=page.split("function continueFromResult()")[1].split("const missingFields=")[0];
 assert.match(continuation,/advance\("review","USER_DIRECT"\)/);
 assert.doesNotMatch(continuation,/taskId\.current=|setTurns\(\[\]\)|EMPTY_CONSENSUS/);
 assert.match(result,/mate\.summary\.loading/);
 assert.match(result,/onContinue/);
 assert.match(result,/onSupplement/);
 assert.match(result,/onRestart/);
});
test("Mate improvement keys exist in every locale and TSX size stays under 26000 bytes",()=>{
 const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];
 const en=JSON.parse(enHome()).mate;
 for(const lang of locales){
  const value=JSON.parse(fs.readFileSync(path.join(root,`web-spa/src/i18n/locales/${lang}/mate.json`),"utf8")).mate;
  for(const group of ["validation","startGate","summary"]){
   assert.deepEqual(Object.keys(value[group]).sort(),Object.keys(en[group]).sort(),lang+" "+group);
  }
  assert.equal(typeof value.validation.labels.constraints,"string");
  assert.ok(value.summary.loading.length>0);
 }
 for(const name of fs.readdirSync(path.join(root,"web-spa/src/mate")).filter(x=>x.endsWith(".tsx"))){
  assert.ok(fs.statSync(path.join(root,"web-spa/src/mate",name)).size<26000,name);
 }
});
