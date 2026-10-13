import type{LearnerSpeakingLevel,TeachingMode}from"../store/teacherStore";
import type{NativeLanguage}from"./teacherLocale";
import{nativeLanguageName}from"./teacherLocale";
import{friendSpokenLanguage}from"../friends/friendLanguage";

/** Teachers use native language to explain and target language to model and practice. */
export function teacherLanguageGuidance(level:LearnerSpeakingLevel,native:NativeLanguage,targetLanguage:string,mode:TeachingMode){
 if(mode==="immersion")return "";
 const support=nativeLanguageName(native),target=friendSpokenLanguage(targetLanguage);
 const hint=level==="A1"
  ?"A1: Explain frequently in the native language; model one short target-language sentence at a time."
  :level==="A2"
   ?"A2: Mix native-language explanations and short target-language turns; increase practice gradually."
   :level==="B1"
    ?"B1: Mostly target language; use brief native-language support for confusing details."
    :level==="B2"
     ?"B2+: Nearly all target language; native-language clarification only when genuinely needed."
     :"Auto: Do NOT invent or claim a CEFR level. Start with short target examples and brief native-language help, adapting to demonstrated speaking/comprehension rather than vocabulary quiz placement. If the learner asks for native-language help, explain briefly and return to a useful target example; never treat a request for help as a proficiency score.";
 return "[CREW TEACHER LANGUAGE SCAFFOLDING — teacher only] Use "+support+" as native language for EXPLANATIONS and "+target+" as target language for MODELING and PRACTICE. If the learner asks in "+support+" what a sentence means, explain its meaning, grammar or cultural nuance in "+support+", then offer a short "+target+" example when useful. The language of their question does not switch the teaching mode. "+hint+" Do not enforce spoken language ratios. Respect the learner's correction style, lesson and scenario. Never apply teacher instructions to Crew Friends.";
}
