import {speechLocaleFor} from "../teacher/targetLanguages";

export function browserSpeechLocale(target:string,native:string,mode:string){
 return speechLocaleFor(mode==="natural"?native:target,native);
}

// The two allowed input languages are independent of the AI's reply mode.
export function browserSpeechLanguagePair(target:string,native:string,mode:string):string[]{
 const first=browserSpeechLocale(target,native,mode);
 const other=browserSpeechLocale(target,native,mode==="natural"?"immersion":"natural");
 return [...new Set([first,other].filter((v):v is string=>Boolean(v)))];
}
const languageCode=(locale:string)=>locale.split("-")[0];
// Conservative word evidence for Latin-script languages. This is not an ASR
// language detector; uncertain, mixed and short utterances never trigger a switch.
const MARKERS:Record<string,string>={
 en:"i you we they he she it my your our their the is are was were have has had do does did can could would should will what where when why how this that with from about think want went today because and but",
 es:"yo tú usted ustedes nosotros ellos ella estoy estás estamos eres somos quiero quieres tengo tienes qué cómo cuándo dónde porque para pero también mucho hoy ayer mañana trabajo",
 fr:"je tu vous nous ils elles suis es sommes êtes sont avoir avais veux veut avec dans pour mais parce quand pourquoi comment aujourd'hui demain merci beaucoup",
 de:"ich du wir ihr sie bin bist sind seid habe hast haben möchte willst nicht auch heute morgen gestern warum wie was welche und aber weil mit für",
 it:"io tu noi voi loro sono sei siamo siete ho hai abbiamo voglio vuoi non anche oggi domani ieri perché cosa come quando dove grazie molto",
 pt:"eu você vocês nós eles elas estou está estamos sou somos tenho tem quero quer não hoje amanhã ontem porque como onde quando muito obrigado obrigada",
 vi:"tôi bạn mình chúng tôi đang muốn không có với vì nhưng hôm nay ngày mai hôm qua tại sao thế nào được cảm ơn",
 id:"saya kamu anda kita kami mereka adalah sedang ingin tidak bukan dengan karena tetapi hari ini besok kemarin bagaimana mengapa terima kasih sudah"
};
function latinEvidence(text:string){
 const words=text.toLowerCase().normalize("NFC").match(/[\p{Script=Latin}\p{M}]+(?:['’][\p{Script=Latin}\p{M}]+)*/gu)||[];
 if(words.length<4)return undefined;
 const unique=new Set(words);
 const scores=Object.entries(MARKERS).map(([code,markers])=>({code,score:markers.split(" ").filter(word=>unique.has(word)).length})).sort((a,b)=>b.score-a.score);
 const [best,next]=scores;
 return best.score>=2&&best.score>=next.score+1?best.code:undefined;
}
export function transcriptLanguageEvidence(text:string,allowed:readonly string[]):string|undefined{
 const value=text.trim().normalize("NFC").slice(0,2000);
 const count=(pattern:RegExp)=>(value.match(pattern)||[]).length;
 const han=count(/\p{Script=Han}/gu),kana=count(/[\p{Script=Hiragana}\p{Script=Katakana}]/gu);
 const hangul=count(/\p{Script=Hangul}/gu),thai=count(/\p{Script=Thai}/gu),latin=count(/\p{Script=Latin}/gu);
 const total=count(/\p{L}/gu);
 if(!total)return undefined;
 let code:string|undefined;
 // Han-only text is ambiguous between Mandarin and Japanese.
 if(kana>=3&&(kana+han)/total>=.75&&!hangul&&!thai)code="ja";
 else if(hangul>=4&&hangul/total>=.75&&!kana&&!thai)code="ko";
 else if(thai>=4&&thai/total>=.75&&!kana&&!hangul)code="th";
 else if(han>=4&&han/total>=.8&&!kana&&!hangul&&!thai&&!allowed.some(x=>languageCode(x)==="ja"))code="zh";
 else if(latin/total>=.9&&han<2&&!kana&&!hangul&&!thai)code=latinEvidence(value);
 return code?allowed.find(x=>languageCode(x)===code):undefined;
}
/** Switch only for the NEXT utterance after two consecutive completed exchanges.
 * Recompute from the current session's input turns; never use AI reply language,
 * interim browser text, or a third language as evidence.
 */
export function resolveBrowserSpeechLanguage(allowed:readonly string[],turns:ReadonlyArray<{input?:string;output?:string}>):string|undefined{
 let current=allowed[0],pending:string|undefined,streak=0;
 if(allowed.length<2)return current;
 for(const turn of turns){
  if(!turn.input?.trim()||!turn.output?.trim())continue;
  const evidence=transcriptLanguageEvidence(turn.input,allowed);
  if(!evidence||evidence===current){pending=undefined;streak=0;continue}
  if(evidence===pending)streak++;else{pending=evidence;streak=1}
  if(streak>=2){current=evidence;pending=undefined;streak=0}
 }
 return current;
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
