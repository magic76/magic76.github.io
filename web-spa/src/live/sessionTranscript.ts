/** Same-tab transcript only. No localStorage, backend writes, or permanent memory. */
const PREFIX="crew_text_transcript_v1:";
type StoredMessage={role:"user"|"assistant";text:string};
type SessionStore=Pick<Storage,"getItem"|"setItem">;
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
