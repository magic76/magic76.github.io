import {Arrow} from "../components/Arrow";
import {useEffect,useState} from "react";
import {LESSONS,type LessonId} from "./boardLessons";

type Props={english:boolean;guided:boolean;hasCards:boolean;step:number;steps:number;onNext:()=>void;onEnd:()=>void;onLesson:(id:LessonId)=>void;onTopic:(topic:string)=>void};
export function BoardQuickControls({english,guided,hasCards,step,steps,onNext,onEnd,onLesson,onTopic}:Props){
 const [choosing,setChoosing]=useState(false);
 const [topic,setTopic]=useState("");
 useEffect(()=>{
  const viewport=window.visualViewport;
  if(!viewport)return;
  const sync=()=>{
   const keyboardInset=Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop);
   document.documentElement.style.setProperty("--board-keyboard-inset",keyboardInset+"px");
   document.documentElement.style.setProperty("--board-visible-height",viewport.height+"px");
  };
  sync();viewport.addEventListener("resize",sync);viewport.addEventListener("scroll",sync);
  return ()=>{viewport.removeEventListener("resize",sync);viewport.removeEventListener("scroll",sync);document.documentElement.style.removeProperty("--board-keyboard-inset");document.documentElement.style.removeProperty("--board-visible-height")};
 },[]);
 return <section className="teaching-board-quick" aria-label={english?"Lesson controls":"白板操作"}>
  <div className="teaching-board-quick-row">
   <button type="button" className="is-primary" disabled={!hasCards} onClick={guided&&step<steps-1?onNext:onEnd}>
    {guided&&step<steps-1?<>{english?"Got it · Next step":"學會了 · 下一節"} <Arrow/></>:(english?"Finish this topic":"結束這個話題")}
   </button>
   <button type="button" aria-expanded={choosing} aria-controls="teaching-board-topic-chooser" onClick={()=>setChoosing(v=>!v)}>
    {english?"Change topic":"換個話題"}
   </button>
  </div>
  {choosing&&<div className="teaching-board-topic-chooser" id="teaching-board-topic-chooser">
   <strong>{english?"What would you like to learn next?":"接下來想學什麼？"}</strong>
   <div className="teaching-board-topic-courses">{LESSONS.map(item=><button key={item.id} type="button" onClick={()=>{onLesson(item.id);setChoosing(false)}}>{item.title}</button>)}</div>
   <form onSubmit={e=>{e.preventDefault();if(topic.trim()){onTopic(topic.trim());setTopic("");setChoosing(false)}}}>
    <label htmlFor="teaching-board-new-topic">{english?"Or enter your own topic":"或輸入想學的主題"}</label>
    <div><input id="teaching-board-new-topic" value={topic} onChange={e=>setTopic(e.target.value)} maxLength={120} placeholder={english?"e.g. ordering coffee":"例如：咖啡店點餐"}/><button type="submit" disabled={!topic.trim()}>{english?"Start":"開始"}</button></div>
   </form>
  </div>}
 </section>;
}
