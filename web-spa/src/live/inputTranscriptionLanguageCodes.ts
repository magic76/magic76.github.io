import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
const LOCALES:Record<string,string>={zh:"zh-TW",en:"en-US",ja:"ja-JP",ko:"ko-KR",es:"es-ES",fr:"fr-FR",de:"de-DE",it:"it-IT",vi:"vi-VN",th:"th-TH",pt:"pt-BR",id:"id-ID"};
function locale(value:string,native:string):string|undefined{
 if(value==="zh-TW"||value==="zh-CN")return value;
 const code=TARGET_LANGUAGES.find(x=>x.value===value||x.code===value)?.code;
 if(code==="zh"&&native==="zh-CN")return "zh-CN";
 return code?LOCALES[code]:undefined;
}
/** Mother tongue and study language are input hints, independent of AI reply mode. */
export function inputTranscriptionLanguageCodes(target:string,native:string):string[]{
 return [...new Set([locale(native,native),locale(target,native)].filter((v):v is string=>Boolean(v)))];
}
