const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
test("distilled lab isolates local models and validates WAV",()=>{
 const root="web-spa/public/tts-lab/distilled/",html=read(root+"index.html"),js=read(root+"lab.js"),worker=read(root+"engine.js");
 assert.match(html,/noindex,nofollow/);assert.match(html,/src="\.\/lab.js\?v=asia4"/);
 for(const id of ["paradee8","paradee32","nano8","mini4","phonon","kokoro"])assert.ok(js.includes('"'+id+'"'));
 assert.match(js,/new Worker\("\.\/engine.js\?v=asia4"\)/);assert.match(js,/resetWorker/);
 assert.doesNotMatch(js+worker,/esm\.sh|speechSynthesis|workers\.dev/);
 assert.match(worker,/paradee_int8\.onnx/);assert.match(worker,/kitten_tts_2_mini_int4\.onnx/);assert.match(worker,/dtype:"q8"/);
 assert.doesNotThrow(()=>new vm.Script(js));assert.doesNotThrow(()=>new vm.Script(worker));
 const ctx={self:{},ArrayBuffer,DataView,Float32Array,Math,Number};const f=vm.runInNewContext(worker+";wav",ctx);
 assert.throws(()=>f(Float32Array.of(0,0)),/無效或無聲/);assert.equal(f(Float32Array.of(.1,-.2)).byteLength,44+(4800+2)*2);
 assert.match(read("web-spa/public/tts-lab/index.html"),/href="\/tts-lab\/distilled\/"/);
});

test("WASM ESM runtime tries matching pinned CDNs and reports both failures",async()=>{
 const worker=read("web-spa/public/tts-lab/distilled/engine.js"),ctx={self:{},URL};
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

test("Asian lab has explicit local language models without routing into production",()=>{
 const root="web-spa/public/tts-lab/distilled/",html=read(root+"index.html"),js=read(root+"lab.js"),worker=read(root+"engine.js");
 assert.match(html,/id="language"/);
 for(const id of ["piperLow","piperMedium","sanoZh","mini4ko","mini8ko"]){assert.ok(js.includes('"'+id+'"'));assert.ok(worker.includes('"'+id+'"'))}
 assert.match(worker,/voices_ko\.npz/);assert.match(worker,/espeakText\(text,"ko"\)/);assert.match(worker,/piper-phonemize-wasm-main/);assert.doesNotMatch(worker,/phonemizer@1\.2\.1|list_voices/);
 const api=vm.runInNewContext(worker+";({piperIds,koreanMisaki})",{self:{}});
 assert.deepEqual(Array.from(api.piperIds("ab",{"^":[1],"_":[0],"$":[2],a:[3],b:[4]})),[1,0,3,0,4,0,2]);
 assert.equal(api.koreanMisaki("tʃ aɪ"),"ʧ I");
 assert.match(js,/r.card.hidden=\(modelLanguages\[id\]\|\|"en"\)!==lang/);
});

test("full eSpeak uses both language IDs and reads the upstream WASM result",()=>{
 const worker=read("web-spa/public/tts-lab/distilled/engine.js"),ctx={self:{}};
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
