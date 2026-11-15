export type CreatureVoiceContext={line:string|null;stage:number;energy:number;topic:string};
export type CreatureVoiceMessage={channelId:string;creature:CreatureVoiceContext};
export function validCreatureContext(message:unknown):CreatureVoiceMessage|null;
export function creatureVoiceInstruction(creature:CreatureVoiceContext):string;
export function validCreatureVoiceTurn(turn:unknown):{turnId:string;input:string;output:string}|null;
