/** One rescue request at most per learner/assistant exchange. */
export function createReplyHintTurnGate(){
 let called=false,requested=false;
 return {
  onToolCall(){called=true},
  onLearnerSpeech(){called=false;requested=false},
  takeRequest(enabled:boolean){
   if(!enabled||called||requested)return false;
   requested=true;
   return true;
  },
  get requested(){return requested}
 };
}
export const REPLY_HINT_CONTROL="[SYSTEM CONTROL — reply hint fallback, NOT learner speech] The assistant just finished a spoken turn without calling suggest_replies. Call suggest_replies ONCE NOW with 2–3 short, distinct responses the learner can say next, in the target language with native-language translations. If you asked a question, suggest direct answers; if you told a story, stated something, or shared a feeling, suggest reactions, feelings, or follow-up questions. After the tool call, END THIS TURN IMMEDIATELY and remain SILENT waiting for the learner. Do not speak, start a new sentence, ask another question, or call suggest_replies again.";
