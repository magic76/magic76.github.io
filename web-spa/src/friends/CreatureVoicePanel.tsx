import type {Dispatch,SetStateAction} from "react";
import {useTranslation} from "react-i18next";
import {GuestTrialCountdown} from "../live/GuestTrialExperience";
import type {ReturnTypeOfLive} from "../live/types";
import {CreatureVoiceStart} from "./CreatureVoiceStart";
import "./creatureVoice.css";

export function CreatureVoicePanel({live,ready,status,guestStarted,setGuestStarted}:{
 live:ReturnTypeOfLive;ready:boolean;status:string;guestStarted:boolean;setGuestStarted:Dispatch<SetStateAction<boolean>>;
}){
 const {t}=useTranslation("voice");
 return <main className="creature-live-embed" aria-label="和 Zoe 語音聊天" onClickCapture={event=>{
  const link=event.target instanceof Element?event.target.closest("a"):null;
  if(!link||link.target||link.origin!==window.location.origin||link.pathname!=="/account")return;
  event.preventDefault();
  window.open("/account#settings-gemini","_blank","noopener,noreferrer");
 }}>
  <div className="creature-live-embed-heading"><strong>Zoe</strong><span role="status" aria-live="polite">{status}</span></div>
  {ready?<CreatureVoiceStart live={live} guestStarted={guestStarted} setGuestStarted={setGuestStarted}/>:<p role="status">正在準備生物夥伴…</p>}
  {guestStarted&&live.state!=="ended"&&live.state!=="error"?<GuestTrialCountdown secondsLeft={live.guestSecondsLeft}/>:null}
  {live.state==="listening"&&(live.voicePhase==="no-transcript"||live.voicePhase==="no-reply")?<p role="status">{t(live.voicePhase==="no-transcript"?"friendLive.noTranscript":"friendLive.noReply")}</p>:null}
  <div className="live-transcript" aria-live="polite">
   <div className={"live-line user "+(live.input?"show":"")}><small>{t("friendLive.youSaid")}</small><span>{live.input}</span></div>
   <div className={"live-line "+(live.output?"show":"")}><small>Zoe</small><span>{live.output}</span></div>
  </div>
 </main>;
}
