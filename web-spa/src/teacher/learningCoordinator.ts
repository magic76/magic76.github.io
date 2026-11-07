import{ensureTeacherServices,vocabularyLevel}from"../lib/runtime";
import{useTeacherStore}from"../store/teacherStore";
import{getTeacherProfile}from"./teacherProfiles";
import{bestNextLesson}from"./courseProgress";
import{lessonsForTrack}from"./courseCatalog";
import type{CourseLesson}from"./courseTypes";
import{VOCABULARY_WORDS,vocabularyIds}from"./vocabularyCatalog";
import{todayVocabulary,vocabStats}from"./vocabularyProgress";
import{studentMemories,personalMemoryEnabled}from"./studentMemory";
import{latestReviewFocus,reviewedFocusToday}from"./learningReview";

export type LearningAction="textbook"|"vocabulary"|"course"|"conversation"|"review";
export type DailyLearningPlan={
 action:LearningAction;title:string;note:string;to:string;
 dueVocabulary:number;unseenVocabulary:number;vocabularyLevel:string;
 nextLessonId?:string;nextLessonTitle?:string;nextLessonTitleEn?:string;
 nextLessonNumber?:number;nextLessonTrackId?:string;warmupVocabulary?:boolean;
 primaryFocus?:string;reviewFocus?:string;learnerGoal?:string;textbook?:any;
};
type TodayStepInput={targetLanguage:string;dueVocabulary:number;unseenVocabulary:number;
 practicedVocabularyToday:number;nextLesson:CourseLesson|null;teacherName:string;
 vocabularyLevel:string;primaryFocus:string;reviewFocus?:string;learnerGoal?:string;textbook?:any};

/** The ONLY priority decision for /learn, /teacher and continuation cards.
 * Caller supplies all state, making this function pure and independently testable. */
export function todayStep(input:TodayStepInput):DailyLearningPlan{
 const {targetLanguage,dueVocabulary,unseenVocabulary,practicedVocabularyToday,nextLesson,
  teacherName,vocabularyLevel,primaryFocus,reviewFocus,learnerGoal,textbook}=input;
 const base={dueVocabulary,unseenVocabulary,vocabularyLevel,primaryFocus,reviewFocus,learnerGoal,textbook};
 // Due vocabulary first; then unresolved speaking skills before new material.
 if(targetLanguage==="英文"&&dueVocabulary>0){
  return {...base,action:"vocabulary",warmupVocabulary:false,
   title:"複習 "+dueVocabulary+" 個快忘的字",
   note:"先複習到期的字。",to:"/teacher/vocabulary"};
 }
 if(reviewFocus){
  return {...base,action:"review",title:"再練上次不熟練的表達",
   note:reviewFocus,to:"/teacher/live?intent=review"};
 }
 if(targetLanguage==="英文"&&practicedVocabularyToday===0&&unseenVocabulary>0){
  return {...base,action:"vocabulary",warmupVocabulary:true,
   title:"單字練習",note:"先用免費單字練習暖身。",to:"/teacher/vocabulary"};
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
export async function buildDailyLearningPlan():Promise<DailyLearningPlan>{
 try{await ensureTeacherServices()}catch{/* Key-free lesson and vocabulary routes stay available. */}
 let textbook:any;
 try{textbook=await window.CrewTextbookStore?.last?.()}catch{/* Optional recent material. */}
 const stats=vocabStats(vocabularyIds());
 const teacherState=useTeacherStore.getState();
 const memories=studentMemories(teacherState.targetLanguage);
 const candidate=latestReviewFocus(teacherState.targetLanguage);
 const reviewFocus=candidate&&!reviewedFocusToday(teacherState.targetLanguage,candidate)?candidate:undefined;
 const primaryFocus=memories.find(m=>m.active&&m.type==="focus")?.detail||"";
 const learnerGoal=personalMemoryEnabled()?memories.find(m=>m.active&&m.type==="goal")?.detail:undefined;
 return todayStep({targetLanguage:teacherState.targetLanguage,
  dueVocabulary:stats.due,unseenVocabulary:stats.newCount,
  practicedVocabularyToday:todayVocabulary(),nextLesson:bestNextLesson(),
  teacherName:getTeacherProfile(teacherState.teacherProfile).name,
  vocabularyLevel:vocabularyLevel(),primaryFocus,reviewFocus,learnerGoal,
  textbook:textbook?.images?.length?textbook:undefined});
}
export function vocabularySummary(){
 const stats=vocabStats(VOCABULARY_WORDS.map(x=>x[0]));
 return{...stats,level:vocabularyLevel()};
}
