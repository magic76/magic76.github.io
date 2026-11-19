/** A small, display-only Live tool. Never sends a reply on the learner's behalf. */
export type SuggestedReply={text:string;translation:string};
export const SUGGEST_REPLIES_NAME="suggest_replies";
export const SUGGEST_REPLIES_TOOL={name:SUGGEST_REPLIES_NAME,
 description:"When you ask the learner a question or invite them to speak, provide two or three short, distinct replies they could say aloud. Call once per question, preferably before finishing your spoken question. Never read the suggestions aloud. Do not call for statements that need no reply.",
 parameters:{type:"OBJECT",properties:{replies:{type:"ARRAY",items:{type:"OBJECT",properties:{text:{type:"STRING",description:"A short natural response in the target learning language, ideally 5–12 words"},translation:{type:"STRING",description:"Meaning in the learner's native language"}},required:["text","translation"]}}},required:["replies"]}};
export function parseSuggestedReplies(args:unknown):SuggestedReply[]{
 if(!args||typeof args!=="object"||Array.isArray(args))return [];
 const rows=(args as {replies?:unknown}).replies;
 if(!Array.isArray(rows))return [];
 const seen=new Set<string>();
 const valid:SuggestedReply[]=[];
 for(const row of rows){
  if(!row||typeof row!=="object"||Array.isArray(row))continue;
  const {text,translation}=row as Record<string,unknown>;
  if(typeof text!=="string"||typeof translation!=="string")continue;
  const clean=text.trim(),meaning=translation.trim(),key=clean.toLocaleLowerCase().replace(/[.!?。！？]+$/g,"");
  if(!clean||!meaning||clean.length>80||meaning.length>120||seen.has(key))continue;
  seen.add(key);valid.push({text:clean,translation:meaning});
  if(valid.length===3)break;
 }
 return valid.length>=2?valid:[];
}
export const SUGGEST_REPLIES_PROMPT="\\n[OPTIONAL SPEAKING HINTS] Whenever you ask the learner a question or invite them to respond, call suggest_replies with 2–3 different, short, speakable replies in the target language and translations in the learner's native language. Suggestions are optional; never demand repetition, never say them aloud, and never interrupt the conversation to explain the tool. For a lesson, avoid giving away assessed answers. If tools are unavailable, continue speaking normally.";
