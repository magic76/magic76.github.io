const $=id=>document.getElementById(id);
const languages={zh:"chinese",en:"english",ja:"japanese",ko:"korean",pt:"portuguese",es:"spanish",fr:"french",de:"german",vi:"vietnamese"};
const recognitionCtor=()=>window.SpeechRecognition||window.webkitSpeechRecognition;
let pcm=null,url=null,stream=null,recorder=null,timer=null,recognition=null,worker=null,settle=null,busy=false,cancelled=false,capturing=false,decoding=false;
let nativeTimer=null,nativeShared=false,leaving=false,nativeAttempt=0;
const maxSeconds=20,rate=16000;
const buttons=[...document.querySelectorAll("[data-model]")];
function sync(){
 const locked=busy||capturing||decoding||!!recognition;
 $("record").disabled=locked;$("file").disabled=locked;$("language").disabled=locked;
 $("stop").disabled=!recorder||recorder.state!=="recording";
 for(const id of ["native","native-basic","native-shared"])$(id).disabled=locked||!recognitionCtor();
 for(const id of ["native-language","native-hints","native-boost"])$(id).disabled=locked;
 $("native-stop").disabled=!recognition&&!nativeShared;
 $("clear").disabled=locked||(!pcm&&["basic","native"].every(id=>$(id+"-text").textContent==="待測試"));
 $("both").disabled=locked||!pcm;buttons.forEach(b=>b.disabled=locked||!pcm);
 $("cancel").disabled=!busy;
}
function clearClip(){
 pcm=null;if(url)URL.revokeObjectURL(url);url=null;
 $("player").removeAttribute("src");$("player").hidden=true;$("download").hidden=true;$("download").removeAttribute("href");
 for(const id of ["tiny","base"]){$(id+"-text").textContent="待測試";$(id+"-time").textContent=""}
}
function wav(samples){
 const b=new ArrayBuffer(44+samples.length*2),v=new DataView(b);
 function s(o,t){for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i))}
 s(0,"RIFF");v.setUint32(4,b.byteLength-8,true);s(8,"WAVE");s(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);s(36,"data");v.setUint32(40,samples.length*2,true);
 for(let i=0;i<samples.length;i++)v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),true);
 return new Blob([b],{type:"audio/wav"});
}
async function decode(blob){
 decoding=true;clearClip();sync();$("capture").textContent="處理錄音…";
 let ctx;
 try{
  if(!blob.size||blob.size>15*1024*1024)throw Error("音檔為空或大於 15 MB");
  ctx=new AudioContext();const buffer=await ctx.decodeAudioData(await blob.arrayBuffer());
  if(buffer.duration>maxSeconds+.5||buffer.duration<.15)throw Error("請使用 0.15–20 秒音檔");
  const length=Math.min(rate*maxSeconds,Math.ceil(buffer.duration*rate));
  const offline=new OfflineAudioContext(1,length,rate),source=offline.createBufferSource();source.buffer=buffer;source.connect(offline.destination);source.start();
  const rendered=await offline.startRendering();pcm=new Float32Array(rendered.getChannelData(0));
  url=URL.createObjectURL(wav(pcm));$("player").src=url;$("player").hidden=false;$("download").href=url;$("download").hidden=false;
  $("capture").textContent=(pcm.length/rate).toFixed(2)+" 秒 · 16 kHz mono PCM · 可以開始辨識";
 }catch(e){$("capture").textContent="音訊處理失敗："+(e.message||e)}
 finally{if(ctx)try{await ctx.close()}catch{}decoding=false;sync()}
}
function release(){clearTimeout(timer);timer=null;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;recorder=null;capturing=false}
async function recordClip(shared=false){
 capturing=true;nativeShared=shared;clearClip();sync();$("capture").textContent="請允許使用麥克風";
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});
  if(leaving){release();nativeShared=false;return}
  recorder=new MediaRecorder(stream);const chunks=[];
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  recorder.onerror=()=>{if(shared)stopNative(true);nativeShared=false;release();$("capture").textContent="錄音失敗";sync()};
  recorder.onstop=()=>{const mime=recorder?.mimeType||chunks[0]?.type;if(shared)stopNative(false);nativeShared=false;release();if(!leaving)void decode(new Blob(chunks,{type:mime}))};
  recorder.start();timer=setTimeout(()=>{if(recorder?.state==="recording")recorder.stop()},maxSeconds*1000);
  $("capture").textContent="錄音中…最多 20 秒";
  if(shared)startNative("shared",stream.getAudioTracks()[0]);
  sync();
 }catch(e){nativeShared=false;release();$("capture").textContent="無法錄音："+(e.message||e);sync()}
}
$("record").onclick=()=>void recordClip();
$("stop").onclick=()=>{if(recorder?.state==="recording")recorder.stop()};
$("file").onchange=()=>{const file=$("file").files[0];$("file").value="";if(file)void decode(file)};
$("clear").onclick=()=>{clearClip();$("reference").value="";$("gemini").value="";for(const id of ["basic","native"]){$(id+"-text").textContent="待測試";$(id+"-time").textContent=""} $("native-candidates").textContent="待測試";$("native-mode").textContent="";nativeResults={basic:"",native:""};refreshComparison();$("capture").textContent="錄音與結果已清除";sync()};
const seconds=ms=>(ms/1000).toFixed(2)+" 秒";
function run(model,language){
 return new Promise(resolve=>{
  const output=$(model+"-text"),timing=$(model+"-time");output.textContent="初始化模型…";timing.textContent="";
  let timeout;
  const finish=()=>{clearTimeout(timeout);if(worker)worker.terminate();worker=null;settle=null;resolve()};
  settle=()=>{output.textContent="已取消";finish()};
  try{
   worker=new Worker(new URL("./worker.js",import.meta.url),{type:"module"});
   worker.onmessage=({data:d})=>{
    if(d.type==="progress")output.textContent="載入 "+(d.file||"模型")+(Number.isFinite(d.percent)?" · "+d.percent+"%":"");
    else if(d.type==="result"){output.textContent=d.text||"（無文字）";timing.textContent="載入 "+seconds(d.loadMs)+" · 推論 "+seconds(d.inferMs)+" · RTF "+(d.inferMs/1000/(pcm.length/rate)).toFixed(2);finish()}
    else if(d.type==="error"){output.textContent="辨識失敗："+d.message;finish()}
   };
   worker.onerror=e=>{output.textContent="Worker 失敗："+(e.message||"無法載入");finish()};
   timeout=setTimeout(()=>{output.textContent="載入或辨識逾時（5 分鐘），請重試";finish()},300000);
   worker.postMessage({model,language,pcm});
  }catch(e){output.textContent="無法啟動："+(e.message||e);finish()}
 });
}
async function compare(models){
 if(!pcm||busy)return;
 busy=true;cancelled=false;sync();
 const lang=$("language").value,language=languages[lang]||"auto";
 try{for(const model of models){if(cancelled)break;await run(model,language)}}
 finally{busy=false;sync()}
}
buttons.forEach(b=>b.onclick=()=>void compare([b.dataset.model]));
$("both").onclick=()=>void compare(["tiny","base"]);
$("cancel").onclick=()=>{cancelled=true;settle?.()};
$("language").onchange=()=>{for(const id of ["tiny","base"]){$(id+"-text").textContent="待測試";$(id+"-time").textContent=""}};
// Browser STT A/B: no user transcript is modified by heuristics.
let nativeResults={basic:"",native:""};
function splitHints(value){return [...new Set(value.split(/[,，\n]/).map(x=>x.trim()).filter(x=>x&&x.length<=80))].slice(0,20)}
function normalize(value){return Array.from(value.normalize("NFKC").toLowerCase().replace(/[\p{P}\p{Z}\s]/gu,""))}
function charDistance(a,b){
 a=normalize(a);b=normalize(b);let prev=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){const row=[i];for(let j=1;j<=b.length;j++)row[j]=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+Number(a[i-1]!==b[j-1]));prev=row}
 return {distance:prev[b.length],length:a.length};
}
function refreshComparison(){
 const ref=$("reference").value.trim().slice(0,500),gemini=$("gemini").value.trim().slice(0,500);
 const values=[["基本",nativeResults.basic],["加強",nativeResults.native],["Gemini",gemini]].filter(([,v])=>v);
 const lines=[];
 if(ref)for(const [name,text] of values){const d=charDistance(ref,text.slice(0,500));if(d.length)lines.push(name+"：字元差異率 "+(100*d.distance/d.length).toFixed(1)+"%")}
 if(gemini&&nativeResults.native){const d=charDistance(gemini,nativeResults.native.slice(0,500));lines.push("Gemini vs 加強：相差 "+d.distance+" 個字元（不代表誰正確）")}
 $("native-compare").textContent=lines.join("\n")||"填入原句或 Gemini 字幕後可比較。";
}
function formatAlternatives(results){
 const lines=[];let best="",final="";
 for(let i=0;i<results.length;i++){const item=results[i];if(!item.length)continue;best+=item[0].transcript;if(item.isFinal)final+=item[0].transcript;
  for(let k=0;k<Math.min(5,item.length);k++){const alt=item[k],score=Number.isFinite(alt.confidence)?(alt.confidence*100).toFixed(1)+"%":"未提供";
   lines.push("段 "+(i+1)+" · "+(item.isFinal?"完成":"暫定")+" · 候選 "+(k+1)+"："+alt.transcript+"（"+score+"）")}
 }
 return {best:best.trim(),final:final.trim(),lines:lines.join("\n")};
}
function stopNative(abort=false){
 const r=recognition;if(!r)return;
 try{if(abort)r.abort();else r.stop()}catch{}
 clearTimeout(nativeTimer);
 // Some implementations never dispatch end after an error/stop.
 nativeTimer=setTimeout(()=>{if(recognition===r){try{r.abort()}catch{}recognition=null;sync()}},2000);
}
function startNative(mode,track){
 const C=recognitionCtor(),id=mode==="basic"?"basic":"native";
 const out=$(id+"-text"),time=$(id+"-time");
 if(!C)return;
 if(mode==="shared"&&(!track||track.kind!=="audio"||track.readyState!=="live")){out.textContent="沒有可用的 AudioTrack";return}
 const attempt=++nativeAttempt;let r;
 try{r=new C()}catch(e){out.textContent="無法建立辨識："+e.message;return}
 recognition=r;r.lang=$("native-language").value;r.interimResults=true;r.continuous=false;
 const enhanced=mode!=="basic";r.maxAlternatives=enhanced?5:1;
 let hintState="基本模式，不使用提示";
 if(enhanced){
  hintState="瀏覽器未支援詞彙加權";
  const hints=splitHints($("native-hints").value),Phrase=window.SpeechRecognitionPhrase;
  if(!hints.length)hintState="未設定提示詞";
  else if("phrases" in r&&typeof Phrase==="function"){
   try{r.phrases=hints.map(text=>new Phrase(text,Number($("native-boost").value)));hintState="已設定 "+hints.length+" 個提示詞（不保證服務採用）"}catch(e){hintState="詞彙提示設定失敗："+e.message}
  }
 }
 const route=mode==="shared"?"AudioTrack 參數實驗（尚未確認瀏覽器採用）":"瀏覽器麥克風";
 if(enhanced){$("native-mode").textContent=route+" · "+r.lang+" · "+hintState;$("native-candidates").textContent="待辨識"}
 nativeResults[id]="";refreshComparison();
 let started=performance.now(),failed=false,last="",lastFinal="";
 out.textContent="啟動中…";time.textContent="";sync();
 const current=()=>recognition===r&&attempt===nativeAttempt;
 r.onstart=()=>{if(current())out.textContent="請說話…（可能使用雲端）"};
 r.onresult=e=>{if(!current()||failed)return;const result=formatAlternatives(e.results);last=result.best;lastFinal=result.final;out.textContent=last||"（無文字）";if(enhanced)$("native-candidates").textContent=result.lines||"沒有候選";};
 r.onerror=e=>{if(!current())return;failed=true;out.textContent="辨識失敗："+e.error+(mode==="shared"?"（不另開麥克風）":"");stopNative(true)};
 r.onend=()=>{if(!current())return;clearTimeout(nativeTimer);recognition=null;
  if(!failed){nativeResults[id]=lastFinal;out.textContent=lastFinal||(last?"未取得最終文字（暫定："+last+"）":"未取得文字")}
  time.textContent=r.lang+" · 含說話時間 "+seconds(performance.now()-started);refreshComparison();sync();
 };
 try{if(mode==="shared")r.start(track);else r.start();
  nativeTimer=setTimeout(()=>{if(current())stopNative(false)},maxSeconds*1000+1000);
 }catch(e){recognition=null;out.textContent="啟動失敗："+e.message+(mode==="shared"?"（不另開麥克風）":"");sync()}
}
$("native-basic").onclick=()=>startNative("basic");
$("native").onclick=()=>startNative("enhanced");
$("native-shared").onclick=()=>void recordClip(true);
$("native-stop").onclick=()=>{if(nativeShared&&recorder?.state==="recording")recorder.stop();else stopNative(false)};
for(const id of ["reference","gemini"])$(id).addEventListener("input",refreshComparison);
$("copy").onclick=async()=>{
 const report=["Whisper 語言："+$("language").value,"瀏覽器語言："+$("native-language").value,"加強設定："+$("native-mode").textContent,"候選："+$("native-candidates").textContent,"比較："+$("native-compare").textContent,"原句："+$("reference").value,"錄音："+(pcm?(pcm.length/rate).toFixed(2)+" 秒":"無"),...["tiny","base","basic","native"].map(id=>id+"："+$(id+"-text").textContent+" | "+$(id+"-time").textContent),"Gemini Live（人工貼入）："+$("gemini").value].join("\n");
 try{await navigator.clipboard.writeText(report);$("copy-status").textContent="已複製"}catch{$("copy-status").textContent=report}
};
window.addEventListener("pagehide",()=>{leaving=true;clearTimeout(nativeTimer);nativeAttempt++;const r=recognition;recognition=null;try{r?.abort()}catch{}release();worker?.terminate();if(url)URL.revokeObjectURL(url)});
async function init(){
 try{
  const r=await fetch("/api/usage/report?days=7",{credentials:"same-origin",cache:"no-store"});
  if(!r.ok)throw Error("HTTP "+r.status);
  const data=await r.json();if(!Array.isArray(data.rows)||!Array.isArray(data.eventUsers))throw Error("管理員驗證回應無效");
  $("gate").hidden=true;$("lab").hidden=false;
  const C=recognitionCtor();let support="此瀏覽器不支援 Web Speech API";
  if(C)try{const r=new C();support="Web Speech API 可用 · 詞彙提示："+(("phrases" in r&&typeof window.SpeechRecognitionPhrase==="function")?"API 可用（服務待驗證）":"未支援")+" · AudioTrack 需實測"}catch{}
  $("native-support").textContent=support;sync();
 }catch(e){$("gate").textContent="無法確認管理員權限，請先登入並從 Usage 進入。"}
}
void init();
