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

test("comparison exposes explicit GPU and WASM paths and never silently falls back",()=>{
 const page=read("web-spa/public/tts-lab/compare/index.html");
 const js=read("web-spa/public/tts-lab/compare/compare.js");
 for(const id of ["kokoro","kokoroGpuQ8","kokoroGpuFp32","piper","supertonicWasm","supertonicGpu"]){
  assert.ok(page.includes('data-engine="'+id+'"'));
  assert.ok(page.includes('id="status-'+id+'"'));
 }
 assert.match(js,/navigator\.gpu\?\.requestAdapter\(\)/);
 assert.match(js,/kokoroTts\("kokoroGpuQ8","webgpu","q8"\)/);
 assert.match(js,/kokoroTts\("kokoroGpuFp32","webgpu","fp32"\)/);
 assert.match(js,/device="wasm",dtype="q8"/);
 assert.match(js,/@realtimex\/piper-tts-web@1\.1\.1/);
 assert.match(js,/open-world-group\/Supertonic-3-ONNX/);
 assert.match(js,/latent_denoiser:"q8"/);
 assert.match(js,/crossOriginIsolated/);
 assert.match(js,/function timing\(/);
 assert.doesNotThrow(()=>new (require("node:vm").Script)(js));
});

test("comparison language routing and Japanese/Korean chunk lengths",()=>{
 const page=read("web-spa/public/tts-lab/compare/index.html");
 const js=read("web-spa/public/tts-lab/compare/compare.js");
 for(const lang of ["en","zh","ja","ko"])assert.ok(page.includes('value="'+lang+'"'));
 assert.match(js,/u\.lang=locale/);
 assert.match(js,/zh_CN-huayan-medium/);
 assert.match(js,/piperPlus:\["en","zh","ja"\]/);
 assert.match(js,/supertonicWasm:\["en","ja","ko"\]/);
 assert.match(js,/supertonicGpu:\["en","ja","ko"\]/);
 assert.match(js,/kokoro:\["en"\]/);
 assert.match(js,/kitten08:\["en"\],nano2:\["en"\],pico2:\["en"\]/);
 assert.match(js,/!supports\(id,language\.value\)/);
 assert.match(js,/engines\[id\]\("<"\+lang\+">"\+chunks\[i\]\+"<\/"\+lang\+">"/);
 const source=js.slice(js.indexOf("function splitSupertonic("),js.indexOf("async function supertonicTts("));
 const split=require("node:vm").runInNewContext(source+";splitSupertonic");
 for(const [lang,value] of [["ja","こんにちは。".repeat(50)],["ko","안녕하세요. ".repeat(50)]]){
  const chunks=split(value,lang);
  assert.ok(chunks.length>1);
  assert.ok(chunks.every(chunk=>Array.from(chunk).length<=120));
  assert.equal(chunks.join("").replace(/\s/g,""),value.replace(/\s/g,""));
 }
 assert.doesNotThrow(()=>new (require("node:vm").Script)(js));
});
