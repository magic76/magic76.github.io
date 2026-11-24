const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
test("distilled lab isolates local models and validates WAV",()=>{
 const root="web-spa/public/tts-lab/distilled/",html=read(root+"index.html"),js=read(root+"lab.js"),worker=read(root+"engine.js");
 assert.match(html,/noindex,nofollow/);assert.match(html,/src="\.\/lab.js"/);
 for(const id of ["paradee8","paradee32","nano8","mini4","phonon","kokoro"])assert.ok(js.includes('"'+id+'"'));
 assert.match(js,/new Worker\("\.\/engine.js"\)/);assert.match(js,/resetWorker/);
 assert.doesNotMatch(js+worker,/esm\.sh|speechSynthesis|workers\.dev/);
 assert.match(worker,/paradee_int8\.onnx/);assert.match(worker,/kitten_tts_2_mini_int4\.onnx/);assert.match(worker,/dtype:"q8"/);
 assert.doesNotThrow(()=>new vm.Script(js));assert.doesNotThrow(()=>new vm.Script(worker));
 const ctx={self:{},ArrayBuffer,DataView,Float32Array,Math,Number};const f=vm.runInNewContext(worker+";wav",ctx);
 assert.throws(()=>f(Float32Array.of(0,0)),/無效或無聲/);assert.equal(f(Float32Array.of(.1,-.2)).byteLength,44+(4800+2)*2);
 assert.match(read("web-spa/public/tts-lab/index.html"),/href="\/tts-lab\/distilled\/"/);
});
