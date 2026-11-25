import type {LiveTurn} from "../lib/runtime";

export type ConversationFlowKind = "friend" | "teacher";

/** Friend-only conversational rhythm. Teachers use a separate learning-oriented policy. */
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
  "As a Crew Friend share natural fictional opinions. Do not invent human experiences or shared memories. "+
  "As a Crew Friend support spontaneous conversation, not unsolicited correction, compulsory repetition or testing. "+
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
   // A concise but meaningful answer still shows interest; only acknowledgement loops count as disengagement.
   const brief=isBriefAcknowledgement(user);
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
 silenceDelayMs(attempt:number,kind:ConversationFlowKind){
  // Friends aren't tutors: give a real conversational pause, and only one gentle nudge.
  if(kind==="friend")return attempt>0?30000:20000;
  if(attempt>0)return 16000;
  if(this.needsPivot())return 8000;
  return this.detailedReplies>0?11000:9000;
 }
 rescue(kind:ConversationFlowKind,attempt=0):string{
  if(kind==="teacher"){
   const support=this.needsPivot()
    ?"The learner may need an easier way to express the idea. Stop probing. Give one short useful target-language model or two simple choices on the current topic. "
    :attempt>0?"This is the final gentle nudge. Offer one short starter phrase or a simpler alternative; do not repeat the previous question. "
    :"Offer one short hint, example or sentence starter that helps the learner express their own idea on the current topic. ";
   return "[TEACHER PRACTICE CONTINUATION — silent control] The learner has paused. Stay the same Crew Teacher; no drills or compulsory repetition. "+support+
    "Follow the selected teaching mode and level; use native support only when allowed. Never grade silence or invent an error. Keep it optional, then give them room to answer.";
  }
  const role="Stay the same Crew Friend; NEVER switch to teaching or a roleplay. ";
  const nudge=this.needsPivot()
   ?"The chat has become a question/short-answer loop. Stop probing this subject. Offer one lightly related observation, witty angle or fresh topic WITHOUT requiring an answer. "
   :attempt>0
   ?"This is the final gentle nudge. Offer one very short, low-pressure related angle or either/or option; do not repeat your previous question. "
   :"Make one brief contribution to the CURRENT topic (not a random new topic): share an angle or relevant detail that makes a reply easy. A question is optional. ";
  return "[FREE CHAT CONTINUATION — silent control] The learner has paused. "+role+nudge+
   "Do not invent personal human experiences or shared memories, repeat earlier lines, or imply the learner must answer. Give them room to reply.";
 }
}
