import {useEffect,useState} from "react";
import {useTranslation} from "react-i18next";
import {useClientReady} from "../lib/useClientReady";
import {completedLessons} from "./courseProgress";
import {todayVocabulary} from "./vocabularyProgress";
import {currentLearningToday,DAILY_GOALS,DEFAULT_GOAL_MINUTES,getDailyGoalMinutes,setDailyGoalMinutes} from "./learningToday";
import "./todayLearning.css";

/** Native Learn's 'Today' block, backed by Web's actual device-local records. */
export function TodayLearningCard(){
 const {i18n}=useTranslation();
 const en=i18n.language.startsWith("en");
 const ready=useClientReady();
 const[goal,setGoal]=useState<number>(DEFAULT_GOAL_MINUTES);
 useEffect(()=>{if(ready)setGoal(getDailyGoalMinutes())},[ready]);
 const progress=ready?currentLearningToday(goal):{practiceSeconds:0,sessionCount:0,progressPercent:0};
 const words=ready?todayVocabulary():0,courses=ready?completedLessons():0;
 const minutes=Math.floor(progress.practiceSeconds/60);
 return <section className="crew-today-learning" aria-label={en?"Today's learning":"今日學習"}>
  <div className="crew-today-learning-top">
   <span className="crew-today-learning-heading">{en?"Today's learning":"今日學習"}</span>
   <label className="crew-today-learning-goal">{en?"Daily goal":"每日目標"}
    <select aria-label={en?"Daily speaking goal in minutes":"每日口說目標分鐘"} value={goal}
     onChange={event=>{const next=Number(event.target.value);setGoal(next);setDailyGoalMinutes(next)}}>
     {DAILY_GOALS.map(n=><option key={n} value={n}>{n} {en?"min":"分鐘"}</option>)}
    </select>
   </label>
  </div>
  <div className="crew-today-learning-main">
   <div className="crew-today-learning-ring" style={{"--crew-progress":progress.progressPercent+"%"} as React.CSSProperties}
    role="progressbar" aria-label={en?"Speaking goal progress":"口說目標進度"}
    aria-valuenow={progress.progressPercent} aria-valuemin={0} aria-valuemax={100}>
    <span>{progress.progressPercent}%</span>
   </div>
   <div className="crew-today-learning-summary">
    <strong>{en?`${minutes} minutes of speaking today`:`今天已練習 ${minutes} 分鐘口說`}</strong>
    <small>{en?`${progress.sessionCount} recorded sessions · Goal ${goal} minutes`:`${progress.sessionCount} 次有紀錄的口說 · 目標 ${goal} 分鐘`}</small>
   </div>
  </div>
  <div className="crew-today-learning-stats">
   <div><strong>{words}</strong><span>{en?"Words today":"今日單字"}</span></div>
   <div><strong>{courses}</strong><span>{en?"Lessons completed":"已完成課程"}</span></div>
  </div>
  <p className="crew-today-learning-footnote">{en?"Only activity recorded in this browser or app WebView is shown. Existing native Android records are not yet synced.":"僅顯示此瀏覽器／App WebView 已記錄的學習資料；尚未與舊 Android 原生紀錄同步。"}</p>
 </section>;
}
