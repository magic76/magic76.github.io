import {TARGET_LANGUAGES} from "./targetLanguages";
import {getDeviceCapabilities,speakText} from "../lib/deviceCapabilities";

export type LearningSpeechSpeed="normal"|"slow";
const LANG_TAG:Record<string,string>={en:"en-US",es:"es-ES",fr:"fr-FR",de:"de-DE",it:"it-IT",pt:"pt-BR",ja:"ja-JP",ko:"ko-KR",vi:"vi-VN",th:"th-TH",zh:"zh-TW",id:"id-ID",ru:"ru-RU",hi:"hi-IN"};
// Reclaim retired learning weights without touching unrelated Transformers.js models.
let legacyCleanupRequested=false;
function cleanupLegacyKokoroCache(){
 if(legacyCleanupRequested||typeof caches==="undefined")return;
 legacyCleanupRequested=true;
 void (async()=>{
  try{
   const names=await caches.keys();
   if(names.includes("koolo-learning-speech-v1"))await caches.delete("koolo-learning-speech-v1");
   if(names.includes("kokoro-voices"))await caches.delete("kokoro-voices");
   if(!names.includes("transformers-cache"))return;
   const cache=await caches.open("transformers-cache");
   for(const request of await cache.keys())if(/Kokoro-82M/i.test(request.url))await cache.delete(request).catch(()=>{});
  }catch{/* Best effort: never interrupt pronunciation. */}
 })();
}

export function normalizeLearningLanguage(value:string):string{
 const normalized=String(value||"").trim();
 if(/^en-gb$/i.test(normalized))return "en-GB";
 if(/^en-us$/i.test(normalized))return "en-US";
 return TARGET_LANGUAGES.find(item=>item.code===normalized||item.value===normalized||item.spoken===normalized)?.code||(/^[a-z]{2}(?:-[A-Z]{2})?$/.test(normalized)?normalized.split("-")[0]:"en");
}

let finishCurrent:(()=>void)|null=null;
export function stopLearningSpeech(){
 const finish=finishCurrent;finishCurrent=null;finish?.();
 try{window.speechSynthesis?.cancel()}catch{}
}

/** Match the requested accent before considering other voices in the same language. */
export function selectLearningVoice(voices:SpeechSynthesisVoice[],locale:string){
 const tag=locale.toLowerCase(),prefix=tag.split("-")[0];
 const exact=voices.filter(voice=>voice.lang.toLowerCase()===tag);
 const matching=exact.length?exact:voices.filter(voice=>voice.lang.toLowerCase().split("-")[0]===prefix);
 return matching.find(voice=>voice.default)||matching.find(voice=>voice.localService)||matching[0];
}

/** Native English on the Android shell; standard Web Speech for browser/multilingual use. */
export async function speakLearningText(text:string,languageValue:string,options:{speed?:LearningSpeechSpeed}={}):Promise<void>{
 const value=text.trim();if(!value)throw Error("EMPTY_SPEECH_TEXT");
 stopLearningSpeech();
 cleanupLegacyKokoroCache();
 const language=normalizeLearningLanguage(languageValue),speed=options.speed||"normal";
 const mode=getDeviceCapabilities().tts;
 // The existing native bridge accepts text and rate only, not a locale.
 if((language==="en"||language==="en-US")&&(mode==="native-message"||mode==="native-legacy")){
  await speakText(value,{speed});return;
 }
 if(!("speechSynthesis" in window)||typeof SpeechSynthesisUtterance==="undefined")throw Error("Speech synthesis unavailable");
 const synth=window.speechSynthesis,locale=LANG_TAG[language]||language;
 const utterance=new SpeechSynthesisUtterance(value);
 const voice=selectLearningVoice(synth.getVoices(),locale);
 utterance.lang=locale;
 if(voice)utterance.voice=voice;
 utterance.rate=speed==="slow"?0.8:1;
 await new Promise<void>((resolve,reject)=>{
  const finish=(error?:Error)=>{
   if(finishCurrent!==cancel)return;
   finishCurrent=null;utterance.onend=null;utterance.onerror=null;
   if(error)reject(error);else resolve();
  };
  const cancel=()=>{utterance.onend=null;utterance.onerror=null;resolve()};
  finishCurrent=cancel;
  utterance.onend=()=>finish();
  utterance.onerror=event=>finish(event.error==="canceled"||event.error==="interrupted"?undefined:Error("Speech synthesis failed: "+event.error));
  try{synth.speak(utterance)}catch(error){finish(error instanceof Error?error:Error(String(error)))}
 });
}
