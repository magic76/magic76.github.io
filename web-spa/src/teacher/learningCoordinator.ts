import{ensureTeacherServices,history,vocabularyLevel}from"../lib/runtime";
import{useTeacherStore}from"../store/teacherStore";
import{getTeacherProfile}from"./teacherProfiles";
import{bestNextLesson}from"./courseProgress";
import{lessonsForTrack}from"./courseCatalog";
import type{CourseLesson}from"./courseTypes";
import{VOCABULARY_WORDS,vocabularyIds}from"./vocabularyCatalog";
import{todayVocabulary,vocabStats}from"./vocabularyProgress";

export type LearningAction="textbook"|"vocabulary"|"course"|"conversation";
export type DailyLearningPlan={
 action:LearningAction;title:string;note:string;to:string;
 dueVocabulary:number;unseenVocabulary:number;vocabularyLevel:string;
 nextLessonId?:string;nextLessonTitle?:string;nextLessonTitleEn?:string;
 nextLessonNumber?:number;nextLessonTrackId?:string;warmupVocabulary?:boolean;
 primaryFocus?:string;textbook?:any;
};
type TodayStepInput={targetLanguage:string;dueVocabulary:number;unseenVocabulary:number;
 practicedVocabularyToday:number;nextLesson:CourseLesson|null;teacherName:string;
 vocabularyLevel:string;primaryFocus:string;textbook?:any};

/** The ONLY priority decision for /learn, /teacher and continuation cards.
 * Caller supplies all state, making this function pure and independently testable. */
export function todayStep(input:TodayStepInput):DailyLearningPlan{
 const {targetLanguage,dueVocabulary,unseenVocabulary,practicedVocabularyToday,nextLesson,
  teacherName,vocabularyLevel,primaryFocus,textbook}=input;
 const base={dueVocabulary,unseenVocabulary,vocabularyLevel,primaryFocus,textbook};
 if(targetLanguage==="英文"&&(dueVocabulary>0||(practicedVocabularyToday===0&&unseenVocabulary>0))){
  const warmupVocabulary=dueVocabulary===0;
  return {...base,action:"vocabulary",warmupVocabulary,
   title:warmupVocabulary?"單字練習":"複習 "+dueVocabulary+" 個快忘的字",
   note:warmupVocabulary?"先用免費單字練習暖身。":"先複習到期的字。",to:"/teacher/vocabulary"};
 }
 if(targetLanguage==="英文"&&nextLesson){
  const nextLessonNumber=lessonsForTrack(nextLesson.trackId).findIndex(x=>x.id===nextLesson.id)+1;
  return {...base,action:"course",title:"第 "+nextLessonNumber+" 課："+nextLesson.titleZh,
   note:nextLesson.descZh,to:"/teacher/course?briefing="+encodeURIComponent(nextLesson.id),
   nextLessonId:nextLesson.id,nextLessonTitle:nextLesson.titleZh,
   nextLessonTitleEn:nextLesson.titleEn,nextLessonNumber,nextLessonTrackId:nextLesson.trackId};
 }
 return {...base,action:"conversation",title:"和 "+teacherName+" 自由對話",
  note:primaryFocus||"和老師開始自由對話。",to:"/teacher/live"};
}
function latestFocus(){
 for(const item of history("teacher")){
  const value=item?.report?.next_focus;if(value)return String(value);
 }
 return "";
}
export async function buildDailyLearningPlan():Promise<DailyLearningPlan>{
 try{await ensureTeacherServices()}catch{/* Key-free lesson and vocabulary routes stay available. */}
 let textbook:any;
 try{textbook=await window.CrewTextbookStore?.last?.()}catch{/* Optional recent material. */}
 const stats=vocabStats(vocabularyIds());
 const teacherState=useTeacherStore.getState();
 return todayStep({targetLanguage:teacherState.targetLanguage,
  dueVocabulary:stats.due,unseenVocabulary:stats.newCount,
  practicedVocabularyToday:todayVocabulary(),nextLesson:bestNextLesson(),
  teacherName:getTeacherProfile(teacherState.teacherProfile).name,
  vocabularyLevel:vocabularyLevel(),primaryFocus:latestFocus(),
  textbook:textbook?.images?.length?textbook:undefined});
}
export function vocabularySummary(){
 const stats=vocabStats(VOCABULARY_WORDS.map(x=>x[0]));
 return{...stats,level:vocabularyLevel()};
}
