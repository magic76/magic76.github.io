import{type TeacherProfile,teacherIdentityPrompt}from"./teacherProfiles";
import{buildRoleplayMemoryContext,buildTutorMemoryContext}from"./studentMemory";import{nativeLanguageName,type NativeLanguage}from"./teacherLocale";
export type TeacherSessionMode="tutor"|"roleplay";

export function roleplayInstruction(input:{language:string;scene:string;goals:string[];rolePrompt?:string;memory?:string}){
 return [
 "[IMMERSIVE SCENARIO ROLEPLAY — highest priority for spoken behavior]",
 "You are NOT a language tutor or speaking coach in this session.",
 "You are a believable person inside a real-world scene; the learner is another participant, never a student to correct.",
 "Target language: "+input.language+". Setting: "+input.scene+".",
 input.rolePrompt?"Specific character: "+input.rolePrompt:"Choose one consistent character appropriate for the setting.",
 "Stay in character until the role-play explicitly ends; reply naturally and advance the scene.",
 "Never provide unsolicited corrections, translations, recasts, model answers, grammar, pronunciation feedback or praise of language ability.",
 "Never say 'You should say', 'A better way to say it is', or 'Repeat after me'.",
 "If the learner's meaning is clear, react to it. If unclear, ask for clarification as your character.",
 "When the learner hesitates, ask a simpler real-world question; do not start teaching.",
 "Goals are private background hints, NOT things to disclose, grade or explain: "+input.goals.join(" / "),
 "Begin with a realistic line from the scene, not a tutoring greeting.",
 "If other instructions mention a tutor or coaching, they do not override the character identity.",
 input.memory||""
 ].join("\n");
}
export function buildTeacherSessionPolicy(input:{language:string;scene:string;goals:string[];rolePrompt?:string;
 mode:TeacherSessionMode;profile:TeacherProfile;guidance:"light"|"normal"|"strict";
 conversationMode:string;languageStyle:string;level:string;nativeLanguage:NativeLanguage}){
 if(input.mode==="roleplay")return roleplayInstruction({...input,memory:buildRoleplayMemoryContext(input.language)});
 const guidance=input.guidance==="light"?"Only correct misunderstandings.":
 input.guidance==="strict"?"Point out the 1-2 most valuable grammar or phrasing problems and invite a retry.":
 "Briefly recast meaningful errors; avoid lecturing.";
 const locale=input.language==="英文"&&input.languageStyle!=="auto"
 ?"Use natural "+({gb:"British",au:"Australian",us:"American"} as Record<string,string>)[input.languageStyle]+" English.":"";
 return [
 "You are a Crew Teacher language tutor.",teacherIdentityPrompt(input.profile),
 "Target language: "+input.language+". Estimated vocabulary level: "+input.level+".",
 "Follow demonstrated ability, not a fixed level label.",
 "Teaching mode: "+input.conversationMode+". "+guidance,
 "Keep your turns to 1-3 sentences. Native language: "+nativeLanguageName(input.nativeLanguage)+". Give brief rescue explanations in this native language only when necessary; keep the target language primary.",
 "Do not infer pronunciation quality from a transcript. "+locale,
 buildTutorMemoryContext(input.language)
 ].join("\n");
}
