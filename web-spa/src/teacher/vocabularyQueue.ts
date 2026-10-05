import{VOCABULARY_WORDS,type VocabularyWord}from"./vocabularyCatalog";
import{dueVocabulary}from"./vocabularyProgress";
const RECOVERY_KEY="crew_teacher_vocab_recovery_v1";
const shuffle=<T,>(a:T[])=>a.map(v=>[Math.random(),v]as const).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
export function flowRecovery(){return Math.max(0,Number(localStorage.getItem(RECOVERY_KEY)||0))}
export function recordFlow(correct:boolean){const next=correct?Math.max(0,flowRecovery()-1):3;localStorage.setItem(RECOVERY_KEY,String(next));return next}
function nextBandFloor(score:number){if(score<=20)return 21;if(score<=40)return 41;if(score<=60)return 61;if(score<=80)return 81;if(score<=90)return 91;if(score<=95)return 96;return 100}
function candidates(score:number,slot:number){
 const recovery=flowRecovery(),mode=recovery>0?0:((slot%10)<=5?0:(slot%10)<=8?1:2);
 let min=0,max=100;
 if(mode===0){min=score-10;max=score+5}
 else if(mode===1){min=score+3;max=score+14}
 else{min=nextBandFloor(score);max=Math.min(100,min+16)}
 let pool=VOCABULARY_WORDS.filter(x=>x[5]>=min&&x[5]<=max);
 if(pool.length<3)pool=VOCABULARY_WORDS.filter(x=>Math.abs(x[5]-score)<=16);
 return pool.length?pool:VOCABULARY_WORDS;
}
export function chooseVocabulary(score:number,current:VocabularyWord|undefined,slot:number){
 const dueIds=new Set(dueVocabulary(VOCABULARY_WORDS.map(x=>x[0])));
 const due=VOCABULARY_WORDS.filter(x=>dueIds.has(x[0])&&x!==current);
 if(due.length)return shuffle(due).sort((a,b)=>Math.abs(a[5]-score)-Math.abs(b[5]-score))[0];
 const pool=candidates(score,slot).filter(x=>x!==current);
 return shuffle(pool)[0]||VOCABULARY_WORDS[0];
}
export function vocabularyChoices(word:VocabularyWord){
 const nearby=VOCABULARY_WORDS.filter(x=>x[0]!==word[0]&&Math.abs(x[5]-word[5])<20);
 return shuffle([word[1],...shuffle(nearby).slice(0,2).map(x=>x[1])]);
}
