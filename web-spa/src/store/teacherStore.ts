import{create}from"zustand";import{persist}from"zustand/middleware";
import{getTeacherProfile,type TeacherProfileId}from"../teacher/teacherProfiles";import{detectNativeLanguage,type NativeLanguage}from"../teacher/teacherLocale";
export type ConversationMode="natural"|"scenario"|"practice";export type Guidance="light"|"normal"|"strict";export type TeachingMode="beginner"|"bilingual"|"immersion";export type LanguageStyle="auto"|"us"|"gb"|"au"|"sg"|"in"|"es"|"mx"|"ar"|"co"|"standard"|"kansai"|"seoul"|"gyeongsang"|"fr"|"qc"|"be"|"ch"|"custom";export type SpeakingPace="slow"|"normal"|"fast";export type AccentStrength="subtle"|"natural"|"noticeable";
type S={nativeLanguage:NativeLanguage;setNativeLanguage(v:NativeLanguage):void;targetLanguage:string;conversationMode:ConversationMode;guidance:Guidance;teachingMode:TeachingMode;voice:string;languageStyle:LanguageStyle;speakingPace:SpeakingPace;accentStrength:AccentStrength;customAccent:string;teacherProfile:TeacherProfileId;setTargetLanguage(v:string):void;setConversationMode(v:ConversationMode):void;setGuidance(v:Guidance):void;setTeachingMode(v:TeachingMode):void;setVoice(v:string):void;setLanguageStyle(v:LanguageStyle):void;setSpeakingPace(v:SpeakingPace):void;setAccentStrength(v:AccentStrength):void;setCustomAccent(v:string):void;setTeacherProfile(v:TeacherProfileId):void};
const read=(k:string,f:string)=>localStorage.getItem("crew_teacher_"+k)||f,write=(k:string,v:string)=>localStorage.setItem("crew_teacher_"+k,v);
const initialProfile=(read("profile","emma") as TeacherProfileId);
export const useTeacherStore=create<S>()(persist(set=>({
 nativeLanguage:read("native_lang",detectNativeLanguage()) as NativeLanguage,
 setNativeLanguage:v=>{write("native_lang",v);set({nativeLanguage:v})},
 targetLanguage:read("lang","英文"),conversationMode:read("chatMode","natural") as ConversationMode,guidance:read("guidance","normal") as Guidance,teachingMode:read("teachingMode","bilingual") as TeachingMode,voice:read("voice",getTeacherProfile(initialProfile).recommendedVoice),languageStyle:read("languageStyle","auto") as LanguageStyle,speakingPace:read("speakingPace","normal") as SpeakingPace,accentStrength:read("accentStrength","natural") as AccentStrength,customAccent:read("customAccent",""),teacherProfile:initialProfile,
 setTargetLanguage:v=>{write("lang",v);if(v!=="英文")write("languageStyle","auto");set({targetLanguage:v,...(v!=="英文"?{languageStyle:"auto" as LanguageStyle}:{})})},
 setConversationMode:v=>{write("chatMode",v);set({conversationMode:v})},
 setGuidance:v=>{write("guidance",v);set({guidance:v})},
 setTeachingMode:v=>{write("teachingMode",v);set({teachingMode:v})},
 setVoice:v=>{write("voice",v);set({voice:v})},
 setLanguageStyle:v=>{write("languageStyle",v);set({languageStyle:v})},
 setSpeakingPace:v=>{write("speakingPace",v);set({speakingPace:v})},
 setAccentStrength:v=>{write("accentStrength",v);set({accentStrength:v})},
 setCustomAccent:v=>{write("customAccent",v);set({customAccent:v})},
 setTeacherProfile:v=>{const profile=getTeacherProfile(v);write("profile",profile.id);write("voice",profile.recommendedVoice);set({teacherProfile:profile.id,voice:profile.recommendedVoice})}
}),{name:"crew_teacher_spa_state"}));
