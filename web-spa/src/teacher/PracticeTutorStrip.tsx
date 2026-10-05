import{Link}from"react-router-dom";
import{useTeacherStore}from"../store/teacherStore";
import{getTeacherProfile}from"./teacherProfiles";

export function PracticeTutorStrip(){
 const teacherId=useTeacherStore(s=>s.teacherProfile),profile=getTeacherProfile(teacherId);
 return <Link className="practice-tutor-strip" to="/teacher/tutor">
  <span className="practice-tutor-avatar"><img src={profile.avatar} alt={profile.name}/></span>
  <span><small>目前老師</small><strong>{profile.name} · {profile.title}</strong></span>
  <b>›</b>
 </Link>;
}
