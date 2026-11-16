export function splitCallSentences(text:string):{sentences:string[];tail:string};
export function callTranslationRows(parts:ReadonlyArray<{text:string;status:"pending"|"working"|"done"|"key"|"failed"}>):Array<{kind:"text"|"message";value:string}>;
