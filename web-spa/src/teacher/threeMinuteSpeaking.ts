import {CREW_FRIENDS} from "../friends/friendProfiles";

const SELECTED_FRIEND_KEY="crew_web_selected_friend_v1";

/** Reuse the last Crew Friend the learner chose. Do not pick a new identity
 * simply because they opened Learn instead of Chat. */
export function threeMinuteSpeakingPath():string{
 let id="";
 try{if(typeof localStorage!=="undefined")id=localStorage.getItem(SELECTED_FRIEND_KEY)||""}catch{/* Use the first published Friend. */}
 const selected=CREW_FRIENDS.find(friend=>friend.id===id)||CREW_FRIENDS[0];
 return "/friend/live?id="+encodeURIComponent(selected.id)+"&intent=speak";
}
