import {learningStorageKey,type LearningLanguageCode} from "./learningLanguages";
export type VocabProgress={seen:number;correct:number;correctStreak:number;lastSeenAt:number;nextReviewAt:number};
const KEY="crew_teacher_vocab_progress_v1",TODAY_KEY="crew_teacher_vocab_today_v1";
function all(language:LearningLanguageCode="en"):Record<string,VocabProgress>{try{return JSON.parse(localStorage.getItem(learningStorageKey(KEY,language))||"{}")}catch{return{}}}
function write(v:Record<string,VocabProgress>,language:LearningLanguageCode="en"){localStorage.setItem(learningStorageKey(KEY,language),JSON.stringify(v))}
export function vocabProgress(id:string,language:LearningLanguageCode="en"):VocabProgress{return all(language)[id]||{seen:0,correct:0,correctStreak:0,lastSeenAt:0,nextReviewAt:0}}
export function reviewIntervalDays(streak:number){if(streak<=1)return 7;if(streak===2)return 14;if(streak===3)return 30;if(streak===4)return 60;return 120}
export function recordVocab(id:string,correct:boolean,language:LearningLanguageCode="en"){
 const data=all(language),old=vocabProgress(id,language),now=Date.now(),streak=correct?old.correctStreak+1:0;
 data[id]={seen:old.seen+1,correct:old.correct+(correct?1:0),correctStreak:streak,lastSeenAt:now,nextReviewAt:now+(correct?reviewIntervalDays(streak):1)*86400000};write(data,language);return data[id]
}
export function vocabStats(ids:string[],language:LearningLanguageCode="en"){
 const now=Date.now();let due=0,newCount=0,learning=0,mastered=0;
 ids.forEach(id=>{const p=vocabProgress(id,language);if(!p.seen)newCount++;else{if(p.correctStreak>=3)mastered++;else learning++;if(p.nextReviewAt<=now)due++}});
 return{total:ids.length,due,newCount,learning,mastered}
}
export function dueVocabulary(ids:string[],language:LearningLanguageCode="en"){const now=Date.now();return ids.filter(id=>{const p=vocabProgress(id,language);return p.seen>0&&p.nextReviewAt<=now})}

export function todayVocabulary(language:LearningLanguageCode="en"){
 const today=new Date().toISOString().slice(0,10);
 try{const v=JSON.parse(localStorage.getItem(learningStorageKey(TODAY_KEY,language))||"{}");return v.date===today?Math.max(0,Number(v.done)||0):0}catch{return 0}
}
export function incrementTodayVocabulary(language:LearningLanguageCode="en"){
 const today=new Date().toISOString().slice(0,10),done=todayVocabulary(language)+1;
 localStorage.setItem(learningStorageKey(TODAY_KEY,language),JSON.stringify({date:today,done}));
 // Legacy mirror for existing stats/UI consumers.
 if(language==="en")localStorage.setItem("crew_vocab_today",String(done));
 return done;
}
