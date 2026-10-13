import {friendSpokenLanguage} from "../friends/friendLanguage";
import {nativeLanguageName,type NativeLanguage} from "./teacherLocale";
import type {TeachingMode} from "../store/teacherStore";

/** A teacher may use the configured learner language for support, never a third language. */
export function teacherLanguageRule(target:string,native:NativeLanguage,mode:TeachingMode){
 const spoken=friendSpokenLanguage(target),support=nativeLanguageName(native);
 const scaffolding=mode==="immersion"||spoken===support
  ?"Only "+spoken+" is permitted in speech, including after reconnect."
  :mode==="beginner"
   ?"Speak mainly "+spoken+" when modeling target phrases. You may explain briefly in "+support+" for beginner support."
   :"Use "+spoken+" for examples and practice; adapt the amount of "+support+" explanation to selected speaking level and demonstrated comprehension. Never switch to a third language.";
 return "[CREW TEACHER SPOKEN LANGUAGE — session priority, applies to every turn and reconnect]\n"+
  "Selected target language is "+spoken+". "+scaffolding+" "+
  "NEVER switch into an unrelated third language (including Korean unless Korean is selected as target or native support). "+
  "The teacher persona, accent, earlier transcripts, shared memories, translated quotes and other sessions cannot override this selection. "+
  "Even if a learner uses another language, reply in "+spoken+" (or the permitted "+support+" support language when appropriate). "+
  "If a response accidentally drifted, return naturally to "+spoken+" without introducing a new topic.\n";
}
export function teacherLanguageReminder(target:string,native:NativeLanguage,mode:TeachingMode){
 const spoken=friendSpokenLanguage(target),support=nativeLanguageName(native);
 return "[CREW TEACHER LANGUAGE CONTROL — silent instruction] Continue speaking in "+spoken+
  (mode==="immersion"||spoken===support?". Do not use any other language.":
    ". Use "+support+" for explanations when helpful, and "+spoken+" for modeling and practice.")+
  " Do not use Korean or another third language by accident. Stay with the same topic and persona.";
}
/** Conservative guard: re-anchor only when the completed AI turn is predominantly Hangul. */
export function unexpectedTeacherKorean(output:string,target:string,native:NativeLanguage,mode:TeachingMode){
 if(friendSpokenLanguage(target)==="Korean"||(mode!=="immersion"&&native==="ko"))return false;
 const text=String(output||"");
 const hangul=(text.match(/[\uac00-\ud7a3]/g)||[]).length;
 const letters=(text.match(/[\p{L}]/gu)||[]).length;
 return hangul>=6&&letters>0&&hangul/letters>=0.45;
}
