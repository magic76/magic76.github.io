import type {LiveTurn} from "../lib/runtime";

export type ConversationFlowKind = "friend" | "teacher";

/** Used only for unstructured chats. Scenario lessons and deliberate drills opt out. */
export function freeChatRhythmPrompt():string{
 return "[NATURAL CONVERSATION RHYTHM — priority over generic ask-a-question instructions]\n"+
  "This is a two-way conversation, not an interview. Choose among REACT (respond to meaning), "+
  "SHARE (offer an opinion, playful observation, or useful idea), EXPLORE (ask a follow-up only when genuinely relevant), "+
  "and PIVOT (gently shift to a related angle if the topic dries up). "+
  "You do NOT have to ask a question at the end of every reply; never stack questions. "+
  "When the person offers repeated one-word answers, stop probing the same detail. "+
  "Make a conversational contribution or change direction instead. "+
  "If they sound upset or concerned, acknowledge the concern before humor or changing topics. "+
  "Keep replies brief and varied, leave room for silence, and let them end or redirect the chat. "+
  "Do not invent human experiences, shared events or memories; never turn free chat into compulsory repetition or testing.";
}

export function isBriefAcknowledgement(text:string):boolean{
 const normalized=String(text||"").trim().toLowerCase().replace(/[.!?？，。！…]+$/g,"").trim();
 return /^(yes|no|ok|okay|yeah|yep|nah|sure|fine|maybe|i don't know|i dont know|dunno|not sure|是|不是|對|嗯|好|好的|不知道|還好|沒有|有|可以|隨便)$/.test(normalized);
}

/** Only bounded cadence counters persist for the current session; no extra network calls or saved transcripts. */
export class ConversationFlowState{
 private shortReplies=0;
 private questions=0;
 observe(turn:LiveTurn){
  const user=String(turn.input||"").trim(),ai=String(turn.output||"").trim();
  if(user)this.shortReplies=isBriefAcknowledgement(user)?this.shortReplies+1:0;
  if(ai)this.questions=/[?？]["'’”)]*\s*$/.test(ai)?this.questions+1:0;
 }
 needsPivot(){return this.shortReplies>=2||this.questions>=3}
 rescue(kind:ConversationFlowKind):string{
  const role=kind==="friend"
   ?"Stay the same Crew Friend; NEVER switch to teaching or a roleplay. "
   :"Stay the same Crew Teacher in free speaking chat; no drills or compulsory repetition. ";
  const nudge=this.needsPivot()
   ?"The chat has become a question/short-answer loop. Stop probing this subject. Offer one lightly related observation, witty angle or fresh topic WITHOUT requiring an answer. "
   :"Share one small, relevant observation about the current topic; a question is optional. ";
  return "[FREE CHAT CONTINUATION — silent control] The learner has paused. "+role+nudge+
   "Do not invent personal human experiences or shared memories. Give them room to reply.";
 }
}
