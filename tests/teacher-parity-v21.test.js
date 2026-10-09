const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),read=name=>fs.readFileSync(path.join(root,name),"utf8");
test("Teacher native language and memory consent V2.1",()=>{
 const store=read("web-spa/src/store/teacherStore.ts"),consent=read("web-spa/src/teacher/TeacherMemoryConsent.tsx"),memory=read("web-spa/src/teacher/studentMemory.ts"),policy=read("web-spa/src/teacher/teacherPolicy.ts");
 assert.ok(store.includes("nativeLanguage")&&store.includes("detectNativeLanguage"));
 assert.ok(consent.includes("hasPersonalMemoryDecision"));
 assert.ok(consent.includes("setPersonalMemoryEnabled(true)")&&consent.includes("setPersonalMemoryEnabled(false)"));
 assert.ok(memory.includes("keysLikelyEquivalent")&&memory.includes("reportMemoryContext"));
 assert.ok(policy.includes("nativeLanguageName(input.nativeLanguage)"));
});
test("Teacher has separate camera mode and photo preparation mode",()=>{
 const page=read("web-spa/src/teacher/TextbookPage.tsx"),camera=read("web-spa/src/teacher/MaterialLiveCamera.tsx");
 assert.ok(page.includes('mode==="camera"')&&page.includes('mode==="photos"'));
 assert.ok(page.includes("teacherReport:true"));
 assert.ok(camera.includes("visibilitychange")&&camera.includes("sendVideoFrame"));
 assert.ok(camera.includes("snap();")&&camera.includes('role="log"'));
});
test("Recovered Live transport continues only unanswered student reply",()=>{
 const runtime=read("crew-live.js"),hook=read("web-spa/src/live/useLiveSession.ts");
 assert.ok(runtime.includes("onRecovered"));
 assert.ok(runtime.includes("this.recoveryStarted=true"));
 assert.ok(hook.includes("awaitingTutorRef.current")&&hook.includes("recoveryRequestRef.current"));
 assert.ok(hook.includes("previous in-character reply")&&hook.includes("The connection interrupted a reply"));
});
test("Vocabulary localized glosses and semantic course evidence",()=>{
 const content=read("web-spa/src/teacher/vocabularyContent.ts"),page=read("web-spa/src/teacher/VocabularyPage.tsx"),score=read("web-spa/src/teacher/courseEvaluation.ts"),report=read("features/teacher/reports/session-report.js");
 assert.ok(content.includes("nativeLanguageName")&&content.includes("updatedAt"));
 assert.ok(page.includes("needsContent")&&page.includes("ensureVocabularyContent"));
 assert.ok(score.includes("evidence_quote")&&score.includes("text.includes(quoted)")&&score.includes("inFlight"));
 assert.ok(report.includes("evidence_quote")&&report.includes("priorMemory"));
});
