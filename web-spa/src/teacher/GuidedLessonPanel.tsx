import {useState} from "react";
import {useTranslation} from "react-i18next";
import {LESSONS,LESSON_CATEGORIES,lessonCategory,lessonLabel,lessonProgress,type Lesson,type LessonId,type LessonCategory} from "./boardLessons";


type Props={
 lesson?:Lesson;lessonId:LessonId|null;lessonStep:number;
 progress:ReturnType<typeof lessonProgress>|null;
 english:boolean;
 onStart:(id:LessonId)=>void;active:boolean;pendingTopic:string;onTopic:(topic:string)=>void;
};
export function GuidedLessonPanel({lesson,lessonId,lessonStep,progress,onStart,active,pendingTopic,onTopic}:Props){
 const {t,i18n}=useTranslation("teacher");
 const zh=(i18n.resolvedLanguage||"").startsWith("zh");
 const [category,setCategory]=useState<LessonCategory|"recommended">("recommended");
 const [topic,setTopic]=useState("");
 const [expanded,setExpanded]=useState(false);
 const recommended=["ed-sounds","coffee","past-simple"];
 const visible=category==="recommended"?recommended.flatMap(id=>LESSONS.filter(item=>item.id===id)):LESSONS.filter(item=>lessonCategory(item)===category);
 const selected=!!lessonId||!!pendingTopic;
 return <>
  {!active&&(!selected||expanded)&&<section className="teaching-board-lesson-picker teaching-board-catalog" aria-label={zh?"選擇教材":"Choose a lesson"}>
   <div className="teaching-board-catalog-head"><strong>{zh?"選擇教材":"Choose a lesson"}</strong><small>{LESSONS.length} {zh?"堂課程":"lessons"}</small></div>
   <div className="teaching-board-category-tabs" role="group" aria-label={zh?"教材分類":"Lesson categories"}>
    <button type="button" aria-pressed={category==="recommended"} onClick={()=>setCategory("recommended")}>{zh?"推薦":"Suggested"}</button>
    {LESSON_CATEGORIES.map(c=><button key={c.id} type="button" aria-pressed={category===c.id} onClick={()=>setCategory(c.id)}>{zh?c.zh:c.en}</button>)}
   </div>
   <div className="teaching-board-lesson-options">{visible.map(item=><button type="button" key={item.id} aria-pressed={lessonId===item.id}
    className={lessonId===item.id?"is-active":""} onClick={()=>{setExpanded(false);onStart(item.id)}}>
    <span>{t("board.lessonPicker."+item.id,{defaultValue:lessonLabel(item,zh)})}</span><small>{item.level?item.level+" · ":""}{zh?"3–5 分鐘":item.duration}</small>
   </button>)}</div>
   <form className="teaching-board-free-topic" onSubmit={e=>{e.preventDefault();if(topic.trim()){onTopic(topic.trim());setTopic("");setExpanded(false)}}}>
    <label htmlFor="teaching-board-prep-topic">{zh?"或直接問老師":"Or ask your teacher"}</label><div><input id="teaching-board-prep-topic" value={topic} onChange={e=>setTopic(e.target.value)} maxLength={120} placeholder={zh?"例如：have been 怎麼用？":"e.g. How do I use have been?"}/><button type="submit" disabled={!topic.trim()}>{zh?"選擇":"Select"}</button></div>
   </form>
  </section>}
  {!active&&selected&&!expanded&&<button className="teaching-board-change-prep" type="button" onClick={()=>setExpanded(true)}>{zh?"更換教材或主題":"Change lesson or topic"}</button>}
  {lesson&&<section className="teaching-board-lesson-progress teaching-board-compact-progress" aria-label={t("board.lessonPicker.progress")}>
   <strong>{lessonStep+1} / {lesson.cards.length}</strong>
   <div className="teaching-board-progress-track" aria-hidden="true">{lesson.cards.map((card,i)=><span key={card.id} className={i<=lessonStep?"is-active":""}/>)}</div>
   <div className="teaching-board-lesson-outcome"><span>{progress?.quiz?"✓":"○"} {t("board.lessonPicker.quizDone")}</span><span>{progress?.speaking?"✓":"○"} {t("board.lessonPicker.speakingDone")}</span>{progress?.complete&&<strong role="status">{t("board.lessonPicker.complete")}</strong>}</div>
  </section>}
 </>;
}
