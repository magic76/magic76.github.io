import {fallbackBoard,type BoardCard} from "./boardProtocol";
import {findLesson} from "./boardLessons";
import {edTopic,teachingCue} from "./inlineBoardGate";

// Native audio ASR may spell the learner's "ed" incorrectly, but the teacher's
// actual explanation can identify the topic even when the tool is missing.
export function explainsEdEnding(output:string){
 const text=output.normalize("NFKC").replace(/[“”‘’"'「」『』]/g,"").replace(/\s+/g," ");
 const suffix=edTopic(text)||/(?:-?ed\s*(?:ending|suffix)|(?:字尾|結尾)\s*-?ed)/i.test(text);
 const categories=/(?:three (?:different )?(?:sounds|pronunciations)|三種(?:不同的)?(?:發音|讀音)|voiceless|unvoiced|voiced|清音|濁音|無聲音|有聲音)/i.test(text);
 return suffix&&categories;
}
const usable=(output:string)=>output.trim().length>=60&&!/(?:whiteboard|screen|白板|螢幕).{0,45}(?:update|display|appear|show|更新|顯示|出現)|(?:check|look at).{0,25}(?:screen|whiteboard)|(?:請看|查看).{0,15}(?:螢幕|白板)/i.test(output);
export function backupCard(topic:string,output:string,manual=false,previousOutput=""):BoardCard|null{
 // The current spoken teaching content outranks ambiguous ASR and older topics.
 if(edTopic(topic)||explainsEdEnding(output)||(!usable(output)&&manual&&explainsEdEnding(previousOutput))){
  return findLesson("ed-sounds")?.cards.find(c=>c.type==="comparison")||null;
 }
 const spoken=usable(output)?output:manual&&usable(previousOutput)?previousOutput:"";
 if(manual||teachingCue(topic)||edTopic(topic)){
  const patch=fallbackBoard({input:topic,output:spoken},[]);
  const structured=patch?.cards.find(c=>!c.id.startsWith("demo-")&&["comparison","example","vocabulary"].includes(c.type));
  if(structured)return structured;
 }
 // Explicit requests may show the actual spoken explanation as a note; never
 // manufacture an interactive quiz or open a generic note during normal chat.
 if(!manual||!spoken)return null;
 return {id:"inline-spoken-note",type:"explanation",title:"Lesson notes",body:spoken.replace(/[<>\u0000-\u001f]/g," ").trim().slice(0,640),pairs:[],points:[],questions:[]};
}
