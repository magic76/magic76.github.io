const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=name=>fs.readFileSync(path.resolve(__dirname,"../web-spa/src/games/"+name),"utf8");

test("AI transcript toggle has a stable concise accessible name",()=>{
 const page=read("GameSpeechBubble.tsx");
 assert.match(page,/const toggleLabel=expanded/);
 assert.match(page,/aria-label=\{toggleLabel\}/);
 assert.match(page,/crew-game-speech-preview" aria-hidden="true"/);
 assert.match(page,/aria-expanded=\{expanded\}/);
 assert.match(page,/aria-controls=\{panelId\}/);
});

test("AI transcript toggle keeps a 44px touch target on mobile and coarse pointers",()=>{
 const css=read("gameSpeechBubble.css");
 assert.match(css,/@media\(max-width:620px\)[\s\S]*?crew-game-speech-trigger\{min-height:44px\}/);
 assert.match(css,/@media\(pointer:coarse\)[\s\S]*?crew-game-speech-trigger\{min-height:44px\}/);
 assert.match(css,/touch-action:manipulation/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test("expanded AI transcript remains readable and independently scrollable on phones",()=>{
 const css=read("gameSpeechBubble.css");
 assert.match(css,/\.crew-game-speech-scroll\{[\s\S]*?overscroll-behavior:contain/);
 assert.match(css,/touch-action:pan-y/);
 assert.match(css,/@media\(max-width:620px\)[\s\S]*?font-size:12px;line-height:1\.65/);
 assert.match(css,/max-height:min\(9\.9em,34dvh\)/);
 assert.match(css,/@media\(pointer:coarse\)[\s\S]*?scrollbar-gutter:auto/);
});
