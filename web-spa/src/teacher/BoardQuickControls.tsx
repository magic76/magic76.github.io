import {Arrow} from "../components/Arrow";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {LESSONS,LESSON_CATEGORIES,lessonCategory,lessonLabel,findLesson,type LessonId} from "./boardLessons";

type Props={english:boolean;active:boolean;guided:boolean;hasCards:boolean;step:number;steps:number;onNext:()=>void;onEnd:()=>void;onLesson:(id:LessonId)=>void;onTopic:(topic:string)=>void;voiceControls:ReactNode};
export function BoardQuickControls({english,active,guided,hasCards,step,steps,onNext,onEnd,onLesson,onTopic,voiceControls}:Props){
 const {i18n}=useTranslation("teacher");
 const zh=(i18n.resolvedLanguage||"").startsWith("zh");
 const dockRef=useRef<HTMLElement>(null);
 useEffect(()=>{const dock=dockRef.current;if(!dock)return;const sync=()=>document.documentElement.style.setProperty("--board-dock-height",Math.ceil(dock.getBoundingClientRect().height)+"px");sync();const observer=typeof ResizeObserver==="undefined"?null:new ResizeObserver(sync);observer?.observe(dock);window.addEventListener("resize",sync);return ()=>{observer?.disconnect();window.removeEventListener("resize",sync);document.documentElement.style.removeProperty("--board-dock-height")};},[]);
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
 return <section ref={dockRef} className={"teaching-board-quick"+(!active?" is-idle":"")} aria-label={english?"Lesson and call controls":"教學與通話操作"}>
  <div className="teaching-board-voice">{voiceControls}</div>
  {active&&<div className="teaching-board-quick-row">
   {hasCards&&<button type="button" className="is-primary" onClick={guided&&step<steps-1?onNext:onEnd}>
    {guided&&step<steps-1?<>{english?"Got it · Next step":"學會了 · 下一節"} <Arrow/></>:(english?"Finish this topic":"結束這個話題")}
   </button>}
   <button type="button" aria-expanded={choosing} aria-controls="teaching-board-topic-chooser" onClick={()=>setChoosing(v=>!v)}>
    {english?"Change topic":"換個話題"}
   </button>
  </div>}
  {active&&choosing&&<div className="teaching-board-topic-chooser" id="teaching-board-topic-chooser">
   <strong>{english?"What would you like to learn next?":"接下來想學什麼？"}</strong>
   <label className="teaching-board-catalog-filter"><span>{zh?"選擇英文教材":"Choose an English lesson"}</span><select value="" onChange={e=>{const item=findLesson(e.target.value);if(item){onLesson(item.id);setChoosing(false)}}}><option value="" disabled>{zh?"選擇課程…":"Select a lesson…"}</option>{LESSON_CATEGORIES.map(c=><optgroup key={c.id} label={zh?c.zh:c.en}>{LESSONS.filter(item=>lessonCategory(item)===c.id).map(item=><option key={item.id} value={item.id}>{lessonLabel(item,zh)}{item.level?" · "+item.level:""}</option>)}</optgroup>)}</select></label>
   <form onSubmit={e=>{e.preventDefault();if(topic.trim()){onTopic(topic.trim());setTopic("");setChoosing(false)}}}>
    <label htmlFor="teaching-board-new-topic">{english?"Or enter your own topic":"或輸入想學的主題"}</label>
    <div><input id="teaching-board-new-topic" value={topic} onChange={e=>setTopic(e.target.value)} maxLength={120} placeholder={english?"e.g. ordering coffee":"例如：咖啡店點餐"}/><button type="submit" disabled={!topic.trim()}>{english?"Start":"開始"}</button></div>
   </form>
  </div>}
 </section>;
}
