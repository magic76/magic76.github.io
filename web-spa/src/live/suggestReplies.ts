/** A small, display-only Live tool. Never sends a reply on the learner's behalf. */
export type SuggestedReply={text:string;translation:string};
export const SUGGEST_REPLIES_NAME="suggest_replies";
export const SUGGEST_REPLIES_TOOL={name:SUGGEST_REPLIES_NAME,
 description:"For EVERY spoken assistant turn, call suggest_replies exactly once BEFORE finishing speaking, ideally just before your final sentence or question. Provide 2–3 short, distinct things the learner could say next. For questions offer direct answers; for stories, statements, or feelings offer natural reactions, feelings, follow-up questions, or ways to continue. After the tool result arrives, speak ONLY the already-planned final sentence or question, immediately END your turn, and stay silent to let the learner speak. Do NOT start another sentence, continue the story, ask another question, or call this tool again in the same turn. Never speak the suggestions aloud, request repetition, interrupt to explain the tool, or reveal assessed answers.",
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
export const SUGGEST_REPLIES_PROMPT="\\n[OPTIONAL SPEAKING HINTS] On EVERY assistant spoken turn, call suggest_replies exactly once WHILE speaking, just BEFORE your last planned sentence or question, with 2–3 different, short, speakable replies in the target language and translations in the learner's native language. Do this for questions AND for stories, statements, or feelings without questions. For questions suggest direct answers; otherwise suggest reactions, feelings, follow-up questions, or ways to continue. CRITICAL TURN HANDOFF: When the tool result returns, say ONLY your already-planned last sentence or question, immediately finish this assistant turn, and remain silent waiting for the learner to speak. Do not add a new sentence, continue a story, ask another question, or call suggest_replies again in this turn. Suggestions are optional for the learner; never demand repetition, say them aloud, or interrupt to explain the tool. For a lesson, avoid giving away assessed answers. If tools are unavailable, continue speaking normally.";
