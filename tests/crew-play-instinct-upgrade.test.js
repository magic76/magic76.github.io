const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const game=name=>fs.readFileSync(path.join(__dirname,"../web-spa/src/games",name),"utf8");
const compile=source=>stripTypeScriptTypes(source.replace(/^import .*$/gm,""),{mode:"strip"}).replace(/^export /gm,"");
const makeStorage=()=>{const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};};
function numberModel(store=makeStorage()){
 const engine=compile(game("numberGameEngine.ts"));
 const daily=compile(game("dailyNumberChallenge.ts"));
 return new Function("localStorage",engine+"\n"+daily+"\nreturn {dailyNumberDate,dailyNumberSecret,readNumberRecord,readDailyResult,saveNumberResult,legalNumber};")(store);
}
test("same UTC day/difficulty always gives a legal daily number",()=>{
 const m=numberModel();
 assert.equal(m.dailyNumberDate(new Date("2026-10-24T23:30:00Z")),"2026-10-24");
 for(const digits of [3,4,5]){
  const one=m.dailyNumberSecret(digits,"2026-10-24");
  assert.ok(m.legalNumber(one,digits));
  assert.equal(one,m.dailyNumberSecret(digits,"2026-10-24"));
 }
});
test("daily record is first completed game only, best only improves after winning, streak rolls",()=>{
 const m=numberModel();
 assert.equal(m.readNumberRecord(4).best,null);
 assert.equal(m.saveNumberResult(4,7,true,"2026-10-24").best,7);
 assert.equal(m.saveNumberResult(4,2,true,"2026-10-24").best,7);
 assert.deepEqual(m.readDailyResult(4,"2026-10-24"),{attempts:7,won:true});
 assert.equal(m.saveNumberResult(4,8,false,"2026-10-25").streak,2);
 assert.equal(m.readNumberRecord(4).played,2);
 assert.equal(m.saveNumberResult(4,6,true,null).best,6);
 assert.equal(m.readNumberRecord(3).played,0);
});
test("daily mode has a primary input before the optional voice dock",()=>{
 const number=game("NumberGamePage.tsx");
 assert.ok(number.indexOf('crew-mini-number-board')<number.lastIndexOf('<MiniGameVoice kind="1a2b"'));
 assert.match(number,/dailyNumberSecret\(digits,dailyDate\)/);
 assert.match(number,/readDailyResult/);
 assert.match(number,/saveResultImage\(/);
});
test("offline Taboo never automatically scores keyword matches as a friend's AI guess",()=>{
 const source=game("TabooGamePage.tsx");
 assert.match(source,/const clueIsClear=friendGuesses/);
 assert.match(source,/自評完成這題/);
 assert.match(source,/沒有 AI 猜詞/);
 assert.doesNotMatch(source,/離線關鍵字判定：/);
 assert.match(source,/generateTabooGuess/);
 assert.match(source,/parseTabooLiveGuess/);
});
test("offline Werewolf replies match the question and vary without secret roles",()=>{
 const w=new Function(compile(game("werewolfEngine.ts"))+"\nreturn {makeWolfGame,takeNightAction,fallbackWolfReply};")();
 const gameDay=w.takeNightAction(w.makeWolfGame(()=>.55,"villager"),{kind:"skip"},()=>.55);
 assert.equal(gameDay.phase,"day");
 const accused=w.fallbackWolfReply(gameDay,"zoe",true,"Zoe 妳為什麼說謊？");
 const neutral=w.fallbackWolfReply(gameDay,"zoe",true,"早安");
 assert.match(accused,/質疑|證據|懷疑|矛盾/);
 assert.notEqual(accused,neutral);
 assert.doesNotMatch(accused,/privateNotes|seerFindings|secret/);
});
test("pre-Key examples and per-game requirements are available without starting Live",()=>{
 const hub=game("CrewPlayHubPage.tsx");
 const page=game("CrewPlayGamePage.tsx");
 assert.match(hub,/crew-play-access-note/);
 assert.match(hub,/免 Key 練習/);
 assert.match(page,/crew-play-sample/);
 assert.match(page,/示範回合/);
 assert.ok(page.indexOf('crew-play-sample')<page.indexOf('!hasKey?<GeminiSetupNotice'));
});
test("board games emit local persona reactions, independent of Live",()=>{
 const board=game("CrewBoardGames.tsx");
 const page=game("CrewPlayGamePage.tsx");
 const reaction=game("friendGameReaction.ts");
 assert.match(board,/onReaction\?\.\("progress"\)/);
 assert.match(board,/onReaction\?\.\(winner/);
 assert.match(page,/friendGameReaction\(friend.id,event/);
 for(const id of ["noah","iris","max","yuna","felix","luna","theo","isla","hugo","ada","finn","maya","oscar","bella","ryan"])assert.match(reaction,new RegExp("\\b"+id+":"));
});
