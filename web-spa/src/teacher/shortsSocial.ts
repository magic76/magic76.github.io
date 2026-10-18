import type {ShortPost} from "./shortsFeed";

/**
 * Conversation hooks are fixed application options, never text taken from a URL.
 * Existing post/role IDs continue to be resolved against the approved Shorts feed.
 */
export type ShortsHook="details"|"feelings"|"next";
export const SHORTS_HOOKS:readonly ShortsHook[]=["details","feelings","next"];
export function isShortsHook(value:string|null):value is ShortsHook{
 return value!==null&&SHORTS_HOOKS.some(hook=>hook===value);
}
export function shortsHookLabel(hook:ShortsHook,en:boolean):string{
 const labels={
  details:["Tell me more","怎麼回事？"],
  feelings:["How do you feel?","你現在怎麼想？"],
  next:["What happened next?","後來呢？"]
 } as const;
 return labels[hook][en?0:1];
}
export function shortsOpeningHint(hook:string|null):string{
 if(!isShortsHook(hook))return "";
 const hints:Record<ShortsHook,string>={
  details:"The learner chose 'Tell me more'. Briefly explain a concrete detail already grounded in this fictional story, then leave space for their response.",
  feelings:"The learner chose 'How do you feel?'. Share your in-character reaction to this fictional story, then leave space for their response.",
  next:"The learner chose 'What happened next?'. If the published story has an established outcome, share it; otherwise be candid that the next step is still uncertain. Do not invent a later event as fact."
 };
 return "\n[SELECTED SHORTS CONVERSATION ENTRY — fixed application option]\n"+
  hints[hook]+" Keep the already selected conversation language and mode.\n";
}
export function shortsChatUrl(post:ShortPost,hook?:ShortsHook):string{
 return "/friend/live?id="+encodeURIComponent(post.friendId)+"&post="+encodeURIComponent(post.id)+
  (hook?"&hook="+hook:"");
}
export function shortsStoryEpisodes(post:ShortPost,posts:readonly ShortPost[]):ShortPost[]{
 return posts.filter(item=>item.friendId===post.friendId&&item.storyId===post.storyId)
  .sort((a,b)=>Date.parse(a.publishedAt)-Date.parse(b.publishedAt)||a.id.localeCompare(b.id));
}

type ConversationEntry={friendId:string;storyId:string;postId:string;publishedAt:string;at:number};
const PROGRESS_KEY="crew_shorts_conversations_v1";
const CONSENT_KEY="crew_friend_topics_consent_v1";
const MAX_PROGRESS=40;
/** Only approved public post identifiers are stored. Never save user text or AI responses. */
export function readShortsConversations():ConversationEntry[]{
 try{
  if(typeof localStorage==="undefined"||localStorage.getItem(CONSENT_KEY)==="0")return [];
  const saved:unknown=JSON.parse(localStorage.getItem(PROGRESS_KEY)||"[]");
  if(!Array.isArray(saved))return [];
  return saved.filter((item:unknown):item is ConversationEntry=>{
   if(!item||typeof item!=="object")return false;
   const p=item as Partial<ConversationEntry>;
   return typeof p.friendId==="string"&&/^[a-z]{2,16}$/.test(p.friendId)
    &&typeof p.storyId==="string"&&/^[a-zA-Z0-9_-]{1,110}$/.test(p.storyId)
    &&typeof p.postId==="string"&&/^[a-zA-Z0-9_-]{3,96}$/.test(p.postId)
    &&typeof p.publishedAt==="string"&&Number.isFinite(Date.parse(p.publishedAt))
    &&typeof p.at==="number"&&Number.isFinite(p.at)&&p.at>0;
  }).sort((a,b)=>b.at-a.at).slice(0,MAX_PROGRESS);
 }catch{return []}
}
export function rememberShortsConversation(post:ShortPost):void{
 try{
  if(typeof localStorage==="undefined")return;
  if(localStorage.getItem(CONSENT_KEY)==="0"){
   localStorage.removeItem(PROGRESS_KEY);
   return;
  }
  const key=post.friendId+"::"+post.storyId;
  const kept=readShortsConversations().filter(p=>p.friendId+"::"+p.storyId!==key);
  kept.unshift({friendId:post.friendId,storyId:post.storyId,postId:post.id,
   publishedAt:post.publishedAt,at:Date.now()});
  localStorage.setItem(PROGRESS_KEY,JSON.stringify(kept.slice(0,MAX_PROGRESS)));
 }catch{/* Storage can be disabled by the browser. Never break live calls. */}
}
export function clearShortsConversations():void{
 try{if(typeof localStorage!=="undefined")localStorage.removeItem(PROGRESS_KEY)}catch{/* private mode */}
}
/** Find actual newer published episodes, not invented follow-up stories. */
export function shortsStoryFollowUps(posts:readonly ShortPost[]):Array<{previous:ConversationEntry;post:ShortPost}>{
 const progress=readShortsConversations();
 const followUps:Array<{previous:ConversationEntry;post:ShortPost}>=[];
 for(const previous of progress){
  const later=posts.filter(post=>post.friendId===previous.friendId&&post.storyId===previous.storyId
   &&post.id!==previous.postId&&Date.parse(post.publishedAt)>Date.parse(previous.publishedAt))
   .sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))[0];
  if(later)followUps.push({previous,post:later});
 }
 return followUps.sort((a,b)=>Date.parse(b.post.publishedAt)-Date.parse(a.post.publishedAt)).slice(0,4);
}
