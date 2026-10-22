import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {useClientReady} from "../lib/useClientReady";
import {history} from "../lib/runtime";
import {completedLessons} from "./courseProgress";
import {buildDailyLearningPlan,type DailyLearningPlan} from "./learningCoordinator";
import {getTeacherProfile} from "./teacherProfiles";
import {courseLesson} from "./courseCatalog";

/** The single recommended Learn action. Progress remains in the existing stores. */
export function LearningFocusCard(){
 const {t,i18n}=useTranslation("home");
 const {t:teacherT}=useTranslation("teacher");
 const ready=useClientReady();
 const selectedProfile=useTeacherStore(s=>s.teacherProfile);
 const teacher=getTeacherProfile(ready?selectedProfile:"emma");
 const [plan,setPlan]=useState<DailyLearningPlan|null>(null);
 const [hasRecords,setHasRecords]=useState(false);
 useEffect(()=>{
  if(!ready)return;
  setHasRecords(history("teacher").length>0||completedLessons()>0);
  let alive=true;
  void buildDailyLearningPlan().then(value=>{if(alive)setPlan(value)}).catch(()=>{/* Start remains available without stored course data. */});
  return()=>{alive=false};
 },[ready]);
 const resume=ready&&plan!==null&&(hasRecords||plan.action==="textbook"||plan.action==="vocabulary");
 const chinese=i18n.resolvedLanguage==="zh-TW";
 const course=plan?.nextLessonId?courseLesson(plan.nextLessonId):null;
 const planTitle=plan?.action==="textbook"?teacherT("continue.textbookTitle"):
  plan?.action==="vocabulary"?teacherT("continue.vocabularyTitle",{count:plan.dueVocabulary}):
  plan?.action==="course"?teacherT("continue.courseTitle",{name:chinese?plan.nextLessonTitle||"":course?.titleEn||""}):
  teacherT("continue.conversationTitle");
 const title=resume?planTitle:t("sectionHubs.learn.firstTopic",{defaultValue:"Your first conversation"});
 const description=resume?t("sectionHubs.learn.resumeDesc",{defaultValue:"Pick up where you left off with your teacher."}):
  t("sectionHubs.learn.firstDesc",{defaultValue:"Meet your teacher and practice a simple everyday introduction."});
 const destination=resume?plan.to:"/teacher/roles?mode=teacher";
 return <section className="crew-learning-focus" aria-label={t("sectionHubs.learn.focusLabel",{defaultValue:"Recommended practice"})}>
  <div className="crew-learning-focus-content">
   <span className="kicker">{t(resume?"sectionHubs.learn.resumeLabel":"sectionHubs.learn.newLabel",{defaultValue:resume?"CONTINUE PRACTICING":"START HERE"})}</span>
   <h2>{title}</h2><p>{description}</p>
   <div className="crew-learning-focus-meta"><span>{teacher.name}</span><span aria-hidden="true">·</span>
    <span>{t("sectionHubs.learn.suggestedTime",{defaultValue:"Suggested: 5 min"})}</span></div>
  </div>
  <div className="crew-learning-focus-portrait" aria-hidden="true">
   <span>{teacher.name.charAt(0)}</span>
   <img src={teacher.avatar} alt="" onError={event=>{event.currentTarget.style.display="none"}}/>
  </div>
  <Link className="crew-action-primary" to={destination}>
   {t(resume?"sectionHubs.learn.resumeCta":"sectionHubs.learn.startCta",{defaultValue:resume?"Continue practice":"Start practicing"})} →
  </Link>
 </section>;
}
