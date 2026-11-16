/* Keep the voice status mapping independent of the page's rendering code. */
export function friendVoiceStatusKey(state:string,voicePhase:string,needsKey:boolean,active:boolean){
 const phaseKey:Record<string,string>={idle:"idle",hearing:"hearing",pause:"pause",processing:"processing",recovering:"recovering","no-transcript":"noTranscript","no-reply":"noReply"};
 return state==="speaking"?"liveStatus.speaking"
  :state==="listening"?"liveStatus."+(phaseKey[voicePhase]||"idle")
  :needsKey?"common:gemini.keyNeeded":state==="error"?"liveStatus.error":active?"liveStatus.preparing":"liveStatus.free";
}
