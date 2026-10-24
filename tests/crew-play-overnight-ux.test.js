const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const game=name=>fs.readFileSync(path.join(root,"web-spa/src/games",name),"utf8");

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
 assert.match(game("gameSpeechBubble.css"),/\.crew-game-speech-trigger\{min-height:34px\}/);
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
