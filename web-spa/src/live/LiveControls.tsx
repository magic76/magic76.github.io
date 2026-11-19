import{GeminiSetupNotice}from"../components/GeminiSetupNotice";
import{useTranslation}from"react-i18next";
import type{ReturnTypeOfLive}from"./types";
import{liveStatusKey}from"./liveStatusText";
import{useRouteNamespace}from"../i18n/useRouteNamespace";
import "./gameVoiceCompact.css";

function clock(ms:number){const s=Math.floor(ms/1000);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}

export function LiveControls({live,interruptLabel:customInterrupt,prominentInterrupt=false,onEnd,compact=false}:{live:ReturnTypeOfLive;interruptLabel?:string;prominentInterrupt?:boolean;onEnd?:()=>void|Promise<unknown>;compact?:boolean;/** Deprecated: compact labels now follow the UI locale. */english?:boolean}){
 const active=["requesting-mic","connecting","listening","speaking","ending","reporting"].includes(live.state);
 const error=live.state==="error";
 const {t}=useTranslation(["voice","settings"]);
 const voiceReady=useRouteNamespace("voice");
 const interruptLabel=customInterrupt??t("controls.interruptTeacher");
 const statusKey=liveStatusKey(live.status);
 // A missing key is a setup step, not a connection failure: show it neutrally and translated.
 const needsKey=error&&live.errorKind==="key";
 if(!voiceReady)return null;
 if(compact&&active&&!error){
  const speaking=live.state==="speaking",listening=live.state==="listening";
  const stateText=t(speaking?"compact.speaking":listening?"compact.listening":live.state==="connecting"||live.state==="requesting-mic"?"compact.connecting":"compact.finishing");
  return <div className="crew-game-voice-controls" aria-label={t("compact.aria")}>
   <div className="crew-game-voice-row">
    <div className={"crew-game-voice-state"+(speaking?" is-speaking":listening?" is-listening":"")} role="status" aria-live="polite" aria-atomic="true"><span className="crew-game-voice-dot" aria-hidden="true"/><span className="crew-game-voice-state-label">{stateText}</span><span className="crew-game-voice-timer" aria-hidden="true">{clock(live.durationMs)}</span></div>
    <div className="crew-game-voice-actions">
     {prominentInterrupt&&speaking?<button type="button" className="crew-game-voice-btn is-interrupt" onClick={()=>live.interrupt()} aria-label={interruptLabel}>{t("compact.interrupt")}</button>:null}
     <button type="button" className={"crew-game-voice-btn"+(live.muted?" is-muted":"")} onClick={live.toggleMute} disabled={!speaking&&!listening} aria-pressed={live.muted} aria-label={t(live.muted?"compact.unmuteAria":"compact.muteAria")}>{t(live.muted?"compact.unmute":"compact.mute")}</button>
     <button type="button" className="crew-game-voice-btn is-end" onClick={()=>void (onEnd?onEnd():live.stop())} disabled={live.state==="ending"||live.state==="reporting"}>{t(live.state==="reporting"?"compact.wrapping":"compact.end")}</button>
    </div>
   </div>
  </div>;
 }
 return <>
  <div className={"live-status "+(error&&!needsKey?"error":"")} role="status">{needsKey?t("gemini.initialMissing"):statusKey?t(statusKey):live.status}</div>
  {error?<div className="live-recovery">
   {live.errorKind==="key"?<GeminiSetupNotice force className="crew-gemini-setup-live"/>:
    <button className="live-btn" onClick={()=>void live.start()}>{live.errorKind==="mic"?t("controls.retryMic"):t("controls.reconnect")}</button>}
   {live.errorKind==="mic"&&<small>{t("controls.micBlocked")}</small>}
   {live.errorKind==="network"&&<small>{t("controls.networkHint")}</small>}
  </div>:
  !active?<div className="live-controls crew-voice-controls"><button className="live-btn" onClick={()=>void live.start()}>{live.state==="ended"?t("controls.restart"):t("controls.start")}</button></div>:
  <div className="crew-voice-dock"><div className="crew-voice-dock-main">{prominentInterrupt&&<button type="button" className="live-manual-interrupt" onClick={()=>live.interrupt()} disabled={live.state!=="speaking"} aria-label={interruptLabel}>{interruptLabel}</button>}<div className="live-callbar">
   <div className="live-timer">{clock(live.durationMs)}</div>
   <div className="live-call-actions">
    <button className={"live-tool-btn "+(live.muted?"active":"")} onClick={live.toggleMute} disabled={live.state!=="listening"&&live.state!=="speaking"} aria-pressed={live.muted}>{live.muted?t("controls.unmute"):t("controls.mute")}</button>
    {!prominentInterrupt&&<button className="live-tool-btn" onClick={()=>live.interrupt()} disabled={live.state!=="speaking"}>{interruptLabel}</button>}
   </div>
  </div><button type="button" className="live-btn end crew-voice-end" onClick={()=>void (onEnd?onEnd():live.stop())} disabled={live.state==="ending"||live.state==="reporting"}>{live.state==="reporting"?t("controls.finishing"):t("controls.end")}</button></div>
    </div></div>}
 </>;
}
