import {useEffect,useId,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {useTeacherStore,type ConversationMode,type FriendChatLanguageMode,type TeachingMode,type SpeakingPace} from "../store/teacherStore";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import {NATIVE_LANGUAGES,localizedNativeName} from "../teacher/teacherLocale";
import {accentOptions,normalizedAccent} from "../teacher/teacherAccent";
import {TeacherPinyinSetting} from "../teacher/TeacherPinyinSetting";
import {teacherLanguageHomeHint} from "../teacher/teacherLanguageUx";
import {friendSpokenLanguage} from "../friends/friendLanguage";

const SCENES=["hotel_checkin","restaurant_order","work_meeting","transport"] as const;
export function RolePreferencesDialog({role,onClose}:{role:"friend"|"teacher";onClose:()=>void}){
 const {t,i18n}=useTranslation(["teacher","friends","settings"]);
 const s=useTeacherStore(),teacher=role==="teacher",locale=i18n.resolvedLanguage||i18n.language;
 const ref=useRef<HTMLDialogElement>(null),closeRef=useRef(onClose),titleId=useId();
 closeRef.current=onClose;
 const [scene,setScene]=useState(()=>localStorage.getItem("crew_teacher_scenario")||"hotel_checkin");
 useEffect(()=>{
  const dialog=ref.current;if(!dialog)return;
  const focused=document.activeElement instanceof HTMLElement?document.activeElement:null,oldOverflow=document.body.style.overflow;
  dialog.showModal();document.body.style.overflow="hidden";
  return()=>{if(dialog.open)dialog.close();document.body.style.overflow=oldOverflow;if(focused?.isConnected)focused.focus()};
 },[]);
 const mode=teacher?s.teachingMode:s.friendChatMode,pace=teacher?s.speakingPace:s.friendSpeakingPace,accent=teacher?s.languageStyle:s.friendLanguageStyle;
 const target=t("friends:languages."+s.targetLanguage,{defaultValue:friendSpokenLanguage(s.targetLanguage)}),native=localizedNativeName(s.nativeLanguage,locale);
 const hint=teacher?teacherLanguageHomeHint(s.teachingMode,s.learnerSpeakingLevel,native,target,locale!=="zh-TW",locale,key=>t("teacher:languageHint."+key,{native,target})):t(mode==="natural"?"friends:chatModeHintNatural":mode==="immersion"?"friends:chatModeHintImmersion":"friends:chatModeHintBilingual");
 const title=t(teacher?"settings:group.teacherRolePreferences":"settings:group.friendRolePreferences");
 const modeLabel=t(teacher?"teacher:tutor.guidance":"friends:chatModeTitle");
 const paceLabel=t("teacher:tutor.pace");
 return createPortal(<dialog ref={ref} className="crew-role-preferences-dialog" aria-labelledby={titleId} onCancel={e=>{e.preventDefault();closeRef.current()}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeRef.current()}}}>
  <header className="crew-role-preferences-header"><h2 id={titleId}>{title}</h2><button type="button" autoFocus onClick={onClose} aria-label={t("teacher:picker.close")}>×</button></header>
  <div className="crew-role-preferences-body">
   <label>{t("settings:group.targetLanguage")}<select value={s.targetLanguage} onChange={event=>s.setTargetLanguage(event.target.value)}>{TARGET_LANGUAGES.map(({value})=><option key={value} value={value}>{t("friends:languages."+value,{defaultValue:value})}</option>)}</select><small>{t("settings:group.sharedTargetHint")}</small></label>
   <div className="crew-role-setting" role="group" aria-label={modeLabel}><strong>{modeLabel}</strong><div className="crew-role-segmented">
    {(teacher?["beginner","bilingual","immersion"]:["natural","bilingual","immersion"]).map(value=><button type="button" key={value} aria-pressed={mode===value} onClick={()=>teacher?s.setTeachingMode(value as TeachingMode):s.setFriendChatMode(value as FriendChatLanguageMode)}>{t(teacher?"teacher:tutor.guidanceChoices."+value:"friends:chatMode"+(value==="natural"?"Natural":value==="bilingual"?"Bilingual":"Immersion"))}</button>)}
   </div><small>{hint}</small></div>
   <div className="crew-role-setting" role="group" aria-label={paceLabel}><strong>{paceLabel}</strong><div className="crew-role-segmented">{(["slow","normal","fast"] as const).map(value=><button type="button" key={value} aria-pressed={pace===value} onClick={()=>(teacher?s.setSpeakingPace:s.setFriendSpeakingPace)(value as SpeakingPace)}>{t("teacher:tutor.shortSpeed."+value)}</button>)}</div></div>
   <label>{t("teacher:tutor.accent")}<select value={normalizedAccent(s.targetLanguage,accent)} onChange={e=>(teacher?s.setLanguageStyle:s.setFriendLanguageStyle)(e.target.value as typeof accent)}>{accentOptions(s.targetLanguage).filter(x=>teacher||x.value!=="custom"||accent==="custom").map(x=><option key={x.value} value={x.value}>{x.value==="auto"?t("settings:group.automatic"):x.value==="custom"?t("teacher:tutor.customAccent"):locale==="zh-TW"?x.label:x.instruction}</option>)}</select></label>
   <details className="crew-role-advanced"><summary>{t("settings:gemini.advanced")}</summary>
    <label>{t("settings:group.nativeLanguage")}<select value={s.nativeLanguage} onChange={e=>s.setNativeLanguage(e.target.value as typeof s.nativeLanguage)}>{NATIVE_LANGUAGES.map(([value])=><option key={value} value={value}>{localizedNativeName(value,locale)}</option>)}</select><small>{t("settings:group.sharedNativeHint")}</small></label>
    {teacher&&<><label>{t("teacher:tutor.speakingLevel")}<select value={s.learnerSpeakingLevel} onChange={e=>s.setLearnerSpeakingLevel(e.target.value as typeof s.learnerSpeakingLevel)}><option value="auto">{t("teacher:tutor.speakingLevelAuto")}</option>{(["A1","A2","B1","B2"] as const).map(value=><option key={value} value={value}>{value} · {t("teacher:tutor.levels."+value)}</option>)}</select></label>
     <label>{t("teacher:tutor.interaction")}<select value={s.conversationMode} onChange={e=>s.setConversationMode(e.target.value as ConversationMode)}>{(["natural","practice","scenario"] as const).map(value=><option key={value} value={value}>{t("teacher:tutor.modes."+value)}</option>)}</select><small>{t("teacher:tutor.interactionDesc")}</small></label>
     {s.conversationMode==="scenario"&&<label>{t("teacher:tutor.scenes.title")}<select value={scene} onChange={e=>{setScene(e.target.value);localStorage.setItem("crew_teacher_scenario",e.target.value);window.dispatchEvent(new Event("crew-teacher-scene-changed"))}}>{SCENES.map(value=><option key={value} value={value}>{t("teacher:tutor.scenes."+value)}</option>)}</select></label>}
     <TeacherPinyinSetting targetLanguage={s.targetLanguage} value={s.pronunciationAidMode} onChange={s.setPronunciationAidMode} english={locale!=="zh-TW"}/>
     {s.languageStyle==="custom"&&<label>{t("teacher:tutor.customAccent")}<input value={s.customAccent} onChange={e=>s.setCustomAccent(e.target.value)} placeholder={t("teacher:tutor.customPlaceholder")}/></label>}
     <label>{t("teacher:tutor.accentStrength")}<select value={s.accentStrength} onChange={e=>s.setAccentStrength(e.target.value as typeof s.accentStrength)}>{(["subtle","natural","noticeable"] as const).map(value=><option key={value} value={value}>{t("teacher:tutor.strength."+value)}</option>)}</select></label>
    </>}
   </details>
   <p className="crew-role-preferences-note">{t("settings:group.roleSharedHint")}</p><small>{t("teacher:tutor.preferences")}</small>
  </div>
  <footer className="crew-role-preferences-footer"><button type="button" className="btn" onClick={onClose}>{t("teacher:picker.close")}</button></footer>
 </dialog>,document.body);
}
