import {useEffect,useRef,useState} from "react";

/** Live camera preview, with cautious repeated identity matching. Does not send video anywhere. */
export function SoulCamera({onProbe,onWake,onSnapshot,onClose,en}:{
 onProbe:(frame:File)=>Promise<{id:string;name:string}|null>;
 onWake:(id:string,frame:File)=>void;
 onSnapshot:(frame:File)=>void;
 onClose:()=>void;en:boolean;
}){
 const video=useRef<HTMLVideoElement|null>(null);
 const stream=useRef<MediaStream|null>(null);
 const callbacks=useRef({onProbe,onWake,onSnapshot});
 callbacks.current={onProbe,onWake,onSnapshot};
 const checking=useRef(false),locked=useRef(false),stable=useRef({id:"",hits:0});
 const [ready,setReady]=useState(false),[error,setError]=useState(""),[hint,setHint]=useState("");
 async function capture(){
  const v=video.current;if(!v||v.readyState<2||!v.videoWidth)throw Error("Camera not ready");
  const canvas=document.createElement("canvas");canvas.width=canvas.height=640;
  const ctx=canvas.getContext("2d");if(!ctx)throw Error("Canvas not supported");
  const side=Math.min(v.videoWidth,v.videoHeight);
  ctx.drawImage(v,(v.videoWidth-side)/2,(v.videoHeight-side)/2,side,side,0,0,640,640);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error("Frame capture failed")),"image/jpeg",.82));
  return new File([blob],"souls-camera.jpg",{type:"image/jpeg"});
 }
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
     if(checking.current||locked.current||!alive)return;
     checking.current=true;
     void capture().then(async file=>{
      const match=await callbacks.current.onProbe(file);
      if(!alive||locked.current)return;
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
 async function snap(){
  if(locked.current||!ready)return;locked.current=true;setError("");
  try{callbacks.current.onSnapshot(await capture())}
  catch{locked.current=false;setError(en?"Could not capture. Try again.":"拍攝失敗，請再試一次。")}
 }
 return <section className="souls-camera" aria-label={en?"Soul camera":"靈魂相機"}>
  <video ref={video} autoPlay muted playsInline aria-label={en?"Live camera preview":"即時相機預覽"}/>
  <div className="souls-camera-aim" aria-hidden="true"/>
  <p role="status">{error||(ready?(hint||(en?"Point at a saved object to wake it.":"鏡頭對準已收藏物品，辨識夠明確就會喚醒它。")):(en?"Opening camera…":"正在開啟相機…"))}</p>
  <div className="souls-actions"><button className="souls-primary" disabled={!ready||locked.current} onClick={()=>void snap()}>{en?"◎ Snapshot / confirm":"◎ 拍攝／確認"}</button><button onClick={onClose}>{en?"Close camera":"關閉相機"}</button></div>
 </section>;
}
