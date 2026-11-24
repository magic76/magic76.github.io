const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
test("Kokoro TTS lab is isolated, pinned, and noindexed",()=>{
 const page=read("web-spa/public/tts-lab/kokoro/index.html");
 const code=page.split('<script type="module">')[1].split("</script>")[0];
 assert.doesNotThrow(()=>new vm.Script(code));
 for(const s of ["kokoro-js@1.2.1/dist/kokoro.web.js","Kokoro-82M-v1.0-ONNX",'device:gpu.available?"webgpu":"wasm"','dtype:gpu.available||route==="zh"?"fp32":"q8"',"audio.toBlob()","speechSynthesis"])assert.ok(page.includes(s),s);
 assert.ok(read("web-spa/public/tts-lab/index.html").includes('href="/tts-lab/kokoro/"'));
 assert.ok(read("_headers").includes("/tts-lab/*\n  X-Robots-Tag: noindex, nofollow"));
 assert.doesNotMatch(read("web-spa/src/teacher/VocabularyPage.tsx"),/kokoro-js|KokoroTTS|tts-lab/);
});
test("all Kokoro language families have appropriate frontends and voices",()=>{
 const page=read("web-spa/public/tts-lab/kokoro/index.html");
 const code=page.split('<script type="module">')[1].split("</script>")[0];
 const src=code.slice(code.indexOf("const ZH_VOICES="),code.indexOf("const $="));
 const routes=JSON.parse(vm.runInNewContext(src+";JSON.stringify(LANGUAGES)"));
 assert.deepEqual(Object.keys(routes),["en-US","en-GB","zh","ja","es","fr","hi","it","pt-BR"]);
 assert.equal(routes.zh.voices.length,100);
 assert.equal(routes.ja.voices.length,5);
 assert.equal(routes["en-US"].voices.length,20);
 assert.equal(routes["en-GB"].voices.length,8);
 for(const [lang,g2p] of [["es","es"],["fr","fr"],["hi","hi"],["it","it"],["pt-BR","pt-br"]]){assert.equal(routes[lang].route,"base");assert.equal(routes[lang].g2p,g2p);}
 for(const [lang,cfg] of Object.entries(routes)){assert.ok(page.includes('value="'+lang+'"'));assert.ok(cfg.sample.length>=2&&cfg.voices.length>0);assert.equal(new Set(cfg.voices).size,cfg.voices.length);}
 for(const s of ["KokoroJP.load({modelId:MODEL_ID,device,dtype})","tts.speak(v,selected,rate)","from_pretrained(ZH_MODEL","tts.generate_from_ids(input_ids,{voice:selected,speed:rate})","tts.generate(v,{voice:selected,speed:rate})","if(active?.key===key)return active.tts","audio.audio.every(Number.isFinite)",'profile:"kokoro"','data/"+language+".ucd','uccharan@1.0.0/'])assert.ok(code.includes(s),s);
});

test("Kokoro runtime modes use exact upstream model sizes and independent sessions",()=>{
 const page=read("web-spa/public/tts-lab/kokoro/index.html");
 const code=page.split('<script type="module">')[1].split("</script>")[0];
 const src=code.slice(code.indexOf("const MODEL_SIZES="),code.indexOf("function renderModeOptions"));
 const api=vm.runInNewContext(src+";({MODES,resolveMode,modelSize,sessionKey})");
 const gpu={available:true,f16:true},cpu={available:false,f16:false},noF16={available:true,f16:false};
 assert.equal(api.MODES.length,7);
 assert.equal(api.resolveMode("base","auto",cpu).dtype,"q8");
 assert.equal(api.resolveMode("zh","auto",cpu).dtype,"fp32");
 assert.equal(api.resolveMode("base","auto",gpu).device,"webgpu");
 assert.equal(api.resolveMode("zh","webgpu-fp16",gpu).dtype,"fp16");
 assert.equal(api.resolveMode("base","webgpu-q4f16",gpu).dtype,"q4f16");
 assert.throws(()=>api.resolveMode("base","webgpu-fp32",cpu),/adapter/);
 assert.throws(()=>api.resolveMode("base","webgpu-fp16",noF16),/shader-f16/);
 assert.throws(()=>api.resolveMode("base","webgpu-q4f16",noF16),/shader-f16/);
 assert.equal(api.modelSize("base","q4f16"),155);
 assert.equal(api.modelSize("zh","q4f16"),166);
 assert.equal(api.modelSize("ja","q4"),305);
 assert.equal(api.modelSize("zh","q8"),127);
 assert.notEqual(api.sessionKey("base",api.resolveMode("base","wasm-q8",gpu)),api.sessionKey("base",api.resolveMode("base","webgpu-fp32",gpu)));
 assert.notEqual(api.sessionKey("base",api.resolveMode("base","webgpu-fp32",gpu)),api.sessionKey("base",api.resolveMode("base","webgpu-fp16",gpu)));
 for(const s of ['<select id="mode">','navigator.gpu.requestAdapter()','adapter?.features?.has("shader-f16")','mode.disabled=b','await load(info.route,config)','from_pretrained(ZH_MODEL,{device,dtype,','KokoroJP.load({modelId:MODEL_ID,device,dtype})','from_pretrained(MODEL_ID,{device,dtype,','active={route,key,tts}'])assert.ok(page.includes(s),s);
});
