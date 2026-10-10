import{useCallback,useEffect,useRef,useState}from"react";
import{createPortal}from"react-dom";
import{TEACHER_PROFILES,TEACHER_CATEGORIES,type TeacherProfile,type TeacherCategory}from"./teacherProfiles";
import{useTeacherStore}from"../store/teacherStore";
import{TeacherAvatar}from"./TeacherAvatar";
import{completedTutorSessions}from"./teacherPracticeHistory";
import{previewTeacherVoice,type PreviewStatus}from"./teacherVoicePreview";

/** Matches Android's 16-profile gallery, without creating chat sessions for audition. */
export function TeacherProfilePicker({onClose}:{onClose:()=>void}){
 const active=useTeacherStore(s=>s.teacherProfile),targetLanguage=useTeacherStore(s=>s.targetLanguage);
 const select=useTeacherStore(s=>s.setTeacherProfile);
 const[category,setCategory]=useState<TeacherCategory>("all"),[detail,setDetail]=useState<TeacherProfile|null>(null);
 const[preview,setPreview]=useState<PreviewStatus|null>(null);
 const galleryScroll=useRef<HTMLDivElement>(null),previewStop=useRef<null|(()=>void)>(null);
 const closeButton=useRef<HTMLButtonElement>(null),onCloseRef=useRef(onClose);
 onCloseRef.current=onClose;
 const cancelPreview=useCallback(()=>{previewStop.current?.();previewStop.current=null;setPreview(null)},[]);
 const goBack=useCallback(()=>{cancelPreview();setDetail(null)},[cancelPreview]);
 useEffect(()=>{
  // Portal prevents route-transform animations from changing the fixed viewport origin.
  const oldOverflow=document.body.style.overflow,lastFocused=document.activeElement instanceof HTMLElement?document.activeElement:null;
  document.body.style.overflow="hidden";closeButton.current?.focus();
  const onKeyDown=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){event.preventDefault();if(detail)goBack();else onCloseRef.current()}
  };
  document.addEventListener("keydown",onKeyDown);
  return()=>{document.body.style.overflow=oldOverflow;document.removeEventListener("keydown",onKeyDown);previewStop.current?.();if(lastFocused?.isConnected)lastFocused.focus()};
 },[detail,goBack]);
 const filtered=TEACHER_PROFILES.filter(p=>category==="all"||p.categoryId===category);
 function changeCategory(value:TeacherCategory){setCategory(value);galleryScroll.current?.scrollTo({top:0,behavior:"auto"})}
 function playPreview(){
  if(!detail)return;
  cancelPreview();
  previewStop.current=previewTeacherVoice(detail,targetLanguage,setPreview);
 }
 function choose(profile:TeacherProfile){cancelPreview();select(profile.id);onCloseRef.current()}
 return createPortal(<div className="teacher-picker-backdrop" role="presentation" onClick={()=>onCloseRef.current()}>
  <section className="teacher-picker teacher-gallery-dialog" role="dialog" aria-modal="true" aria-labelledby="teacher-picker-title" onClick={event=>event.stopPropagation()}>
   <header className="teacher-gallery-header"><div>
    <span className="kicker">Crew Teacher</span>
    <h2 id="teacher-picker-title">{detail?detail.name:"選擇你的老師"}</h2>
    {!detail&&<p className="meta">16 位個性鮮明的老師，各有不同教學風格。點擊照片了解更多。</p>}
   </div><button ref={closeButton} className="teacher-picker-close" onClick={()=>onCloseRef.current()} aria-label="關閉">×</button></header>
   {!detail?<>
    <nav className="teacher-gallery-filter" aria-label="老師分類">
     {TEACHER_CATEGORIES.map(c=><button key={c.id} type="button" aria-pressed={category===c.id} className={category===c.id?"selected":""} onClick={()=>changeCategory(c.id)}>{c.label}</button>)}
    </nav>
    <div className="teacher-gallery-scroll" ref={galleryScroll}>
     <div className="teacher-picker-list teacher-gallery-grid">
      {filtered.map(profile=><button key={profile.id} className={"teacher-profile-option teacher-gallery-card "+(profile.id===active?"active":"")} type="button" onClick={()=>{cancelPreview();setDetail(profile)}} aria-label={"查看 "+profile.name+" 老師"}>
       <TeacherAvatar profile={profile} className="teacher-profile-image"/>
       <strong>{profile.name}</strong><span className="teacher-gallery-type">{profile.title}</span>
       <small className="teacher-gallery-tagline">{profile.tagline}</small>
       {profile.id===active&&<span className="teacher-gallery-selected">✓ 使用中</span>}
      </button>)}
     </div>
    </div>
    <div className="teacher-gallery-footer"><p className="meta">選擇後會自動套用推薦聲線；可在老師設定中調整。</p><button type="button" className="btn secondary" onClick={()=>onCloseRef.current()}>關閉</button></div>
   </>:<div className="teacher-detail-scroll">
    <div className="teacher-detail-portrait"><TeacherAvatar profile={detail}/></div>
    <h3>{detail.name} <span>{detail.title}</span></h3>
    <p className="teacher-detail-tagline">「{detail.tagline}」</p>
    <p>{detail.description}</p>
    <div className="teacher-detail-facts"><strong>擅長</strong><p>{detail.bestFor}</p><strong>推薦聲線</strong><p>{detail.voiceLabel}</p></div>
    {completedTutorSessions(detail.id,targetLanguage)>0&&<p className="teacher-detail-history">你們已經一起完成 {completedTutorSessions(detail.id,targetLanguage)} 次練習。</p>}
    <div className="teacher-detail-actions">
     <button type="button" className="btn secondary" onClick={playPreview} disabled={preview?.state==="connecting"||preview?.state==="playing"}>{preview?.state==="connecting"?"正在連線…":preview?.state==="playing"?"正在播放…":preview?.state==="error"?"試聽失敗 · 點擊重試":"▶ 試聽教學風格"}</button>
     {preview?.message&&<p className="teacher-preview-error" role="alert">{preview.message}</p>}
     <button type="button" className="btn" onClick={()=>choose(detail)}>{detail.id===active?"繼續由 "+detail.name+" 教學":"選擇 "+detail.name}</button>
     <button type="button" className="btn secondary" onClick={goBack}>返回老師列表</button>
    </div>
   </div>}
  </section>
 </div>,document.body);
}
