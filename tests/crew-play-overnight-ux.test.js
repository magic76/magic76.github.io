const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const game=name=>fs.readFileSync(path.join(root,"web-spa/src/games",name),"utf8");
const live=name=>fs.readFileSync(path.join(root,"web-spa/src/live",name),"utf8");

test("Crew Play discovery provides accessible filters, search and useful empty states",()=>{
 const hub=game("CrewPlayHubPage.tsx");
 const css=game("crewPlay.css");
 assert.match(hub,/type HubFilter="all"\|"no-key"\|"ai"/);
 assert.match(hub,/role="group" aria-label=\{zh\?/);
 assert.match(hub,/aria-pressed=\{filter===item.id\}/);
 assert.match(hub,/type="search" value=\{search\}/);
 assert.match(hub,/const shownCount=/);
 assert.match(hub,/shownCount===0/);
 assert.match(css,/\.crew-play-game-card\[hidden\]\{display:none\}/);
 assert.match(css,/\.crew-play-search input\{/);
 assert.match(css,/\.crew-play-filter:focus-visible/);
});
test("The resume entry is optional, safe on the server, and validates saved game IDs",()=>{
 const hub=game("CrewPlayHubPage.tsx");
 assert.match(hub,/const \[recentId,setRecentId\]=useState\(""\)/);
 assert.match(hub,/window\.localStorage\.getItem\(recentGameKey\)/);
 assert.match(hub,/window\.localStorage\.setItem\(recentGameKey,id\)/);
 assert.match(hub,/knownGames\.has\(saved\)/);
 assert.match(hub,/useEffect\(\(\)=>\{/);
});
test("Streaming AI dialogue never auto-jumps away from the line being read",()=>{
 const speech=game("GameSpeechBubble.tsx");
 assert.match(speech,/followLatestRef=useRef\(true\)/);
 assert.match(speech,/scrollTop=scrollRef\.current\.scrollHeight/);
 assert.match(speech,/panel\.scrollHeight-panel\.scrollTop-panel\.clientHeight<28/);
 assert.match(speech,/onScroll=\{onTranscriptScroll\}/);
 assert.match(game("gameSpeechBubble.css"),/\.crew-game-speech-trigger\{[\s\S]*?min-height:34px;/);
});
test("Board games block duplicate fast-tap moves, and report startup clearly",()=>{
 const board=game("CrewBoardGames.tsx");
 assert.match(board,/playerMoveLockRef=useRef\(false\)/);
 assert.match(board,/connectDropIdRef\.current!==null\|\|playerMoveLockRef\.current/);
 assert.match(board,/speechPending\|\|playerMoveLockRef\.current/);
 assert.match(board,/playerMoveLockRef\.current=true/);
 assert.match(board,/tabIndex=\{y===0\?0:-1\}/);
 assert.match(board,/Setting up board/);
});

test("Werewolf keeps NPC replies and safe conversation starters next to the debate composer",()=>{
 const page=game("WerewolfPage.tsx");
 const css=game("werewolf.css");
 assert.match(page,/const latestNpc=game\?\.entries\.slice\(\)\.reverse\(\)\.find/);
 assert.match(page,/latestNpc\?<div className="wolf-latest-reply"/);
 assert.match(page,/className="wolf-quick-lines"/);
 assert.match(page,/setDraft\(current=>current\.trim\(\)\?/);
 assert.match(page,/ref=\{composeRef\}/);
 assert.match(page,/onScroll=\{handleHistoryScroll\}/);
 assert.match(page,/followHistoryRef\.current/);
 assert.match(page,/className="wolf-voice-options"/);
 assert.match(css,/\.wolf-latest-reply\{/);
 assert.match(css,/\.wolf-quick-lines button\{/);
});
test("1A2B keypad has familiar numeric order, visible progress and safe finishing",()=>{
 const page=game("NumberGamePage.tsx");
 const css=game("miniGames.css");
 assert.match(page,/\[1,2,3,4,5,6,7,8,9,null,0,null\]/);
 assert.match(page,/className="crew-mini-turn-progress"/);
 assert.match(page,/submitLockRef=useRef\(false\)/);
 assert.match(page,/if\(finished\|\|submitLockRef\.current\)return/);
 assert.match(page,/const undo=\(\)=>\{if\(finished\|\|!history\.length\)return/);
 assert.match(page,/history\.length>0&&!finished\?<button/);
 assert.match(css,/\.crew-mini-keypad\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test("Shared game panels do not dismiss when a touch starts inside the sheet",()=>{
 const panel=game("GamePanel.tsx");
 assert.match(panel,/backdropPointerRef=useRef\(false\)/);
 assert.match(panel,/onPointerDown=\{backdropPointer\}/);
 assert.match(panel,/onPointerUp=\{closeFromBackdrop\}/);
 assert.match(panel,/backdropPointerRef\.current&&event\.target===event\.currentTarget/);
 assert.doesNotMatch(panel,/onMouseDown=/);
 assert.match(panel,/event\.key==="Escape"/);
 assert.match(panel,/triggerRef\.current\?\.focus\(\)/);
});
test("Compact Live controls stay reachable on narrow phones without noisy timer announcements",()=>{
 const controls=live("LiveControls.tsx");
 const css=live("gameVoiceCompact.css");
 assert.match(controls,/role="status" aria-live="polite" aria-atomic="true"/);
 assert.match(controls,/className="crew-game-voice-timer" aria-hidden="true"/);
 assert.match(css,/@media\(max-width:430px\)/);
 assert.match(css,/\.crew-game-voice-row\{align-items:stretch;flex-direction:column/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/\.crew-game-voice-actions:has\(\.is-interrupt\)\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/touch-action:manipulation/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
