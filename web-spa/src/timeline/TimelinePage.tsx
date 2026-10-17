import {useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import {AGES,stage,olderNotes,notes,deleteNote,clearNotes,type Age} from "./timeline";
import {TimelinePortrait} from "./TimelinePortrait";
import "./timeline.css";
const ageLabel:Record<Age,[string,string]>={7:["童年","Childhood"],16:["青春","Teenage"],25:["探索","Exploration"],40:["轉折","Turning point"],55:["新篇章","New chapter"],70:["回望","Reflection"]};
export function TimelinePage(){
 const {i18n}=useTranslation(),en=i18n.language.startsWith("en");
 const language=useTeacherStore(s=>s.targetLanguage),setLanguage=useTeacherStore(s=>s.setTargetLanguage);
 const[age,setAge]=useState<Age>(25),[refresh,setRefresh]=useState(0);
 const current=stage(age),memory=olderNotes(age),all=notes();
 const show=(a:Age)=>{setAge(a);document.getElementById("timeline-current")?.scrollIntoView({block:"nearest",behavior:"smooth"})};
 return <main className="shell timeline-page" data-refresh={refresh}>
  <header className="hero timeline-hero"><span className="kicker">CREW TIMELINE</span><h1>{en?"One person. Six ages.":"Mira 的人生時光機"}</h1>
   <p>{en?"Choose a moment in Mira's fictional life. What changes as she grows older?":"和同一個人，在六個不同的人生階段對話。切換時間，看見她的成長。"}</p>
  </header>
  <nav className="timeline-rail" aria-label={en?"Mira age selector":"選擇 Mira 的年齡"}>{AGES.map(a=><button type="button" className={"timeline-stop "+(a===age?"selected":"")} key={a} aria-pressed={a===age} onClick={()=>show(a)}>
   <TimelinePortrait age={a} /><strong>{a} {en?"years":"歲"}</strong><small>{ageLabel[a][en?1:0]}</small>
  </button>)}</nav>
  <section className="section timeline-feature panel" id="timeline-current">
   <TimelinePortrait age={age} className="timeline-feature-photo"/>
   <div className="timeline-feature-copy"><span className="kicker">MIRA · {age} {en?"YEARS OLD":"歲"}</span>
    <h2>{ageLabel[age][en?1:0]}</h2><p>{en?current.story:current.storyZh}</p>
    <blockquote className="timeline-quote">“{en?current.quoteEn:current.quoteZh}”</blockquote>
    <Link className="timeline-primary-cta" to={"/timeline/live?age="+age}>{en?"Speak to Mira at "+age:"和 "+age+" 歲的 Mira 說話"} <span aria-hidden="true">↗</span></Link>
   </div>
  </section>
  <section className="section timeline-config panel">
   <label>{en?"Conversation language":"對話語言"}
    <select className="field" value={language} onChange={e=>setLanguage(e.target.value)}>{TARGET_LANGUAGES.map(l=><option key={l.value} value={l.value}>{l.value}</option>)}</select>
   </label>
   <small>{en?"Her age never changes your learning level. Her voice uses the existing Gemini key.":"年齡不等於語言難度；語音沿用既有 Gemini Key，並盡量呈現該階段的說話節奏。"}</small>
  </section>
  <section className="section timeline-storybook">
   <div className="section-head"><h2>{en?"Life scrapbook":"人生相簿"}</h2><small>{en?"What Mira knows at this age":"只顯示當下知道的事"}</small></div>
   <div className="timeline-stories">{AGES.map(a=><div className={"timeline-story "+(a>age?"locked":"")} key={a}>
    {a<=age?<><TimelinePortrait age={a}/><strong>{a} {en?"years":"歲"} · {ageLabel[a][en?1:0]}</strong><p>{en?stage(a).story:stage(a).storyZh}</p></>
     :<><span aria-hidden="true" className="timeline-story-lock">?</span><strong>{a} {en?"years":"歲"}</strong><p>{en?"A chapter not yet lived":"尚未經歷的章節"}</p></>}
   </div>)}</div>
  </section>
  <section className="section timeline-memory-section panel">
   <div className="section-head"><h2>{en?"Moments you've saved":"你和 Mira 的重要回憶"}</h2><small>{en?"Past → future only":"只能往未來傳遞"}</small></div>
   {!memory.length?<p className="timeline-empty-memory">{en?"Talk to Mira and save one of your own sentences. Mira at this age or later can remember it.":"和 Mira 聊天後，將你說的一句話存為回憶；較大年齡的 Mira 才能讀到。"}</p>:
   <ol className="timeline-memory-list">{memory.map(n=><li key={n.age+":"+n.text}>
     <b>{n.age} {en?"years":"歲"}</b><p>{n.text}</p>
     <button type="button" onClick={()=>{deleteNote(n.age,n.text);setRefresh(x=>x+1)}}>{en?"Delete":"刪除"}</button>
   </li>)}</ol>}
   <footer><small>{en?"No automatic transcript storage; memory respects your existing opt-out.":"不自動保存逐字稿，遵守原本的記憶開關。"} {all.length}/12</small>
    <button type="button" onClick={()=>{if(window.confirm(en?"Clear all saved Mira memories?":"確定清除 Mira 的所有回憶？")){clearNotes();setRefresh(x=>x+1)}}}>{en?"Clear all":"清除全部"}</button>
   </footer>
  </section>
 </main>;
}
