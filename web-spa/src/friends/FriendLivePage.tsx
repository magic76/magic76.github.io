import {useEffect,useState} from "react";
import {useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {fetchShortsPost,type ShortPost} from "../teacher/shortsFeed";
import {FriendLiveConversation} from "./FriendLiveConversation";
export function FriendLivePage(){
 const {t}=useTranslation("voice");const [params]=useSearchParams();
 const postId=params.get("post"),friendId=params.get("id");
 const lookupKey=String(friendId||"")+"::"+String(postId||"");
 const [lookup,setLookup]=useState<{key:string;post:ShortPost|null}|null>(null);
 useEffect(()=>{
  if(!postId)return;
  const abort=new AbortController();
  fetchShortsPost(postId,friendId||"",abort.signal).then(found=>{
   if(!abort.signal.aborted)setLookup({key:lookupKey,post:found});
  }).catch(()=>{if(!abort.signal.aborted)setLookup({key:lookupKey,post:null})});
  return()=>abort.abort();
 },[postId,friendId,lookupKey]);
 if(postId&&(!lookup||lookup.key!==lookupKey))
  return <main className="session-shell"><p className="spa-loading" role="status">{t("friendLive.preparingPost")}</p></main>;
 return <FriendLiveConversation shortsPost={postId?lookup?.post||null:null} postUnavailable={Boolean(postId&&!lookup?.post)}/>;
}
