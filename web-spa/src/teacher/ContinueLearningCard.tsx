import{useEffect,useState}from"react";
import{Link}from"react-router-dom";
import{buildDailyLearningPlan,type DailyLearningPlan}from"./learningCoordinator";
import{useTeacherStore}from"../store/teacherStore";
import{getTeacherProfile}from"./teacherProfiles";

export function ContinueLearningCard({compact=false}:{compact?:boolean}){
 const[plan,setPlan]=useState<DailyLearningPlan|null>(null);
 const teacher=getTeacherProfile(useTeacherStore(s=>s.teacherProfile));
 useEffect(()=>{let alive=true;void buildDailyLearningPlan().then(x=>{if(alive)setPlan(x)});return()=>{alive=false}},[]);
 if(!plan)return <div className={"continue-learning-card "+(compact?"compact":"")}><span className="kicker">{teacher.name} · 今天下一步</span><strong>正在整理下一步…</strong></div>;
 return <Link className={"continue-learning-card "+plan.action+(compact?" compact":"")} to={plan.to}>
  <div><span className="kicker">{teacher.name} · 今天下一步</span><h3>{plan.title}</h3><p>{plan.note}</p>{plan.primaryFocus&&plan.action!=="conversation"?<small>近期重點：{plan.primaryFocus}</small>:null}</div>
  <span className="continue-arrow">→</span>
 </Link>;
}
