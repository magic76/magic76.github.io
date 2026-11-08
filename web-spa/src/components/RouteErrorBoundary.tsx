import {Component,type ReactNode} from "react";
import {recordGameRouteAssetError} from "../analytics/gameRouteDiagnostics";
import {trackUsageEvent} from "../analytics/usage";

// Vite's hashed route chunks can be missing briefly when an older open tab
// navigates after a Cloudflare Pages deployment, or when a mobile fetch fails.
// A failed import() remains rejected within the current document: rendering the
// same lazy route again does not reliably retry its module URL.
function isAssetLoadError(error:unknown){
 const message=String(error instanceof Error?error.message:error);
 return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|failed to load module script|expected a javascript-or-wasm module script|mime type[^\n]*text\/html|chunkloaderror|loading chunk [^ ]+ failed|unable to preload css/i.test(message);
}

// Previous generic fallback: "可能是網路暫時中斷，或網站剛更新。你的其他頁面仍可使用。"
const RETRY_KEY="crew_route_asset_recovery_v1";
const RETRY_WINDOW_MS=60_000;
const RETRY_QUERY="__crew_reload";
// A plain reload can hit stale cached HTML again; use a new URL to request the
// current deployment. Preserve any history/mode query parameters and the hash.
function reloadLatest(){
 const url=new URL(window.location.href);
 url.searchParams.set(RETRY_QUERY,Date.now().toString(36));
 // Best effort only: do not wait for SW update before navigating to fresh HTML.
 try{
  if("serviceWorker" in navigator)void navigator.serviceWorker.getRegistration()
   .then(registration=>registration?.update()).catch(()=>{});
 }catch{/* Unsupported or blocked SW APIs must not prevent recovery. */}
 window.location.replace(url.toString());
}
function recoveryPath(){
 const params=new URLSearchParams(window.location.search);
 params.delete(RETRY_QUERY);
 const query=params.toString();
 return window.location.pathname+(query?"?"+query:"");
}

type Props={children:ReactNode};
type State={error:unknown|null;recovering:boolean};

export class RouteErrorBoundary extends Component<Props,State>{
 state:State={error:null,recovering:false};

 static getDerivedStateFromError(error:unknown):State{
  // During the one allowed chunk-recovery navigation show a neutral loading
  // state, not a false error screen for a page that is about to recover.
  return {error,recovering:isAssetLoadError(error)};
 }

 componentDidCatch(error:unknown){
  // No raw stack trace, URL, personal content or mode parameters leave the device.
  try{trackUsageEvent("route_load_error",isAssetLoadError(error)?"asset":"runtime");}catch{/* Best effort. */}
  if(!isAssetLoadError(error))return;
  recordGameRouteAssetError(window.location.pathname);
  // Reload once to obtain the current HTML/asset manifest, never indefinitely.
  // A persistent outage still shows the retry/home actions below.
  try{
   const now=Date.now();
   const path=recoveryPath();
   const previous=JSON.parse(sessionStorage.getItem(RETRY_KEY)||"null") as {path?:string;at?:number}|null;
   if(previous?.path===path&&typeof previous.at==="number"&&now-previous.at<RETRY_WINDOW_MS){
    this.setState({recovering:false});
    return;
   }
   sessionStorage.setItem(RETRY_KEY,JSON.stringify({path,at:now}));
   reloadLatest();
  }catch{
   // Storage/navigation may be unavailable. Show actionable failure UI.
   this.setState({recovering:false});
  }
 }

 render(){
  if(this.state.error===null)return this.props.children;
  // A failed lazy import remains rejected for this document. Only the first,
  // already-scheduled recovery is rendered as loading; persistent failures
  // still receive the existing error actions after the guarded retry.
  if(this.state.recovering)return <main className="shell page spa-loading" role="status" aria-live="polite">
   {/^\/en(?:\/|$)/.test(window.location.pathname)?"Restoring page…":"正在重新載入頁面…"}
  </main>;
  const english=typeof window!=="undefined"&&/^\/en(?:\/|$)/.test(window.location.pathname);
  const home=english?"/en/":"/";
  const assetError=isAssetLoadError(this.state.error);
  return <main className="shell page" role="alert" style={{minHeight:"45vh",display:"grid",placeItems:"center",padding:"40px 20px"}}>
   <section style={{width:"min(100%,480px)",textAlign:"center",padding:"28px 22px",background:"var(--surface,#fff)",border:"1px solid var(--line,#ddd)",borderRadius:20}}>
    <h1 style={{fontSize:23,margin:"0 0 12px"}}>{english?"This page couldn't load":"頁面暫時無法載入"}</h1>
    <p style={{lineHeight:1.7,color:"var(--muted,#666)"}}>{assetError?
     (english?"The latest page files could not be loaded. Try reloading to get the current version.":"新版頁面檔案載入失敗。請重新載入取得最新版本。"):
     (english?"This page encountered a software error. Reload or return home; it may not be a network problem.":"此頁面的程式執行發生錯誤，不一定是網路問題。請重新載入或返回首頁。")}</p>
    <div style={{display:"flex",justifyContent:"center",gap:12,flexWrap:"wrap",marginTop:22}}>
     <button type="button" onClick={reloadLatest} style={{padding:"11px 20px",borderRadius:12,cursor:"pointer"}}>{english?"Reload":"重新載入"}</button>
     <a href={home} style={{padding:"11px 20px"}}>{english?"Back to home":"返回首頁"}</a>
    </div>
   </section>
  </main>;
 }
}
