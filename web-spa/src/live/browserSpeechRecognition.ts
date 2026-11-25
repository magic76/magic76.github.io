import {TARGET_LANGUAGES} from "../teacher/targetLanguages";

const LOCALES:Record<string,string>={zh:"zh-TW",en:"en-US",ja:"ja-JP",ko:"ko-KR",es:"es-ES",fr:"fr-FR",de:"de-DE",it:"it-IT",vi:"vi-VN",th:"th-TH",pt:"pt-BR",id:"id-ID"};
export function browserSpeechLocale(target:string,native:string,mode:string){
 const selected=mode==="natural"?native:target;
 if(selected==="zh-TW"||selected==="zh-CN")return selected;
 const code=TARGET_LANGUAGES.find(x=>x.value===selected||x.code===selected)?.code;
 if(code==="zh"&&native==="zh-CN")return "zh-CN";
 return code?LOCALES[code]:undefined;
}
type SpeechResult={isFinal:boolean;length:number;[index:number]:{transcript:string}};
type Recognition={
 lang:string;continuous:boolean;interimResults:boolean;maxAlternatives:number;
 onresult:((event:{results:ArrayLike<SpeechResult>})=>void)|null;
 onerror:((event:{error:string})=>void)|null;onend:(()=>void)|null;
 start():void;abort():void;
};
type Constructor=new()=>Recognition;
export function browserSpeechConstructor(scope:unknown=typeof window==="undefined"?{}:window):Constructor|undefined{
 const value=scope as {SpeechRecognition?:Constructor;webkitSpeechRecognition?:Constructor};
 return value.SpeechRecognition||value.webkitSpeechRecognition;
}
/** Owns only the browser recognizer, never the Gemini stream or transcript. */
export function startBrowserSpeech(C:Constructor,lang:string,onText:(text:string)=>void,onFailure:()=>void){
 let disposed=false,recognition:Recognition|null=null,restart:ReturnType<typeof setTimeout>|null=null,emptyEnds=0,finalPrefix="";
 const stop=()=>{
  disposed=true;if(restart!==null)clearTimeout(restart);
  const r=recognition;recognition=null;if(r){r.onresult=r.onerror=r.onend=null;try{r.abort()}catch{}}
 };
 const fail=()=>{if(disposed)return;stop();onFailure()};
 const launch=()=>{
  if(disposed)return;
  let r:Recognition;
  try{r=new C();recognition=r;r.lang=lang;r.continuous=true;r.interimResults=true;r.maxAlternatives=1;
   let finalText="",interimText="",hasResult=false;
   const current=()=>!disposed&&recognition===r;
   const join=(a:string,b:string)=>[a,b].filter(Boolean).join(" ").trim().slice(0,2000);
   r.onresult=event=>{
    if(!current())return;
    finalText="";interimText="";
    for(let i=0;i<event.results.length;i++){const result=event.results[i],text=result[0]?.transcript||"";if(result.isFinal)finalText+=text;else interimText+=text}
    if(finalText||interimText){hasResult=true;emptyEnds=0;onText(join(finalPrefix,finalText+interimText))}
   };
   r.onerror=event=>{if(!current())return;if(event.error!=="no-speech")fail()};
   r.onend=()=>{
    if(!current())return;
    recognition=null;finalPrefix=join(finalPrefix,finalText);
    if(!hasResult&&++emptyEnds>=3){fail();return}
    restart=setTimeout(launch,500);
   };
   r.start();
  }catch{fail()}
 };
 launch();return stop;
}
