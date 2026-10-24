import {ensureLive} from "../lib/runtime";
import {MATE_LANGUAGES} from "./mateState";
export async function translateMateText(original:string,language:string):Promise<string|null>{
  await ensureLive();
  const target=MATE_LANGUAGES.find(x=>x.value===language)?.label||language;
  const response=await window.CrewAI?.call?.(
    "Translate this real conversation transcript into "+target+". Return only the translation, no commentary.\n\n"+original,
    {preferLive:false,temperature:0,maxOutputTokens:240,
     system:"Translate existing dialogue accurately. Never add or infer missing speech."}
  );
  return typeof response==="string"?response:null;
}