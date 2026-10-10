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
 <section className="hero teacher-home-heading"><span className="kicker">Crew Teacher</span><h1>你的老師</h1><p>選好老師與聊天方式，直接開始對話。</p></section>
 <section className="section teacher-home">
  <div className="panel teacher-home-hero">
   <div className="teacher-home-identity">
    <button type="button" className="teacher-avatar-button teacher-home-avatar" aria-label="更換老師" onClick={()=>{stopPreview();setPicker(true)}}><TeacherAvatar profile={profile}/></button>
    <div className="teacher-home-copy"><span className="kicker">目前老師</span><h2>{profile.name}</h2><strong>{profile.title}</strong><p>{profile.description}</p></div>
   </div>
   <div className="teacher-home-actions">
    <button className="btn secondary" onClick={()=>{stopPreview();setPicker(true)}}>更換老師</button>
    <button className="btn secondary" onClick={preview?.state==="connecting"||preview?.state==="playing"?stopPreview:audition}
      aria-live="polite">{preview?.state==="connecting"?"正在連線…":preview?.state==="playing"?"停止試聽":preview?.state==="finished"?"再次試聽":preview?.state==="error"?"重試試聽":"試聽老師"}</button>
   </div>
   {preview?.state==="error"&&<p className="teacher-preview-error" role="alert">{preview.message}</p>}
   <Link className="primary-wide teacher-home-start" to={startPath} onClick={stopPreview}>開始聊天 <span aria-hidden="true">→</span></Link>
  </div>
 </section>
 <section className="section teacher-quick-config"><div className="section-head"><h2>老師說話方式</h2><small>下次對話生效</small></div>
  <div className="settings-grid">
   <div className="panel teacher-choice-panel"><span className="label">地區口音</span>
    <div className="teacher-setting-inline"><strong>{accentLabel(s.targetLanguage,s.languageStyle)}</strong>
     <select className="field" aria-label="選擇地區口音" value={normalizedAccent(s.targetLanguage,s.languageStyle)}
      onChange={e=>s.setLanguageStyle(e.target.value as typeof s.languageStyle)}>{accentOptions(s.targetLanguage).map(a=><option value={a.value} key={a.value}>{a.label}</option>)}</select>
    </div>
    {s.languageStyle==="custom"&&<input className="field" aria-label="自訂口音" value={s.customAccent} onChange={e=>s.setCustomAccent(e.target.value)} placeholder="例如：清晰、自然的加拿大英語"/>}
    <details className="teacher-setting-advanced"><summary>進階設定 · 口音強度</summary>
     <div className="teacher-segmented" role="group" aria-label="口音強度">{([{value:"subtle",label:"輕微"},{value:"natural",label:"自然"},{value:"noticeable",label:"明顯"}] as const).map(a=><button key={a.value} type="button" aria-pressed={s.accentStrength===a.value} className={s.accentStrength===a.value?"selected":""} onClick={()=>s.setAccentStrength(a.value)}>{a.label}</button>)}</div>
    </details>
   </div>
   <div className="panel teacher-choice-panel"><span className="label">語速</span><p className="meta">以自然語速提示老師；實際速度由語音模型控制。</p>
    <div className="teacher-segmented" role="group" aria-label="老師語速">{PACE_OPTIONS.map(a=><button type="button" key={a.value} aria-pressed={s.speakingPace===a.value} className={s.speakingPace===a.value?"selected":""} onClick={()=>s.setSpeakingPace(a.value)}>{a.label}</button>)}</div>
   </div>
  </div>
 </section>
 <section className="section teacher-quick-config"><div className="section-head"><h2>上課方式</h2><small>下次對話生效</small></div>
  <div className="panel teacher-choice-panel"><span className="label">聊天模式</span><p className="meta">自然聊天不逐句糾錯；口說練習才主動修正；情境練習由角色直接和你互動。</p>
   <div className="teacher-segmented" role="group" aria-label="聊天模式">{CHAT_OPTIONS.map(a=><button type="button" key={a.value} aria-pressed={s.conversationMode===a.value} className={s.conversationMode===a.value?"selected":""} onClick={()=>s.setConversationMode(a.value)}>{a.label}</button>)}</div>
   {s.conversationMode==="scenario"&&<div className="teacher-scene-selection"><span className="label">選擇情境</span><div className="teacher-scene-choices">{SCENES.map(x=><button type="button" key={x.id} aria-pressed={scene===x.id} className={scene===x.id?"selected":""} onClick={()=>{setScene(x.id);localStorage.setItem("crew_teacher_scenario",x.id)}}>{x.title}</button>)}</div></div>}
  </div>
  <div className="panel teacher-choice-panel"><label className="label" htmlFor="teacher-guidance">教學引導</label><select id="teacher-guidance" className="field" value={s.teachingMode} onChange={e=>s.setTeachingMode(e.target.value as typeof s.teachingMode)}>
   <option value="beginner">零基礎引導</option><option value="bilingual">雙語輔助</option><option value="immersion">全外語沉浸</option>
  </select></div>
 </section>
 <section className="section"><details className="panel teacher-learning-language"><summary>學習語言與母語</summary><div className="settings-grid">
  <label><span className="label">{teacherText(s.nativeLanguage,"targetLanguage")}</span><select className="field" value={s.targetLanguage} onChange={e=>s.setTargetLanguage(e.target.value)}>{["英文","日文","韓文","西班牙文","法文"].map(l=><option key={l}>{l}</option>)}</select></label>
  <label><span className="label">{teacherText(s.nativeLanguage,"nativeLanguage")}</span><select className="field" value={s.nativeLanguage} onChange={e=>s.setNativeLanguage(e.target.value as typeof s.nativeLanguage)}>{NATIVE_LANGUAGES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
 </div></details></section>
 {picker&&<TeacherProfilePicker onClose={()=>setPicker(false)}/>}
 </>;
}
