import {useEffect,useLayoutEffect,useRef,useState} from "react";
import {Link,useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import {AGES,type Age} from "./timeline";
import {TIMELINE_IDS,timelineCharacterId,timelinePerson,timelineStage,timelineOlderNotes,timelineNotes,timelineDeleteNote,timelineClearNotes} from "./timelineCharacters";
import {TimelinePortrait} from "./TimelinePortrait";
import {nearestCenterIndex} from "./timelineAgeInteraction.mjs";
import {trackUsageEvent} from "../analytics/usage";
import {timelineEchoesAtAge,deleteTimelineEcho,clearTimelineEchoes} from "./timelineEcho";
import "./timelineExperience.css";
import "./timeline.css";

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
 const {t,i18n}=useTranslation("home"),en=!i18n.language.startsWith("zh");
 const[params,setParams]=useSearchParams();
 const characterId=timelineCharacterId(params.get("character")),person=timelinePerson(characterId);
 useEffect(()=>{trackUsageEvent("timeline_view",characterId)},[characterId]);
 const chooseCharacter=(id:typeof characterId)=>{if(id===characterId)return;programmaticTarget.current=25;railTarget.current=null;railScrubbing.current=false;setAge(25);setParams(id==="mira"?{}:{character:id});};
 const language=useTeacherStore(s=>s.targetLanguage),setLanguage=useTeacherStore(s=>s.setTargetLanguage);
 const[age,setAge]=useState<Age>(25),[refresh,setRefresh]=useState(0);
 const rail=useRef<HTMLElement>(null),carousel=useRef<HTMLDivElement>(null);
 const programmaticTarget=useRef<Age|null>(null),railTarget=useRef<Age|null>(null);
 const railScrubbing=useRef(false),railSettles=useRef<number|undefined>(undefined);
 const current=timelineStage(age,characterId),memory=timelineOlderNotes(age,characterId),all=timelineNotes(characterId);
 const echoes=timelineEchoesAtAge(age,memory,characterId);
 const index=AGES.indexOf(age);
 const chapterLabel=(a:Age)=>{
  if(characterId==="mira")return t("timeline.age"+a);
  return en?timelineStage(a,characterId).phase:chapterLabels[characterId][AGES.indexOf(a)];
 };
 const motion=():ScrollBehavior=>window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth";
 const scrollToAge=(next:Age,behavior:ScrollBehavior=motion())=>{
  const container=carousel.current;
  const target=container?.querySelector<HTMLElement>('[data-timeline-age="'+next+'"]');
  if(container&&target)container.scrollTo({left:target.offsetLeft+target.clientWidth/2-container.clientWidth/2,behavior});
 };
 const chooseAge=(next:Age)=>{
  // Rail tap, chapter jump and carousel arrows share one selection path.
  railScrubbing.current=false;
  programmaticTarget.current=next;
  if(next!==age)setAge(next);
  scrollToAge(next);
 };
 const changeBy=(offset:number)=>{const next=AGES[index+offset];if(next!==undefined)chooseAge(next)};
 const onCarouselScroll=()=>{
  const container=carousel.current;
  if(!container)return;
  const center=container.scrollLeft+container.clientWidth/2;
  if(programmaticTarget.current!==null){
   const target=container.querySelector<HTMLElement>('[data-timeline-age="'+programmaticTarget.current+'"]');
   if(target&&Math.abs(target.offsetLeft+target.clientWidth/2-center)<3)programmaticTarget.current=null;
   return;
  }
  const closest=nearestCenterIndex(Array.from(container.children,slide=>{
   const element=slide as HTMLElement;return element.offsetLeft+element.clientWidth/2;
  }),center);
  const next=AGES[closest];
  if(next!==undefined)setAge(previous=>previous===next?previous:next);
 };
 const onRailScroll=()=>{
  const container=rail.current;
  if(!container)return;
  const center=container.scrollLeft+container.clientWidth/2;
  if(railTarget.current!==null){
   const target=container.querySelector<HTMLElement>('[data-timeline-stop="'+railTarget.current+'"]');
   if(target&&Math.abs(target.offsetLeft+target.clientWidth/2-center)<3)railTarget.current=null;
   return;
  }
  // Native touch/trackpad motion scrubs the age immediately; do not recenter
  // the rail while the user is still moving it.
  railScrubbing.current=true;
  const closest=nearestCenterIndex(Array.from(container.children,stop=>{
   const element=stop as HTMLElement;return element.offsetLeft+element.clientWidth/2;
  }),center);
  const next=AGES[closest];
  if(next!==undefined&&next!==age){
   programmaticTarget.current=next;
   setAge(next);
   scrollToAge(next,"instant");
  }
  if(railSettles.current!==undefined)window.clearTimeout(railSettles.current);
  railSettles.current=window.setTimeout(()=>{railScrubbing.current=false;railSettles.current=undefined},180);
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
  const container=rail.current;
  const active=container?.querySelector<HTMLElement>('[data-timeline-stop="'+age+'"]');
  if(!container||!active||railScrubbing.current)return;
  const distance=active.offsetLeft+active.offsetWidth/2-container.clientWidth/2;
  if(Math.abs(container.scrollLeft-distance)<3)return;
  railTarget.current=age;
  container.scrollTo({left:distance,behavior:motion()});
 },[age,characterId]);
 useEffect(()=>()=>{if(railSettles.current!==undefined)window.clearTimeout(railSettles.current)},[]);
 return <div className="shell timeline-page timeline-immersive" data-refresh={refresh}>
  <header className="timeline-intro"><span className="kicker">CREW TIMELINE</span>
   <h1>{t("timeline.title",{name:person.name})}</h1>
   <p>{t("timeline.intro")}</p>
  </header>
  <nav className="timeline-people" aria-label={t("timeline.chooseLife")}>
   {TIMELINE_IDS.map(id=><button type="button" key={id} className={"timeline-person "+(characterId===id?"selected":"")}
     aria-pressed={characterId===id} onClick={()=>chooseCharacter(id)}>
    <TimelinePortrait characterId={id} age={25}/>
    <span><strong>{timelinePerson(id).name}</strong><small>{t(id==="mira"?"timeline.photographer":id==="ethan"?"timeline.music":"timeline.travel")}</small></span>
   </button>)}
  </nav>
  <nav className="timeline-rail" ref={rail} onScroll={onRailScroll}
   onPointerDown={()=>{railTarget.current=null;railScrubbing.current=true}}
   onWheel={()=>{railTarget.current=null}} aria-label={t("timeline.selectAge",{name:person.name})}>
   {AGES.map(a=><button type="button" className={"timeline-stop "+(a===age?"selected":"")} data-timeline-stop={a} key={a} aria-pressed={a===age} onClick={()=>chooseAge(a)}>
    <TimelinePortrait characterId={characterId} age={a}/><strong>{a}</strong><small>{t("timeline.years")}</small>
   </button>)}
  </nav>
  <section className="section timeline-feature panel" id="timeline-current" aria-label={en?person.name+"'s current chapter":person.name+" 目前的人生階段"}>
   <div className="timeline-stage-shell">
    <div className="timeline-stage-heading">
     <strong>{t("timeline.chapter",{name:person.name})}</strong>
     <span className="timeline-stage-count" aria-live="polite">{age} {t("timeline.years")} · {index+1}/{AGES.length}</span>
    </div>
    <div className="timeline-cta-dock"><Link className="timeline-primary-cta" to={"/timeline/live?character="+characterId+"&age="+age}>
     {t("timeline.talk",{name:person.name,age})} <span aria-hidden="true">↗</span>
    </Link><Link className="timeline-compare-cta" to={"/timeline/compare?character="+characterId}>
     {t("timeline.compareAction",{name:person.name})} <span aria-hidden="true">↗</span>
    </Link></div>
   <div className="timeline-stage-visual">
    <div className="timeline-photo-carousel" ref={carousel} onScroll={onCarouselScroll} tabIndex={0}
      onPointerDown={()=>{programmaticTarget.current=null}}
      onWheel={()=>{programmaticTarget.current=null}}
      onKeyDown={event=>{if(event.key==="ArrowLeft"||event.key==="ArrowRight"){
       event.preventDefault();changeBy(event.key==="ArrowLeft"?-1:1);
      }}}
      role="region" aria-roledescription="carousel" aria-label={t("timeline.photos",{name:person.name})}>
     {AGES.map(a=><div className="timeline-photo-slide" data-timeline-age={a} data-active={a===age} key={a} role="group"
       aria-roledescription="slide" aria-label={a+(en?" years old":" 歲")}>
       <TimelinePortrait characterId={characterId} age={a} className="timeline-feature-photo" alt={t("timeline.photoAlt",{name:person.name,age:a})} priority={a===age}/>
      </div>)}
    </div>
   </div>
   <div className="timeline-visual-nav">
     <button type="button" onClick={()=>changeBy(-1)} disabled={index===0} aria-label={t("timeline.previous")}>‹</button>
     <span>{t("timeline.swipe")}</span>
     <button type="button" onClick={()=>changeBy(1)} disabled={index===AGES.length-1} aria-label={t("timeline.next")}>›</button>
    </div>
   </div>
   <div className="timeline-feature-copy" key={characterId+":"+age}>
    <span className="kicker">{person.name.toUpperCase()} · {age} {en?"YEARS OLD":"歲"}</span>
    <h2>{chapterLabel(age)}</h2>
    <blockquote className="timeline-quote">“{en?current.quoteEn:current.quoteZh}”</blockquote>
    <p className="timeline-chapter-story">{en?current.story:current.storyZh}</p>
    <div className="timeline-now"><strong>{t("timeline.now")}</strong>
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
     <h3>{t("timeline.people")}</h3><ul>{(en?current.people:current.peopleZh).map(item=><li key={item}>{item}</li>)}</ul>
     <h3>{en?"Current dilemma":"目前煩惱"}</h3><p>{en?current.tension:current.tensionZh}</p>
     <h3>{t("timeline.topics")}</h3><ul>{(en?current.conversationThreads:current.conversationThreadsZh).map(item=><li key={item}>{item}</li>)}</ul>
    </details>
   </div>

  </section>
  <details className="timeline-overview section panel"><summary>{t("timeline.jump")} <span aria-hidden="true">⌄</span></summary>
   <div className="timeline-era-grid">{eras.map(era=><div className="timeline-era" key={era.label[1]}>
    <h3>{t("timeline.era"+({Childhood:"Child",Teens:"Teens","Young adult":"Young",Adulthood:"Adult","Later life":"Later"} as Record<string,string>)[era.label[1]])}</h3><div>{era.ages.map(a=><button type="button" key={a} className={a===age?"selected":""} aria-pressed={a===age} onClick={()=>{chooseAge(a);document.getElementById("timeline-current")?.scrollIntoView({behavior:motion(),block:"start"})}}>
     <TimelinePortrait characterId={characterId} age={a}/><span>{a} {en?"years":"歲"}</span></button>)}</div>
   </div>)}</div>
  </details>
  <section className="section timeline-config panel">
   <label>{t("timeline.conversation")}
    <select className="field" value={language} onChange={event=>setLanguage(event.target.value)}>{TARGET_LANGUAGES.map(l=><option key={l.value} value={l.value}>{l.value}</option>)}</select>
   </label>
   <small>{t("timeline.level")}</small>
  </section>
  <details className="section timeline-storybook timeline-collapsible panel">
   <summary>{t("timeline.scrapbook")} <small>{en?"Only past and present chapters":"只顯示當下已經歷的故事"}</small></summary>
   <div className="timeline-stories">{AGES.map(a=><div className={"timeline-story "+(a>age?"locked":"")} key={a}>
    {a<=age?<><TimelinePortrait characterId={characterId} age={a}/><strong>{a} {en?"years":"歲"} · {chapterLabel(a)}</strong><p>{en?timelineStage(a,characterId).story:timelineStage(a,characterId).storyZh}</p></>
     :<><span aria-hidden="true" className="timeline-story-lock">?</span><strong>{a} {en?"years":"歲"}</strong><p>{t("timeline.locked")}</p></>}
   </div>)}</div>
  </details>
  <details className="section timeline-memory-section panel timeline-collapsible">
   <summary>{t("timeline.memories",{name:person.name})} <small>{en?"Past → future only":"只能往未來傳遞"}</small></summary>
   {!memory.length?<p className="timeline-empty-memory">{en?"Save a phrase from a conversation. Older "+person.name+" can recall it.":"聊天後主動保存一句話，年紀更大的 "+person.name+" 才能讀到。"}</p>:
   <ol className="timeline-memory-list">{memory.map(n=><li key={n.age+":"+n.text}>
     <b>{n.age} {en?"years":"歲"}</b><p>{n.text}</p>
     <button type="button" onClick={()=>{timelineDeleteNote(n.age,n.text,characterId);deleteTimelineEcho(n.age,n.text,characterId);setRefresh(x=>x+1)}}>{t("timeline.delete")}</button>
   </li>)}</ol>}
   <footer><small>{en?"Transcript isn't saved automatically; memory follows your existing setting.":"不自動保存逐字稿，遵守原本的記憶開關。"} {all.length}/12</small>
    <button type="button" onClick={()=>{if(window.confirm(en?"Clear all saved "+person.name+" memories?":"確定清除 "+person.name+" 的所有回憶？")){timelineClearNotes(characterId);clearTimelineEchoes(characterId);setRefresh(x=>x+1)}}}>{t("timeline.clearAll")}</button>
   </footer>
  </details>
 </div>;
}

