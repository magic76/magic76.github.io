import{useEffect,useState,type ComponentProps}from"react";
import{Link}from"react-router-dom";
import{useTranslation}from"react-i18next";
import{TextChatPanel}from"../live/TextChatPanel";
import{readSessionTranscript}from"../live/sessionTranscript";
import{lessonUnlocked,nextUnlockedLesson,saveTextLessonProgress,textLessonCompleted}from"./courseProgress";
import{textCourseTasksDone}from"./courseTextAssessment.mjs";
import type{CourseLesson}from"./courseCatalog";
import"./learningFlow.css";

type Props=ComponentProps<typeof TextChatPanel>&{course:CourseLesson|null};

/** Text-course progress does not create any speaking assessment or duration. */
export function TeacherTextCourseChat({course,onExchange,...chat}:Props){
 const{t}=useTranslation("lesson");
 const scope=course?"teacher:course:"+course.id:"";
 const[done,setDone]=useState(()=>Boolean(course&&textLessonCompleted(course.id)));
 useEffect(()=>setDone(Boolean(course&&textLessonCompleted(course.id))),[course?.id]);
 const onCompletedExchange=()=>{
  try{onExchange?.()}catch{/* Auxiliary callbacks must not block progress. */}
  if(!course||done||!lessonUnlocked(course.id))return;
  if(!textCourseTasksDone(course.missions,readSessionTranscript(scope)))return;
  if(saveTextLessonProgress(course.id))setDone(true);
 };
 const next=course&&done?nextUnlockedLesson(course.trackId):null;
 const href=next?"/teacher/course?briefing="+encodeURIComponent(next.id)
  :"/teacher/course?lesson="+encodeURIComponent(course?.id||"");
 const feedback=course&&done?<div className="crew-course-text-feedback" role="status">
  <strong>{t("live.textCourseDone")}</strong>
  <Link className="btn primary" to={href}>{t(next?"live.textCourseNext":"live.textCourseMap")}</Link>
 </div>:null;
 return <TextChatPanel {...chat} sessionScope={scope} onExchange={onCompletedExchange} completionFeedback={feedback}/>;
}
