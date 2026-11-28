import {useState} from "react";
import {Icon} from "./Icon";
import {RolePreferencesDialog} from "./RolePreferencesDialog";
import {useTranslation} from "react-i18next";
import {useClientReady} from "../lib/useClientReady";
import {useTeacherStore,type SpeakingPace,type FriendChatLanguageMode,type TeachingMode} from "../store/teacherStore";
import {buildPacePrompt} from "../teacher/teacherAccent";
import {friendSpokenLanguage} from "../friends/friendLanguage";
import type {useLiveSession} from "../live/useLiveSession";
import "./conversationPreferences.css";
type Role="friend"|"teacher";
type Mode=FriendChatLanguageMode|TeachingMode;
type Live=Pick<ReturnType<typeof useLiveSession>,"state"|"sendControl">;
const modes={friend:["natural","bilingual","immersion"],teacher:["beginner","bilingual","immersion"]} as const;
const modeKey=(role:Role,mode:Mode)=>role==="teacher"?"teacher:tutor.guidanceChoices."+mode:
 "friends:chatMode"+(mode==="natural"?"Natural":mode==="immersion"?"Immersion":"Bilingual");
const paceKey=(pace:SpeakingPace)=>"teacher:tutor.shortSpeed."+pace;
export function PreferenceScopeHint({role}:{role:Role}){
 const {t}=useTranslation("settings");
 return <p className="crew-preference-scope" data-role={role}>{t("group.roleSharedHint",{defaultValue:"Learning language is shared; language mode, pace and regional accent are saved separately for each role."})}</p>;
}
function useSummary(role:Role,language:string,mode:Mode,pace:SpeakingPace){
 const {t}=useTranslation(["friends","teacher","settings"]);
 return {label:t("settings:group.roleSummary",{defaultValue:"Conversation preferences"}),summary:t("friends:languages."+language,{defaultValue:friendSpokenLanguage(language)})+" · "+t(modeKey(role,mode))+" · "+t(paceKey(pace))};
}
export function ConversationSummary({role,language,mode,pace,onOpen}:{role:Role;language:string;mode:Mode;pace:SpeakingPace;onOpen:()=>void}){
 const {label,summary}=useSummary(role,language,mode,pace);
 return <button type="button" className="crew-conversation-summary" onClick={onOpen} aria-haspopup="dialog" aria-label={label+": "+summary}><span>{summary}</span><Icon name="settings"/></button>;
}
export function RolePreferenceSummary({role,buttonLabel}:{role:Role;buttonLabel?:string}){
 const ready=useClientReady(),s=useTeacherStore(),[open,setOpen]=useState(false);
 const {label,summary}=useSummary(role,ready?s.targetLanguage:"英文",ready?(role==="teacher"?s.teachingMode:s.friendChatMode):"bilingual",ready?(role==="teacher"?s.speakingPace:s.friendSpeakingPace):"normal");
 return <><button type="button" className={"crew-conversation-summary crew-conversation-summary-trigger"+(buttonLabel?" crew-conversation-summary-named":"")} onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label={buttonLabel||label+": "+summary}><span>{buttonLabel||summary}</span><Icon name="settings"/></button>{open&&<RolePreferencesDialog role={role} onClose={()=>setOpen(false)}/>}</>;
}
export function LanguageModePicker<M extends Mode>({role,mode,onChange,disabled=false,hint,note,labels}:{role:Role;mode:M;onChange:(mode:M)=>void;disabled?:boolean;hint?:string;note?:string;labels?:Partial<Record<Mode,string>>}){
 const {t}=useTranslation(["friends","teacher"]);
 const title=t(role==="friend"?"friends:chatModeTitle":"teacher:tutor.guidance");
 return <div className="friend-language-switch" role="group" aria-label={title}>
  <span className="friend-language-switch-title">{title}</span>
  <div className="friend-language-options">{modes[role].map(value=><button key={value} type="button" disabled={disabled} className={mode===value?"selected":""} aria-pressed={mode===value} onClick={()=>onChange(value as M)}>{labels?.[value]??t(modeKey(role,value))}</button>)}</div>
  <small className="friend-language-mode-hint" role="note">{hint??t(mode==="natural"?"friends:chatModeHintNatural":mode==="immersion"?"friends:chatModeHintImmersion":"friends:chatModeHintBilingual")}</small>
  {note&&<small role="status">{note}</small>}
 </div>;
}
export function liveSettingLocked(live:Live){return ["requesting-mic","connecting","ending","reporting"].includes(live.state)}
export function LivePacePicker({role,live}:{role:Role;live:Live}){
 const {t}=useTranslation(["teacher","settings"]);
 const s=useTeacherStore(),[note,setNote]=useState("");
 const pace=role==="friend"?s.friendSpeakingPace:s.speakingPace;
 const disabled=liveSettingLocked(live);
 const change=(next:SpeakingPace)=>{
  if(disabled||next===pace)return;
  const connected=["listening","speaking"].includes(live.state);
  if(connected&&!live.sendControl("[SPEAKING PACE CHANGE — explicit user setting, overrides previous pace] "+buildPacePrompt(next)+" Apply on the next reply, without greeting or generating a new turn.")){
   setNote(t("settings:group.modeFailed",{defaultValue:"Setting was not sent. Try again."}));return;
  }
  (role==="friend"?s.setFriendSpeakingPace:s.setSpeakingPace)(next);
  setNote(t(connected?"settings:group.nextReplyHint":"settings:group.savedPreference",{defaultValue:connected?"Setting sent for the next reply.":"Preference saved."}));
 };
 const title=t("teacher:tutor.paceLabel");
 return <div className="friend-language-switch" role="group" aria-label={title}>
  <span className="friend-language-switch-title">{title}</span>
  <div className="friend-language-options">{(["slow","normal","fast"] as const).map(value=><button key={value} type="button" disabled={disabled} className={pace===value?"selected":""} aria-pressed={pace===value} onClick={()=>change(value)}>{t(paceKey(value))}</button>)}</div>
  {note&&<small role="status">{note}</small>}
 </div>;
}
