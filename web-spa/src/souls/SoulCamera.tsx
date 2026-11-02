import {useEffect,useRef,useState,type MouseEvent,type ReactNode} from "react";
import {initMultiTracker,initRegionTracker,toGrayFrame,trackMultiFrame,type MultiTracker,type Region} from "./soulTracker";
import {locateSoulRegion} from "./soulRegion";
export type SoulVisual={state:string;caption:string;mood:"calm"|"happy"|"surprised"|"thinking";level?:number;hearing?:boolean};
type ActiveSoul={id:string;name:string};
const neutral: SoulVisual={state:"idle",caption:"",mood:"calm"};
/** Hidden camera-first AR-Lite: continuous local video + 2D tracked eyes.
 * No camera stream or frame is uploaded by the scanner. Video never unmounts on wake. */
export function SoulCamera({onProbe,onWake,onSnapshot,onAddReferences,onRegionCrop,onClose,onReset,activeSoul,visual=neutral,children,paused=false,en}:{
 onProbe:(frame:File)=>Promise<{id:string;name:string}|null>;
 onWake:(id:string,frame:File)=>void;
 onSnapshot:(frames:File[])=>void|Promise<void>;
 onAddReferences?:(frames:File[])=>void|Promise<void>;
 onRegionCrop?:(photo:File)=>void|Promise<void>;
 onClose:()=>void;onReset?:()=>void;activeSoul?:ActiveSoul|null;visual?:SoulVisual;children?:ReactNode;paused?:boolean;en:boolean;
}){
 const video=useRef<HTMLVideoElement|null>(null),viewport=useRef<HTMLDivElement|null>(null);
 const stream=useRef<MediaStream|null>(null);
 const callbacks=useRef({onProbe,onWake,onSnapshot,onAddReferences,onRegionCrop});callbacks.current={onProbe,onWake,onSnapshot,onAddReferences,onRegionCrop};
 const activeRef=useRef(activeSoul?.id||"");activeRef.current=activeSoul?.id||"";
 const pausedRef=useRef(paused);pausedRef.current=paused;
 const checking=useRef(false),locked=useRef(false),stable=useRef({id:"",hits:0});
 const shooting=useRef(false),locating=useRef(false),tracker=useRef<MultiTracker|null>(null),misses=useRef(0);
 const trackedFrames=useRef(0),captureEpoch=useRef(0);
 const [ready,setReady]=useState(false),[error,setError]=useState(""),[hint,setHint]=useState("");
 const [burstProgress,setBurstProgress]=useState(0);
 const [point,setPoint]=useState({x:.5,y:.43}),[tracking,setTracking]=useState<"align"|"following"|"lost">("align");
 const [box,setBox]=useState<Region|null>(null),[locatingRegion,setLocatingRegion]=useState(false);
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
     if(checking.current||locked.current||pausedRef.current||activeRef.current||!alive)return;
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
  captureEpoch.current++;tracker.current=null;misses.current=0;trackedFrames.current=0;setBox(null);setPoint({x:.5,y:.43});setTracking("align");
  if(!id){locked.current=paused;stable.current={id:"",hits:0};setHint("");return}
  locked.current=true;
  const frame=trackCanvas();
  if(frame){
   const fresh=initMultiTracker(frame,{x:.5,y:.43});
   if(fresh){tracker.current=fresh;setTracking("following")}
  }
 },[activeSoul?.id,ready,paused]);
 // Bounded, ~5 Hz CPU tracking: a feature point, not a fake full-object box.
 useEffect(()=>{
  if(!activeSoul?.id||!ready)return;
  const interval=window.setInterval(()=>{
   if(document.hidden||!tracker.current)return;
   const frame=trackCanvas();
   if(!frame)return;
   const next=trackMultiFrame(frame,tracker.current);
   if(!next){
    misses.current++;
    if(misses.current>=3){tracker.current=null;setBox(null);setTracking("lost")}
    return;
   }
   misses.current=0;tracker.current=next;setBox(next.box||null);setPoint(previous=>({
    x:.45*previous.x+.55*next.point.x,y:.45*previous.y+.55*next.point.y
   }));setTracking("following");
   // Refresh descriptors within verified object bounds; never auto-reacquire
   // after an actual lost-track event.
   trackedFrames.current++;
   if(next.box&&trackedFrames.current%18===0){
    const refreshed=initRegionTracker(frame,next.box,next.point);
    if(refreshed&&refreshed.anchors.length>=Math.max(3,next.anchors.length*.65))tracker.current=refreshed;
   }
  },250);
  return()=>window.clearInterval(interval);
 },[activeSoul?.id,ready]);
 function captureVisible():string{
  const v=video.current,host=viewport.current;
  if(!v||!host||v.readyState<2)throw Error("Camera not ready");
  const canvas=document.createElement("canvas");canvas.width=480;
  canvas.height=Math.max(180,Math.round(480*host.clientHeight/Math.max(1,host.clientWidth)));
  const ctx=canvas.getContext("2d");if(!ctx)throw Error("Canvas unavailable");
  const ratio=canvas.width/canvas.height,source=v.videoWidth/v.videoHeight;
  if(source>ratio){
   const sw=v.videoHeight*ratio;
   ctx.drawImage(v,(v.videoWidth-sw)/2,0,sw,v.videoHeight,0,0,canvas.width,canvas.height);
  }else{
   const sh=v.videoWidth/ratio;
   ctx.drawImage(v,0,(v.videoHeight-sh)/2,v.videoWidth,sh,0,0,canvas.width,canvas.height);
  }
  return canvas.toDataURL("image/jpeg",.82);
 }
 function aim(event:MouseEvent<HTMLButtonElement>){
  if(locating.current||!activeRef.current)return;
  const bounds=event.currentTarget.getBoundingClientRect();
  const at={x:(event.clientX-bounds.left)/bounds.width,y:(event.clientY-bounds.top)/bounds.height};
  const frame=trackCanvas();if(!frame)return;
  const fallback=initMultiTracker(frame,at);
  tracker.current=fallback;misses.current=0;setBox(null);setPoint(at);setTracking(fallback?"following":"align");
  // Segmentation is optional and triggered only by a deliberate tap.
  const owner=activeRef.current,epoch=++captureEpoch.current;
  let picture="";
  try{picture=captureVisible()}catch{return}
  locating.current=true;setLocatingRegion(true);
  void locateSoulRegion(picture,at).then(async result=>{
   if(activeRef.current!==owner||captureEpoch.current!==epoch)return;
   const latest=trackCanvas(),tracked=tracker.current;
   if(!latest||!tracked){setError(en?"Object moved during segmentation; tap again.":"擷取輪廓時已失去追蹤，請再點一次。");return}
   const shiftX=tracked.point.x-at.x,shiftY=tracked.point.y-at.y;
   if(Math.abs(shiftX)>.22||Math.abs(shiftY)>.22){setError(en?"Object moved too far; tap again.":"物品移動太遠，請重新點選。");return}
   const shifted={...result.box,x:Math.max(0,Math.min(1-result.box.width,result.box.x+shiftX)),y:Math.max(0,Math.min(1-result.box.height,result.box.y+shiftY))};
   const shiftedFace={x:Math.max(0,Math.min(1,at.x+shiftX)),y:Math.max(0,Math.min(1,at.y+shiftY))};
   const regionTracker=initRegionTracker(latest,shifted,shiftedFace);
   if(!regionTracker){setError(en?"The object has insufficient texture. Tap its patterned area.":"物品紋理不足，請點有圖案的位置重新定位。");return}
   tracker.current=regionTracker;misses.current=0;setPoint(regionTracker.point);
   setBox(shifted);setTracking("following");setError("");
   if(callbacks.current.onRegionCrop){
    const bytes=await (await fetch(result.crop)).blob();
    if(activeRef.current===owner&&captureEpoch.current===epoch)await callbacks.current.onRegionCrop(new File([bytes],"soul-foreground.jpg",{type:"image/jpeg"}));
   }
  }).catch(()=>{if(activeRef.current===owner)setError(en?"Could not isolate the object; using feature-only tracking.":"物品輪廓辨識失敗，目前改用局部特徵追蹤。")})
   .finally(()=>{if(captureEpoch.current===epoch){locating.current=false;setLocatingRegion(false)}});
 }
 // Collect several real camera frames while the user gently changes the angle.
 // Photos remain local unless the user explicitly requests Gemini vision analysis.
 async function burst(mode:"enroll"|"reference"){
  if(shooting.current||!ready||(!activeRef.current&&locked.current))return;
  if(mode==="reference"&&!activeRef.current)return;
  shooting.current=true;locked.current=true;setError("");setBurstProgress(0);
  const frames:File[]=[];
  try{
   for(let i=0;i<4;i++){
    if(i)await new Promise<void>(resolve=>window.setTimeout(resolve,650));
    frames.push(await capture());
    setBurstProgress(i+1);
   }
   if(mode==="reference")await callbacks.current.onAddReferences?.(frames);
   else await callbacks.current.onSnapshot(frames);
  }catch{
   // Failed capture, validation or persistence must never leave the camera locked.
   locked.current=false;stable.current={id:"",hits:0};
   setError(en?"Multi-angle capture failed. Retry.":"多角度拍攝失敗，請再試一次。");
  }finally{shooting.current=false;setBurstProgress(0)}
 }
 const speaking=visual.state==="speaking",thinking=["connecting","requesting-mic","ending","reporting"].includes(visual.state);
 const mood=thinking?"thinking":visual.mood;
 return <section className={"souls-camera"+(activeSoul?" souls-camera-awake":"")} aria-label={en?"Soul camera":"靈魂相機"}>
  <div className="souls-camera-viewport" ref={viewport}>
   <video ref={video} autoPlay muted playsInline aria-label={en?"Live camera preview":"即時相機預覽"}/>
   {!activeSoul?<div className="souls-camera-aim" aria-hidden="true"/>:<>
    <button type="button" className="souls-ar-tap" onClick={aim} aria-label={en?"Tap the object to place its eyes":"點選物品，定位眼睛"}/>
    {box&&tracking!=="lost"&&<div className="souls-ar-region" style={{left:(box.x*100)+"%",top:(box.y*100)+"%",width:(box.width*100)+"%",height:(box.height*100)+"%"}} aria-hidden="true"/>}
    <div className="souls-ar-face" style={{left:(point.x*100)+"%",top:(point.y*100)+"%"}} data-mood={mood} data-speaking={speaking?"true":"false"} data-hearing={visual.hearing?"true":"false"} data-tracking={tracking} aria-hidden="true">
     <svg viewBox="0 0 136 104" xmlns="http://www.w3.org/2000/svg">
      <g className="souls-ar-face-glow">
       <ellipse cx="68" cy="48" rx="64" ry="46" fill="rgba(255,255,255,.28)"/>
       <ellipse cx="68" cy="48" rx="59" ry="43" fill="rgba(255,249,251,.17)"/>
      </g>
      <g className="souls-ar-blush" fill="#FF91B5">
       <ellipse cx="17" cy="69" rx="13" ry="8" opacity=".78"/>
       <ellipse cx="119" cy="69" rx="13" ry="8" opacity=".78"/>
      </g>
      <g className="souls-ar-eyes">
       {mood==="happy"?<>
        <path d="M22 52 Q38 24 54 52 M82 52 Q98 24 114 52" stroke="white" strokeWidth="15" strokeLinecap="round" fill="none"/>
        <path d="M22 52 Q38 24 54 52 M82 52 Q98 24 114 52" stroke="#241A38" strokeWidth="9" strokeLinecap="round" fill="none"/>
       </>:<>
        <rect x="19" y={mood==="surprised"?20:25} width="38" height={mood==="surprised"?48:44} rx="19" fill="white"/>
        <rect x="79" y={mood==="surprised"?20:25} width="38" height={mood==="surprised"?48:44} rx="19" fill="white"/>
        <rect x="23" y={mood==="surprised"?24:29} width="30" height={mood==="surprised"?40:36} rx="15" fill="#241A38"/>
        <rect x="83" y={mood==="surprised"?24:29} width="30" height={mood==="surprised"?40:36} rx="15" fill="#241A38"/>
        <g className="souls-ar-sparkles" fill="white">
         <ellipse cx={mood==="thinking"?43:36} cy="37" rx="7" ry="9"/>
         <ellipse cx={mood==="thinking"?103:96} cy="37" rx="7" ry="9"/>
         <circle cx="46" cy="53" r="3.3" opacity=".85"/>
         <circle cx="106" cy="53" r="3.3" opacity=".85"/>
        </g>
       </>}
      </g>
      <g className="souls-ar-mouth">
       {mood==="surprised"||speaking?
        <ellipse className="souls-mouth-open" cx="68" cy="84" rx={mood==="surprised"?12:10} ry={mood==="surprised"?10:speaking?Math.max(2,Math.round(2+(visual.level||0)*18)):7} fill="#241A38"/>:
        mood==="happy"?<path d="M54 77 Q68 96 82 77" stroke="white" strokeWidth="9" strokeLinecap="round" fill="none"/>:
        <path d="M59 80 Q68 89 77 80" stroke="white" strokeWidth="8" strokeLinecap="round" fill="none"/>}
       {!speaking&&mood==="happy"&&<path d="M54 77 Q68 96 82 77" stroke="#241A38" strokeWidth="5" strokeLinecap="round" fill="none"/>}
       {!speaking&&mood!=="happy"&&mood!=="surprised"&&<path d="M59 80 Q68 89 77 80" stroke="#241A38" strokeWidth="4" strokeLinecap="round" fill="none"/>}
      </g>
      <g className="souls-ar-cute-spark" fill="#FFF8FC" stroke="#FF85B2" strokeWidth="1.3">
       <path d="M9 22 l3 -7 3 7 7 3 -7 3 -3 7 -3 -7 -7 -3z" opacity=".85"/>
       <circle cx="125" cy="16" r="3" opacity=".8"/>
      </g>
      {mood==="thinking"&&<g fill="white"><circle cx="119" cy="10" r="6"/><circle cx="130" cy="2" r="3"/></g>}
      {mood==="surprised"&&<path d="M20 13 L12 4 M116 13 L124 4" stroke="#fff" strokeWidth="5" strokeLinecap="round"/>}
     </svg>
     <span className="souls-ar-name">{activeSoul.name}</span>
    </div>
    {visual.caption&&<div className="souls-ar-caption" aria-live="polite">{visual.caption.slice(-130)}</div>}
   </>}
  </div>
  <p className="souls-camera-status" role="status">{error||(!ready?(en?"Opening camera…":"正在開啟相機…"):activeSoul?
   locatingRegion?(en?"Finding the object outline locally…":"正在本機找出物品輪廓…"):
   tracking==="lost"?(en?"Lost the object. Tap it to re-anchor the eyes.":"追蹤到的特徵不見了，點物品重新定位眼睛。"):
   tracking==="align"?(en?"Tap the object to position its eyes.":"點一下物品，把眼睛放到正確位置。"):
   (en?"Your Soul is awake! Tap to adjust its eyes.":"它醒來了！點物品可以調整眼睛位置。"):
   (hint||(en?"Point at a saved Soul to wake it.":"對準已收藏物品，它就會在鏡頭裡醒來。")))}</p>
  {activeSoul?<div className="souls-camera-actions">
   <button type="button" disabled={Boolean(burstProgress)} onClick={()=>void burst("reference")}>{en?"＋ Add 4 views":"＋ 補拍 4 視角"}</button><button type="button" onClick={onReset}>{en?"↻ Scan another":"↻ 換個物品"}</button><button type="button" onClick={onClose}>{en?"Close camera":"關閉相機"}</button>
  </div>:<div className="souls-actions">
   <button className="souls-primary" disabled={!ready||locked.current||Boolean(burstProgress)} onClick={()=>void burst("enroll")}>{en?"◎ Capture 4 views":"◎ 拍攝 4 個視角"}</button>
   <button onClick={onClose}>{en?"Close camera":"關閉相機"}</button>
  </div>}
  {burstProgress>0&&<p className="souls-camera-burst" role="status">{en?`Captured ${burstProgress}/4 — move slowly around the object`:`已拍 ${burstProgress}/4 張，請緩慢改變角度`}</p>}
  {children}
 </section>;
}
