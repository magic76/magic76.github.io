/** Same-tab drafts; completed friend conversations also get an explicitly device-local resume copy. */
const PREFIX="crew_text_transcript_v1:";
const RESUME_KEY="crew_friend_text_resume_v1";
const LAST_FRIEND_KEY="crew_friend_last_exchange_v1";
type StoredMessage={role:"user"|"assistant";text:string};
type SessionStore=Pick<Storage,"getItem"|"setItem">;
type ClearableSessionStore=SessionStore&Pick<Storage,"removeItem">;
export type FriendResume={friendId:string;at:number;messages:StoredMessage[];preview:string};
export type FriendActivity={friendId:string;at:number;mode:"voice"|"text";resume:FriendResume|null};
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
  recordFriendActivity(friendId,"text",target);
 }catch{/* Storage denied/quota full: keep in-tab transcript without blocking chat. */}
}
export function readLatestFriendResume(store?:Pick<Storage,"getItem">):FriendResume|null{
 try{return savedResumes(store||localStorage).sort((a,b)=>b.at-a.at)[0]||null}catch{return null}
}
/** A private, device-local pointer only. Never write voice transcripts, drafts or message text here. */
export function recordFriendActivity(friendId:string,mode:"voice"|"text",store?:SessionStore){
 if(!/^[a-z0-9-]{1,32}$/.test(friendId))return;
 try{(store||localStorage).setItem(LAST_FRIEND_KEY,JSON.stringify({friendId,mode,at:Date.now()}))}
 catch{/* Storage is optional. */}
}
/** Compare the most recent real exchange, not merely the last friend page opened. */
export function readLatestFriendActivity(store?:Pick<Storage,"getItem">):FriendActivity|null{
 try{
  const target=store||localStorage;
  const resume=readLatestFriendResume(target);
  const raw:unknown=JSON.parse(target.getItem(LAST_FRIEND_KEY)||"null");
  const entry=raw&&typeof raw==="object"?raw as {friendId?:unknown;at?:unknown;mode?:unknown}:null;
  const valid=entry&&typeof entry.friendId==="string"&&/^[a-z0-9-]{1,32}$/.test(entry.friendId)&&
   typeof entry.at==="number"&&Number.isFinite(entry.at)&&entry.at>0&&entry.at<=Date.now()+300000&&
   (entry.mode==="voice"||entry.mode==="text");
  if(!valid||!entry)return resume?{friendId:resume.friendId,at:resume.at,mode:"text",resume}:null;
  if(resume&&typeof entry.at==="number"&&resume.at>entry.at)return {friendId:resume.friendId,at:resume.at,mode:"text",resume};
  const currentResume=entry.mode==="text"&&resume!==null&&resume.friendId===entry.friendId&&typeof entry.at==="number"&&Math.abs(resume.at-entry.at)<1000?resume:null;
  return {friendId:entry.friendId as string,at:entry.at as number,mode:entry.mode as "voice"|"text",resume:currentResume};
 }catch{return null}
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
/** Only a genuine cross-tab/device resume can start a local welcome-back greeting. */
export type ReturningFriendVisit={at:number;minutes:number;excerpt:string};
export function readReturningFriendResume(scope:string,tabStore?:Pick<Storage,"getItem">,deviceStore?:Pick<Storage,"getItem">,now=Date.now()):ReturningFriendVisit|null{
 const friendId=friendIdFromScope(scope);
 if(!friendId)return null;
 try{
  const tab=tabStore||sessionStorage;
  // A same-tab transcript is not a return visit, even after a long idle period.
  if(cleanMessages(JSON.parse(tab.getItem(PREFIX+scope)||"null")).length)return null;
  const resume=savedResumes(deviceStore||localStorage).find(item=>item.friendId===friendId);
  if(!resume||now-resume.at<30*60*1000)return null;
  const lastUser=[...resume.messages].reverse().find(m=>m.role==="user");
  if(!lastUser)return null;
  const compact=lastUser.text.replace(/\s+/g," ").trim();
  const chars=Array.from(compact);
  return {at:resume.at,minutes:Math.max(30,Math.floor((now-resume.at)/60000)),
   excerpt:chars.slice(0,40).join("")+(chars.length>40?"…":"")};
 }catch{return null}
}
/** System-only hint, never a message or a stored transcript turn. */
export function returningFriendSystemHint(visit:ReturningFriendVisit):string{
 const elapsed=visit.minutes<90?`${visit.minutes} minutes`:`${Math.round(visit.minutes/60)} hours`;
 return `[RETURNING USER] The user is back after about ${elapsed}. Earlier turns are from the previous visit. Greet briefly as a friend who remembers. Continue the prior topic, unless the user asks for something new.`;
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
