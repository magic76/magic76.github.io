import type {Age} from "./timeline";
import type {TimelineCharacterId} from "./timelineCharacters";

/** Same prebuilt speaker at every life stage. Age is delivery, not voice swapping. */
export const MIRA_LIVE_VOICE="Aoede";
export type TimelineVoiceMode="age"|"original";

const AGE_DELIVERY:Record<Age,string>={
 7:"Use a bright, playful cadence: quick little bursts of excitement, small pauses to find words, and spontaneous emphasis. Never pitch-shift into a cartoon child voice.",
 10:"Keep childlike playful curiosity with tiny bursts of observation and cheerful pauses, never an artificially pitched child voice.",
 13:"Use a slightly self-conscious early-teen rhythm that quickens when discussing cameras and slows when feelings are private.",
 16:"Use a brisk, slightly uneven teenage rhythm with quick changes in emphasis, occasional self-conscious pauses and dry humor. Avoid a practiced adult narrator cadence.",
 19:"Use an eager, quick young-adult cadence with an occasional uncertain beat when talking about home and independence.",
 22:"Sound curious and busy, with informal energy and a breath of hesitation when creative choices become difficult.",
 25:"Use a lively but more grounded conversational pace, open emotional reactions and natural, unpolished phrasing. Let enthusiasm coexist with tiredness or uncertainty.",
 35:"Speak clearly and confidently with dry warmth, balancing professional speed with attentive moments.",
 40:"Use a steady mid-tempo cadence, calm clear emphasis and occasional wry warmth. Sound engaged and present, not solemn or like a lecturer.",
 50:"Use a warm, open mentoring rhythm with quick laughter and thoughtful beats, neither frail nor artificially slow.",
 55:"Use a relaxed, assured rhythm with a little more space between thoughts, warm expressiveness and easy humor. Do not make age synonymous with slowness.",
 70:"Use an unhurried but alert cadence, gentle emphasis, comfortable pauses and lively flashes of humor. Do not add forced rasp, breathlessness, shakiness or frailty."
};

export function timelineVoiceMode(value:string|null):TimelineVoiceMode{
 return value==="original"?"original":"age";
}

/** Qualitative Live prosody experiment: the API does not expose numeric age/pitch controls. */
export function buildTimelineAgeVoicePrompt(age:Age,mode:TimelineVoiceMode="age",characterId:TimelineCharacterId="mira"):string{
 if(mode==="original")return "";
 return "\n[TIMELINE AGE DELIVERY — SAME SPEAKER, EXPERIMENTAL]\n"+
  "Keep "+(characterId==="mira"?"Mira":characterId==="ethan"?"Ethan":"Hana")+"'s underlying speaker identity, vocal timbre, pronunciation and language consistent across every age. "+
  "Only change conversational rhythm, emphasis, emotional energy and pauses to reflect the current life stage. "+
  "Never switch speaker, force a pitch shift, impersonate a specific real person or imitate an age stereotype. "+
  (characterId==="mira"?AGE_DELIVERY[age]:"Use an authentic, age-appropriate conversational rhythm based on this character's current experiences, never impersonate a child or elderly voice.")+" "+
  "The selected target language remains unchanged. Treat these as quiet vocal-performance directions, not dialogue: never announce them.\n";
}
