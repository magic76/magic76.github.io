const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");

function moduleFromTs(relative,keyPresent=false){
 const filename=path.join(__dirname,"..",relative);
 const source=fs.readFileSync(filename,"utf8");
 const withoutImport=source.replace(/^import \{ensureCore,geminiKey\} from "\.\.\/lib\/runtime";\r?\n/m,"");
 const js=stripTypeScriptTypes(withoutImport,{mode:"strip"}).replace(/^export /gm,"");
 const names=relative.includes("numberGameEngine")?
  ["legalNumber","allNumbers","secretNumber","scoreAB","candidateNumbers","nextComputerGuess","parseSpokenNumber","parseSpokenAB"]:
  ["TABOO_CARDS","containsTerm","tabooViolation","matchTabooGuess","friendGuesses","validGeneratedCard","generateTabooCard","generateTabooGuess","tabooFollowUp","drawTabooBag"];
 return new Function("ensureCore","geminiKey",js+"\nreturn {"+names.join(",")+"};")(async()=>{},()=>keyPresent);
}
const numbers=moduleFromTs("web-spa/src/games/numberGameEngine.ts");
const taboo=moduleFromTs("web-spa/src/games/tabooEngine.ts");

test("1A2B supports three, four and five unique-digit numbers without leading zero",()=>{
 for(const [n,count] of [[3,648],[4,4536],[5,27216]]){
  const entries=numbers.allNumbers(n);
  assert.equal(entries.length,count);
  assert.ok(entries.every(v=>numbers.legalNumber(v,n)));
  assert.ok(numbers.legalNumber(numbers.secretNumber(n,()=>.3),n));
 }
 assert.equal(numbers.legalNumber("0123",4),false);
 assert.equal(numbers.legalNumber("1223",4),false);
});
test("1A2B exact score and reversibility cannot contradict known hints",()=>{
 assert.deepEqual(numbers.scoreAB("1234","1234"),{a:4,b:0});
 assert.deepEqual(numbers.scoreAB("1234","1432"),{a:2,b:2});
 assert.deepEqual(numbers.scoreAB("1234","5678"),{a:0,b:0});
 const prior=[{guess:"1234",result:{a:0,b:0}}];
 assert.ok(numbers.candidateNumbers(4,prior).includes("5678"));
 assert.ok(!numbers.candidateNumbers(4,prior).includes("1234"));
 assert.equal(numbers.candidateNumbers(4,[...prior,{guess:"1234",result:{a:4,b:0}}]).length,0);
 const next=numbers.nextComputerGuess(4,prior);
 assert.ok(next&&numbers.legalNumber(next,4));
 assert.equal(numbers.nextComputerGuess(4,[...prior,{guess:"1234",result:{a:4,b:0}}]),null);
});
test("spoken 1A2B digits and xAyB are normalized with invalid phrases rejected",()=>{
 assert.equal(numbers.parseSpokenNumber("one three five nine",4),"1359");
 assert.equal(numbers.parseSpokenNumber("my guess is one three five nine",4),"1359");
 assert.equal(numbers.parseSpokenNumber("one two two nine",4),null);
 assert.equal(numbers.parseSpokenNumber("zero one two",3),null);
 assert.deepEqual(numbers.parseSpokenAB("one A two B",4),{a:1,b:2});
 assert.deepEqual(numbers.parseSpokenAB("1A and 2B",4),{a:1,b:2});
 assert.equal(numbers.parseSpokenAB("four A two B",4),null);
});
test("Taboo has two hundred distinct offline cards with safe clues and rule validation",()=>{
 assert.equal(taboo.TABOO_CARDS.length,200);
 assert.equal(new Set(taboo.TABOO_CARDS.map(c=>c.word)).size,200);
 assert.equal(taboo.TABOO_CARDS.filter(c=>c.level==="easy").length,100);
 assert.equal(taboo.TABOO_CARDS.filter(c=>c.level==="medium").length,100);
 for(const card of taboo.TABOO_CARDS){
  assert.ok(card.banned.length>=3&&card.banned.length<=5);
  for(const clue of card.clues)assert.equal(taboo.tabooViolation(card,clue),null,card.word+" unsafe clue: "+clue);
  assert.equal(taboo.tabooViolation(card,"We have a "+card.word),card.word);
  assert.equal(taboo.tabooViolation(card,"It is "+card.banned[0]),card.banned[0]);
  assert.ok(taboo.matchTabooGuess(card,card.word.toUpperCase()));
 }
 assert.equal(taboo.containsTerm("street","tree"),false);
 const apple=taboo.TABOO_CARDS.find(c=>c.word==="apple");
 assert.ok(taboo.friendGuesses(apple,"It is crunchy and used in a pie."));
 assert.equal(taboo.friendGuesses(apple,"An unusual thing."),false);
});
test("Gemini Taboo card input gets validated before it reaches game rules",()=>{
 const raw={word:"Lantern",zh:"燈籠",banned:["light","night","glow"],clues:["You carry this during a festival.","It helps you see during a celebration."],keywords:["festival","celebration"]};
 assert.ok(taboo.validGeneratedCard(raw,"easy"));
 assert.equal(taboo.validGeneratedCard({...raw,clues:["It creates light","It is useful"]},"easy"),null);
 assert.equal(taboo.validGeneratedCard({...raw,banned:["lantern","night","glow"]},"easy"),null);
});

test("AI guesser gets only clues and the game engine verifies the answer",async()=>{
 const game=moduleFromTs("web-spa/src/games/tabooEngine.ts",true);
 const previous=global.window;
 let prompt="";
 global.window={CrewAI:{call:async text=>{
  prompt=text;
  return JSON.stringify({guess:"banana",question:"Is it a food?"});
 }}};
 try{
  const reply=await game.generateTabooGuess(["It is long and yellow. You peel it."]);
  assert.equal(reply.guess,"banana");
  assert.match(prompt,/It is long and yellow/);
  assert.equal(game.matchTabooGuess({word:"banana"},reply.guess),true);
  assert.equal(game.matchTabooGuess({word:"apple"},reply.guess),false);
 }finally{global.window=previous}
});

test("Taboo asks at most one specific question, then switches to varied non-questions",()=>{
 const first=taboo.tabooFollowUp("banana","Could you give me another clue?",1);
 assert.equal(first,"I guess banana. What would someone use it for?");
 assert.equal(taboo.tabooFollowUp("","Is it used at home?",1),"Not sure yet. Is it used at home?");
 assert.equal(taboo.tabooFollowUp("book","Is it something?",2),"I guess book. Try describing its shape or appearance.");
 assert.equal(taboo.tabooFollowUp("book","Any clues?",3),"I guess book. Tell me where someone would usually find it.");
 assert.equal(taboo.tabooFollowUp("","Any clues?",5).endsWith("?"),false);
});

test("Taboo shuffle bag consumes 100 words per level across saved game sessions",()=>{
 for(const level of ["easy","medium"]){
  let state=null;
  const seen=new Set();
  let last=[];
  for(let game=0;game<20;game++){
   const result=taboo.drawTabooBag(level,state,()=>0.31);
   assert.equal(result.cards.length,5);
   assert.equal(new Set(result.cards.map(c=>c.word)).size,5);
   for(const card of result.cards){assert.ok(!seen.has(card.word),card.word+" repeated early");seen.add(card.word);}
   state=JSON.parse(JSON.stringify(result.state));
   if(game===19)last=state.recent.slice();
  }
  assert.equal(seen.size,100);
  const next=taboo.drawTabooBag(level,state,()=>0.31);
  assert.equal(next.cards.length,5);
  assert.ok(next.cards.every(card=>!last.includes(card.word)),"avoid last ten cards at rollover");
  assert.equal(new Set(next.cards.map(c=>c.word)).size,5);
  const broken=taboo.drawTabooBag(level,{remaining:["invalid","invalid"],recent:["garbage"]},()=>0.31);
  assert.equal(broken.cards.length,5);
 }
});
