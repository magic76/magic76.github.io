import {Arrow} from "../components/Arrow";
import{useCallback,useEffect,useRef,useState}from"react";
import{useTranslation}from"react-i18next";
import{useNavigate}from"react-router-dom";
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
 const{t}=useTranslation(["lesson","teacher"]);
 const navigate=useNavigate();
 const videoRef=useRef<HTMLVideoElement>(null),streamRef=useRef<MediaStream|null>(null);
 const [active,setActive]=useState(false),[paused,setPaused]=useState(false),[locked,setLocked]=useState(false),[requesting,setRequesting]=useState(false);
 const [still,setStill]=useState(""),[expanded,setExpanded]=useState(false),[error,setError]=useState("");
 useEffect(()=>{
  if(!expanded)return;
  const onKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape")setExpanded(false)};
  window.addEventListener("keydown",onKeyDown);
  return()=>window.removeEventListener("keydown",onKeyDown);
 },[expanded]);
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
  if(!window.isSecureContext){setError(t("textbook.camera.errSecure"));return}
  if(!navigator.mediaDevices?.getUserMedia){setError(t("textbook.camera.errUnsupported"));return}
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
    ?t("textbook.camera.errDenied")
    :reason==="NotFoundError"?t("textbook.camera.errNotFound")
    :reason==="NotReadableError"?t("textbook.camera.errBusy")
    :t("textbook.camera.errGeneric"));
  }finally{setRequesting(false)}
 },[t]);
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
  const frame=capture(videoRef.current);if(!frame){setError(t("textbook.camera.errFrame"));return}
  const ok=live.sendPreparedImage(frame,"請依這張最新教材照片，引導我理解與練習。不要重新打招呼。");
  if(!ok){setError(t("textbook.camera.errStartVoice"));return}
  setError("");setStill(frame.preview);setLocked(true);setPaused(false);
 };
 return <section className={"section panel material-live-camera "+(expanded?"expanded":"")}>
 <div className="section-head"><div><h2>{t("textbook.modeCamera")}</h2><p className="meta">{t("textbook.camera.intro")}</p></div><small>{active?(locked?t("textbook.camera.locked"):paused?t("textbook.camera.paused"):t("textbook.camera.on")):t("textbook.camera.off")}</small></div>
 <div className="material-camera-layout">
 <div className="material-camera-visual">
  <div className={"material-camera-frame "+(active?"is-active":"is-idle")} role={active?"button":undefined} tabIndex={active?0:undefined} aria-label={active?(expanded?t("textbook.camera.restoreView"):t("textbook.camera.enlargeView")):undefined} onClick={()=>{if(active)setExpanded(v=>!v)}} onKeyDown={e=>{if(active&&(e.key==="Enter"||e.key===" ")){e.preventDefault();setExpanded(v=>!v)}}}>
   <video ref={videoRef} muted playsInline autoPlay aria-label={t("textbook.camera.previewAria")}/>
   {locked&&still&&<img src={still} alt={t("textbook.camera.lockedAlt")}/>}
   {!active&&<div className="material-camera-placeholder">
    <span className="material-camera-orbit" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><rect x="9" y="20" width="46" height="34" rx="10" stroke="currentColor" strokeWidth="2.5"/><path d="M22 20l4-7h12l4 7" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><circle cx="32" cy="36.5" r="10" stroke="currentColor" strokeWidth="2.5"/><circle cx="32" cy="36.5" r="4" fill="currentColor" opacity=".32"/></svg></span>
    <strong>{t("textbook.camera.placeholderTitle")}</strong><span className="material-camera-placeholder-copy">{t("textbook.camera.placeholderCopy")}</span>
    <button type="button" className="material-camera-activate" onClick={()=>void openCamera()} disabled={requesting}>{requesting?t("textbook.camera.starting"):t("textbook.camera.open")} <Arrow direction="up-right"/></button>
    <small>{t("textbook.camera.consent")}</small>
   </div>}
  </div>
  <div className="actions material-camera-actions">
  {!active?null:<>
   <button className="btn secondary small" onClick={snap} disabled={live.state!=="listening"&&live.state!=="speaking"}>{t("textbook.camera.lookPage")}</button>
   <button className="btn secondary small" onClick={()=>{
    if(locked){setLocked(false);setStill("");setError("");return}
    snap();
   }} disabled={!locked&&live.state!=="listening"&&live.state!=="speaking"}>{locked?t("textbook.camera.unlock"):t("textbook.camera.lock")}</button>
   <button className="btn secondary small" onClick={()=>setPaused(v=>!v)}>{paused?t("textbook.camera.resumeSync"):t("textbook.camera.pauseSync")}</button>
   <button className="btn secondary small" onClick={stopCamera}>{t("textbook.camera.close")}</button>
   <button type="button" className="btn secondary small" aria-pressed={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?t("textbook.camera.restore"):t("textbook.camera.enlarge")}</button>
  </>}</div>
  {error&&<p className="vision-error" role="alert">{error}</p>}
 </div>
 {withConversation&&<div className="material-camera-conversation"><h3>{t("textbook.camera.lookTogether")}</h3>
  <LiveControls live={live} interruptLabel={t("live.interruptTeacher")} onEnd={async()=>{await live.stop(true);stopCamera();navigate("/learn")}}/>
  <div className="live-transcript" role="log" aria-label={t("textbook.camera.transcriptAria")} tabIndex={0}><div className="live-line user show"><small>{t("textbook.you")}</small><span>{live.input||t("textbook.camera.inputPlaceholder")}</span></div><div className="live-line show"><small>{t("textbook.camera.teacher")}</small><span>{live.output||t("textbook.camera.outputPlaceholder")}</span></div>{live.turns.slice(-8).map((turn,i)=><div className="material-camera-turn" key={i}><small>{t("textbook.you")}</small><p>{turn.input}</p><small>{t("textbook.camera.teacher")}</small><p>{turn.output}</p></div>)}</div>
 </div>}
 </div></section>;
}
