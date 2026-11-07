import{useEffect,useState}from"react";import{useTranslation}from"react-i18next";
import{Link}from"react-router-dom";
import{buildDailyLearningPlan,type DailyLearningPlan}from"./learningCoordinator";
import{useTeacherStore}from"../store/teacherStore";
import{getTeacherProfile}from"./teacherProfiles";
import{useClientReady}from"../lib/useClientReady";
import{useRouteNamespace}from"../i18n/useRouteNamespace";
import{courseLesson}from"./courseCatalog";

export function ContinueLearningCard({compact=false}:{compact?:boolean}){
 const {t,i18n}=useTranslation("teacher");
 const {t:tToday}=useTranslation("lesson");
 const stringsReady=useRouteNamespace("lesson");
 const[plan,setPlan]=useState<DailyLearningPlan|null>(null);
 const ready=useClientReady();
 const selectedProfile=useTeacherStore(s=>s.teacherProfile);
 const targetLanguage=useTeacherStore(s=>s.targetLanguage);
 const teacher=getTeacherProfile(ready?selectedProfile:"emma");
 useEffect(()=>{if(!ready)return;let alive=true;setPlan(null);
  void buildDailyLearningPlan().then(x=>{if(alive)setPlan(x)}).catch(()=>{});
  return()=>{alive=false};
 },[ready,targetLanguage,selectedProfile]);
 const chinese=i18n.resolvedLanguage==="zh-TW";
 const course=plan?.nextLessonId?courseLesson(plan.nextLessonId):null;
 const title=plan&&chinese?plan.title:plan?.action==="vocabulary"
  ?plan.warmupVocabulary?tToday("learnToday.vocabulary"):tToday("learnToday.due",{count:plan.dueVocabulary})
  :plan?.action==="review"?tToday("learnToday.reviewTitle")
  :plan?.action==="course"?tToday("learnToday.lesson",{number:plan.nextLessonNumber,name:course?.titleEn||plan.nextLessonTitleEn||""})
  :tToday("learnToday.conversation",{name:teacher.name});
 const note=plan&&chinese?plan.note:plan?.action==="review"?plan.reviewFocus||tToday("learnToday.reviewFallback"):
  plan?.action==="vocabulary"?tToday("learnToday.vocabularyNote"):
  plan?.action==="course"?course?.descEn||tToday("learnToday.courseNote"):
  plan?.primaryFocus||tToday("learnToday.conversationNote");
 if(!stringsReady||!plan)return <Link className={"continue-learning-card "+(compact?"compact":"")} to="/teacher/course/travel"><div><span className="kicker">{teacher.name} · {t("continue.next")}</span><h3>{chinese?"從第一堂旅行英語開始":"Start with Travel English"}</h3><p>{chinese?"練習點餐、問路與日常對話":"Practice ordering, directions and everyday conversation"}</p></div><span className="continue-arrow">→</span></Link>;
 return <Link className={"continue-learning-card "+plan.action+(compact?" compact":"")} to={plan.to}>
  <div><span className="kicker">{teacher.name} · {t("continue.next")}</span><h3>{title}</h3><p>{note}</p>{plan.primaryFocus&&plan.action!=="conversation"?<small>{t("continue.focus",{focus:plan.primaryFocus})}</small>:null}</div>
  <span className="continue-arrow">→</span>
 </Link>;
}
