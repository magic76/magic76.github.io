/** Friend-only instruction and protocol for optional, clickable next-user utterances. */
export const FRIEND_TEXT_INSTRUCTIONS=`
[FRIEND KEYBOARD CHAT — final rule]
Respect this friend's persona, safety and current language mode (natural/native, bilingual or immersion). Preserve the first two beginner text replies' separate parenthesized native-language meaning line; it belongs in the visible reply before the suffix.
Write like a friend texting: 1–3 short, natural sentences, about 40 English words or 60 Chinese/Japanese/Korean characters maximum. Ask at most ONE question. No lists or Markdown in the visible reply.
After EVERY reply append exactly this separate, hidden machine-readable suffix:
[[NEXT_REPLIES]]
- The user's next short sentence
- A different short sentence the user could say
[[/NEXT_REPLIES]]
Write 2 or 3 distinct, relevant first-person USER utterances (add one more dash line if useful), each about 12 English words maximum or similarly brief. Use the user's current chat language (interface/native for native conversation, target for bilingual target chat/immersion; explicit clarification requests may use their chosen native language). Never place suggestions in the visible reply. No extra text after the suffix. Never speak, quote or carry the suffix into chat history.`;

const OPEN="[[NEXT_REPLIES]]";
const CLOSE="[[/NEXT_REPLIES]]";
/** Hide both complete and unfinished metadata, even during Live partial revisions. */
export function stripFriendReplyMeta(raw:string):string{
 const marker=raw.search(/\[{1,2}\s*\/?\s*NEXT_REPLIES\b/i);
 if(marker>=0)return raw.slice(0,marker).trimEnd();
 // Suppress a half-delivered opening marker; never flash it into the transcript.
 for(const token of [OPEN,"[NEXT_REPLIES]","<NEXT_REPLIES>"]){
  for(let length=token.length-1;length>=2;length--){
   if(raw.endsWith(token.slice(0,length)))return raw.slice(0,-length).trimEnd();
  }
 }
 return raw;
}
export function parseFriendReply(raw:string):{text:string;replies:string[]|null}{
 const text=stripFriendReplyMeta(raw).trim();
 const start=raw.indexOf(OPEN);
 if(start<0)return{text,replies:null};
 const end=raw.indexOf(CLOSE,start+OPEN.length);
 if(end<0||raw.slice(end+CLOSE.length).trim())return{text,replies:null};
 const body=raw.slice(start+OPEN.length,end).trim();
 const lines=body.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
 if(lines.length<2||lines.length>3)return{text,replies:null};
 const replies=lines.map(line=>{
  const match=/^(?:- |• |\d+[.)] )(.+)$/.exec(line);
  return match?.[1]?.trim()||"";
 });
 if(replies.some(reply=>!reply||reply.length>100||reply.split(/\s+/).length>16||/[<>\[\]\n]/.test(reply))||new Set(replies.map(reply=>reply.toLocaleLowerCase())).size!==replies.length)
  return{text,replies:null};
 return{text,replies};
}
/** Stay under the Worker system limit, preserving Shorts handoff and language tail. */
export function friendGuestSystem(system:string):string{
 const max=6000-FRIEND_TEXT_INSTRUCTIONS.length;
 if(system.length<=max)return system+FRIEND_TEXT_INSTRUCTIONS;
 const marker="\n[EARLIER FRIEND BACKGROUND SHORTENED FOR TEXT CHAT]\n";
 // Shorts' verified post and final language directive are protected tail content.
 const shortsAt=system.indexOf("\n[SHORTS TEXT HANDOFF — FIRST REPLY]");
 if(shortsAt>=0){
  const tail=system.slice(shortsAt);
  if(tail.length+marker.length<max){
   const prefix=system.slice(0,shortsAt);
   const budget=max-tail.length-marker.length;
   const head=Math.min(450,Math.floor(budget/2));
   return prefix.slice(0,head)+marker+prefix.slice(head).slice(-(budget-head))+tail+FRIEND_TEXT_INSTRUCTIONS;
  }
 }
 const head=Math.min(550,Math.floor((max-marker.length)/4));
 return system.slice(0,head)+marker+system.slice(-(max-head-marker.length))+FRIEND_TEXT_INSTRUCTIONS;
}
