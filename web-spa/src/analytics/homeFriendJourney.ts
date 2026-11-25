import {trackUsageEvent} from "./usage";
const KEY="crew_home_friend_journey_v1";
type Stage="pick"|"verify"|"reply";
type Kind="fresh"|"resume";
type Attempt={friendId:string;kind:Kind;stage:Stage;at:number};
const MAX_AGE=30*60*1000;
function read():Attempt|null{
 try{
  const a=JSON.parse(sessionStorage.getItem(KEY)||"null") as Attempt|null;
  return a&&typeof a.friendId==="string"&&/^[a-z0-9-]{1,32}$/.test(a.friendId)&&
   (a.kind==="fresh"||a.kind==="resume")&&["pick","verify","reply"].includes(a.stage)&&
   Number.isFinite(a.at)&&a.at<=Date.now()&&Date.now()-a.at<=MAX_AGE?a:null;
 }catch{return null}
}
function save(a:Attempt){
 try{sessionStorage.setItem(KEY,JSON.stringify(a));return true}catch{return false}
}
/** A new primary CTA attempt; only fixed stage/mode enums leave this browser. */
export function beginHomeFriendJourney(friendId:string,returning:boolean){
 if(!/^[a-z0-9-]{1,32}$/.test(friendId))return;
 const a:Attempt={friendId,kind:returning?"resume":"fresh",stage:"pick",at:Date.now()};
 if(save(a))trackUsageEvent("home_friend_journey",`${a.kind}_pick`);
}
/** Advance only a matching, recent CTA attempt. Direct links and reloads cannot create a click. */
export function advanceHomeFriendJourney(friendId:string,stage:"verify"|"reply"){
 const a=read();
 if(!a||a.friendId!==friendId||a.stage==="reply")return;
 if(a.stage==="pick"){
  if(!save({...a,stage:"verify"}))return;
  trackUsageEvent("home_friend_journey",`${a.kind}_verify`);
 }
 if(stage==="reply"&&save({...a,stage:"reply"}))trackUsageEvent("home_friend_journey",`${a.kind}_reply`);
}
