import {useEffect,useRef,useState,type MouseEvent,type ReactNode} from "react";
import {initTracker,toGrayFrame,trackFrame,type Template} from "./soulTracker";
export type SoulVisual={state:string;caption:string;mood:"calm"|"happy"|"surprised"|"thinking"};
type ActiveSoul={id:string;name:string};
const neutral: SoulVisual={state:"idle",caption:"",mood:"calm"};
/** Hidden camera-first AR-Lite: continuous local video + 2D tracked eyes.
 * No camera stream or frame is uploaded by the scanner. Video never unmounts on wake. */
export function SoulCamera({onProbe,onWake,onSnapshot,onClose,onReset,activeSoul,visual=neutral,children,en}:{
 onProbe:(frame:File)=>Promise<{id:string;name:string}|null>;
 onWake:(id:string,frame:File)=>void;
 onSnapshot:(frame:File)=>void;
 onClose:()=>void;onReset?:()=>void;activeSoul?:ActiveSoul|null;visual?:SoulVisual;children?:ReactNode;en:boolean;
}){
 const video=useRef<HTMLVideoElement|null>(null),viewport=useRef<HTMLDivElement|null>(null);
 const stream=useRef<MediaStream|null>(null);
 const callbacks=useRef({onProbe,onWake,onSnapshot});callbacks.current={onProbe,onWake,onSnapshot};
 const activeRef=useRef(activeSoul?.id||"");activeRef.current=activeSoul?.id||"";
 const checking=useRef(false),locked=useRef(false),stable=useRef({id:"",hits:0});
 const tracker=useRef<Template|null>(null),misses=useRef(0);
 const [ready,setReady]=useState(false),[error,setError]=useState(""),[hint,setHint]=useState("");
 const [point,setPoint]=useState({x:.5,y:.43}),[tracking,setTracking]=useState<"align"|"following"|"lost">("align");
 const canvas=useRef<HTMLCanvasElement|null>(null);
 const trackCanvas=()=>{
  const v=video.current,host=viewport.current;
  if(!v||!host||v.readyState<2||!v.videoWidth)return null;
  if(!canvas.current){canvas.current=document.createElement("canvas");canvas.current.width=160}
  const c=canvas.current;
  c.height=Math.max(100,Math.min(256,Math.round(160*host.clientHeight/Math.max(1,host.clientWidth))));
  const ctx=c.getContext("2d",{willReadFrequently:true});if(!ctx)return null;
  const sourceRatio=v.videoWidth/v.videoHeight,targetRatio=c.width/c.height;
  if(sourceRatio>targetRatio){
   const sourceWidth=v.videoHeight*targetRatio;
   ctx.drawImage(v,(v.videoWidth-sourceWidth)/2,0,sourceWidth,v.videoHeight,0,0,c.width,c.height);
  }else{
   const sourceHeight=v.videoWidth/targetRatio;
   ctx.drawImage(v,0,(v.videoHeight-sourceHeight)/2,v.videoWidth,sourceHeight,0,0,c.width,c.height);
  }
  return toGrayFrame(ctx.getImageData(0,0,c.width,c.height).data,c.width,c.height);
 };
 async function capture(){
  const v=video.current;if(!v||v.readyState<2||!v.videoWidth)throw Error("Camera not ready");
  const c=document.createElement("canvas");c.width=c.height=640;const ctx=c.getContext("2d");
  if(!ctx)throw Error("Canvas not supported");
  const side=Math.min(v.videoWidth,v.videoHeight);
  ctx.drawImage(v,(v.videoWidth-side)/2,(v.videoHeight-side)/2,side,side,0,0,640,640);
  const blob=await new Promise<Blob>((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error("Frame capture failed")),"image/jpeg",.82));
  return new File([blob],"souls-camera.jpg",{type:"image/jpeg"});
 }
 // Camera is mounted once and kept running while its Soul is speaking.
 useEffect(()=>{
  let alive=true,timer=0;
  void (async()=>{
   try{
    if(!navigator.mediaDevices?.getUserMedia)throw Error("Camera unavailable");
    const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}},audio:false});
    if(!alive){media.getTracks().forEach(t=>t.stop());return}
    stream.current=media;
    if(!video.current){media.getTracks().forEach(t=>t.stop());return}
    video.current.srcObject=media;await video.current.play();if(!alive)return;
    setReady(true);
    timer=window.setInterval(()=>{
     if(checking.current||locked.current||activeRef.current||!alive)return;
     checking.current=true;
     void capture().then(async file=>{
      const match=await callbacks.current.onProbe(file);
      if(!alive||locked.current||activeRef.current)return;
      if(!match){stable.current={id:"",hits:0};setHint("");return}
      if(stable.current.id===match.id)stable.current.hits++;
      else stable.current={id:match.id,hits:1};
      if(stable.current.hits>=3){locked.current=true;callbacks.current.onWake(match.id,file)}
      else setHint(en?"Almost recognized, keep still…":"快認出來了，保持鏡頭穩定…");
     }).catch(()=>{stable.current={id:"",hits:0}}).finally(()=>{checking.current=false});
    },1350);
   }catch{if(alive)setError(en?"Camera unavailable. Choose a photo instead.":"無法開啟相機，請檢查權限或改用相簿。")}
  })();
  return()=>{alive=false;window.clearInterval(timer);stream.current?.getTracks().forEach(t=>t.stop());stream.current=null};
 },[]);
 // A newly selected Soul starts centered on the aiming reticle. Tap the actual
 // object to replace the center anchor; low-texture frames fail closed.
 useEffect(()=>{
  const id=activeSoul?.id||"";
  tracker.current=null;misses.current=0;setPoint({x:.5,y:.43});setTracking("align");
  if(!id){locked.current=false;stable.current={id:"",hits:0};setHint("");return}
  locked.current=true;
  const frame=trackCanvas();
  if(frame){
   const fresh=initTracker(frame,{x:.5,y:.43});
   if(fresh){tracker.current=fresh;setTracking("following")}
  }
 },[activeSoul?.id,ready]);
 // Bounded, ~5 Hz CPU tracking: a feature point, not a fake full-object box.
 useEffect(()=>{
  if(!activeSoul?.id||!ready)return;
  const interval=window.setInterval(()=>{
   if(document.hidden||!tracker.current)return;
   const frame=trackCanvas();
   if(!frame)return;
   const next=trackFrame(frame,tracker.current);
   if(!next){
    misses.current++;
    if(misses.current>=3){tracker.current=null;setTracking("lost")}
    return;
   }
   misses.current=0;tracker.current=next.template;setPoint(previous=>({
    x:.45*previous.x+.55*next.point.x,y:.45*previous.y+.55*next.point.y
   }));setTracking("following");
  },190);
  return()=>window.clearInterval(interval);
 },[activeSoul?.id,ready]);
 function aim(event:MouseEvent<HTMLButtonElement>){
  const bounds=event.currentTarget.getBoundingClientRect();
  const at={x:(event.clientX-bounds.left)/bounds.width,y:(event.clientY-bounds.top)/bounds.height};
  const frame=trackCanvas();if(!frame)return;
  const candidate=initTracker(frame,at);
  tracker.current=candidate;misses.current=0;setPoint(at);setTracking(candidate?"following":"align");
 }
 async function snap(){
  if(locked.current||!ready)return;locked.current=true;setError("");
  try{callbacks.current.onSnapshot(await capture())}
  catch{locked.current=false;setError(en?"Could not capture. Try again.":"拍攝失敗，請再試一次。")}
 }
 const speaking=visual.state==="speaking",thinking=["connecting","requesting-mic","ending","reporting"].includes(visual.state);
 const mood=thinking?"thinking":visual.mood;
 return <section className={"souls-camera"+(activeSoul?" souls-camera-awake":"")} aria-label={en?"Soul camera":"靈魂相機"}>
  <div className="souls-camera-viewport" ref={viewport}>
   <video ref={video} autoPlay muted playsInline aria-label={en?"Live camera preview":"即時相機預覽"}/>
   {!activeSoul?<div className="souls-camera-aim" aria-hidden="true"/>:<>
    <button type="button" className="souls-ar-tap" onClick={aim} aria-label={en?"Tap the object to place its eyes":"點選物品，定位眼睛"}/>
    <div className="souls-ar-face" style={{left:(point.x*100)+"%",top:(point.y*100)+"%"}} data-mood={mood} data-speaking={speaking?"true":"false"} data-tracking={tracking} aria-hidden="true">
     <svg viewBox="0 0 136 104" xmlns="http://www.w3.org/2000/svg">
      <g className="souls-ar-face-glow"><ellipse cx="68" cy="49" rx="63" ry="47" fill="rgba(255,255,255,.28)"/></g>
      <g className="souls-ar-eyes">
       {mood==="happy"?<>
        <path d="M23 51 Q39 23 55 51 M81 51 Q97 23 113 51" stroke="#171527" strokeWidth="10" strokeLinecap="round" fill="none"/>
       </>:<>
        <rect x="26" y={mood==="surprised"?21:29} width="26" height={mood==="surprised"?45:38} rx="13" fill="#171527"/>
        <rect x="84" y={mood==="surprised"?21:29} width="26" height={mood==="surprised"?45:38} rx="13" fill="#171527"/>
        <g className="souls-ar-sparkles" fill="white"><ellipse cx={mood==="thinking"?43:37} cy="39" rx="4" ry="6"/><ellipse cx={mood==="thinking"?101:95} cy="39" rx="4" ry="6"/></g>
       </>}
      </g>
      <g className="souls-ar-mouth">
       {mood==="surprised"||speaking?<ellipse className="souls-mouth-open" cx="68" cy="82" rx="10" ry="10" fill="#171527"/>:
        mood==="happy"?<path d="M56 78 Q68 92 80 78" stroke="#171527" strokeWidth="5" strokeLinecap="round" fill="none"/>:
        <path d="M60 82 Q68 86 76 82" stroke="#171527" strokeWidth="4" strokeLinecap="round" fill="none"/>}
      </g>
      {mood==="thinking"&&<circle cx="118" cy="14" r="7" fill="white" opacity=".85"/>}
      {mood==="surprised"&&<path d="M19 14 L10 4 M117 14 L126 4" stroke="#fff" strokeWidth="5" strokeLinecap="round"/>}
     </svg>
     <span className="souls-ar-name">{activeSoul.name}</span>
    </div>
    {visual.caption&&<div className="souls-ar-caption" aria-live="polite">{visual.caption.slice(-130)}</div>}
   </>}
  </div>
  <p className="souls-camera-status" role="status">{error||(!ready?(en?"Opening camera…":"正在開啟相機…"):activeSoul?
   tracking==="lost"?(en?"Lost the object. Tap it to re-anchor the eyes.":"追蹤到的特徵不見了，點物品重新定位眼睛。"):
   tracking==="align"?(en?"Tap the object to position its eyes.":"點一下物品，把眼睛放到正確位置。"):
   (en?"Your Soul is awake! Tap to adjust its eyes.":"它醒來了！點物品可以調整眼睛位置。"):
   (hint||(en?"Point at a saved Soul to wake it.":"對準已收藏物品，它就會在鏡頭裡醒來。")))}</p>
  {activeSoul?<div className="souls-camera-actions">
   <button type="button" onClick={onReset}>{en?"↻ Scan another":"↻ 換個物品"}</button><button type="button" onClick={onClose}>{en?"Close camera":"關閉相機"}</button>
  </div>:<div className="souls-actions">
   <button className="souls-primary" disabled={!ready||locked.current} onClick={()=>void snap()}>{en?"◎ Snapshot / confirm":"◎ 拍攝／確認"}</button>
   <button onClick={onClose}>{en?"Close camera":"關閉相機"}</button>
  </div>}
  {children}
 </section>;
}
