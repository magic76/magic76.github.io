import {TARGET_LANGUAGES} from "./targetLanguages";
export type LearningLanguageCode=typeof TARGET_LANGUAGES[number]["code"];
export type LearningMaterial="vocabulary"|"phrasebook";
export const LEARNING_MATERIAL_LANGUAGES:Record<LearningMaterial,readonly LearningLanguageCode[]>={vocabulary:["en"],phrasebook:["en"]};
export function learningLanguageCode(value:string):LearningLanguageCode|undefined{
 const normalized=value.trim().toLowerCase();
 if(normalized==="en-us"||normalized==="en-gb")return "en";
 return TARGET_LANGUAGES.find(x=>[x.code,x.value,x.spoken].some(v=>v.toLowerCase()===normalized))?.code;
}
export function learningMaterialAvailable(material:LearningMaterial,value:string){
 const code=learningLanguageCode(value);
 return code!==undefined&&LEARNING_MATERIAL_LANGUAGES[material].includes(code);
}
export function learningRouteAvailable(path:string,value:string){
 if(path==="/teacher/vocabulary")return learningMaterialAvailable("vocabulary",value);
 if(path==="/teacher/phrasebook")return learningMaterialAvailable("phrasebook",value);
 return true;
}
// Preserve English's existing local records; future languages get isolated keys.
export function learningStorageKey(base:string,language:LearningLanguageCode="en"){return language==="en"?base:base+"_"+language}
