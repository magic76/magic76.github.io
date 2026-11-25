const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
test("Fortune is an explanation first, without forced language coaching",()=>{
 const voice=read("web-spa/src/fortune/LivePage.tsx");
 const hub=read("web-spa/src/teacher/TeacherFortunePage.tsx");
 assert.match(voice,/你是 Crew Friend/);
 assert.match(voice,/不斷問問題/);
 assert.match(voice,/對方隨時可以插話/);
 assert.match(voice,/不要要求練習句子、重複跟讀、文法糾正/);
 assert.match(voice,/不主動糾正文法/);
 assert.match(voice,/先用簡單白話講出有來源的命盤總覽/);
 assert.match(voice,/getCrewFriend\(friendId\)/);
 assert.match(voice,/readFortuneSpeakingContext\(\)/);
 assert.match(voice,/useLiveSession\(\{pageKey:"fortune"/);
 assert.doesNotMatch(hub,/navigate\("\/teacher\/live\?fortune="/);
 assert.match(hub,/navigate\("\/fortune\/live\?from="/);
});
test("No chart details are invented for daily reflections or missing readings",()=>{
 const voice=read("web-spa/src/fortune/LivePage.tsx");
 assert.match(voice,/source==="daily"/);
 assert.match(voice,/source==="culture"/);
 assert.match(voice,/尚未提供可信任的個人命盤結果/);
 assert.match(voice,/不可重新計算或補不存在的資料/);
 assert.match(voice,/live\.sendText/);
});
test("The original Fortune question flow also uses the selected Friend explainer",()=>{
 const reading=read("web-spa/src/fortune/ReadingPage.tsx");
 assert.match(reading,/nav\("\/fortune\/live\?from=reading"\)/);
 assert.doesNotMatch(reading,/onClick=\{askTeacher\}/);
 assert.match(reading,/<div className="fortune-conversation-actions">\{teacherAction\}<\/div>/);
 assert.doesNotMatch(reading,/nav\("\/teacher\/live\?fortune=reading"\)/);
});

test("Entering Fortune Live starts Friend narration without another click",()=>{
 const voice=read("web-spa/src/fortune/LivePage.tsx");
 const controls=read("web-spa/src/live/LiveControls.tsx");
 const session=read("web-spa/src/live/useLiveSession.ts");
 // Run after the screen is mounted, only once even if React updates the page.
 assert.match(voice,/const autoStartedRef=useRef\(false\)/);
 assert.match(voice,/if\(autoStartedRef\.current\)return/);
 assert.match(voice,/autoStartedRef\.current=true;/);
 assert.match(voice,/void live\.start\(\)/);
 assert.match(voice,/window\.clearTimeout\(timer\)/);
 // The same start call requests mic permission and uses the chart-based opening.
 assert.match(voice,/openingPrompt:opening/);
 assert.match(session,/await session\.start\(\)/);
 assert.match(session,/const sessionContext=configRef\.current\.resolveSessionContext\?\.\(\)\|\|configRef\.current/);
 assert.match(session,/openingPrompt:sessionContext\.openingPrompt/);
 // If permission is denied or the connection fails, the UI still allows retry.
 assert.match(controls,/live\.errorKind==="mic"/);
 assert.match(controls,/onClick=\{\(\)=>void live\.start\(\)\}/);
 assert.match(voice,/<LiveControls live=\{live\}\/>/);
});
