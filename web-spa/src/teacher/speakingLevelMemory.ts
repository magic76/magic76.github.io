/**
 * Local, per-language speaking-difficulty guidance, never a certified CEFR score.
 * Only corroborated teacher report evidence is counted; no raw transcripts are stored.
 */
export type SpeakingLevel="A1"|"A2"|"B1"|"B2";
type Observation={id:string;level:SpeakingLevel};
type Profile={sessions:Observation[];stable:SpeakingLevel|null};
const PREFIX="crew_teacher_speaking_level_v1_";
const levels:SpeakingLevel[]=["A1","A2","B1","B2"];
const key=(language:string)=>PREFIX+encodeURIComponent(language.normalize("NFKC").trim().toLowerCase());
export const validLevel=(v:unknown):v is SpeakingLevel=>typeof v==="string"&&levels.includes(v as SpeakingLevel);
export function verifiedSpeakingQuote(quote:unknown,utterances:string[]):boolean{
 if(typeof quote!=="string"||!Array.isArray(utterances))return false;
 const normalize=(s:string)=>s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
 const q=normalize(quote);
 if(q.length<12)return false;
 const cjk=/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(quote);
 if(!cjk&&q.split(/\s+/).length<3)return false;
 return utterances.some(x=>typeof x==="string"&&normalize(x).includes(q));
}
export function nextStableSpeakingLevel(previous:SpeakingLevel|null,history:SpeakingLevel[]):SpeakingLevel|null{
 if(history.length<3)return previous;
 const sorted=history.slice(-5).filter(validLevel).map(v=>levels.indexOf(v)).sort((a,b)=>a-b);
 if(sorted.length<3)return previous;
 const median=sorted[Math.floor(sorted.length/2)],old=previous?levels.indexOf(previous):-1;
 return levels[old<0?median:Math.max(0,Math.min(3,old+Math.sign(median-old)))];
}
function load(language:string):Profile{
 try{
  const value=JSON.parse(localStorage.getItem(key(language))||"null");
  if(!value||!Array.isArray(value.sessions))return{sessions:[],stable:null};
  const sessions=value.sessions.filter((v:any)=>v&&typeof v.id==="string"&&validLevel(v.level)).slice(-8);
  return{sessions,stable:validLevel(value.stable)?value.stable:null};
 }catch{return{sessions:[],stable:null}}
}
export function storedSpeakingLevel(language:string,enabled=true):SpeakingLevel|null{
 return enabled?load(language).stable:null;
}
export function effectiveSpeakingLevel(language:string,selected:string,enabled=true):SpeakingLevel|"auto"{
 if(validLevel(selected))return selected;
 return storedSpeakingLevel(language,enabled)||"auto";
}
export function recordSpeakingLevel(language:string,sessionId:string,evidence:any,
 utterances:string[],enabled:boolean,canPersist:()=>boolean=()=>true):boolean{
 if(!enabled||!canPersist()||!sessionId||!validLevel(evidence?.level)
  ||!verifiedSpeakingQuote(evidence?.quote,utterances))return false;
 const profile=load(language);
 if(profile.sessions.some(s=>s.id===sessionId))return false;
 const sessions=[...profile.sessions,{id:sessionId,level:evidence.level as SpeakingLevel}].slice(-8);
 const stable=nextStableSpeakingLevel(profile.stable,sessions.map(s=>s.level));
 if(!canPersist())return false;
 localStorage.setItem(key(language),JSON.stringify({sessions,stable}));
 return true;
}
export function clearSpeakingLevel(language:string){localStorage.removeItem(key(language))}
export function clearAllSpeakingLevels(){
 for(let i=localStorage.length-1;i>=0;i--){
  const k=localStorage.key(i);if(k?.startsWith(PREFIX))localStorage.removeItem(k);
 }
}
