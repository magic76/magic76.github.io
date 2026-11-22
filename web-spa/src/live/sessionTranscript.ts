/** Teacher-only same-tab transcripts. Friends start fresh on every visit. */
const PREFIX="crew_text_transcript_v1:";
const RESUME_KEY="crew_friend_text_resume_v1";
const LAST_FRIEND_KEY="crew_friend_last_exchange_v1";
const PENDING_PREFIX="crew_text_pending_v1:";
type StoredMessage={role:"user"|"assistant";text:string};
type SessionStore=Pick<Storage,"getItem"|"setItem">;
type ClearableSessionStore=SessionStore&Pick<Storage,"removeItem">;
export type FriendResume={friendId:string;at:number;messages:StoredMessage[];preview:string};
export type FriendActivity={friendId:string;at:number;mode:"voice"|"text";resume:FriendResume|null};
const isFriendScope=(scope:string)=>scope.startsWith("friend:");
const cleanMessages=(value:unknown,maxText=15000):StoredMessage[]=>Array.isArray(value)?value.filter((m):m is StoredMessage=>
 (m?.role==="user"||m?.role==="assistant")&&typeof m.text==="string"&&m.text.trim().length>0
).slice(-40).map(m=>({role:m.role,text:m.text.slice(0,maxText)})):[];
/** A private, device-local pointer only. Never write voice transcripts, drafts or message text here. */
export function recordFriendActivity(friendId:string,mode:"voice"|"text",store?:SessionStore){
 if(!/^[a-z0-9-]{1,32}$/.test(friendId))return;
 try{(store||localStorage).setItem(LAST_FRIEND_KEY,JSON.stringify({friendId,mode,at:Date.now()}))}
 catch{/* Storage is optional. */}
}
/** Compare the most recent real exchange, not merely the last friend page opened. */
export function readLatestFriendActivity(store?:Pick<Storage,"getItem">):FriendActivity|null{
 try{
  const raw:unknown=JSON.parse((store||localStorage).getItem(LAST_FRIEND_KEY)||"null");
  const entry=raw&&typeof raw==="object"?raw as {friendId?:unknown;at?:unknown;mode?:unknown}:null;
  if(!entry||typeof entry.friendId!=="string"||!/^[a-z0-9-]{1,32}$/.test(entry.friendId)||
   typeof entry.at!=="number"||!Number.isFinite(entry.at)||entry.at<=0||entry.at>Date.now()+300000||
   (entry.mode!=="voice"&&entry.mode!=="text"))return null;
  // A home deep link uses identity only, never message text.
  return {friendId:entry.friendId,at:entry.at,mode:entry.mode,resume:null};
 }catch{return null}
}
/** Clear legacy friend transcripts and unsent drafts; leave teacher course state intact. */
export function clearLegacyFriendChats(
 deviceStore:Pick<Storage,"removeItem">=localStorage,
 tabStore:Pick<Storage,"length"|"key"|"removeItem">=sessionStorage
){
 try{deviceStore.removeItem(RESUME_KEY)}catch{}
 try{
  for(let i=tabStore.length-1;i>=0;i--){
   const key=tabStore.key(i);
   if(key&&(key.startsWith(PREFIX+"friend:")||key.startsWith(PENDING_PREFIX+"friend:")))tabStore.removeItem(key);
  }
 }catch{/* Storage can be disabled. */}
}
export function readSessionTranscript(scope:string,store?:SessionStore):StoredMessage[]{
 if(!scope||isFriendScope(scope))return [];
 try{return cleanMessages(JSON.parse((store||sessionStorage).getItem(PREFIX+scope)||"null"))}
 catch{return []}
}
export function writeSessionTranscript(scope:string,messages:StoredMessage[],store?:SessionStore){
 if(!scope||isFriendScope(scope))return;
 try{(store||sessionStorage).setItem(PREFIX+scope,JSON.stringify(cleanMessages(messages)))}catch{}
}

/** Unfinished attempts are kept as drafts, never as successfully sent chat turns. */
export type PendingTextDraft={text:string;sent:boolean};
export function readPendingTextDraft(scope:string,store:SessionStore=sessionStorage):PendingTextDraft|null{
 if(!scope||isFriendScope(scope))return null;
 try{
  const value=JSON.parse(store.getItem(PENDING_PREFIX+scope)||"null");
  return typeof value?.text==="string"&&value.text.length>0&&value.text.length<=1200
   ?{text:value.text,sent:value.sent===true}:null;
 }catch{return null}
}
export function writePendingTextDraft(scope:string,draft:PendingTextDraft,store:SessionStore=sessionStorage){
 if(!scope||isFriendScope(scope))return;
 try{store.setItem(PENDING_PREFIX+scope,JSON.stringify({text:draft.text.slice(0,1200),sent:draft.sent}))}catch{}
}
export function clearPendingTextDraft(scope:string,store:ClearableSessionStore=sessionStorage){
 if(!scope)return;
 try{store.removeItem(PENDING_PREFIX+scope)}catch{}
}
