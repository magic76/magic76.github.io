import{useCallback,useEffect,useRef,useState}from"react";
import{createPortal}from"react-dom";
import{useTranslation}from"react-i18next";
import{TEACHER_PROFILES,TEACHER_CATEGORIES,type TeacherProfile,type TeacherCategory}from"./teacherProfiles";
import{teacherProfileDisplay}from"./teacherProfileLocale";
import{characterLifeView,lifeBookLabels}from"../characters/lifeBookLocale";
import{useTeacherStore}from"../store/teacherStore";
import{TeacherAvatar}from"./TeacherAvatar";
import{completedTutorSessions}from"./teacherPracticeHistory";
import{previewTeacherVoice,type PreviewStatus}from"./teacherVoicePreview";
import{transitionUI}from"../lib/motion";

/** Matches Android's 16-profile gallery, without creating chat sessions for audition. */
export function TeacherProfilePicker({onClose}:{onClose:()=>void}){
 const {t,i18n:locale}=useTranslation("teacher");const chinese=locale.resolvedLanguage==="zh-TW";
 const copy=(profile:TeacherProfile)=>teacherProfileDisplay(profile,locale.resolvedLanguage||"en");
 const active=useTeacherStore(s=>s.teacherProfile),targetLanguage=useTeacherStore(s=>s.targetLanguage),activeVoice=useTeacherStore(s=>s.voice),languageStyle=useTeacherStore(s=>s.languageStyle),accentStrength=useTeacherStore(s=>s.accentStrength),customAccent=useTeacherStore(s=>s.customAccent),speakingPace=useTeacherStore(s=>s.speakingPace);
 const select=useTeacherStore(s=>s.setTeacherProfile);
 const[category,setCategory]=useState<TeacherCategory>("all"),[detail,setDetail]=useState<TeacherProfile|null>(null),[query,setQuery]=useState("");
 const[preview,setPreview]=useState<PreviewStatus|null>(null);
 const galleryScroll=useRef<HTMLDivElement>(null),previewStop=useRef<null|(()=>void)>(null);
 const closeButton=useRef<HTMLButtonElement>(null),onCloseRef=useRef(onClose);
 onCloseRef.current=onClose;
 const cancelPreview=useCallback(()=>{previewStop.current?.();previewStop.current=null;setPreview(null)},[]);
 const goBack=useCallback(()=>{cancelPreview();transitionUI(()=>setDetail(null))},[cancelPreview]);
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
 const needle=query.trim().toLocaleLowerCase();
 const filtered=TEACHER_PROFILES.filter(p=>(category==="all"||p.categoryId===category)&&[p.name,p.title,p.description,p.bestFor,p.tagline,p.taglineEn,...Object.values(copy(p))].join(" ").toLocaleLowerCase().includes(needle));
 function changeCategory(value:TeacherCategory){transitionUI(()=>setCategory(value));galleryScroll.current?.scrollTo({top:0,behavior:"auto"})}
 function playPreview(){
  if(!detail)return;
  cancelPreview();
  previewStop.current=previewTeacherVoice(detail,targetLanguage,setPreview,{voice:detail.id===active?activeVoice:detail.recommendedVoice,languageStyle,accentStrength,customAccent,speakingPace});
 }
 function choose(profile:TeacherProfile){cancelPreview();select(profile.id);onCloseRef.current()}
 return createPortal(<div className="teacher-picker-backdrop" role="presentation" onClick={()=>onCloseRef.current()}>
  <section className="teacher-picker teacher-gallery-dialog" role="dialog" aria-modal="true" aria-labelledby="teacher-picker-title" onClick={event=>event.stopPropagation()}>
   <header className="teacher-gallery-header"><div>
    <span className="kicker">Crew Teacher</span>
    <h2 id="teacher-picker-title">{detail?detail.name:t("picker.choose")}</h2>
    {!detail&&<p className="meta">{t("picker.intro")}</p>}
   </div><button ref={closeButton} className="teacher-picker-close" onClick={()=>onCloseRef.current()} aria-label={t("picker.close")}>×</button></header>
   {!detail?<>
    <label className="teacher-gallery-search"><span className="sr-only">{t("picker.search")}</span><input type="search" placeholder={t("picker.searchPlaceholder")} value={query} onChange={e=>{setQuery(e.target.value);galleryScroll.current?.scrollTo({top:0})}}/></label>
     <nav className="teacher-gallery-filter" aria-label={t("picker.categoriesLabel")}>
     {TEACHER_CATEGORIES.map(c=><button key={c.id} type="button" aria-pressed={category===c.id} className={category===c.id?"selected":""} onClick={()=>changeCategory(c.id)}>{t("picker.categories."+c.id)}</button>)}
    </nav>
    <div className="teacher-gallery-scroll" ref={galleryScroll}>
     <div className="teacher-picker-list teacher-gallery-grid">
      {filtered.length===0&&<p className="teacher-gallery-empty" role="status">{t("picker.empty")}</p>}
       {filtered.map(profile=><button key={profile.id} className={"teacher-profile-option teacher-gallery-card "+(profile.id===active?"active":"")} type="button" onClick={()=>{cancelPreview();transitionUI(()=>setDetail(profile))}} aria-label={t("picker.view",{name:profile.name})}>
       <span className="crew-role-portrait" style={{viewTransitionName:"crew-teacher-"+profile.id}}><TeacherAvatar profile={profile} className="teacher-profile-image"/></span>
       <strong>{profile.name}</strong><span className="teacher-gallery-type">{chinese?profile.title:copy(profile).title}</span>
       <small className="teacher-gallery-tagline">{copy(profile).tagline}</small>
       {profile.id===active&&<span className="teacher-gallery-selected">{t("picker.current")}</span>}
      </button>)}
     </div>
    </div>
    <div className="teacher-gallery-footer"><p className="meta">{t("picker.footer")}</p><button type="button" className="btn secondary" onClick={()=>onCloseRef.current()}>{t("picker.close")}</button></div>
   </>:<div className="teacher-detail-scroll">
    <div className="teacher-detail-portrait" data-preview={preview?.state||"idle"} style={{viewTransitionName:"crew-teacher-"+detail.id}}><TeacherAvatar profile={detail}/></div>
    <h3>{detail.name} <span>{chinese?detail.title:copy(detail).title}</span></h3>
    <p className="teacher-detail-tagline">「{copy(detail).tagline}」</p>
    <p>{copy(detail).description}</p>
    <div className="teacher-detail-facts"><strong>{t("picker.bestFor")}</strong><p>{copy(detail).bestFor||t("picker.categories."+detail.categoryId)}</p><strong>{t("picker.voice")}</strong><p>{chinese?detail.voiceLabel:t("picker.voiceSuggested")}</p></div>
    {(()=>{const bio=characterLifeView("teacher",detail.id,locale.language),labels=lifeBookLabels("teacher",locale.language);return bio?<details className="teacher-character-life" style={{margin:"12px 0",padding:"12px",border:"1px solid var(--line)",borderRadius:12}}>
     <summary style={{cursor:"pointer",fontWeight:700}}>{labels.title}</summary>
     <p>{bio.summary}</p><strong>{labels.teaching}</strong><p>{bio.teaching}</p>
     <strong>{labels.moments}</strong><ul>{bio.moments.map((story,i)=><li key={i}>{story}</li>)}</ul>
     <small>{labels.note}</small>
    </details>:null})()}
    {completedTutorSessions(detail.id,targetLanguage)>0&&<p className="teacher-detail-history">{t("picker.history",{count:completedTutorSessions(detail.id,targetLanguage)})}</p>}
    <div className="teacher-detail-actions">
     <button type="button" className="btn secondary" onClick={playPreview} disabled={preview?.state==="connecting"||preview?.state==="playing"}>{preview?.state==="connecting"?t("picker.connecting"):preview?.state==="playing"?t("picker.playing"):preview?.state==="error"?t("picker.previewError"):t("picker.preview")}</button>
     {preview?.message&&<p className="teacher-preview-error" role="alert">{preview.message}</p>}
     <button type="button" className="btn" onClick={()=>choose(detail)}>{detail.id===active?t("picker.continue",{name:detail.name}):t("picker.select",{name:detail.name})}</button>
     <button type="button" className="btn secondary" onClick={goBack}>{t("picker.back")}</button>
    </div>
   </div>}
  </section>
 </div>,document.body);
}
