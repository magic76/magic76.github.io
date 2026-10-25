/** Vocabulary pronunciation stays in the browser; never open Gemini Live or an AI connection.
 * speechSynthesis voices are the voices exposed by the browser/WebView. They may not
 * include every voice installed in Android's native TextToSpeech settings.
 */
export const VOCAB_VOICE_KEY="crew_vocab_english_voice_v1";
export const VOCAB_SPEED_KEY="crew_vocab_speech_speed_v1";

export type VocabularySpeechSpeed="normal"|"slow";
type EnglishVoice=Pick<SpeechSynthesisVoice,"lang"|"name"|"voiceURI"|"localService"|"default">;

export function voiceId(voice:Pick<EnglishVoice,"voiceURI"|"lang"|"name">):string{
 return voice.voiceURI+"|"+voice.lang+"|"+voice.name;
}
export function localEnglishVoices<T extends EnglishVoice>(voices:readonly T[]):T[]{
 return voices.filter(voice=>/^en(?:-|$)/i.test(voice.lang)&&voice.localService===true)
  .sort((a,b)=>{
   const quality=(v:T)=>/natural|neural|enhanced|premium|high.?quality/i.test(v.name)?0:1;
   const locale=(v:T)=>/^en-US$/i.test(v.lang)?0:1;
   return quality(a)-quality(b)||locale(a)-locale(b)||a.name.localeCompare(b.name);
  });
}
export function selectLocalEnglishVoice<T extends EnglishVoice>(
 voices:readonly T[],preferredVoiceId:string
):T|undefined{
 const local=localEnglishVoices(voices);
 return local.find(v=>voiceId(v)===preferredVoiceId)||local.find(v=>v.default)||local[0];
}
export function speechRate(speed:VocabularySpeechSpeed):number{
 return speed==="slow"?0.8:1;
}
export function readSpeechPreferences():{voice:string;speed:VocabularySpeechSpeed}{
 try{
  return{
   voice:localStorage.getItem(VOCAB_VOICE_KEY)||"",
   speed:localStorage.getItem(VOCAB_SPEED_KEY)==="slow"?"slow":"normal"
  };
 }catch{return{voice:"",speed:"normal"};}
}
export function saveSpeechPreferences(voice:string,speed:VocabularySpeechSpeed):void{
 try{
  localStorage.setItem(VOCAB_VOICE_KEY,voice);
  localStorage.setItem(VOCAB_SPEED_KEY,speed);
 }catch{/* Local storage may be blocked; in-memory settings remain available. */}
}
