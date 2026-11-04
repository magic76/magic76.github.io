/** Privacy-safe check for a verified two-sided Soul Live turn.
 * Never store, log or send any transcript content to the analytics pipeline.
 * An opening AI greeting alone is not a completed conversation.
 */
export type SoulMetricTurn={input?:string|null;output?:string|null};
export function hasSoulExchange(turns:readonly SoulMetricTurn[]):boolean{
 return turns.some(turn=>Boolean(turn.input?.trim()&&turn.output?.trim()));
}
export function hasSoulInput(turns:readonly SoulMetricTurn[]):boolean{
 return turns.some(turn=>Boolean(turn.input?.trim()));
}
