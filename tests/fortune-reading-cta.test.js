const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");

test("all Fortune results show one AI action before the long report, with explicit state flows",()=>{
 const page=read("web-spa/src/fortune/ReadingPage.tsx");
 const overview=read("web-spa/src/fortune/ReadingOverview.tsx");
 assert.ok(page.indexOf("<FortuneSummaryCard")<page.indexOf('className="fortune-ai-entry"'));
 assert.ok(page.indexOf('className="fortune-ai-entry"')<page.indexOf("<FortuneReadingOverview"));
 assert.equal(page.split('className="fortune-ai-entry-button"').length-1,1);
 for(const key of ["aiCtaGenerate","aiCtaRead","aiCtaSetup","aiLoading","aiRetry"])assert.match(page,new RegExp('reading\\.'+key));
 assert.match(page,/disabled=\\{aiStatus==="loading"\\}/);
 assert.match(page,/reading\\.ai\\)\\{goDeep\\(\\);return\\}/);
 assert.match(page,/void interpret\\(reading\\)/);
 assert.match(page,/showAiSetup&&!geminiKey\\(\\)/);
 assert.match(overview,/id="fortune-reading-report"/);
 assert.match(overview,/useState<FortuneChapterId\\|null>\\("personality"\\)/);
});

test("duplicate action clusters are hidden without losing share, voice, raw results or text follow-up",()=>{
 const page=read("web-spa/src/fortune/ReadingPage.tsx");
 const overview=read("web-spa/src/fortune/ReadingOverview.tsx");
 const identity=read("web-spa/src/fortune/FortuneIdentityCard.tsx");
 const followup=read("web-spa/src/fortune/FortuneFollowUp.tsx");
 assert.doesNotMatch(page,/fortune-collectible-actions|fortune-teacher-invite|fortune-teacher-followup/);
 assert.equal(page.split('className="fortune-conversation-actions">{teacherAction}').length-1,1);
 assert.match(page,/fortune-reading-end-actions/);
 assert.match(page,/<FortuneIdentityCard reading=\\{reading!\\}[^>]*compact\\/>/);
 assert.match(identity,/\\{!compact&&<div className="fortune-identity-actions">/);
 assert.match(page,/<Result result=\\{reading!\\.result\\}/);
 assert.match(page,/<FortuneFollowUp reading=\\{reading!\\}/);
 assert.doesNotMatch(followup,/parsed\\.ask\\.slice\\(0,3\\)/);
 assert.doesNotMatch(overview,/fortune-reading-focus-grid|fortune-reading-ask/);
 assert.match(overview,/fortune-reading-data/);
});

test("AI primary action and 16px mobile prose respect reduced motion and all eleven locales",()=>{
 const css=read("web-spa/src/fortune/result/depth.css");
 assert.match(css,/\\.fortune-ai-entry-button\\{/);
 assert.match(css,/min-height:54px/);
 assert.match(css,/\\.fortune-reading-chapter-content>p\\{font-size:16px/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 const locales=["zh-TW","en","ja","es","pt-BR","id","fr","de","ko","vi","th"];
 for(const locale of locales){
  const data=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/fortune.json"));
  for(const key of ["aiCtaTitle","aiCtaDesc","aiCtaGenerate","aiCtaRead","aiCtaSetup"])assert.ok(data.reading[key]?.trim(),locale+":"+key);
 }
});
