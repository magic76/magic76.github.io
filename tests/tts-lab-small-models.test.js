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
 assert.deepEqual(JSON.parse(routes),{system:["en","zh","ja","ko","es"],nano2:["es"],pico2:["en","es"]});
 assert.deepEqual([...page.matchAll(/data-engine="([^"]+)"/g)].map(m=>m[1]).sort(),["nano2","pico2","system"]);
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
 assert.match(page,/ampixa.github.io\/sanoTTS/);
 assert.match(page,/ctrltokyo\/eeh-1/);
 assert.match(page,/尚未接入本站推論/);
 assert.ok(js.includes('el.hidden=!el.dataset.extraLangs.split(",").includes(language.value)'));
});
