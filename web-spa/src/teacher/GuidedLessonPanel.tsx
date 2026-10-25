import {useRef} from "react";
import {useTranslation} from "react-i18next";
import {LESSONS,lessonProgress,type Lesson,type LessonId} from "./boardLessons";
import {cardKindName} from "./TeachingCard";

type Props={
 lesson?:Lesson;lessonId:LessonId|null;lessonStep:number;
 progress:ReturnType<typeof lessonProgress>|null;
 english:boolean;quizLocked:boolean;
 onStart:(id:LessonId)=>void;onStep:(index:number)=>void;
};
export function GuidedLessonPanel({lesson,lessonId,lessonStep,progress,english,quizLocked,onStart,onStep}:Props){
 const {t}=useTranslation("teacher");
 const pickerRef=useRef<HTMLDetailsElement>(null);
 return <>
  <details className="teaching-board-lesson-picker" ref={pickerRef}>
   <summary><strong>{t("board.lessonPicker.title")}</strong><small>{t("board.lessonPicker.subtitle")}</small></summary>
   <div className="teaching-board-lesson-options">{LESSONS.map(item=><button type="button" key={item.id}
    className={lessonId===item.id?"is-active":""} onClick={()=>{pickerRef.current?.removeAttribute("open");onStart(item.id)}}>
    <span>{t("board.lessonPicker."+item.id)}</span><small>{item.duration}</small>
   </button>)}</div>
  </details>
  {lesson&&<section className="teaching-board-lesson-progress" aria-label={t("board.lessonPicker.progress")}>
   <div><strong>{t("board.lessonPicker.progress")}</strong><small>{lesson.goal}</small></div>
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
    <button type="button" disabled={lessonStep>=lesson.cards.length-1||quizLocked}
     onClick={()=>onStep(lessonStep+1)}>{t("board.lessonPicker.forward")}</button>
   </div>
  </section>}
 </>;
}
