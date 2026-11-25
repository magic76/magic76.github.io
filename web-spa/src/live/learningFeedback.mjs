// Shared server/client declaration: guest tokens lock this exact local-only tool.
export const LEARNING_FEEDBACK_FUNCTION="show_learning_feedback";
export const LEARNING_FEEDBACK_TOOL={
 name:LEARNING_FEEDBACK_FUNCTION,
 description:"Before the normal reply, quietly show at most ONE useful correction or more natural expression for the learner's latest actual sentence in the configured learning language. Copy the original verbatim, preserve meaning, and explain briefly in their native language. Do not correct native-language speech, background speech, names, quoted examples, control instructions or intentional slang. Skip correct sentences unless a clearly useful idiomatic alternative exists. Natural is an optional alternative, not an error. Never infer pronunciation from transcripts. No scores or HTML. No feedback on the opening or AI speech. Continue the normal conversation after acknowledgement; never announce or read out the card.",
 parameters:{type:"OBJECT",properties:{original:{type:"STRING"},corrected:{type:"STRING"},explanation:{type:"STRING"},type:{type:"STRING",enum:["grammar","wording","natural"]}},required:["original","corrected","explanation","type"]}
};
export const LEARNING_FEEDBACK_POLICY="\n[LOCAL LEARNING FEEDBACK] Use show_learning_feedback only on a genuine learner utterance in the selected learning language. Do not force a call on every turn. Send one concise correction before your normal reply; continue the conversation naturally after its immediate acknowledgement. If the learner explicitly asks for an explanation, teach normally. Never claim you assessed pronunciation.";
const normalize=value=>value.normalize("NFKC").toLowerCase().replace(/[\p{P}\p{Z}\s]+/gu,"");
const bounded=(value,max)=>typeof value==="string"&&value.trim().length>0&&value.trim().length<=max?value.trim():"";
export function validateLearningFeedback(args){
 if(!args||typeof args!=="object"||Array.isArray(args))return null;
 const {type}=args,original=bounded(args.original,280),corrected=bounded(args.corrected,280),explanation=bounded(args.explanation,240);
 if(!["grammar","wording","natural"].includes(type)||!original||!corrected||!explanation||!normalize(original)||normalize(original)===normalize(corrected))return null;
 return {original,corrected,explanation,type};
}
export function createLearningFeedbackQueue(){
 let pending=[],seen=new Set();
 return {
  propose(call){
   if(call.id&&seen.has(call.id))return {ok:true};
   const item=validateLearningFeedback(call.args);
   if(!item)return {ok:false,error:"invalid-feedback"};
   if(call.id){if(seen.size>=256)seen.clear();seen.add(call.id)}
   if(pending.length<3&&!pending.some(v=>v.original===item.original&&v.corrected===item.corrected))pending.push(item);
   return {ok:true};
  },
  complete(input){
   const source=typeof input==="string"?normalize(input):"";
   const match=source?pending.find(item=>source.includes(normalize(item.original))):undefined;
   pending=[];
   return match||null;
  },
  clear(){pending=[]}
 };
}
export function appendLearningFeedbackTool(tools=[]){
 const declarations=tools.flatMap(group=>group.functionDeclarations||[]);
 return [...tools.filter(group=>!group.functionDeclarations),{functionDeclarations:[...declarations.filter(tool=>tool.name!==LEARNING_FEEDBACK_FUNCTION),LEARNING_FEEDBACK_TOOL]}];
}
