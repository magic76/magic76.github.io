import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import type {CourseLesson} from "./courseCatalog";
import "./learningFlow.css";

/** Android CourseMapDialog.showLessonIntro parity: brief first, then enter Live. */
export function CourseBriefing({lesson}:{lesson:CourseLesson}){
 const {i18n}=useTranslation("teacher");
 const english=i18n.resolvedLanguage==="en";
 const title=english?lesson.titleEn:lesson.titleZh;
 const warmups=lesson.warmupPhrases||[];
 return <div className="crew-learning-focus crew-course-briefing">
  <div className="crew-course-briefing-top">
   <Link className="btn secondary small" to={"/teacher/course?lesson="+encodeURIComponent(lesson.id)} aria-label={english?"Back to course map":"返回課程地圖"}>‹ {english?"Course map":"課程地圖"}</Link>
   <span className="kicker">{english?"Mission briefing":"任務簡報"}</span>
  </div>
  <section className="crew-course-briefing-card" aria-labelledby="crew-briefing-title">
   <span className="kicker">{english?"ROLE-PLAY LESSON":"情境實戰"}</span>
   <h1 id="crew-briefing-title">{title}</h1>
   <p className="crew-course-briefing-description">{english?lesson.descEn:lesson.descZh}</p>
   <h2>{english?`Complete these ${lesson.missions.length} goals`:`完成這 ${lesson.missions.length} 件事就過關`}</h2>
   <ol className="crew-course-briefing-missions">
    {lesson.missions.map((mission,index)=><li key={index}>
     <span aria-hidden="true">{index+1}</span>
     <p>{english?mission.titleEn:mission.titleZh}</p>
    </li>)}
   </ol>
   {!!warmups.length&&<details className="crew-course-warmups">
    <summary>{english?`Useful phrases (${warmups.length})`:`實用句型（${warmups.length}）`}</summary>
    <div className="crew-course-warmup-list">
     {warmups.map((phrase,index)=><div className="crew-course-warmup" key={index}>
      <div><strong lang="en">{phrase.en}</strong><p>{phrase.zh}</p>
       {!!phrase.ipa&&<small className="crew-course-ipa">{phrase.ipa}</small>}
       {!!phrase.note&&<small className="crew-course-warmup-note">{phrase.note}</small>}
      </div>
      <Link className="btn secondary small" to={"/teacher/pronunciation?passage="+encodeURIComponent(`course-${lesson.id}-${index}`)}
       aria-label={(english?"Practice pronunciation: ":"練習發音：")+phrase.en}>{english?"Practice":"試讀"}</Link>
     </div>)}
    </div>
   </details>}
   <Link className="btn primary crew-learning-full-cta" to={"/teacher/live?mode=course&lesson="+encodeURIComponent(lesson.id)}>
    {english?"Start scenario conversation":"開始情境對話"} →
   </Link>
   <p className="crew-course-briefing-footnote">{english?"Your progress is assessed from what you actually say during the conversation.":"依照你在情境對話中實際說出的內容評估任務，不會只看關鍵字。"}</p>
  </section>
 </div>;
}
