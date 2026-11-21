import {Arrow} from "../components/Arrow";
import {Component,lazy,Suspense,useCallback,useEffect,useState} from "react";
import type {ReactNode,ErrorInfo} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import {TownOverlay} from "./three/TownOverlay";
import type {TownViewMode} from "./three/TownCameraController";
import {DISTRICTS,type DistrictId,type FriendId,type PlaceId,type Selection} from "./three/world";
import "./three/town3d.css";

const TownScene=lazy(()=>import("./three/TownScene").then(m=>({default:m.TownScene})));
const compactError=(error:unknown)=>String(error instanceof Error?error.message:error).replace(/https?:\/\/[^\s)]+/g,"(url)").slice(0,240);

class Town3DErrorBoundary extends Component<{children:ReactNode;fallback:ReactNode;onFailure:(reason:string)=>void},{error:boolean}>{
 state={error:false};
 static getDerivedStateFromError(){return {error:true}}
 componentDidCatch(error:Error,_info:ErrorInfo){console.error("Crew Town WebGL fallback",error);this.props.onFailure(compactError(error))}
 render(){return this.state.error?this.props.fallback:this.props.children}
}
export function Town3DPage(){
 const {i18n}=useTranslation();
 const zh=i18n.language.startsWith("zh");
 const [supported,setSupported]=useState<"checking"|"yes"|"no">("checking");
 const [attempt,setAttempt]=useState(0);
 const [fallbackReason,setFallbackReason]=useState<"render-error"|null>(null);
 const [failureDetail,setFailureDetail]=useState("");
 const [modelIssue,setModelIssue]=useState("");
 const [night,setNight]=useState(false);
 const [view,setView]=useState<TownViewMode>("close");
 const [district,setDistrict]=useState<DistrictId>("center");
 const [selected,setSelected]=useState<Selection>(null);
 const [reset,setReset]=useState(0);
 const [reducedMotion,setReducedMotion]=useState(true);
 const fail=useCallback((reason:string)=>{trackUsageEvent("town_3d_fallback","render_error");setFailureDetail(reason);setFallbackReason("render-error")},[]);
 const simplified=useCallback((reason:string)=>setModelIssue(reason.slice(0,170)),[]);
 useEffect(()=>{
  const query=window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync=()=>setReducedMotion(query.matches);
  sync();query.addEventListener("change",sync);
  return()=>query.removeEventListener("change",sync);
 },[]);
 useEffect(()=>{trackUsageEvent("town_enter")},[]);
 useEffect(()=>{if(supported==="no")trackUsageEvent("town_3d_fallback","unsupported")},[supported]);
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
  setFailureDetail("");
  setModelIssue("");
  setSupported("checking");
  // Remount the error boundary and Canvas after a failed rendering attempt.
  setAttempt(n=>n+1);
 },[]);
 const travelToDistrict=useCallback((id:DistrictId)=>{
  trackUsageEvent("town_interaction","place");
  setDistrict(id);setView("close");setSelected(null);setReset(n=>n+1);
 },[]);
 const selectFriend=useCallback((id:FriendId)=>{trackUsageEvent("town_interaction","person");setView("close");setSelected({type:"person",id})},[]);
 const selectPlace=useCallback((id:PlaceId)=>{trackUsageEvent("town_interaction","place");setView("close");setSelected({type:"place",id})},[]);
 const unavailableMessage=supported==="no"
  ?zh?"這個裝置或瀏覽器目前無法使用 3D 小鎮，請嘗試支援 WebGL 的瀏覽器。":"This device or browser cannot display the 3D town. Please try a browser with WebGL support."
  :zh?"3D 場景無法正常載入或繪製，請重試；若仍無法開啟，可以返回探索。":"The 3D scene could not load or render. Please retry, or return to Explore if the problem continues.";
 const unavailable=<div className="crew-town-3d-unavailable" role="status">
  <div className="crew-town-3d-unavailable-notice">
   <div><strong>{zh?"3D 小鎮暫時無法使用":"3D town unavailable"}</strong><p>{unavailableMessage}</p>
    {failureDetail&&<code className="crew-town-3d-error-detail">{zh?"錯誤原因：":"Failure: "}{failureDetail}</code>}</div>
   <div className="crew-town-3d-unavailable-actions">
    <button type="button" onClick={retry3D}>{zh?"重試 3D":"Retry 3D"}</button>
    <Link to="/explore">{zh?"返回探索":"Back to Explore"}</Link>
   </div>
  </div>
 </div>;
 if(supported==="no"||fallbackReason)return unavailable;
 return <Town3DErrorBoundary key={attempt} fallback={unavailable} onFailure={fail}>
  <div className="crew-town-3d">
   <header className="crew-town-3d-heading">
    <div><span className="crew-town-3d-kicker">{zh?"CREW 小鎮 · 3D 世界":"CREW TOWN · 3D WORLD"}</span>
     <h1>{zh?"走進朋友們的小鎮":"Step into their little world"}</h1>
     <p>{zh?"五大街區相互連通，選擇街區或移動鏡頭，探索整座小鎮。":"Five connected districts. Explore beyond the square with district travel and free camera movement."}</p>
    </div>
    <Link to="/explore" className="crew-town-3d-back"><Arrow direction="left"/> {zh?"返回探索":"Explore"}</Link>
   </header>
   <section className={"crew-town-3d-stage"+(night?" is-night":"")+(view==="close"?" is-close":"")} aria-label={zh?"Crew Town 3D 探索場景":"Crew Town 3D exploration"}>
    {supported==="yes"?<Suspense fallback={<div className="crew-town-3d-loading" role="status">{zh?"正在準備 3D 世界…":"Preparing the 3D world…"}</div>}>
     <TownScene night={night} zh={zh} view={view} district={district} reducedMotion={reducedMotion} selected={selected} reset={reset}
      onFriend={selectFriend} onPlace={selectPlace} onDeselect={()=>setSelected(null)} onFailure={fail} onSimplified={simplified}/>
    </Suspense>:<div className="crew-town-3d-loading" role="status">{zh?"正在偵測 3D 支援…":"Checking 3D support…"}</div>}
    {modelIssue&&<div className="crew-town-3d-model-note" role="status">{zh?"模型讀取失敗，已改用簡化 3D 場景。":"The model could not load; showing a simplified 3D scene."} <code>{modelIssue}</code></div>}
    {!selected&&view==="close"&&<div className="crew-town-3d-hero" aria-hidden="true">
     <span>{zh?"WELCOME TO CREW TOWN":"WELCOME TO CREW TOWN"}</span>
     <strong>{zh?"在街角遇見朋友":"Meet the town up close"}</strong>
     <small>{zh?"穿過街道，還有市集、森林、故事街和港灣":"Beyond the square: a market, forest, story lane and harbor"}</small>
    </div>}
    <div className="crew-town-3d-tools">
     <span className="crew-town-3d-status"><span aria-hidden="true"/> {view==="close"?(zh?"近景探索 · 16 位朋友":"Close-up · 16 friends"):(zh?"小鎮全景":"Town overview")}</span>
     <div className="crew-town-3d-buttons">
      <button type="button" onClick={()=>{setSelected(null);setView(mode=>mode==="close"?"overview":"close");setReset(n=>n+1)}}
        aria-pressed={view==="close"}
        aria-label={view==="close"?(zh?"切換小鎮全景":"Switch to town overview"):(zh?"靠近街道與角色":"Move closer to friends")}>
        {view==="close"?(zh?"全景":"Overview"):(zh?"走近":"Get closer")}
      </button>
      <button type="button" onClick={()=>setNight(n=>!n)} aria-pressed={night}
        aria-label={zh?"切換白天與夜晚":"Toggle day and night"}>{night?(zh?"白天":"Day"):(zh?"夜晚":"Night")}</button>
     </div>
    </div>
    {!selected&&<nav className="crew-town-3d-districts" aria-label={zh?"小鎮街區導航":"Explore town districts"}>
     {DISTRICTS.map(area=><button key={area.id} type="button"
      aria-pressed={view==="close"&&district===area.id}
      onClick={()=>travelToDistrict(area.id)}>
      <span aria-hidden="true">{area.icon}</span>{zh?area.zh:area.en}
     </button>)}
    </nav>}
    <TownOverlay selected={selected} zh={zh} onClose={()=>setSelected(null)}
     onFriend={selectFriend} onPlace={selectPlace}/>
    {!selected&&<div className="crew-town-3d-hint">{zh?"拖曳旋轉 · 雙指平移／縮放 · 選擇街區探索":"Drag to rotate · Two fingers pan/zoom · Explore districts"}</div>}
   </section>
   <div className="crew-town-3d-caption">
    <span>{zh?"3D 小鎮角色使用預設走動與情境，不是多人 Gemini Live。點選「加入聊天」會進入既有的單人語音聊天。":"Town movements are scripted, not a multi-agent Live call. Joining a friend opens the existing one-to-one voice chat."}</span>
   </div>
  </div>
 </Town3DErrorBoundary>;
}
