/** Same-tab drafts; completed friend conversations also get an explicitly device-local resume copy. */
const PREFIX="crew_text_transcript_v1:";
const RESUME_KEY="crew_friend_text_resume_v1";
type StoredMessage={role:"user"|"assistant";text:string};
type SessionStore=Pick<Storage,"getItem"|"setItem">;
type ClearableSessionStore=SessionStore&Pick<Storage,"removeItem">;
export type FriendResume={friendId:string;at:number;messages:StoredMessage[];preview:string};
const cleanMessages=(value:unknown,maxText=15000):StoredMessage[]=>Array.isArray(value)?value.filter((m):m is StoredMessage=>
 (m?.role==="user"||m?.role==="assistant")&&typeof m.text==="string"&&m.text.trim().length>0
).slice(-40).map(m=>({role:m.role,text:m.text.slice(0,maxText)})):[];
const friendIdFromScope=(scope:string)=>/^friend:([a-z0-9-]{1,32})$/.exec(scope)?.[1]||"";
function validResume(value:unknown):FriendResume|null{
 if(!value||typeof value!=="object")return null;
 const data=value as Partial<FriendResume>;
 if(typeof data.friendId!=="string"||!/^[a-z0-9-]{1,32}$/.test(data.friendId)||
  typeof data.at!=="number"||!Number.isFinite(data.at)||data.at<=0||data.at>Date.now()+300000)return null;
 const messages=cleanMessages(data.messages,4000);
 if(messages.length<2||messages.at(-1)?.role!=="assistant"||!messages.some(m=>m.role==="user"))return null;
 const preview=[...messages].reverse().find(m=>m.role==="assistant")?.text.trim().replace(/\s+/g," ").slice(0,110)||"";
 return {friendId:data.friendId,at:data.at,messages,preview};
}
function savedResumes(store:Pick<Storage,"getItem">):FriendResume[]{
 try{
  const parsed:unknown=JSON.parse(store.getItem(RESUME_KEY)||"null");
  return Array.isArray(parsed)?parsed.map(validResume).filter((v):v is FriendResume=>v!==null).slice(0,6):[];
 }catch{return []}
}
/** Only the most recent six completed friend threads; no keys, drafts, voice or backend. */
export function saveFriendResume(scope:string,messages:StoredMessage[],store?:SessionStore){
 const friendId=friendIdFromScope(scope);
 if(!friendId)return;
 const compact=cleanMessages(messages,4000);
 if(compact.length<2||compact.at(-1)?.role!=="assistant"||!compact.some(m=>m.role==="user"))return;
 try{
  const target=store||localStorage;
  const at=Date.now();
  const next=[{friendId,at,messages:compact,preview:""},...savedResumes(target).filter(v=>v.friendId!==friendId)].slice(0,6);
  target.setItem(RESUME_KEY,JSON.stringify(next));
 }catch{/* Storage denied/quota full: keep in-tab transcript without blocking chat. */}
}
export function readLatestFriendResume(store?:Pick<Storage,"getItem">):FriendResume|null{
 try{return savedResumes(store||localStorage).sort((a,b)=>b.at-a.at)[0]||null}catch{return null}
}
export function readSessionTranscript(scope:string,store?:SessionStore):StoredMessage[]{
 if(!scope)return [];
 try{
  const target=store||sessionStorage;
  const current=cleanMessages(JSON.parse(target.getItem(PREFIX+scope)||"null"));
  if(current.length)return current;
  // An actual browser tab without a same-tab history can restore its device-local friend thread.
  if(typeof sessionStorage!=="undefined"&&target===sessionStorage){
   const friendId=friendIdFromScope(scope);
   if(friendId){
    const resumed=savedResumes(localStorage).find(item=>item.friendId===friendId);
    if(resumed)return resumed.messages;
   }
  }
  return [];
 }catch{return []}
}
export function writeSessionTranscript(scope:string,messages:StoredMessage[],store?:SessionStore){
 if(!scope)return;
 try{(store||sessionStorage).setItem(PREFIX+scope,JSON.stringify(cleanMessages(messages)))}catch{}
}

/** Unfinished attempts are kept as drafts, never as successfully sent chat turns. */
const PENDING_PREFIX="crew_text_pending_v1:";
export type PendingTextDraft={text:string;sent:boolean};
export function readPendingTextDraft(scope:string,store:SessionStore=sessionStorage):PendingTextDraft|null{
 if(!scope)return null;
 try{
  const value=JSON.parse(store.getItem(PENDING_PREFIX+scope)||"null");
  return typeof value?.text==="string"&&value.text.length>0&&value.text.length<=1200
   ?{text:value.text,sent:value.sent===true}:null;
 }catch{return null}
}
export function writePendingTextDraft(scope:string,draft:PendingTextDraft,store:SessionStore=sessionStorage){
 if(!scope)return;
 try{store.setItem(PENDING_PREFIX+scope,JSON.stringify({text:draft.text.slice(0,1200),sent:draft.sent}))}catch{}
}
export function clearPendingTextDraft(scope:string,store:ClearableSessionStore=sessionStorage){
 if(!scope)return;
 try{store.removeItem(PENDING_PREFIX+scope)}catch{}
}
