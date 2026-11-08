const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=(file)=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");

test("Fortune report has a computed-fact dashboard for all three modes",()=>{
 const view=read("web-spa/src/fortune/ReadingOverview.tsx");
 assert.match(view,/buildLocalReport\(mode,result,reportReady&&.*?,phase\)/);
 assert.match(view,/mode==="bazi"/);
 assert.match(view,/useRouteNamespace\("fortuneReport"\)/);
 assert.match(view,/mode==="tarot"/);
 assert.match(view,/r\?\.currentMahadasha\?\.lord/);
 assert.match(view,/fortune-reading-metrics/);
 assert.doesNotMatch(view,/fortune-reading-focus-grid/);
 assert.match(view,/const primary:FortuneChapterId\[\]=\["personality","career","wealth","relationships","currentCycle"\]/);
 assert.match(view,/weightedFiveElements/);
 assert.match(view,/Number\.isFinite/);
 assert.match(view,/formatFortuneValue\(item\.value,true\)/);
 assert.doesNotMatch(view,/successRate|luckyScore|fortuneScore|成功率|運勢分數/);
});

test("Fortune full reading stays reachable with explicit evidence and disclosure",()=>{
 const overview=read("web-spa/src/fortune/ReadingOverview.tsx");
 const page=read("web-spa/src/fortune/ReadingPage.tsx");
 const css=read("web-spa/src/fortune/result/depth.css");
 assert.match(overview,/aria-expanded=\{expanded\}/);
 assert.match(overview,/aria-controls=\{contentId\}/);
 assert.match(overview,/hidden=\{!expanded\}/);
 assert.match(overview,/chapter\.text/);
 assert.match(overview,/chapter\.evidence/);
 assert.match(overview,/fortune-reading-chapters/);
 const tw=JSON.parse(read("web-spa/src/i18n/locales/zh-TW/fortune.json"));
 assert.match(overview,/t\("reading\.disclaimer"\)/);
 assert.match(tw.reading.disclaimer,/傳統命理適合自我反思/);
 assert.match(css,/fortune-reading-chapter-content\[hidden\]/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(page,/<FortuneYearHighlights/);
 assert.match(page,/<Result result=\{reading!\.result\}/);
});

test("Fortune keeps one optional Friend entry and never repeats topic question buttons",()=>{
 const page=read("web-spa/src/fortune/ReadingPage.tsx");
 const overview=read("web-spa/src/fortune/ReadingOverview.tsx");
 const live=read("web-spa/src/fortune/LivePage.tsx");
 assert.doesNotMatch(overview,/onAsk|fortune-reading-ask|fortune-reading-focus-grid/);
 assert.match(page,/function ask\(topic\?:string\)/);
 assert.match(page,/setShowAiSetup\(true\)/);
 assert.match(page,/crew_fortune_live_context/);
 assert.match(page,/nav\("\/fortune\/live\?from=reading"\)/);
 assert.match(live,/localStorage\.removeItem\("crew_fortune_live_prompt"\)/);
 assert.match(live,/queuedPrompt\?/);
});
