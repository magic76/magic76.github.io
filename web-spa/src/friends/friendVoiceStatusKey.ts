const responsePhases:Record<string,string>={
 processing:"processing",recovering:"recovering","no-transcript":"noTranscript","no-reply":"noReply"
};

export function friendVoiceStatusKey(state:string,voicePhase:string,needsKey:boolean,active:boolean,micEnabled:boolean,muted:boolean){
 if(state==="speaking")return "liveStatus.speaking";
 if(state==="listening"){
  if(responsePhases[voicePhase])return "liveStatus."+responsePhases[voicePhase];
  if(!micEnabled)return "voice:friendLive.textChat";
  if(muted)return "liveStatus.micMuted";
  return voicePhase==="pause"?"liveStatus.pause":"liveStatus.hearing";
 }
 if(needsKey)return "common:gemini.keyNeeded";
 if(state==="error")return "liveStatus.error";
 return active?"liveStatus.preparing":"liveStatus.free";
}
