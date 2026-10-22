import {useEffect,useState} from "react";
import {useTranslation} from "react-i18next";
import {useClientReady} from "../lib/useClientReady";
import {completedLessons} from "./courseProgress";
import {todayVocabulary} from "./vocabularyProgress";
import {currentLearningToday,DAILY_GOALS,DEFAULT_GOAL_MINUTES,getDailyGoalMinutes,setDailyGoalMinutes} from "./learningToday";
import "./todayLearning.css";

/** Native Learn's 'Today' block, backed by Web's actual device-local records. */
export function TodayLearningCard(){
 const {t}=useTranslation("home");
 const ready=useClientReady();
 const[goal,setGoal]=useState<number>(DEFAULT_GOAL_MINUTES);
 useEffect(()=>{if(ready)setGoal(getDailyGoalMinutes())},[ready]);
 const progress=ready?currentLearningToday(goal):{practiceSeconds:0,sessionCount:0,progressPercent:0};
 const words=ready?todayVocabulary():0,courses=ready?completedLessons():0;
 const minutes=Math.floor(progress.practiceSeconds/60);
 return <section className="crew-today-learning" aria-label={t("todayLearning.heading")}>
  <div className="crew-today-learning-top">
   <span className="crew-today-learning-heading">{t("todayLearning.heading")}</span>
   <label className="crew-today-learning-goal">{t("todayLearning.goal")}
    <select aria-label={t("todayLearning.goalAria")} value={goal}
     onChange={event=>{const next=Number(event.target.value);setGoal(next);setDailyGoalMinutes(next)}}>
     {DAILY_GOALS.map(n=><option key={n} value={n}>{n} {t("todayLearning.minuteUnit")}</option>)}
    </select>
   </label>
  </div>
  <div className="crew-today-learning-main">
   <div className="crew-today-learning-ring" style={{"--crew-progress":progress.progressPercent+"%"} as React.CSSProperties}
    role="progressbar" aria-label={t("todayLearning.progress")}
    aria-valuenow={progress.progressPercent} aria-valuemin={0} aria-valuemax={100}>
    <span>{progress.progressPercent}%</span>
   </div>
   <div className="crew-today-learning-summary">
    <strong>{t("todayLearning.summary",{minutes})}</strong>
    <small>{t("todayLearning.sessions",{count:progress.sessionCount,goal})}</small>
   </div>
  </div>
  <div className="crew-today-learning-stats">
   <div><strong>{words}</strong><span>{t("todayLearning.words")}</span></div>
   <div><strong>{courses}</strong><span>{t("todayLearning.lessons")}</span></div>
  </div>
  <p className="crew-today-learning-footnote">{t("todayLearning.footnote")}</p>
 </section>;
}
