import{ensureTeacherServices,history,vocabularyLevel}from"../lib/runtime";
import{bestNextLesson}from"./courseProgress";
import{VOCABULARY_WORDS,vocabularyIds}from"./vocabularyCatalog";
import{vocabStats}from"./vocabularyProgress";

export type LearningAction="textbook"|"vocabulary"|"course"|"conversation";
export type DailyLearningPlan={
 action:LearningAction;title:string;note:string;to:string;
 dueVocabulary:number;unseenVocabulary:number;vocabularyLevel:string;
 nextLessonId?:string;nextLessonTitle?:string;primaryFocus?:string;
 textbook?:any;
};

function latestFocus(){
 const items=history("teacher");
 for(const item of items){
  const value=item?.report?.next_focus;
  if(value)return String(value);
 }
 return "";
}

export async function buildDailyLearningPlan():Promise<DailyLearningPlan>{
 await ensureTeacherServices();
 const textbook=await window.CrewTextbookStore?.last?.();
 const ids=vocabularyIds(),stats=vocabStats(ids),next=bestNextLesson(),focus=latestFocus();
 const base={dueVocabulary:stats.due,unseenVocabulary:stats.newCount,vocabularyLevel:vocabularyLevel(),primaryFocus:focus};
 if(textbook?.images?.length){
  return{...base,action:"textbook",title:"教材陪讀",note:(textbook.plan?.title||"上次教材")+" · 第 "+((Number(textbook.currentPage)||0)+1)+" / "+textbook.images.length+" 頁",to:"/teacher/textbook",textbook};
 }
 if(stats.due>0){
  return{...base,action:"vocabulary",title:"複習 "+stats.due+" 個快忘的字",note:"先把到期單字複習完，再繼續新內容。",to:"/teacher/vocabulary"};
 }
 if(next){
  return{...base,action:"course",title:"接著學："+next.titleZh,note:next.descZh,to:"/teacher/course?lesson="+encodeURIComponent(next.id),nextLessonId:next.id,nextLessonTitle:next.titleZh};
 }
 return{...base,action:"conversation",title:"和老師練一下今天的重點",note:focus||"沒有到期複習或未完成課程，直接做口說練習。",to:"/teacher/live"};
}

export function vocabularySummary(){
 const stats=vocabStats(VOCABULARY_WORDS.map(x=>x[0]));
 return{...stats,level:vocabularyLevel()};
}
