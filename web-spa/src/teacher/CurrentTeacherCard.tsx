import {Link} from "react-router-dom";
import {Arrow} from "../components/Arrow";
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
 const selectedProfile=useTeacherStore(s=>s.teacherProfile);
 const teacher=getTeacherProfile(ready?selectedProfile:"emma");
 const english=i18n.resolvedLanguage?.startsWith("en");
 const copy=teacherProfileDisplay(teacher,i18n.resolvedLanguage||"en");
 return <section className="crew-learn-teacher-card" aria-label={t("tutor.current")}>
  <span className="kicker">{t("tutor.current")}</span>
  <div className="crew-learn-teacher-identity">
   <span className="crew-learn-teacher-portrait" aria-hidden="true">
    <TeacherAvatar profile={teacher} decorative/>
   </span>
   <span className="crew-learn-teacher-copy">
    <strong>{teacher.name}</strong>
    <small>{english?teacher.taglineEn:copy.title}</small>
   </span>
  </div>
  <div className="crew-learn-teacher-actions">
   <Link className="crew-learn-teacher-start" to="/teacher/live">
    {t("tutor.start",{name:teacher.name})} <Arrow/>
   </Link>
   <Link className="crew-learn-teacher-pick" to="/teacher/roles?mode=teacher" state={{openTeacherPicker:true}}>
    <span className="crew-learn-teacher-action">{t("tutor.change")} <span aria-hidden="true">→</span></span>
   </Link>
  </div>
 </section>;
}
