import {useEffect,useState} from "react";
import type {BoardPair} from "./boardProtocol";
import {dueBoardReviews,loadBoardReviews,recordBoardReview,clearBoardReviews,type ReviewRating,type ReviewItem} from "./boardReviewSchedule";

/** Browser-only preference-scoped review queue; no Live session or conversation transcript persisted. */
export function useBoardReviewState(language:string,teacher:string,enabled:boolean){
 const [revision,setRevision]=useState(0);
 const [all,setAll]=useState<ReviewItem[]>([]);
 const refresh=()=>setRevision(v=>v+1);
 useEffect(()=>{setAll(loadBoardReviews(language,teacher,enabled))},[language,teacher,enabled,revision]);
 return {
  due:enabled?all.filter(x=>x.dueAt<=Date.now()).sort((a,b)=>a.dueAt-b.dueAt).slice(0,8):[],
  total:enabled?all.length:0,
  enabled,
  rate:(pair:BoardPair,rating:ReviewRating)=>{recordBoardReview(language,teacher,pair,rating,enabled);refresh()},
  clear:()=>{clearBoardReviews(language,teacher);setAll([]);refresh()},
  refresh
 };
}
