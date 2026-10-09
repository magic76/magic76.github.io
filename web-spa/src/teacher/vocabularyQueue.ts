import{VOCABULARY_WORDS,type VocabularyWord}from"./vocabularyCatalog";import{localizedVocabulary,hasLocalizedGloss}from"./vocabularyContent";import type{NativeLanguage}from"./teacherLocale";
import{dueVocabulary}from"./vocabularyProgress";
import{placementState,nextBandFloor}from"./adaptivePlacement";
const shuffle=<T,>(items:T[])=>items.map(item=>({item,order:Math.random()})).sort((a,b)=>a.order-b.order).map(v=>v.item);
export function flowRecovery(){return placementState().recovery}
export function recordFlow(_correct:boolean){return placementState().recovery}
function select(pool:VocabularyWord[],score:number){return shuffle(pool).sort((a,b)=>Math.abs(a[5]-score)-Math.abs(b[5]-score))[0]}
export function chooseVocabulary(score:number,current:VocabularyWord|undefined,slot:number,native:NativeLanguage="zh-TW"){
 const pool=localizedVocabulary(native).filter(w=>hasLocalizedGloss(native,w[0]));
 const s=placementState(),others=(pool.length?pool:VOCABULARY_WORDS).filter(w=>w[0]!==current?.[0]);
 // A pending next-band probe is tested right away, before revisits or easy questions.
 const stretch=others.filter(w=>w[5]>=nextBandFloor(score)&&w[5]<=Math.min(100,nextBandFloor(score)+14));
 const wantProbe=s.forceProbe||(s.calibrationRemaining>0&&slot%4===3)||(s.calibrationRemaining===0&&slot%7===5);
 if(s.recovery===0&&wantProbe&&stretch.length){
  const fresh=stretch.filter(w=>!seenRecently(w[0]));
  return select(fresh.length?fresh:stretch,nextBandFloor(score));
 }
 // In calibration and after a miss, do not force overdue cards above current ability.
 if(s.recovery===0&&s.calibrationRemaining===0){
  const dueIds=new Set(dueVocabulary(others.map(w=>w[0])));
  const due=others.filter(w=>dueIds.has(w[0]));
  if(due.length)return select(due,score);
 }
 const floor=s.recovery>0?score-12:score-10,ceiling=s.recovery>0?score+3:score+9;
 let pool=others.filter(w=>w[5]>=floor&&w[5]<=ceiling);
 if(!pool.length)pool=others.filter(w=>Math.abs(w[5]-score)<=18);
 if(!pool.length)pool=others;
 const fresh=pool.filter(w=>!seenRecently(w[0]));
 return select(fresh.length?fresh:pool,score)||VOCABULARY_WORDS[0];
}
function seenRecently(id:string){
 try{const p=JSON.parse(localStorage.getItem("crew_teacher_vocab_progress_v1")||"{}")[id];
 return p&&Date.now()-Number(p.lastSeenAt||0)<3600000}catch{return false}
}
export function vocabularyChoices(word:VocabularyWord,native:NativeLanguage="zh-TW"){
 const unique=new Map<string,VocabularyWord>();
 for(const w of localizedVocabulary(native).filter(w=>hasLocalizedGloss(native,w[0]))){
  if(w[0]!==word[0]&&w[1]!==word[1]&&!unique.has(w[1]))unique.set(w[1],w);
 }
 const nearby=[...unique.values()].sort((a,b)=>Math.abs(a[5]-word[5])-Math.abs(b[5]-word[5]));
 return shuffle([word[1],...shuffle(nearby.slice(0,30)).slice(0,2).map(w=>w[1])]);
}
