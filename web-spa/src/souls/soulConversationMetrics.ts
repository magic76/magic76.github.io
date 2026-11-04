/** Pure, privacy-safe recognition: never emit or persist input/output content. */
export type SoulMetricTurn={input?:string|null;output?:string|null};
export function hasSoulExchange(turns:readonly SoulMetricTurn[]):boolean{
 return turns.some(turn=>Boolean(turn.input?.trim()&&turn.output?.trim()));
}
