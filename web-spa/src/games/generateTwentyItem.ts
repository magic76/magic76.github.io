import {ensureCore,geminiKey} from "../lib/runtime";
import {twentyItems,twentyQuestions,type Bilingual,type TwentyItem} from "./playPuzzles";

const recentAnswers:string[]=[];
const text=(value:unknown,max:number)=>typeof value==="string"&&value.trim().length<=max?value.trim():"";
function bilingual(value:unknown,max:number):Bilingual|null{
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const row=value as Record<string,unknown>;
 const en=text(row.en,max),zh=text(row.zh,max);
 return en&&zh?{en,zh}:null;
}
const normalize=(s:string)=>s.toLowerCase().replace(/[\s\p{P}\p{S}]/gu,"");
export function validateTwentyItem(candidate:unknown):TwentyItem|null{
 if(!candidate||typeof candidate!=="object"||Array.isArray(candidate))return null;
 const row=candidate as Record<string,unknown>;
 const name=bilingual(row.name,65);
 if(!name||!Array.isArray(row.aliases)||!Array.isArray(row.traits)||!Array.isArray(row.facts))return null;
 const aliases=row.aliases.map(a=>text(a,70)).filter(Boolean);
 if(aliases.length<2||aliases.length>9)return null;
 const legal=new Set(twentyQuestions.map(q=>q.id));
 const traits=row.traits.filter((v):v is string=>typeof v==="string"&&legal.has(v));
 if(traits.length!==row.traits.length||traits.length<1||new Set(traits).size!==traits.length)return null;
 if(row.facts.length<6||row.facts.length>12)return null;
 const seen=new Set<string>();const facts:NonNullable<TwentyItem["facts"]>=[];
 for(const fact of row.facts){
  if(!fact||typeof fact!=="object"||Array.isArray(fact))return null;
  const f=fact as Record<string,unknown>;
  const question=bilingual(f.question,155);
  if(!question||typeof f.answer!=="boolean")return null;
  const fingerprint=normalize(question.en);
  if(seen.has(fingerprint))return null;
  seen.add(fingerprint);facts.push({question,answer:f.answer});
 }
 if(!facts.some(f=>f.answer)||!facts.some(f=>!f.answer))return null;
 if(!aliases.some(a=>normalize(a)===normalize(name.en))||!aliases.some(a=>normalize(a)===normalize(name.zh)))return null;
 return {id:"ai-"+Date.now().toString(36),name,aliases,traits,facts};
}

/** Visitor's existing Gemini key; no backend or third-party key, and never stored in history. */
export async function generateTwentyItem():Promise<TwentyItem>{
 if(!geminiKey())throw new Error("No Gemini key");
 await ensureCore();
 if(!window.CrewAI?.call)throw new Error("Crew text model unavailable");
 const exclude=[...twentyItems.map(x=>x.name.en),...recentAnswers.slice(-8)];
 const prompt=[
  "You are choosing ONE secret object for a language-learning game of 20 yes/no questions.",
  "Pick a recognizable concrete everyday noun (not an abstract concept or a person), diverse and not too obscure. Avoid this list: "+exclude.join(", ")+".",
  "Return ONLY a JSON object with bilingual zh (Traditional Chinese) and en names, 2-9 aliases including BOTH exact names, accurate categorical traits, and 6-12 independently verifiable YES/NO question facts (at least 2 yes and 2 no).",
  "No ambiguity: traits must represent common properties of the WHOLE category, not rare variants.",
  "Known trait IDs and exact meanings: "+twentyQuestions.map(q=>q.id+" = "+q.label.en).join("; ")+". List only true trait IDs.",
  'JSON: {"name":{"zh":"...","en":"..."},"aliases":["..."],"traits":["..."],"facts":[{"question":{"zh":"...","en":"..."},"answer":true}]}',
  "Make the answers truthful, consistent, non-sensitive, age-appropriate, and understandable to A1/B1 language learners."
 ].join("\n");
 const raw=String(await window.CrewAI.call(prompt,{
  preferLive:false,temperature:0.85,maxOutputTokens:2400,json:true,strictModels:true
 })||"");
 let candidate:unknown;
 try{candidate=JSON.parse(raw.replace(/^\`\`\`(?:json)?\s*|\s*\`\`\`$/gi,""))}catch{throw new Error("Invalid Gemini JSON")}
 const item=validateTwentyItem(candidate);
 if(!item)throw new Error("Invalid 20 Questions item");
 if(recentAnswers.some(x=>normalize(x)===normalize(item.name.en)))throw new Error("Duplicate item");
 recentAnswers.push(item.name.en);
 if(recentAnswers.length>12)recentAnswers.shift();
 return item;
}
