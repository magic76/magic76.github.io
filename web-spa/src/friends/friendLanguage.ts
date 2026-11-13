/** Crew Friends speak one language per reply. Their modes are independent of Teacher levels. */
import {targetSpokenLanguage} from "../teacher/targetLanguages";
export type FriendChatLanguageMode="natural"|"bilingual"|"immersion";
const NATIVE_NAMES:Record<string,string>={"zh-TW":"Traditional Chinese","zh-CN":"Simplified Chinese","en":"English","ja":"Japanese","ko":"Korean","es":"Spanish","fr":"French","de":"German","it":"Italian","vi":"Vietnamese","id":"Indonesian","th":"Thai","pt":"Portuguese"};
export function friendSpokenLanguage(language:string){return targetSpokenLanguage(language);}
const nativeName=(v:string)=>NATIVE_NAMES[v]||v||"English";

/** Adjust phrase complexity, never the friendship or language selection; no level inference. */
export function friendAdaptiveTargetChatRule(target:string){
 return " [FRIEND ADAPTIVE TARGET CHAT] While speaking "+target+
  ", silently match the person's demonstrated comprehension across several actual exchanges. "+
  "When meaningful responses are consistently very short or the person shows confusion, "+
  "use shorter natural sentences, familiar vocabulary and a gentler conversational pace. "+
  "When they sustain clear, detailed replies, gradually use richer everyday language "+
  "without becoming overly formal. One-word Yes/OK, silence and voice-recognition errors "+
  "are weak evidence, not a skill score; do not suddenly change difficulty from one utterance. "+
  "Adjust gradually across multiple actual exchanges. Never announce a CEFR level, "+
  "quiz, correct, praise language ability, force repetition or translate automatically. "+
  "Keep the same friend's personality, topic, one-language-per-reply boundary and easygoing rhythm.";
}

export function friendLanguageReminder(language:string,nativeLanguage="en",mode:FriendChatLanguageMode="bilingual"){
 const target=friendSpokenLanguage(language),native=nativeName(nativeLanguage);
 if(mode==="immersion")return "[FRIEND LANGUAGE CONTROL — FULL IMMERSION, silent instruction] "+
  "Speak in "+target+" for the ENTIRE next reply, after reconnection too. Never speak "+
  native+" or another language. Simplify in "+target+" if needed."+
  friendAdaptiveTargetChatRule(target);
 if(mode==="bilingual")return "[FRIEND LANGUAGE CONTROL — TARGET CHAT WITH NATIVE HELP, silent instruction] "+
  "Speak only "+target+" by default. If the person EXPLICITLY asks for an explanation, translation or reply in "+
  native+", answer that WHOLE spoken reply only in "+native+"; resume "+target+
  " for normal target chat afterward. Each reply uses ONE language, without mixing or parallel translations. "+
  "Never become a teacher or use a third language. Preserve this mode after reconnect."+
  friendAdaptiveTargetChatRule(target);
 return "[FRIEND LANGUAGE CONTROL — NATURAL SINGLE LANGUAGE, silent instruction] "+
  "Start in "+native+"; follow the person's sustained conversational language between "+native+
  " and "+target+". Use EXACTLY ONE language per complete spoken reply, never mix. "+
  "One-word OK/Yes, quoted phrases, or loanwords are NOT a switch request. "+
  "If the person is having a conversation in "+native+", reply in "+native+"; "+
  "switch to "+target+" only when they clearly sustain substantive "+target+" conversation. "+
  "After reconnect continue the previously established conversational language; "+
  "never teach, recast, give bilingual recaps or switch to a third language.";
}
/** Latest explicitly selected mode overrides earlier prompt and stays after reconnect. */
export function friendLanguageTransition(language:string,nativeLanguage="en",mode:FriendChatLanguageMode="bilingual"){
 return "[FRIEND LANGUAGE MODE CHANGE — EXPLICIT USER ACTION] The learner JUST changed chat language mode in the UI to "+mode+
 ". This latest user setting supersedes ALL earlier fixed-language and bilingual rules for this SAME conversation. "+
 "Apply the new setting from the NEXT spoken reply without restarting or announcing the change. "+
 "Keep the existing friendship, topic and memory context; do not greet again. "+
 "On reconnect the updated learner choice remains authoritative.\n"+
 friendLanguageReminder(language,nativeLanguage,mode);
}
export function friendLanguageRule(language:string,nativeLanguage="en",mode:FriendChatLanguageMode="bilingual"){
 const target=friendSpokenLanguage(language),native=nativeName(nativeLanguage);
 if(mode==="immersion")return "[FULL IMMERSION SPOKEN LANGUAGE — applies to every response and reconnect]\n"+
  "The user chose "+target+" as the conversation language. Only speak "+target+
  " in audio, replies and transcripts, even after reconnect. Do not speak "+native+
  "; explain in simpler "+target+" instead. No third languages.\n"+
  friendAdaptiveTargetChatRule(target)+"\n";
 if(mode==="bilingual")return "[TARGET CHAT WITH NATIVE HELP — applies to every response and reconnect]\n"+
  "The user chose "+target+" to chat in and "+native+" as their language for clarification. "+
  "Speak only "+target+" for ordinary conversation. On an explicit native-language help request, "+
  "answer that entire spoken reply in "+native+" only, then resume "+target+
  " for normal conversation. Never weave languages within one sentence or one reply, give bilingual recaps, "+
  "insert coaching, or pressure the person into exercises. No third languages. Preserve this mode across reconnect.\n"+
  friendAdaptiveTargetChatRule(target)+"\n";
 return "[NATURAL SINGLE LANGUAGE — applies to every response and reconnect]\n"+
  "The user chose a natural, casual chat, NOT immersion. Start in "+native+
  ", the person's mother tongue, regardless of target language "+target+". "+
  "Speak only ONE language per whole reply. Follow an established or sustained conversational language: "+
  "when the person clearly converses in "+target+", reply only in "+target+
  "; when they use "+native+", reply only in "+native+". "+
  "Do not switch merely because of an isolated OK, Yes, short greeting, quote, or borrowed word. "+
  "Never mix the two languages inside an answer, repeat in both, or use a third language. "+
  "On reconnect preserve the current conversational language and relationship.\n"+
  friendAdaptiveTargetChatRule(target)+"\n";
}

/** Text-only, opt-in beginner bridge; never attached to spoken Live directives. */
export function friendBeginnerTextStart(language:string,glossLanguage:string,mode:FriendChatLanguageMode){
 const target=friendSpokenLanguage(language),gloss=nativeName(glossLanguage.replace(/^pt-BR$/i,"pt"));
 const sameLanguage=target===gloss||(target==="Mandarin Chinese"&&glossLanguage.toLowerCase().startsWith("zh"));
 if(mode!=="bilingual"||target==="English"||sameLanguage)return "";
 return "[TEXT CHAT BEGINNER EXCEPTION] For your first 2 text replies, use beginner "+target+
  ": 1-2 short sentences, common words and one easy question. After each reply, on a NEW line add ONE brief "+gloss+
  " meaning in parentheses. This is the ONLY exception to 'one language per reply / never translate automatically'; only this parenthesized meaning may be in "+gloss+
  ". Omit the gloss if the user is fluent in "+target+
  " or declines translation. Then resume normal rules.";
}
