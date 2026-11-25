const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const root="web-spa/public/stt-lab/";
const read=p=>fs.readFileSync(p,"utf8");
test("STT lab stays outside live routing and is linked after admin data loads",()=>{
 const html=read(root+"index.html"),js=read(root+"lab.js"),worker=read(root+"worker.js");
 assert.match(html,/noindex,nofollow/);
 assert.match(read("_headers"),/\/stt-lab\/\*\n  X-Robots-Tag: noindex, nofollow/);
 assert.match(read("web-spa/src/analytics/UsageDashboardPage.tsx"),/\{data&&<a href="\/stt-lab\//);
 assert.match(js,/\/api\/usage\/report\?days=7/);
 assert.match(js,/new OfflineAudioContext\(1,length,rate\)/);
 assert.match(js,/worker\.postMessage\(\{model,language,pcm\}\)/);
 assert.match(js,/for\(const model of models\)/);
 assert.match(worker,/device:"wasm",dtype:"q8"/);
 assert.match(worker,/Xenova\/whisper-/);
 assert.doesNotMatch(worker,/fetch\(|WebSocket|XMLHttpRequest/);
 assert.doesNotThrow(()=>new vm.Script(worker));
 assert.doesNotThrow(()=>new vm.Script(js.replace("import.meta.url",'"https://koolo.app/stt-lab/lab.js"')));
});

test("browser ASR exposes A/B, fixed locale, hints and experimental track without implicit fallback",()=>{
 const html=read(root+"index.html"),js=read(root+"lab.js");
 for(const id of ["native-basic","native-language","native-hints","native-boost","native-shared","native-candidates","native-compare"])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(js,/r\.lang=\$\("native-language"\)\.value/);
 assert.match(js,/r\.maxAlternatives=enhanced\?5:1/);
 assert.match(js,/r\.phrases=hints\.map/);
 assert.match(js,/if\(mode==="shared"\)r\.start\(track\);else r\.start\(\)/);
 assert.match(js,/startNative\("shared",stream\.getAudioTracks\(\)\[0\]\)/);
 assert.match(html,/可能忽略 track 參數/);
 const extract=(name,next)=>js.slice(js.indexOf("function "+name+"("),js.indexOf("function "+next+"("));
 const result=vm.runInNewContext(extract("splitHints","normalize")+extract("normalize","charDistance")+extract("charDistance","refreshComparison")+extract("formatAlternatives","stopNative")+`
 ({hints:splitHints(" Zoe, Koolo，Zoe"),same:charDistance("Hello, Zoe!","hello zoe"),diff:charDistance("今天","明天"),candidates:formatAlternatives([Object.assign([{transcript:"Zoe",confidence:.8},{transcript:"Joe",confidence:.4}],{isFinal:true})])})
 `);
 assert.equal(result.hints.join(","),"Zoe,Koolo");
 assert.equal(result.same.distance,0);assert.equal(result.diff.distance,1);
 assert.equal(result.candidates.final,"Zoe");assert.match(result.candidates.lines,/Joe/);
});
