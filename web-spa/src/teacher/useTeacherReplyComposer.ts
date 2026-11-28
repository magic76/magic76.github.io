import {useEffect,useRef,useState} from "react";
import {composeTeacherReply,replyFingerprint,type ComposerDecision,type ComposerTurn,type ComposerChoice} from "./teacherReplyComposer";
import {declinesBoard} from "./inlineBoardGate";
import type {VisualReply} from "./visualReplyJournal";

type Request=(turn:ComposerTurn,recent:ReadonlyArray<ComposerTurn>,signal:AbortSignal)=>Promise<ComposerChoice>;
type Work={index:number;fingerprint:string;turn:ComposerTurn;recent:ComposerTurn[];controller:AbortController};
export const COMPOSER_CONCURRENCY=2;
export const COMPOSER_BACKLOG=6;
/** One decision per completed caption; bounded requests, no automatic retries. */
export class ReplyComposerQueue{
 private decisions:Record<number,ComposerDecision>={};
 private pending:Work[]=[];
 private running=new Map<number,Work>();
 private closed=false;
 private request:Request;
 private publish:(decisions:Record<number,ComposerDecision>)=>void;
 constructor(request:Request,publish:(decisions:Record<number,ComposerDecision>)=>void){this.request=request;this.publish=publish}
 scan(turns:ReadonlyArray<ComposerTurn>,skip:ReadonlySet<number>){
  if(this.closed)return;
  let changed=false;
  for(const index of Object.keys(this.decisions).map(Number)){
   if(index<turns.length&&this.decisions[index].fingerprint===replyFingerprint(turns[index]))continue;
   this.running.get(index)?.controller.abort();this.running.delete(index);
   this.pending=this.pending.filter(w=>w.index!==index);delete this.decisions[index];changed=true;
  }
  for(let index=0;index<turns.length;index++){
   const turn=turns[index],fingerprint=replyFingerprint(turn);
   if(this.decisions[index]||!turn.output?.trim())continue;
   changed=true;
   if(skip.has(index)||declinesBoard(turn.input||"")){
    this.decisions[index]={fingerprint,status:"ready",choice:{kind:"text"}};continue;
   }
   if(this.pending.length+this.running.size>=COMPOSER_BACKLOG){
    this.decisions[index]={fingerprint,status:"failed"};continue;
   }
   this.decisions[index]={fingerprint,status:"pending"};
   this.pending.push({index,fingerprint,turn:{...turn},recent:turns.slice(Math.max(0,index-2),index).map(t=>({...t})),controller:new AbortController()});
  }
  if(changed)this.emit();this.pump();
 }
 private emit(){if(!this.closed)this.publish({...this.decisions})}
 private pump(){
  while(!this.closed&&this.running.size<COMPOSER_CONCURRENCY&&this.pending.length){
   const work=this.pending.shift()!;this.running.set(work.index,work);
   void Promise.resolve().then(()=>this.request(work.turn,work.recent,work.controller.signal)).then(choice=>this.complete(work,choice),()=>this.complete(work));
  }
 }
 private complete(work:Work,choice?:ComposerChoice){
  if(this.closed||this.running.get(work.index)!==work)return;
  this.running.delete(work.index);
  if(!work.controller.signal.aborted&&this.decisions[work.index]?.fingerprint===work.fingerprint){
   this.decisions[work.index]=choice?{fingerprint:work.fingerprint,status:"ready",choice}:{fingerprint:work.fingerprint,status:"failed"};
   this.emit();
  }
  this.pump();
 }
 close(){this.closed=true;for(const w of this.running.values())w.controller.abort();for(const w of this.pending)w.controller.abort();this.running.clear();this.pending=[]}
}
export function useTeacherReplyComposer(enabled:boolean,canQueue:boolean,scope:string,turns:ReadonlyArray<ComposerTurn>,journal:ReadonlyArray<VisualReply>,guided:boolean,language:string,nativeLanguage:string){
 const [decisions,setDecisions]=useState<Record<number,ComposerDecision>>({});
 const queue=useRef<ReplyComposerQueue|null>(null);
 useEffect(()=>{
  setDecisions({});
  if(!enabled)return;
  const current=new ReplyComposerQueue((turn,recent,signal)=>composeTeacherReply(turn,recent,language,nativeLanguage,signal),setDecisions);
  queue.current=current;
  return()=>{current.close();if(queue.current===current)queue.current=null};
 },[enabled,scope,language,nativeLanguage]);
 useEffect(()=>{
  if(!enabled||!canQueue||!queue.current)return;
  const skip=new Set<number>();
  for(const entry of journal)if(entry.turn!==null)skip.add(entry.turn);
  if(guided)for(let i=0;i<turns.length;i++)skip.add(i);
  queue.current.scan(turns,skip);
 },[enabled,canQueue,scope,turns,journal,guided,language,nativeLanguage]);
 return enabled?decisions:undefined;
}
