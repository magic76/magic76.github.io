const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");
const main=require("../contracts/crew-timeline/v1.json").character;
const others=require("../contracts/crew-timeline/characters-v1.json").characters;
const v2=require("../contracts/crew-timeline/comparisons-v2.json");
const ages=[7,10,13,16,19,22,25,35,40,50,55,70];

test("compare catalog covers three people and all 12 ages without invented canon",()=>{
 assert.deepEqual(v2.ages,ages);
 assert.equal(v2.schemaVersion,2);
 const people={mira:main,ethan:others.ethan,hana:others.hana};
 for(const [id,character] of Object.entries(people)){
  const questions=v2.characters[id].questions;
  assert.equal(questions.length,3);
  for(const q of questions){
   assert.equal(Object.keys(q.answers).length,12);
   for(const age of ages){
    const stage=character.periods.find(p=>p.age===age);
    assert.ok(stage,id+" missing age "+age);
    const field=q.id==="voice"?"quote":q.id==="challenge"?"tension":"story";
    assert.equal(q.answers[age].zh,stage[field+"Zh"]);
    assert.equal(q.answers[age].en,stage[field==="quote"?"quoteEn":field]);
   }
  }
 }
 const source=read("web-spa/src/timeline/TimelineComparePage.tsx");
 assert.match(source,/AGES.map/);
 assert.match(source,/TIMELINE_IDS.map/);
 assert.match(source,/useSearchParams/);
 assert.match(source,/characterId={personId}/);
 assert.match(source,/MAX_AGES=4/);
 assert.doesNotMatch(source,/geminiKey|ensureLive|dangerouslySetInnerHTML/);
});
test("time echoes are isolated, consented and only travel to later ages",()=>{
 const model=read("web-spa/src/timeline/timelineEcho.ts");
 assert.match(model,/friendMemoryEnabled/);
 assert.match(model,/knownNotes.filter\(n=>n.age<age\)/);
 assert.match(model,/key\(characterId\)/);
 const page=read("web-spa/src/timeline/TimelinePage.tsx");
 const live=read("web-spa/src/timeline/TimelineLivePage.tsx");
 assert.match(page,/timelineEchoesAtAge\(age,memory,characterId\)/);
 assert.match(page,/deleteTimelineEcho\(n.age,n.text,characterId\)/);
 assert.match(page,/clearTimelineEchoes\(characterId\)/);
 assert.match(live,/recordTimelineEcho\(age,text,characterId\)/);
 assert.match(live,/persistHistory:false/);
});
test("timeline compare entry preserves persona and Live links",()=>{
 const app=read("web-spa/src/App.tsx"),page=read("web-spa/src/timeline/TimelinePage.tsx");
 const compare=read("web-spa/src/timeline/TimelineComparePage.tsx");
 assert.match(app,/path="\/timeline\/compare"/);
 assert.match(app,/path="\/timeline\/live"/);
 assert.match(page,/timeline\/compare\?character=/);
 assert.match(compare,/\/timeline\/live\?character=/);
 assert.match(read("web-spa/src/lib/backup.ts"),/crew_timeline_/);
});

test("Timeline chat entry appears above the portrait instead of floating at screen bottom",()=>{
 const page=read("web-spa/src/timeline/TimelinePage.tsx");
 const css=read("web-spa/src/timeline/timeline.css");
 const heading=page.indexOf('className="timeline-stage-heading"');
 const chat=page.indexOf('className="timeline-cta-dock"');
 const photo=page.indexOf('className="timeline-stage-visual"');
 const memories=page.indexOf('className="timeline-life-book"');
 assert.ok(heading>=0&&heading<chat&&chat<photo&&photo<memories,"Chat entry belongs near age heading, before the large portrait and long chapter details");
 assert.equal((page.match(/className="timeline-primary-cta"/g)||[]).length,1,"Keep one Live entry point");
 assert.match(page,/to=\{"\/timeline\/live\?character="\+characterId\+"&age="\+age\}/);
 assert.doesNotMatch(css,/\.timeline-cta-dock\s*\{[^}]*position\s*:\s*fixed/,"No mobile sticky dock that covers content");
});
