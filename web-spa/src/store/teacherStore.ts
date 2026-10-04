import{create}from"zustand";import{persist}from"zustand/middleware";
export type ConversationMode="natural"|"scenario"|"practice";export type Guidance="light"|"normal"|"strict";export type LanguageStyle="auto"|"us"|"gb"|"au";
type S={targetLanguage:string;conversationMode:ConversationMode;guidance:Guidance;voice:string;languageStyle:LanguageStyle;setTargetLanguage(v:string):void;setConversationMode(v:ConversationMode):void;setGuidance(v:Guidance):void;setVoice(v:string):void;setLanguageStyle(v:LanguageStyle):void};
const read=(k:string,f:string)=>localStorage.getItem("crew_teacher_"+k)||f,write=(k:string,v:string)=>localStorage.setItem("crew_teacher_"+k,v);
export const useTeacherStore=create<S>()(persist(set=>({
 targetLanguage:read("lang","英文"),conversationMode:read("chatMode","natural") as ConversationMode,guidance:read("guidance","normal") as Guidance,voice:read("voice","Kore"),languageStyle:read("languageStyle","auto") as LanguageStyle,
 setTargetLanguage:v=>{write("lang",v);if(v!=="英文")write("languageStyle","auto");set({targetLanguage:v,...(v!=="英文"?{languageStyle:"auto" as LanguageStyle}:{})})},
 setConversationMode:v=>{write("chatMode",v);set({conversationMode:v})},setGuidance:v=>{write("guidance",v);set({guidance:v})},setVoice:v=>{write("voice",v);set({voice:v})},setLanguageStyle:v=>{write("languageStyle",v);set({languageStyle:v})}
}),{name:"crew_teacher_spa_state"}));
