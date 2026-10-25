const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const game=name=>fs.readFileSync(path.join(root,"web-spa/src/games",name),"utf8");

test("Taboo switching mode protects in-progress rounds from unintentional reset",()=>{
 const page=game("TabooGamePage.tsx");
 assert.match(page,/const changeMode=\(next:Mode\)=>\{/);
 assert.match(page,/if\(phase==="playing"&&!window\.confirm\(/);
 assert.match(page,/onClick=\{\(\)=>changeMode\(mode==="describe"\?"guess":"describe"\)\}/);
 assert.match(page,/onClick=\{\(\)=>changeMode\("describe"\)\}/);
 assert.match(page,/onClick=\{\(\)=>changeMode\("guess"\)\}/);
 assert.match(page,/setDeadline\(0\);setTimeLeft\(roundSeconds\)/);
 assert.match(page,/setScore\(0\);setSkips\(3\);setHistory\(\[\]\)/);
 assert.match(page,/setVoiceSamples\(\[\]\);setFeedback\(\[\]\)/);
});

test("Taboo timer is visually precise but announces only meaningful milestones",()=>{
 const page=game("TabooGamePage.tsx");
 const css=game("miniGames.css");
 assert.match(page,/const timeAnnouncement=roundSeconds===0\?""/);
 assert.match(page,/timeLeft<=10\?"本題剩餘十秒"/);
 assert.match(page,/timeLeft<=30\?"本題剩餘三十秒"/);
 assert.match(page,/role="timer" aria-live="off" aria-label=\{roundSeconds===0\?"不限時":"本題倒數"\}/);
 assert.match(page,/role="status" aria-live="polite" aria-atomic="true">\{timeAnnouncement\}/);
 assert.match(page,/role="progressbar"/);
 assert.match(css,/\.crew-taboo-timer-line \.sr-only\{/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test("Late AI-generated Taboo cards cannot change the next round or strand its busy state",()=>{
 const page=game("TabooGamePage.tsx");
 assert.match(page,/generationRef=useRef\(0\)/);
 assert.match(page,/generationRef\.current\+\+;/);
 assert.match(page,/const generation=\+\+generationRef\.current/);
 assert.match(page,/generation!==generationRef\.current\|\|doneGuard\.current===round/);
 assert.match(page,/finally\{if\(generation===generationRef\.current\)setBusy\(false\)\}/);
 assert.match(page,/setGuessing\(false\);setBusy\(false\);\s*if\(deck\[round\]\)/);
 assert.match(page,/setHistory\(\[\]\);setBusy\(false\);doneGuard\.current=-1/);
});
