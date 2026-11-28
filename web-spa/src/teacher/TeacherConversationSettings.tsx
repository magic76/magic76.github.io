import {useState} from "react";
import {useTranslation} from "react-i18next";
import {useTeacherStore,type TeachingMode,type LearnerSpeakingLevel} from "../store/teacherStore";
import {ConversationSummary,LanguageModePicker,LivePacePicker,liveSettingLocked} from "../components/ConversationPreferences";
import {teacherLanguageTransition} from "./teacherLanguage";
import {teacherLanguageLiveHint} from "./teacherLanguageUx";
import {nativeLanguageName} from "./teacherLocale";
import {friendSpokenLanguage} from "../friends/friendLanguage";
import {useCallTranslationPreference} from "../friends/useCallTranslationPreference";
import {FriendCallMenuPreferences} from "../friends/FriendCallMenuPreferences";
import {replyHintsLocked,type useSuggestedReplies} from "../live/useSuggestedReplies";
import type {useLiveSession} from "../live/useLiveSession";
export const useTeacherCallDisplay=()=>useCallTranslationPreference();
export function TeacherConversationSummary({roleplay,onOpen}:{roleplay:boolean;onOpen:()=>void}){
 const s=useTeacherStore();
 return <ConversationSummary role="teacher" language={s.targetLanguage} mode={roleplay?"immersion":s.teachingMode} pace={s.speakingPace} onOpen={onOpen}/>;
}
export function TeacherConversationSettings({live,textMode,roleplay,level,hints,display}:{live:ReturnType<typeof useLiveSession>;textMode:boolean;roleplay:boolean;level:LearnerSpeakingLevel;hints:ReturnType<typeof useSuggestedReplies>;display:ReturnType<typeof useTeacherCallDisplay>}){
 const {t,i18n}=useTranslation(["teacher","friends","settings"]);
 const s=useTeacherStore(),[note,setNote]=useState<"changed"|"saved"|"failed"|"">("");
 const locked=!textMode&&liveSettingLocked(live),mode=roleplay?"immersion":s.teachingMode;
 const change=(chosen:TeachingMode)=>{
  if(roleplay||locked||chosen===s.teachingMode)return;
  const connected=!textMode&&["listening","speaking"].includes(live.state);
  if(connected&&!live.sendControl(teacherLanguageTransition(s.targetLanguage,s.nativeLanguage,chosen,level))){setNote("failed");return;}
  s.setTeachingMode(chosen);
  setNote(connected||textMode?"changed":"saved");
 };
 const locale=i18n.resolvedLanguage||i18n.language;
 const hint=roleplay?t("teacher:tutor.roleplayLanguageLocked",{defaultValue:"Scenario practice uses full immersion."}):teacherLanguageLiveHint(mode,level,nativeLanguageName(s.nativeLanguage),locale==="zh-TW"?s.targetLanguage:friendSpokenLanguage(s.targetLanguage),locale==="en",locale);
 return <>
  <LanguageModePicker role="teacher" mode={mode} onChange={change} disabled={roleplay||locked} hint={hint} note={note?t(note==="failed"?"teacher:tutor.modeChangeFailed":note==="changed"?"friends:chatModeChanged":"friends:chatModeSavedNext",{defaultValue:note==="failed"?"Could not switch. Please try again.":"Preference saved."}):undefined}/>
  {!textMode&&<><LivePacePicker role="teacher" live={live}/><FriendCallMenuPreferences hintsEnabled={hints.enabled} hintsLocked={replyHintsLocked(live.state)} onHintsToggle={hints.toggle} translationEnabled={display.enabled} onTranslationToggle={display.toggle}/></>}
 </>;
}
