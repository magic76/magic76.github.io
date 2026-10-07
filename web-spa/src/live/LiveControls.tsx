import type {ReturnTypeOfLive} from "./types";

function clock(ms:number){const s=Math.floor(ms/1000);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}

export function LiveControls({live,interruptLabel="打斷老師"}:{live:ReturnTypeOfLive;interruptLabel?:string}){
 const active=["requesting-mic","connecting","listening","speaking","ending","reporting"].includes(live.state);
 return <>
  <div className="live-status">{live.status}</div>
  <div className="live-controls">{!active?<button className="live-btn" onClick={()=>void live.start()}>開始</button>:<button className="live-btn end" onClick={()=>void live.stop()} disabled={live.state==="ending"||live.state==="reporting"}>{live.state==="reporting"?"整理中…":"結束"}</button>}</div>
  <div className="live-callbar">
   <div className="live-timer">{clock(live.durationMs)}</div>
   <div className="live-call-actions">
    <button className={"live-tool-btn "+(live.muted?"active":"")} onClick={live.toggleMute} disabled={!active}>{live.muted?"開啟麥克風":"麥克風靜音"}</button>
    <button className="live-tool-btn" onClick={()=>live.interrupt()} disabled={live.state!=="speaking"}>{interruptLabel}</button>
   </div>
  </div>
  <details className="live-audio-settings"><summary>播放音量 · {live.volume}%</summary><label className="live-volume"><input type="range" min="0" max="100" value={live.volume} onChange={e=>live.setVolume(Number(e.target.value))}/><span>{live.volume}%</span></label></details>
 </>;
}
