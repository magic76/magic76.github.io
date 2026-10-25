/** Debug Android Crew WebView provides this capability explicitly.
 * Normal mobile browsers and older WebView builds retain browser speechSynthesis. */
export const NATIVE_VOCABULARY_TTS_TOKEN="CrewNativeTts/1";

export function hasCrewNativeVocabularyTts(userAgent?:string):boolean{
 const ua=userAgent??(typeof navigator==="undefined"?"":navigator.userAgent);
 return ua.split(/\s+/).includes(NATIVE_VOCABULARY_TTS_TOKEN);
}

export function nativeVocabularyTtsUrl(text:string,speed:"normal"|"slow"):string{
 return "crew-tts://speak?text="+encodeURIComponent(text)+"&rate="+speed;
}
