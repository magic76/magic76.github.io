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

test("Connect Four and Reversi narrate planned AI moves before the stone appears",()=>{
 const board=read("web-spa/src/games/CrewBoardGames.tsx");
 const page=read("web-spa/src/games/CrewPlayGamePage.tsx");
 const styles=read("web-spa/src/games/crewPlay.css");
 assert.match(board,/narrateMove\("\[CONNECT FOUR BEFORE MOVE\]/);
 assert.match(board,/narrateMove\("\[REVERSI BEFORE MOVE\]/);
 assert.match(board,/\{kind:"connect4",position:String\(column\+1\)\},\(\)=>setConnect\(next\)/);
 assert.match(board,/\{kind:"reversi",position:position\(move\.x,move\.y\)\},\(\)=>setReversi\(next\)/);
 assert.match(board,/if\(roundEpochRef\.current!==epoch\)return/);
 assert.match(board,/placeStone\(\);\s*speechGateRef\.current=false/);
 assert.doesNotMatch(board,/\[CONNECT FOUR AFTER MOVE\]|\[REVERSI AFTER MOVE\]/);
 assert.match(board,/speechGateRef\.current=true/);
 assert.match(board,/setSpeechPending\(true\)/);
 assert.match(board,/speechPending\|\|speechGateRef\.current/);
 assert.match(board,/speechGateRef\.current\|\|speechPending/);
 assert.match(board,/onBoardMove\(cue,expected\)/);
 assert.match(board,/roundEpochRef\.current\+=1/);
 assert.match(board,/crew-play-skip-speech/);
 assert.match(page,/BOARD_VOICE_TIMEOUT_MS=25000/);
 assert.match(page,/onTurnComplete:\(spokenTurn\)=>\{/);
 assert.match(page,/turn\.completed=true/);
 assert.match(page,/if\(!turn\?\.sent\|\|!turn\.completed\|\|liveRef\.current\.state!=="listening"\)return/);
 assert.match(page,/if\(turn\.heardSpeaking\)finishBoardVoice\(\)/);
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
 assert.match(page,/setMysteryCase\(selectMysteryFallback\(\)\)/);
 assert.match(page,/kind==="mystery"&&mysteryStatus==="generating"/);
 assert.match(page,/const voicePreparing=loadedRound!==round\|\|/);
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
 assert.match(generation,/rememberPuzzle\("twenty",theme\.id/);
 assert.match(puzzle,/facts\?:\{question:Bilingual;answer:boolean\}\[\]/);
 assert.match(adjudicator,/judgeTwentySpeech/);
 assert.match(adjudicator,/conservative 20 Questions game judge/);
 assert.match(adjudicator,/normalize\(utterance\)\.includes\(normalize\(guess\)\)/);
 assert.match(page,/onTurnComplete:\(spokenTurn\)=>/);
 assert.match(page,/setVoiceTurns\(prev=>/);
 assert.match(page,/generateTwentyItem\(\)\.then\(item=>/);
 assert.match(page,/setQuestionStatus\("fallback"\)/);
 assert.match(page,/questionStatus==="generating"/);
 assert.match(page,/voiceTurns=\{voiceTurns\.filter\(turn=>turn\.round===round\)\}/);
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
 assert.match(page,/\{!isWord\?<section className="crew-play-voice">/);
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
 assert.match(page,/isWord&&wordEverReady&&!voicePreparing/);
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

test("Word game P0 keeps a Live transport across rounds and announces authoritative new facts",()=>{
 const page=read("web-spa/src/games/CrewPlayGamePage.tsx");
 const word=read("web-spa/src/games/CrewWordGames.tsx");
 const myst=read("web-spa/src/games/judgeMysterySpeech.ts");
 assert.match(page,/key=\{gameId\+":"\+friend\.id\}/);
 assert.doesNotMatch(page,/key=\{gameId\+":"\+friend\.id\+":"\+round\}/);
 assert.match(page,/const syncedRoundRef=useRef\(round\)/);
 assert.match(page,/setVoiceTurns\(prev=>\[\.\.\.prev\.slice\(-24\),\{id,text:transcript,round\}\]\)/);
 assert.match(page,/voiceTurns=\{voiceTurns\.filter\(turn=>turn\.round===round\)\}/);
 assert.match(page,/key=\{round\} kind=\{kind as/);
 assert.match(page,/syncedRoundRef\.current=round/);
 assert.match(page,/live\.sendControl\(updated\)/);
 assert.match(page,/CREW PLAY NEXT ROUND/);
 assert.match(page,/loadedRound!==round/);
 assert.match(page,/CREW PLAY NEXT ROUND/);
 assert.match(word,/await judgeMysterySpeech\(caseFile,speech\)/);
 assert.match(word,/20 QUESTIONS VERIFIED ANSWER/);
 assert.match(word,/MYSTERY VERIFIED ANSWER/);
 assert.match(myst,/Verified clue facts/);
});
test("Word game P1 styles use Live states and provide reduced-motion alternatives",()=>{
 const page=read("web-spa/src/games/CrewPlayGamePage.tsx");
 const word=read("web-spa/src/games/CrewWordGames.tsx");
 const css=read("web-spa/src/games/crewPlay.css");
 assert.match(page,/crew-play-voice-waves/);
 assert.match(page,/crew-play-generation-state/);
 assert.match(word,/crew-play-count-value/);
 assert.match(word,/crew-play-mystery-flip/);
 assert.match(word,/crew-play-celebration/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/crew-play-mystery-flip-inner/);
 assert.match(css,/crew-play-confetti/);
});

test("All board games use engine-selected move IDs to disambiguate stale speech",()=>{
 const page=read("web-spa/src/games/CrewPlayGamePage.tsx");
 const gomoku=read("web-spa/src/games/FriendGomokuPage.tsx");
 const board=read("web-spa/src/games/CrewBoardGames.tsx");
 assert.match(page,/matchesBoardNarration\(spokenTurn\.output,turn\.expected\)/);
 assert.match(page,/expected:ExpectedBoardSpeech/);
 assert.match(page,/session\.state==="listening"\|\|session\.state==="speaking"/);
 assert.match(gomoku,/matchesBoardNarration\(spokenTurn\.output,\{kind:"gomoku",position:coordinate\(waiting\.move\)\}\)/);
 assert.match(gomoku,/state!=="listening"&&state!=="speaking"/);
 assert.match(gomoku,/pendingCueRef\.current=null; \/\/ Retire cues/);
 assert.match(gomoku,/includes\(liveRef\.current\.state\)\?60:420/);
 assert.match(board,/kind:"connect4",position:String\(column\+1\)/);
 assert.match(board,/kind:"reversi",position:position\(move\.x,move\.y\)/);
});

test("Audio playback rather than transcript completion gates all AI stones",()=>{
 const gomoku=read("web-spa/src/games/FriendGomokuPage.tsx");
 const page=read("web-spa/src/games/CrewPlayGamePage.tsx");
 assert.match(gomoku,/if\(pending\.heardSpeaking\)commitAiMove\(\)/);
 assert.doesNotMatch(gomoku,/setTimeout\(\(\)=>\{\s*const waiting=waitingAiRef\.current/);
 assert.match(page,/if\(turn\.heardSpeaking\)finishBoardVoice\(\)/);
 assert.doesNotMatch(page,/if\(turn\.graceTimer===null\)/);
 assert.match(gomoku,/MAX_VOICE_TURN_MS=25000/);
 assert.match(page,/BOARD_VOICE_TIMEOUT_MS=25000/);
});

test("Word-game generation rotates genres, stores recent 50 puzzle fingerprints and retries near duplicates",()=>{
 const mystery=read("web-spa/src/games/generateMystery.ts");
 const twenty=read("web-spa/src/games/generateTwentyItem.ts");
 const page=read("web-spa/src/games/CrewPlayGamePage.tsx");
 const diversity=read("web-spa/src/games/puzzleDiversity.ts");
 assert.match(mystery,/nextPuzzleTheme\("mystery",attempt\)/);
 assert.match(twenty,/nextPuzzleTheme\("twenty",attempt\)/);
 assert.match(mystery,/for\(let attempt=0;attempt<3;attempt\+\+\)/);
 assert.match(twenty,/for\(let attempt=0;attempt<3;attempt\+\+\)/);
 assert.match(mystery,/isNearDuplicate\("mystery",candidate\)/);
 assert.match(twenty,/isNearDuplicate\("twenty",newAnswer\)/);
 assert.match(mystery,/rememberPuzzle\("mystery",theme\.id/);
 assert.match(twenty,/rememberPuzzle\("twenty",theme\.id/);
 assert.match(page,/chooseFallbackPuzzle\("mystery",mysteryCases/);
 assert.match(page,/chooseFallbackPuzzle\("twenty",twentyItems/);
 assert.match(diversity,/MAX_HISTORY=50/);
 assert.match(diversity,/localStorage/);
});
