const test=require("node:test");
const assert=require("node:assert/strict");
const {pathToFileURL}=require("node:url");
const path=require("node:path");
const file=pathToFileURL(path.join(__dirname,"../web-spa/src/games/puzzleDiversity.ts")).href;
const diversity=import(file);
const cells=new Map();
globalThis.localStorage={
 getItem:key=>cells.get(key)||null,
 setItem:(key,value)=>cells.set(key,String(value)),
 removeItem:key=>cells.delete(key)
};
const reset=async()=>{cells.clear();(await diversity).historyFor("mystery")};
test("Mystery cycles eight different categories rather than repeating the same everyday trope",async()=>{
 const {nextPuzzleTheme,rememberPuzzle}=await diversity;
 reset&&await reset();
 const categories=[];
 for(let i=0;i<8;i++){
  const cat=nextPuzzleTheme("mystery");
  categories.push(cat.id);
  rememberPuzzle("mystery",cat.id,"title "+i,"cause "+i,"story "+i);
 }
 assert.equal(new Set(categories).size,8);
});
test("A paraphrased story with identical cause is rejected, but unrelated twists survive",async()=>{
 const {rememberPuzzle,isNearDuplicate}=await diversity;
 await reset();
 rememberPuzzle("mystery","journey","A traveler consults a postcard at a train station","postcard serves as a navigation map","The postcard is used as a map rather than being mailed.");
 assert.equal(isNearDuplicate("mystery",{name:"A visitor never posts his old souvenir",key:"postcard serves as a navigation map",summary:"The same picture guides him through the terminal."}),true);
 assert.equal(isNearDuplicate("mystery",{name:"A repairer taps the desk to turn the lamp on",key:"vibration reconnects an intermittent electronic sensor",summary:"A loose contact beneath the desk controls the lighting."}),false);
});
test("Similar 20 Questions families are rejected across reload-safe local history",async()=>{
 const {rememberPuzzle,isNearDuplicate,historyFor}=await diversity;
 await reset();
 rememberPuzzle("twenty","sport","acoustic guitar","plucked string musical instruments","吉他 / acoustic guitar");
 assert.equal(isNearDuplicate("twenty",{name:"classical guitar",key:"plucked string musical instruments",summary:"古典吉他 / classical guitar"}),true);
 assert.equal(isNearDuplicate("twenty",{name:"kayak",key:"small personal watercraft",summary:"獨木舟 / kayak"}),false);
 assert.equal(historyFor("twenty").length,1);
 assert.equal(JSON.parse(cells.get("crew_play_puzzle_diversity_v2"))[0].key,"plucked string musical instruments");
});
test("Bound recent history to 50 per game and select least recently played fallback",async()=>{
 const {rememberPuzzle,chooseFallbackPuzzle,historyFor}=await diversity;
 await reset();
 for(let i=0;i<60;i++)rememberPuzzle("mystery","logic","round "+i,"cause "+i,"story "+i);
 assert.equal(historyFor("mystery").length,50);
 assert.equal(historyFor("mystery")[0].name,"round 10");
 const stock=[{name:"one"},{name:"two"},{name:"three"}];
 const describe=i=>({name:i.name,key:i.name,summary:i.name});
 const first=chooseFallbackPuzzle("twenty",stock,describe);
 const second=chooseFallbackPuzzle("twenty",stock,describe);
 assert.equal(first.name,"one");
 assert.equal(second.name,"two");
});
