const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("motion tokens and reduced-motion safety apply to Crew surfaces",()=>{
 const css=read("web-spa/src/styles.css");
 assert.match(css,/--crew-motion-normal/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.teacher-presence-orbit/);
 assert.match(css,/\.teacher-gallery-card/);
 assert.match(css,/\.quiz-card\[data-feedback="correct"\]/);
 assert.match(css,/\.story-reader\[data-direction="backward"\]/);
 assert.match(css,/\.fortune-selectable\[data-highlighted="true"\]/);
 assert.match(css,/\.progress-fill\{transition:width/);
});
test("tutor visuals reflect actual session and preview states",()=>{
 const live=read("web-spa/src/teacher/LivePage.tsx");
 const picker=read("web-spa/src/teacher/TeacherProfilePicker.tsx");
 const helper=read("web-spa/src/lib/motion.ts");
 assert.match(live,/data-state=\{presenceState\}/);
 assert.match(live,/teacher-presence-orbit/);
 assert.match(picker,/data-preview=\{preview\?\.state\|\|"idle"\}/);
 assert.match(picker,/transitionUI\(\(\)=>setDetail/);
 assert.match(helper,/prefers-reduced-motion/);
 assert.match(helper,/flushSync/);
});
test("real quiz feedback, word changes, and lesson track keys power transitions",()=>{
 const quiz=read("web-spa/src/teacher/VocabularyPage.tsx");
 const course=read("web-spa/src/teacher/CoursePage.tsx");
 assert.match(quiz,/data-feedback=\{locked\?/);
 assert.match(quiz,/key=\{word\[0\]\}/);
 assert.match(course,/className="section course-map" key=\{track\.id\}/);
});
test("story touch gestures use horizontal threshold and preserve narrator advancement",()=>{
 const story=read("web-spa/src/story/player/StoryPlayerView.tsx");
 assert.match(story,/onTouchCancel/);
 assert.match(story,/Math\.abs\(dx\)>64/);
 assert.match(story,/Math\.abs\(dx\)>Math\.abs\(dy\)\*1\.5/);
 assert.match(story,/live\.narratePage\(nextPage,target,nextImage\)/);
});
test("fortune chart interactions use computed facts, never AI-generated fake positions",()=>{
 const vedic=read("web-spa/src/fortune/result/VedicTabs.tsx");
 const tarot=read("web-spa/src/fortune/result/TarotTabs.tsx");
 const bazi=read("web-spa/src/fortune/result/BaZiTabs.tsx");
 assert.match(vedic,/r\.planets\|\|\[\]/);
 assert.match(vedic,/r\.houses\|\|\[\]/);
 assert.match(vedic,/aria-pressed=\{activeHouse===Number\(h\.house\)\}/);
 assert.match(tarot,/selectedCard/);
 assert.match(bazi,/selectedPillar/);
});
test("search-param updates do not remount active forms via page key",()=>{
 const chrome=read("web-spa/src/components/AppChrome.tsx");
 assert.match(chrome,/key=\{location\.pathname\}/);
 assert.doesNotMatch(chrome,/key=\{location\.pathname\+location\.search\}/);
});
