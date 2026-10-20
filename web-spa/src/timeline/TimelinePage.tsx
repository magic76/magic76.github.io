import {useEffect,useLayoutEffect,useRef,useState} from "react";
import {Link,useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import {AGES,type Age} from "./timeline";
import {TIMELINE_IDS,timelineCharacterId,timelinePerson,timelineStage,timelineOlderNotes,timelineNotes,timelineDeleteNote,timelineClearNotes} from "./timelineCharacters";
import {TimelinePortrait} from "./TimelinePortrait";
import {timelineEchoesAtAge,deleteTimelineEcho,clearTimelineEchoes} from "./timelineEcho";
import "./timelineExperience.css";
import "./timeline.css";

const ageLabel:Record<Age,[string,string]>={7:["童年","Childhood"],10:["小探索家","Little explorer"],13:["尋找自己","Finding myself"],16:["青春","Teenage"],19:["離鄉","Leaving home"],22:["找方向","Finding direction"],25:["探索","Exploration"],35:["平衡","Balance"],40:["轉折","Turning point"],50:["傳承","Mentoring"],55:["新篇章","New chapter"],70:["回望","Reflection"]};
const chapterLabels={
 ethan:["童年琴聲","小小樂團","耳機裡的世界","音樂的岔路","第一次離家","錄音室助理","失敗的廠牌","重新出發","平凡的中年","學會放手","社區廣播","最後的安可"],
 hana:["京都小巷","旅行筆記","巷弄部落格","第一張車票","初到大阪","第一次遠飛","東京雨天","家與遠方","選擇留下","把門打開","四季的旅程","未畫完的地圖"]
} as const;
const eras:{label:[string,string];ages:Age[]}[]=[
 {label:["童年","Childhood"],ages:[7,10]},
 {label:["青春","Teens"],ages:[13,16]},
 {label:["青年","Young adult"],ages:[19,22,25]},
 {label:["成年","Adulthood"],ages:[35,40,50]},
 {label:["晚年","Later life"],ages:[55,70]}
];
export function TimelinePage(){
 const {i18n}=useTranslation(),en=i18n.language.startsWith("en");
 const[params,setParams]=useSearchParams();
 const characterId=timelineCharacterId(params.get("character")),person=timelinePerson(characterId);
 const chooseCharacter=(id:typeof characterId)=>{if(id===characterId)return;setAge(25);setParams(id==="mira"?{}:{character:id});};
 const language=useTeacherStore(s=>s.targetLanguage),setLanguage=useTeacherStore(s=>s.setTargetLanguage);
 const[age,setAge]=useState<Age>(25),[refresh,setRefresh]=useState(0);
 const rail=useRef<HTMLElement>(null),carousel=useRef<HTMLDivElement>(null);
 const programmaticTarget=useRef<Age|null>(null);
 const current=timelineStage(age,characterId),memory=timelineOlderNotes(age,characterId),all=timelineNotes(characterId);
 const echoes=timelineEchoesAtAge(age,memory,characterId);
 const index=AGES.indexOf(age);
 const chapterLabel=(a:Age)=>{
  if(characterId==="mira")return ageLabel[a][en?1:0];
  return en?timelineStage(a,characterId).phase:chapterLabels[characterId][AGES.indexOf(a)];
 };
 const scrollToAge=(next:Age,behavior:ScrollBehavior="smooth")=>{
  const container=carousel.current;
  const target=container?.querySelector<HTMLElement>('[data-timeline-age="'+next+'"]');
  if(container&&target){
   container.scrollTo({left:target.offsetLeft+target.clientWidth/2-container.clientWidth/2,behavior});
  }
 };
 const chooseAge=(next:Age)=>{
  programmaticTarget.current=next;
  if(next!==age)setAge(next);
  scrollToAge(next);
 };
 const changeBy=(offset:number)=>{const next=AGES[index+offset];if(next!==undefined)chooseAge(next)};
 // Keep the selected chapter synchronized with native touch/trackpad scrolling.
 // No artificial drag transform: the next photo is visible while the finger moves.
 const onCarouselScroll=()=>{
  const container=carousel.current;
  if(!container)return;
  const center=container.scrollLeft+container.clientWidth/2;
  if(programmaticTarget.current!==null){
   const target=container.querySelector<HTMLElement>('[data-timeline-age="'+programmaticTarget.current+'"]');
   if(target&&Math.abs(target.offsetLeft+target.clientWidth/2-center)<3)programmaticTarget.current=null;
   return;
  }
  let closest=0,best=Infinity;
  Array.from(container.children).forEach((node,i)=>{
   const slide=node as HTMLElement;
   const distance=Math.abs(slide.offsetLeft+slide.clientWidth/2-center);
   if(distance<best){best=distance;closest=i;}
  });
  const next=AGES[closest];
  if(next!==undefined)setAge(previous=>previous===next?previous:next);
 };
 useLayoutEffect(()=>{
  programmaticTarget.current=25;
  const frame=requestAnimationFrame(()=>{
   scrollToAge(25,"instant");
   requestAnimationFrame(()=>scrollToAge(25,"instant"));
  });
  return()=>cancelAnimationFrame(frame);
 },[characterId]);
 useEffect(()=>{
  const active=rail.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
  if(active&&rail.current){
   rail.current.scrollTo({left:active.offsetLeft+active.offsetWidth/2-rail.current.clientWidth/2,behavior:"smooth"});
  }
 },[age]);
 return <main className="shell timeline-page timeline-immersive" data-refresh={refresh}>
  <header className="timeline-intro"><span className="kicker">CREW TIMELINE</span>
   <h1>{en?person.name+", through the years":person.name+" 的人生時光機"}</h1>
   <p>{en?"Three lives, twelve chapters each. Swipe through a life.":"三段不同的人生，每人十二個階段。選擇人物，滑動探索。"}</p>
   {characterId==="mira"&&<Link className="timeline-experience-link" to="/timeline/compare">{en?"Compare her answers across the years":"同一問題，看看不同年紀的答案"} →</Link>}
  </header>
  <nav className="timeline-people" aria-label={en?"Choose a life":"選擇人生角色"}>
   {TIMELINE_IDS.map(id=><button type="button" key={id} className={"timeline-person "+(characterId===id?"selected":"")}
     aria-pressed={characterId===id} onClick={()=>chooseCharacter(id)}>
    <TimelinePortrait characterId={id} age={25}/>
    <span><strong>{timelinePerson(id).name}</strong><small>{id==="mira"?(en?"Photographer":"攝影師"):id==="ethan"?(en?"Music & sound":"音樂與聲音"):(en?"Travel & culture":"旅行與文化")}</small></span>
   </button>)}
  </nav>
  <nav className="timeline-rail" ref={rail} aria-label={en?"Select "+person.name+"'s age":"選擇 "+person.name+" 的年齡"}>
   {AGES.map(a=><button type="button" className={"timeline-stop "+(a===age?"selected":"")} key={a} aria-pressed={a===age} onClick={()=>chooseAge(a)}>
    <TimelinePortrait characterId={characterId} age={a}/><strong>{a}</strong><small>{en?"years":"歲"}</small>
   </button>)}
  </nav>
  <section className="section timeline-feature panel" id="timeline-current" aria-label={en?person.name+"'s current chapter":person.name+" 目前的人生階段"}>
   <div className="timeline-stage-shell">
    <div className="timeline-stage-heading">
     <strong>{en?person.name+"'s chapter":person.name+" 的人生篇章"}</strong>
     <span className="timeline-stage-count" aria-live="off">{index+1} / {AGES.length}</span>
    </div>
   <div className="timeline-stage-visual">
    <div className="timeline-photo-carousel" ref={carousel} onScroll={onCarouselScroll}
      onPointerDown={()=>{programmaticTarget.current=null}}
      role="region" aria-roledescription="carousel" aria-label={en?person.name+"'s life photos":person.name+" 的人生照片"}>
     {AGES.map(a=><div className="timeline-photo-slide" data-timeline-age={a} data-active={a===age} key={a} role="group"
       aria-roledescription="slide" aria-label={a+(en?" years old":" 歲")}>
       <TimelinePortrait characterId={characterId} age={a} className="timeline-feature-photo" alt={person.name+" at age "+a} priority={a===age}/>
      </div>)}
    </div>
   </div>
   <div className="timeline-visual-nav">
     <button type="button" onClick={()=>changeBy(-1)} disabled={index===0} aria-label={en?"Previous age":"前一個年齡"}>‹</button>
     <span>{en?"Swipe to travel through time":"左右滑動，穿越時間"}</span>
     <button type="button" onClick={()=>changeBy(1)} disabled={index===AGES.length-1} aria-label={en?"Next age":"下一個年齡"}>›</button>
    </div>
   </div>
   <div className="timeline-feature-copy" key={characterId+":"+age}>
    <span className="kicker">{person.name.toUpperCase()} · {age} {en?"YEARS OLD":"歲"}</span>
    <h2>{chapterLabel(age)}</h2>
    <blockquote className="timeline-quote">“{en?current.quoteEn:current.quoteZh}”</blockquote>
    <p className="timeline-chapter-story">{en?current.story:current.storyZh}</p>
    <div className="timeline-now"><strong>{en?"Life right now":"這個年紀正在經歷"}</strong>
     <ul>{(en?current.conversationThreads:current.conversationThreadsZh).slice(0,2).map(item=><li key={item}>{item}</li>)}</ul>
    </div>
    {echoes.length>0&&<aside className="timeline-echo-panel" aria-label={en?"Time echoes":"時間回音"}>
     <h3>✦ {en?"An echo from earlier years":"來自過去的時間回音"} · {echoes.length}</h3>
     <ul>{echoes.slice(0,2).map(n=><li key={n.age+":"+n.text}>
      <button type="button" onClick={()=>chooseAge(n.age)}>{en?"Back to "+person.name+" at "+n.age:"回到 "+n.age+" 歲的 "+person.name} ↗</button>
      <blockquote>“{n.text}”</blockquote>
      <small>{en?"You chose to save this at age "+n.age:"你在 "+person.name+" "+n.age+" 歲時主動保存的話"}</small>
     </li>)}</ul>
    </aside>}
    <details className="timeline-life-book"><summary>{en?"Explore life and relationships":"展開生活與重要人物"}</summary>
     <p>{en?current.lifeDetails:current.lifeDetailsZh}</p>
     <h3>{en?"Important people":"身邊的重要人物"}</h3><ul>{(en?current.people:current.peopleZh).map(item=><li key={item}>{item}</li>)}</ul>
     <h3>{en?"Current dilemma":"目前煩惱"}</h3><p>{en?current.tension:current.tensionZh}</p>
     <h3>{en?"What to talk about":"可以聊的話題"}</h3><ul>{(en?current.conversationThreads:current.conversationThreadsZh).map(item=><li key={item}>{item}</li>)}</ul>
    </details>
   </div>
   <div className="timeline-cta-dock"><Link className="timeline-primary-cta" to={"/timeline/live?character="+characterId+"&age="+age}>
    {en?"Talk with "+person.name+" at "+age:"和 "+age+" 歲的 "+person.name+" 聊聊"} <span aria-hidden="true">↗</span>
   </Link></div>
  </section>
  <details className="timeline-overview section panel"><summary>{en?"Jump to another chapter":"快速跳到其他年齡"} <span aria-hidden="true">⌄</span></summary>
   <div className="timeline-era-grid">{eras.map(era=><div className="timeline-era" key={era.label[1]}>
    <h3>{era.label[en?1:0]}</h3><div>{era.ages.map(a=><button type="button" key={a} className={a===age?"selected":""} aria-pressed={a===age} onClick={()=>{chooseAge(a);document.getElementById("timeline-current")?.scrollIntoView({behavior:"smooth",block:"start"})}}>
     <TimelinePortrait characterId={characterId} age={a}/><span>{a} {en?"years":"歲"}</span></button>)}</div>
   </div>)}</div>
  </details>
  <section className="section timeline-config panel">
   <label>{en?"Conversation language":"對話語言"}
    <select className="field" value={language} onChange={event=>setLanguage(event.target.value)}>{TARGET_LANGUAGES.map(l=><option key={l.value} value={l.value}>{l.value}</option>)}</select>
   </label>
   <small>{en?"Age doesn't change your language level. Voice uses your Gemini key.":"年齡不影響語言難度，語音沿用既有 Gemini Key。"}</small>
  </section>
  <details className="section timeline-storybook timeline-collapsible panel">
   <summary>{en?"Life scrapbook":"人生相簿"} <small>{en?"Only past and present chapters":"只顯示當下已經歷的故事"}</small></summary>
   <div className="timeline-stories">{AGES.map(a=><div className={"timeline-story "+(a>age?"locked":"")} key={a}>
    {a<=age?<><TimelinePortrait characterId={characterId} age={a}/><strong>{a} {en?"years":"歲"} · {chapterLabel(a)}</strong><p>{en?timelineStage(a,characterId).story:timelineStage(a,characterId).storyZh}</p></>
     :<><span aria-hidden="true" className="timeline-story-lock">?</span><strong>{a} {en?"years":"歲"}</strong><p>{en?"A chapter not yet lived":"尚未經歷的章節"}</p></>}
   </div>)}</div>
  </details>
  <details className="section timeline-memory-section panel timeline-collapsible">
   <summary>{en?"Moments you've saved":"你和 "+person.name+" 的重要回憶"} <small>{en?"Past → future only":"只能往未來傳遞"}</small></summary>
   {!memory.length?<p className="timeline-empty-memory">{en?"Save a phrase from a conversation. Older "+person.name+" can recall it.":"聊天後主動保存一句話，年紀更大的 "+person.name+" 才能讀到。"}</p>:
   <ol className="timeline-memory-list">{memory.map(n=><li key={n.age+":"+n.text}>
     <b>{n.age} {en?"years":"歲"}</b><p>{n.text}</p>
     <button type="button" onClick={()=>{timelineDeleteNote(n.age,n.text,characterId);deleteTimelineEcho(n.age,n.text,characterId);setRefresh(x=>x+1)}}>{en?"Delete":"刪除"}</button>
   </li>)}</ol>}
   <footer><small>{en?"Transcript isn't saved automatically; memory follows your existing setting.":"不自動保存逐字稿，遵守原本的記憶開關。"} {all.length}/12</small>
    <button type="button" onClick={()=>{if(window.confirm(en?"Clear all saved "+person.name+" memories?":"確定清除 "+person.name+" 的所有回憶？")){timelineClearNotes(characterId);clearTimelineEchoes(characterId);setRefresh(x=>x+1)}}}>{en?"Clear all":"清除全部"}</button>
   </footer>
  </details>
 </main>;
}

