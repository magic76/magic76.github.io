import type {LiveTurn} from "../lib/runtime";

export type ConversationFlowKind = "friend" | "teacher";

/** Common conversation policy for natural teacher chat and fictional Crew Friends only. */
export function freeChatRhythmPrompt():string{
 return "[CONVERSATION MOMENTUM — REACT · SHARE · EXPLORE · PIVOT]\n"+
  "Respond to the person's MEANING before anything else. Add one small conversational hook: a relevant observation, "+
  "an interesting angle, a gentle opinion, or a relatable detail that gives the person something easy to respond to. "+
  "Leave room for the learner to react instead of finishing a topic with a generic sign-off. "+
  "Choose REACT when they share a feeling; SHARE when an observation would add value; "+
  "EXPLORE with one specific follow-up only when genuinely useful; PIVOT toward a related topic if interest fades. "+
  "You do NOT have to ask a question at the end of every reply; never stack questions or conduct an interview. "+
  "If the learner answers with short acknowledgements twice or you have asked several questions in a row, "+
  "stop probing and contribute a fresh angle WITHOUT demanding a response. "+
  "If they engage with a detailed answer, stay on that thread instead of changing subjects. "+
  "If they are worried or upset, acknowledge it before joking; if they want to stop, let the conversation end. "+
  "As a Crew Friend share natural fictional opinions without claiming real human experiences or shared memories. "+
  "As a Crew Teacher support spontaneous conversation, not unsolicited correction, compulsory repetition or testing. "+
  "Keep spoken turns concise (usually one or two sentences), offer one opening for continuation, and respect silence.";
}

export function isBriefAcknowledgement(text:string):boolean{
 const normalized=String(text||"").trim().toLowerCase().replace(/[.!?？，。！…]+$/g,"").trim();
 return /^(yes|no|ok|okay|yeah|yep|nah|sure|fine|maybe|i don't know|i dont know|dunno|not sure|是|不是|對|嗯|好|好的|不知道|還好|沒有|有|可以|隨便|そう|うん|네|아니요|글쎄)$/.test(normalized);
}
export function wantsToEndConversation(text:string):boolean{
 return /^(bye|goodbye|see you|good night|gotta go|i have to go|talk later|再見|掰掰|我先走了|先這樣|下次聊|さようなら|またね|안녕히 계세요)[.!?。！…\s]*$/i.test(String(text||"").trim());
}

/** RAM-only engagement counters, scoped to the active voice session; no transcript persistence. */
export class ConversationFlowState{
 private shortReplies=0;
 private questions=0;
 private detailedReplies=0;
 private ended=false;
 observe(turn:LiveTurn){
  const user=String(turn.input||"").trim(),ai=String(turn.output||"").trim();
  if(user){
   this.ended=wantsToEndConversation(user);
   const brief=isBriefAcknowledgement(user)||(/^\p{L}+(?:\s+\p{L}+)?[.!?。！？]?$/u.test(user)&&user.length<=10);
   this.shortReplies=brief?this.shortReplies+1:0;
   this.detailedReplies=!brief&&user.length>=25?Math.min(3,this.detailedReplies+1):0;
  }
  if(ai)this.questions=/[?？]["'’”)]*\s*$/.test(ai)?this.questions+1:0;
 }
 needsPivot(){return this.shortReplies>=2||this.questions>=3}
 shouldRescue(){return !this.ended}
 /**
  * First nudge is sooner if interest has faded; a detailed reply earns more thinking time.
  * Second nudge is deliberately slower. No third automatic attempt until fresh user speech.
  */
 silenceDelayMs(attempt:number,_kind:ConversationFlowKind){
  if(attempt>0)return 16000;
  if(this.needsPivot())return 8000;
  return this.detailedReplies>0?11000:9000;
 }
 rescue(kind:ConversationFlowKind,attempt=0):string{
  const role=kind==="friend"
   ?"Stay the same Crew Friend; NEVER switch to teaching or a roleplay. "
   :"Stay the same Crew Teacher in free speaking chat; no drills or compulsory repetition. ";
  const nudge=this.needsPivot()
   ?"The chat has become a question/short-answer loop. Stop probing this subject. Offer one lightly related observation, witty angle or fresh topic WITHOUT requiring an answer. "
   :attempt>0
   ?"This is the final gentle nudge. Offer one very short, low-pressure related angle or either/or option; do not repeat your previous question. "
   :"Make one brief contribution to the CURRENT topic (not a random new topic): share an angle or relevant detail that makes a reply easy. A question is optional. ";
  return "[FREE CHAT CONTINUATION — silent control] The learner has paused. "+role+nudge+
   "Do not invent personal human experiences or shared memories, repeat earlier lines, or imply the learner must answer. Give them room to reply.";
 }
}
