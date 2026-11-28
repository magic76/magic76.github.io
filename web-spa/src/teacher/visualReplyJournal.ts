import type {BoardCard} from "./boardProtocol";
// Session-only visual reply journal. Sequence IDs are independent of model card IDs.
export type VisualReply={id:number;turn:number|null;card:BoardCard;answers:Record<string,number>;quizIndex:number};
export function appendVisualReply(entries:VisualReply[],id:number,card:BoardCard):VisualReply[]{
 return [...entries,{id,turn:null,card,answers:{},quizIndex:0}].slice(-80);
}
export function sealVisualReplies(entries:VisualReply[],turn:number|null):VisualReply[]{
 return turn===null?entries:entries.map(e=>e.turn===null?{...e,turn}:e);
}
export function updateVisualReply(entries:VisualReply[],id:number,patch:Partial<Pick<VisualReply,"answers"|"quizIndex">>){
 return entries.map(e=>e.id===id?{...e,...patch}:e);
}
export function discardPendingVisualReplies(entries:VisualReply[],keepId:number|null=null){return entries.filter(e=>e.turn!==null||e.id===keepId)}
export function visualRepliesAt(entries:VisualReply[],turn:number|"stream"){return entries.filter(e=>turn==="stream"?e.turn===null:e.turn===turn)}
