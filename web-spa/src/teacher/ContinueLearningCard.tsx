import{useEffect,useState}from"react";import{useTranslation}from"react-i18next";
import{Link}from"react-router-dom";
import{buildDailyLearningPlan,type DailyLearningPlan}from"./learningCoordinator";
import{useTeacherStore}from"../store/teacherStore";
import{getTeacherProfile}from"./teacherProfiles";
import{useClientReady}from"../lib/useClientReady";
import{courseLesson}from"./courseCatalog";

export function ContinueLearningCard({compact=false}:{compact?:boolean}){
 const {t,i18n}=useTranslation("teacher");
 const[plan,setPlan]=useState<DailyLearningPlan|null>(null);
 const ready=useClientReady();
 const selectedProfile=useTeacherStore(s=>s.teacherProfile);
 const teacher=getTeacherProfile(ready?selectedProfile:"emma");
 useEffect(()=>{let alive=true;void buildDailyLearningPlan().then(x=>{if(alive)setPlan(x)});return()=>{alive=false}},[]);
 const english=i18n.resolvedLanguage==="en";
 const course=plan?.nextLessonId?courseLesson(plan.nextLessonId):null;
 const title=plan&&!english?plan.title:plan?.action==="textbook"?t("continue.textbookTitle"):
  plan?.action==="vocabulary"?t("continue.vocabularyTitle",{count:plan.dueVocabulary}):
  plan?.action==="course"?t("continue.courseTitle",{name:course?.titleEn||plan.nextLessonTitle||""}):
  t("continue.conversationTitle");
 const note=plan&&!english?plan.note:plan?.action==="textbook"?t("continue.textbookNote",{
  title:plan.textbook?.plan?.title||t("continue.textbookFallback"),
  page:(Number(plan.textbook?.currentPage)||0)+1,
  total:plan.textbook?.images?.length||1
 }):plan?.action==="vocabulary"?t("continue.vocabularyNote"):
  plan?.action==="course"?course?.descEn||plan.note:
  plan?.primaryFocus||t("continue.conversationNote");
 if(!plan)return <div className={"continue-learning-card "+(compact?"compact":"")}><span className="kicker">{teacher.name} · {t("continue.next")}</span><strong>{t("continue.loading")}</strong></div>;
 return <Link className={"continue-learning-card "+plan.action+(compact?" compact":"")} to={plan.to}>
  <div><span className="kicker">{teacher.name} · {t("continue.next")}</span><h3>{title}</h3><p>{note}</p>{plan.primaryFocus&&plan.action!=="conversation"?<small>{t("continue.focus",{focus:plan.primaryFocus})}</small>:null}</div>
  <span className="continue-arrow">→</span>
 </Link>;
}
