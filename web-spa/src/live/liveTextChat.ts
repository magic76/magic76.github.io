import {ensureLive,type LiveSession} from "../lib/runtime";
import {FRIEND_TEXT_INSTRUCTIONS} from "./textChatReplies";
import {extractGroundingSources,extractSearchSuggestions,mergeGroundingSources,type GroundingSource} from "./grounding";

/** Friend Easy mode only: other levels and voice keep their existing instructions. */
export function easyFriendTextReplyRule(system:string,friendScope:boolean){
 if(!friendScope||!system.includes("[FRIEND LANGUAGE CONTROL — TARGET CHAT WITH NATIVE HELP"))return "";
 return "\n[FRIEND TEXT CHAT — EASY MODE] Every reply must be 1-2 short sentences, using common everyday words. No slang, idioms, complex metaphors, or long paragraphs. Ask at most ONE simple question per reply; make it easy to answer with a few words. For the FIRST 3 assistant replies, use no more than 20 English words (or an equally short amount in the target language) per reply. Keep the friend's personality warm and natural, but always prioritize beginner clarity.";
}

export type LiveTextAnswer={text:string;sources:GroundingSource[];searchSuggestions?:string};
type Pending={resolve:(answer:LiveTextAnswer)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>;idleTimer?:ReturnType<typeof setTimeout>;onPartial?:(text:string)=>void};

/** Persistent Gemini Live keyboard conversation: input text, output transcription, no microphone. */
export class LiveTextConversation{
 private session:LiveSession|null=null;
 private connecting:Promise<void>|null=null;
 private pending:Pending|null=null;
 private transcript="";
 private sources:GroundingSource[]=[];
 private suggestions="";
 private closed=false;
 constructor(private system:string,private searchEnabled:boolean,private onStatus?:(message:string)=>void,private friendScope=false){}

 private settle(error?:Error,answer?:LiveTextAnswer){
  const pending=this.pending;
  if(!pending)return;
  this.pending=null;clearTimeout(pending.timer);
  if(pending.idleTimer)clearTimeout(pending.idleTimer);
  if(error)pending.reject(error);
  else if(answer)pending.resolve(answer);
 }
 private finishFromTranscript(){
  if(!this.pending||!this.transcript.trim())return false;
  this.settle(undefined,{text:this.transcript.trim(),sources:this.sources,searchSuggestions:this.suggestions||undefined});
  // The server never confirmed turnComplete; the next typed message must use
  // a clean socket to prevent late frames from the previous turn leaking in.
  this.shutdown();
  return true;
 }
 private scheduleTranscriptCompletion(delay=3200){
  const pending=this.pending;
  if(!pending||!this.transcript.trim())return;
  if(pending.idleTimer)clearTimeout(pending.idleTimer);
  // Some native-audio turns stream a full transcript but delay turnComplete.
  // Use a quiet-period fallback instead of blocking the user for 40 seconds.
  pending.idleTimer=setTimeout(()=>{if(this.pending===pending)this.finishFromTranscript()},delay);
 }
 private shutdown(){
  const session=this.session;
  this.session=null;this.connecting=null;
  if(session)void session.stop({silentStatus:true,emitTerminal:false}).catch(()=>{});
 }
 private async connect(){
  if(this.closed)throw new Error("Live chat closed");
  if(this.session?.ready)return;
  if(!this.connecting){
   this.connecting=(async()=>{
    await ensureLive();
    if(this.closed)throw new Error("Live chat closed");
    if(!window.CrewLive?.Session)throw new Error("Gemini Live runtime unavailable");
    const session=new window.CrewLive.Session({
     textOnly:true,models:["gemini-3.8-live"],maxLiveAttempts:1,
     system:this.system+"\n[KEYBOARD CHAT] Respond naturally in the configured character and language. The user types messages. Return clear, concise conversational replies."+(this.searchEnabled?"\n[CURRENT FACTS] Do not claim live web search access in ordinary chat; ask the user to use a dedicated search action for current facts.":"")+(this.friendScope?FRIEND_TEXT_INSTRUCTIONS:"")+easyFriendTextReplyRule(this.system,this.friendScope),
     openingPrompt:"",voice:"Kore",volume:0,connectTimeoutMs:12000,
     // Unlike an on-demand search, ordinary teacher/friend conversation must
     // not automatically attach Google Search. That optional tool has separate
     // quotas and may reject a request even while normal voice Live works.
     // Keep typed conversation aligned with the existing voice session setup.
     onStatus:status=>{if(!this.closed)this.onStatus?.(status)},
     onOutputTranscript:text=>{
      this.transcript=text;
      this.pending?.onPartial?.(text);
      this.scheduleTranscriptCompletion();
     },
     onGenerationComplete:text=>{
      if(text)this.transcript=text;
      // generationComplete can arrive before the very last transcript frame.
      this.scheduleTranscriptCompletion(1800);
     },
     onGrounding:metadata=>{
      this.sources=mergeGroundingSources(this.sources,extractGroundingSources(metadata));
      const suggestions=extractSearchSuggestions(metadata);
      if(suggestions)this.suggestions=suggestions;
     },
     onTurnComplete:turn=>{
      if(!this.pending)return;
      const text=(turn.output||this.transcript).trim();
      if(!text){this.settle(new Error("Gemini Live response had no transcription"));return}
      this.settle(undefined,{text,sources:this.sources,searchSuggestions:this.suggestions||undefined});
     },
     onError:error=>{if(!this.closed)this.settle(error)},
     onTerminal:info=>{
      if(!this.closed)this.settle(new Error(info?.status||"Gemini Live connection ended"));
      this.session=null;this.connecting=null;
     }
    });
    this.session=session;
    await session.start();
    if(this.closed){await session.stop({silentStatus:true,emitTerminal:false});throw new Error("Live chat closed")}
   })().catch(error=>{
    this.session=null;this.connecting=null;
    throw error;
   });
  }
  await this.connecting;
 }
 async send(text:string,onPartial?:(text:string)=>void):Promise<LiveTextAnswer>{
  if(this.pending)throw new Error("Gemini Live reply still pending");
  await this.connect();
  if(this.closed||!this.session?.ready)throw new Error("Gemini Live connection unavailable");
  this.transcript="";this.sources=[];this.suggestions="";
  return new Promise<LiveTextAnswer>((resolve,reject)=>{
   const pending:Pending={resolve,reject,onPartial,timer:setTimeout(()=>{
    if(this.pending!==pending)return;
    this.settle(new Error("Gemini Live text reply timeout"));
    this.shutdown();
   },40000)};
   this.pending=pending;
   if(!this.session?.sendText(text)){
    this.settle(new Error("Gemini Live could not send text"));
    this.shutdown();
   }
  });
 }
 close(){
  if(this.closed)return;
  this.closed=true;
  this.settle(new Error("Live chat closed"));
  this.shutdown();
 }
}
