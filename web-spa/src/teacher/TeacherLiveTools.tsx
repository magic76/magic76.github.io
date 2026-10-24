import {useRef} from "react";
import {useLiveSession} from "../live/useLiveSession";
import {useTeacherStore} from "../store/teacherStore";
import {getTeacherProfile} from "./teacherProfiles";
import {TeacherAvatar} from "./TeacherAvatar";
import {accentOptions,normalizedAccent} from "./teacherAccent";
import {storedSpeakingLevel} from "./speakingLevelMemory";
import {personalMemoryEnabled} from "./studentMemory";
import {isMandarinTarget,PINYIN_AID_OPTIONS} from "./pinyinAid";
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
 const cameraFile=useRef<HTMLInputElement>(null);
 const galleryFile=useRef<HTMLInputElement>(null);
 return <details className="live-more"><summary>更多功能</summary><div className="live-more-body">
   <button className="teacher-current-row live-teacher-row" disabled={sessionActive} onClick={onPickTeacher}><span className="teacher-current-avatar"><TeacherAvatar profile={profile} decorative/></span><span><span className="label">老師</span><strong>{profile.name} · {profile.title}</strong><small>{sessionActive?"結束這次練習後可切換":"點擊切換"}</small></span></button>
   <div className={"live-config "+(sessionActive?"locked":"")}><div className="live-setup-grid">
    <label><span className="label">目標語言</span><select className="field" disabled={sessionActive} value={s.targetLanguage} onChange={e=>s.setTargetLanguage(e.target.value)}>{TARGET_LANGUAGES.map(({value})=><option key={value} value={value}>{value}</option>)}</select></label>
    <label><span className="label">聊天模式</span><select className="field" disabled={sessionActive} value={s.conversationMode} onChange={e=>s.setConversationMode(e.target.value as any)}><option value="natural">自然聊天</option><option value="scenario">情境聊天</option><option value="practice">練習聊天</option></select></label>
    <label><span className="label">我的口說程度</span><select className="field" disabled={sessionActive} value={s.learnerSpeakingLevel} onChange={e=>s.setLearnerSpeakingLevel(e.target.value as typeof s.learnerSpeakingLevel)}><option value="auto">自動 · 依長期口說調整</option><option value="A1">A1</option><option value="A2">A2</option><option value="B1">B1</option><option value="B2">B2+</option></select></label>{s.learnerSpeakingLevel==="auto"&&storedSpeakingLevel(s.targetLanguage,personalMemoryEnabled())&&
       <p className="live-config-note">長期對話引導：目前偏 {storedSpeakingLevel(s.targetLanguage,personalMemoryEnabled())}（非正式檢定，下一次對話生效）</p>}
      <label><span className="label">教學模式</span><select className="field" disabled={sessionActive} value={s.teachingMode} onChange={e=>s.setTeachingMode(e.target.value as any)}><option value="beginner">零基礎引導</option><option value="bilingual">雙語輔助</option><option value="immersion">全外語沉浸</option></select></label>
    <label><span className="label">語速</span><select className="field" disabled={sessionActive} value={s.speakingPace} onChange={e=>s.setSpeakingPace(e.target.value as any)}><option value="slow">慢</option><option value="normal">正常</option><option value="fast">快</option></select></label>
    <label><span className="label">地區口音</span><select className="field" disabled={sessionActive} value={normalizedAccent(s.targetLanguage,s.languageStyle)} onChange={e=>s.setLanguageStyle(e.target.value as any)}>{accentOptions(s.targetLanguage).map(a=><option key={a.value} value={a.value}>{a.label}</option>)}</select></label>
   </div>{sessionActive&&<p className="live-config-note">這些設定會套用到下一次對話；目前這次不會中途改變。</p>}</div>
   {isMandarinTarget(s.targetLanguage)&&<label className="crew-pinyin-setting"><span className="label">中文拼音輔助 · 可即時調整</span><select className="field" aria-label="中文拼音輔助" value={s.pronunciationAidMode} onChange={e=>s.setPronunciationAidMode(e.target.value as typeof s.pronunciationAidMode)}>{PINYIN_AID_OPTIONS.map(o=><option value={o.value} key={o.value}>{o.label}</option>)}</select></label>}
   <div className="vision-box"><div className="vision-head"><strong>讓 {profile.name} 看一張圖</strong><span>教材 · 題目 · 菜單 · 路牌</span></div><div className="vision-actions"><button className="vision-btn" disabled={live.state!=="listening"||live.visionSending} onClick={()=>cameraFile.current?.click()}>{live.visionSending?"正在送出…":"拍照"}</button><button className="vision-btn" disabled={live.state!=="listening"||live.visionSending} onClick={()=>galleryFile.current?.click()}>從相簿選</button></div><input ref={cameraFile} type="file" accept="image/*" capture="environment" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void live.sendImageFile(f,"請先真的看最新這張圖，再以目前目標語言直接帶我學。先問一個和圖片直接相關的問題，不要重新打招呼。");e.currentTarget.value=""}}/><input ref={galleryFile} type="file" accept="image/*" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void live.sendImageFile(f,"請先真的看最新這張圖，再以目前目標語言直接帶我學。先問一個和圖片直接相關的問題，不要重新打招呼。");e.currentTarget.value=""}}/>{live.lastImage&&<div className="vision-latest"><img src={live.lastImage.preview} alt="最新送出的照片"/><span><b>已送給 {profile.name}</b><small>最新照片{live.lastImage.width&&live.lastImage.height?" · "+live.lastImage.width+"×"+live.lastImage.height:""}</small></span></div>}{live.visionError&&<p className="vision-error">{live.visionError}</p>}</div>
  </div></details>;
}
