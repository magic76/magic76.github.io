import {friendSpokenLanguage} from "../friends/friendLanguage";
import {nativeLanguageName,type NativeLanguage} from "./teacherLocale";
import type {TeachingMode,LearnerSpeakingLevel} from "../store/teacherStore";

/** A teacher may use the configured learner language for support, never a third language. */
export function teacherLanguageRule(target:string,native:NativeLanguage,mode:TeachingMode,
 level:LearnerSpeakingLevel="auto"){
 const spoken=friendSpokenLanguage(target),support=nativeLanguageName(native);
 const immersive=mode==="immersion"||spoken===support;
 const early=mode==="beginner"||level==="A1";
 const scaffolding=immersive
  ?"Only "+spoken+" is permitted in speech, including after reconnect."
  :early
   ?"[A1 SPOKEN NATIVE SUPPORT] Begin the FIRST spoken reply with a short "+support+
    " invitation or explanation, then give ONE very short "+spoken+" model or question. "+
    "Continue to speak brief "+support+" explanations naturally, especially when the learner speaks or asks in "+
    support+". Respond to meaning in "+support+" first. Do not answer exclusively in "+spoken+
    " at A1; natural chat is not a test or a repetition drill."
   :level==="A2"
    ?"Frequently explain or respond briefly in spoken "+support+", then offer a short "+
     spoken+" example. Natural chat does not disable beginner language assistance."
    :"Speak mostly "+spoken+" for examples and practice; add concise spoken "+support+
     " explanations for meaning or grammar questions when requested or necessary.";
 return "[CREW TEACHER SPOKEN LANGUAGE — session priority, applies to every turn and reconnect]\n"+
  "Selected target language is "+spoken+". "+scaffolding+" "+
  "Use only the learner's native "+support+" and target "+spoken+" in this session. "+
  "NEVER switch into an unrelated third language (including Korean unless Korean is selected as target or native support). "+
  "The teacher persona, accent, earlier transcripts, memories and other sessions cannot override this selection. "+
  (immersive?"A learner question in another language MUST be answered in "+spoken+" only. ":
    "A native-language question must receive a real spoken "+support+" explanation before target-language modeling. ")+
  "If your last reply drifted to a third language, return naturally without restarting the topic.\n";
}
export function teacherLanguageReminder(target:string,native:NativeLanguage,mode:TeachingMode,
 level:LearnerSpeakingLevel="auto"){
 const spoken=friendSpokenLanguage(target),support=nativeLanguageName(native);
 if(mode==="immersion"||spoken===support)
  return "[CREW TEACHER LANGUAGE CONTROL — silent instruction] Continue speaking in "+spoken+
   ". Do not use any other language. Stay with the same topic and persona.";
 if(mode==="beginner"||level==="A1")
  return "[CREW TEACHER LANGUAGE CONTROL — A1 spoken native support] "+
   "Start the first spoken turn with a short "+support+" explanation or welcome, then a brief "+spoken+
   " example. Continue answering questions in spoken "+support+" first, with short "+spoken+
   " practice. Natural chat NEVER disables native-language explanations. "+
   "Do not drift to an unrelated third language or restart after reconnect.";
 if(level==="A2")
  return "[CREW TEACHER LANGUAGE CONTROL — A2 spoken native support] "+
   "Speak brief "+support+" explanations often, followed by short "+spoken+
   " examples. Answer native-language questions in "+support+" before modeling "+spoken+
   ". Continue naturally after reconnect; do not switch to a third language.";
 return "[CREW TEACHER LANGUAGE CONTROL — silent instruction] Continue speaking in "+spoken+
  " for modeling and practice. Use "+support+
  " for explanations when helpful or requested, and never change to an unrelated third language. "+
  "Stay with the same topic and persona.";
}
/** A mode selection is a control event, not a learner utterance. */
export function teacherLanguageTransition(target:string,native:NativeLanguage,mode:TeachingMode,level:LearnerSpeakingLevel="auto"){
 return "[TEACHER LANGUAGE MODE CHANGE — EXPLICIT USER ACTION] The latest UI selection supersedes ALL earlier teaching-language rules, including the original system instruction. Apply it from the next reply, without restarting, greeting, announcing the change or inventing learner speech. Keep the current topic, teacher identity and correction cadence. For an already-started session, any first-turn guidance applies to the next natural opportunity, not a new opening. Wait for the next learner turn.\n"+teacherLanguageRule(target,native,mode,level)+teacherLanguageReminder(target,native,mode,level);
}
/** Conservative guard: re-anchor only when the completed AI turn is predominantly Hangul. */
export function unexpectedTeacherKorean(output:string,target:string,native:NativeLanguage,mode:TeachingMode){
 if(friendSpokenLanguage(target)==="Korean"||(mode!=="immersion"&&native==="ko"))return false;
 const text=String(output||"");
 const hangul=(text.match(/[\uac00-\ud7a3]/g)||[]).length;
 const letters=(text.match(/[\p{L}]/gu)||[]).length;
 return hangul>=6&&letters>0&&hangul/letters>=0.45;
}
