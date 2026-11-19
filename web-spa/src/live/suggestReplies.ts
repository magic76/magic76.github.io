/** A small, display-only Live tool. Never sends a reply on the learner's behalf. */
export type SuggestedReply={text:string;translation:string};
export const SUGGEST_REPLIES_NAME="suggest_replies";
export const SUGGEST_REPLIES_TOOL={name:SUGGEST_REPLIES_NAME,
 description:"At the end of EVERY spoken assistant turn, call suggest_replies exactly once with 2–3 short, distinct things the learner could say next, whether you asked a question or simply told a story, made a statement, or shared a feeling. For questions, offer direct answers; otherwise offer natural reactions, feelings, follow-up questions, or ways to continue. Call after finishing your spoken words. Never speak the suggestions aloud, request repetition, or interrupt the conversation to explain the tool. Never reveal assessed answers.",
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
export const SUGGEST_REPLIES_PROMPT="\\n[OPTIONAL SPEAKING HINTS] At the end of EVERY assistant spoken turn, call suggest_replies exactly once with 2–3 different, short, speakable replies in the target language and translations in the learner's native language, even if you only told a story, stated a fact, or shared a feeling without asking a question. For a question, suggest direct answers; for a story or statement, suggest reactions, feelings, follow-up questions, or natural ways to continue. Call after finishing your spoken words. Suggestions are optional for the learner; never demand repetition, never say them aloud, and never interrupt the conversation to explain the tool. For a lesson, avoid giving away assessed answers. If tools are unavailable, continue speaking normally.";
