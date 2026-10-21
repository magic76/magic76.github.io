import{useCallback,useEffect,useRef,useState}from"react";
import{LiveControls}from"../live/LiveControls";
import type{ReturnTypeOfLive}from"../live/types";
const FRAME_INTERVAL_MS=3500;
function capture(video:HTMLVideoElement){
 if(!video.videoWidth||!video.videoHeight)return null;
 const scale=Math.min(1,960/Math.max(video.videoWidth,video.videoHeight));
 const canvas=document.createElement("canvas");
 canvas.width=Math.max(1,Math.round(video.videoWidth*scale));
 canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
 const ctx=canvas.getContext("2d");if(!ctx)return null;
 ctx.drawImage(video,0,0,canvas.width,canvas.height);
 const preview=canvas.toDataURL("image/jpeg",.66);
 return{data:preview.split(",")[1],mimeType:"image/jpeg",preview,width:canvas.width,height:canvas.height};
}
export function MaterialLiveCamera({live,withConversation=false}:{live:ReturnTypeOfLive;withConversation?:boolean}){
 const videoRef=useRef<HTMLVideoElement>(null),streamRef=useRef<MediaStream|null>(null);
 const [active,setActive]=useState(false),[paused,setPaused]=useState(false),[locked,setLocked]=useState(false),[requesting,setRequesting]=useState(false);
 const [still,setStill]=useState(""),[expanded,setExpanded]=useState(false),[error,setError]=useState("");
 const stopCamera=useCallback(()=>{
  streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;
  if(videoRef.current)videoRef.current.srcObject=null;
  setActive(false);setLocked(false);setPaused(false);setStill("");setExpanded(false);
 },[]);
 useEffect(()=>{
  const hide=()=>{if(document.hidden)stopCamera()};
  document.addEventListener("visibilitychange",hide);
  return()=>{document.removeEventListener("visibilitychange",hide);stopCamera()};
 },[stopCamera]);
 const openCamera=useCallback(async()=>{
  if(!window.isSecureContext){setError("相機需要 HTTPS 或 localhost，請在安全的網站開啟。");return}
  if(!navigator.mediaDevices?.getUserMedia){setError("目前瀏覽器不支援即時相機。");return}
  setRequesting(true);setError("");
  try{
   const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280}},audio:false});
   if(document.hidden){stream.getTracks().forEach(t=>t.stop());return}
   streamRef.current=stream;
   if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play()}
   setError("");setActive(true);setPaused(false);setLocked(false);
  }catch(e){
   streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;
   const reason=e instanceof Error?e.name:"";
   setError(reason==="NotAllowedError"||reason==="PermissionDeniedError"
    ?"相機權限遭到拒絕。請在手機的 App 權限或瀏覽器網站設定允許相機，再重新開啟。"
    :reason==="NotFoundError"?"找不到可用的相機裝置。"
    :reason==="NotReadableError"?"相機正被其他應用程式使用，請關閉後重試。"
    :"相機無法開啟，請檢查裝置權限後重試。");
  }finally{setRequesting(false)}
 },[]);
 // A video frame is observational data only: never inject a new chat turn or restart tutor speech.
 useEffect(()=>{
  if(!active||paused||locked||!(live.state==="listening"||live.state==="speaking"))return;
  const send=()=>{if(document.hidden||!streamRef.current||!videoRef.current)return;
   const frame=capture(videoRef.current);if(frame)live.sendVideoFrame(frame)};
  const timer=window.setInterval(send,FRAME_INTERVAL_MS);
  return()=>window.clearInterval(timer);
 },[active,paused,locked,live.state,live.sendVideoFrame]);
 const snap=()=>{
  if(!videoRef.current)return;
  const frame=capture(videoRef.current);if(!frame){setError("影像尚未準備完成");return}
  const ok=live.sendPreparedImage(frame,"請依這張最新教材照片，引導我理解與練習。不要重新打招呼。");
  if(!ok){setError("請先開始語音對話，再使用「看這頁」。");return}
  setError("");setStill(frame.preview);setLocked(true);setPaused(false);
 };
 return <section className={"section panel material-live-camera "+(expanded?"expanded":"")}>
 <div className="section-head"><div><h2>即時相機陪讀</h2><p className="meta">讓老師邊看教材邊陪你練習；相機需手動開啟。</p></div><small>{active?(locked?"已鎖定本頁":paused?"影像已暫停":"相機已開啟"):"未啟用"}</small></div>
 <div className="material-camera-layout">
 <div className="material-camera-visual">
  <div className={"material-camera-frame "+(active?"is-active":"is-idle")} onClick={()=>{if(active)setExpanded(v=>!v)}}>
   <video ref={videoRef} muted playsInline autoPlay aria-label="即時教材相機預覽"/>
   {locked&&still&&<img src={still} alt="已鎖定的教材畫面"/>}
   {!active&&<div className="material-camera-placeholder">
    <span className="material-camera-orbit" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><rect x="9" y="20" width="46" height="34" rx="10" stroke="currentColor" strokeWidth="2.5"/><path d="M22 20l4-7h12l4 7" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><circle cx="32" cy="36.5" r="10" stroke="currentColor" strokeWidth="2.5"/><circle cx="32" cy="36.5" r="4" fill="currentColor" opacity=".32"/></svg></span>
    <strong>讓教材成為你的課堂</strong><span className="material-camera-placeholder-copy">開啟鏡頭，讓老師陪你一起看、一起練習</span>
    <button type="button" className="material-camera-activate" onClick={()=>void openCamera()} disabled={requesting}>{requesting?"正在啟動相機…":"開啟相機"} <span aria-hidden="true">↗</span></button>
    <small>只有你主動開啟後才會使用相機</small>
   </div>}
  </div>
  <div className="actions material-camera-actions">
  {!active?null:<>
   <button className="btn secondary small" onClick={snap} disabled={live.state!=="listening"&&live.state!=="speaking"}>看這頁</button>
   <button className="btn secondary small" onClick={()=>{
    if(locked){setLocked(false);setStill("");setError("");return}
    snap();
   }} disabled={!locked&&live.state!=="listening"&&live.state!=="speaking"}>{locked?"解除鎖定":"鎖定本頁"}</button>
   <button className="btn secondary small" onClick={()=>setPaused(v=>!v)}>{paused?"繼續同步":"暫停同步"}</button>
   <button className="btn secondary small" onClick={stopCamera}>關閉相機</button>
   <button className="btn secondary small" onClick={()=>setExpanded(v=>!v)}>{expanded?"還原":"放大"}</button>
  </>}</div>
  {error&&<p className="vision-error" role="alert">{error}</p>}
 </div>
 {withConversation&&<div className="material-camera-conversation"><h3>和老師一起看</h3>
  <LiveControls live={live}/>
  <div className="live-transcript" role="log" aria-label="課堂逐字紀錄" tabIndex={0}><div className="live-line user show"><small>你</small><span>{live.input||"語音開始後，可以直接問老師眼前的教材。"}</span></div><div className="live-line show"><small>老師</small><span>{live.output||"老師的回答會顯示在這裡。"}</span></div>{live.turns.slice(-8).map((turn,i)=><div className="material-camera-turn" key={i}><small>你</small><p>{turn.input}</p><small>老師</small><p>{turn.output}</p></div>)}</div>
 </div>}
 </div></section>;
}
