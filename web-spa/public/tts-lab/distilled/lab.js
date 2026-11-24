const $=s=>document.querySelector(s);
const models=[
 ["paradee8","Paradee v1.3 INT8","8.5 MB","Kokoro 蒸餾模型 · 優先測試"],
 ["paradee32","Paradee v1.3 FP32","35 MB","相同模型，不量化"],
 ["nano8","Kitten 2 Nano INT8","17.4 MB","對照較高精度的 Nano"],
 ["mini4","Kitten 2 Mini INT4","47.5 MB","較大模型，低位元權重"],
 ["phonon","Phonon 31M Q8","約 65 MB","官方 WASM · 預設音色、原速"],
 ["kokoro","Kokoro 82M Q8","約 92 MB","目前音質基準 · WASM"],
 ["sanoZh","sanoTTS Xiaoya","超輕量","中文專用 · GPL runtime；音色資料授權待確認"],
 ["piperLow","Piper Huayan X-Low","20.6 MB","中文 · 16 kHz · 來源資料授權待確認"],
 ["piperMedium","Piper Huayan Medium","63.2 MB","中文 · 22.05 kHz · 來源資料授權待確認"],
 ["mini4ko","Kitten 2 Mini INT4","47.5 MB","韓文 · Apache 2.0 · 實驗 G2P"],
 ["mini8ko","Kitten 2 Mini INT8","約 83 MB","韓文 · Apache 2.0 · 精度比較"]
];
const language=$("#language"),presets={
 en:["Comfortable.","It depends on the situation.","Nice to meet you, Zoe.","I thought it would be difficult, but after a little practice, I realized it was much easier than I expected.","Seventeen, seventy, three, thirty, thirteen, and thirty-three."],
 zh:["舒服。","你想和我一起練習中文嗎？","你好，很高興認識你。","一開始我覺得很難，但是每天練習一點，就發現其實比想像中容易。","四是四，十是十，十四是十四，四十是四十。"],
 ko:["편안하다.","매일 저와 함께 한국어를 연습해 볼까요?","안녕하세요, 만나서 반갑습니다.","처음에는 어렵다고 생각했지만, 매일 조금씩 연습하다 보니 생각보다 훨씬 쉬웠어요.","오늘 오후 네 시에 친구 세 명을 만나요."]
};
const voices={en:[["af_heart","美式女聲"],["am_puck","美式男聲"],["bf_isabella","英式女聲"],["bm_fable","英式男聲"]],zh:[["female","固定音色（依模型）"]],ko:[["seoyeon","Seoyeon · 女聲"],["minjun","Minjun · 男聲"],["jihoon","Jihoon · 男聲"]]};
const modelLanguages={sanoZh:"zh",piperLow:"zh",piperMedium:"zh",mini4ko:"ko",mini8ko:"ko"};
const rows=new Map(),urls=new Map();let busy=false,worker=null,loaded=null,seq=0;
for(const [id,name,size,desc] of models){
 const card=document.createElement("article");card.innerHTML='<div class="head"><h2></h2><span class="size"></span></div><small></small><button class="play" type="button">生成並試聽</button><p class="status" role="status" aria-live="polite">尚未下載</p><audio controls preload="none" hidden></audio>';
 card.querySelector("h2").textContent=name;card.querySelector(".size").textContent=size;card.querySelector("small").textContent=desc;
 const button=card.querySelector("button"),status=card.querySelector(".status"),audio=card.querySelector("audio");rows.set(id,{button,status,audio,card});
 button.addEventListener("click",()=>run(id));audio.addEventListener("play",()=>{for(const r of rows.values())if(r.audio!==audio)r.audio.pause()});$("#models").append(card);
}
const drafts={};let currentLanguage=language.value;
const presetButtons=[...document.querySelectorAll("[data-text]")];
presetButtons.forEach((b,i)=>b.onclick=()=>{$("#text").value=presets[language.value][i]});
function renderLanguage(){
 const lang=language.value;$("#text").lang={en:"en",zh:"zh-TW",ko:"ko"}[lang];$("#text").value=drafts[lang]??presets[lang][1];
 $("#voice").replaceChildren(...voices[lang].map(([v,name])=>{const o=document.createElement("option");o.value=v;o.textContent=name;return o}));
 for(const [id,r] of rows){r.card.hidden=(modelLanguages[id]||"en")!==lang;r.audio.pause()}
 for(const el of document.querySelectorAll("[data-lang]"))el.hidden=el.dataset.lang!==lang;
 $("#global").textContent="選擇一個模型開始試聽。";
}
language.addEventListener("change",()=>{drafts[currentLanguage]=$("#text").value;currentLanguage=language.value;resetWorker();renderLanguage()});
renderLanguage();
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
 if(busy||(modelLanguages[id]||"en")!==language.value)return;const text=$("#text").value.trim();if(!text){$("#global").textContent="請輸入測試文字。";return}
 const r=rows.get(id);setBusy(true);r.status.classList.remove("error");for(const x of rows.values())x.audio.pause();
 try{
 const t=performance.now(),warm=loaded===id;
 if(!warm){resetWorker();worker=new Worker("./engine.js?v=asia4");await request(id,{type:"load"},s=>r.status.textContent=s);loaded=id}
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
