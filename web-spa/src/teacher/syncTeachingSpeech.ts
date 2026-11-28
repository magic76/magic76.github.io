import {selectLearningVoice,normalizeLearningLanguage} from "./learningSpeech";
import type {SpokenSegment} from "./syncTeachingPlan";

const TAGS:Record<string,string>={en:"en-US",es:"es-ES",fr:"fr-FR",de:"de-DE",it:"it-IT",pt:"pt-BR",ja:"ja-JP",ko:"ko-KR",vi:"vi-VN",th:"th-TH",zh:"zh-TW",id:"id-ID"};
export function syncSpeechLocale(value:string){return /^[a-z]{2}-[A-Z]{2}$/.test(value)?value:TAGS[normalizeLearningLanguage(value)]||"en-US"}
type RecognitionResult={isFinal:boolean;0:{transcript:string}};
type RecognitionEvent={results:{length:number;[index:number]:RecognitionResult}};
type Recognition={lang:string;continuous:boolean;interimResults:boolean;onresult:((event:RecognitionEvent)=>void)|null;onerror:((event:{error:string})=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void;abort:()=>void};
type RecognitionConstructor=new()=>Recognition;
export function recognitionConstructor(){
 const browser=window as Window&{SpeechRecognition?:RecognitionConstructor;webkitSpeechRecognition?:RecognitionConstructor};
 return browser.SpeechRecognition||browser.webkitSpeechRecognition;
}
export function syncSpeechAvailable(){return typeof window!=="undefined"&&"speechSynthesis" in window&&typeof SpeechSynthesisUtterance!=="undefined"}
export function listenOnce(locale:string,events:{partial:(text:string)=>void;done:(text:string)=>void;error:(reason:string)=>void}){
 const Constructor=recognitionConstructor();if(!Constructor)throw new Error("speech recognition unavailable");
 const recognition=new Constructor();let closed=false,finalText="",timer:ReturnType<typeof setTimeout>|undefined;
 const release=()=>{closed=true;if(timer)clearTimeout(timer);recognition.onresult=null;recognition.onerror=null;recognition.onend=null};
 const abort=()=>{if(closed)return;release();try{recognition.abort()}catch{}};
 recognition.lang=locale;recognition.continuous=false;recognition.interimResults=true;
 recognition.onresult=e=>{
  if(closed)return;
  const finals:string[]=[],partial:string[]=[];
  for(let i=0;i<e.results.length;i++){const result=e.results[i];(result.isFinal?finals:partial).push(result[0].transcript)}
  finalText=finals.join(" ").trim();events.partial([...finals,...partial].join(" "));
 };
 recognition.onerror=e=>{if(closed)return;abort();events.error(e.error)};
 recognition.onend=()=>{if(closed)return;release();if(finalText)events.done(finalText);else events.error("no-speech")};
 try{recognition.start();timer=setTimeout(()=>{abort();events.error("timeout")},30000)}catch(e){abort();throw e}
 return {abort,stop:()=>{if(!closed)try{recognition.stop()}catch{abort();events.error("stop-failed")}}};
}
export async function playTeachingSegments(segments:ReadonlyArray<SpokenSegment>,speak:(segment:SpokenSegment,onStart:()=>void,signal:AbortSignal)=>Promise<void>,onSegment:(index:number)=>void,signal:AbortSignal){
 for(let i=0;i<segments.length;i++){
  if(signal.aborted)return;
  await speak(segments[i],()=>{if(!signal.aborted)onSegment(i)},signal);
 }
}
export function speakSyncSegment(segment:SpokenSegment,locale:string,rate:number,onStart:()=>void,signal:AbortSignal):Promise<void>{
 if(signal.aborted)return Promise.resolve();
 if(!syncSpeechAvailable())return Promise.reject(new Error("speech synthesis unavailable"));
 const synth=window.speechSynthesis,utterance=new SpeechSynthesisUtterance(segment.text);utterance.lang=locale;utterance.rate=rate;
 const voice=selectLearningVoice(synth.getVoices(),locale);if(voice)utterance.voice=voice;
 return new Promise((resolve,reject)=>{
  let done=false,started=false;
  const finish=(error?:Error)=>{if(done)return;done=true;clearTimeout(timer);signal.removeEventListener("abort",abort);utterance.onstart=null;utterance.onend=null;utterance.onerror=null;if(error)reject(error);else resolve()};
  const abort=()=>{finish();synth.cancel()};
  const timer=setTimeout(()=>{finish(new Error("speech timeout"));synth.cancel()},45000);
  signal.addEventListener("abort",abort,{once:true});
  utterance.onstart=()=>{if(!signal.aborted){started=true;onStart()}};
  utterance.onend=()=>finish(started?undefined:new Error("speech never started"));
  utterance.onerror=e=>finish(new Error("speech "+e.error));
  try{synth.speak(utterance)}catch(e){finish(e instanceof Error?e:new Error("speech failed"))}
 });
}
