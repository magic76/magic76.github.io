import {Component,type ReactNode} from "react";

// Vite's hashed route chunks can be missing briefly when an older open tab
// navigates after a Cloudflare Pages deployment, or when a mobile fetch fails.
// A failed import() remains rejected within the current document: rendering the
// same lazy route again does not reliably retry its module URL.
function isAssetLoadError(error:unknown){
 const message=String(error instanceof Error?error.message:error);
 return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|chunkloaderror|loading chunk [^ ]+ failed|unable to preload css/i.test(message);
}

const RETRY_KEY="crew_route_asset_recovery_v1";
const RETRY_WINDOW_MS=60_000;

type Props={children:ReactNode};
type State={error:unknown|null};

export class RouteErrorBoundary extends Component<Props,State>{
 state:State={error:null};

 static getDerivedStateFromError(error:unknown):State{
  return {error};
 }

 componentDidCatch(error:unknown){
  if(!isAssetLoadError(error))return;
  // Reload once to obtain the current HTML/asset manifest, never indefinitely.
  // A persistent outage still shows the retry/home actions below.
  try{
   const now=Date.now();
   const path=window.location.pathname+window.location.search;
   const previous=JSON.parse(sessionStorage.getItem(RETRY_KEY)||"null") as {path?:string;at?:number}|null;
   if(previous?.path===path&&typeof previous.at==="number"&&now-previous.at<RETRY_WINDOW_MS)return;
   sessionStorage.setItem(RETRY_KEY,JSON.stringify({path,at:now}));
   window.location.reload();
  }catch{
   // Storage may be unavailable; leave the visible error screen in place.
  }
 }

 render(){
  if(this.state.error===null)return this.props.children;
  const english=typeof window!=="undefined"&&/^\/en(?:\/|$)/.test(window.location.pathname);
  const home=english?"/en/":"/";
  return <main className="shell page" role="alert" style={{minHeight:"45vh",display:"grid",placeItems:"center",padding:"40px 20px"}}>
   <section style={{width:"min(100%,480px)",textAlign:"center",padding:"28px 22px",background:"var(--surface,#fff)",border:"1px solid var(--line,#ddd)",borderRadius:20}}>
    <h1 style={{fontSize:23,margin:"0 0 12px"}}>{english?"This page couldn't load":"頁面暫時無法載入"}</h1>
    <p style={{lineHeight:1.7,color:"var(--muted,#666)"}}>{english?"The connection may have been interrupted, or the website was just updated.":"可能是網路暫時中斷，或網站剛更新。你的其他頁面仍可使用。"}</p>
    <div style={{display:"flex",justifyContent:"center",gap:12,flexWrap:"wrap",marginTop:22}}>
     <button type="button" onClick={()=>window.location.reload()} style={{padding:"11px 20px",borderRadius:12,cursor:"pointer"}}>{english?"Reload":"重新載入"}</button>
     <a href={home} style={{padding:"11px 20px"}}>{english?"Back to home":"返回首頁"}</a>
    </div>
   </section>
  </main>;
 }
}
