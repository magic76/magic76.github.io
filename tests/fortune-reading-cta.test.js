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
 for(const key of ["aiCtaGenerate","aiCtaRead","aiCtaSetup","aiLoading","aiRetry"])
  assert.ok(page.includes('t("reading.'+key+'")'),key);
 assert.ok(page.includes('disabled={aiStatus==="loading"}'));
 assert.ok(page.includes('if(reading.ai){goDeep();return}'));
 assert.ok(page.includes('void interpret(reading)'));
 assert.ok(page.includes('showAiSetup&&!geminiKey()'));
 assert.ok(overview.includes('id="fortune-reading-report"'));
 assert.ok(overview.includes('useState<FortuneChapterId|null>("personality")'));
});

test("duplicate action clusters are hidden without losing share, voice, raw results or text follow-up",()=>{
 const page=read("web-spa/src/fortune/ReadingPage.tsx");
 const overview=read("web-spa/src/fortune/ReadingOverview.tsx");
 const identity=read("web-spa/src/fortune/FortuneIdentityCard.tsx");
 const followup=read("web-spa/src/fortune/FortuneFollowUp.tsx");
 assert.ok(!/fortune-collectible-actions|fortune-teacher-invite|fortune-teacher-followup/.test(page));
 assert.equal(page.split('className="fortune-conversation-actions">{teacherAction}').length-1,1);
 assert.ok(page.includes("fortune-reading-end-actions"));
 assert.ok(page.includes('onShare={()=>setShareOpen(true)} compact/>'));
 assert.ok(identity.includes('!compact&&<div className="fortune-identity-actions">'));
 assert.ok(page.includes('<Result result={reading!.result}'));
 assert.ok(page.includes('<FortuneFollowUp reading={reading!}'));
 assert.ok(!followup.includes("parsed.ask.slice(0,3)"));
 assert.ok(!/fortune-reading-focus-grid|fortune-reading-ask/.test(overview));
 assert.ok(overview.includes("fortune-reading-data"));
});

test("AI primary action and 16px mobile prose respect reduced motion and all eleven locales",()=>{
 const css=read("web-spa/src/fortune/result/depth.css");
 assert.ok(css.includes(".fortune-ai-entry-button{"));
 assert.ok(css.includes("min-height:54px"));
 assert.ok(css.includes(".fortune-reading-chapter-content>p{font-size:16px"));
 assert.ok(css.includes("prefers-reduced-motion:reduce"));
 const locales=["zh-TW","en","ja","es","pt-BR","id","fr","de","ko","vi","th"];
 for(const locale of locales){
  const data=JSON.parse(read("web-spa/src/i18n/locales/"+locale+"/fortune.json"));
  for(const key of ["aiCtaTitle","aiCtaDesc","aiCtaGenerate","aiCtaRead","aiCtaSetup"])assert.ok(data.reading[key]?.trim(),locale+":"+key);
 }
});
