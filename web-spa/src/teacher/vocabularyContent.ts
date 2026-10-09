import{ensureCore}from"../lib/runtime";
import{VOCABULARY_WORDS,type VocabularyWord}from"./vocabularyCatalog";
import{type NativeLanguage,nativeLanguageName}from"./teacherLocale";
const PREFIX="crew_teacher_vocab_content_v2_";
type Content={translations:Record<string,string>;examples:Record<string,string>;generated:VocabularyWord[];updatedAt:number};
const empty=():Content=>({translations:{},examples:{},generated:[],updatedAt:0});
function read(native:NativeLanguage):Content{
 try{const v=JSON.parse(localStorage.getItem(PREFIX+native)||"null");
 return v&&typeof v==="object"?{...empty(),...v}:empty()}catch{return empty()}
}
const tasks=new Map<string,Promise<void>>();
const valid=(v:unknown,max=110)=>typeof v==="string"?v.trim().slice(0,max):"";
const wordId=(s:string)=>s.trim().toLocaleLowerCase();
export function localizedVocabulary(native:NativeLanguage):VocabularyWord[]{
 const data=read(native),unique=new Map<string,VocabularyWord>();
 for(const w of [...VOCABULARY_WORDS,...data.generated]){
  const id=wordId(w[0]);if(!id||unique.has(id))continue;
  const gloss=native==="zh-TW"?w[1]:data.translations[id]||w[1];
  unique.set(id,[w[0],gloss,data.examples[id]||w[2],w[3],w[4],w[5]]);
 }
 return[...unique.values()];
}
export function contentReady(native:NativeLanguage,score:number){
 if(native==="zh-TW")return true;
 const translated=read(native).translations;
 return localizedVocabulary(native).filter(w=>Math.abs(w[5]-score)<16&&translated[wordId(w[0])]).length>=12;
}
export async function ensureVocabularyContent(native:NativeLanguage,score:number):Promise<void>{
 const band=Math.floor(score/20),taskKey=native+":"+band;
 if(tasks.has(taskKey))return tasks.get(taskKey)!;
 const data=read(native),all=localizedVocabulary("zh-TW"),near=all.filter(w=>Math.abs(w[5]-score)<17);
 const unknown=near.filter(w=>native!=="zh-TW"&&!data.translations[wordId(w[0])]).slice(0,45);
 const missing=near.filter(w=>!data.examples[wordId(w[0])]&&!w[2]).slice(0,18);
 const growth=near.length<32;
 if(!unknown.length&&!missing.length&&!growth)return;
 const job=(async()=>{
  await ensureCore();if(!window.CrewAI?.call)throw new Error("Gemini 暫時無法使用");
  const source=[...new Map([...unknown,...missing].map(w=>[wordId(w[0]),w])).values()].slice(0,55);
  const prompt=[
   "Create original learner vocabulary. Return ONLY valid JSON.",
   "Learner native language: "+nativeLanguageName(native)+". Target difficulty 0-100: "+score+".",
   "Schema: {entries:[{word,gloss,example}],new_words:[{word,gloss,example,cefr,topic,difficulty}]}",
   "Translate each supplied meaning to the native language accurately, with an idiomatic English example containing the word.",
   "Create "+(growth?25:0)+" additional useful, natural English words within 20 difficulty points; no duplicates.",
   "CEFR A1/A2/B1/B2/C1; difficulty integer from 0 to 100.",
   "Source: "+JSON.stringify(source.map(w=>({word:w[0],meaning_zh_TW:w[1]}))),
   "Excluded English words: "+all.slice(0,600).map(w=>w[0]).join(",")
  ].join("\n");
  const raw=await window.CrewAI.call(prompt,{preferLive:false,json:true,temperature:.3,maxOutputTokens:4200});
  let parsed:any;try{parsed=typeof raw==="string"?JSON.parse(raw.replace(/^\x60{3}(?:json)?\s*/i,"").replace(/\x60{3}$/,"")):raw}catch{throw new Error("單字資料格式不完整")}
  if(!parsed||typeof parsed!=="object")throw new Error("單字資料格式不完整");
  const next=read(native),known=new Set([...VOCABULARY_WORDS,...next.generated].map(w=>wordId(w[0])));
  const allowed=new Set(source.map(w=>wordId(w[0])));
  for(const entry of(Array.isArray(parsed.entries)?parsed.entries:[]).slice(0,55)){
   const id=wordId(valid(entry?.word,60));if(!allowed.has(id))continue;
   const gloss=valid(entry?.gloss),example=valid(entry?.example,160);
   if(gloss&&native!=="zh-TW")next.translations[id]=gloss;
   if(example&&example.toLowerCase().includes(id))next.examples[id]=example;
  }
  for(const item of(Array.isArray(parsed.new_words)?parsed.new_words:[]).slice(0,40)){
   const word=valid(item?.word,48),id=wordId(word),gloss=valid(item?.gloss),example=valid(item?.example,160),difficulty=Math.round(Number(item?.difficulty));
   if(!/^[a-z][a-z -]{2,47}$/i.test(word)||known.has(id)||!gloss||!Number.isFinite(difficulty)||Math.abs(difficulty-score)>23||!example)continue;
   const cefr=/^(A1|A2|B1|B2|C1)$/.test(String(item.cefr))?String(item.cefr):"B1",topic=valid(item?.topic,32)||"general";
   next.generated.push([word,native==="zh-TW"?gloss:word,example,cefr,topic,difficulty]);
   if(native!=="zh-TW")next.translations[id]=gloss;
   known.add(id);
  }
  next.generated=next.generated.slice(0,600);next.updatedAt=Date.now();
  localStorage.setItem(PREFIX+native,JSON.stringify(next));
 })().finally(()=>tasks.delete(taskKey));
 tasks.set(taskKey,job);return job;
}
