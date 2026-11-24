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
 for(const s of ["kokoro-js@1.2.1/dist/kokoro.web.js","Kokoro-82M-v1.0-ONNX",'device=hasWebGpu?"webgpu":"wasm"','dtype=hasWebGpu?"fp32":"q8"',"audio.toBlob()","speechSynthesis"])assert.ok(page.includes(s),s);
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
 for(const s of ["KokoroJP.load({modelId:MODEL_ID,device,dtype})","tts.speak(v,selected,rate)","from_pretrained(ZH_MODEL","tts.generate_from_ids(input_ids,{voice:selected,speed:rate})","tts.generate(v,{voice:selected,speed:rate})","if(active?.route===route)return active.tts","audio.audio.every(Number.isFinite)",'profile:"kokoro"','data/"+language+".ucd','uccharan@1.0.0/'])assert.ok(code.includes(s),s);
});
