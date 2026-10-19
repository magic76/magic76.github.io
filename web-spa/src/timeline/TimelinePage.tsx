import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import {AGES,stage,olderNotes,notes,deleteNote,clearNotes,type Age} from "./timeline";
import {TimelinePortrait} from "./TimelinePortrait";
import "./timeline.css";

const ageLabel:Record<Age,[string,string]>={7:["童年","Childhood"],10:["小探索家","Little explorer"],13:["尋找自己","Finding myself"],16:["青春","Teenage"],19:["離鄉","Leaving home"],22:["找方向","Finding direction"],25:["探索","Exploration"],35:["平衡","Balance"],40:["轉折","Turning point"],50:["傳承","Mentoring"],55:["新篇章","New chapter"],70:["回望","Reflection"]};
const eras:{label:[string,string];ages:Age[]}[]=[
 {label:["童年","Childhood"],ages:[7,10]},
 {label:["青春","Teens"],ages:[13,16]},
 {label:["青年","Young adult"],ages:[19,22,25]},
 {label:["成年","Adulthood"],ages:[35,40,50]},
 {label:["晚年","Later life"],ages:[55,70]}
];
export function TimelinePage(){
 const {i18n}=useTranslation(),en=i18n.language.startsWith("en");
 const language=useTeacherStore(s=>s.targetLanguage),setLanguage=useTeacherStore(s=>s.setTargetLanguage);
 const[age,setAge]=useState<Age>(25),[refresh,setRefresh]=useState(0);
 const rail=useRef<HTMLElement>(null),touch=useRef<{x:number;y:number}|null>(null);
 const current=stage(age),memory=olderNotes(age),all=notes();
 const index=AGES.indexOf(age);
 const chooseAge=(next:Age)=>setAge(next);
 const changeBy=(offset:number)=>{const next=AGES[index+offset];if(next!==undefined)chooseAge(next)};
 useEffect(()=>{
  const active=rail.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
  active?.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"});
 },[age]);
 const onTouchEnd=(event:React.TouchEvent<HTMLDivElement>)=>{
  const start=touch.current;touch.current=null;
  if(!start)return;
  const dx=event.changedTouches[0].clientX-start.x,dy=event.changedTouches[0].clientY-start.y;
  if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4)changeBy(dx<0?1:-1);
 };
 return <main className="shell timeline-page timeline-immersive" data-refresh={refresh}>
  <header className="timeline-intro"><span className="kicker">CREW TIMELINE</span>
   <h1>{en?"Mira, through the years":"Mira 的人生時光機"}</h1>
   <p>{en?"One person. Twelve chapters. Every age has a story.":"同一個 Mira，十二段人生。滑動時間，走進她的故事。"}</p>
  </header>
  <nav className="timeline-rail" ref={rail} aria-label={en?"Select Mira's age":"選擇 Mira 的年齡"}>
   {AGES.map(a=><button type="button" className={"timeline-stop "+(a===age?"selected":"")} key={a} aria-pressed={a===age} onClick={()=>chooseAge(a)}>
    <TimelinePortrait age={a}/><strong>{a}</strong><small>{en?"years":"歲"}</small>
   </button>)}
  </nav>
  <section className="section timeline-feature panel" id="timeline-current" aria-label={en?"Mira's current chapter":"Mira 目前的人生階段"}>
   <div className="timeline-stage-visual" onTouchStart={event=>{touch.current={x:event.touches[0].clientX,y:event.touches[0].clientY}}} onTouchEnd={onTouchEnd}>
    <TimelinePortrait age={age} className="timeline-feature-photo" alt={"Mira at age "+age}/>
    <span className="timeline-stage-count">{index+1} / {AGES.length}</span>
    <div className="timeline-visual-nav">
     <button type="button" onClick={()=>changeBy(-1)} disabled={index===0} aria-label={en?"Previous age":"前一個年齡"}>‹</button>
     <span>{en?"Swipe to travel through time":"左右滑動，穿越時間"}</span>
     <button type="button" onClick={()=>changeBy(1)} disabled={index===AGES.length-1} aria-label={en?"Next age":"下一個年齡"}>›</button>
    </div>
   </div>
   <div className="timeline-feature-copy" key={age}>
    <span className="kicker">MIRA · {age} {en?"YEARS OLD":"歲"}</span>
    <h2>{ageLabel[age][en?1:0]}</h2>
    <blockquote className="timeline-quote">“{en?current.quoteEn:current.quoteZh}”</blockquote>
    <p className="timeline-chapter-story">{en?current.story:current.storyZh}</p>
    <div className="timeline-now"><strong>{en?"Her world right now":"這個年紀，她在經歷"}</strong>
     <ul>{(en?current.conversationThreads:current.conversationThreadsZh).slice(0,2).map(item=><li key={item}>{item}</li>)}</ul>
    </div>
    <details className="timeline-life-book"><summary>{en?"Explore her life and relationships":"展開她的生活與重要人物"}</summary>
     <p>{en?current.lifeDetails:current.lifeDetailsZh}</p>
     <h3>{en?"People in her life":"她身邊的人"}</h3><ul>{(en?current.people:current.peopleZh).map(item=><li key={item}>{item}</li>)}</ul>
     <h3>{en?"Her current dilemma":"目前煩惱"}</h3><p>{en?current.tension:current.tensionZh}</p>
     <h3>{en?"What to talk about":"可以跟她聊"}</h3><ul>{(en?current.conversationThreads:current.conversationThreadsZh).map(item=><li key={item}>{item}</li>)}</ul>
    </details>
   </div>
   <div className="timeline-cta-dock"><Link className="timeline-primary-cta" to={"/timeline/live?age="+age}>
    {en?"Talk with Mira at "+age:"和 "+age+" 歲的 Mira 聊聊"} <span aria-hidden="true">↗</span>
   </Link></div>
  </section>
  <details className="timeline-overview section panel"><summary>{en?"Jump to another chapter":"快速跳到其他年齡"} <span aria-hidden="true">⌄</span></summary>
   <div className="timeline-era-grid">{eras.map(era=><div className="timeline-era" key={era.label[1]}>
    <h3>{era.label[en?1:0]}</h3><div>{era.ages.map(a=><button type="button" key={a} className={a===age?"selected":""} aria-pressed={a===age} onClick={()=>{chooseAge(a);document.getElementById("timeline-current")?.scrollIntoView({behavior:"smooth",block:"start"})}}>
     <TimelinePortrait age={a}/><span>{a} {en?"years":"歲"}</span></button>)}</div>
   </div>)}</div>
  </details>
  <section className="section timeline-config panel">
   <label>{en?"Conversation language":"對話語言"}
    <select className="field" value={language} onChange={event=>setLanguage(event.target.value)}>{TARGET_LANGUAGES.map(l=><option key={l.value} value={l.value}>{l.value}</option>)}</select>
   </label>
   <small>{en?"Her age doesn't change your language level. Voice uses your Gemini key.":"年齡不影響語言難度，語音沿用既有 Gemini Key。"}</small>
  </section>
  <details className="section timeline-storybook timeline-collapsible panel">
   <summary>{en?"Life scrapbook":"人生相簿"} <small>{en?"Only chapters she has lived":"只顯示當下已經歷的故事"}</small></summary>
   <div className="timeline-stories">{AGES.map(a=><div className={"timeline-story "+(a>age?"locked":"")} key={a}>
    {a<=age?<><TimelinePortrait age={a}/><strong>{a} {en?"years":"歲"} · {ageLabel[a][en?1:0]}</strong><p>{en?stage(a).story:stage(a).storyZh}</p></>
     :<><span aria-hidden="true" className="timeline-story-lock">?</span><strong>{a} {en?"years":"歲"}</strong><p>{en?"A chapter not yet lived":"尚未經歷的章節"}</p></>}
   </div>)}</div>
  </details>
  <details className="section timeline-memory-section panel timeline-collapsible">
   <summary>{en?"Moments you've saved":"你和 Mira 的重要回憶"} <small>{en?"Past → future only":"只能往未來傳遞"}</small></summary>
   {!memory.length?<p className="timeline-empty-memory">{en?"Save a phrase from a conversation. Older Mira can recall it.":"聊天後主動保存一句話，年紀更大的 Mira 才能讀到。"}</p>:
   <ol className="timeline-memory-list">{memory.map(n=><li key={n.age+":"+n.text}>
     <b>{n.age} {en?"years":"歲"}</b><p>{n.text}</p>
     <button type="button" onClick={()=>{deleteNote(n.age,n.text);setRefresh(x=>x+1)}}>{en?"Delete":"刪除"}</button>
   </li>)}</ol>}
   <footer><small>{en?"Transcript isn't saved automatically; memory follows your existing setting.":"不自動保存逐字稿，遵守原本的記憶開關。"} {all.length}/12</small>
    <button type="button" onClick={()=>{if(window.confirm(en?"Clear all saved Mira memories?":"確定清除 Mira 的所有回憶？")){clearNotes();setRefresh(x=>x+1)}}}>{en?"Clear all":"清除全部"}</button>
   </footer>
  </details>
 </main>;
}
