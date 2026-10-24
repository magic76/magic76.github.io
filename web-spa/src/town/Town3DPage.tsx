import {Component,lazy,Suspense,useCallback,useEffect,useState} from "react";
import type {ReactNode,ErrorInfo} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {TownOverlay} from "./three/TownOverlay";
import {type FriendId,type PlaceId,type Selection} from "./three/world";
import "./three/town3d.css";

const TownScene=lazy(()=>import("./three/TownScene").then(m=>({default:m.TownScene})));
const TownFallback=lazy(()=>import("./TownPage").then(m=>({default:m.TownPage})));

class Town3DErrorBoundary extends Component<{children:ReactNode;fallback:ReactNode;onFailure:()=>void},{error:boolean}>{
 state={error:false};
 static getDerivedStateFromError(){return {error:true}}
 componentDidCatch(error:Error,_info:ErrorInfo){console.error("Crew Town WebGL fallback",error);this.props.onFailure()}
 render(){return this.state.error?this.props.fallback:this.props.children}
}
export function Town3DPage(){
 const {i18n}=useTranslation();
 const zh=i18n.language.startsWith("zh");
 const [supported,setSupported]=useState<"checking"|"yes"|"no">("checking");
 const [attempt,setAttempt]=useState(0);
 const [fallbackReason,setFallbackReason]=useState<"render-error"|"manual"|null>(null);
 const [night,setNight]=useState(false);
 const [selected,setSelected]=useState<Selection>(null);
 const [reset,setReset]=useState(0);
 const [reducedMotion,setReducedMotion]=useState(true);
 const fail=useCallback(()=>setFallbackReason("render-error"),[]);
 useEffect(()=>{
  const query=window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync=()=>setReducedMotion(query.matches);
  sync();query.addEventListener("change",sync);
  return()=>query.removeEventListener("change",sync);
 },[]);
 useEffect(()=>{
  // Do not allocate and forcibly lose a disposable WebGL context before starting
  // the actual renderer. Mobile browsers may delay or fail the next context.
  // Canvas itself is the authoritative capability check and handles failure.
  const available=typeof window.WebGL2RenderingContext!=="undefined"
   ||typeof window.WebGLRenderingContext!=="undefined";
  setSupported(available?"yes":"no");
 },[attempt]);
 const retry3D=useCallback(()=>{
  setSelected(null);
  setFallbackReason(null);
  setSupported("checking");
  // Remount the error boundary and Canvas after a failed rendering attempt.
  setAttempt(n=>n+1);
 },[]);
 const selectFriend=useCallback((id:FriendId)=>setSelected({type:"person",id}),[]);
 const selectPlace=useCallback((id:PlaceId)=>setSelected({type:"place",id}),[]);
 const mode=supported==="no"?"unsupported":fallbackReason||"render-error";
 const explanation=mode==="unsupported"
  ?zh?"目前的瀏覽器或裝置沒有提供 WebGL 3D 支援，因此改用 2.5D 地圖。":"This browser or device does not support WebGL, so the 2.5D map is shown."
  :mode==="manual"
   ?zh?"你已手動切換為 2.5D 地圖，可以隨時再試 3D。":"You switched to the 2.5D map. You can retry 3D at any time."
   :zh?"3D 畫面載入或繪製失敗（也可能是顯示裝置重置），已自動切換為 2.5D 地圖。":"The 3D scene could not load or render (or the graphics context was lost), so the 2.5D map is shown.";
 const fallback=<div className="crew-town-3d-fallback">
  <div className="crew-town-3d-fallback-notice" role="status">
   <div><strong>{zh?"目前使用 2.5D 地圖":"2.5D map mode"}</strong><p>{explanation}</p></div>
   <button type="button" onClick={retry3D}>{zh?"重試 3D":"Retry 3D"}</button>
  </div>
  <Suspense fallback={<div role="status" className="crew-town-3d-loading">{zh?"正在載入小鎮地圖…":"Loading town map…"}</div>}><TownFallback/></Suspense>
 </div>;
 if(supported==="no"||fallbackReason)return fallback;
 return <Town3DErrorBoundary key={attempt} fallback={fallback} onFailure={fail}>
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
    <button type="button" onClick={()=>setFallbackReason("manual")}>{zh?"切換 2.5D 地圖":"Use 2.5D map"}</button>
   </div>
  </div>
 </Town3DErrorBoundary>;
}
