const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const page=read("web-spa/src/timeline/TimelinePage.tsx");
const live=read("web-spa/src/timeline/TimelineLivePage.tsx");
const css=read("web-spa/src/timeline/timeline.css");

test("age-centered helper selects the nearest age and ignores invalid readings",async()=>{
 const {nearestCenterIndex}=await import("../web-spa/src/timeline/timelineAgeInteraction.mjs");
 assert.equal(nearestCenterIndex([30,90,150],92),1);
 assert.equal(nearestCenterIndex([30,90,150],125),2);
 assert.equal(nearestCenterIndex([30,90,150],60),0,"ties retain the earlier age");
 assert.equal(nearestCenterIndex([],30),-1);
 assert.equal(nearestCenterIndex([NaN,150],150),1);
 assert.equal(nearestCenterIndex([50],NaN),-1);
});

test("timeline title, comparison and voice CTA reflect the selected person and age",()=>{
 assert.match(page,/timeline\.title",\{name:person\.name\}/);
 const compare=page.indexOf('className="timeline-compare-cta"');
 const chat=page.indexOf('className="timeline-primary-cta"');
 const portrait=page.indexOf('className="timeline-stage-visual"');
 assert.ok(chat>=0&&compare>chat&&compare<portrait,"Two one-tap actions are beside the selected portrait");
 assert.match(page,/timeline\.compareAction",\{name:person\.name\}/);
 assert.match(page,/to=\{"\/timeline\/compare\?character="\+characterId\}/);
 assert.match(page,/to=\{"\/timeline\/live\?character="\+characterId\+"&age="\+age\}/);
 assert.match(page,/timeline\.stage|timeline\.chapter/);
});

test("portrait swipes and age rail scrubbing synchronize, with visible and keyboard feedback",()=>{
 assert.match(page,/className="timeline-photo-carousel"[^\n]*onScroll=\{onCarouselScroll\}/);
 assert.match(page,/className="timeline-rail" ref=\{rail\} onScroll=\{onRailScroll\}/);
 assert.match(page,/programmaticTarget\.current=next/);
 assert.match(page,/railScrubbing\.current=true/);
 assert.match(page,/scrollToAge\(next,"instant"\)/);
 assert.match(page,/onPointerDown=\{\(\)=>\{programmaticTarget\.current=null\}\}/);
 assert.match(page,/event\.key==="ArrowLeft"\|\|event\.key==="ArrowRight"/);
 assert.match(page,/data-timeline-stop=\{a\}/);
 assert.match(page,/aria-pressed=\{a===age\}/);
 assert.match(page,/className="timeline-stage-count" aria-live="polite"/);
 assert.match(css,/scroll-snap-type:x mandatory/);
 assert.match(css,/scroll-snap-align:center/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(page,/prefers-reduced-motion: reduce/);
});

test("first-screen compact layout, carousel and both primary actions have mobile and desktop rules",()=>{
 assert.match(css,/Timeline first-screen journey/);
 assert.match(css,/\.timeline-immersive \.timeline-cta-dock\{display:grid;grid-template-columns/);
 assert.match(css,/\.timeline-immersive \.timeline-compare-cta\{color:/);
 assert.match(css,/\.timeline-immersive \.timeline-stage-visual\{height:clamp\(340px/);
 assert.match(css,/\.timeline-immersive \.timeline-stage-visual\{height:clamp\(248px/);
 assert.match(css,/\.timeline-immersive \.timeline-primary-cta,\.timeline-immersive \.timeline-compare-cta\{min-height:44px/);
 assert.doesNotMatch(css,/font-size:(?:[1-9]|10|11)px/);
 assert.doesNotMatch(page,/className="timeline-experience-link"/);
});

test("timeline voice: keyed auto-start, guest grant, countdown, finish and opening prompt",()=>{
 assert.match(live,/openingPrompt:opening/);
 assert.match(live,/timelineNextOpening\(age,characterId\)/);
 assert.match(live,/if\(!geminiKey\(\)\)return;const timer/);
 assert.match(live,/<GuestLiveStarter role="friend" onGrant=\{async grant=>\{setGuestStarted\(true\);await live\.start\(grant\)\}\}/);
 assert.match(live,/<GuestTrialCountdown secondsLeft=\{live\.guestSecondsLeft\}/);
 assert.match(live,/<GuestTrialFinish name=\{person\.name\} expired=\{live\.guestExpired\} failed=\{live\.state==="error"\}/);
 assert.match(live,/sessionKind:"timeline"/);
 assert.match(live,/persistHistory:false/);
 assert.match(live,/timeline\.liveContext/);
});

test("Mira thumbnail selection uses existing approved photos at every age",()=>{
 const ages=[7,10,13,16,19,22,25,35,40,50,55,70];
 const mira=require("../contracts/crew-timeline/v1.json").character;
 assert.deepEqual(mira.fullBodyPhotoPlan.map(p=>p.age),ages);
 assert.ok(mira.fullBodyPhotoPlan.every(p=>p.status==="approved"));
 const portrait=read("web-spa/src/timeline/TimelinePortrait.tsx");
 assert.match(portrait,/PUBLISHED_PORTRAIT_AGES\.has\(age\)/);
 assert.match(portrait,/return fullBodyApproved\(age\)\?fullBodyUrl\(age\):null/);
 assert.match(portrait,/IntersectionObserver/);
 assert.match(portrait,/verifiedPortraitBlob\(asset\)/);
});

test("every locale contains Timeline actions after fragment merge",()=>{
 const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];
 for(const l of locales){
  const data=JSON.parse(read(`web-spa/src/i18n/locales/${l}/home.json`));
  for(const key of ["title","compareAction","liveContext","level"]){
   assert.ok(typeof data.timeline[key]==="string"&&data.timeline[key].length>4,l+" missing "+key);
  }
  assert.match(data.timeline.title,/\{\{name\}\}/);
 }
});
