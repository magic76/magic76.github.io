import{Link}from"react-router-dom";
import{useTeacherStore}from"../store/teacherStore";
import{getTeacherProfile}from"./teacherProfiles";import{TeacherAvatar}from"./TeacherAvatar";

export function PracticeTutorStrip(){
 const teacherId=useTeacherStore(s=>s.teacherProfile),profile=getTeacherProfile(teacherId);
 return <Link className="practice-tutor-strip" to="/teacher/tutor">
  <span className="practice-tutor-avatar"><TeacherAvatar profile={profile}/></span>
  <span className="practice-tutor-copy"><small>目前老師</small><strong>今天跟 {profile.name} 老師學</strong><em>{profile.title} · {profile.bestFor}</em></span>
  <b>更換 ›</b>
 </Link>;
}
