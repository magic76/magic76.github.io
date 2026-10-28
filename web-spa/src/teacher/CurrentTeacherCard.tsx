import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {useClientReady} from "../lib/useClientReady";
import {getTeacherProfile} from "./teacherProfiles";
import {TeacherAvatar} from "./TeacherAvatar";

/** Current teacher and a direct, accessible entry to the existing 16-teacher gallery. */
export function CurrentTeacherCard(){
 const {t,i18n}=useTranslation("teacher");
 const ready=useClientReady();
 const selectedProfile=useTeacherStore(s=>s.teacherProfile);
 const teacher=getTeacherProfile(ready?selectedProfile:"emma");
 const english=i18n.resolvedLanguage?.startsWith("en");
 return <section className="crew-learn-teacher-card" aria-label={t("tutor.current")}>
  <span className="kicker">{t("tutor.current")}</span>
  <Link className="crew-learn-teacher-pick" to="/teacher/roles?mode=teacher" state={{openTeacherPicker:true}}>
   <span className="crew-learn-teacher-portrait" aria-hidden="true">
    <TeacherAvatar profile={teacher} decorative/>
   </span>
   <span className="crew-learn-teacher-copy">
    <strong>{teacher.name}</strong>
    <small>{english?teacher.taglineEn:teacher.title}</small>
   </span>
   <span className="crew-learn-teacher-action">{t("tutor.change")} <span aria-hidden="true">→</span></span>
  </Link>
 </section>;
}
