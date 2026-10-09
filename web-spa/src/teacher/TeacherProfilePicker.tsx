import{useEffect,useRef}from"react";
import{createPortal}from"react-dom";
import{TEACHER_PROFILES,type TeacherProfileId}from"./teacherProfiles";
import{useTeacherStore}from"../store/teacherStore";import{TeacherAvatar}from"./TeacherAvatar";

export function TeacherProfilePicker({onClose}:{onClose:()=>void}){
 const active=useTeacherStore(s=>s.teacherProfile);
 const setTeacherProfile=useTeacherStore(s=>s.setTeacherProfile);
 const closeRef=useRef(onClose),closeButton=useRef<HTMLButtonElement>(null);
 closeRef.current=onClose;
 useEffect(()=>{
  // The parent page uses transform animation; fixed descendants inside it
  // are positioned relative to the page instead of the viewport.
  const oldOverflow=document.body.style.overflow;
  const lastFocused=document.activeElement instanceof HTMLElement?document.activeElement:null;
  document.body.style.overflow="hidden";
  closeButton.current?.focus();
  const onKeyDown=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){event.preventDefault();closeRef.current()}
  };
  document.addEventListener("keydown",onKeyDown);
  return()=>{
   document.body.style.overflow=oldOverflow;
   document.removeEventListener("keydown",onKeyDown);
   if(lastFocused?.isConnected)lastFocused.focus();
  };
 },[]);
 return createPortal(<div className="teacher-picker-backdrop" role="presentation" onClick={onClose}>
  <section className="teacher-picker" role="dialog" aria-modal="true" aria-labelledby="teacher-picker-title" onClick={e=>e.stopPropagation()}>
   <div className="section-head"><div><span className="kicker">Tutor profile</span><h2 id="teacher-picker-title">選擇你的老師</h2></div><button ref={closeButton} className="teacher-picker-close" onClick={onClose} aria-label="關閉">×</button></div>
   <p className="meta">選一位你想長期互動的老師。切換時會套用推薦音色，之後仍可另外微調。</p>
   <div className="teacher-picker-list">
    {TEACHER_PROFILES.map(profile=><button className={"teacher-profile-option "+(profile.id===active?"active":"")} key={profile.id} onClick={()=>{setTeacherProfile(profile.id as TeacherProfileId);onClose()}}>
     <TeacherAvatar profile={profile} className="teacher-profile-image"/>
     <span className="teacher-profile-copy"><strong>{profile.name}{profile.id===active?<em>使用中</em>:null}</strong><b>{profile.title}</b><small><strong>{profile.bestFor}</strong></small><small>{profile.description}</small><small>推薦聲音 · {profile.voiceLabel}</small></span>
    </button>)}
   </div>
  </section>
 </div>,document.body);
}
