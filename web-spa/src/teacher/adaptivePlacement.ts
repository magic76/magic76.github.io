/* Placement parity with Android VocabularyProgressManager V2:
 * new-band probes require two verified correct answers; normal answers cannot skip bands.
 */
import type{VocabularyWord}from"./vocabularyCatalog";
const KEY="crew_teacher_placement_v2";
export type Placement={score:number;attempts:number;calibrationRemaining:number;probeWins:number;forceProbe:boolean;recovery:number};
const clamp=(v:number)=>Math.max(0,Math.min(100,Math.round(v)));
export function currentBandFloor(score:number){return score<=20?0:score<=40?21:score<=60?41:score<=80?61:81}
export function currentBandMax(score:number){return score<=20?20:score<=40?40:score<=60?60:score<=80?80:100}
export function nextBandFloor(score:number){return score<=20?21:score<=40?41:score<=60?61:score<=80?81:score<=90?91:score<=95?96:100}
export function isPlacementProbe(score:number,difficulty:number){return difficulty>=nextBandFloor(score)}
export function placementState():Placement{
 const initialScore=Number(localStorage.getItem("crew_vocab_score")||50);
 const fresh={score:clamp(Number.isFinite(initialScore)?initialScore:50),attempts:0,calibrationRemaining:12,probeWins:0,forceProbe:false,recovery:0};
 try{const old=JSON.parse(localStorage.getItem(KEY)||"null");
 if(!old||typeof old!=="object")return fresh;
 return{score:clamp(Number(old.score)||0),attempts:Math.max(0,Number(old.attempts)||0),
 calibrationRemaining:Math.max(0,Number(old.calibrationRemaining)||0),probeWins:Math.max(0,Number(old.probeWins)||0),
 forceProbe:Boolean(old.forceProbe),recovery:Math.max(0,Number(old.recovery)||0)};
 }catch{return fresh}
}
export function recordPlacement(word:VocabularyWord,correct:boolean){
 const s=placementState(),difficulty=word[5];
 if(isPlacementProbe(s.score,difficulty)){
  if(correct){
   s.probeWins++;
   if(s.probeWins>=2){s.score=Math.max(s.score,nextBandFloor(s.score));s.probeWins=0;s.forceProbe=false}
   else s.forceProbe=true;
  }else{s.probeWins=0;s.forceProbe=false}
 }else{
  const delta=correct?(difficulty>=s.score-4?1:0):(difficulty<=s.score+4?-2:0);
  s.score=Math.max(currentBandFloor(s.score),Math.min(currentBandMax(s.score),s.score+delta));
 }
 s.attempts++;s.calibrationRemaining=Math.max(0,s.calibrationRemaining-1);
 s.recovery=correct?Math.max(0,s.recovery-1):3;
 localStorage.setItem(KEY,JSON.stringify(s));
 localStorage.setItem("crew_vocab_score",String(s.score));
 return s;
}
export function placementLabel(s=placementState()){
 return s.attempts<8?"估算中":s.score<=20?"Pre-A1":s.score<=40?"A1":s.score<=60?"A2":s.score<=80?"B1":"B2+";
}
