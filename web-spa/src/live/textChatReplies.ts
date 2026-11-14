/** Friend-only instruction and protocol for optional, clickable next-user utterances. */
export const FRIEND_TEXT_INSTRUCTIONS=`
[FRIEND KEYBOARD CHAT — final rule]
Respect this friend's persona, safety and current language mode (natural/native, bilingual or immersion). Preserve the first two beginner text replies' separate parenthesized native-language meaning line; it belongs in the visible reply before the suffix.
Write like a friend texting: 1–3 short, natural sentences, about 40 English words or 60 Chinese/Japanese/Korean characters maximum. Ask at most ONE question. No lists or Markdown in the visible reply.
Keyboard-only exception to earlier "never correct/recast/coaching": If the user's own sentence is in the practiced language AND clearly wrong or unnatural, add at most ONE [[TIP]]corrected sentence[[/TIP]]. Ignore punctuation, case and casual shorthand; never correct native-language chat. This is hidden, not a visible lesson. If explicitly asked whether a sentence was right, respond warmly and briefly (right: confirm + idiomatic alternative; wrong: fix + one reason). For that check, natural uses UI/native language, immersion uses simple target language only, bilingual uses native explanation only if requested; preserve persona and beginner meaning lines.
Optionally add ONE [[PHRASE]]useful practiced-language expression[[/PHRASE]], without private details. Both optional blocks are single-line; order TIP, PHRASE, NEXT_REPLIES. Never put correction or markers inside the visible reply.
After EVERY reply append exactly this separate, hidden machine-readable suffix:
[[NEXT_REPLIES]]
- The user's next short sentence
- A different short sentence the user could say
[[/NEXT_REPLIES]]
Write 2 or 3 distinct, relevant first-person USER utterances (add one more dash line if useful), each about 12 English words maximum or similarly brief. Use the user's current chat language (interface/native for native conversation, target for bilingual target chat/immersion; explicit clarification requests may use their chosen native language). Never place suggestions in the visible reply. No extra text after the suffix. Never speak, quote or carry the suffix into chat history.`;

const OPEN="[[NEXT_REPLIES]]";
const CLOSE="[[/NEXT_REPLIES]]";
const TIP_OPEN="[[TIP]]",TIP_CLOSE="[[/TIP]]";
const PHRASE_OPEN="[[PHRASE]]",PHRASE_CLOSE="[[/PHRASE]]";
function metadataValue(raw:string,start:string,end:string,max:number):string|null{
 const at=raw.indexOf(start);
 if(at<0)return null;
 const stop=raw.indexOf(end,at+start.length);
 if(stop<0)return null;
 const value=raw.slice(at+start.length,stop).trim();
 return value&&value.length<=max&&!/[\r\n<>\[\]]/.test(value)?value:null;
}

/** Hide both complete and unfinished metadata, even during Live partial revisions. */
export function stripFriendReplyMeta(raw:string):string{
 const marker=raw.search(/\[{1,2}\s*\/?\s*(?:NEXT_REPLIES|TIP|PHRASE)\b/i);
 if(marker>=0)return raw.slice(0,marker).trimEnd();
 // Live partials can end midway through any opening token; no metadata flashes.
 for(const token of [OPEN,TIP_OPEN,PHRASE_OPEN,"[NEXT_REPLIES]","<NEXT_REPLIES>"]){
  for(let length=token.length-1;length>=2;length--){
   if(raw.endsWith(token.slice(0,length)))return raw.slice(0,-length).trimEnd();
  }
 }
 return raw;
}
export function parseFriendReply(raw:string):{text:string;replies:string[]|null;tip:string|null;phrase:string|null}{
 const text=stripFriendReplyMeta(raw).trim();
 const start=raw.indexOf(OPEN);
 const end=start<0?-1:raw.indexOf(CLOSE,start+OPEN.length);
 const suffixValid=start>=0&&end>=0&&!raw.slice(end+CLOSE.length).trim();
 // Metadata must be a contiguous series of well-ordered, complete blocks.
 const prior=start<0?"":raw.slice(text.length,start);
 const prefix=prior.replace(/^\s*/,"").replace(/\s*$/,"");
 const metadata=/^(?:\[\[TIP\]\][^\r\n\[\]<>]{1,140}\[\[\/TIP\]\])?(?:\s*\[\[PHRASE\]\][^\r\n\[\]<>]{1,110}\[\[\/PHRASE\]\])?$/.test(prefix);
 const tip=suffixValid&&metadata?metadataValue(prefix,TIP_OPEN,TIP_CLOSE,140):null;
 const phrase=suffixValid&&metadata?metadataValue(prefix,PHRASE_OPEN,PHRASE_CLOSE,110):null;
 if(!suffixValid)return{text,replies:null,tip:null,phrase:null};
 const body=raw.slice(start+OPEN.length,end).trim();
 const lines=body.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
 if(lines.length<2||lines.length>3)return{text,replies:null,tip,phrase};
 const replies=lines.map(line=>{
  const match=/^(?:- |• |\d+[.)] )(.+)$/.exec(line);
  return match?.[1]?.trim()||"";
 });
 if(replies.some(reply=>!reply||reply.length>100||reply.split(/\s+/).length>16||/[<>\[\]\n]/.test(reply))||new Set(replies.map(reply=>reply.toLocaleLowerCase())).size!==replies.length)
  return{text,replies:null,tip,phrase};
 return{text,replies,tip,phrase};
}
/** Stay under the Worker system limit, preserving Shorts / fortune handoffs and language tail. */
export function friendGuestSystem(system:string):string{
 const max=6000-FRIEND_TEXT_INSTRUCTIONS.length;
 if(system.length<=max)return system+FRIEND_TEXT_INSTRUCTIONS;
 const marker="\n[EARLIER FRIEND BACKGROUND SHORTENED FOR TEXT CHAT]\n";
 // Shorts' verified post and final language directive are protected tail content.
 const shortsAt=system.indexOf("\n[SHORTS TEXT HANDOFF — FIRST REPLY]");
 const fortuneAt=system.indexOf("\n[ZOE DAILY FORTUNE HANDOFF — FIRST REPLY]");
 const protectedAt=shortsAt>=0?shortsAt:fortuneAt;
 if(protectedAt>=0){
  const tail=system.slice(protectedAt);
  if(tail.length+marker.length<max){
   const prefix=system.slice(0,protectedAt);
   const budget=max-tail.length-marker.length;
   const head=Math.min(450,Math.floor(budget/2));
   return prefix.slice(0,head)+marker+prefix.slice(head).slice(-(budget-head))+tail+FRIEND_TEXT_INSTRUCTIONS;
  }
 }
 const head=Math.min(550,Math.floor((max-marker.length)/4));
 return system.slice(0,head)+marker+system.slice(-(max-head-marker.length))+FRIEND_TEXT_INSTRUCTIONS;
}
