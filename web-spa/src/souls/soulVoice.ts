import {LIVE_VOICES,normalizeLiveVoice} from "../live/voiceIdentity";

/** Draws only voices the shared Gemini Live engine supports.
 * Never re-roll a saved Soul implicitly (not on page render, not on personality change).
 */
export function randomSoulVoice(previous?:string,random:()=>number=Math.random):string{
 const old=previous?normalizeLiveVoice(previous):null;
 const options=LIVE_VOICES.filter(voice=>voice!==old);
 const fraction=random();
 const index=Math.min(options.length-1,Math.max(0,Math.floor(
  (Number.isFinite(fraction)?fraction:0)*options.length)));
 return options[index]||"Kore";
}

export function soulVoiceLabel(value:string|undefined|null):string{
 return normalizeLiveVoice(value);
}
