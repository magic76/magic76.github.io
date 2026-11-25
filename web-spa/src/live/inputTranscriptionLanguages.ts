import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
// Input ASR hints are independent of the model's output voice.
const LOCALES:Record<string,string>={zh:"zh-TW",en:"en-US",ja:"ja-JP",ko:"ko-KR",es:"es-ES",fr:"fr-FR",de:"de-DE",it:"it-IT",vi:"vi-VN",th:"th-TH",pt:"pt-BR",id:"id-ID"};
export type InputLanguageMode="target-first"|"native-first"|"target-only";
export function inputTranscriptionLanguages(target?:string,native?:string,mode:InputLanguageMode="target-first"):string[]{
 const normalize=(value?:string)=>{
  if(!value)return undefined;
  if(value==="zh-TW"||value==="zh-CN")return value;
  const key=TARGET_LANGUAGES.find(x=>x.value===value||x.code===value||x.spoken.toLowerCase()===value.toLowerCase())?.code;
  if(key==="zh"&&native==="zh-CN")return "zh-CN";
  return key?LOCALES[key]:undefined;
 };
 const t=normalize(target),n=normalize(native);
 if(mode==="target-only")return t?[t]:[];
 const values=mode==="native-first"?[n,t]:[t,n];
 return [...new Set(values.filter((v):v is string=>Boolean(v)))];
}
