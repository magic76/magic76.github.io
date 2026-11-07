const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");

test("Fortune landing shows methods before secondary reading and keeps approved image assets",()=>{
 const src=read("web-spa/src/fortune/HomePage.tsx");
 assert.ok(src.indexOf('className="section fortune-journey-create"')<src.indexOf('className="section fortune-journey-primary"'));
 assert.ok(src.indexOf('className="section fortune-journey-primary"')<src.indexOf('className="fortune-journey-daily"'));
 assert.match(src,/fortune-tarot-cover.webp/);
 assert.match(src,/fortune-vedic-cover.webp/);
 assert.match(src,/readFortuneHistoryPreviews\(30\)/);
 assert.match(src,/fortune-history-row/);
});

test("Fortune result has three accessible panels, no duplicate voice CTA, and unchanged calculators",()=>{
 const src=read("web-spa/src/fortune/ReadingPage.tsx");
 const css=read("web-spa/src/fortune/result/depth.css");
 for(const id of ["summary","timeline","chart"])assert.ok(src.includes('id="fortune-reading-panel-'+id+'"'));
 assert.match(src,/role="tablist"/);
 assert.match(src,/aria-selected=\{resultTab===tab\}/);
 assert.match(src,/onKeyDown=\{e=>/);
 assert.match(css,/fortune-reading-panel\[hidden\]\{display:none!important\}/);
 assert.equal((src.match(/\{teacherAction\}/g)||[]).length,1);
 for(const view of ["summary","timeline","chart"])assert.ok(src.includes('variant="'+view+'"'));
 assert.match(src,/<FortuneIdentityRevealDialog/);
 assert.match(src,/CrewFortuneBaZi\.calculate/);
 assert.match(src,/CrewFortuneTarot\.calculate/);
 assert.match(src,/CrewFortuneVedicEnrich\.enrich/);
});

test("Themed reading, time topics and evidence split without losing computed facts",()=>{
 const src=read("web-spa/src/fortune/ReadingOverview.tsx");
 for(const view of ["summary","timeline","chart"])assert.ok(src.includes('variant==="'+view+'"'));
 assert.match(src,/chapter\.evidence/);
 assert.match(src,/fortune-reading-metrics/);
 assert.match(src,/weightedFiveElements/);
 for(const lang of ["zh-TW","en"]){
  const locale=JSON.parse(read("web-spa/src/i18n/locales/"+lang+"/fortune.json"));
  for(const tab of ["key","time","details"])assert.ok(locale.reading.tab[tab]);
 }
});
