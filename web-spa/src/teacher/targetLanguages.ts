/**
 * Crew Teacher's learnable target languages.
 * Source of truth: Android magic76/crew-teacher MainActivity.showTutorLanguageDialog()
 * (same order, Android code). Keep the existing Chinese Web storage values so
 * switching deployments never loses per-language memories or learning progress.
 * UI locale and learner's native language are separate settings.
 */
export const TARGET_LANGUAGES=[
 {code:"en",value:"英文",spoken:"English"},
 {code:"ja",value:"日文",spoken:"Japanese"},
 {code:"ko",value:"韓文",spoken:"Korean"},
 {code:"es",value:"西班牙文",spoken:"Spanish"},
 {code:"fr",value:"法文",spoken:"French"},
 {code:"de",value:"德文",spoken:"German"},
 {code:"it",value:"義大利文",spoken:"Italian"},
 {code:"vi",value:"越南文",spoken:"Vietnamese"},
 {code:"th",value:"泰文",spoken:"Thai"},
 {code:"zh",value:"中文",spoken:"Mandarin Chinese"},
 {code:"pt",value:"葡萄牙文",spoken:"Portuguese"},
 {code:"id",value:"印尼文",spoken:"Indonesian"}
] as const;
export type TargetLanguageValue=typeof TARGET_LANGUAGES[number]["value"];

/** Same language identity powers Friend/Teacher Live instructions and preview UI. */
export function targetSpokenLanguage(value:string){
 return TARGET_LANGUAGES.find(lang=>lang.value===value||lang.code===value)?.spoken||"English";
}

// Shared BCP-47 mapping for browser recognition and Gemini input language hints.
// UI language is not a substitute for the user's explicit mother tongue.
const SPEECH_LOCALES:Record<string,string>={zh:"zh-TW",en:"en-US",ja:"ja-JP",ko:"ko-KR",es:"es-ES",fr:"fr-FR",de:"de-DE",it:"it-IT",vi:"vi-VN",th:"th-TH",pt:"pt-BR",id:"id-ID"};
export function speechLocaleFor(value:string|undefined,native:string|undefined){
 if(value==="zh-TW"||value==="zh-CN")return value;
 const code=TARGET_LANGUAGES.find(x=>x.value===value||x.code===value)?.code;
 if(code==="zh"&&native==="zh-CN")return "zh-CN";
 return code?SPEECH_LOCALES[code]:undefined;
}
/** Same pair in all reply modes; unknown values do not invent a language. */
export function inputTranscriptionLanguages(target?:string,native?:string):string[]{
 return [...new Set([speechLocaleFor(native,native),speechLocaleFor(target,native)].filter((v):v is string=>Boolean(v)))];
}
