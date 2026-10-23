const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const src=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");

test("Crew Play speech uses an explicit accessible expansion control",()=>{
 const component=src("web-spa/src/games/GameSpeechBubble.tsx");
 assert.match(component,/useState\(false\)/);
 assert.match(component,/aria-expanded=\{expanded\}/);
 assert.match(component,/aria-controls=\{panelId\}/);
 assert.match(component,/onClick=\{\(\)=>setExpanded\(current=>!current\)\}/);
 assert.match(component,/hidden=\{!expanded\}/);
 assert.match(component,/tabIndex=\{expanded\?0:-1\}/);
 assert.match(component,/role="region"/);
});

test("expanded reply has a bounded five-line internal scroll instead of growing the page",()=>{
 const css=src("web-spa/src/games/gameSpeechBubble.css");
 assert.match(css,/max-height:8em;\s*\/\* Five lines at line-height 1\.6 \*\//);
 assert.match(css,/overflow-y:auto/);
 assert.match(css,/overscroll-behavior:contain/);
 assert.match(css,/crew-game-speech-scroll\[hidden\]\{display:none\}/);
 assert.match(css,/line-clamp:1/);
});

test("all Crew Play voice families share the expandable transcript without changing live state",()=>{
 const mini=src("web-spa/src/games/MiniGameFrame.tsx");
 const play=src("web-spa/src/games/CrewPlayGamePage.tsx");
 const gomoku=src("web-spa/src/games/FriendGomokuPage.tsx");
 const court=src("web-spa/src/games/CrazyCourtPage.tsx");
 assert.match(mini,/<GameSpeechBubble text=\{live\.output\}/);
 assert.match(play,/<GameSpeechBubble className="crew-play-voice-presence-reply"/);
 assert.match(play,/<GameSpeechBubble text=\{live\.output\|\|/);
 assert.match(gomoku,/<GameSpeechBubble english=\{english\} text=\{live\.output/);
 assert.match(court,/<GameSpeechBubble key=\{turn\}/);
 const bubble=src("web-spa/src/games/GameSpeechBubble.tsx");
 assert.doesNotMatch(bubble,/live\.(start|stop|sendText|interrupt)/);
});
