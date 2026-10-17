import {ensureCore,geminiKey} from "../lib/runtime";
import type {Bilingual,MysteryCase,MysteryClue} from "./playPuzzles";

const recentStories:string[]=[];
const knownStories=[
 "An elevator passenger gets off on the seventh floor",
 "A person in the rain has no wet hair",
 "A customer buys coffee but never drinks it",
 "A girl closes an eye to take photographs"
];
const trimmed=(value:unknown,max:number)=>{
 const text=typeof value==="string"?value.trim():"";
 return text.length<=max?text:"";
};
const bilingual=(value:unknown,max:number):Bilingual|null=>{
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const obj=value as Record<string,unknown>;
 const zh=trimmed(obj.zh,max),en=trimmed(obj.en,max);
 return zh&&en?{zh,en}:null;
};
const normalized=(value:string)=>value.toLowerCase().replace(/[\s\p{P}\p{S}]/gu,"");
export function validateGeneratedMystery(value:unknown):MysteryCase|null{
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const data=value as Record<string,unknown>;
 const story=bilingual(data.story,430),solution=bilingual(data.solution,520);
 if(!story||!solution||story.zh.length<16||story.en.length<35||solution.zh.length<12||solution.en.length<25)return null;
 if(normalized(story.zh)===normalized(solution.zh))return null;
 if(!Array.isArray(data.clues)||data.clues.length<5||data.clues.length>8)return null;
 const clues:MysteryClue[]=[];
 const seen=new Set<string>();
 for(const candidate of data.clues){
  if(!candidate||typeof candidate!=="object"||Array.isArray(candidate))return null;
  const row=candidate as Record<string,unknown>;
  const question=bilingual(row.question,155);
  if(!question||question.zh.length<4||question.en.length<9||typeof row.answer!=="boolean")return null;
  const fingerprint=normalized(question.en);
  if(seen.has(fingerprint))return null;
  seen.add(fingerprint);
  clues.push({id:"ai-"+clues.length,question,answer:row.answer});
 }
 if(!clues.some(c=>c.answer)&&!clues.some(c=>!c.answer))return null;
 if(!clues.some(c=>c.answer)||!clues.some(c=>!c.answer))return null;
 return {id:"generated-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7),story,solution,clues};
}

/** Uses the visitor's existing Gemini Key and Crew text-model fallback cascade. */
export async function generateCrewMystery(friendName:string):Promise<MysteryCase>{
 if(!geminiKey())throw new Error("Gemini key not configured");
 await ensureCore();
 if(!window.CrewAI?.call)throw new Error("Crew text generation unavailable");
 const avoid=[...knownStories,...recentStories.slice(-5)];
 const prompt=[
  "Create ONE ORIGINAL lateral-thinking mystery (海龜湯) for a casual social game.",
  "Return a single valid JSON object. The story should be short, surprising, plausible, internally consistent, age-appropriate and solvable through yes/no questions.",
  "Give its one definitive solution and SIX useful, truthful, answerable yes/no clue questions. Make at least two answers TRUE and at least two FALSE. Clues must not reveal the complete solution individually.",
  "Use everyday locations, ordinary behavior or mistaken assumptions. Avoid supernatural solutions, sensational crime, gore, celebrity facts and cultural trivia.",
  "Write natural Traditional Chinese (zh-TW) and English with the SAME underlying facts and clue answers. The whole case is a new fictional scenario; do not refer to real user details.",
  'Exact JSON shape: {"story":{"zh":"...","en":"..."},"solution":{"zh":"...","en":"..."},"clues":[{"question":{"zh":"...","en":"..."},"answer":true}]}',
  "Do not mention the solution inside the story. Do not add Markdown or commentary.",
  "Avoid repeating these prior/common mystery premises:\n"+avoid.map(s=>"- "+s).join("\n"),
  "The hosting Crew Friend is "+friendName+". This affects only a light playful tone, not the puzzle facts."
 ].join("\n");
 const raw=String(await window.CrewAI.call(prompt,{
  preferLive:false,temperature:0.88,maxOutputTokens:2600,json:true,strictModels:true
 })||"").trim();
 let parsed:unknown;
 try{parsed=JSON.parse(raw.replace(/^\`\`\`(?:json)?\s*|\s*\`\`\`$/gi,""));}catch{throw new Error("Invalid mystery response");}
 const result=validateGeneratedMystery(parsed);
 if(!result)throw new Error("Incomplete or inconsistent mystery response");
 const fingerprint=normalized(result.story.zh);
 if(recentStories.some(s=>normalized(s)===fingerprint))throw new Error("Repeated mystery response");
 recentStories.push(result.story.zh);
 if(recentStories.length>12)recentStories.shift();
 return result;
}
