import type {BoardCard} from "./boardProtocol";
import {backupCard} from "./inlineBoardFallback";
import {explicitBoardRequest,visualClaim,declinesBoard} from "./inlineBoardGate";
import type {VisualReply} from "./visualReplyJournal";

type Caption={input?:string;output?:string};
export type ReplyKey=number|"stream";
export type TeacherReplyTemplate=
 |{kind:"text";text:string}
 |{kind:"material";text:string;source:"journal"|"caption";card:BoardCard}
 |{kind:"missing";text:string};

// Pure projection of the very captions that the UI displays. Tool delivery is
// preferred but cannot be a prerequisite for showing grounded material.
export function teacherReplyTemplates(turns:ReadonlyArray<Caption>,stream:Caption,journal:ReadonlyArray<VisualReply>,language:string,guided=false){
 const replies=new Map<ReplyKey,TeacherReplyTemplate>();
 const byTurn=new Map<ReplyKey,VisualReply>();
 for(const entry of journal)byTurn.set(entry.turn??"stream",entry);
 let previousTopic="",previousExplanation="";
 function project(key:ReplyKey,turn:Caption,allowFallback:boolean){
  const input=turn.input?.trim()||"",output=turn.output?.trim()||"";
  const entry=byTurn.get(key);
  if(entry){replies.set(key,{kind:"material",text:output,source:"journal",card:entry.card});}
  else if(output&&allowFallback&&!declinesBoard(input)){
   const claim=visualClaim(output),explicit=explicitBoardRequest(input);
   const topic=(claim||explicit)&&previousTopic?previousTopic+" "+input:input;
   const card=backupCard(topic,output,claim||explicit,claim||explicit?previousExplanation:"",language);
   if(card)replies.set(key,{kind:"material",text:output,source:"caption",card});
   else replies.set(key,claim?{kind:"missing",text:output}:{kind:"text",text:output});
  }else replies.set(key,{kind:"text",text:output});
  if(key!=="stream"){
   if(input&&!explicitBoardRequest(input)&&!visualClaim(output)){previousTopic=input;previousExplanation=output}
   else if(output&&!visualClaim(output))previousExplanation=output;
  }
 }
 for(let i=0;i<turns.length;i++)project(i,turns[i],!guided||i<turns.length-1);
 const last=[...turns].reverse().find(t=>t.output?.trim())?.output?.trim()||"";
 // The last completed caption may remain in the streaming field for a frame.
 if(byTurn.has("stream")||stream.output?.trim()!==last&&stream.output?.trim())project("stream",stream,!guided);
 return replies;
}
