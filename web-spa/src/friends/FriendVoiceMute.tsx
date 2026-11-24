import {useTranslation} from "react-i18next";

export function FriendVoiceMute({muted,onToggle,compact=false}:{muted:boolean;onToggle:()=>void;compact?:boolean}){
 const {t}=useTranslation("voice");
 const label=t("controls.muteFriend");
 return <button type="button" className={"friend-voice-mute"+(compact?" is-compact":"")} aria-label={label} aria-pressed={muted} title={t(muted?"controls.unmuteFriend":"controls.muteFriend")} onClick={onToggle}>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
   <path d="M11 5 6 9H3v6h3l5 4z"/>
   {muted?<path d="m16 9 6 6m0-6-6 6"/>:<path d="M15 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12"/>}
  </svg>
  {!compact&&<span className="friend-voice-mute-caption">{t("controls.friendVoice")}</span>}
 </button>;
}
