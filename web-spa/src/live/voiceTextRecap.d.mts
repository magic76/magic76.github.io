/** Types for the Node-testable voice recap helpers. Keep in sync with voiceTextRecap.mjs. */
export type VoiceTextMessage={role:"user"|"assistant";text:string};
export declare function pickVoiceTextRecap(scope:string,friendId:string,messages:readonly VoiceTextMessage[]):VoiceTextMessage[];
export declare function voiceTextContext(messages:readonly VoiceTextMessage[]):string;
export type FriendVoiceOpeningParts={
 name:string;languageDirective:string;shorts:boolean;shortsHint:string;questionHint:string;
 lifeOpening:string;conversationHint:string;conversationStyle:string;creatureContext:string;hasRecap:boolean;
};
export declare function composeFriendVoiceOpening(parts:FriendVoiceOpeningParts):string;
