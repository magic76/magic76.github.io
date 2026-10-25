/** Pure adaptive branch selection based only on a confirmed learner quiz answer.
 * Do not score spoken pronunciation or infer mastery from an AI model response.
 */
import type {BoardCard} from "./boardProtocol";
import {chooseReviewCard} from "./teachingDirector";
export type AdaptiveNext={kind:"review";cardId:string}|{kind:"next-question";index:number}|{kind:"next-lesson";index:number}|{kind:"next-exercise"}|{kind:"stay"};
export function planAdaptiveNext(card:BoardCard,index:number,correct:boolean,cards:BoardCard[],guided:boolean):AdaptiveNext{
 if(card.type!=="quiz"||index<0||index>=card.questions.length)return {kind:"stay"};
 if(!correct){
  const reviewId=chooseReviewCard(cards,card.id);
  return reviewId?{kind:"review",cardId:reviewId}:{kind:"stay"};
 }
 if(index+1<card.questions.length)return {kind:"next-question",index:index+1};
 if(guided){
  const next=cards.findIndex(c=>c.id===card.id)+1;
  return next>0&&next<cards.length?{kind:"next-lesson",index:next}:{kind:"stay"};
 }
 return {kind:"next-exercise"};
}
