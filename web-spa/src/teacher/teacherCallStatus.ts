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

export function teacherPresenceState(live:Pick<ReturnTypeOfLive,"state"|"errorKind"|"voicePhase">){
 const awaitingReply=["processing","recovering","no-transcript","no-reply"].includes(live.voicePhase);
 if(live.state==="speaking")return "speaking";
 if(live.state==="listening")return awaitingReply?"waiting":"listening";
 if(live.state==="connecting"||live.state==="requesting-mic")return "connecting";
 if(live.state==="reporting")return "waiting";
 if(live.state==="error"&&live.errorKind!=="key")return "error";
 return "idle";
}
