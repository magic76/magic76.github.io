export type FeedbackKind="bug"|"idea"|"other"|"rating";
export type FeedbackProduct="teacher"|"friend"|"play"|"story"|"shorts"|"site";
export type FeedbackReason=""|"wrong_language"|"repeated_question"|"interrupted"|"bad_response"|"connection"|"game_logic"|"other";
export type FeedbackPayload={
 kind:FeedbackKind;product:FeedbackProduct;platform:"web"|"android";
 rating?:1|5;reason:FeedbackReason;message:string;includeDiagnostics:boolean;
 page?:string;roleId?:string;model?:string;errorCode?:string;locale?:string;buildVersion?:string;website?:string;
};
export async function sendFeedback(payload:FeedbackPayload):Promise<string>{
 const reply=await fetch("/api/feedback",{method:"POST",credentials:"same-origin",
  headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
 if(!reply.ok){
  if(reply.status===429)throw Error("rate_limit");
  if(reply.status===503)throw Error("not_ready");
  throw Error("submit_failed");
 }
 const data=await reply.json() as {ok?:boolean;id?:string};
 if(!data.ok)throw Error("submit_failed");
 return data.id||"";
}
