const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const src=p=>fs.readFileSync(path.join(root,p),"utf8");
const shared=src("web-spa/src/live/voiceIdentity.ts");
const bridge=src("web-spa/src/souls/soulVoice.ts");
const data=src("web-spa/src/souls/soulData.ts");
const page=src("web-spa/src/souls/SoulsPage.tsx");
const draft=src("web-spa/src/souls/SoulDraftDetails.tsx");
const chat=src("web-spa/src/souls/SoulChat.tsx");
const match=shared.match(/export const LIVE_VOICES=\[([\s\S]+?)\] as const/);
assert.ok(match,"shared Gemini Live voice pool must exist");
const voices=Array.from(match[1].matchAll(/"([^"]+)"/g),m=>m[1]);
assert.equal(voices.length,30);
const js=stripTypeScriptTypes(bridge,{mode:"strip"})
 .replace(/^import .+;\n/m,"")
 .replace(/\bexport\s+function\s+/g,"function ");
const mod={exports:{}};
const normalizeLiveVoice=voice=>voices.find(x=>x.toLowerCase()===String(voice||"").toLowerCase())||"Kore";
new Function("module","LIVE_VOICES","normalizeLiveVoice",
 js+"\nmodule.exports={randomSoulVoice,soulVoiceLabel};")(mod,voices,normalizeLiveVoice);
const {randomSoulVoice,soulVoiceLabel}=mod.exports;

test("every random index is one of the 30 shared Gemini Live prebuilt voices",()=>{
 for(let i=0;i<30;i++){
  const candidate=randomSoulVoice(undefined,()=>i/30);
  assert.equal(candidate,voices[i]);
 }
 assert.equal(randomSoulVoice(undefined,()=>1),voices[29]);
 assert.equal(randomSoulVoice(undefined,()=>-1),voices[0]);
 assert.equal(randomSoulVoice(undefined,()=>NaN),voices[0]);
});

test("shuffle never repeats the current supported voice",()=>{
 for(const previous of voices){
  const options=new Set();
  for(let i=0;i<29;i++){
   const v=randomSoulVoice(previous,()=>i/29);
   assert.ok(voices.includes(v));
   assert.notEqual(v,previous);
   options.add(v);
  }
  assert.equal(options.size,29);
 }
});

test("voice labels normalize older or missing choices rather than crashing",()=>{
 assert.equal(soulVoiceLabel("aoede"),"Aoede");
 assert.equal(soulVoiceLabel(undefined),"Kore");
 assert.equal(soulVoiceLabel("not-a-voice"),"Kore");
});

test("new Soul voice is picked once on photo selection and saved independently of personality",()=>{
 assert.match(page,/setDraftVoice\(previous=>randomSoulVoice\(previous\)\)/);
 assert.match(page,/voice:draftVoice,photos:\[draft\]/);
 assert.doesNotMatch(page,/voice:persona\[personality\]\[2\]/);
 const create=page.slice(page.indexOf("async function create("),page.indexOf("async function choose("));
 assert.match(create,/await save\(s\)/);
 assert.match(create,/voice:draftVoice/);
 const session=src("web-spa/src/live/useLiveSession.ts");
 assert.match(chat,/voice:normalizeLiveVoice\(soul\.voice\)/);
 assert.match(session,/voice:configRef\.current\.voice/);
});

test("existing Souls only reroll after an explicit click and persist via original IndexedDB",()=>{
 assert.match(page,/async function rerollSavedVoice\(\)/);
 assert.match(page,/await update\(id,current=>\(\{\.\.\.current,voice:randomSoulVoice\(current\.voice\)\}\)\)/);
 assert.match(page,/onClick=\{\(\)=>void rerollSavedVoice\(\)\}/);
 assert.match(page,/重新連接 Live 時生效/);
 assert.match(data,/voice:string/);
 assert.match(data,/indexedDB\.open\("crew-souls-local-v1",1\)/);
 assert.match(draft,/onClick=\{\(\)=>setDraftVoice\(previous=>randomSoulVoice\(previous\)\)\}/);
});
