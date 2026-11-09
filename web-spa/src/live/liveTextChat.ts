import {ensureLive,type LiveSession} from "../lib/runtime";
import {extractGroundingSources,extractSearchSuggestions,mergeGroundingSources,type GroundingSource} from "./grounding";

export type LiveTextAnswer={text:string;sources:GroundingSource[];searchSuggestions?:string};
type Pending={resolve:(answer:LiveTextAnswer)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>};

/** Persistent Gemini Live keyboard conversation: input text, output transcription, no microphone. */
export class LiveTextConversation{
 private session:LiveSession|null=null;
 private connecting:Promise<void>|null=null;
 private pending:Pending|null=null;
 private transcript="";
 private sources:GroundingSource[]=[];
 private suggestions="";
 private closed=false;
 constructor(private system:string,private searchEnabled:boolean,private onStatus?:(message:string)=>void){}

 private settle(error?:Error,answer?:LiveTextAnswer){
  const pending=this.pending;
  if(!pending)return;
  this.pending=null;clearTimeout(pending.timer);
  if(error)pending.reject(error);
  else if(answer)pending.resolve(answer);
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
     system:this.system+"\n[KEYBOARD CHAT] Respond naturally in the configured character and language. The user types messages. Return clear, concise conversational replies.",
     openingPrompt:"",voice:"Kore",volume:0,connectTimeoutMs:12000,
     ...(this.searchEnabled?{tools:[{googleSearch:{}}]}:{}),
     onStatus:status=>{if(!this.closed)this.onStatus?.(status)},
     onOutputTranscript:text=>{this.transcript=text},
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
 async send(text:string):Promise<LiveTextAnswer>{
  if(this.pending)throw new Error("Gemini Live reply still pending");
  await this.connect();
  if(this.closed||!this.session?.ready)throw new Error("Gemini Live connection unavailable");
  this.transcript="";this.sources=[];this.suggestions="";
  return new Promise<LiveTextAnswer>((resolve,reject)=>{
   const pending:Pending={resolve,reject,timer:setTimeout(()=>{
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
