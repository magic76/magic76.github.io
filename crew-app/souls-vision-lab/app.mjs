import {
  normalizeDetection, newTracker, lockTarget, updateTracker,
  matchTarget, coverRect, hitRect, intersectionOverUnion
} from "./tracking.mjs";

// The experimental page is independent from /souls, Gemini Live and Souls memory.
const $ = id => document.getElementById(id);
const video=$("camera"), stage=$("stage"), canvas=$("overlay");
const ctx=canvas.getContext("2d");
const start=$("start"), unlock=$("unlock"), exportBtn=$("export");
const status=$("status"), empty=$("empty");
const fpsEl=$("fps"),latencyEl=$("latency"),presenceEl=$("presence"),lossEl=$("loss");
const modeTag=$("modeTag");
const MODEL = "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite";
const LIB = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/vision_bundle.mjs";
const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm";
const MIN_FRAME_GAP=220;

let detector=null,stream=null,active=false,busy=false,raf=0;
let tracker=newTracker(),detections=[],lastVideoTime=-1,lastInfer=0,lastDraw=0,firstAt=0;
let lastLatency=0,latestFps=0,resultsAt=[],csvRows=[],frames=0,errors=0,lastStatus="";
const format=(v,n=1)=>Number(v).toFixed(n);
function setStatus(message){
  if(message===lastStatus)return;
  lastStatus=message;status.textContent=message;
}
function overlaySize(){
  const rect=stage.getBoundingClientRect(),w=rect.width,h=rect.height;
  const pixelRatio=Math.min(2,window.devicePixelRatio||1);
  const bw=Math.max(1,Math.round(w*pixelRatio)),bh=Math.max(1,Math.round(h*pixelRatio));
  if(canvas.width!==bw||canvas.height!==bh){canvas.width=bw;canvas.height=bh;}
  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
  return {width:w,height:h};
}
function roundedLabel(x,y,label,color,width){
  ctx.font="700 12px system-ui";
  const textW=Math.max(80,Math.min(width-12,ctx.measureText(label).width+17));
  const px=Math.max(5,Math.min(width-textW-5,x)),py=Math.max(26,y-9);
  ctx.fillStyle="rgba(13,19,31,.85)";
  ctx.beginPath();ctx.roundRect(px,py-24,textW,25,7);ctx.fill();
  ctx.fillStyle=color;ctx.fillText(label,px+8,py-7);
}
function drawEyes(rect){
  const cx=rect.x+rect.width*.50, cy=rect.y+rect.height*.40;
  const rx=Math.max(3,Math.min(rect.width*.09,rect.height*.10,22));
  const ry=Math.max(4,Math.min(rect.height*.15,rect.width*.14,30));
  for(const off of [-.18,.18]){
    const x=cx+rect.width*off;
    ctx.fillStyle="#fff";ctx.beginPath();ctx.ellipse(x,cy,rx*1.24,ry*1.23,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#292033";ctx.beginPath();ctx.ellipse(x,cy,rx,ry,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#fff";ctx.beginPath();ctx.ellipse(x-rx*.22,cy-ry*.35,Math.max(1.8,rx*.28),Math.max(2.4,ry*.24),0,0,Math.PI*2);ctx.fill();
  }
  ctx.strokeStyle="#fff";ctx.lineWidth=Math.max(2,rx*.5);ctx.lineCap="round";
  ctx.beginPath();ctx.arc(cx,cy+ry*1.16,Math.min(12,rect.width*.055),.15,Math.PI-.15);ctx.stroke();
}
function displayState(){
  if(!active)return "未開始";
  if(!tracker.target)return "可點框鎖定";
  return ({tracking:"追蹤中",occluded:"暫時未找到",lost:"疑似離開",searching:"待選擇"})[tracker.state]||"—";
}
function draw(){
  if(!ctx)return;
  const surface=overlaySize();
  ctx.clearRect(0,0,surface.width,surface.height);
  if(!video.videoWidth)return;
  const vw=video.videoWidth,vh=video.videoHeight;
  const selected=tracker.target&&tracker.state==="tracking"?
    matchTarget(tracker.target,detections,vw,vh):null;
  for(const det of detections){
    const rect=coverRect(det.box,vw,vh,surface.width,surface.height);
    const isTarget=selected===det ||
      (selected&&selected.label===det.label&&intersectionOverUnion(selected.box,det.box)>.95);
    const color=isTarget?"#ff9a00":"#70d3ef";
    ctx.strokeStyle=color;ctx.lineWidth=isTarget?3.5:2.2;
    ctx.beginPath();ctx.roundRect(rect.x,rect.y,rect.width,rect.height,14);ctx.stroke();
    roundedLabel(rect.x,rect.y,det.label+" "+Math.round(det.score*100)+"%"+(isTarget?" · SELECTED":""),color,surface.width);
    if(isTarget)drawEyes(rect);
  }
  if(tracker.target&&tracker.state!=="tracking"){
    const rect=coverRect(tracker.target.box,vw,vh,surface.width,surface.height);
    ctx.setLineDash([7,7]);ctx.strokeStyle="#d3a46d";
    ctx.lineWidth=2;ctx.strokeRect(rect.x,rect.y,rect.width,rect.height);ctx.setLineDash([]);
  }
}
function updateMetrics(){
  fpsEl.textContent=latestFps?format(latestFps,1):"—";
  latencyEl.textContent=lastLatency?format(lastLatency,0)+" ms":"—";
  presenceEl.textContent=displayState();
  lossEl.textContent=String(tracker.lossCount);
  unlock.disabled=!tracker.target;
}
function messageForState(){
  if(!tracker.target){
    if(!detections.length)return "沒有偵測到支援的物品：請增加光線、靠近杯子或玩偶。";
    return "找到 "+detections.length+" 個物品。點一下藍框，鎖定要測試的物品。";
  }
  if(tracker.state==="tracking")return "橘框與眼睛正在跟隨 "+tracker.target.label+"。慢慢移動物品測試。";
  if(tracker.state==="occluded")return "物品暫時未找到，保留最後位置（不會自動換成其他物品）。";
  return "目標疑似離開／偵測中斷。請按「解除鎖定」後重新選擇。";
}
function logResult(timestamp,detected){
  if(csvRows.length>=4000)return;
  const b=tracker.target?.box;
  const fields=[Math.round(timestamp-firstAt),format(lastLatency,0),format(latestFps,1),
    tracker.state,tracker.target?.label||"",detected?.length||0,
    b?format(b.x,0):"",b?format(b.y,0):"",
    b?format(b.width,0):"",b?format(b.height,0):"",
    tracker.missed,tracker.lossCount];
  csvRows.push(fields.join(","));
  exportBtn.disabled=false;
}
function processFrame(timestamp){
  if(!active||!detector||video.readyState<2||!video.videoWidth)return;
  if(video.currentTime===lastVideoTime||timestamp-lastInfer<MIN_FRAME_GAP)return;
  const now=performance.now();lastInfer=now;lastVideoTime=video.currentTime;
  try{
    const result=detector.detectForVideo(video,Math.round(now));
    lastLatency=performance.now()-now;
    detections=(result.detections||[]).map(d=>normalizeDetection(d,video.videoWidth,video.videoHeight))
      .filter(Boolean);
    tracker=updateTracker(tracker,detections,performance.now(),video.videoWidth,video.videoHeight);
    frames++;
    if(!firstAt)firstAt=performance.now();
    resultsAt.push(now);
    while(resultsAt.length&&now-resultsAt[0]>2000)resultsAt.shift();
    latestFps=resultsAt.length>1?(resultsAt.length-1)*1000/(now-resultsAt[0]):0;
    logResult(now,detections);
    draw();
    if(timestamp-lastDraw>300){
      lastDraw=timestamp;updateMetrics();setStatus(messageForState());
    }
  }catch(error){
    // An inference exception is not evidence that an object physically left the frame.
    errors++;
    if(errors>2){
      setStatus("偵測器出錯："+String(error?.message||error).slice(0,110)+"。請停止相機再重試。");
      stopCamera(false);
    }else console.warn("[Souls Web vision] model inference failed",error);
  }
}
function loop(timestamp){
  if(!active)return;
  if(!document.hidden)processFrame(timestamp);
  raf=requestAnimationFrame(loop);
}
function resetMeasurements(){
  tracker=newTracker();detections=[];lastVideoTime=-1;lastInfer=0;lastDraw=0;
  firstAt=0;lastLatency=0;latestFps=0;resultsAt=[];csvRows=[];frames=0;errors=0;
  draw();updateMetrics();exportBtn.disabled=true;
}
async function loadDetector(){
  if(detector)return detector;
  setStatus("正在下載 MediaPipe Web 模型（首次載入可能較久）…");
  const {FilesetResolver,ObjectDetector}=await import(LIB);
  const files=await FilesetResolver.forVisionTasks(WASM);
  const options={baseOptions:{modelAssetPath:MODEL,delegate:"CPU"},
    scoreThreshold:.35,maxResults:6,runningMode:"VIDEO"};
  detector=await ObjectDetector.createFromOptions(files,options);
  return detector;
}
async function startCamera(){
  if(active||busy)return;
  if(!ctx){setStatus("這個瀏覽器不支援 Canvas 2D。");return}
  if(!navigator.mediaDevices?.getUserMedia){
    setStatus("無法使用相機：請在 HTTPS 的 Chrome 開啟本頁。");return;
  }
  busy=true;start.disabled=true;start.textContent="正在啟動…";
  try{
    stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{
      facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}}});
    video.srcObject=stream;
    await video.play();
    empty.hidden=true;
    await loadDetector();
    resetMeasurements();active=true;
    start.textContent="停止相機";modeTag.textContent="WEB · CAMERA ACTIVE";
    setStatus("偵測器已準備。請對準物品並點擊偵測框。");
    raf=requestAnimationFrame(loop);
  }catch(error){
    console.warn("[Souls Web vision] start failed",error);
    const name=error?.name;
    let explanation="相機或模型載入失敗，請確認網路與瀏覽器支援後重試。";
    if(name==="NotAllowedError")explanation="相機權限被拒絕。請在瀏覽器網站設定中允許相機。";
    if(name==="NotFoundError")explanation="沒有找到可使用的相機。";
    setStatus(explanation+"（"+String(error?.message||name||"unknown").slice(0,80)+"）");
    stopCamera(false);
  }finally{busy=false;start.disabled=false}
}
function stopCamera(showMessage=true){
  active=false;
  if(raf)cancelAnimationFrame(raf);raf=0;
  stream?.getTracks().forEach(track=>track.stop());stream=null;
  video.pause();video.srcObject=null;
  empty.hidden=false;
  detections=[];tracker=newTracker();
  draw();updateMetrics();
  start.textContent="開啟相機";modeTag.textContent="WEB · ON DEVICE";
  if(showMessage)setStatus("相機已關閉；辨識影像沒有儲存或上傳。");
}
function tapCamera(event){
  if(!active||!detections.length||!video.videoWidth)return;
  const surface=stage.getBoundingClientRect();
  const x=event.clientX-surface.left,y=event.clientY-surface.top;
  const hits=detections.filter(d=>hitRect(coverRect(d.box,video.videoWidth,video.videoHeight,
    surface.width,surface.height),x,y)).sort((a,b)=>a.box.width*a.box.height-b.box.width*b.box.height);
  if(!hits.length){setStatus("請點選藍色偵測框內的物品。");return}
  tracker=lockTarget(tracker,hits[0],performance.now());
  draw();updateMetrics();setStatus("已鎖定 "+hits[0].label+"（幀間位置推測，並非永久身分 ID）。");
}
function exportCsv(){
  if(!csvRows.length)return;
  const header="elapsed_ms,inference_ms,result_fps,state,label,detected_count,x,y,width,height,missed_results,loss_events";
  const csv=[header,...csvRows].join("\r\n")+"\r\n";
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");link.href=url;link.download="crew-souls-web-vision.csv";
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
start.addEventListener("click",()=>{if(active)stopCamera();else void startCamera()});
unlock.addEventListener("click",()=>{
  tracker=newTracker();draw();updateMetrics();
  setStatus("已解除鎖定，請點另一個藍色物品框。");
});
canvas.addEventListener("click",tapCamera);
exportBtn.addEventListener("click",exportCsv);
new ResizeObserver(()=>draw()).observe(stage);
document.addEventListener("visibilitychange",()=>{if(document.hidden&&active)stopCamera(true)});
window.addEventListener("pagehide",()=>{if(active)stopCamera(false)});
