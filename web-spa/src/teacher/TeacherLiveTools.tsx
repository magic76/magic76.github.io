import {useRef} from "react";
import {useTranslation} from "react-i18next";
import {useLiveSession} from "../live/useLiveSession";
import {useTeacherStore} from "../store/teacherStore";
import {getTeacherProfile} from "./teacherProfiles";
import {TeacherAvatar} from "./TeacherAvatar";
import {accentOptions,normalizedAccent,accentLabel} from "./teacherAccent";
import {storedSpeakingLevel} from "./speakingLevelMemory";
import {personalMemoryEnabled} from "./studentMemory";
import {TeacherPinyinSetting} from "./TeacherPinyinSetting";
import {TARGET_LANGUAGES} from "./targetLanguages";

type Props={
 live:ReturnType<typeof useLiveSession>;
 store:ReturnType<typeof useTeacherStore.getState>;
 profile:ReturnType<typeof getTeacherProfile>;
 sessionActive:boolean;
 onPickTeacher:()=>void;
};

/** Optional teacher settings and image input, separate from Live turn management. */
export function TeacherLiveTools({live,store:s,profile,sessionActive,onPickTeacher}:Props){
 const {t,i18n}=useTranslation(["lesson","teacher"]),zh=i18n.language==="zh-TW";
 const cameraFile=useRef<HTMLInputElement>(null);
 const galleryFile=useRef<HTMLInputElement>(null);
 return <details className="live-more"><summary>{t("live.tools.more")}</summary><div className="live-more-body">
   <button className="teacher-current-row live-teacher-row" disabled={sessionActive} onClick={onPickTeacher}><span className="teacher-current-avatar"><TeacherAvatar profile={profile} decorative/></span><span><span className="label">{t("textbook.camera.teacher")}</span><strong>{profile.name} · {profile.title}</strong><small>{sessionActive?t("live.tools.switchLater"):t("live.tools.switchNow")}</small></span></button>
   <div className={"live-config "+(sessionActive?"locked":"")}><div className="live-setup-grid">
    <label><span className="label">{t("textbook.targetLanguage")}</span><select className="field" disabled={sessionActive} value={s.targetLanguage} onChange={e=>s.setTargetLanguage(e.target.value)}>{TARGET_LANGUAGES.map(({value})=><option key={value} value={value}>{zh?value:t("friends:languages."+value)}</option>)}</select></label>
    <label><span className="label">{t("live.tools.chatMode")}</span><select className="field" disabled={sessionActive} value={s.conversationMode} onChange={e=>s.setConversationMode(e.target.value as any)}><option value="natural">{t("tutor.modes.natural")}</option><option value="scenario">{t("live.tools.scenarioChat")}</option><option value="practice">{t("live.tools.practiceChat")}</option></select></label>
    <label><span className="label">{t("live.tools.level")}</span><select className="field" disabled={sessionActive} value={s.learnerSpeakingLevel} onChange={e=>s.setLearnerSpeakingLevel(e.target.value as typeof s.learnerSpeakingLevel)}><option value="auto">{t("live.tools.levelAuto")}</option><option value="A1">A1</option><option value="A2">A2</option><option value="B1">B1</option><option value="B2">B2+</option></select></label>{s.learnerSpeakingLevel==="auto"&&storedSpeakingLevel(s.targetLanguage,personalMemoryEnabled())&&
       <p className="live-config-note">{t("live.tools.levelNote",{level:storedSpeakingLevel(s.targetLanguage,personalMemoryEnabled())})}</p>}
    <label><span className="label">{t("tutor.paceLabel")}</span><select className="field" disabled={sessionActive} value={s.speakingPace} onChange={e=>s.setSpeakingPace(e.target.value as any)}><option value="slow">{t("tutor.shortSpeed.slow")}</option><option value="normal">{t("tutor.shortSpeed.normal")}</option><option value="fast">{t("tutor.shortSpeed.fast")}</option></select></label>
    <label><span className="label">{t("tutor.accent")}</span><select className="field" disabled={sessionActive} value={normalizedAccent(s.targetLanguage,s.languageStyle)} onChange={e=>s.setLanguageStyle(e.target.value as any)}>{accentOptions(s.targetLanguage).map(a=><option key={a.value} value={a.value}>{accentLabel(s.targetLanguage,a.value,i18n.resolvedLanguage||i18n.language,t("settings:group.automatic"),t("teacher:tutor.customAccent"))}</option>)}</select></label>
   </div>{sessionActive&&<p className="live-config-note">{t("live.tools.nextNote")}</p>}</div>
   <TeacherPinyinSetting targetLanguage={s.targetLanguage} value={s.pronunciationAidMode} onChange={s.setPronunciationAidMode} english={i18n.language==="en"} />
   <div className="vision-box"><div className="vision-head"><strong>{t("live.tools.showImage",{name:profile.name})}</strong><span>{t("live.tools.imageExamples")}</span></div><div className="vision-actions"><button className="vision-btn" disabled={live.state!=="listening"||live.visionSending} onClick={()=>cameraFile.current?.click()}>{live.visionSending?t("live.tools.sending"):t("live.tools.takePhoto")}</button><button className="vision-btn" disabled={live.state!=="listening"||live.visionSending} onClick={()=>galleryFile.current?.click()}>{t("live.tools.fromGallery")}</button></div><input ref={cameraFile} type="file" accept="image/*" capture="environment" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void live.sendImageFile(f,"請先真的看最新這張圖，再以目前目標語言直接帶我學。先問一個和圖片直接相關的問題，不要重新打招呼。");e.currentTarget.value=""}}/><input ref={galleryFile} type="file" accept="image/*" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void live.sendImageFile(f,"請先真的看最新這張圖，再以目前目標語言直接帶我學。先問一個和圖片直接相關的問題，不要重新打招呼。");e.currentTarget.value=""}}/>{live.lastImage&&<div className="vision-latest"><img src={live.lastImage.preview} alt={t("live.tools.latestAlt")}/><span><b>{t("live.tools.sentTo",{name:profile.name})}</b><small>{t("live.tools.latest")}{live.lastImage.width&&live.lastImage.height?" · "+live.lastImage.width+"×"+live.lastImage.height:""}</small></span></div>}{live.visionError&&<p className="vision-error">{live.visionError}</p>}</div>
  </div></details>;
}
