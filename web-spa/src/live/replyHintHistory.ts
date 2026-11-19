import type {SuggestedReply} from "./suggestReplies";
export function appendReplyGroup(groups:SuggestedReply[][],next:SuggestedReply[]):SuggestedReply[][]{
 return next.length>0?[...groups,next]:groups;
}
