import {createContext,useCallback,useContext,useEffect,useRef,type ReactNode} from "react";
import {trackUsageEvent} from "./usage";
import {currentBuild} from "../runtime/buildUpdates";

// Paths and build identifiers are stored only in this browser; analytics sends
// allowlisted event names and duration buckets, never URLs or identifiers.
export const GAME_LOAD_DIAGNOSTICS_KEY="crew_game_load_diagnostics_v1";
const gameRoutes=new Set(["/games","/games/friend-gomoku","/games/gomoku","/games/1a2b",
 "/games/taboo","/games/crazy-court","/games/werewolf","/games/truth-news",
 "/games/nonsense","/games/crew-run","/games/connect4","/games/twenty-questions","/games/reversi","/games/mystery","/games/number-bomb","/games/memory"]);
type Status="loaded"|"stalled"|"asset_error";
type Result={route:string;build:string;status:Status;elapsedMs:number|null;at:string};
function safeGameRoute(path:string):string|null{
 const normalized=path.replace(/^\/en(?=\/)/,"").replace(/\/+$/,"")||"/";
 return gameRoutes.has(normalized)?normalized:null;
}
export function gameLoadBucket(elapsedMs:number){
 return elapsedMs<1000?"under_1s":elapsedMs<3000?"from_1_to_3s":elapsedMs<8000?"from_3_to_8s":"over_8s";
}
function record(path:string,status:Status,elapsedMs:number|null){
 const route=safeGameRoute(path);
 if(!route)return;
 const info:Result={route,build:currentBuild.commit?.slice(0,8)||"unknown",status,
  elapsedMs:elapsedMs===null?null:Math.max(0,Math.round(elapsedMs)),at:new Date().toISOString()};
 try{
  const previous=JSON.parse(sessionStorage.getItem(GAME_LOAD_DIAGNOSTICS_KEY)||"[]") as unknown;
  const history=Array.isArray(previous)?previous.slice(-29):[];
  sessionStorage.setItem(GAME_LOAD_DIAGNOSTICS_KEY,JSON.stringify([...history,info]));
 }catch{/* Diagnostics must never block navigation or depend on storage. */}
 try{
  trackUsageEvent(status==="loaded"?"game_route_loaded":status==="stalled"?"game_route_stalled":"game_route_asset_error",
   status==="loaded"?gameLoadBucket(elapsedMs??0):"");
 }catch{/* Best effort only. */}
}
export function recordGameRouteAssetError(path:string){record(path,"asset_error",null)}

const ReadyContext=createContext<(()=>void)|null>(null);
export function GameRouteMonitor({pathname,children}:{pathname:string;children:ReactNode}){
 const startedAt=useRef(performance.now());
 const finished=useRef(false);
 const slowTimer=useRef<number|null>(null);
 const ready=useCallback(()=>{
  if(!safeGameRoute(pathname)||finished.current)return;
  finished.current=true;
  if(slowTimer.current!==null)window.clearTimeout(slowTimer.current);
  record(pathname,"loaded",performance.now()-startedAt.current);
 },[pathname]);
 useEffect(()=>{
  if(!safeGameRoute(pathname)||finished.current)return;
  // Diagnostic only: never reload or interrupt a game after this threshold.
  slowTimer.current=window.setTimeout(()=>{
   if(!finished.current)record(pathname,"stalled",performance.now()-startedAt.current);
  },8000);
  return()=>{if(slowTimer.current!==null)window.clearTimeout(slowTimer.current)};
 },[pathname]);
 return <ReadyContext.Provider value={ready}>{children}</ReadyContext.Provider>;
}
export function GameRouteReady(){
 const ready=useContext(ReadyContext);
 useEffect(()=>{ready?.()},[ready]);
 return null;
}
