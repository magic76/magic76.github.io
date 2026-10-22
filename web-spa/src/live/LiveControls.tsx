import{GeminiSetupNotice}from"../components/GeminiSetupNotice";
import type{ReturnTypeOfLive}from"./types";
import "./gameVoiceCompact.css";

function clock(ms:number){const s=Math.floor(ms/1000);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}

export function LiveControls({live,interruptLabel="打斷老師",prominentInterrupt=false,onEnd,compact=false,english=false}:{live:ReturnTypeOfLive;interruptLabel?:string;prominentInterrupt?:boolean;onEnd?:()=>void|Promise<unknown>;compact?:boolean;english?:boolean}){
 const active=["requesting-mic","connecting","listening","speaking","ending","reporting"].includes(live.state);
 const error=live.state==="error";
 if(compact&&active&&!error){
  const speaking=live.state==="speaking",listening=live.state==="listening";
  const stateText=speaking?(english?"Speaking":"朋友說話"):listening?(english?"Listening":"正在聆聽"):live.state==="connecting"||live.state==="requesting-mic"?(english?"Connecting":"連線中"):(english?"Finishing":"結束中");
  return <div className="crew-game-voice-controls" aria-label={english?"Voice controls":"語音操作"}>
   <div className="crew-game-voice-row">
    <div className={"crew-game-voice-state"+(speaking?" is-speaking":listening?" is-listening":"")} role="status" aria-live="polite"><span className="crew-game-voice-dot" aria-hidden="true"/><span className="crew-game-voice-state-label">{stateText}</span><span className="crew-game-voice-timer">{clock(live.durationMs)}</span></div>
    <div className="crew-game-voice-actions">
     {prominentInterrupt&&speaking?<button type="button" className="crew-game-voice-btn is-interrupt" onClick={()=>live.interrupt()} aria-label={interruptLabel}>{english?"Interrupt":"打斷"}</button>:null}
     <button type="button" className={"crew-game-voice-btn"+(live.muted?" is-muted":"")} onClick={live.toggleMute} disabled={!speaking&&!listening} aria-pressed={live.muted} aria-label={live.muted?(english?"Unmute microphone":"開啟麥克風"):(english?"Mute microphone":"麥克風靜音")}>{live.muted?(english?"Unmute":"開麥"):(english?"Mute":"靜音")}</button>
     <details className="crew-game-voice-volume"><summary aria-label={english?"Adjust AI voice volume":"調整 AI 音量"}>{english?"Volume":"音量"}</summary>
      <div className="crew-game-voice-volume-panel">
       <div className="crew-game-voice-volume-caption"><strong>{english?"AI volume":"AI 音量"}</strong><output>{live.volume}%</output></div>
       <div className="crew-game-voice-volume-stepper"><button type="button" onClick={()=>live.setVolume(Math.max(0,live.volume-20))} disabled={live.volume===0} aria-label={english?"Lower AI volume":"降低 AI 音量"}>−</button>
       <input type="range" min="0" max="300" step="5" aria-label={english?"AI volume":"AI 播放音量"} value={live.volume} onChange={e=>live.setVolume(Number(e.target.value))}/>
       <button type="button" onClick={()=>live.setVolume(Math.min(300,live.volume+20))} disabled={live.volume===300} aria-label={english?"Raise AI volume":"提高 AI 音量"}>+</button></div>
      </div>
     </details>
     <button type="button" className="crew-game-voice-btn is-end" onClick={()=>void (onEnd?onEnd():live.stop())} disabled={live.state==="ending"||live.state==="reporting"}>{live.state==="reporting"?(english?"Finishing…":"整理中…"):(english?"End":"結束")}</button>
    </div>
   </div>
  </div>;
 }
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
  <details className="live-audio-settings" aria-label="AI 播放音量">
   <summary>AI 音量 · {live.volume}% <span aria-hidden="true">⌄</span></summary>
   <div className="live-volume">
    <span className="live-volume-label">AI 音量</span>
    <button type="button" className="live-volume-step" aria-label="AI 音量降低 20%" onClick={()=>live.setVolume(Math.max(0,live.volume-20))} disabled={live.volume===0}>−</button>
    <input type="range" min="0" max="300" step="5" aria-label="調整 AI 播放音量" value={live.volume} onChange={e=>live.setVolume(Number(e.target.value))}/>
    <button type="button" className="live-volume-step" aria-label="AI 音量提高 20%" onClick={()=>live.setVolume(Math.min(300,live.volume+20))} disabled={live.volume===300}>+</button>
    <span className="live-volume-value">{live.volume}%{live.volume>100?" ↑":""}</span>
   </div>
   <small className="live-audio-hint">Android 音量鍵有時只調整通話音量，無法降低 AI 聲音。可直接按 −／＋ 或拖動滑桿調整 AI 播放音量；100% 以上會增強音量，請避免調得過大。</small>
  </details></div>}
 </>;
}
