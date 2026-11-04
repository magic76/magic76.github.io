/** Pure check for a confirmed two-sided turn.
 * A proactive AI greeting or a partial transcript never counts as a conversation.
 */
export function hasConfirmedTwoSidedExchange(
 turn:{input?:string;output?:string;hasValidOutput?:boolean},
 completedTurns:ReadonlyArray<{input?:string;output?:string}>
):boolean{
 if(!turn.hasValidOutput)return false;
 if(turn.input?.trim()&&turn.output?.trim())return true;
 return completedTurns.some(item=>Boolean(item.input?.trim()&&item.output?.trim()));
}
