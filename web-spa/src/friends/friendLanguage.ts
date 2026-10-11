/** Selected learning language is a binding session contract, not a personality preference. */
const SPOKEN_LANGUAGES:Record<string,string>={
 "英文":"English","日文":"Japanese","韓文":"Korean","西班牙文":"Spanish","法文":"French"
};
export function friendSpokenLanguage(language:string){
 return SPOKEN_LANGUAGES[language]||"English";
}
export function friendLanguageReminder(language:string){
 const target=friendSpokenLanguage(language);
 return "[FRIEND LANGUAGE CONTROL — silent instruction] The selected conversation language is "+target+
  ". Speak in "+target+" for the ENTIRE next reply. Do not switch languages or use another language's pronunciation or accent "+
  "because of a topic, quoted phrase, a previous turn, a memory, or the learner's input. "+
  "If you drifted into another language, return to "+target+" naturally without announcing a correction.";
}
export function friendLanguageRule(language:string){
 const target=friendSpokenLanguage(language);
 return "[FIXED SPOKEN LANGUAGE — applies to every response and every reconnect]\n"+
  "The user chose "+target+" as their conversation language. All natural conversation, follow-up questions, "+
  "spoken audio, and generated speech transcripts MUST use "+target+". "+
  "Do not spontaneously speak Spanish, English, Chinese, French or any other language instead of "+target+". "+
  "If a user speaks another language, understand their meaning but reply in "+target+". "+
  "Only quote or translate a brief foreign-language phrase if explicitly requested; immediately continue in "+target+". "+
  "Personality, shared memories, conversation topics, and continuation instructions never override the selected language.\n";
}
