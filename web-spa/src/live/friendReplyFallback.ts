/** Tiny friend-route-only fallback lexicon: voice translations for other locales are lazy-loaded. */
export type FriendReplyMode="natural"|"bilingual"|"immersion";
const practiced:Record<string,readonly [string,string,string]>={
 "zh":["多說一點。","為什麼？","換個話題。"],
 "en":["Tell me more.","Why is that?","Let’s talk about something else."],
 "ja":["もっと聞かせて。","どうして？","別の話をしよう。"],
 "ko":["더 얘기해 줘.","왜 그래?","다른 얘기 하자."],
 "es":["Cuéntame más.","¿Por qué?","Hablemos de otra cosa."],
 "fr":["Raconte-moi la suite.","Pourquoi ?","Parlons d’autre chose."],
 "de":["Erzähl mir mehr.","Warum?","Lass uns über etwas anderes reden."],
 "it":["Raccontami di più.","Perché?","Cambiamo argomento."],
 "vi":["Kể thêm cho mình nhé.","Tại sao vậy?","Mình nói chuyện khác nhé."],
 "id":["Ceritakan lebih banyak.","Kenapa begitu?","Ayo bahas hal lain."],
 "th":["เล่าให้ฟังอีกหน่อย","ทำไมเหรอ","เปลี่ยนเรื่องคุยกันเถอะ"],
 "pt":["Me conta mais.","Por quê?","Vamos mudar de assunto."]
};

/** FriendLivePage owns the active mode locally; its final language directive is authoritative. */
export function modeFromFriendSystem(system:string,stored:FriendReplyMode):FriendReplyMode{
 const marker="[FRIEND LANGUAGE CONTROL — ";
 const at=system.lastIndexOf(marker);
 if(at<0)return stored;
 const directive=system.slice(at+marker.length);
 if(directive.startsWith("NATURAL SINGLE LANGUAGE,"))return "natural";
 if(directive.startsWith("TARGET CHAT WITH NATIVE HELP,"))return "bilingual";
 if(directive.startsWith("FULL IMMERSION,"))return "immersion";
 return stored;
}

/** Natural mode follows loaded UI voice.json; practice modes never depend on an unloaded locale. */
export function friendFallbackPhrases(code:string,mode:FriendReplyMode,uiPhrases:readonly string[]):string[]{
 if(mode==="natural")return [...uiPhrases];
 const normalized=code==="zh-TW"||code==="zh-CN"?"zh":code==="pt-BR"?"pt":code;
 return [...(practiced[normalized]||practiced.en)];
}
