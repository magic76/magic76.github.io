const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const src=p=>fs.readFileSync(path.join(root,"web-spa/src",p),"utf8");
const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];

test("#61 desktop reveals the shared end card without moving focus; mobile keeps its fixed-dock avoidance",()=>{
 const card=src("games/GameEndCard.tsx");
 assert.match(card,/matchMedia.*max-width: 620px/);
 assert.match(card,/if\(!isMobile\)/);
 assert.match(card,/scrollIntoView\(/);
 assert.match(card,/block:"nearest"/);
 assert.match(card,/prefers-reduced-motion: reduce/);
 assert.match(card,/behavior:reduceMotion\?"auto":"smooth"/);
 assert.match(card,/getBoundingClientRect\(\)\.top/);
 assert.match(card,/window\.scrollBy\(/);
 assert.doesNotMatch(card,/\.focus\(/);
});

test("#61 finished boards hide only the duplicate generic chat action, preserving the contextual card and rematch",()=>{
 const css=src("games/gameEndCard.css");
 const dock=src("games/GameVoiceDock.tsx");
 const board=src("games/CrewBoardGames.tsx");
 const gomoku=src("games/FriendGomokuPage.tsx");
 assert.match(css,/:has\(\.crew-game-end\)/);
 assert.match(css,/\.game-voice-dock-chat\s*\{\s*display\s*:\s*none/);
 assert.match(css,/crew-play-page/);
 assert.match(css,/friend-gomoku-page/);
 assert.match(dock,/game-voice-dock-chat/);
 assert.match(board,/GameEndCard game="connect4"/);
 assert.match(board,/GameEndCard game="reversi"/);
 assert.match(gomoku,/GameEndCard game="gomoku"/);
 assert.match(src("games/GameEndCard.tsx"),/onRematch/);
});

test("#61 finished-card CTAs reuse string translations in all 11 catalogs",()=>{
 for(const locale of locales){
  const games=JSON.parse(fs.readFileSync(path.join(root,"web-spa/src/i18n/locales",locale,"games.json"),"utf8"));
  for(const key of ["heading","chat","again"]){
   assert.equal(typeof games.playHub.gameEnd[key],"string",locale+":"+key);
   assert.ok(games.playHub.gameEnd[key].trim().length>0,locale+":"+key);
  }
 }
});
