import{create}from"zustand";import{persist}from"zustand/middleware";
import{getTeacherProfile,type TeacherProfileId}from"../teacher/teacherProfiles";import{nativeFromUiLocale,detectNativeLanguage,type NativeLanguage}from"../teacher/teacherLocale";import i18n from"../i18n";
import{normalizePinyinAidMode,type PinyinAidMode}from"../teacher/pinyinAid";
export type LiveModel="gemini-3.8-live"|"gemini-3.1-flash-live-preview";
export const DEFAULT_LIVE_MODEL:LiveModel="gemini-3.8-live";
export function validateLiveModel(value:string|undefined|null):LiveModel{return value==="gemini-3.1-flash-live-preview"?value:DEFAULT_LIVE_MODEL}
export type FriendChatLanguageMode="natural"|"bilingual"|"immersion";
export type LearnerSpeakingLevel="auto"|"A1"|"A2"|"B1"|"B2";
export const DEFAULT_FRIEND_CHAT_LANGUAGE_MODE:FriendChatLanguageMode="bilingual";
export const normalizeFriendChatLanguageMode=(v:unknown):FriendChatLanguageMode=>v==="natural"||v==="immersion"?v:DEFAULT_FRIEND_CHAT_LANGUAGE_MODE;
export const normalizeLearnerSpeakingLevel=(v:unknown):LearnerSpeakingLevel=>v==="A1"||v==="A2"||v==="B1"||v==="B2"?v:"auto";
export type ConversationMode="natural"|"scenario"|"practice";export type Guidance="light"|"normal"|"strict";export type TeachingMode="beginner"|"bilingual"|"immersion";export type LanguageStyle="auto"|"us"|"gb"|"au"|"sg"|"in"|"es"|"mx"|"ar"|"co"|"standard"|"kansai"|"seoul"|"gyeongsang"|"fr"|"qc"|"be"|"ch"|"tw"|"cn"|"de"|"at"|"rome"|"milan"|"north"|"south"|"central"|"isan"|"br"|"pt"|"jakarta"|"custom";export type SpeakingPace="slow"|"normal"|"fast";export type AccentStrength="subtle"|"natural"|"noticeable";
type S={friendChatMode:FriendChatLanguageMode;setFriendChatMode(v:FriendChatLanguageMode):void;learnerSpeakingLevel:LearnerSpeakingLevel;setLearnerSpeakingLevel(v:LearnerSpeakingLevel):void;nativeLanguage:NativeLanguage;setNativeLanguage(v:NativeLanguage):void;targetLanguage:string;conversationMode:ConversationMode;guidance:Guidance;teachingMode:TeachingMode;pronunciationAidMode:PinyinAidMode;setPronunciationAidMode(v:PinyinAidMode):void;voice:string;liveModel:LiveModel;setLiveModel(v:LiveModel):void;languageStyle:LanguageStyle;speakingPace:SpeakingPace;accentStrength:AccentStrength;customAccent:string;teacherProfile:TeacherProfileId;setTargetLanguage(v:string):void;setConversationMode(v:ConversationMode):void;setGuidance(v:Guidance):void;setTeachingMode(v:TeachingMode):void;setVoice(v:string):void;setLanguageStyle(v:LanguageStyle):void;setSpeakingPace(v:SpeakingPace):void;setAccentStrength(v:AccentStrength):void;setCustomAccent(v:string):void;setTeacherProfile(v:TeacherProfileId):void};
const read=(k:string,f:string)=>localStorage.getItem("crew_teacher_"+k)||f,write=(k:string,v:string)=>localStorage.setItem("crew_teacher_"+k,v);
const explicitFriendChatMode=():FriendChatLanguageMode=>{
 // This key is written only when the learner explicitly selects a mode.
 // Zustand's legacy persisted snapshot could include the former natural default
 // even when it was never chosen. Do not mistake that snapshot for an opt-in.
 const selected=localStorage.getItem("crew_teacher_friendChatMode");
 return selected===null?DEFAULT_FRIEND_CHAT_LANGUAGE_MODE:normalizeFriendChatLanguageMode(selected);
};
const initialProfile=(read("profile","emma") as TeacherProfileId);
// The dedicated key records a deliberate choice. Ignore legacy persisted defaults
// when the user has never selected a mother tongue.
const nativePreference=():NativeLanguage=>{
 const saved=localStorage.getItem("crew_teacher_native_lang");
 return saved===null?nativeFromUiLocale(i18n.language||detectNativeLanguage()):saved as NativeLanguage;
};
export const useTeacherStore=create<S>()(persist(set=>({
 friendChatMode:explicitFriendChatMode(),
 setFriendChatMode:v=>{const mode=normalizeFriendChatLanguageMode(v);write("friendChatMode",mode);set({friendChatMode:mode})},
 learnerSpeakingLevel:normalizeLearnerSpeakingLevel(read("learnerSpeakingLevel","auto")),
 setLearnerSpeakingLevel:v=>{const level=normalizeLearnerSpeakingLevel(v);write("learnerSpeakingLevel",level);set({learnerSpeakingLevel:level})},
 nativeLanguage:nativePreference(),
 setNativeLanguage:v=>{write("native_lang",v);set({nativeLanguage:v})},
 targetLanguage:read("lang","英文"),conversationMode:read("chatMode","natural") as ConversationMode,guidance:read("guidance","normal") as Guidance,teachingMode:read("teachingMode","bilingual") as TeachingMode,pronunciationAidMode:normalizePinyinAidMode(read("pinyinAidMode","auto")),voice:read("voice",getTeacherProfile(initialProfile).recommendedVoice),liveModel:validateLiveModel(read("liveModel",DEFAULT_LIVE_MODEL)),languageStyle:read("languageStyle","auto") as LanguageStyle,speakingPace:read("speakingPace","normal") as SpeakingPace,accentStrength:read("accentStrength","natural") as AccentStrength,customAccent:read("customAccent",""),teacherProfile:initialProfile,
 setTargetLanguage:v=>{write("lang",v);if(v!=="英文")write("languageStyle","auto");set({targetLanguage:v,...(v!=="英文"?{languageStyle:"auto" as LanguageStyle}:{})})},
 setConversationMode:v=>{write("chatMode",v);set({conversationMode:v})},
 setGuidance:v=>{write("guidance",v);set({guidance:v})},
 setTeachingMode:v=>{write("teachingMode",v);set({teachingMode:v})},
 setPronunciationAidMode:v=>{const mode=normalizePinyinAidMode(v);write("pinyinAidMode",mode);set({pronunciationAidMode:mode})},
 setVoice:v=>{write("voice",v);set({voice:v})},
 setLiveModel:v=>{const model=validateLiveModel(v);write("liveModel",model);set({liveModel:model})},
 setLanguageStyle:v=>{write("languageStyle",v);set({languageStyle:v})},
 setSpeakingPace:v=>{write("speakingPace",v);set({speakingPace:v})},
 setAccentStrength:v=>{write("accentStrength",v);set({accentStrength:v})},
 setCustomAccent:v=>{write("customAccent",v);set({customAccent:v})},
 setTeacherProfile:v=>{const profile=getTeacherProfile(v);write("profile",profile.id);write("voice",profile.recommendedVoice);set({teacherProfile:profile.id,voice:profile.recommendedVoice})}
}),{
 name:"crew_teacher_spa_state",
 // Explicit friend preference wins over legacy Zustand snapshots on hydration.
 merge:(persisted,current)=>({...current,...(persisted&&typeof persisted==="object"?persisted:{}),friendChatMode:explicitFriendChatMode(),nativeLanguage:nativePreference(),pronunciationAidMode:normalizePinyinAidMode(read("pinyinAidMode","auto"))})
}));

// A UI-language change updates only implicit defaults, never an explicit choice.
if(typeof window!=="undefined")i18n.on("languageChanged",locale=>{
 try{if(localStorage.getItem("crew_teacher_native_lang")===null)
  useTeacherStore.setState({nativeLanguage:nativeFromUiLocale(locale)})}
 catch{/* Restricted storage must not interrupt switching UI language. */}
});
