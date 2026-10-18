import type {Age} from "./timeline";

/** Same prebuilt speaker at every life stage. Age is delivery, not voice swapping. */
export const MIRA_LIVE_VOICE="Aoede";
export type TimelineVoiceMode="age"|"original";

const AGE_DELIVERY:Record<Age,string>={
 7:"Use a bright, playful cadence: quick little bursts of excitement, small pauses to find words, and spontaneous emphasis. Never pitch-shift into a cartoon child voice.",
 16:"Use a brisk, slightly uneven teenage rhythm with quick changes in emphasis, occasional self-conscious pauses and dry humor. Avoid a practiced adult narrator cadence.",
 25:"Use a lively but more grounded conversational pace, open emotional reactions and natural, unpolished phrasing. Let enthusiasm coexist with tiredness or uncertainty.",
 40:"Use a steady mid-tempo cadence, calm clear emphasis and occasional wry warmth. Sound engaged and present, not solemn or like a lecturer.",
 55:"Use a relaxed, assured rhythm with a little more space between thoughts, warm expressiveness and easy humor. Do not make age synonymous with slowness.",
 70:"Use an unhurried but alert cadence, gentle emphasis, comfortable pauses and lively flashes of humor. Do not add forced rasp, breathlessness, shakiness or frailty."
};

export function timelineVoiceMode(value:string|null):TimelineVoiceMode{
 return value==="original"?"original":"age";
}

/** Qualitative Live prosody experiment: the API does not expose numeric age/pitch controls. */
export function buildTimelineAgeVoicePrompt(age:Age,mode:TimelineVoiceMode="age"):string{
 if(mode==="original")return "";
 return "\n[TIMELINE AGE DELIVERY — SAME SPEAKER, EXPERIMENTAL]\n"+
  "Keep Mira's underlying speaker identity, vocal timbre, pronunciation and language consistent across every age. "+
  "Only change conversational rhythm, emphasis, emotional energy and pauses to reflect her current life stage. "+
  "Never switch speaker, force a pitch shift, impersonate a specific real person or imitate an age stereotype. "+
  AGE_DELIVERY[age]+" "+
  "The selected target language remains unchanged. Treat these as quiet vocal-performance directions, not dialogue: never announce them.\n";
}
