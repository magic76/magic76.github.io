import {browserSpeechLanguagePair} from "./browserSpeechRecognition";

// The official Live API documents languageCodes for input transcription, but
// the deployed voice v1alpha and constrained v1beta routes need real acceptance
// testing. This URL-only experiment must not change ordinary calls.
export function geminiInputLanguageHints(search:string,pageKey:string,sessionKind?:string,target?:string,native?:string):string[]{
 if(new URLSearchParams(search).get("asrHints")!=="1")return [];
 if(sessionKind!=="friend"&&pageKey!=="teacher"&&pageKey!=="teacher-board")return [];
 // Keep the same language pair for all three reply modes. No guessing an
 // unknown language and no changes to output voice or language instructions.
 return browserSpeechLanguagePair(target||"",native||"","natural");
}
