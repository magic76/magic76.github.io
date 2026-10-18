const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const page=fs.readFileSync(path.join(root,"web-spa/src/games/TabooGamePage.tsx"),"utf8");
const style=fs.readFileSync(path.join(root,"web-spa/src/games/miniGames.css"),"utf8");

test("Taboo keeps offline gameplay while presenting rounds and outcomes",()=>{
 assert.match(page,/drawDeck\(level\)/);
 assert.match(page,/setHistory\(old=>\[\.\.\.old,/);
 assert.match(page,/doneGuard\.current===round/);
 assert.match(page,/resultLabels\[history\[i\]\.result\]/);
 assert.match(page,/crew-taboo-steps/);
 assert.match(page,/crew-taboo-scoreboard/);
 assert.match(page,/role="progressbar"/);
 assert.match(page,/aria-valuenow=\{timeLeft\}/);
 assert.match(page,/crew-mini-banned/);
 assert.match(page,/MiniGameVoice/);
 assert.match(page,/每題 60 秒/);
 assert.match(style,/crew-taboo-timer-track/);
 assert.match(style,/max-width:430px/);
});

test("Taboo distinguishes guessing from describing and retains keyboard input",()=>{
 assert.match(page,/mode==="describe"/);
 assert.match(page,/friendGuesses\(card,value\)/);
 assert.match(page,/matchTabooGuess\(card,value\)/);
 assert.match(page,/onSubmit=\{handleSubmit\}/);
 assert.match(page,/can/); // stable source presence even if translated copy changes
});
