const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync("web-spa/src/teacher/learningSpeech.ts","utf8");

test("retired learning caches are reclaimed once, without deleting unrelated ML assets",async()=>{
 const code=source.slice(source.indexOf("let legacyCleanupRequested="),source.indexOf("export function normalizeLearningLanguage"));
 const deleted=[],kept="https://huggingface.co/another-model/resolve/main/model.onnx";
 const cache={keys:async()=>[{url:"https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/onnx/model.onnx"},{url:kept}],delete:async req=>{deleted.push(req.url);return true}};
 const caches={keys:async()=>["transformers-cache","kokoro-voices","koolo-learning-speech-v1","unrelated-cache"],open:async name=>{assert.equal(name,"transformers-cache");return cache},delete:async name=>{deleted.push(name);return true}};
 const cleanup=vm.runInNewContext(code+";cleanupLegacyKokoroCache",{caches});
 cleanup();cleanup();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(deleted.filter(x=>x==="koolo-learning-speech-v1").length,1);
 assert.equal(deleted.filter(x=>x==="kokoro-voices").length,1);
 assert.equal(deleted.filter(x=>x.includes("Kokoro-82M")).length,1);
 assert.ok(!deleted.includes(kept));assert.ok(!deleted.includes("unrelated-cache"));
});
