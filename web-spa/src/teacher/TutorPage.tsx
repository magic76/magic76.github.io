import{useEffect,useRef,useState}from"react";
import{Link}from"react-router-dom";
import{useTeacherStore,type ConversationMode,type SpeakingPace}from"../store/teacherStore";
import{NATIVE_LANGUAGES,teacherText}from"./teacherLocale";
import{getTeacherProfile}from"./teacherProfiles";
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
 const s=useTeacherStore(),[picker,setPicker]=useState(false),profile=getTeacherProfile(s.teacherProfile);
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
 <section className="hero teacher-home-heading"><span className="kicker">CREW TEACHER</span><h1>和老師練習</h1><p>選一位適合你的老師，照自己的步調開口。</p></section>
 <section className="section teacher-home">
  <div className="panel teacher-home-hero">
   <div className="teacher-home-identity">
    <button type="button" className="teacher-avatar-button teacher-home-avatar" aria-label="更換老師" onClick={()=>{stopPreview();setPicker(true)}}><TeacherAvatar profile={profile}/></button>
    <div className="teacher-home-copy"><span className="kicker">目前的 Crew 老師</span><h2>{profile.name}</h2><strong>{profile.title}</strong><p>{profile.description}</p></div>
   </div>
   <div className="teacher-home-actions">
    <button className="btn secondary" type="button" onClick={()=>{stopPreview();setPicker(true)}}>更換老師</button>
    <button className="btn secondary" type="button" onClick={preview?.state==="connecting"||preview?.state==="playing"?stopPreview:audition}
      aria-live="polite">{preview?.state==="connecting"?"正在連線…":preview?.state==="playing"?"停止試聽":preview?.state==="finished"?"再次試聽":preview?.state==="error"?"重試試聽":"試聽老師"}</button>
   </div>
   {preview?.state==="error"&&<p className="teacher-preview-error" role="alert">{preview.message}</p>}
   <Link className="primary-wide teacher-home-start" to={startPath} onClick={stopPreview}>和 {profile.name} 開始口說 <span aria-hidden="true">→</span></Link>
  </div>
 </section>
 <section className="section teacher-precall-settings panel"><label>對話語言<select className="field" value={s.targetLanguage} onChange={e=>s.setTargetLanguage(e.target.value)}>{["英文","日文","韓文","西班牙文","法文"].map(v=><option key={v}>{v}</option>)}</select></label><label>說話速度<select className="field" value={s.speakingPace} onChange={e=>s.setSpeakingPace(e.target.value as SpeakingPace)}><option value="slow">慢速</option><option value="normal">正常</option><option value="fast">快速</option></select></label></section>
  <section className="section teacher-quick-config">
  <div className="section-head"><h2>互動方式</h2><small>下次對話生效</small></div>
  <div className="panel teacher-choice-panel">
   <p className="meta">自然聊天不會每句糾錯；口說練習重視回饋；情境練習直接進入角色。</p>
   <div className="teacher-segmented" role="group" aria-label="聊天模式">{CHAT_OPTIONS.map(a=><button type="button" key={a.value} aria-pressed={s.conversationMode===a.value} className={s.conversationMode===a.value?"selected":""} onClick={()=>s.setConversationMode(a.value)}>{a.label}</button>)}</div>
   {s.conversationMode==="scenario"&&<div className="teacher-scene-selection"><span className="label">選擇情境</span><div className="teacher-scene-choices">{SCENES.map(x=><button type="button" key={x.id} aria-pressed={scene===x.id} className={scene===x.id?"selected":""} onClick={()=>{setScene(x.id);localStorage.setItem("crew_teacher_scenario",x.id)}}>{x.title}</button>)}</div></div>}
  </div>
 </section>
 <section className="section teacher-advanced-section">
  <details className="panel teacher-advanced-settings">
   <summary><span><strong>老師與語言偏好</strong><small>{s.targetLanguage} · {accentLabel(s.targetLanguage,s.languageStyle)} · {s.speakingPace==="normal"?"正常語速":s.speakingPace==="slow"?"慢速":"快速"}</small></span><span className="teacher-advanced-chevron" aria-hidden="true">⌄</span></summary>
   <div className="teacher-advanced-body">
    <div className="settings-grid">
     <label><span className="label">{teacherText(s.nativeLanguage,"targetLanguage")}</span><select className="field" value={s.targetLanguage} onChange={e=>s.setTargetLanguage(e.target.value)}>{["英文","日文","韓文","西班牙文","法文"].map(l=><option key={l}>{l}</option>)}</select></label>
     <label><span className="label">{teacherText(s.nativeLanguage,"nativeLanguage")}</span><select className="field" value={s.nativeLanguage} onChange={e=>s.setNativeLanguage(e.target.value as typeof s.nativeLanguage)}>{NATIVE_LANGUAGES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
     <label><span className="label">地區口音</span><select className="field" aria-label="選擇地區口音" value={normalizedAccent(s.targetLanguage,s.languageStyle)} onChange={e=>s.setLanguageStyle(e.target.value as typeof s.languageStyle)}>{accentOptions(s.targetLanguage).map(a=><option value={a.value} key={a.value}>{a.label}</option>)}</select></label>
     <label><span className="label">教學引導</span><select id="teacher-guidance" className="field" value={s.teachingMode} onChange={e=>s.setTeachingMode(e.target.value as typeof s.teachingMode)}>
      <option value="beginner">零基礎引導</option><option value="bilingual">雙語輔助</option><option value="immersion">全外語沉浸</option>
     </select></label>
    </div>
    {s.languageStyle==="custom"&&<label><span className="label">自訂口音</span><input className="field" value={s.customAccent} onChange={e=>s.setCustomAccent(e.target.value)} placeholder="例如：清晰、自然的加拿大英語"/></label>}
    <span className="label">語速</span>
    <div className="teacher-segmented" role="group" aria-label="老師語速">{PACE_OPTIONS.map(a=><button type="button" key={a.value} aria-pressed={s.speakingPace===a.value} className={s.speakingPace===a.value?"selected":""} onClick={()=>s.setSpeakingPace(a.value)}>{a.label}</button>)}</div>
    <details className="teacher-setting-advanced"><summary>進階 · 口音強度</summary><div className="teacher-segmented" role="group" aria-label="口音強度">{([{value:"subtle",label:"輕微"},{value:"natural",label:"自然"},{value:"noticeable",label:"明顯"}] as const).map(a=><button key={a.value} type="button" aria-pressed={s.accentStrength===a.value} className={s.accentStrength===a.value?"selected":""} onClick={()=>s.setAccentStrength(a.value)}>{a.label}</button>)}</div></details>
    <p className="meta">偏好會套用到下一次對話；實際聲音表現由語音模型控制。</p>
   </div>
  </details>
 </section>
 {picker&&<TeacherProfilePicker onClose={()=>setPicker(false)}/>}
 </>;
}
