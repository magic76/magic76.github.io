import {useEffect,useState} from "react";
import {useTeacherStore} from "../store/teacherStore";

/** Read only consented, verified same-friend/language notes after hydration.
 * Lazy loading keeps memory/Live implementation out of the initial home bundle.
 */
export function useHomeFriendTopic(friendId:string|undefined){
 const language=useTeacherStore(s=>s.targetLanguage);
 const [note,setNote]=useState<{id:string;language:string;title:string}|null>(null);
 useEffect(()=>{
  if(!friendId){setNote(null);return;}
  let generation=0,disposed=false;
  const refresh=()=>{
   const current=++generation;
   setNote(null);
   void import("../friends/friendMemory").then(memory=>{
    if(disposed||generation!==current)return;
    const topic=memory.getHomeChatTopic(friendId,language);
    setNote(topic?{id:friendId,language,title:topic.title}:null);
   }).catch(()=>{});
  };
  refresh();
  window.addEventListener("storage",refresh);
  window.addEventListener("focus",refresh);
  window.addEventListener("crew-friend-memory-changed",refresh);
  return()=>{disposed=true;window.removeEventListener("storage",refresh);window.removeEventListener("focus",refresh);window.removeEventListener("crew-friend-memory-changed",refresh)};
 },[friendId,language]);
 if(note?.id!==friendId||note?.language!==language)return "";
 // Title only, never a transcript or the note summary. No topic content in analytics or links.
 return Array.from(note.title).slice(0,36).join("")+(Array.from(note.title).length>36?"…":"");
}
