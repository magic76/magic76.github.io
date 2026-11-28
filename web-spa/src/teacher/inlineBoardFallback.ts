import {fallbackBoard,type BoardCard} from "./boardProtocol";
import {findLesson} from "./boardLessons";
import {edTopic,teachingCue,visualClaim} from "./inlineBoardGate";

// Native audio ASR may spell the learner's "ed" incorrectly, but the teacher's
// actual explanation can identify the topic even when the tool is missing.
export function explainsEdEnding(output:string){
 const text=output.normalize("NFKC").replace(/[“”‘’"'「」『』]/g,"").replace(/\s+/g," ");
 const suffix=edTopic(text)||/(?:-?ed\s*(?:ending|suffix)|(?:字尾|結尾)\s*-?ed)/i.test(text);
 const categories=/(?:three (?:different )?(?:sounds|pronunciations)|三種(?:不同的)?(?:發音|讀音)|voiceless|unvoiced|voiced|清音|濁音|無聲音|有聲音)/i.test(text);
 return suffix&&categories;
}
const compactScript=(text:string)=>/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u.test(text);
const usable=(output:string)=>output.trim().length>=(compactScript(output)?28:60)&&!visualClaim(output);
const edReference=(text:string)=>/\b-?ed\s+(?:endings?|suffix)\b|(?:字尾|結尾|结尾)\s*-?ed\b/i.test(text)||edTopic(text);
export function backupCard(topic:string,output:string,manual=false,previousOutput="",language="en"):BoardCard|null{
 const claim=visualClaim(output);
 // English-only pronunciation material must not leak into a different target language.
 if(language!=="en"&&(edTopic(topic)||explainsEdEnding(output)||edReference(output)))return null;
 // Ground curated examples in an actual topic, not merely the word "board".
 if(language==="en"&&(edTopic(topic)||explainsEdEnding(output)||(manual&&(edReference(output)||explainsEdEnding(previousOutput))))){
  return findLesson("ed-sounds")?.cards.find(c=>c.type==="comparison")||null;
 }
 const spoken=usable(output)?output:manual&&usable(previousOutput)?previousOutput:"";
 if(language==="en"&&(manual||teachingCue(topic)||edTopic(topic))){
  const patch=fallbackBoard({input:topic,output:spoken},[]);
  const structured=patch?.cards.find(c=>!c.id.startsWith("demo-")&&["comparison","example","vocabulary","dialogue","timeline"].includes(c.type));
  if(structured)return structured;
 }
 // In any learning language, use only sentences actually spoken by this teacher.
 // Never fabricate quiz answers or infer a different target language.
 if(!spoken||(!manual&&!teachingCue(topic)))return null;
 const pairs=spoken.split(/\n+/).map(line=>line.match(/^\s*([^:：]{2,80})[:：]\s*(.{3,180})$/)).filter((m):m is RegExpMatchArray=>!!m).slice(0,4).map(m=>({source:m[1].trim(),target:m[2].trim()}));
 if(pairs.length>=2)return {id:"inline-spoken-pairs",type:"example",title:"Examples",body:"",pairs,points:[],questions:[]};
 if(!manual){
  const sentences=(spoken.match(/[^.!?。！？\n]+[.!?。！？]?/gu)||[]).map(s=>s.trim()).filter(s=>s.length>=(compactScript(s)?10:14)).slice(0,4);
  if(sentences.length>=2)return {id:"inline-spoken-steps",type:"steps",title:"Key points",body:"",pairs:[],points:sentences.map((note,i)=>({label:String(i+1),note:note.slice(0,180)})),questions:[]};
  return null;
 }
 // A display-only claim without a real explanation is never copied into a card.
 if(claim&&!usable(previousOutput))return null;
 return {id:"inline-spoken-note",type:"explanation",title:"Lesson notes",body:spoken.replace(/[<>\u0000-\u001f]/g," ").trim().slice(0,640),pairs:[],points:[],questions:[]};
}
