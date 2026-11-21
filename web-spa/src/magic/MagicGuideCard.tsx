import {Arrow} from "../components/Arrow";
import {useMagicT} from "./useMagicT";
import {Link} from 'react-router-dom';
export type MagicVoiceState='idle'|'connecting'|'listening'|'speaking'|'error';
export function MagicGuideCard({zh,voiceState,isOnline,muted,volume,hasKey,starting,toolsAvailable,notice,heard,said,onStop,onStart,onToggleMic,onVolume}:{
 zh:boolean;voiceState:MagicVoiceState;isOnline:boolean;muted:boolean;volume:number;hasKey:boolean;starting:boolean;
 toolsAvailable:boolean;notice:string;heard:string;said:string;
 onStop:()=>void;onStart:()=>void;onToggleMic:()=>void;onVolume:(n:number)=>void;
}){
 void zh;
 const {t:tr}=useMagicT();
 return <section className="magic-guide-card">
  <div className="magic-guide-row">
   <span className={'magic-lumi'+(voiceState==='speaking'?' is-speaking':'')} aria-hidden="true">✦</span>
   <div className="magic-guide-text"><strong>Lumi <span>{tr("· your magic guide")}</span></strong>
    <small role="status">{voiceState==='speaking'?tr("Lumi is speaking"):
     voiceState==='listening'?tr("Listening to your wish"):
     voiceState==='connecting'?tr("Connecting…"):
     voiceState==='error'?tr("Connection lost"):tr("Ready to make magic")}</small>
   </div>
  </div>
  <p className="magic-guide-lead">{tr("“What wonderful thing should happen to our island?”")}</p>
  <div className="magic-voice-actions">
   {isOnline||voiceState==='connecting'?<button type="button" className="magic-primary magic-end" onClick={onStop}>{tr("End conversation")}</button>:
    <button type="button" className="magic-primary" disabled={starting} onClick={onStart}>
     <span aria-hidden="true">◉</span> {starting?tr("Connecting…"):tr("Start voice magic")}
    </button>}
   {isOnline&&<button type="button" className="magic-secondary" onClick={onToggleMic} aria-pressed={muted}>
    {muted?tr("Unmute"):tr("Mute")}</button>}
  </div>
  {isOnline&&<label className="magic-volume">{tr("Lumi volume")} <input aria-label={tr("Lumi volume")} type="range" min="0" max="150" step="5"
   value={volume} onChange={e=>onVolume(Number(e.target.value))}/><output>{volume}%</output></label>}
  {!hasKey&&<Link className="magic-settings" to="/settings">{tr("Set up voice connection")} <Arrow/></Link>}
  {!toolsAvailable&&<p className="magic-muted">{tr("Voice can continue; use the spells below to change the scene.")}</p>}
  {notice&&<p className="magic-notice" role="status">{notice}</p>}
  {isOnline&&(heard||said)&&<div className="magic-transcripts">
   {heard&&<p><b>{tr("You")}:</b> {heard}</p>}
   {said&&<p><b>Lumi:</b> {said}</p>}
  </div>}
 </section>;
}
