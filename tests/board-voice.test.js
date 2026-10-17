const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
const file=path.join(__dirname,"../web-spa/src/games/boardVoiceTurn.ts");
const modulePromise=import(pathToFileURL(file).href);
const loadMatcher=async()=>(await modulePromise).matchesBoardNarration;

test("stale Gomoku intention does not complete an engine-selected AI move",async()=>{
 const matches=await loadMatcher();
 assert.equal(matches("You said J7; I understand.",{kind:"gomoku",position:"G8"}),false);
 assert.equal(matches("",{kind:"gomoku",position:"G8"}),false);
 assert.equal(matches("I'll place G8.",{kind:"gomoku",position:"G8"}),true);
 assert.equal(matches("I will choose G eight",{kind:"gomoku",position:"G8"}),true);
 assert.equal(matches("I will choose G 八",{kind:"gomoku",position:"G8"}),true);
 assert.equal(matches("I chose G80",{kind:"gomoku",position:"G8"}),false);
 assert.equal(matches("I played G8",{kind:"gomoku",position:"G7"}),false);
});
test("Reversi detects only the actual white-square announcement",async()=>{
 const matches=await loadMatcher();
 assert.equal(matches("You announced J7.",{kind:"reversi",position:"D3"}),false);
 assert.equal(matches("I played D3, and flipped a disc.",{kind:"reversi",position:"D3"}),true);
 assert.equal(matches("I played D three.",{kind:"reversi",position:"D3"}),true);
 assert.equal(matches("I played D30.",{kind:"reversi",position:"D3"}),false);
});
test("Connect Four verifies an entire column number rather than a neighboring one",async()=>{
 const matches=await loadMatcher();
 assert.equal(matches("You said column four.",{kind:"connect4",position:"3"}),false);
 assert.equal(matches("I drop in column 4.",{kind:"connect4",position:"4"}),true);
 assert.equal(matches("I use column four.",{kind:"connect4",position:"4"}),true);
 assert.equal(matches("我放在第4欄。",{kind:"connect4",position:"4"}),true);
 assert.equal(matches("I use column 10.",{kind:"connect4",position:"1"}),false);
 assert.equal(matches("I am still thinking.",{kind:"connect4",position:"2"}),false);
});
