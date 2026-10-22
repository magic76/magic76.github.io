const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"web-spa/public/games/crew-play-engine.js"),"utf8");
const scope={};
scope.window=scope;
vm.runInNewContext(source,scope,{filename:"crew-play-engine.js"});
const engine=scope.CrewPlayEngine;

test("Connect Four column labels match the engine's top-to-bottom cell layout",()=>{
 const initial=engine.connect4New();
 const first=engine.connect4Drop(initial,2,"player");
 assert.equal(first.lastMove,5*7+2);
 assert.equal(first.lastMove%7+1,3); // Spoken column 3.
 assert.equal(Math.floor(first.lastMove/7)+1,6); // Bottom row 6.
 const second=engine.connect4Drop(first,2,"computer");
 assert.equal(second.lastMove,4*7+2);
 assert.equal(second.lastMove%7+1,3);
 assert.equal(Math.floor(second.lastMove/7)+1,5);
});
test("Reversi C4 flips D4 from white to black and uses A-H / 1-8 coordinates",()=>{
 const initial=engine.reversiNew();
 const next=engine.reversiPlace(initial,2,3,"black");
 assert.ok(next);
 assert.equal(String.fromCharCode(65+next.lastMove%8)+(Math.floor(next.lastMove/8)+1),"C4");
 const oldIndex=3*8+3; // D4
 assert.equal(initial.cells[oldIndex],"white");
 assert.equal(next.cells[oldIndex],"black");
 assert.ok(Array.from(next.flipped).includes(oldIndex));
});
test("Board rendering exposes row and column labels plus scoped motion with reduced-motion fallback",()=>{
 const component=fs.readFileSync(path.join(root,"web-spa/src/games/CrewBoardGames.tsx"),"utf8");
 const styles=fs.readFileSync(path.join(root,"web-spa/src/games/crewPlay.css"),"utf8");
 assert.match(component,/crew-board-column-labels/);
 assert.match(component,/crew-board-row-labels/);
 assert.match(component,/crew-connect-disc[^\n]*is-dropping/);
 assert.match(component,/onAnimationEnd=\{dropping\?/);
 assert.match(component,/key=\{dropping\?/);
 assert.match(component,/connectDropIdRef\.current===null/);
 assert.match(component,/connectDrop\|\|connectDropIdRef\.current!==null/);
 assert.match(component,/setTimeout\(\(\)=>finishConnectDrop\(id\),duration\+120\)/);
 assert.match(component,/prefers-reduced-motion: reduce/);
 assert.match(styles,/transform:translate3d\(0,var\(--drop-distance/);
 assert.doesNotMatch(styles,/--drop-rows/);
 assert.match(component,/next\.flipped/);
 assert.match(component,/crew-reversi-disc-face/);
 assert.match(styles,/@keyframes crew-connect-disc-drop/);
 assert.match(styles,/@keyframes crew-reversi-disc-flip/);
 assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/);
});
