import type {ReactNode} from "react";
import {useTranslation} from "react-i18next";
import type {ReturnTypeOfLive} from "../live/types";
function clock(ms:number){const s=Math.max(0,Math.floor(ms/1000));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
export function FriendCallControls({live,onEnd,accessory}:{live:ReturnTypeOfLive;onEnd:()=>void|Promise<unknown>;accessory?:ReactNode}){
 const {t}=useTranslation("voice");const ready=live.state==="listening"||live.state==="speaking";
 return <div className="friend-phone-controls" aria-label={t("callCaptions.callControls")}>
  <span className="friend-phone-duration">{clock(live.durationMs)}</span>
  <div className="friend-phone-buttons">
   <button type="button" className={"friend-phone-button"+(live.muted?" is-muted":"")} onClick={live.toggleMute} disabled={!ready} aria-pressed={live.muted} aria-label={t(live.muted?"controls.unmute":"controls.mute")}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>{live.muted?<path d="M3 3l18 18"/>:null}</svg>
    <small>{t(live.muted?"controls.unmute":"controls.mute")}</small>
   </button>
   {accessory}
   <button type="button" className="friend-phone-button is-end" disabled={live.state==="ending"||live.state==="reporting"} onClick={()=>void onEnd()} aria-label={t("callCaptions.hangUp")}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 15c5-4 13-4 18 0l-3 5-4-3h-4l-4 3-3-5Z"/></svg>
    <small>{t("callCaptions.hangUp")}</small>
   </button>
   <button type="button" className="friend-phone-button" disabled={!ready||(live.state!=="speaking"&&!live.openingProtected)} onClick={()=>{window.dispatchEvent(new Event("crew-friend-call-interrupt"));live.interrupt()}} aria-label={t("controls.myTurn")}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 5v14M8 8v8M12 3v18M16 8v8M20 5v14"/></svg>
    <small>{t("controls.myTurn")}</small>
   </button>
  </div>

 </div>;
}
