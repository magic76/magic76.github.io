import {shortsOpeningHint,shortsQuestionOpeningHint} from "../teacher/shortsSocial";

type Parts={
 name:string;languageDirective:string;shortsPost:boolean;
 shortsHook:Parameters<typeof shortsOpeningHint>[0];selectedQuestion:string;
 lifeOpening:string;conversationHint:string;conversationStyle:string;creatureContext:string;
 returning:boolean;verifiedTopic:boolean;crossDay:boolean;
};
/** Fresh Live transport, enduring same-character relationship; never replay a raw transcript. */
export function buildFriendVoiceOpening({name,languageDirective,shortsPost,shortsHook,selectedQuestion,lifeOpening,conversationHint,conversationStyle,creatureContext,returning,verifiedTopic,crossDay}:Parts){
 const opening=shortsPost
  ?"[FRIEND POST REACTION] You are continuing your own Crew Shorts fictional photo story. Start with a short, casual comment about the caption from the post context (not a generic greeting). Don't say you saw a real-world photo or claim this happened to the learner. Use one language per reply."+
   shortsOpeningHint(shortsHook)+shortsQuestionOpeningHint(selectedQuestion)
  :"[FRIEND CONVERSATION — SAME CHARACTER, NEW LIVE CONNECTION] You are "+name+
   " speaking with the learner. "+(returning
    ?"A real two-sided conversation with this SAME friend was confirmed on this device before. "+
     (crossDay?"This is a later calendar day. ":"")+
     "Greet as someone familiar, not a stranger: never reintroduce yourself or run first-meeting small talk. "
    :"There is no verified earlier two-sided conversation available. Be welcoming without inventing familiarity. ")+
   (returning&&verifiedTopic
    ?"Verified same-character topic notes are available in your SYSTEM context. You MAY naturally refer to ONE of them when relevant. In ordinary catch-up without a specific handoff, prefer a brief natural follow-up on a recent verified topic over generic small talk. If asked what you discussed before, answer from the verified notes. Do not assume it was yesterday, quote unseen dialogue or invent its outcome. "
    :"Do not claim to recall any previous topic, promise, plan or event. ")+
   "This is a fresh voice transport, NOT an instruction to reset the relationship. "+
   "Do not say you remember details that are not in verified notes. Never recite notes or explain memory mechanics. "+
   "Avoid formulaic greetings and repeated opening lines; lead with "+conversationStyle+
   " in your established personality. A question is optional; do not interview, teach or lecture. "+
   "If an explicit activity or handoff is supplied below, prioritize it over casual catch-up. "+
   "Use just one language throughout this reply.\n"+
   (lifeOpening||"")+"\n"+conversationHint;
 return opening+creatureContext+"\n"+languageDirective;
}
