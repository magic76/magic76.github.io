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
