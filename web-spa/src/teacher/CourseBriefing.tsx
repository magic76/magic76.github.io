import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import type {CourseLesson} from "./courseCatalog";
import {courseDisplayTitle,courseDisplayDescription,courseDisplayMission,courseDisplayWarmupGloss} from "./courseLocale";
import {useTeacherStore} from "../store/teacherStore";
import {useClientReady} from "../lib/useClientReady";
import {localizedNativeName} from "./teacherLocale";
import "./learningFlow.css";

/** UI language never changes the spoken practice target or mission evaluation. */
export function CourseBriefing({lesson}:{lesson:CourseLesson}){
 const {t,i18n}=useTranslation("teacher");
 const locale=i18n.resolvedLanguage||"en";
 const title=courseDisplayTitle(lesson,locale);
 const warmups=lesson.warmupPhrases||[];
 const chinese=locale==="zh-TW";
 const ready=useClientReady(),target=useTeacherStore(s=>s.targetLanguage),native=useTeacherStore(s=>s.nativeLanguage);
 return <div className="crew-learning-focus crew-course-briefing">
  <div className="crew-course-briefing-top">
   <Link className="btn secondary small" to={"/teacher/course?lesson="+encodeURIComponent(lesson.id)} aria-label={t("briefing.back")}>‹ {t("briefing.back")}</Link>
   <span className="kicker">{t("briefing.kicker")}</span>
  </div>
  <section className="crew-course-briefing-card" aria-labelledby="crew-briefing-title">
   <span className="kicker">{t("briefing.roleplay")}</span>
   <h1 id="crew-briefing-title">{title}</h1>
   <p className="crew-course-briefing-description">{courseDisplayDescription(lesson,locale)}</p>
   <Link className="btn primary crew-learning-full-cta" to={"/teacher/live?mode=course&lesson="+encodeURIComponent(lesson.id)}>
    {t("briefing.start")} →
   </Link>
   {ready&&target!=="英文"&&<p className="crew-course-language-note" role="note">{t("course.materialNotice",{language:t("friends:languages."+target,{defaultValue:target}),native:localizedNativeName(native,locale)})}</p>}
   <h2>{t("briefing.goals",{count:lesson.missions.length})}</h2>
   <ol className="crew-course-briefing-missions">
    {lesson.missions.map((mission,index)=><li key={index}>
     <span aria-hidden="true">{index+1}</span>
     <p>{courseDisplayMission(lesson,index,locale)}</p>
    </li>)}
   </ol>
   {!!warmups.length&&<details className="crew-course-warmups">
    <summary>{t("briefing.phrases",{count:warmups.length})}</summary>
    <div className="crew-course-warmup-list">
     {!chinese&&<p className="meta">{t("briefing.englishPhraseHint")}</p>}
     {warmups.map((phrase,index)=><div className="crew-course-warmup" key={index}>
      <div><strong lang="en">{phrase.en}</strong>
       {(chinese||locale.startsWith("ja"))&&<p>{courseDisplayWarmupGloss(lesson,index,locale)}</p>}
       {!!phrase.ipa&&<small className="crew-course-ipa">{phrase.ipa}</small>}
       {chinese&&!!phrase.note&&<small className="crew-course-warmup-note">{phrase.note}</small>}
      </div>
      <Link className="btn secondary small" to={"/teacher/pronunciation?passage="+encodeURIComponent(`course-${lesson.id}-${index}`)}
       aria-label={t("briefing.practiceAria",{phrase:phrase.en})}>{t("briefing.practice")}</Link>
     </div>)}
    </div>
   </details>}
   <p className="crew-course-briefing-footnote">{t("briefing.footnote")}</p>
  </section>
 </div>;
}
