import{create}from"zustand";import{persist}from"zustand/middleware";
import{getTeacherProfile,type TeacherProfileId}from"../teacher/teacherProfiles";import{detectNativeLanguage,type NativeLanguage}from"../teacher/teacherLocale";
export type ConversationMode="natural"|"scenario"|"practice";export type Guidance="light"|"normal"|"strict";export type TeachingMode="beginner"|"bilingual"|"immersion";export type LanguageStyle="auto"|"us"|"gb"|"au";
type S={nativeLanguage:NativeLanguage;setNativeLanguage(v:NativeLanguage):void;targetLanguage:string;conversationMode:ConversationMode;guidance:Guidance;teachingMode:TeachingMode;voice:string;languageStyle:LanguageStyle;teacherProfile:TeacherProfileId;setTargetLanguage(v:string):void;setConversationMode(v:ConversationMode):void;setGuidance(v:Guidance):void;setTeachingMode(v:TeachingMode):void;setVoice(v:string):void;setLanguageStyle(v:LanguageStyle):void;setTeacherProfile(v:TeacherProfileId):void};
const read=(k:string,f:string)=>localStorage.getItem("crew_teacher_"+k)||f,write=(k:string,v:string)=>localStorage.setItem("crew_teacher_"+k,v);
const initialProfile=(read("profile","emma") as TeacherProfileId);
export const useTeacherStore=create<S>()(persist(set=>({
 nativeLanguage:read("native_lang",detectNativeLanguage()) as NativeLanguage,
 setNativeLanguage:v=>{write("native_lang",v);set({nativeLanguage:v})},
 targetLanguage:read("lang","英文"),conversationMode:read("chatMode","natural") as ConversationMode,guidance:read("guidance","normal") as Guidance,teachingMode:read("teachingMode","bilingual") as TeachingMode,voice:read("voice",getTeacherProfile(initialProfile).recommendedVoice),languageStyle:read("languageStyle","auto") as LanguageStyle,teacherProfile:initialProfile,
 setTargetLanguage:v=>{write("lang",v);if(v!=="英文")write("languageStyle","auto");set({targetLanguage:v,...(v!=="英文"?{languageStyle:"auto" as LanguageStyle}:{})})},
 setConversationMode:v=>{write("chatMode",v);set({conversationMode:v})},
 setGuidance:v=>{write("guidance",v);set({guidance:v})},
 setTeachingMode:v=>{write("teachingMode",v);set({teachingMode:v})},
 setVoice:v=>{write("voice",v);set({voice:v})},
 setLanguageStyle:v=>{write("languageStyle",v);set({languageStyle:v})},
 setTeacherProfile:v=>{const profile=getTeacherProfile(v);write("profile",profile.id);write("voice",profile.recommendedVoice);set({teacherProfile:profile.id,voice:profile.recommendedVoice})}
}),{name:"crew_teacher_spa_state"}));
