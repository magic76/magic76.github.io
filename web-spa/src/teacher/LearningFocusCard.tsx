import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {useClientReady} from "../lib/useClientReady";
import {useRouteNamespace} from "../i18n/useRouteNamespace";
import {buildDailyLearningPlan,type DailyLearningPlan} from "./learningCoordinator";
import {getTeacherProfile} from "./teacherProfiles";
import {TodayLearningCard} from "./TodayLearningCard";

/** One primary learning action; CurrentTeacherCard owns teacher selection above it. */
export function LearningFocusCard(){
 const stringsReady=useRouteNamespace("lesson");
 const {t,i18n}=useTranslation("lesson");
 const ready=useClientReady();
 const selectedProfile=useTeacherStore(s=>s.teacherProfile);
 const targetLanguage=useTeacherStore(s=>s.targetLanguage);
 const teacher=getTeacherProfile(ready?selectedProfile:"emma");
 const [plan,setPlan]=useState<DailyLearningPlan|null>(null);
 useEffect(()=>{
  if(!ready)return;
  let alive=true;setPlan(null);
  void buildDailyLearningPlan().then(value=>{if(alive)setPlan(value)}).catch(()=>{
   if(alive)setPlan({action:"conversation",title:"",note:"",to:"/teacher/live",dueVocabulary:0,unseenVocabulary:0,vocabularyLevel:""});
  });
  return()=>{alive=false};
 },[ready,targetLanguage,selectedProfile]);
 const chinese=i18n.resolvedLanguage==="zh-TW";
 const lessonName=chinese?plan?.nextLessonTitle:plan?.nextLessonTitleEn;
 const title=plan===null?t("learnToday.loading"):
  plan?.action==="review"?t("learnToday.reviewTitle"):
  plan?.action==="vocabulary"&&targetLanguage==="英文"
  ?plan.warmupVocabulary?t("learnToday.vocabulary"):t("learnToday.due",{count:plan.dueVocabulary})
  :plan?.action==="course"?t("learnToday.lesson",{number:plan.nextLessonNumber,name:lessonName})
  :t("learnToday.conversation",{name:teacher.name});
 if(!stringsReady)return null;
 return <section className="crew-section-focus-card" aria-label={t("learnToday.heading")}>
  <div className="crew-section-focus-card-content">
   <span className="kicker">{t("learnToday.heading")}</span>
   <h2>{title}</h2>
   <p>{plan===null?t("learnToday.loadingNote"):
    plan?.action==="review"?plan.reviewFocus||t("learnToday.reviewFallback"):
    plan?.action==="vocabulary"?t("learnToday.vocabularyNote"):
    plan?.action==="course"?t("learnToday.courseNote"):
    t("learnToday.conversationNote")}</p>
   {plan?.learnerGoal&&<p className="crew-learning-goal" title={plan.learnerGoal}><strong>{t("learnToday.goalLabel")}</strong> {plan.learnerGoal}</p>}
  </div>
  {plan?<Link className="crew-action-primary" to={plan.to}>{t("learnToday.start")} →</Link>:
   <button className="crew-action-primary" type="button" disabled aria-disabled="true">{t("learnToday.loadingButton")}</button>}
  {plan?.reviewFocus&&plan.action!=="review"&&<Link className="crew-learn-review-link" to="/teacher/live?intent=review">{t("learnToday.reviewLink")} · {plan.reviewFocus}</Link>}
  {plan?.textbook&&<div className="crew-learn-focus-secondary">
   <Link to="/teacher/textbook">{t("learnToday.resumeTextbook")}</Link>
  </div>}
  <div className="crew-learn-focus-progress"><TodayLearningCard compact/></div>
 </section>;
}
