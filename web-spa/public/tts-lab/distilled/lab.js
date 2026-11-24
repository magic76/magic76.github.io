const $=s=>document.querySelector(s);
const models=[
 ["paradee8","Paradee v1.3 INT8","8.5 MB","Kokoro 蒸餾模型 · 優先測試"],
 ["paradee32","Paradee v1.3 FP32","35 MB","相同模型，不量化"],
 ["nano8","Kitten 2 Nano INT8","17.4 MB","對照較高精度的 Nano"],
 ["mini4","Kitten 2 Mini INT4","47.5 MB","較大模型，低位元權重"],
 ["phonon","Phonon 31M Q8","約 65 MB","官方 WASM · 預設音色、原速"],
 ["kokoro","Kokoro 82M Q8","約 92 MB","目前音質基準 · WASM"]
];
const rows=new Map(),urls=new Map();let busy=false,worker=null,loaded=null,seq=0;
for(const [id,name,size,desc] of models){
 const card=document.createElement("article");card.innerHTML='<div class="head"><h2></h2><span class="size"></span></div><small></small><button class="play" type="button">生成並試聽</button><p class="status" role="status" aria-live="polite">尚未下載</p><audio controls preload="none" hidden></audio>';
 card.querySelector("h2").textContent=name;card.querySelector(".size").textContent=size;card.querySelector("small").textContent=desc;
 const button=card.querySelector("button"),status=card.querySelector(".status"),audio=card.querySelector("audio");rows.set(id,{button,status,audio});
 button.addEventListener("click",()=>run(id));audio.addEventListener("play",()=>{for(const r of rows.values())if(r.audio!==audio)r.audio.pause()});$("#models").append(card);
}
for(const b of document.querySelectorAll("[data-text]"))b.onclick=()=>{$("#text").value=b.dataset.text};
function setBusy(v){busy=v;for(const r of rows.values())r.button.disabled=v;for(const e of document.querySelectorAll("select,[data-text]"))e.disabled=v;$("#text").readOnly=v;}
function resetWorker(){worker?.terminate();worker=null;loaded=null;}
function request(id,payload,onStatus){return new Promise((resolve,reject)=>{
 const token=++seq;let timer;const w=worker;
 const cleanup=()=>{clearTimeout(timer);w.removeEventListener("message",message);w.removeEventListener("error",error);w.removeEventListener("messageerror",error)};
 const fail=e=>{cleanup();reject(e)};
 const error=e=>fail(Error(e.message||"Worker 初始化失敗"));
 const message=({data})=>{if(data.id!==token)return;if(data.status){onStatus(data.status);return}cleanup();if(data.error)reject(Error(data.error));else resolve(data)};
 w.addEventListener("message",message);w.addEventListener("error",error);w.addEventListener("messageerror",error);
 timer=setTimeout(()=>fail(Error("操作逾時，請再試一次")),payload.type==="load"?300000:120000);w.postMessage({id:token,model:id,...payload});
});}
async function run(id){
 if(busy)return;const text=$("#text").value.trim();if(!text){$("#global").textContent="請輸入測試文字。";return}
 const r=rows.get(id);setBusy(true);r.status.classList.remove("error");for(const x of rows.values())x.audio.pause();
 try{
 const t=performance.now(),warm=loaded===id;
 if(!warm){resetWorker();worker=new Worker("./engine.js");await request(id,{type:"load"},s=>r.status.textContent=s);loaded=id}
 const ready=performance.now();r.status.textContent="生成語音…";
 const result=await request(id,{type:"speak",text,voice:$("#voice").value,speed:Number($("#speed").value)},s=>r.status.textContent=s);
 const end=performance.now();if(!(result.buffer instanceof ArrayBuffer)||result.buffer.byteLength<=44)throw Error("未取得有效音訊");
 if(urls.has(id))URL.revokeObjectURL(urls.get(id));const url=URL.createObjectURL(new Blob([result.buffer],{type:"audio/wav"}));urls.set(id,url);r.audio.src=url;r.audio.hidden=false;
 const timing=(warm?"已載入":"首次準備（含快取或下載）")+" "+((ready-t)/1000).toFixed(2)+" 秒 · 生成 "+((end-ready)/1000).toFixed(2)+" 秒 · "+result.voice;
 r.status.textContent=timing;$("#global").textContent=models.find(m=>m[0]===id)[1]+" · "+timing;
 try{await r.audio.play()}catch{r.status.textContent+=" · 請手動按播放器播放"}
 }catch(e){resetWorker();r.status.classList.add("error");r.status.textContent="失敗："+e.message;$("#global").textContent="模型失敗，未使用替代語音。"}finally{setBusy(false)}
}
window.addEventListener("pagehide",()=>{resetWorker();for(const u of urls.values())URL.revokeObjectURL(u)});
