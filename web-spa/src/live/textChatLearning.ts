/** Pure, friend-text-only learning helpers. UI labels live in voice.json. */
export type LearningNote={index:number;reply:string;original:string;tip:string|null;phrase:string|null};
export type LearningMessage={role:"user"|"assistant";text:string};
const languageHints:Record<string,RegExp>={
 es:/\b(yo|estoy|tengo|quiero|gracias|hola|pero|porque|ayer|mañana|que|una|con|para)\b/i,
 fr:/\b(je|suis|j'ai|tu|nous|vous|avec|pour|bonjour|merci|est|dans|une|mais)\b/i,
 de:/\b(ich|bin|habe|du|wir|und|nicht|ein|eine|mit|danke|bitte|gestern)\b/i,
 it:/\b(io|sono|ho|noi|ciao|grazie|per|con|una|ieri|oggi|voglio)\b/i,
 pt:/\b(eu|sou|estou|tenho|você|obrigado|hoje|amanhã|para|com|uma)\b/i,
 id:/\b(saya|aku|kamu|tidak|dengan|untuk|terima|kasih|kemarin|hari)\b/i,
 vi:/\b(tôi|bạn|không|cảm|ơn|mình|muốn|hôm|nay|đi|đã)\b/i
};
/** Conservative heuristic: in natural mode never coach an obviously native-language utterance. */
export function looksLikePractice(sentence:string,code:string,uiLocale="zh-TW"):boolean{
 const value=sentence.trim();
 if(value.length<3||value.length>700||/\[\[/.test(value))return false;
 const target=code==="pt-BR"?"pt":code;
 if(target==="ja")return /[\u3040-\u30ff]/.test(value);
 if(target==="ko")return /[\uac00-\ud7af]/.test(value);
 if(target==="zh")return /[\u3400-\u9fff]/.test(value)&&!/[\u3040-\u30ff]/.test(value);
 if(target==="th")return /[\u0e00-\u0e7f]/.test(value);
 if(target==="en")return /\b[A-Za-z]+(?:[’'][A-Za-z]+)?(?:\s+[A-Za-z]+(?:[’'][A-Za-z]+)?){1,}\b/.test(value)&&!/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af\u0e00-\u0e7f]/.test(value)&&(!/[\p{L}]/u.test(value.replace(/[\x00-\x7f]/g,""))||uiLocale.startsWith("en"));
 return Boolean(languageHints[target]?.test(value))&&!/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af\u0e00-\u0e7f]/.test(value);
}
/** The assistant's optional markers are never part of stored chat messages. */
export function summarizeLearning(messages:LearningMessage[],notes:LearningNote[],limit=3):string[]{
 const userTurns=messages.filter(item=>item.role==="user").length;
 const current=notes.filter(note=>messages[note.index]?.role==="assistant"&&messages[note.index].text===note.reply);
 if(userTurns<3&&current.filter(note=>note.tip).length<2)return [];
 const values:string[]=[],seen=new Set<string>();
 for(const note of current){
  for(const value of [note.tip?`${note.original.slice(0,100)} → ${note.tip}`:null,note.phrase]){
   const phrase=value?.trim();
   if(!phrase||phrase.length>140)continue;
   const key=phrase.toLocaleLowerCase();
   if(!seen.has(key)){seen.add(key);values.push(phrase)}
   if(values.length>=limit)return values;
  }
 }
 return values;
}
/** Questions must not force the native language into full immersion. */
const immersionQuestions:Record<string,string>={
 en:"Does this sound natural?",ja:"この言い方は自然？",ko:"이 표현 자연스러워?",es:"¿Suena natural?",
 fr:"Est-ce que cette phrase est naturelle ?",de:"Klingt das natürlich?",it:"Suona naturale?",
 vi:"Câu này có tự nhiên không?",th:"ประโยคนี้ฟังเป็นธรรมชาติไหม",zh:"這樣說自然嗎？",
 pt:"Isso soa natural?",id:"Apakah kalimat ini terdengar alami?"
};
export function makeLearningCheck(sentence:string,code:string,mode:string,uiQuestion:string):string{
 const question=mode==="immersion"?(immersionQuestions[code]||immersionQuestions.en):uiQuestion;
 return `${question} 「${sentence.slice(0,360)}」`;
}
