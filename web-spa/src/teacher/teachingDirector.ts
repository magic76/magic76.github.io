/** Teaching Director: bounded, ephemeral stage controls for a single live lesson.
 * The model sends declarative data only. No HTML, script, persistent memory or
 * second-model inference is involved.
 */
import type {BoardCard} from "./boardProtocol";

export const DIRECTOR_FUNCTION="control_teaching_stage";
export type DirectorPhase="explaining"|"awaiting"|"feedback";
export type DirectorResult="correct"|"incorrect"|null;
export type DirectorCommand={
 action:"focus"|"reveal"|"ask"|"feedback"|"continue";
 cardId:string; index:number;
};
export type DirectorState={
 cardId:string|null;phase:DirectorPhase;focusIndex:number;
 revealed:number|null;quizIndex:number;result:DirectorResult;reviewCardId:string|null;
};
export const EMPTY_DIRECTOR:DirectorState={
 cardId:null,phase:"explaining",focusIndex:-1,revealed:null,
 quizIndex:0,result:null,reviewCardId:null
};
const plain=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==="object"&&!Array.isArray(x);
const validId=(x:unknown):x is string=>typeof x==="string"&&/^[a-z0-9_-]{1,40}$/i.test(x);
export function directorItemCount(card:BoardCard):number{
 return card.type==="quiz"?card.questions.length:
  card.type==="steps"||card.type==="timeline"?card.points.length:card.pairs.length;
}
export function validateDirectorCommand(raw:unknown,cards:BoardCard[]):DirectorCommand|null{
 if(!plain(raw))return null;
 try{if(JSON.stringify(raw).length>1200)return null}catch{return null}
 const action=raw.action;
 if(action!=="focus"&&action!=="reveal"&&action!=="ask"&&action!=="feedback"&&action!=="continue")return null;
 if(!validId(raw.cardId))return null;
 const card=cards.find(c=>c.id===raw.cardId);
 if(!card)return null;
 const index=raw.index===undefined?-1:raw.index;
 if(!Number.isInteger(index)||Number(index)<-1||Number(index)>7)return null;
 const count=directorItemCount(card);
 if(index>=count&&index!==-1)return null;
 if((action==="reveal"||action==="ask")&&index<0)return null;
 if((action==="ask"||action==="feedback")&&card.type!=="quiz")return null;
 return {action,cardId:card.id,index:Number(index)};
}
export function directorAfterPatch(old:DirectorState,next:BoardCard[],updated:BoardCard[]):DirectorState{
 if(!next.length)return {...EMPTY_DIRECTOR};
 // When a quiz is introduced, show the question and wait for the learner.
 // Never allow an unrelated patch to advance a question awaiting a response.
 if(old.phase==="awaiting"&&next.some(c=>c.id===old.cardId))return old;
 const target=updated.slice().reverse().find(c=>next.some(x=>x.id===c.id))||updated[updated.length-1]||next[next.length-1];
 if(!target||!next.some(c=>c.id===target.id))return {...EMPTY_DIRECTOR,cardId:next[next.length-1].id};
 return {...EMPTY_DIRECTOR,cardId:target.id,phase:target.type==="quiz"&&target.questions.length?"awaiting":"explaining"};
}
export function applyDirectorCommand(state:DirectorState,cmd:DirectorCommand,cards:BoardCard[],answers:Record<string,number>):DirectorState|null{
 const card=cards.find(c=>c.id===cmd.cardId);
 if(!card)return null;
 const idx=cmd.index;
 // Teacher must not turn the page or reveal the answer while waiting.
 if(state.phase==="awaiting"&&cmd.action!=="ask")return null;
 if(cmd.action==="ask"){
  if(card.type!=="quiz"||idx<0||answers[card.id+":"+idx]!==undefined)return null;
  return {...state,cardId:card.id,phase:"awaiting",quizIndex:idx,focusIndex:idx,revealed:null,result:null,reviewCardId:null};
 }
 if(cmd.action==="feedback"){
  const qindex=idx>=0?idx:state.quizIndex;
  if(card.type!=="quiz"||qindex<0||qindex>=card.questions.length)return null;
  const choice=answers[card.id+":"+qindex];
  if(!Number.isInteger(choice))return null;
  return {...state,cardId:card.id,phase:"feedback",quizIndex:qindex,focusIndex:qindex,
   result:choice===card.questions[qindex].answerIndex?"correct":"incorrect",
   reviewCardId:choice===card.questions[qindex].answerIndex?null:chooseReviewCard(cards,card.id)};
 }
 if(cmd.action==="continue"){
  if(state.phase==="awaiting")return null;
  if(card.type==="quiz"){
   const nextIndex=state.phase==="feedback"?state.quizIndex+1:Math.max(0,idx);
   if(nextIndex<card.questions.length&&answers[card.id+":"+nextIndex]===undefined)
    return {...EMPTY_DIRECTOR,cardId:card.id,phase:"awaiting",quizIndex:nextIndex,focusIndex:nextIndex};
  }
  return {...EMPTY_DIRECTOR,cardId:card.id};
 }
 if(cmd.action==="reveal"){
  if(idx<0)return null;
  return {...state,cardId:card.id,phase:"explaining",focusIndex:idx,revealed:idx+1,reviewCardId:null};
 }
 return {...state,cardId:card.id,phase:"explaining",focusIndex:idx,revealed:null,reviewCardId:null};
}
export function chooseReviewCard(cards:BoardCard[],quizId:string):string|null{
 const candidates=cards.filter(c=>c.id!==quizId&&c.type!=="quiz");
 return candidates.find(c=>c.type==="comparison")?.id||
  candidates.find(c=>c.type==="timeline")?.id||
  candidates.find(c=>c.type==="explanation")?.id||candidates[0]?.id||null;
}
export function directorAfterAnswer(state:DirectorState,card:BoardCard,index:number,choice:number,cards:BoardCard[]):DirectorState|null{
 const q=card.questions[index];
 if(card.type!=="quiz"||!q||!Number.isInteger(choice)||choice<0||choice>=q.options.length)return null;
 if(state.phase==="feedback"&&state.cardId===card.id&&state.quizIndex===index)return null;
 if(state.phase==="awaiting"&&(state.cardId!==card.id||state.quizIndex!==index))return null;
 const correct=choice===q.answerIndex;
 return {...state,cardId:card.id,phase:"feedback",quizIndex:index,focusIndex:index,
  result:correct?"correct":"incorrect",revealed:null,reviewCardId:correct?null:chooseReviewCard(cards,card.id)};
}
export const DIRECTOR_TOOL={
 functionDeclarations:[{
  name:DIRECTOR_FUNCTION,
  description:"Control the existing lesson stage. Use focus to point at a specific card/item; reveal to reveal an item one by one (zero-based index); ask to show a specific quiz question and PAUSE until the learner answers; feedback after the learner has actually answered; continue only after the answer. Prefer focusing an earlier comparison or timeline when the student is wrong, and continue with a fresh example or quiz when correct. Do not spam updates or move ahead while waiting. Use only IDs previously created with update_teaching_board. No HTML.",
  parameters:{type:"OBJECT",properties:{
   action:{type:"STRING",enum:["focus","reveal","ask","feedback","continue"]},
   cardId:{type:"STRING"},index:{type:"INTEGER",description:"Zero-based item index; -1 for whole card. For ask/reveal, a nonnegative index is required."}
  },required:["action","cardId"]}
 }]
};
