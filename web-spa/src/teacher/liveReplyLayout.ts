/** Native Live display contract. Data only, no HTTP or transcript postprocessing. */
export const RENDER_REPLY_FUNCTION="render_reply";
export const REPLY_KINDS=["paragraph","heading","list","table","quote","steps","dialogue","formula"] as const;
export type ReplyKind=typeof REPLY_KINDS[number];
export type ReplyBlock={kind:ReplyKind;parts:string[];columns?:number};
export type LiveRenderedReply={id:number;turn:number|null;blocks:ReplyBlock[]};
export const LIVE_RENDER_POLICY="\n"+[
 "[REPLY DISPLAY — spoken and visual answers belong to the same response]",
 "For substantive explanations, comparisons, examples, procedures, or demonstrations, CALL render_reply once early, preferably before speaking, or during the explanation if already speaking. It is your own visual answer, not a separate teacher or extra lesson. Use it proactively without waiting for a request to display a board.",
 "Choose any combination of paragraph, heading, list, table, quote, steps, dialogue, formula to convey the actual content you are about to explain. Provide clear concise visual text, not raw speech filler. Use meaningful rows and examples, and keep speech and display consistent. Ordinary greetings and casual conversation need no tool. Honor voice-only requests.",
 "After sending the tool, immediately continue the actual spoken explanation naturally. Do not speak JSON, describe the tool or announce that you displayed something. Do not repeat yourself just to make display content. If the tool is rejected or unavailable, continue speaking normally. Never retry the tool in the same reply.",
 "In an app-controlled guided lesson, use the existing guided material and focus tool instead; do not call render_reply."
].join("\n");
export const RENDER_REPLY_DECLARATION={
 name:RENDER_REPLY_FUNCTION,
 description:"Display your own structured answer before or during speech. Call proactively for explanations, comparisons, examples, procedures, formulas and dialogue. Combine any blocks; no interactive controls. Ordinary chat needs no call. Continue speaking the same content.",
 parameters:{type:"OBJECT",properties:{blocks:{type:"ARRAY",items:{type:"OBJECT",properties:{
  kind:{type:"STRING",enum:[...REPLY_KINDS]},
  parts:{type:"ARRAY",items:{type:"STRING"},description:"Text for one paragraph/heading/quote/formula, one string per list/step item, or row-major cells for table/dialogue."},
  columns:{type:"INTEGER",description:"For table only, 2 or 3 columns."}
 },required:["kind","parts"]}}},required:["blocks"]}
};
export function parseLiveReply(args:unknown):ReplyBlock[]|null{
 if(!args||typeof args!=="object"||Array.isArray(args))return null;
 try{if(JSON.stringify(args).length>16000)return null}catch{return null}
 const raw=(args as {blocks?:unknown}).blocks;
 if(!Array.isArray(raw)||!raw.length||raw.length>16)return null;
 const blocks:ReplyBlock[]=[];
 let total=0;
 for(const item of raw){
  if(!item||typeof item!=="object"||Array.isArray(item))return null;
  const b=item as {kind?:ReplyKind;parts?:unknown;columns?:unknown};
  if(!b.kind||!REPLY_KINDS.includes(b.kind)||!Array.isArray(b.parts)||!b.parts.length||b.parts.length>30)return null;
  const n=b.parts.length;
  let columns:number|undefined;
  if(b.kind==="table"||b.kind==="dialogue"){
   const c=b.kind==="dialogue"?2:b.columns??2;
   if((c!==2&&c!==3)||n<c||n%c!==0)return null;
   columns=c;
  }else if(b.kind!=="list"&&b.kind!=="steps"&&n!==1)return null;
  const parts:string[]=[];
  for(const v of b.parts){
   if(typeof v!=="string"||!v.trim()||v.length>700||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v))return null;
   total+=v.length;if(total>6000)return null;parts.push(v.trim());
  }
  blocks.push({kind:b.kind,parts,...(columns?{columns}:{})});
 }
 return blocks;
}
export function directReplyAt(entries:ReadonlyArray<LiveRenderedReply>,key:number|"stream"){
 return entries.find(e=>e.turn===(key==="stream"?null:key));
}
export function appendDirectReply(entries:ReadonlyArray<LiveRenderedReply>,id:number,blocks:ReplyBlock[]){
 if(directReplyAt(entries,"stream"))return null;
 return [...entries,{id,turn:null,blocks}].slice(-80);
}
export function sealDirectReply(entries:ReadonlyArray<LiveRenderedReply>,turn:number){
 return entries.map(e=>e.turn===null?{...e,turn}:e);
}
export function discardDirectReply(entries:ReadonlyArray<LiveRenderedReply>){
 return entries.filter(e=>e.turn!==null);
}

/** Live can emit a completion for the tool exchange before the spoken answer.
 * Retain the pending display until the real reply is assigned a caption index.
 * Never attach a new answer to an unrelated historical turn. */
export type DirectReplyWait={anchor:number|null};
export function resolveDirectReplyCompletion(
 entries:ReadonlyArray<LiveRenderedReply>,
 turn:{output?:string;hasValidOutput?:boolean},
 captionIndex:number|null,
 waiting:DirectReplyWait|null
):{action:"none"|"defer"|"seal";wait:DirectReplyWait|null;index:number|null}{
 if(!directReplyAt(entries,"stream"))return {action:"none",wait:null,index:null};
 const spoken=Boolean(turn.output?.trim()||turn.hasValidOutput);
 const anchor=captionIndex??waiting?.anchor??null;
 if(spoken&&anchor!==null)return {action:"seal",wait:null,index:anchor};
 return {action:"defer",wait:{anchor},index:null};
}
export function closeDeferredReply(entries:ReadonlyArray<LiveRenderedReply>,waiting:DirectReplyWait){
 // A new learner turn must never inherit the previous answer. If its own
 // input-only caption exists, preserve the previous tool there as visual-only.
 return waiting.anchor!==null?sealDirectReply(entries,waiting.anchor):discardDirectReply(entries);
}
