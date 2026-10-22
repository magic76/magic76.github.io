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
 assert.match(page,/\[roundSeconds,setRoundSeconds\]=useState\(120\)/);
 assert.match(page,/\[120,180,0\]\.map/);
 assert.match(style,/crew-taboo-timer-track/);
 assert.match(style,/max-width:430px/);
});

test("Taboo distinguishes guessing from describing and retains keyboard input",()=>{
 assert.match(page,/mode==="describe"/);
 assert.match(page,/friendGuesses\(card,descriptions\.current\.join\(" "\)\)/);
 assert.match(page,/matchTabooGuess\(card,value\)/);
 assert.match(page,/onSubmit=\{handleSubmit\}/);
 assert.match(page,/setRevealed\(true\)/);
 assert.match(page,/跳過這題/);
});

test("Taboo semantic guesser has round scoped guards and an explicit offline fallback",()=>{
 assert.match(page,/generateTabooGuess\(descriptions\.current,previousGuesses\.current\)/);
 assert.match(page,/guessSerial\.current!==request/);
 assert.match(page,/matchTabooGuess\(card,guess\)/);
 assert.match(page,/if\(!geminiKey\(\)\)/);
 assert.match(page,/tabooFollowUp\(freshGuess,"",descriptions\.current\.length\)/);
 assert.match(page,/parseTabooLiveGuess\(liveReply\)/);
 assert.match(page,/correct\(spokenGuess,true\)/);
 assert.doesNotMatch(page,/onReply=\{onReply\}/);
});
