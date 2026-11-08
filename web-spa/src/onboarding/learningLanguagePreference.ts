/** A one-time prompt only for people who have never chosen a learning language. */
export const LEARN_LANGUAGE_CONFIRMED_KEY="crew_learn_language_confirmed_v1";
export const EXPLICIT_TARGET_LANGUAGE_KEY="crew_teacher_lang";

/** A prior explicit choice, including from Friends or the welcome wizard, wins. */
export function needsLearningLanguageConfirmation(storage:Pick<Storage,"getItem">):boolean{
 try{
  return storage.getItem(LEARN_LANGUAGE_CONFIRMED_KEY)===null &&
   storage.getItem(EXPLICIT_TARGET_LANGUAGE_KEY)===null;
 }catch{return false} // Private/blocked storage: do not trap the learner.
}
export function markLearningLanguageConfirmed(storage:Pick<Storage,"setItem">):void{
 try{storage.setItem(LEARN_LANGUAGE_CONFIRMED_KEY,"1")}catch{/* Optional persistence. */}
}
export function isLearningLanguageEntry(pathname:string):boolean{
 return pathname==="/learn"||pathname==="/teacher"||pathname==="/teacher/practice";
}
