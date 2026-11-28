import {Arrow} from "../components/Arrow";
import {Link,useLocation,useNavigate} from "react-router-dom";
import {useEffect,useState} from "react";
import {TeacherProfilePicker} from "./TeacherProfilePicker";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {useClientReady} from "../lib/useClientReady";
import {getTeacherProfile} from "./teacherProfiles";
import {teacherProfileDisplay} from "./teacherProfileLocale";
import {TeacherAvatar} from "./TeacherAvatar";

/** Start speaking with the selected teacher, with teacher selection as an optional action. */
export function CurrentTeacherCard(){
 const {t,i18n}=useTranslation("teacher");
 const ready=useClientReady();
 const location=useLocation(),navigate=useNavigate();
 const [picker,setPicker]=useState(()=>Boolean((location.state as {openTeacherPicker?:boolean}|null)?.openTeacherPicker));
 const conversationMode=useTeacherStore(s=>s.conversationMode);
 const closePicker=()=>{setPicker(false);if((location.state as {openTeacherPicker?:boolean}|null)?.openTeacherPicker)navigate(location.pathname+location.search,{replace:true,state:null})};
 const [scene,setScene]=useState("hotel_checkin");
 useEffect(()=>{const sync=()=>setScene(localStorage.getItem("crew_teacher_scenario")||"hotel_checkin");sync();window.addEventListener("crew-teacher-scene-changed",sync);return()=>window.removeEventListener("crew-teacher-scene-changed",sync)},[]);
 const startPath="/teacher/live"+(ready&&conversationMode==="scenario"?"?mission="+encodeURIComponent(scene):"");
 const selectedProfile=useTeacherStore(s=>s.teacherProfile);
 const teacher=getTeacherProfile(ready?selectedProfile:"emma");
 const english=i18n.resolvedLanguage?.startsWith("en");
 const copy=teacherProfileDisplay(teacher,i18n.resolvedLanguage||"en");
 return <section className="crew-learn-teacher-card" aria-label={t("tutor.current")}>
  <div className="crew-learn-teacher-identity">
   <span className="crew-learn-teacher-portrait" aria-hidden="true">
    <TeacherAvatar profile={teacher} decorative/>
   </span>
   <span className="crew-learn-teacher-copy">
    <strong>{teacher.name}</strong>
    <small>{english?teacher.taglineEn:copy.title}</small>
   </span>
   <button type="button" className="crew-learn-teacher-pick" aria-haspopup="dialog" onClick={()=>setPicker(true)}>
    {t("tutor.change")}
   </button>
  </div>
  <Link className="crew-learn-teacher-start" to={startPath}>
   {t("tutor.start",{name:teacher.name})} <Arrow/>
  </Link>
  {picker&&<TeacherProfilePicker onClose={closePicker}/>}
 </section>;
}
