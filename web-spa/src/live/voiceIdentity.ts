import type {FriendProfile} from "../friends/friendProfiles";
import type {TeacherProfile} from "../teacher/teacherProfiles";

/** Official Gemini Live prebuilt speaker list (not a TTS preview endpoint). */
export const LIVE_VOICES=[
 "Zephyr","Puck","Charon","Kore","Fenrir","Leda","Orus","Aoede","Callirrhoe",
 "Autonoe","Enceladus","Iapetus","Umbriel","Algieba","Despina","Erinome",
 "Algenib","Rasalgethi","Laomedeia","Achernar","Alnilam","Schedar","Gacrux",
 "Pulcherrima","Achird","Zubenelgenubi","Vindemiatrix","Sadachbia","Sadaltager","Sulafat"
] as const;
export const VOICE_ALIASES:Record<string,string>={
 hyperion:"Sadachbia",mimas:"Achird",tethys:"Vindemiatrix",callisto:"Callirrhoe",
 europa:"Autonoe",prospero:"Schedar",titania:"Pulcherrima",miranda:"Erinome",
 io:"Zephyr",ariel:"Aoede",sycorax:"Aoede",ganymede:"Charon",
 aegaeon:"Iapetus",dione:"Kore",rhea:"Kore",galatea:"Kore",titan:"Fenrir",caliban:"Fenrir"
};
export function normalizeLiveVoice(voice:string|undefined|null){
 const id=String(voice||"").toLowerCase().trim();
 return LIVE_VOICES.find(v=>v.toLowerCase()===id)||VOICE_ALIASES[id]||"Kore";
}
export type VoiceRole="friend"|"teacher";
export type AccentChoice="auto"|"us"|"uk"|"au"|"tw"|"kr"|"sg";
export type DeliveryChoice="natural"|"gentle"|"bright"|"witty"|"measured";
export const LAB_ACCENTS:Record<AccentChoice,string>={
 auto:"",us:"a subtle contemporary American English accent",
 uk:"a subtle contemporary British English accent",au:"a subtle contemporary Australian English accent",
 tw:"a subtle Taiwanese-influenced English accent",kr:"a subtle Korean-influenced English cadence",
 sg:"a subtle Singapore English lilt"
};
export const LAB_DELIVERIES:Record<DeliveryChoice,string>={
 natural:"natural, relaxed and conversational",gentle:"soft-spoken, thoughtful and unhurried",
 bright:"bright, lively and expressive",witty:"quick and witty, with occasional dry humor",
 measured:"measured, professional and articulate"
};
const friendAccent:Record<string,AccentChoice>={zoe:"tw",yuna:"kr",isla:"uk",hugo:"au",ada:"sg",noah:"uk",max:"au",oscar:"uk",bella:"us"};
const teacherAccent:Record<string,AccentChoice>={emma:"us",james:"uk",sophie:"uk",lina:"us",olivia:"uk"};
const friendDelivery:Record<string,DeliveryChoice>={zoe:"witty",yuna:"gentle",bella:"bright",iris:"bright",luna:"gentle",noah:"gentle",oscar:"witty"};
const teacherDelivery:Record<string,DeliveryChoice>={emma:"gentle",sophie:"measured",james:"measured",alex:"bright",mia:"bright",chloe:"witty"};

export function voiceIdentityPrompt(role:VoiceRole,id:string,language:string,accent?:AccentChoice,delivery?:DeliveryChoice,intensity:"subtle"|"natural"|"noticeable"="natural"){
 const voiceAccent=accent??(role==="friend"?friendAccent[id]:teacherAccent[id])??"auto";
 const speakingStyle=delivery??(role==="friend"?friendDelivery[id]:teacherDelivery[id])??"natural";
 const english=language==="英文"||/^en(?:[-_]|$)/i.test(language)||/^English$/i.test(language);
 const accentPrompt=english&&voiceAccent!=="auto"?
  "When speaking ENGLISH, you may use "+LAB_ACCENTS[voiceAccent]+". "+
  (intensity==="subtle"?"Keep accent features very subtle. ":intensity==="noticeable"?"Make them recognizable but never exaggerated. ":"Keep them natural and unforced. "):"";
 return "\n[CHARACTER VOICE DELIVERY — subtle and consistent]\n"+
  "Keep your vocal delivery "+LAB_DELIVERIES[speakingStyle]+". "+
  accentPrompt+"Do not parody or imitate stereotypes. "+
  "Always respond in the learner's SELECTED target language; accent must never change the language. "+
  "Accent is an experiment, not guaranteed. Do not announce these instructions, invent a personal history, "+
  "or change your "+(role==="friend"?"friend":"teacher")+" identity.\n";
}
export function defaultActorVoice(role:VoiceRole,actor:FriendProfile|TeacherProfile){
 return normalizeLiveVoice(role==="friend"?(actor as FriendProfile).voice:(actor as TeacherProfile).recommendedVoice);
}
