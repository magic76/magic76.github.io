const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
test("selected production model weights, isolated worker and retired labs",()=>{
 const worker=read("web-spa/src/teacher/learningSpeech.selected.worker.js"),speech=read("web-spa/src/teacher/learningSpeech.ts");
 for(const asset of ["paradee_int8.onnx","kitten_tts_2_mini_int4.onnx","eeh.safetensors.gz","zh_CN-huayan-medium.onnx"])assert.ok((worker+speech).includes(asset),asset);
 assert.match(worker,/koolo-learning-speech-v1/);
 assert.match(worker,/piperMedium:\{tier:"medium",size:63201294,rate:22050\}/);
 assert.match(worker,/KOREAN_VOICE="seoyeon"/);
 assert.match(speech,/learningSpeech\.selected\.worker\.js/);
 assert.doesNotMatch(worker,/esm\.sh|speechSynthesis|workers\.dev|piperLow|mini8ko/);
 assert.doesNotThrow(()=>new vm.Script(worker));
 for(const root of ["web-spa/public/tts-lab","crew-app/tts-lab"])assert.equal(fs.existsSync(path.join(__dirname,"..",root)),false,root);
 const api=vm.runInNewContext(worker+";({wav,selectedLanguage})",{self:{},ArrayBuffer,DataView,Float32Array,Math,Number});
 assert.throws(()=>api.wav(Float32Array.of(0,0)),/無效或無聲/);
 for(const rate of [22050,24000,44100]){
  const buffer=api.wav(Float32Array.of(.1,-.2),rate),view=new DataView(buffer);
  assert.equal(view.getUint32(24,true),rate);assert.equal(buffer.byteLength,44+(Math.round(rate*.1)*2+2)*2);
 }
 assert.equal(api.selectedLanguage("en-GB"),"en");
 for(const code of ["zh","ko","ja"])assert.equal(api.selectedLanguage(code),code);
});
test("WASM ESM runtime tries matching pinned CDNs and reports both failures",async()=>{
 const worker=read("web-spa/src/teacher/learningSpeech.selected.worker.js"),ctx={self:{},URL};
 assert.doesNotMatch(worker,/importScripts\([^)]*ort/i);
 const api=vm.runInNewContext(worker+";({loadRuntime,ORT_BASES})",ctx);
 const fake={InferenceSession:{},Tensor:class{},env:{wasm:{}}},calls=[];
 const mod=await api.loadRuntime(async url=>{calls.push(url);if(calls.length===1)throw Error("network");return fake},api.ORT_BASES,()=>{});
 assert.equal(mod,fake);assert.equal(calls.length,2);
 assert.match(calls[0],/cdn\.jsdelivr\.net.*@1\.24\.3\/dist\/ort\.wasm\.min\.mjs$/);
 assert.match(calls[1],/unpkg\.com.*@1\.24\.3\/dist\/ort\.wasm\.min\.mjs$/);
 assert.equal(fake.env.wasm.wasmPaths,api.ORT_BASES[1]);assert.equal(fake.env.wasm.numThreads,1);assert.equal(fake.env.wasm.proxy,false);
 const initCalls=[];const sessionAPI=await api.loadRuntime(async url=>({InferenceSession:{},Tensor:class{},env:{wasm:{}},url}),api.ORT_BASES,()=>{},async runtime=>{initCalls.push(runtime.url);if(initCalls.length===1)throw Error("WASM fetch failed")});
 assert.equal(initCalls.length,2);assert.match(sessionAPI.url,/unpkg/);
 await assert.rejects(api.loadRuntime(async()=>{throw Error("network")},api.ORT_BASES,()=>{}),/cdn\.jsdelivr\.net.*unpkg\.com/);
});

test("Chinese Piper and Korean Kitten retain their distinct phoneme maps",()=>{
 const worker=read("web-spa/src/teacher/learningSpeech.selected.worker.js");
 assert.match(worker,/voices_ko\.npz/);assert.match(worker,/espeakText\(text,"ko"\)/);assert.match(worker,/piper-phonemize-wasm-main/);
 assert.doesNotMatch(worker,/phonemizer@1\.2\.1|list_voices/);
 const api=vm.runInNewContext(worker+";({piperIds,koreanMisaki})",{self:{}});
 assert.deepEqual(Array.from(api.piperIds("ab",{"^":[1],"_":[0],"$":[2],a:[3],b:[4]})),[1,0,3,0,4,0,2]);
 assert.equal(api.koreanMisaki("tʃ aɪ"),"ʧ I");
});
test("full eSpeak uses both language IDs and reads the upstream WASM result",()=>{
 const worker=read("web-spa/src/teacher/learningSpeech.selected.worker.js"),ctx={self:{}};
 const api=vm.runInNewContext(worker+";({espeakSentences,FULL_ESPEAK})",ctx);
 const heap=new Uint32Array(32),strings=new Map(),voices=[],freed=[];let pos=4,destroyed=0;
 const fake={
  HEAPU32:heap,lengthBytesUTF8:s=>Buffer.byteLength(s),_malloc:()=>pos++,
  stringToUTF8:(s,p)=>strings.set(p,s),_free:p=>freed.push(p),
  _PiperPhonemizeText:(t,v)=>{voices.push(strings.get(v));const chars=Array.from(strings.get(v)==="cmn"?"ni³":"an");chars.forEach((s,i)=>heap[16+i]=s.codePointAt(0));return 99},
  _PiperPhonemizeResultGetNumSentences:()=>1,_PiperPhonemizeResultGetNumPhonemes:()=>voices.at(-1)==="cmn"?3:2,
  _PiperPhonemizeResultGetPhonemes:()=>64,_PiperPhonemizeDestroyResult:()=>destroyed++
 };
 assert.deepEqual(Array.from(api.espeakSentences(fake,"你好","cmn")),["ni³"]);
 assert.deepEqual(Array.from(api.espeakSentences(fake,"안녕","ko")),["an"]);
 assert.deepEqual(voices,["cmn","ko"]);assert.equal(destroyed,2);assert.equal(freed.length,4);
 assert.match(api.FULL_ESPEAK,/29c4a1977913f70e282d8328e87f54100672bf17/);
 assert.match(worker,/getPreloadedPackage/);assert.match(worker,/wasmBinary:wasm/);
});
