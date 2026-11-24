const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const page=read("web-spa/public/tts-lab/compare/index.html");
const js=read("web-spa/public/tts-lab/compare/compare.js");
test("lightweight comparison pins runtimes, removes heavy engines and isolates production",()=>{
 assert.match(page,/Kitten TTS 2 Nano int4/);
 assert.match(page,/Kitten TTS 2 Pico int4/);
 assert.match(js,/KittenTTS-web@c846fe92858f3447f4912226471f5a63983b3f94/);
 assert.match(js,/onnxruntime-web@1\.24\.3/);
 assert.match(js,/pako@2\.1\.0/);
 assert.match(js,/new sdk\.CEPhonemizer/);
 assert.match(js,/executionProviders:\["wasm"\]/);
 assert.doesNotMatch(page+js,/Supertonic|Kokoro 82M|kokoro-js|piper-plus|PIPER_URL|kitten08|WebGPU/);
 assert.doesNotMatch(read("web-spa/src/teacher/VocabularyPage.tsx"),/KokoroTTS|KittenTTSWeb|kitten-tts-2|tts-lab/);
 assert.doesNotThrow(()=>new vm.Script(js));
});
test("TTS labs remain noindexed and hub links to comparison",()=>{
 assert.match(read("web-spa/public/tts-lab/index.html"),/href="\/tts-lab\/compare\/"/);
 assert.match(read("_headers"),/\/tts-lab\/\*\n  X-Robots-Tag: noindex, nofollow/);
});
test("only relevant cards are shown, and unsupported engines cannot run",()=>{
 const source=js.match(/const engineLanguages=\{[\s\S]*?\};/)[0];
 const routes=vm.runInNewContext(source+";JSON.stringify(engineLanguages)");
 assert.deepEqual(JSON.parse(routes),{system:["en","zh","ja","ko","es"],nano2:["es"],pico2:["en","es"],sano:["zh","es"],eeh:["ja"],piperLow:["zh"],piperMedium:["zh"]});
 assert.deepEqual([...page.matchAll(/data-engine="([^"]+)"/g)].map(m=>m[1]).sort(),["eeh","nano2","pico2","piperLow","piperMedium","sano","system"]);
 assert.ok(js.includes('b.closest(".model").hidden=!available'));
 assert.match(js,/!supports\(id,language\.value\)/);
 assert.match(js,/u\.lang=locale/);
 assert.match(js,/activePreset="word"/);
 for(const lang of ["en","zh","ja","ko","es"])assert.ok(page.includes('value="'+lang+'"'));
});
test("language-specific tiny assets, sessions and research links",()=>{
 for(const file of ["kitten_tts_2_nano_en_int4.onnx","kitten_tts_2_pico_en_int4.onnx","kitten_tts_2_nano_es_int4.onnx","kitten_tts_2_pico_es_int4.onnx"])assert.ok(js.includes(file));
 assert.ok(js.includes('"voices_"+lang+".npz"'));
 assert.ok(js.includes('kind+":"+lang'));
 assert.ok(js.includes('phonemize(value,{lang:"es"})'));
 assert.ok(js.includes('"sofia":"pablo"'));
 assert.match(page,/github.com\/Ampixa\/sanoTTS/);
 assert.match(page,/ctrltokyo\/eeh-1/);
 assert.match(page,/尚未確認可直接下載/);
 assert.ok(js.includes('el.hidden=!el.dataset.extraLangs.split(",").includes(language.value)'));
});

test("research candidates actually dispatch local synthesis workers",()=>{
 const worker=read("web-spa/public/tts-lab/compare/lightweight-worker.js");
 assert.doesNotThrow(()=>new vm.Script(worker));
 for(const id of ["sano","eeh"]){
  assert.ok(page.includes('data-engine="'+id+'"'));
  assert.ok(js.includes(id+':()=>researchTts("'+id+'")'));
 }
 assert.ok(js.includes('new Worker("./lightweight-worker.js?v=903")'));
 assert.ok(js.includes('type:"speak",text:v'));
 assert.ok(js.includes('wavBlob(result.audio,result.sampleRate)'));
 assert.match(worker,/_snt_voice_synthesize/);
 assert.match(worker,/synth\.speak\(/);
 assert.match(worker,/loadZhG2P/);
 assert.match(worker,/eeh-dict\.bin\.gz/);
 assert.match(worker,/chinese-xiaoya/);
 assert.doesNotMatch(page+js+worker,/ooodev\/korean-tts|loadKorean|KSS|data-engine="korean"/);
 assert.match(js,/worker\?\.terminate\(\);researchWorkers\.delete/);
});

test("eeh uses fetched JavaScript MIME and explicit WASM bytes; Chinese Piper routes both tiers",()=>{
 const worker=read("web-spa/public/tts-lab/compare/lightweight-worker.js");
 assert.match(worker,/async function loadEehModule/);
 assert.ok(worker.includes('new Blob([source],{type:"text/javascript"})'));
 assert.ok(worker.includes('return await import(url)'));
 assert.ok(worker.includes('module.default({module_or_path:wasm})'));
 assert.doesNotMatch(worker,/import\(EEH\+/);
 assert.match(js,/@realtimex\/piper-tts-web@1\.1\.1/);
 assert.ok(js.includes('voiceId="zh_CN-huayan-"+cfg.tier'));
 assert.ok(js.includes('sdk.TtsSession.create('));
 assert.ok(js.includes('engines[id].predict(value)'));
 assert.match(page,/20\.6 MB/);
 assert.match(page,/63\.2 MB/);
 assert.match(page,/訓練資料授權/);
});

test("Piper rejects invalid cache and HTTP responses before model initialization",async()=>{
 const source=js.slice(js.indexOf("const PIPER_SDK="),js.indexOf("async function piperChinese("));
 const {createHash,webcrypto}=require("node:crypto");
 const data=new Blob([Uint8Array.of(8,1,58,2,1,2)]),cfg={size:data.size,sha:createHash("sha256").update(Buffer.from(await data.arrayBuffer())).digest("hex")};
 let files=new Map([["test.onnx",new Blob(["bad"])]]);
 const removed=[],written=[],status=[];
 const dir={
  async getFileHandle(name,{create}={}){
   if(!files.has(name)&&!create)throw Object.assign(Error("missing"),{name:"NotFoundError"});
   return {async getFile(){return files.get(name)},async createWritable(){let value;return {async write(blob){value=blob;written.push(name)},async close(){files.set(name,value)},async abort(){}}}};
  },
  async removeEntry(name){removed.push(name);files.delete(name)}
 };
 let response={ok:false,status:404,blob:async()=>data},fetches=0;
 const ctx={crypto:webcrypto,Uint8Array,Blob,fetch:async()=>{fetches++;return response},setStatus:(_id,msg)=>status.push(msg)};
 const api=vm.runInNewContext(source+";({verifyPiperFile,preparePiperFile,createPiperSession})",ctx);
 assert.equal(await api.verifyPiperFile(new Blob(["bad"]), "model",cfg),false);
 assert.equal(await api.verifyPiperFile(new Blob(["123456"]), "model",cfg),false);
 assert.equal(await api.verifyPiperFile(data,"model",cfg),true);
 await assert.rejects(api.preparePiperFile(dir,"test.onnx","https://example.invalid","model",cfg,"piperLow"),/HTTP 404/);
 assert.deepEqual(removed,["test.onnx"]);
 assert.equal(written.length,0);
 response={ok:true,blob:async()=>new Blob(["123456"])};
 await assert.rejects(api.preparePiperFile(dir,"test.onnx","https://example.invalid","model",cfg,"piperLow"),/完整性驗證失敗/);
 assert.equal(written.length,0);
 response={ok:true,blob:async()=>data};
 await api.preparePiperFile(dir,"test.onnx","https://example.invalid","model",cfg,"piperLow");
 assert.equal(written.length,1);
 await api.preparePiperFile(dir,"test.onnx","https://example.invalid","model",cfg,"piperLow");
 assert.equal(fetches,3);
 const sdk={TtsSession:{_instance:{voiceId:"wrong"},async create({voiceId}){if(this._instance)return this._instance;return this._instance={voiceId,ready:true}}}};
 const low=await api.createPiperSession(sdk,"low","piperLow"),medium=await api.createPiperSession(sdk,"medium","piperMedium");
 assert.notEqual(low,medium);
 assert.equal(low.voiceId,"low");assert.equal(medium.voiceId,"medium");assert.equal(sdk.TtsSession._instance,null);
 assert.doesNotMatch(source,/sdk\.download\(|sdk\.stored\(|sdk\.flush\(/);
});
