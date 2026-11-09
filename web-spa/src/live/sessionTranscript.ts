/** Same-tab transcript only. No localStorage, backend writes, or permanent memory. */
const PREFIX="crew_text_transcript_v1:";
type StoredMessage={role:"user"|"assistant";text:string};
type SessionStore=Pick<Storage,"getItem"|"setItem">;
type ClearableSessionStore=SessionStore&Pick<Storage,"removeItem">;
export function readSessionTranscript(scope:string,store:SessionStore=sessionStorage):StoredMessage[]{
 if(!scope)return [];
 try{
  const value=JSON.parse(store.getItem(PREFIX+scope)||"null");
  if(!Array.isArray(value))return [];
  return value.filter((m):m is StoredMessage=>
   (m?.role==="user"||m?.role==="assistant")&&typeof m.text==="string"
  ).slice(-40).map(m=>({role:m.role,text:m.text.slice(0,15000)}));
 }catch{return []}
}
export function writeSessionTranscript(scope:string,messages:StoredMessage[],store:SessionStore=sessionStorage){
 if(!scope)return;
 try{
  store.setItem(PREFIX+scope,JSON.stringify(messages.slice(-40).map(m=>({role:m.role,text:m.text.slice(0,15000)}))));
 }catch{} // Private browsing/storage disabled: chat still works in React state.
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
