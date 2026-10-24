import {ensureLive,geminiKey,type LiveSession} from "../lib/runtime";
import {normalizeLiveVoice} from "../live/voiceIdentity";
import type {NonsenseJudgeId,NonsenseLanguage} from "./nonsenseTopics";
import type {NonsenseVerdict} from "./nonsenseJudge";

/** Stage hosting is optional. Device speech has no API cost and never requests the mic. */
export function stopNonsenseHost(){
 if(typeof window!=="undefined"&&"speechSynthesis" in window)window.speechSynthesis.cancel();
}
export function speakNonsenseHost(language:NonsenseLanguage,text:string){
 if(typeof window==="undefined"||!("speechSynthesis" in window)||!text.trim())return false;
 try{
  stopNonsenseHost();
  const utterance=new SpeechSynthesisUtterance(text.slice(0,700));
  utterance.lang=language==="zh"?"zh-TW":"en-US";
  utterance.rate=language==="zh"?1.02:0.97;
  utterance.pitch=1.04;
  window.speechSynthesis.speak(utterance);
  return true;
 }catch{return false;}
}

type FeedbackOptions={
 language:NonsenseLanguage;judgeId:NonsenseJudgeId;topic:string;verdict:NonsenseVerdict;voiceChoice?:string;
 onSpeaking:()=>void;onDone:()=>void;onFailure:()=>void;
};
let active:{stop:()=>void}|null=null;
let activeGeneration=0;
export function stopNonsenseLiveFeedback(){
 activeGeneration++;
 active?.stop();
 active=null;
}
/**
 * One-shot Gemini Live audio, strictly AFTER browser speech recognition has stopped.
 * CrewLive.Session requires getUserMedia even for outgoing audio; do not call during
 * the performance. The microphone is muted on ready, and the session is short-lived.
 * No second score is generated: the validated verdict is the sole source of truth.
 */
export async function startNonsenseLiveFeedback(options:FeedbackOptions):Promise<()=>void>{
 stopNonsenseLiveFeedback();
 if(!geminiKey())throw Error("Gemini Key required");
 const generation=activeGeneration;
 let session:LiveSession|null=null;
 let closed=false,delivered=false;
 let timeout:ReturnType<typeof setTimeout>|undefined;
 const clear=()=>{
  if(timeout!==undefined){clearTimeout(timeout);timeout=undefined;}
  if(active?.stop===stop)active=null;
 };
 const stop=()=>{
  if(closed)return;
  closed=true;clear();
  const old=session;session=null;
  if(old)void old.stop({reason:"nonsense-feedback-ended",silentStatus:true,emitTerminal:false}).catch(()=>{});
 };
 const fail=()=>{
  if(closed)return;
  stop();options.onFailure();
 };
 active={stop};
 try{
  await ensureLive();
  if(generation!==activeGeneration||closed)throw Error("Feedback cancelled");
  if(!window.CrewLive)throw Error("CrewLive unavailable");
  const persona:Record<NonsenseJudgeId,string>={
   stern:"dry, restrained and formal",
   roast:"witty and playful, never mean",
   scientist:"curious and delightfully eccentric",
   queen:"theatrical, regal and charming"
  };
  const score=options.verdict;
  const voices:Record<NonsenseJudgeId,string>={stern:"Charon",roast:"Puck",scientist:"Fenrir",queen:"Kore"};
  session=new window.CrewLive.Session({
   system:[
    "You are a one-shot comedy show presenter, not a scoring engine.",
    "Speak only in "+(options.language==="zh"?"Traditional Chinese":"English")+".",
    "Personality: "+persona[options.judgeId]+".",
    "An external Gemini assessment is already FINAL and immutable.",
    "Read a brief, natural spoken recap of ONLY the supplied verdict.",
    "Never rescore, invent player statements, add new factual claims or ask questions.",
    "Do not use the same canned introduction each turn."
   ].join("\n"),
   openingPrompt:[
    "Deliver the final short on-air verdict, with no preamble and no follow-up.",
    "Contest topic: "+JSON.stringify(options.topic),
    "Verified score: "+score.total+"/100.",
    "Verified feedback: "+JSON.stringify(score.comment),
    "Speak in 1-2 natural sentences, grounded solely in the verdict."
   ].join("\n"),
   voice:normalizeLiveVoice(options.voiceChoice||voices[options.judgeId]),volume:100,maxLiveAttempts:1,maxResumeAttempts:0,
   connectTimeoutMs:10000,replyTimeoutMs:12000,manualInterruptOnly:true,
   onState:state=>{
    if(closed||generation!==activeGeneration)return;
    if(state==="ready"&&session&&!session.micMuted)session.toggleMic();
   },
   onSpeaking:speaking=>{if(!closed&&speaking)options.onSpeaking();},
   onTurnComplete:()=>{
    if(closed||delivered)return;
    delivered=true;
    const current=session;
    void (async()=>{
     try{await current?.waitForPlaybackDrain(12000);}catch{/* Closed audio context */}
     if(!closed&&generation===activeGeneration){stop();options.onDone();}
    })();
   },
   onError:()=>fail(),
   onTerminal:()=>{if(!closed&&!delivered)fail();}
  });
  timeout=setTimeout(fail,35000);
  await session.start();
  if(closed||generation!==activeGeneration){stop();throw Error("Feedback cancelled");}
  if(!session.micMuted)session.toggleMic();
  return stop;
 }catch(error){stop();throw error;}
}
