import {learningLanguageCode} from "./learningLanguages";

export type DailyPhrase={text:string;translation:string};

const CATALOG:Record<string,DailyPhrase[]>={
 en:[
  {text:"Sounds good to me.",translation:"我覺得可以。"},
  {text:"Give me a second.",translation:"等我一下。"},
  {text:"I'm not sure yet.",translation:"我還不確定。"},
  {text:"That makes sense.",translation:"這樣很有道理。"},
  {text:"Let me think about it.",translation:"讓我想一下。"},
  {text:"I'm looking forward to it.",translation:"我很期待。"},
  {text:"It depends on the situation.",translation:"要看情況。"},
  {text:"I'll get back to you later.",translation:"我晚點再回覆你。"}
 ],
 es:[
  {text:"Me parece bien.",translation:"我覺得可以。"},
  {text:"Dame un segundo.",translation:"等我一下。"},
  {text:"Todavía no estoy seguro.",translation:"我還不確定。"},
  {text:"Tiene sentido.",translation:"這樣很有道理。"},
  {text:"Déjame pensarlo.",translation:"讓我想一下。"},
  {text:"Tengo muchas ganas.",translation:"我很期待。"},
  {text:"Depende de la situación.",translation:"要看情況。"},
  {text:"Te respondo más tarde.",translation:"我晚點再回覆你。"}
 ],
 fr:[
  {text:"Ça me va.",translation:"我覺得可以。"},
  {text:"Donne-moi une seconde.",translation:"等我一下。"},
  {text:"Je ne suis pas encore sûr.",translation:"我還不確定。"},
  {text:"Ça a du sens.",translation:"這樣很有道理。"},
  {text:"Laisse-moi réfléchir.",translation:"讓我想一下。"},
  {text:"J'ai hâte.",translation:"我很期待。"},
  {text:"Ça dépend de la situation.",translation:"要看情況。"},
  {text:"Je te répondrai plus tard.",translation:"我晚點再回覆你。"}
 ],
 de:[
  {text:"Klingt gut für mich.",translation:"我覺得可以。"},
  {text:"Gib mir eine Sekunde.",translation:"等我一下。"},
  {text:"Ich bin mir noch nicht sicher.",translation:"我還不確定。"},
  {text:"Das ergibt Sinn.",translation:"這樣很有道理。"},
  {text:"Lass mich kurz überlegen.",translation:"讓我想一下。"},
  {text:"Ich freue mich darauf.",translation:"我很期待。"},
  {text:"Es kommt auf die Situation an.",translation:"要看情況。"},
  {text:"Ich melde mich später.",translation:"我晚點再回覆你。"}
 ],
 it:[
  {text:"Per me va bene.",translation:"我覺得可以。"},
  {text:"Dammi un secondo.",translation:"等我一下。"},
  {text:"Non ne sono ancora sicuro.",translation:"我還不確定。"},
  {text:"Ha senso.",translation:"這樣很有道理。"},
  {text:"Fammi pensare.",translation:"讓我想一下。"},
  {text:"Non vedo l'ora.",translation:"我很期待。"},
  {text:"Dipende dalla situazione.",translation:"要看情況。"},
  {text:"Ti rispondo più tardi.",translation:"我晚點再回覆你。"}
 ],
 pt:[
  {text:"Por mim, tudo bem.",translation:"我覺得可以。"},
  {text:"Me dá um segundo.",translation:"等我一下。"},
  {text:"Ainda não tenho certeza.",translation:"我還不確定。"},
  {text:"Faz sentido.",translation:"這樣很有道理。"},
  {text:"Deixa eu pensar.",translation:"讓我想一下。"},
  {text:"Estou ansioso por isso.",translation:"我很期待。"},
  {text:"Depende da situação.",translation:"要看情況。"},
  {text:"Eu te respondo mais tarde.",translation:"我晚點再回覆你。"}
 ],
 ja:[
  {text:"いいと思うよ。",translation:"我覺得可以。"},
  {text:"ちょっと待って。",translation:"等我一下。"},
  {text:"まだよく分からない。",translation:"我還不確定。"},
  {text:"なるほど。",translation:"這樣很有道理。"},
  {text:"ちょっと考えさせて。",translation:"讓我想一下。"},
  {text:"楽しみにしてる。",translation:"我很期待。"},
  {text:"状況によるね。",translation:"要看情況。"},
  {text:"あとで返事するね。",translation:"我晚點再回覆你。"}
 ],
 ko:[
  {text:"좋은 것 같아.",translation:"我覺得可以。"},
  {text:"잠깐만.",translation:"等我一下。"},
  {text:"아직 잘 모르겠어.",translation:"我還不確定。"},
  {text:"말이 되네.",translation:"這樣很有道理。"},
  {text:"생각 좀 해볼게.",translation:"讓我想一下。"},
  {text:"기대하고 있어.",translation:"我很期待。"},
  {text:"상황에 따라 달라.",translation:"要看情況。"},
  {text:"나중에 답할게.",translation:"我晚點再回覆你。"}
 ],
 zh:[
  {text:"聽起來不錯。",translation:"Sounds good to me."},
  {text:"等我一下。",translation:"Give me a second."},
  {text:"我還不確定。",translation:"I'm not sure yet."},
  {text:"這樣很有道理。",translation:"That makes sense."},
  {text:"讓我想一下。",translation:"Let me think about it."},
  {text:"我很期待。",translation:"I'm looking forward to it."},
  {text:"要看情況。",translation:"It depends on the situation."},
  {text:"我晚點再回覆你。",translation:"I'll get back to you later."}
 ],
 vi:[
  {text:"Nghe hay đấy.",translation:"我覺得可以。"},
  {text:"Cho tôi một giây.",translation:"等我一下。"},
  {text:"Tôi vẫn chưa chắc.",translation:"我還不確定。"},
  {text:"Nghe hợp lý đấy.",translation:"這樣很有道理。"},
  {text:"Để tôi nghĩ một chút.",translation:"讓我想一下。"},
  {text:"Tôi rất mong chờ.",translation:"我很期待。"},
  {text:"Còn tùy tình huống.",translation:"要看情況。"},
  {text:"Tôi sẽ trả lời sau.",translation:"我晚點再回覆你。"}
 ],
 th:[
  {text:"ฟังดูดีนะ",translation:"我覺得可以。"},
  {text:"ขอเวลาสักครู่",translation:"等我一下。"},
  {text:"ฉันยังไม่แน่ใจ",translation:"我還不確定。"},
  {text:"ฟังดูสมเหตุสมผลนะ",translation:"這樣很有道理。"},
  {text:"ขอคิดดูก่อนนะ",translation:"讓我想一下。"},
  {text:"ฉันตั้งตารอเลย",translation:"我很期待。"},
  {text:"ขึ้นอยู่กับสถานการณ์",translation:"要看情況。"},
  {text:"เดี๋ยวฉันตอบทีหลัง",translation:"我晚點再回覆你。"}
 ],
 id:[
  {text:"Kedengarannya bagus.",translation:"我覺得可以。"},
  {text:"Tunggu sebentar.",translation:"等我一下。"},
  {text:"Saya masih belum yakin.",translation:"我還不確定。"},
  {text:"Masuk akal.",translation:"這樣很有道理。"},
  {text:"Biar saya pikir dulu.",translation:"讓我想一下。"},
  {text:"Saya menantikannya.",translation:"我很期待。"},
  {text:"Tergantung situasinya.",translation:"要看情況。"},
  {text:"Saya akan membalas nanti.",translation:"我晚點再回覆你。"}
 ]
};

function daySeed(date=new Date()){
 const local=new Date(date.getFullYear(),date.getMonth(),date.getDate());
 return Math.floor(local.getTime()/86400000);
}
export function dailyPhrases(languageValue:string,date=new Date(),count=5):DailyPhrase[]{
 const code=learningLanguageCode(languageValue),items=code?CATALOG[code]||[]:[];
 if(!items.length)return [];
 const start=Math.abs(daySeed(date))%items.length;
 return Array.from({length:Math.min(count,items.length)},(_,index)=>items[(start+index)%items.length]);
}
