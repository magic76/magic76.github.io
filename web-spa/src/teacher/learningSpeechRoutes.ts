// Routes mirror public/tts-lab/kokoro/index.html. Base languages share one model.
export const LEARNING_SPEECH_ROUTES={
 en:{engine:"kokoro",model:"base",voice:"af_heart",locale:"en-US"},
 "en-US":{engine:"kokoro",model:"base",voice:"af_heart",locale:"en-US"},
 "en-GB":{engine:"kokoro",model:"base",voice:"bf_emma",locale:"en-GB"},
 es:{engine:"kokoro",model:"base",voice:"ef_dora",g2p:"es",locale:"es-ES"},
 fr:{engine:"kokoro",model:"base",voice:"ff_siwis",g2p:"fr",locale:"fr-FR"},
 it:{engine:"kokoro",model:"base",voice:"if_sara",g2p:"it",locale:"it-IT"},
 pt:{engine:"kokoro",model:"base",voice:"pf_dora",g2p:"pt-br",locale:"pt-BR"},
 hi:{engine:"kokoro",model:"base",voice:"hf_alpha",g2p:"hi",locale:"hi-IN"},
 ja:{engine:"kokoro",model:"ja",voice:"jf_alpha",locale:"ja-JP"},
 zh:{engine:"kokoro",model:"zh",voice:"zf_001",locale:"zh-TW"},
 de:{engine:"pico",model:"pico",locale:"de-DE"},
} as const;
export type LearningRoute={engine:"kokoro"|"pico"|"system";model?: "base"|"ja"|"zh"|"pico";voice?:string;g2p?:string;locale:string};
export function learningSpeechRoute(language:string):LearningRoute{
 const exact=language.toLowerCase()==="en-gb"?"en-GB":language.toLowerCase()==="en-us"?"en-US":language.toLowerCase().split("-")[0];
 return LEARNING_SPEECH_ROUTES[exact as keyof typeof LEARNING_SPEECH_ROUTES]||{engine:"system",locale:language};
}
