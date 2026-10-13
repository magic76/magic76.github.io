/** Selected Crew Friend language mode is independent of the teacher and conversation memory. */
export type FriendChatLanguageMode="natural"|"bilingual"|"immersion";
const SPOKEN_LANGUAGES:Record<string,string>={"英文":"English","日文":"Japanese","韓文":"Korean","西班牙文":"Spanish","法文":"French"};
const NATIVE_NAMES:Record<string,string>={"zh-TW":"Traditional Chinese","zh-CN":"Simplified Chinese","en":"English","ja":"Japanese","ko":"Korean","es":"Spanish","fr":"French","vi":"Vietnamese","id":"Indonesian","th":"Thai","pt":"Portuguese"};
export function friendSpokenLanguage(language:string){return SPOKEN_LANGUAGES[language]||"English";}
const nativeName=(v:string)=>NATIVE_NAMES[v]||v||"English";
export function friendLanguageReminder(language:string,nativeLanguage="en",mode:FriendChatLanguageMode="natural"){
 const target=friendSpokenLanguage(language),native=nativeName(nativeLanguage);
 if(mode==="bilingual")return "[FRIEND LANGUAGE CONTROL — RELAXED BILINGUAL, silent instruction] Speak naturally in "+target+" and "+native+". Both are allowed; avoid a third language. Do not become a teacher or correct the learner. Preserve this selected mode across reconnection.";
 if(mode==="immersion")return "[FRIEND LANGUAGE CONTROL — FULL IMMERSION, silent instruction] Speak in "+target+" for the ENTIRE next reply, after reconnection too. Never speak "+native+" or another language. Simplify in "+target+" if needed.";
 return "[FRIEND LANGUAGE CONTROL — silent instruction] The selected conversation language is "+target+
 ". Speak in "+target+" for the ENTIRE next reply. Do not switch languages or use another language's pronunciation or accent because of a topic, quoted phrase, a previous turn, a memory, or the learner's input. If you drifted into another language, return to "+target+" naturally without announcing a correction.";
}
export function friendLanguageRule(language:string,nativeLanguage="en",mode:FriendChatLanguageMode="natural"){
 const target=friendSpokenLanguage(language),native=nativeName(nativeLanguage);
 if(mode==="bilingual")return "[RELAXED BILINGUAL SPOKEN LANGUAGE — applies to every response and reconnect]\n"+
 "The user chose "+target+" as target language and "+native+" as their native language. Natural chat and generated speech transcripts may use BOTH languages. Follow the learner for comfort and weave in "+target+" when welcome. No unsolicited corrections, lessons or language quotas. Never drift to a third language. Keep this mode after reconnect.\n";
 if(mode==="immersion")return "[FULL IMMERSION SPOKEN LANGUAGE — applies to every response and reconnect]\n"+
 "The user chose "+target+" as their conversation language. Only speak "+target+" in audio, replies and transcripts, even after reconnect. Do not speak "+native+"; explain in simpler "+target+" instead. No third languages.\n";
 return "[FIXED SPOKEN LANGUAGE — applies to every response and every reconnect]\n"+
 "The user chose "+target+" as their conversation language. All natural conversation, follow-up questions, spoken audio, and generated speech transcripts MUST use "+target+". Do not spontaneously speak Spanish, English, Chinese, French or any other language instead of "+target+". If a user speaks another language, understand their meaning but reply in "+target+". Only quote or translate a brief foreign-language phrase if explicitly requested; immediately continue in "+target+". Personality, shared memories, conversation topics, and continuation instructions never override the selected language.\n";
}
