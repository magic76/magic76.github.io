const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const source=stripTypeScriptTypes(read("web-spa/src/games/quickPlayEngine.ts"),{mode:"strip"}).replace(/^export /gm,"");
const api=new Function(source+"\nreturn {newBomb,bombGuess,bombComputerGuess,newMemory,flipMemory,resolveMemory,memoryComputerPick,parseBombSpeech,parseMemorySpeech};")();

test("number bomb is hosted: only player guesses and the verified range shrinks",()=>{
 const initial=api.newBomb(()=>.49);
 assert.equal(initial.secret,50);
 assert.equal(api.bombGuess(initial,101,"player"),null);
 assert.equal(api.bombGuess(initial,25,"friend"),null);
 let state=api.bombGuess(initial,25,"player");
 assert.equal(state.low,26);assert.equal(state.turn,"player");assert.equal(state.history[0].hint,"higher");
 assert.equal(api.bombGuess(state,30,"friend"),null);
 state=api.bombGuess(state,75,"player");
 assert.equal(state.high,74);assert.equal(state.turn,"player");
 state=api.bombGuess(state,50,"player");
 assert.equal(state.winner,"player");assert.equal(state.history[2].hint,"correct");
 assert.equal(api.bombGuess(state,51,"player"),null);
});
test("number wheel midpoint remains in the allowed range",()=>{
 const state=api.bombGuess(api.newBomb(()=>.9),25,"player");
 assert.ok(api.bombComputerGuess(state)>=state.low);
 assert.ok(api.bombComputerGuess(state)<=state.high);
});
test("memory builds genuine pairs, disallows invalid flips, settles matching turns",()=>{
 let state=api.newMemory(6,()=>.5);
 assert.equal(state.cards.length,12);
 for(let i=0;i<6;i++)assert.equal(state.cards.filter(card=>card===i).length,2);
 const a=state.cards.findIndex(v=>v===0),b=state.cards.findIndex((v,i)=>v===0&&i!==a);
 state=api.flipMemory(state,a);
 assert.equal(api.flipMemory(state,a),null);
 state=api.flipMemory(state,b);
 assert.equal(api.flipMemory(state,2),null);
 state=api.resolveMemory(state);
 assert.equal(state.playerPairs,1);assert.equal(state.matched.length,2);
 assert.equal(state.turn,"player");assert.equal(state.moves,1);assert.equal(state.lastMatch,true);
});
test("memory AI remembers flipped cards instead of cheating with hidden answers",()=>{
 let state=api.newMemory(6,()=>.5);
 const pair=state.cards.map((v,i)=>v===2?i:-1).filter(i=>i>=0);
 state={...state,turn:"friend",seen:{2:pair}};
 assert.equal(api.memoryComputerPick(state),pair[0]);
 state=api.flipMemory(state,pair[0]);
 assert.equal(api.memoryComputerPick(state),pair[1]);
 assert.equal(api.memoryComputerPick({...state,turn:"player"}),null);
});
test("quick play uses public routes, local engines and usage funnel",()=>{
 const app=read("web-spa/src/App.tsx");
 const hub=read("web-spa/src/games/CrewPlayHubPage.tsx");
 const page=read("web-spa/src/games/QuickPlayGamePage.tsx");
 for(const slug of ["number-bomb","memory"]){
  assert.ok(app.includes('/games/'+slug));
  assert.ok(hub.includes('id:"'+slug+'"'));
  assert.ok(page.includes('"game_open",kind'));
  assert.ok(page.includes('"game_started","'+slug+'"'));
  assert.ok(page.includes('"game_completed","'+slug+'"'));
 }
 assert.ok(page.includes('Free to play · Gemini Key needed for voice'));
});

test("matching pair grants another turn; a miss passes the turn",()=>{
 let game=api.newMemory(6,()=>.7);
 const first=game.cards.findIndex(x=>x===0);
 const second=game.cards.findIndex((x,i)=>x===0&&i!==first);
 game=api.resolveMemory(api.flipMemory(api.flipMemory(game,first),second));
 assert.equal(game.turn,"player");
 assert.equal(game.playerPairs,1);
 let a=-1,b=-1;
 for(let i=0;i<game.cards.length;i++){
  if(game.matched.includes(i))continue;
  if(a<0)a=i;
  else if(game.cards[a]!==game.cards[i]){b=i;break}
 }
 game=api.resolveMemory(api.flipMemory(api.flipMemory(game,a),b));
 assert.equal(game.turn,"friend");
 assert.equal(game.lastMatch,false);
 const f=game.cards.map((x,i)=>x===1&&!game.matched.includes(i)?i:-1).filter(i=>i>=0);
 game=api.resolveMemory(api.flipMemory(api.flipMemory(game,f[0]),f[1]));
 assert.equal(game.turn,"friend");
 assert.equal(game.friendPairs,1);
});
test("spoken guesses accept deliberate Chinese and English commands only",()=>{
 assert.equal(api.parseBombSpeech("我猜七十五"),75);
 assert.equal(api.parseBombSpeech("猜 50"),50);
 assert.equal(api.parseBombSpeech("I guess sixty four"),64);
 assert.equal(api.parseBombSpeech("one hundred"),100);
 assert.equal(api.parseBombSpeech("今天好像有五個人"),null);
 assert.equal(api.parseBombSpeech("猜 101"),null);
 assert.equal(api.parseMemorySpeech("翻第三張"),3);
 assert.equal(api.parseMemorySpeech("flip card eight"),8);
 assert.equal(api.parseMemorySpeech("我想聊天"),null);
});
test("wheel is native scroll-snapped with keyboard and clamped range",()=>{
 const src=read("web-spa/src/games/NumberWheel.tsx");
 const css=read("web-spa/src/games/quickPlay.css");
 assert.match(src,/onScroll=\{onScroll\}/);
 assert.match(src,/onKeyDown=\{onKeyDown\}/);
 assert.match(src,/Math\.max\(min,Math\.min\(max,value\)\)/);
 assert.match(src,/role="listbox"/);
 assert.match(css,/scroll-snap-type:y mandatory/);
});

test("quick games mount the existing Live voice companion without remounting on each round",()=>{
 const page=read("web-spa/src/games/QuickPlayGamePage.tsx");
 const shared=read("web-spa/src/games/MiniGameFrame.tsx");
 assert.match(page,/<MiniGameVoice key=\{kind\+":"\+friendId\}/);
 assert.match(page,/parseBombSpeech\(text\)/);
 assert.match(page,/parseMemorySpeech\(text\)/);
 assert.match(shared,/quick\?"\\n\[CREW PLAY QUICK GAME/);
 assert.ok(page.includes("The same player gets another turn."));
});

test("Number Bomb is hosted and announces only verified player guesses",()=>{
 const page=read("web-spa/src/games/QuickPlayGamePage.tsx");
 const frame=read("web-spa/src/games/MiniGameFrame.tsx");
 assert.match(page,/Number Bomb HOST: The player CONFIRMED guess/);
 assert.match(page,/pendingNarration\.current=\{move:next\.history\.length/);
 assert.match(page,/\[state\.history\.length,onCue,voiceActive\]/);
 assert.doesNotMatch(page,/bombGuess\(state,guess,"friend"\)/);
 assert.match(frame,/You are the HOST of Number Bomb, NEVER a contestant/);
 assert.match(frame,/Wait silently for the authoritative \[VERIFIED GAME\]/);
 assert.match(page,/waitingHost/);
});
test("Memory Match waits for completed pair and audio drain before another AI pair",()=>{
 const page=read("web-spa/src/games/QuickPlayGamePage.tsx");
 const frame=read("web-spa/src/games/MiniGameFrame.tsx");
 const resolved=page.indexOf('text:"Memory Match PAIR COMPLETED AND BOARD UPDATED.');
 assert.ok(resolved>0);
 assert.ok(page.indexOf("setState(next);",resolved)>resolved);
 assert.match(page,/pending\.move!==state\.moves/);
 assert.match(page,/waitingCueId!==null/);
 assert.match(page,/settledCueId>=waitingCueId/);
 assert.match(frame,/pending\.heardSpeaking=true/);
 assert.match(frame,/live\.state==="listening"&&pending\.heardSpeaking/);
});
test("range stays legible within number wheel even if page header scrolls away",()=>{
 const wheel=read("web-spa/src/games/NumberWheel.tsx");
 const css=read("web-spa/src/games/quickPlay.css");
 assert.match(wheel,/className="crew-number-wheel-bounds"/);
 assert.match(wheel,/\{min\} — \{max\}/);
 assert.match(css,/\.crew-number-wheel-bounds\{position:absolute/);
 assert.match(css,/\.crew-quick-stage>\.crew-quick-range\{position:sticky/);
});
