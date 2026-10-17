const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");

function moduleFromTs(relative){
 const filename=path.join(__dirname,"..",relative);
 const source=fs.readFileSync(filename,"utf8");
 const withoutImport=source.replace(/^import \{ensureCore,geminiKey\} from "\.\.\/lib\/runtime";\r?\n/m,"");
 const js=stripTypeScriptTypes(withoutImport,{mode:"transform"}).replace(/^export /gm,"");
 const names=relative.includes("numberGameEngine")?
  ["legalNumber","allNumbers","secretNumber","scoreAB","candidateNumbers","nextComputerGuess","parseSpokenNumber","parseSpokenAB"]:
  ["TABOO_CARDS","containsTerm","tabooViolation","matchTabooGuess","friendGuesses","validGeneratedCard","generateTabooCard"];
 return new Function("ensureCore","geminiKey",js+"\nreturn {"+names.join(",")+"};")(async()=>{},()=>false);
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
test("Taboo has forty distinct offline cards with safe clues and rule validation",()=>{
 assert.equal(taboo.TABOO_CARDS.length,40);
 assert.equal(new Set(taboo.TABOO_CARDS.map(c=>c.word)).size,40);
 assert.equal(taboo.TABOO_CARDS.filter(c=>c.level==="easy").length,20);
 assert.equal(taboo.TABOO_CARDS.filter(c=>c.level==="medium").length,20);
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
