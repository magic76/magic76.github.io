const test=require("node:test");const assert=require("node:assert/strict");const fs=require("node:fs");const read=p=>fs.readFileSync(p,"utf8");test("bazi free tier uses concise summaries and preserves other modes",()=>{const page=read("web-spa/src/fortune/ReadingPage.tsx");const summary=read("web-spa/src/fortune/FortuneBaZiFreeSummary.tsx");assert.match(page,/mode!=="bazi"\)void interpret\(item\)/);assert.match(page,/reading!\.mode==="bazi"&&<FortuneBaZiFreeSummary/);assert.match(page,/reading!\.mode!=="bazi"&&<FortuneReadingOverview/);assert.match(page,/reading!\.mode!=="bazi"&&<FortuneSummaryCard/);assert.match(summary,/buildFortuneIdentity\("bazi"/);assert.match(summary,/fortune-bazi-pillars/);assert.match(summary,/fortune-bazi-free-topic/);assert.match(page,/FortunePriceInterest readingId/);});

test("free BaZi V2 uses calculated evidence, no paid AI dependency, and expandable mobile topics",()=>{
 const summary=read("web-spa/src/fortune/FortuneBaZiFreeSummary.tsx");
 const css=read("web-spa/src/fortune/fortuneBaZiFree.css");
 for(const field of ["visibleFiveElements","careerProfile","wealthProfile","relationshipProfile","currentLuckPillar","dayMasterStrength"])assert.ok(summary.includes(field),field);
 assert.match(summary,/role="meter"/);
 assert.match(summary,/<details className="fortune-bazi-free-topic"/);
 assert.match(summary,/total>0/);
 assert.doesNotMatch(summary,/CrewAI\.call|geminiKey\(/);
 assert.match(css,/@media\(max-width:640px\)/);
});
