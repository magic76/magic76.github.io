import{TEACHER_PROFILES,type TeacherProfileId}from"./teacherProfiles";
import{useTeacherStore}from"../store/teacherStore";

export function TeacherProfilePicker({onClose}:{onClose:()=>void}){
 const active=useTeacherStore(s=>s.teacherProfile);
 const setTeacherProfile=useTeacherStore(s=>s.setTeacherProfile);
 return <div className="teacher-picker-backdrop" role="presentation" onClick={onClose}>
  <section className="teacher-picker" role="dialog" aria-modal="true" aria-labelledby="teacher-picker-title" onClick={e=>e.stopPropagation()}>
   <div className="section-head"><div><span className="kicker">Tutor profile</span><h2 id="teacher-picker-title">選擇你的老師</h2></div><button className="teacher-picker-close" onClick={onClose} aria-label="關閉">×</button></div>
   <p className="meta">選一位你想長期互動的老師。切換時會套用推薦音色，之後仍可另外微調。</p>
   <div className="teacher-picker-list">
    {TEACHER_PROFILES.map(profile=><button className={"teacher-profile-option "+(profile.id===active?"active":"")} key={profile.id} onClick={()=>{setTeacherProfile(profile.id as TeacherProfileId);onClose()}}>
     <img src={profile.avatar} alt={profile.name}/>
     <span className="teacher-profile-copy"><strong>{profile.name}{profile.id===active?<em>使用中</em>:null}</strong><b>{profile.title}</b><small><strong>{profile.bestFor}</strong></small><small>{profile.description}</small><small>推薦音色 · {profile.recommendedVoice}</small></span>
    </button>)}
   </div>
  </section>
 </div>;
}
