const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");
const canon=require("../contracts/crew-timeline/v1.json").character;
const ages=[16,25,35,70];
test("comparison uses existing Mira age checkpoints and an explicitly editorial, no-key experience",()=>{
 assert.deepEqual(ages.every(a=>canon.periods.some(p=>p.age===a)),true);
 const source=read("web-spa/src/timeline/TimelineComparePage.tsx");
 assert.match(source,/const COMPARE_AGES=\[16,25,35,70\]/);
 assert.match(source,/COMPARE_PROMPTS\.map/);
 assert.match(source,/useSearchParams/);
 assert.match(source,/TimelinePortrait age=\{age\}/);
 assert.match(source,/COMPARE_AGES\.filter/);
 assert.doesNotMatch(source,/geminiKey|ensureLive|dangerouslySetInnerHTML/);
});
test("echo only exposes older consented manually saved notes",()=>{
 const source=read("web-spa/src/timeline/timelineEcho.ts");
 assert.match(source,/friendMemoryEnabled\(\)/);
 assert.match(source,/knownNotes\.filter\(n=>n\.age<age\)/);
 assert.match(source,/recordTimelineEcho/);
 assert.match(source,/deleteTimelineEcho/);
 assert.match(source,/clearTimelineEchoes/);
 assert.match(source,/metadata\.find/);
 const ui=read("web-spa/src/timeline/TimelinePage.tsx");
 const live=read("web-spa/src/timeline/TimelineLivePage.tsx");
 assert.match(ui,/timelineEchoesAtAge\(age,memory\)/);
 assert.match(ui,/deleteTimelineEcho\(n\.age,n\.text\)/);
 assert.match(ui,/clearTimelineEchoes\(\)/);
 assert.match(live,/persistHistory:false/);
 assert.match(live,/recordTimelineEcho\(age,text\)/);
 assert.match(read("web-spa/src/lib/backup.ts"),/crew_timeline_/);
});
test("timeline links to the new route without changing its Live URL",()=>{
 const route=read("web-spa/src/App.tsx"),page=read("web-spa/src/timeline/TimelinePage.tsx");
 assert.match(route,/path="\/timeline\/compare"/);
 assert.match(page,/to="\/timeline\/compare"/);
 assert.match(route,/path="\/timeline\/live"/);
});
