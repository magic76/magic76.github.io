const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("TTS comparison lab pins local model runtimes and keeps production isolated",()=>{
 const page=read("web-spa/public/tts-lab/compare/index.html");
 const js=read("web-spa/public/tts-lab/compare/compare.js");
 const vocab=read("web-spa/src/teacher/VocabularyPage.tsx");
 assert.match(page,/Kitten TTS 2 Nano int4/);
 assert.match(page,/Kitten TTS 2 Pico int4/);
 assert.match(page,/At first, I thought learning English/);
 assert.match(js,/Three thoughtful travelers/);
 assert.match(js,/kokoro-js@1\.2\.1/);
 assert.match(js,/KittenTTS-web@c846fe92858f3447f4912226471f5a63983b3f94/);
 assert.match(js,/onnxruntime-web@1\.24\.3/);
 assert.match(js,/pako@2\.1\.0/);
 assert.match(js,/kitten_tts_2_nano_en_int4\.onnx/);
 assert.match(js,/kitten_tts_2_pico_en_int4\.onnx/);
 assert.match(js,/analytics:false/);
 assert.match(js,/new sdk\.CEPhonemizer/);
 assert.doesNotMatch(vocab,/KokoroTTS|KittenTTSWeb|kitten-tts-2|tts-lab/);
});

test("TTS labs remain noindexed and hub links to the comparison",()=>{
 const hub=read("web-spa/public/tts-lab/index.html");
 const headers=read("_headers");
 assert.match(hub,/href="\/tts-lab\/compare\/"/);
 assert.match(headers,/\/tts-lab\/\*\n  X-Robots-Tag: noindex, nofollow/);
});
