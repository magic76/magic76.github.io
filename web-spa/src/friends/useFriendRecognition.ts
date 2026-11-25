import {useMemo,useEffect,useState} from "react";
import {browserSpeechLanguagePair,resolveBrowserSpeechLanguage} from "../live/browserSpeechRecognition";
import {useBrowserSpeechCaptions} from "../live/useBrowserSpeechCaptions";
import type {ReturnTypeOfLive} from "../live/types";
import type {FriendChatLanguageMode} from "./friendLanguage";

export function useFriendRecognition({language,friendNativeLanguage,friendChatMode,live,active,creatureEmbed}:{language:string;friendNativeLanguage:Parameters<typeof browserSpeechLanguagePair>[1];friendChatMode:FriendChatLanguageMode;live:ReturnTypeOfLive;active:boolean;creatureEmbed:boolean}){
 const recognitionLanguages=useMemo(()=>browserSpeechLanguagePair(language,friendNativeLanguage,friendChatMode),[language,friendNativeLanguage,friendChatMode]);
 const [recognitionOverride,setRecognitionOverride]=useState("");
 useEffect(()=>{setRecognitionOverride("")},[language,friendNativeLanguage]);
 useEffect(()=>{if(!active)setRecognitionOverride("")},[active]);
 const automaticRecognitionLanguage=useMemo(()=>resolveBrowserSpeechLanguage(recognitionLanguages,live.turns),[recognitionLanguages,live.turns]);
 const recognitionLanguage=recognitionLanguages.includes(recognitionOverride)?recognitionOverride:automaticRecognitionLanguage;
 // Explicit opt-in: Android may open an additional browser microphone session.
 // Stop while AI is speaking, muted, reconnecting or leaving. Never replace Gemini's authoritative transcript.
 const browserSpeech=useBrowserSpeechCaptions({
  eligible:!creatureEmbed&&live.state==="listening"&&live.micEnabled&&!live.muted&&!live.openingProtected,
  language:recognitionLanguage,turnCount:live.turns.length,
  clear:!active||!live.micEnabled||live.muted||live.openingProtected||live.state==="connecting"
 });
 return {recognitionLanguages,recognitionOverride,setRecognitionOverride,recognitionLanguage,browserSpeech};
}
