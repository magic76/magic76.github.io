/** Language selection is explicit and survives Live reconnect. */
const SPOKEN_LANGUAGES:Record<string,string>={
 "英文":"English","日文":"Japanese","韓文":"Korean","西班牙文":"Spanish","法文":"French"
};
const NATIVE_LANGUAGES:Record<string,string>={
 "zh-TW":"Traditional Chinese","zh-CN":"Simplified Chinese",en:"English",ja:"Japanese",
 ko:"Korean",vi:"Vietnamese",id:"Indonesian",es:"Spanish",fr:"French",th:"Thai",pt:"Portuguese"
};
export function friendSpokenLanguage(language:string){return SPOKEN_LANGUAGES[language]||"English";}
export function friendNativeLanguage(language:string){return NATIVE_LANGUAGES[language]||"English";}
export function friendChatMode(mode:string){return mode==="bilingual"||mode==="immersion"?mode:"natural";}
export function friendLanguageReminder(language:string,mode="natural",nativeLanguage="en"){
 const target=friendSpokenLanguage(language),native=friendNativeLanguage(nativeLanguage);
 const choice=friendChatMode(mode);
 if(target===native)return "[FRIEND LANGUAGE CONTROL — silent instruction] Speak in "+target+
  " for the entire response and after reconnect. Never change to a third language.";
 if(choice==="bilingual")return "[FRIEND RELAXED BILINGUAL — silent instruction] Reply naturally in "+target+
  " or "+native+" according to the learner's comfort. Both languages are permitted, no third language. "+
  "Do not start a lesson, grade or demand repetition. Persist this choice after reconnect.";
 if(choice==="immersion")return "[FRIEND FULL IMMERSION — silent instruction] Speak in "+target+
  " ONLY, including after reconnect. No spoken translations into "+native+
  ". If confused, simplify in "+target+". No third language.";
 return "[FRIEND LANGUAGE CONTROL — silent instruction] Speak in "+target+
  " for the next reply; offer one SHORT "+native+" explanation if they ask for help or clearly struggle, then return to "+target+
  ". Do not switch languages because of topic, accent, quoted phrase, memory or the learner's input. "+
  "If your previous reply drifted, return to "+target+" naturally without announcing a correction.";
}
export function friendLanguageRule(language:string,mode="natural",nativeLanguage="en"){
 const target=friendSpokenLanguage(language),native=friendNativeLanguage(nativeLanguage);
 const choice=friendChatMode(mode);
 if(choice==="bilingual"&&target!==native)return "[RELAXED BILINGUAL — every response and reconnect]\n"+
  "The user chose "+target+" as the language to learn and "+native+" as their native language. "+
  "Only "+target+" and "+native+" may be spoken. Follow their comfortable language naturally, "+
  "with no drills, coaching or forced practice. Do not drift into a third language.\n";
 if(choice==="immersion")return "[FIXED SPOKEN LANGUAGE — FULL IMMERSION, every response and reconnect]\n"+
  "The user chose "+target+". All audio and transcripts must be ONLY in "+target+
  ", even when they use "+native+". Rephrase in simpler "+target+" if confused, no spoken translation.\n";
 return "[FIXED SPOKEN LANGUAGE — applies to every response and every reconnect]\n"+
  "The user chose "+target+" as their conversation language. All natural conversation, follow-up questions, "+
  "spoken audio, and generated speech transcripts MUST use "+target+" as primary language. "+
  "If they struggle or ask for help, use ONE short explanation in "+native+" then immediately return to "+target+". "+
  "Personality, saved memories, topic changes and reconnection do not override the selected language. "+
  "Never switch to an unrelated third language.\n";
}
