const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const sandbox={};sandbox.window=sandbox;vm.runInNewContext(read("web-spa/public/games/crew-play-engine.js"),sandbox);
const api=sandbox.CrewPlayEngine;

test("Connect Four uses gravity, alternates turns and detects a vertical win",()=>{
 let s=api.connect4New();
 assert.equal(s.cells.length,42);
 assert.equal(api.connect4Drop(s,-1,"player"),null);
 assert.equal(api.connect4Drop(s,0,"computer"),null);
 for(let n=0;n<3;n++){
  s=api.connect4Drop(s,0,"player");
  s=api.connect4Drop(s,6,"computer");
 }
 s=api.connect4Drop(s,0,"player");
 assert.equal(s.winner,"player");
 assert.equal(s.winningLine.length,4);
 assert.equal(s.cells[35],"player");
 assert.equal(api.connect4Drop(s,1,"computer"),null);
});

test("Connect Four AI chooses immediate victory before center bias and blocks a threat",()=>{
 const start=api.connect4New();
 const winning={...start,cells:start.cells.slice(),turn:"computer"};
 for(let y=5;y>=3;y--)winning.cells[y*7+1]="computer";
 assert.equal(api.connect4AI(winning),1);
 const blocking={...start,cells:start.cells.slice(),turn:"computer"};
 for(let y=5;y>=3;y--)blocking.cells[y*7+4]="player";
 assert.equal(api.connect4AI(blocking),4);
});

test("Reversi opens with four legal moves and flips only captured discs",()=>{
 let s=api.reversiNew();
 assert.equal(s.cells.length,64);
 assert.equal(api.reversiCount(s.cells).black,2);
 assert.equal(api.reversiCount(s.cells).white,2);
 assert.equal(api.reversiMoves(s,"black").length,4);
 assert.equal(api.reversiPlace(s,0,0,"black"),null);
 const m=api.reversiMoves(s,"black")[0];
 s=api.reversiPlace(s,m.x,m.y,"black");
 assert.equal(s.flipped.length,1);
 assert.equal(api.reversiCount(s.cells).black,4);
 assert.equal(api.reversiCount(s.cells).white,1);
 assert.equal(s.turn,"white");
 const ai=api.reversiAI(s);
 assert.ok(ai);
 assert.ok(api.reversiMoves(s,"white").some(x=>x.x===ai.x&&x.y===ai.y));
});

test("Crew Play is navigable, keeps old Gomoku and does not require voice to play",()=>{
 const app=read("web-spa/src/App.tsx"),home=read("web-spa/src/pages/HomePage.tsx"),friend=read("web-spa/src/friends/FriendsPage.tsx");
 const game=read("web-spa/src/games/CrewPlayGamePage.tsx");
 assert.match(app,/path="\/games" /);
 assert.match(app,/path="\/games\/:gameId" /);
 assert.match(app,/path="\/games\/friend-gomoku" /);
 assert.match(home,/to="\/games"/);
 assert.match(friend,/to="\/games"/);
 assert.match(game,/persistHistory:false/);
 assert.match(game,/sessionKind:"friend"/);
 assert.doesNotMatch(game,/conversationFlow:"friend"/);
 assert.match(game,/CrewBoardGames/);
 assert.match(game,/CrewWordGames/);
});

test("Guessing and mystery games provide locally verified yes-no clues",()=>{
 const puzzles=read("web-spa/src/games/playPuzzles.ts");
 const word=read("web-spa/src/games/CrewWordGames.tsx");
 assert.match(puzzles,/twentyItems:TwentyItem\[\]/);
 assert.match(puzzles,/mysteryCases:MysteryCase\[\]/);
 assert.match(word,/item\.traits\.includes\(id\)/);
 assert.match(word,/correctGuess\(item,guess\)/);
 assert.match(word,/caseFile\.solution/);
});

test("Connect Four and Reversi narrate every AI move only after it is applied",()=>{
 const board=read("web-spa/src/games/CrewBoardGames.tsx");
 const page=read("web-spa/src/games/CrewPlayGamePage.tsx");
 const styles=read("web-spa/src/games/crewPlay.css");
 assert.match(board,/setConnect\(next\);\s*const outcome=.*?\s*narrateMove\("\[CONNECT FOUR AFTER MOVE\]/s);
 assert.match(board,/setReversi\(next\);\s*const outcome=.*?\s*narrateMove\("\[REVERSI AFTER MOVE\]/s);
 assert.match(board,/speechGateRef\.current=true/);
 assert.match(board,/setSpeechPending\(true\)/);
 assert.match(board,/speechPending\|\|speechGateRef\.current/);
 assert.match(board,/speechGateRef\.current\|\|speechPending/);
 assert.match(board,/onBoardMove\(cue\)/);
 assert.match(board,/roundEpochRef\.current\+=1/);
 assert.match(board,/crew-play-skip-speech/);
 assert.match(page,/BOARD_VOICE_TIMEOUT_MS=25000/);
 assert.match(page,/onTurnComplete:\(spokenTurn\)=>\{/);
 assert.match(page,/turn\.completed=true/);
 assert.match(page,/if\(!turn\?\.sent\|\|!turn\.completed\|\|liveRef\.current\.state!=="listening"\)return/);
 assert.match(page,/if\(turn\.heardSpeaking\)\{finishBoardVoice\(\);return;\}/);
 assert.match(page,/persistHistory:false,sessionKind:"friend"/);
 assert.match(page,/onBoardMove=\{speakAfterBoardMove\}/);
 assert.match(page,/onSkipSpeech=\{skipBoardSpeech\}/);
 assert.match(styles,/\.crew-play-board-actions \.crew-play-skip-speech/);
});

test("Mystery generates a new, validated case from the existing Gemini Key with a safe fallback",()=>{
 const generator=read("web-spa/src/games/generateMystery.ts");
 const page=read("web-spa/src/games/CrewPlayGamePage.tsx");
 const word=read("web-spa/src/games/CrewWordGames.tsx");
 assert.match(generator,/geminiKey\(\)/);
 assert.match(generator,/await ensureCore\(\)/);
 assert.match(generator,/window\.CrewAI\.call\(prompt/);
 assert.match(generator,/strictModels:true/);
 assert.match(generator,/validateGeneratedMystery\(parsed\)/);
 assert.match(generator,/clues\.length<5\|\|data\.clues\.length>8/);
 assert.match(generator,/typeof row\.answer!=="boolean"/);
 assert.match(generator,/seen\.has\(fingerprint\)/);
 assert.match(page,/void generateCrewMystery\(friend\.name\)\.then\(result=>/);
 assert.match(page,/setMysteryStatus\("generated"\)/);
 assert.match(page,/setMysteryStatus\("fallback"\)/);
 assert.match(page,/setMysteryCase\(fallbackMystery\)/);
 assert.match(page,/kind==="mystery"&&mysteryStatus==="generating"/);
 assert.match(page,/const voicePreparing=\(kind==="mystery"&&mysteryStatus==="generating"\)\|\|\(twenty&&questionStatus==="generating"\)/);
 assert.match(page,/disabled=\{voicePreparing\|\|isWord&&!hasKey\}/);
 assert.match(page,/const mystery=mysteryCase/);
 assert.match(word,/mysterySource==="generated"/);
 assert.match(word,/Gemini 原創謎題/);
});

test("20 Questions is Gemini-generated, records voice actions, and preserves the screen attempt budget",()=>{
 const generation=read("web-spa/src/games/generateTwentyItem.ts");
 const adjudicator=read("web-spa/src/games/judgeTwentySpeech.ts");
 const page=read("web-spa/src/games/CrewPlayGamePage.tsx");
 const word=read("web-spa/src/games/CrewWordGames.tsx");
 const puzzle=read("web-spa/src/games/playPuzzles.ts");
 assert.match(generation,/generateTwentyItem/);
 assert.match(generation,/await ensureCore\(\)/);
 assert.match(generation,/window\.CrewAI\.call\(prompt/);
 assert.match(generation,/validateTwentyItem\(candidate\)/);
 assert.match(generation,/recentAnswers/);
 assert.match(puzzle,/facts\?:\{question:Bilingual;answer:boolean\}\[\]/);
 assert.match(adjudicator,/judgeTwentySpeech/);
 assert.match(adjudicator,/conservative 20 Questions game judge/);
 assert.match(adjudicator,/normalize\(utterance\)\.includes\(normalize\(guess\)\)/);
 assert.match(page,/onTurnComplete:\(spokenTurn\)=>/);
 assert.match(page,/setVoiceTurns\(prev=>/);
 assert.match(page,/generateTwentyItem\(\)\.then\(item=>/);
 assert.match(page,/setQuestionStatus\("fallback"\)/);
 assert.match(page,/questionStatus==="generating"/);
 assert.match(page,/voiceTurns=\{voiceTurns\}/);
 assert.match(word,/handledRef\.current\.has\(turn\.id\)/);
 assert.match(word,/voiceQueueRef\.current=voiceQueueRef\.current\.then/);
 assert.match(word,/await judgeTwentySpeech\(item,speech\)/);
 assert.match(word,/if\(judgement\.type==="chat"\)/);
 assert.match(word,/applyGuess\(judgement\.guess,voice\)/);
 assert.match(word,/if\(!record\(/);
 assert.match(word,/askedRef\.current=next;setAsked\(next\)/);
 assert.match(word,/const correct=correctGuess\(item,guess\)/);
 assert.match(word,/count>=limit/);
 assert.match(word,/item\.traits\.includes\(id\)/);
 assert.match(word,/caseFile\.solution/);
});

test("Voice-first 20 Questions shows the friend at top, a single dock, and compact clues",()=>{
 const page=read("web-spa/src/games/CrewPlayGamePage.tsx");
 const word=read("web-spa/src/games/CrewWordGames.tsx");
 const css=read("web-spa/src/games/crewPlay.css");
 assert.match(page,/crew-play-page--twenty/);
 assert.match(page,/!wordGame\?<section className="crew-play-friend-bar">/);
 assert.match(page,/crew-play-voice-presence/);
 assert.match(page,/crew-play-voice-presence-reply/);
 assert.match(page,/crew-play-voice-dock-shell/);
 assert.match(page,/const voiceActions=/);
 assert.equal(page.match(/<LiveControls live=\{live\}/g)?.length,1,"The same Live controls must not render twice");
 assert.match(page,/\{!twenty\?<section className="crew-play-voice">/);
 assert.match(word,/crew-play-question-disclosure/);
 assert.match(word,/crew-play-history-older/);
 assert.match(word,/asked\.slice\(-3\)/);
 assert.match(word,/asked\.slice\(0,-3\)/);
 assert.match(css,/bottom:calc\(var\(--nav-h,68px\) \+ env\(safe-area-inset-bottom\) \+ 8px\)/);
 assert.match(css,/\.crew-play-voice-dock-shell\{position:fixed;z-index:42/);
 assert.match(css,/\.crew-play-session--word\{padding-bottom:160px\}/);
 assert.match(css,/\.crew-play-question-disclosure>summary/);
 assert.match(css,/\.crew-play-voice-presence-reply/);
});

test("Only the two word games require active Live voice; chess remains playable without Gemini",()=>{
 const page=read("web-spa/src/games/CrewPlayGamePage.tsx");
 const hub=read("web-spa/src/games/CrewPlayHubPage.tsx");
 const css=read("web-spa/src/games/crewPlay.css");
 assert.match(page,/const wordGame=gameId==="twenty-questions"\|\|gameId==="mystery"/);
 assert.match(page,/const isWord=kind==="twenty-questions"\|\|kind==="mystery"/);
 assert.match(page,/const wordReady=isWord&&\(live\.state==="listening"\|\|live\.state==="speaking"\)/);
 assert.match(page,/setWordEverReady\(true\)/);
 assert.match(page,/isWord&&wordEverReady&&/);
 assert.match(page,/inert=\{!wordReady\}/);
 assert.match(page,/crew-play-voice-entrance/);
 assert.match(page,/crew-play-voice-recovery/);
 assert.match(page,/GeminiSetupNotice/);
 assert.match(page,/!isWord\?<section className="crew-play-voice">/);
 assert.match(page,/isWord&&voiceActive\?<section className="crew-play-voice-dock-shell"/);
 assert.match(page,/crew-play-voice-paused/);
 assert.match(page,/kind==="connect4"\|\|kind==="reversi"\?<CrewBoardGames/);
 assert.match(hub,/需要 Gemini 語音/);
 assert.match(hub,/語音選用/);
 assert.match(css,/\.page\.page-enter:has\(\.crew-play-page--voice-required\)\{animation:none\}/);
});
