const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("Kokoro TTS lab is isolated, pinned, and noindexed",()=>{
 const page=read("web-spa/public/tts-lab/kokoro/index.html");
 const hub=read("web-spa/public/tts-lab/index.html");
 const headers=read("_headers");
 assert.match(page,/kokoro-js@1\\.2\\.1\\/dist\\/kokoro\\.web\\.js/);
 assert.match(page,/Kokoro-82M-v1\\.0-ONNX/);
 assert.match(page,/hasWebGpu/);
 assert.match(page,/device=hasWebGpu\\?"webgpu":"wasm"/);
 assert.match(page,/dtype=hasWebGpu\\?"fp32":"q8"/);
 assert.match(page,/audio\\.toBlob\\(\\)/);
 assert.match(page,/speechSynthesis/);
 assert.match(hub,/href="\\/tts-lab\\/kokoro\\/"/);
 assert.match(headers,/\\/tts-lab\\/\\*\\n  X-Robots-Tag: noindex, nofollow/);
});

test("production vocabulary does not depend on Kokoro experiment",()=>{
 const vocabulary=read("web-spa/src/teacher/VocabularyPage.tsx");
 assert.doesNotMatch(vocabulary,/kokoro-js|KokoroTTS|tts-lab/);
});
