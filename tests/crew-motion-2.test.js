const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");

test("Explore animations are scoped, transient and safe on small touch screens",()=>{
 const css=read("web-spa/src/pages/crewExplore.css");
 assert.match(css,/@keyframes crew-explore-art-arrive/);
 assert.match(css,/crew-explore-tile:is\(:hover,:focus-visible,:active\)/);
 assert.match(css,/@media\(max-width:420px\)/);
 assert.match(css,/@media\(hover:none\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/crew-explore-illustration::after\{display:none\}/);
});

test("Shorts likes and translation animate only after a real interaction",()=>{
 const page=read("web-spa/src/teacher/ShortsPage.tsx");
 const css=read("web-spa/src/teacher/shorts.css");
 assert.match(page,/const \[celebratingLike,setCelebratingLike\]/);
 assert.match(page,/if\(!likes\.includes\(id\)\)setCelebratingLike\(id\)/);
 assert.match(page,/aria-pressed=\{likes\.includes\(post\.id\)\}/);
 assert.match(page,/className=\{"crew-short-like"/);
 assert.match(css,/@keyframes crew-short-heart-pop/);
 assert.match(css,/crew-short-translation,\.crew-short-recap\[open\] p\{animation:/);
 assert.match(css,/\.crew-short-actions\{position:absolute/);
 assert.match(css,/\.crew-short-actions\{position:absolute;[^}]*bottom:152px/);
 assert.match(css,/min-width:44px;min-height:44px/);
 assert.match(css,/scroll-snap-type:y proximity/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/crew-short-like\.is-celebrating::after\{display:none\}/);
});

test("Live presence shows actual listening, speaking, waiting and errors without fake amplitude",()=>{
 const teacher=read("web-spa/src/teacher/LivePage.tsx");
 const friend=read("web-spa/src/friends/FriendLivePage.tsx");
 const motion=read("web-spa/src/motion.css");
 assert.match(teacher,/const awaitingReply=.*"no-reply"/);
 assert.match(teacher,/data-state=\{presenceState\} role="status"/);
 assert.match(friend,/const friendVisualState=/);
 assert.match(friend,/data-state=\{friendVisualState\}/);
 assert.match(motion,/teacher-presence-shell\[data-state="speaking"\]/);
 assert.match(motion,/friend-live-avatar\[data-state="listening"\]/);
 assert.match(motion,/status\[data-state="error"\]/);
 assert.match(motion,/@media\(prefers-reduced-motion:reduce\)/);
});

test("Teacher board only animates real card changes and confirmed quiz feedback",()=>{
 const board=read("web-spa/src/teacher/TeacherBoardPage.tsx");
 const card=read("web-spa/src/teacher/TeachingCard.tsx");
 const css=read("web-spa/src/teacher/teachingBoard.css");
 assert.match(board,/data-following=\{following\}/);
 assert.match(card,/className=\{answered&&i===q\.answerIndex\?"correct"/);
 assert.match(css,/data-following="true"/);
 assert.match(css,/\.teaching-board-options button\.correct\{animation:/);
 assert.match(css,/\.teaching-board-options button\.incorrect\{animation:/);
 assert.match(css,/teaching-board-flash-inner\{display:block/);
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
