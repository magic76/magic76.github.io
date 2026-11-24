const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
test("distilled lab isolates local models and validates WAV",()=>{
 const root="web-spa/public/tts-lab/distilled/",html=read(root+"index.html"),js=read(root+"lab.js"),worker=read(root+"engine.js");
 assert.match(html,/noindex,nofollow/);assert.match(html,/src="\.\/lab.js\?v=runtime2"/);
 for(const id of ["paradee8","paradee32","nano8","mini4","phonon","kokoro"])assert.ok(js.includes('"'+id+'"'));
 assert.match(js,/new Worker\("\.\/engine.js\?v=runtime2"\)/);assert.match(js,/resetWorker/);
 assert.doesNotMatch(js+worker,/esm\.sh|speechSynthesis|workers\.dev/);
 assert.match(worker,/paradee_int8\.onnx/);assert.match(worker,/kitten_tts_2_mini_int4\.onnx/);assert.match(worker,/dtype:"q8"/);
 assert.doesNotThrow(()=>new vm.Script(js));assert.doesNotThrow(()=>new vm.Script(worker));
 const ctx={self:{},ArrayBuffer,DataView,Float32Array,Math,Number};const f=vm.runInNewContext(worker+";wav",ctx);
 assert.throws(()=>f(Float32Array.of(0,0)),/無效或無聲/);assert.equal(f(Float32Array.of(.1,-.2)).byteLength,44+(4800+2)*2);
 assert.match(read("web-spa/public/tts-lab/index.html"),/href="\/tts-lab\/distilled\/"/);
});

test("WASM ESM runtime tries matching pinned CDNs and reports both failures",async()=>{
 const worker=read("web-spa/public/tts-lab/distilled/engine.js"),ctx={self:{},URL};
 assert.doesNotMatch(worker,/importScripts\(/);
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
