import{GeminiSetupNotice}from"../components/GeminiSetupNotice";
import type{ReturnTypeOfLive}from"./types";

function clock(ms:number){const s=Math.floor(ms/1000);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}

export function LiveControls({live,interruptLabel="打斷老師",prominentInterrupt=false,onEnd}:{live:ReturnTypeOfLive;interruptLabel?:string;prominentInterrupt?:boolean;onEnd?:()=>void|Promise<unknown>}){
 const active=["requesting-mic","connecting","listening","speaking","ending","reporting"].includes(live.state);
 const error=live.state==="error";
 return <>
  <div className={"live-status "+(error?"error":"")}>{live.status}</div>
  {error?<div className="live-recovery">
   {live.errorKind==="key"?<GeminiSetupNotice force className="crew-gemini-setup-live"/>:
    <button className="live-btn" onClick={()=>void live.start()}>{live.errorKind==="mic"?"重新允許麥克風":"重新連線"}</button>}
   {live.errorKind==="mic"&&<small>若瀏覽器已封鎖麥克風，請先在網址列或瀏覽器網站設定中允許。</small>}
   {live.errorKind==="network"&&<small>會保留目前頁面；網路恢復後可直接重新連線。</small>}
  </div>:
  !active?<div className="live-controls crew-voice-controls"><button className="live-btn" onClick={()=>void live.start()}>{live.state==="ended"?"再開始":"開始"}</button></div>:
  <div className="crew-voice-dock"><div className="crew-voice-dock-main">{prominentInterrupt&&<button type="button" className="live-manual-interrupt" onClick={()=>live.interrupt()} disabled={live.state!=="speaking"} aria-label={interruptLabel}>{interruptLabel}</button>}<div className="live-callbar">
   <div className="live-timer">{clock(live.durationMs)}</div>
   <div className="live-call-actions">
    <button className={"live-tool-btn "+(live.muted?"active":"")} onClick={live.toggleMute} disabled={live.state!=="listening"&&live.state!=="speaking"} aria-pressed={live.muted}>{live.muted?"開啟麥克風":"麥克風靜音"}</button>
    {!prominentInterrupt&&<button className="live-tool-btn" onClick={()=>live.interrupt()} disabled={live.state!=="speaking"}>{interruptLabel}</button>}
   </div>
  </div><button type="button" className="live-btn end crew-voice-end" onClick={()=>void (onEnd?onEnd():live.stop())} disabled={live.state==="ending"||live.state==="reporting"}>{live.state==="reporting"?"整理中…":"結束"}</button></div>
  <div className="live-audio-settings" role="group" aria-label="AI 播放音量">
   <label className="live-volume">
    <span className="live-volume-label">AI 音量</span>
    <input type="range" min="0" max="300" step="5" aria-label="調整 AI 播放音量" value={live.volume} onChange={e=>live.setVolume(Number(e.target.value))}/>
    <span className="live-volume-value">{live.volume}%{live.volume>100?" ↑":""}</span>
   </label>
   <small className="live-audio-hint">Android 語音對話時，實體音量鍵可能控制通話音量。可將 AI 音量調到 100% 以上增強播放；請逐步調高，避免過大聲或失真。</small>
  </div></div>}
 </>;
}
