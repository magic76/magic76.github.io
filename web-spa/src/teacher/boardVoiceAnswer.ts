import type {BoardCard} from "./boardProtocol";
import type {DirectorState} from "./teachingDirector";
export type VoiceBoardAnswer={kind:"speaking";text:string}|{kind:"quiz";index:number;selected:number};
const letterIndex=(spoken:string):number=>{
 const bare=spoken.trim().match(/^([ABCD])\s*[.!。！]?$/i);
 if(bare)return bare[1].toUpperCase().charCodeAt(0)-65;
 const match=spoken.match(/(?:第\s*[一二三123]\s*題\s*(?:我\s*)?(?:選擇?|答案\s*是|是)?|(?:answer|答案|我選|選擇))\s*[，,.:：]?\s*([ABCD])/i);
 return match?match[1].toUpperCase().charCodeAt(0)-65:-1;
};
export function parseBoardVoiceAnswer(raw:string,stage:DirectorState,card?:BoardCard):VoiceBoardAnswer|null{
 const text=raw.trim();
 if(!text||stage.phase!=="awaiting"||!card||/^(can you repeat|repeat please|再說一次|我不懂|please help|給我提示)[?.!。！ ]*$/i.test(text))return null;
 if(card.type==="speaking")return {kind:"speaking",text};
 if(card.type!=="quiz")return null;
 const selected=letterIndex(text);
 if(selected<0)return null;
 const match=text.match(/第\s*([一二三123])\s*題/);
 const number=match?({一:1,二:2,三:3}[match[1] as "一"|"二"|"三"]||Number(match[1])):stage.quizIndex+1;
 return number-1===stage.quizIndex?{kind:"quiz",index:number-1,selected}:null;
}
