const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const src=p=>fs.readFileSync(path.join(root,"web-spa/src",p),"utf8");
const langs=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];

test("#12 finished boards render a result- and move-aware end card with a rematch",()=>{
 const card=src("games/GameEndCard.tsx");
 const boards=src("games/CrewBoardGames.tsx");
 const gomoku=src("games/FriendGomokuPage.tsx");
 assert.match(card,/t\("playHub\.gameEnd\."\+result,\{name:friendName\}\)/);
 assert.match(card,/t\("playHub\.gameEnd\.moves",\{count:moves\}\)/);
 assert.doesNotMatch(card,/chat=text|crew-game-end-chat|gameEnd\.hint/);
 assert.match(card,/onClick=\{onRematch\}/);
 assert.match(boards,/connect\.winner.*GameEndCard|GameEndCard game="connect4"/s);
 assert.match(boards,/GameEndCard game="reversi"/);
 assert.match(gomoku,/GameEndCard game="gomoku"/);
 assert.match(boards,/onRematch=\{restart\}/);
 assert.match(gomoku,/onRematch=\{newGame\}/);
 const css=src("games/gameEndCard.css");
 assert.match(css,/min-height:44px/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 // The finished board must be scrollable above the fixed chat dock and nav
 // on both 360px and 390px mobile viewports, without changing active play.
 assert.match(card,/window\.matchMedia\?\.\("\(max-width: 620px\)"\)/);
 assert.match(card,/getBoundingClientRect\(\)\.top/);
 assert.match(card,/window\.scrollBy\(\{top:Math\.ceil\(hiddenPixels\),behavior:"auto"\}\)/);
 assert.match(css,/:has\(\.crew-game-end\):has\(\.crew-play-voice\.game-voice-dock\)/);
 assert.match(css,/:has\(\.crew-game-end\):has\(\.friend-gomoku-voice-dock\.game-voice-dock\)/);
 assert.match(css,/padding-bottom:calc\(230px \+ var\(--nav-h,68px\) \+ env\(safe-area-inset-bottom\)\)/);
 assert.ok(Buffer.byteLength(card)<26000);
 for(const page of ["games/CrewBoardGames.tsx","games/FriendGomokuPage.tsx","live/TextChatPanel.tsx"])
  assert.ok(Buffer.byteLength(src(page))<26000,page+" exceeds TSX cap");
});

test("#12 safe, allowlisted handoff carries outcomes to Zoe without inventing board history",()=>{
 const handoff=src("live/gameRoundHandoff.ts"),textPanel=src("live/TextChatPanel.tsx"),starters=src("live/TextChatStarters.tsx");
 assert.match(handoff,/new URLSearchParams/);
 assert.match(handoff,/\bresult==="win"/);
 assert.match(handoff,/\bmoves<=225/);
 assert.match(handoff,/not the actual moves or positions/);
 assert.match(handoff,/Never claim you saw or reviewed the board/);
 assert.match(textPanel,/gameRoundContext\(/);
 assert.match(textPanel,/isGameRoundLink\(\)/);
 assert.match(starters,/gameRoundStarter\(/);
 assert.match(starters,/gameStarter\|\|firstStarter/);
 for(const locale of langs){
  const friends=JSON.parse(fs.readFileSync(path.join(root,`web-spa/src/i18n/locales/${locale}/friends.json`),"utf8"));
  for(const id of ["game-connect4","game-gomoku","game-reversi"])
   assert.doesNotMatch(friends.textStarters.topics[id],/回顧|棋步|review (?:my |the )?moves|revisar mis movimientos|revoir mes coups|meine Züge|돌아보자/i,locale+":"+id);
 }
});

test("#12 all 11 game catalogs have end-card labels with string leaves",()=>{
 for(const locale of langs){
  const data=JSON.parse(fs.readFileSync(path.join(root,`web-spa/src/i18n/locales/${locale}/games.json`),"utf8"));
  for(const key of ["heading","win","lose","draw","moves","hint","chat","again"])
   assert.equal(typeof data.playHub.gameEnd[key],"string",locale+" "+key);
  assert.match(data.playHub.gameEnd.lose,/\{\{name\}\}/);
  assert.match(data.playHub.gameEnd.moves,/\{\{count\}\}/);
  const check=obj=>{if(typeof obj==="object"&&obj!==null)for(const value of Object.values(obj))check(value);else assert.equal(typeof obj,"string",locale+" non-string translation")};
  check(data);
 }
});
