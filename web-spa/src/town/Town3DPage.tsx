import {Component,lazy,Suspense,useCallback,useEffect,useState} from "react";
import type {ReactNode,ErrorInfo} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {TownOverlay} from "./three/TownOverlay";
import {type FriendId,type PlaceId,type Selection} from "./three/world";
import "./three/town3d.css";

const TownScene=lazy(()=>import("./three/TownScene").then(m=>({default:m.TownScene})));
const TownFallback=lazy(()=>import("./TownPage").then(m=>({default:m.TownPage})));

class Town3DErrorBoundary extends Component<{children:ReactNode;fallback:ReactNode},{error:boolean}>{
 state={error:false};
 static getDerivedStateFromError(){return {error:true}}
 componentDidCatch(error:Error,_info:ErrorInfo){console.error("Crew Town WebGL fallback",error)}
 render(){return this.state.error?this.props.fallback:this.props.children}
}
export function Town3DPage(){
 const {i18n}=useTranslation();
 const zh=i18n.language.startsWith("zh");
 const [supported,setSupported]=useState<"checking"|"yes"|"no">("checking");
 const [failed,setFailed]=useState(false);
 const [night,setNight]=useState(false);
 const [selected,setSelected]=useState<Selection>(null);
 const [reset,setReset]=useState(0);
 const [reducedMotion,setReducedMotion]=useState(true);
 const fail=useCallback(()=>setFailed(true),[]);
 useEffect(()=>{
  const query=window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync=()=>setReducedMotion(query.matches);
  sync();query.addEventListener("change",sync);
  return()=>query.removeEventListener("change",sync);
 },[]);
 useEffect(()=>{
  try{
   const canvas=document.createElement("canvas");
   const context=canvas.getContext("webgl2")||canvas.getContext("webgl");
   setSupported(context?"yes":"no");
   // This probe uses a separate canvas: free its context before the actual renderer starts.
   if(context)context.getExtension("WEBGL_lose_context")?.loseContext();
  }catch{setSupported("no")}
 },[]);
 const selectFriend=useCallback((id:FriendId)=>setSelected({type:"person",id}),[]);
 const selectPlace=useCallback((id:PlaceId)=>setSelected({type:"place",id}),[]);
 const fallback=<Suspense fallback={<div role="status" className="crew-town-3d-loading">{zh?"正在載入小鎮地圖…":"Loading town map…"}</div>}><TownFallback/></Suspense>;
 if(supported==="no"||failed)return fallback;
 return <Town3DErrorBoundary fallback={fallback}>
  <div className="crew-town-3d">
   <header className="crew-town-3d-heading">
    <div><span className="crew-town-3d-kicker">{zh?"CREW 小鎮 · 3D 世界":"CREW TOWN · 3D WORLD"}</span>
     <h1>{zh?"走進朋友們的小鎮":"Step into their little world"}</h1>
     <p>{zh?"轉動視角、走近咖啡館，在小鎮的日常裡遇見 Crew 朋友。":"Explore a miniature village. Find your friends between the café, studio and lakeside."}</p>
    </div>
    <Link to="/explore" className="crew-town-3d-back">← {zh?"返回探索":"Explore"}</Link>
   </header>
   <section className={"crew-town-3d-stage"+(night?" is-night":"")} aria-label={zh?"Crew Town 3D 探索場景":"Crew Town 3D exploration"}>
    {supported==="yes"?<Suspense fallback={<div className="crew-town-3d-loading" role="status">{zh?"正在準備 3D 世界…":"Preparing the 3D world…"}</div>}>
     <TownScene night={night} reducedMotion={reducedMotion} selected={selected} reset={reset}
      onFriend={selectFriend} onPlace={selectPlace} onFailure={fail}/>
    </Suspense>:<div className="crew-town-3d-loading" role="status">{zh?"正在偵測 3D 支援…":"Checking 3D support…"}</div>}
    <div className="crew-town-3d-tools">
     <span className="crew-town-3d-status"><span aria-hidden="true"/> {zh?"小鎮日常 · 預設情境":"Village life · scripted scenes"}</span>
     <div className="crew-town-3d-buttons">
      <button type="button" onClick={()=>{setSelected(null);setReset(n=>n+1)}}
        aria-label={zh?"回到全景":"Return to overview"}>{zh?"全景":"Overview"}</button>
      <button type="button" onClick={()=>setNight(n=>!n)} aria-pressed={night}
        aria-label={zh?"切換白天與夜晚":"Toggle day and night"}>{night?(zh?"白天":"Day"):(zh?"夜晚":"Night")}</button>
     </div>
    </div>
    <TownOverlay selected={selected} zh={zh} onClose={()=>setSelected(null)}
     onFriend={selectFriend} onPlace={selectPlace}/>
    {!selected&&<div className="crew-town-3d-hint">{zh?"拖曳轉動 · 雙指／滾輪縮放 · 點擊建築或角色":"Drag to orbit · Pinch / scroll to zoom · Tap a friend or building"}</div>}
   </section>
   <div className="crew-town-3d-caption">
    <span>{zh?"3D 小鎮角色使用預設走動與情境，不是多人 Gemini Live。點選「加入聊天」會進入既有的單人語音聊天。":"Town movements are scripted, not a multi-agent Live call. Joining a friend opens the existing one-to-one voice chat."}</span>
    <button type="button" onClick={fail}>{zh?"切換 2.5D 地圖":"Use 2.5D map"}</button>
   </div>
  </div>
 </Town3DErrorBoundary>;
}
