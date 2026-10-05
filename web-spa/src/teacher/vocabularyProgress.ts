export type VocabProgress={seen:number;correct:number;correctStreak:number;lastSeenAt:number;nextReviewAt:number};
const KEY="crew_teacher_vocab_progress_v1",TODAY_KEY="crew_teacher_vocab_today_v1";
function all():Record<string,VocabProgress>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch{return{}}}
function write(v:Record<string,VocabProgress>){localStorage.setItem(KEY,JSON.stringify(v))}
export function vocabProgress(id:string):VocabProgress{return all()[id]||{seen:0,correct:0,correctStreak:0,lastSeenAt:0,nextReviewAt:0}}
export function reviewIntervalDays(streak:number){if(streak<=1)return 7;if(streak===2)return 14;if(streak===3)return 30;if(streak===4)return 60;return 120}
export function recordVocab(id:string,correct:boolean){
 const data=all(),old=vocabProgress(id),now=Date.now(),streak=correct?old.correctStreak+1:0;
 data[id]={seen:old.seen+1,correct:old.correct+(correct?1:0),correctStreak:streak,lastSeenAt:now,nextReviewAt:now+(correct?reviewIntervalDays(streak):1)*86400000};write(data);return data[id]
}
export function vocabStats(ids:string[]){
 const now=Date.now();let due=0,newCount=0,learning=0,mastered=0;
 ids.forEach(id=>{const p=vocabProgress(id);if(!p.seen)newCount++;else{if(p.correctStreak>=3)mastered++;else learning++;if(p.nextReviewAt<=now)due++}});
 return{total:ids.length,due,newCount,learning,mastered}
}
export function dueVocabulary(ids:string[]){const now=Date.now();return ids.filter(id=>{const p=vocabProgress(id);return p.seen>0&&p.nextReviewAt<=now})}

export function todayVocabulary(){
 const today=new Date().toISOString().slice(0,10);
 try{const v=JSON.parse(localStorage.getItem(TODAY_KEY)||"{}");return v.date===today?Math.max(0,Number(v.done)||0):0}catch{return 0}
}
export function incrementTodayVocabulary(){
 const today=new Date().toISOString().slice(0,10),done=todayVocabulary()+1;
 localStorage.setItem(TODAY_KEY,JSON.stringify({date:today,done}));
 // Legacy mirror for existing stats/UI consumers.
 localStorage.setItem("crew_vocab_today",String(done));
 return done;
}
