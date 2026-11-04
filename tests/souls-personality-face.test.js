const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=relative=>fs.readFileSync(path.resolve(root,relative),"utf8");
const portrait=read("web-spa/src/souls/SoulPortrait.tsx");
const page=read("web-spa/src/souls/SoulsPage.tsx");
const css=read("web-spa/src/souls/souls.css");
const data=read("web-spa/src/souls/soulData.ts");

test("portrait exposes a typed personality prop and fallbacks for legacy Souls",()=>{
 assert.match(portrait,/personality\?:Soul\["personality"\]/);
 assert.match(portrait,/personality="gentle"/);
 assert.match(portrait,/data-personality=\{personality\}/);
 assert.match(data,/personality:"witty"\|"gentle"\|"curious"/);
});

test("creation, collection and saved Live portrait use their actual Soul personality",()=>{
 const portraits=[...page.matchAll(/<SoulPortrait\b[\s\S]*?\/>/g)].map(m=>m[0]);
 assert.equal(portraits.length,3,"there should be exactly three SoulPortrait entrypoints");
 assert.match(portraits[0],/personality=\{s\.personality\}/);
 assert.match(portraits[1],/personality=\{personality\}/);
 assert.match(portraits[2],/personality=\{selected\.personality\}/);
 assert.match(page,/onClick=\{\(\)=>setPersonality\(id\)\}/);
 assert.match(page,/description:trim\(description,140\),personality/);
});

test("original witty face has distinctive asymmetric eyes, brows and a skewed smile",()=>{
 assert.match(portrait,/const isWitty=personality==="witty"/);
 assert.match(portrait,/className="souls-witty-left-eye"/);
 assert.match(portrait,/className="souls-witty-right-eye"/);
 assert.match(portrait,/className="souls-witty-brows"/);
 assert.match(portrait,/className="souls-portrait-smile"/);
 assert.match(portrait,/M56 84 Q78 92 96 78/);
 assert.match(portrait,/mood==="thinking"/);
 assert.match(portrait,/mood==="surprised"/);
 assert.match(portrait,/mood==="happy"/);
 assert.match(portrait,/mood==="happy"\?<>/);
});

test("gentle retains existing round eyes, curious has distinct bright eyes",()=>{
 assert.match(portrait,/isCurious\?<g className="souls-curious-eyes"/);
 assert.match(portrait,/rect x="17" y="13" width="46" height="63"/);
 assert.match(portrait,/rect x="18" y="18" width="44" height="55"/);
 assert.match(portrait,/rect x="23" y="24" width="34" height="44"/);
});

test("existing mouthRef and Live output-level callbacks remain hooked up",()=>{
 assert.match(portrait,/ref=\{mouthRef\} className="souls-portrait-speaking-mouth"/);
 assert.equal((portrait.match(/ref=\{mouthRef\}/g)||[]).length,1,
  "every face variant must expose the same single mouth shape for Live output levels");
 assert.match(page,/onAudioLevel=\{onAudioLevel\}/);
 assert.match(page,/mouthRef\.current/);
 assert.match(portrait,/className="souls-portrait-object"/);
 assert.match(portrait,/stageToObjectPoint\(/);
 assert.match(portrait,/applyGesture\(/);
});

test("witty animations include subtle idle, speech, thinking, surprise and wink",()=>{
 for(const animation of [
  "souls-witty-idle","souls-witty-talk","souls-witty-think",
  "souls-witty-oh","souls-witty-wink","souls-witty-pleased","souls-witty-listen"
 ]) assert.match(css,new RegExp("@keyframes "+animation+"\\b"));
 assert.match(css,/\[data-personality="witty"\]\[data-speaking="true"\]/);
 assert.match(css,/\[data-personality="witty"\]\[data-speaking="false"\]\[data-mood="thinking"\]/);
 assert.match(css,/\[data-personality="witty"\]\[data-speaking="false"\]\[data-mood="surprised"\]/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\.souls-photo-first \.souls-portrait\[data-personality="witty"\] \.souls-portrait-sprite/);
});

test("personality styles do not change saved cutout placement or face transform",()=>{
 assert.match(portrait,/transform:\`translate\(/);
 assert.match(portrait,/left:\(f\.x\*100\)/);
 assert.match(portrait,/width:\(37\*f\.scale\)/);
 assert.match(portrait,/onPointerDown=\{down\} onPointerMove=\{drag\}/);
 assert.match(page,/face:safeFace\(faceDraft\),transform:safeTransform\(transformDraft\)/);
});
