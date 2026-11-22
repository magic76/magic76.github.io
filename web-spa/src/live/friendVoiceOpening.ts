import {shortsOpeningHint,shortsQuestionOpeningHint} from "../teacher/shortsSocial";

type Parts={
 name:string;languageDirective:string;shortsPost:boolean;
 shortsHook:Parameters<typeof shortsOpeningHint>[0];selectedQuestion:string;
 lifeOpening:string;conversationHint:string;conversationStyle:string;creatureContext:string;
};
/** Every visit starts a fresh conversation; never hand off an earlier text transcript. */
export function buildFriendVoiceOpening({name,languageDirective,shortsPost,shortsHook,selectedQuestion,lifeOpening,conversationHint,conversationStyle,creatureContext}:Parts){
 const opening=shortsPost
  ?"[FRIEND POST REACTION] You are continuing your own Crew Shorts fictional photo story. Start with a short, casual comment about the caption from the post context (not a generic greeting). Don't say you saw a real-world photo or claim this happened to the learner. Use one language per reply."+
   shortsOpeningHint(shortsHook)+shortsQuestionOpeningHint(selectedQuestion)
  :"[FRIEND CONVERSATION] Begin a NEW conversation as "+name+
   " with "+conversationStyle+" that suits your personality. Introduce yourself naturally; never claim to continue a previous chat or bring up its subject. A question is optional; do not interview, teach or lecture. Use just one language throughout this reply.\n"+
   (lifeOpening||conversationHint)+"\n"+conversationHint;
 return opening+creatureContext+"\n"+languageDirective;
}
