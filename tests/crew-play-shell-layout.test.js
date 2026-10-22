const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const game=name=>fs.readFileSync(path.join(__dirname,"../web-spa/src/games",name),"utf8");

test("shared game panel provides portal, dialog semantics, focus trapping and Escape",()=>{
 const panel=game("GamePanel.tsx");
 assert.match(panel,/createPortal\(/);
 assert.match(panel,/aria-modal="true"/);
 assert.match(panel,/aria-labelledby=\{titleId\}/);
 assert.match(panel,/event\.key==="Escape"/);
 assert.match(panel,/event\.key!=="Tab"/);
 assert.match(panel,/triggerRef\.current\?\.focus\(\)/);
 assert.match(panel,/document\.body\.style\.overflow=previousOverflow/);
});
test("mini-games keep Live mounted outside settings and restrict destructive changes",()=>{
 const shell=game("MiniGameFrame.tsx");
 const taboo=game("TabooGamePage.tsx");
 const number=game("NumberGamePage.tsx");
 assert.match(shell,/<GamePanel title="選擇 Crew 朋友"/);
 assert.match(taboo,/disabled=\{phase==="playing"\}/);
 assert.match(taboo,/<GamePanel label="玩法"/);
 assert.match(taboo,/<MiniGameVoice/);
 assert.match(number,/history\.slice\(-3\)/);
 assert.match(number,/<GamePanel label="完整紀錄"/);
 assert.match(number,/window\.confirm/);
});
test("game voice stays reachable on mobile without hiding the play surface",()=>{
 const mini=game("miniGames.css");
 const play=game("crewPlay.css");
 const gomoku=game("games.css");
 assert.match(mini,/\.crew-mini-page \.crew-mini-voice,[\s\S]*?position:fixed/);
 assert.match(mini,/safe-area-inset-bottom/);
 assert.match(mini,/\.crew-mini-page:has\(input:focus\) \.crew-mini-voice/);
 assert.match(play,/\.crew-play-page:not\(\.crew-play-page--voice-required\) \.crew-play-voice/);
 assert.match(gomoku,/\.friend-gomoku-voice-dock\{/);
 assert.match(game("FriendGomokuPage.tsx"),/className="friend-gomoku-voice-dock"/);
});
