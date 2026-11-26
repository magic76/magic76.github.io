import {useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import {LESSONS,LESSON_CATEGORIES,lessonCategory,lessonLabel,lessonProgress,type Lesson,type LessonId,type LessonCategory} from "./boardLessons";
import {cardKindName} from "./TeachingCard";

type Props={
 lesson?:Lesson;lessonId:LessonId|null;lessonStep:number;
 progress:ReturnType<typeof lessonProgress>|null;
 english:boolean;quizLocked:boolean;
 onStart:(id:LessonId)=>void;onStep:(index:number)=>void;
};
export function GuidedLessonPanel({lesson,lessonId,lessonStep,progress,english,onStart,onStep}:Props){
 const {t,i18n}=useTranslation("teacher");
 const zh=(i18n.resolvedLanguage||"").startsWith("zh");
 const [category,setCategory]=useState<LessonCategory>("daily");
 const visible=LESSONS.filter(item=>lessonCategory(item)===category);
 const pickerRef=useRef<HTMLDetailsElement>(null);
 return <>
  <details className="teaching-board-lesson-picker" ref={pickerRef} open={!lessonId?true:undefined}>
   <summary><strong>{english?"Suggested courses":"推薦學習課程"}</strong><small>{lessonId?(english?"Switch course":"切換課程"):(english?"Choose material before starting":"先選教材，再跟著老師學習")}</small></summary>
   <label className="teaching-board-catalog-filter"><span>{zh?"英文教材分類":"English lesson category"} · {LESSONS.length}</span><select value={category} onChange={e=>setCategory(e.target.value as LessonCategory)}>{LESSON_CATEGORIES.map(c=><option key={c.id} value={c.id}>{zh?c.zh:c.en} ({LESSONS.filter(item=>lessonCategory(item)===c.id).length})</option>)}</select></label>
   <div className="teaching-board-lesson-options">{visible.map(item=><button type="button" key={item.id}
    className={lessonId===item.id?"is-active":""} onClick={()=>{pickerRef.current?.removeAttribute("open");onStart(item.id)}}>
    <span>{t("board.lessonPicker."+item.id,{defaultValue:lessonLabel(item,zh)})}</span><small>{item.level?item.level+" · ":""}{item.duration} · {item.goal}</small>
   </button>)}</div>
  </details>
  {lesson&&<section className="teaching-board-lesson-progress" aria-label={t("board.lessonPicker.progress")}>
   <div><strong>{english?"Lesson outline · choose a step":"課程大綱 · 選擇學習步驟"}</strong><small>{lesson.goal}</small></div>
   <div className="teaching-board-lesson-steps">{lesson.cards.map((card,i)=><button type="button" key={card.id}
    className={lessonStep===i?"is-active":""} aria-current={lessonStep===i?"step":undefined}
    onClick={()=>onStep(i)}>{i+1}. {cardKindName(card.type,english)}</button>)}</div>
   <div className="teaching-board-lesson-outcome">
    <span>{progress?.quiz?"✓":"○"} {t("board.lessonPicker.quizDone")}</span>
    <span>{progress?.speaking?"✓":"○"} {t("board.lessonPicker.speakingDone")}</span>
    {progress?.complete&&<strong role="status">{t("board.lessonPicker.complete")}</strong>}
   </div>
   <div className="teaching-board-lesson-actions">
    <button type="button" disabled={lessonStep===0} onClick={()=>onStep(lessonStep-1)}>{t("board.lessonPicker.previous")}</button>
    <button type="button" disabled={lessonStep>=lesson.cards.length-1}
     onClick={()=>onStep(lessonStep+1)}>{t("board.lessonPicker.forward")}</button>
   </div>
  </section>}
 </>;
}
