import{useEffect,useRef,useState}from"react";import{useClientReady}from"../lib/useClientReady";import{useTranslation}from"react-i18next";
import{Link,useLocation}from"react-router-dom";
import{useTeacherStore,type ConversationMode,type SpeakingPace}from"../store/teacherStore";
import{NATIVE_LANGUAGES,localizedNativeName}from"./teacherLocale";
import{friendSpokenLanguage}from"../friends/friendLanguage";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import {TeacherPinyinSetting} from "./TeacherPinyinSetting";
import{teacherLanguageHomeHint}from"./teacherLanguageUx";
import{getTeacherProfile}from"./teacherProfiles";
import{teacherProfileDisplay}from"./teacherProfileLocale";
import{TeacherProfilePicker}from"./TeacherProfilePicker";
import{TeacherAvatar}from"./TeacherAvatar";
import{previewTeacherVoice,type PreviewStatus}from"./teacherVoicePreview";
import{accentLabel,accentOptions,normalizedAccent}from"./teacherAccent";

const CHAT_OPTIONS:{value:ConversationMode;label:string}[]=[
 {value:"natural",label:"自然聊天"},{value:"practice",label:"口說練習"},{value:"scenario",label:"情境練習"}
];
const PACE_OPTIONS:{value:SpeakingPace;label:string}[]=[
 {value:"slow",label:"慢"},{value:"normal",label:"正常"},{value:"fast",label:"快"}
];
const SCENES=[
 {id:"hotel_checkin",title:"飯店入住"},{id:"restaurant_order",title:"餐廳點餐"},
 {id:"work_meeting",title:"工作會議"},{id:"transport",title:"交通問路"}
];

export function TutorPage(){
 const {t,i18n:locale}=useTranslation("teacher");const english=locale.resolvedLanguage==="en",chinese=locale.resolvedLanguage==="zh-TW";
 const location=useLocation();
 const ready=useClientReady();
 const s=useTeacherStore(),[picker,setPicker]=useState(()=>Boolean((location.state as {openTeacherPicker?:boolean}|null)?.openTeacherPicker)),profile=getTeacherProfile(s.teacherProfile);
 const profileCopy=teacherProfileDisplay(profile,locale.resolvedLanguage||"en");
 const displayNative=ready?s.nativeLanguage:"zh-TW",displayTarget=ready?s.targetLanguage:"英文";
 const uiLanguage=locale.resolvedLanguage||locale.language;
 const nativeName=localizedNativeName(displayNative,uiLanguage);
 const targetName=t("friends:languages."+displayTarget,{defaultValue:friendSpokenLanguage(displayTarget)});
 const[preview,setPreview]=useState<PreviewStatus|null>(null),stopRef=useRef<null|(()=>void)>(null);
 const[scene,setScene]=useState(()=>localStorage.getItem("crew_teacher_scenario")||"hotel_checkin");
 const stopPreview=()=>{stopRef.current?.();stopRef.current=null;setPreview(null)};
 useEffect(()=>()=>{stopRef.current?.()},[]);
 function audition(){
  stopPreview();
  stopRef.current=previewTeacherVoice(profile,s.targetLanguage,setPreview,{voice:s.voice,
   languageStyle:s.languageStyle,accentStrength:s.accentStrength,customAccent:s.customAccent,speakingPace:s.speakingPace});
 }
 const startPath="/teacher/live"+(s.conversationMode==="scenario"?"?mission="+encodeURIComponent(scene):"");
 return <>
 <section className="hero teacher-home-heading"><h1>{t("tutor.title")}</h1><p>{t("tutor.intro")}</p></section>
 <section className="section teacher-home">
  <div className="panel teacher-home-hero">
   <div className="teacher-home-identity">
    <button type="button" className="teacher-avatar-button teacher-home-avatar" aria-label={t("tutor.change")} onClick={()=>{stopPreview();setPicker(true)}}><TeacherAvatar profile={profile}/></button>
    <div className="teacher-home-copy"><span className="kicker">{t("tutor.current")}</span><h2>{profile.name}</h2><strong>{chinese?profile.title:profileCopy.title}</strong><p>{profileCopy.description}</p></div>
   </div>
   <p className="teacher-native-help" role="note">{teacherLanguageHomeHint(
     s.teachingMode,s.learnerSpeakingLevel,nativeName,targetName,english,uiLanguage,
     key=>t("languageHint."+key,{native:nativeName,target:targetName}))}</p>
   <div className="teacher-home-actions">
    <button className="btn secondary" type="button" onClick={()=>{stopPreview();setPicker(true)}}>{t("tutor.change")}</button>
    <button className="btn secondary" type="button" onClick={preview?.state==="connecting"||preview?.state==="playing"?stopPreview:audition}
      aria-live="polite">{preview?.state==="connecting"?t("tutor.connecting"):preview?.state==="playing"?t("tutor.stop"):preview?.state==="finished"?t("tutor.again"):preview?.state==="error"?t("tutor.retry"):t("tutor.listen")}</button>
   </div>
   {preview?.state==="error"&&<p className="teacher-preview-error" role="alert">{preview.message}</p>}
   <Link className="primary-wide teacher-home-start" to={startPath} onClick={stopPreview}>{t("tutor.start",{name:profile.name})} <span aria-hidden="true">→</span></Link>
  </div>
 </section>
 <section className="section teacher-precall-settings panel"><label>{t("tutor.language")}<select className="field" value={displayTarget} onChange={e=>s.setTargetLanguage(e.target.value)}>{TARGET_LANGUAGES.map(x=>x.value).map(v=><option key={v} value={v}>{t("friends:languages."+v)}</option>)}</select></label><label>{t("tutor.pace")}<select className="field" value={s.speakingPace} onChange={e=>s.setSpeakingPace(e.target.value as SpeakingPace)}><option value="slow">{t("tutor.speed.slow")}</option><option value="normal">{t("tutor.shortSpeed.normal")}</option><option value="fast">{t("tutor.speed.fast")}</option></select></label><label>{t("tutor.speakingLevel")}<select className="field" value={s.learnerSpeakingLevel} onChange={e=>s.setLearnerSpeakingLevel(e.target.value as typeof s.learnerSpeakingLevel)}><option value="auto">{t("tutor.speakingLevelAuto")}</option><option value="A1">A1 · {t("tutor.levels.A1")}</option><option value="A2">A2 · {t("tutor.levels.A2")}</option><option value="B1">B1 · {t("tutor.levels.B1")}</option><option value="B2">B2+ · {t("tutor.levels.B2")}</option></select></label><TeacherPinyinSetting targetLanguage={displayTarget} value={s.pronunciationAidMode} onChange={s.setPronunciationAidMode} english={english} /></section>
  <section className="section teacher-quick-config">
  <div className="section-head"><h2>{t("tutor.interaction")}</h2><small>{t("tutor.nextChat")}</small></div>
  <div className="panel teacher-choice-panel">
   <p className="meta">{t("tutor.interactionDesc")}</p>
   <div className="teacher-segmented" role="group" aria-label={t("tutor.interaction")}>{CHAT_OPTIONS.map(a=><button type="button" key={a.value} aria-pressed={s.conversationMode===a.value} className={s.conversationMode===a.value?"selected":""} onClick={()=>s.setConversationMode(a.value)}>{t("tutor.modes."+a.value)}</button>)}</div>
   {s.conversationMode==="scenario"&&<div className="teacher-scene-selection"><span className="label">{t("tutor.scenes.title")}</span><div className="teacher-scene-choices">{SCENES.map(x=><button type="button" key={x.id} aria-pressed={scene===x.id} className={scene===x.id?"selected":""} onClick={()=>{setScene(x.id);localStorage.setItem("crew_teacher_scenario",x.id)}}>{t("tutor.scenes."+x.id)}</button>)}</div></div>}
  </div>
 </section>
 <section className="section teacher-advanced-section">
  <details className="panel teacher-advanced-settings">
   <summary><span><strong>{t("tutor.advanced")}</strong><small>{targetName} · {accentLabel(s.targetLanguage,s.languageStyle)} · {t("tutor.speed."+s.speakingPace)}</small></span><span className="teacher-advanced-chevron" aria-hidden="true">⌄</span></summary>
   <div className="teacher-advanced-body">
    <div className="settings-grid">
     <label><span className="label">{t("tutor.language")}</span><select className="field" value={displayTarget} onChange={e=>s.setTargetLanguage(e.target.value)}>{TARGET_LANGUAGES.map(x=>x.value).map(l=><option key={l} value={l}>{t("friends:languages."+l)}</option>)}</select></label>
     <label><span className="label">{t("tutor.nativeLanguage")}</span><select className="field" value={displayNative} onChange={e=>s.setNativeLanguage(e.target.value as typeof s.nativeLanguage)}>{NATIVE_LANGUAGES.map(([value])=><option key={value} value={value}>{localizedNativeName(value,locale.resolvedLanguage||"en")}</option>)}</select></label>
     <label><span className="label">{t("tutor.accent")}</span><select className="field" aria-label={t("tutor.accentSelect")} value={normalizedAccent(s.targetLanguage,s.languageStyle)} onChange={e=>s.setLanguageStyle(e.target.value as typeof s.languageStyle)}>{accentOptions(s.targetLanguage).map(a=><option value={a.value} key={a.value}>{a.label}</option>)}</select></label>
     <label><span className="label">{t("tutor.guidance")}</span><select id="teacher-guidance" className="field" value={s.teachingMode} onChange={e=>s.setTeachingMode(e.target.value as typeof s.teachingMode)}>
      <option value="beginner">{t("tutor.guidanceChoices.beginner")}</option><option value="bilingual">{t("tutor.guidanceChoices.bilingual")}</option><option value="immersion">{t("tutor.guidanceChoices.immersion")}</option>
     </select></label>
    </div>
    {s.languageStyle==="custom"&&<label><span className="label">{t("tutor.customAccent")}</span><input className="field" value={s.customAccent} onChange={e=>s.setCustomAccent(e.target.value)} placeholder={t("tutor.customPlaceholder")}/></label>}
    <span className="label">{t("tutor.paceLabel")}</span>
    <div className="teacher-segmented" role="group" aria-label={t("tutor.teacherPace")}>{PACE_OPTIONS.map(a=><button type="button" key={a.value} aria-pressed={s.speakingPace===a.value} className={s.speakingPace===a.value?"selected":""} onClick={()=>s.setSpeakingPace(a.value)}>{t("tutor.shortSpeed."+a.value)}</button>)}</div>
    <details className="teacher-setting-advanced"><summary>{t("tutor.advancedAccent")}</summary><div className="teacher-segmented" role="group" aria-label={t("tutor.accentStrength")}>{([{value:"subtle",label:"輕微"},{value:"natural",label:"自然"},{value:"noticeable",label:"明顯"}] as const).map(a=><button key={a.value} type="button" aria-pressed={s.accentStrength===a.value} className={s.accentStrength===a.value?"selected":""} onClick={()=>s.setAccentStrength(a.value)}>{t("tutor.strength."+a.value)}</button>)}</div></details>
    <p className="meta">{t("tutor.preferences")}</p>
   </div>
  </details>
 </section>
 {picker&&<TeacherProfilePicker onClose={()=>setPicker(false)}/>}
 </>;
}
