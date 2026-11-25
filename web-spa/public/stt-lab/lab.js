const $=id=>document.getElementById(id);
const languages={zh:"chinese",en:"english",ja:"japanese",ko:"korean",pt:"portuguese",es:"spanish",fr:"french",de:"german",vi:"vietnamese"};
const nativeLanguages={zh:"zh-TW",en:"en-US",ja:"ja-JP",ko:"ko-KR",pt:"pt-BR",es:"es-ES",fr:"fr-FR",de:"de-DE",vi:"vi-VN"};
let pcm=null,url=null,stream=null,recorder=null,timer=null,recognition=null,worker=null,settle=null,busy=false,cancelled=false,capturing=false,decoding=false;
const maxSeconds=20,rate=16000;
const buttons=[...document.querySelectorAll("[data-model]")];
function sync(){
 const locked=busy||capturing||decoding||!!recognition;
 $("record").disabled=locked;$("file").disabled=locked;$("language").disabled=locked;
 $("stop").disabled=!recorder||recorder.state!=="recording";
 $("native").disabled=locked||!(window.SpeechRecognition||window.webkitSpeechRecognition);
 $("native-stop").disabled=!recognition;
 $("clear").disabled=locked||!pcm;
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
$("record").onclick=async()=>{
 capturing=true;clearClip();sync();$("capture").textContent="請允許使用麥克風";
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});
  recorder=new MediaRecorder(stream);const chunks=[];
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  recorder.onerror=()=>{release();$("capture").textContent="錄音失敗";sync()};
  recorder.onstop=()=>{const mime=recorder?.mimeType||chunks[0]?.type;release();void decode(new Blob(chunks,{type:mime}))};
  recorder.start();timer=setTimeout(()=>{if(recorder?.state==="recording")recorder.stop()},maxSeconds*1000);
  $("capture").textContent="錄音中…最多 20 秒";sync();
 }catch(e){release();$("capture").textContent="無法錄音："+(e.message||e);sync()}
};
$("stop").onclick=()=>{if(recorder?.state==="recording")recorder.stop()};
$("file").onchange=()=>{const file=$("file").files[0];$("file").value="";if(file)void decode(file)};
$("clear").onclick=()=>{clearClip();$("reference").value="";$("gemini").value="";$("native-text").textContent="待測試";$("native-time").textContent="";$("capture").textContent="錄音與結果已清除";sync()};
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
$("native").onclick=()=>{
 const C=window.SpeechRecognition||window.webkitSpeechRecognition;
 const lang=$("language").value;
 if(lang==="auto"){$("native-text").textContent="瀏覽器辨識請先指定語言；不提供自動語言偵測對照。";return}
 if(!C)return;
 const r=new C();recognition=r;r.lang=nativeLanguages[lang];r.interimResults=true;r.continuous=false;
 let start=performance.now(),failed=false,finalText="";
 $("native-text").textContent="請說話…（可能使用雲端）";$("native-time").textContent="";sync();
 r.onresult=e=>{let text="";for(let i=0;i<e.results.length;i++)text+=e.results[i][0].transcript;finalText=text;$("native-text").textContent=text};
 r.onerror=e=>{failed=true;$("native-text").textContent="辨識失敗："+e.error};
 r.onend=()=>{if(!failed&&!finalText)$("native-text").textContent="未取得文字";$("native-time").textContent="含說話時間 "+seconds(performance.now()-start);recognition=null;sync()};
 try{r.start()}catch(e){recognition=null;$("native-text").textContent="啟動失敗："+e.message;sync()}
};
$("native-stop").onclick=()=>recognition?.stop();
$("copy").onclick=async()=>{
 const report=["語言："+$("language").value,"原句："+$("reference").value,"錄音："+(pcm?(pcm.length/rate).toFixed(2)+" 秒":"無"),...["tiny","base","native"].map(id=>id+"："+$(id+"-text").textContent+" | "+$(id+"-time").textContent),"Gemini Live（人工貼入）："+$("gemini").value].join("\n");
 try{await navigator.clipboard.writeText(report);$("copy-status").textContent="已複製"}catch{$("copy-status").textContent=report}
};
window.addEventListener("pagehide",()=>{release();recognition?.abort();worker?.terminate();if(url)URL.revokeObjectURL(url)});
async function init(){
 try{
  const r=await fetch("/api/usage/report?days=7",{credentials:"same-origin",cache:"no-store"});
  if(!r.ok)throw Error("HTTP "+r.status);
  const data=await r.json();if(!Array.isArray(data.rows)||!Array.isArray(data.eventUsers))throw Error("管理員驗證回應無效");
  $("gate").hidden=true;$("lab").hidden=false;sync();
 }catch(e){$("gate").textContent="無法確認管理員權限，請先登入並從 Usage 進入。"}
}
void init();
