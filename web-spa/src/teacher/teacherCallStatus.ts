import type {ReturnTypeOfLive} from "../live/types";

export function teacherCallStatusKey({state,errorKind,voicePhase}:Pick<ReturnTypeOfLive,"state"|"errorKind"|"voicePhase">){
 if(state==="error"&&errorKind==="key")return "common:gemini.keyNeeded";
 if(state==="listening"){
  if(voicePhase==="no-transcript")return "live.status.noTranscript";
  if(voicePhase==="no-reply")return "live.status.noReply";
  if(voicePhase==="processing"||voicePhase==="recovering")return "live.status.processing";
  return "live.status.listening";
 }
 if(state==="connecting"||state==="requesting-mic")return "voice:controls.connectingTo";
 if(state==="speaking"||state==="reporting"||state==="error")return "live.status."+state;
 return "live.status.idle";
}
