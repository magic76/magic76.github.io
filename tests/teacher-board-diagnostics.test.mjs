import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createBoardDiagnostics} from "../web-spa/src/teacher/boardDiagnostics.mjs";
const read=name=>readFileSync(new URL("../web-spa/src/teacher/"+name,import.meta.url),"utf8");
test("session diagnostics keeps timestamps and source while excluding content by default",()=>{
 let now=100;const j=createBoardDiagnostics(()=>now);
 j.record("turn",{livePatch:false},{input:"private question",output:"private answer"});
 now+=20;j.record("patch-applied",{source:"fallback"},{cards:[{title:"private title"}]});
 assert.equal(j.exportReport(false).events[1].ms,20);
 assert.doesNotMatch(JSON.stringify(j.exportReport(false)),/private/);
 assert.match(JSON.stringify(j.exportReport(true)),/private title/);
 for(let i=0;i<105;i++)j.record("view",{i});
 const report=j.exportReport(false);assert.equal(report.events.length,100);assert.equal(report.dropped,7);assert.equal(report.events[0].seq,8);
});
test("explicit content export redacts common credential formats and fields",()=>{
 const j=createBoardDiagnostics();j.record("turn",{}, {input:"AIza"+"x".repeat(35),apiKey:"secret value",output:"Bearer "+"a".repeat(20)});
 assert.doesNotMatch(JSON.stringify(j.exportReport(true)),/AIza|secret value|aaaaaaaaaaaa/);
 assert.match(JSON.stringify(j.exportReport(true)),/redacted/);
});
test("board uses shared measured dock and explicit follow mode",()=>{
 const page=read("TeacherBoardPage.tsx"),quick=read("BoardQuickControls.tsx"),css=read("teachingBoard.css");
 assert.match(page,/commitPatch\(patch,"live"\)/);assert.match(page,/commitPatch\(patch,"fallback"\)/);
 assert.match(page,/if\(changedId&&followingRef.current\)\{setFocusedId\(null\)\}/);
 assert.match(page,/record\("card-selected".*setFollowing\(false\)/);
 assert.match(quick,/ResizeObserver/);assert.match(quick,/className="teaching-board-voice">\{voiceControls\}/);
 assert.doesNotMatch(read("BoardTutorPanel.tsx"),/<LiveControls/);
 assert.match(css,/\.teaching-board-quick \.teaching-board-voice\{position:static/);
});
