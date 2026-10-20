import {useState} from "react";
import {Link,useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import compareData from "../../../contracts/crew-timeline/comparisons-v2.json";
import {AGES,type Age} from "./timeline";
import {TIMELINE_IDS,timelineCharacterId,timelinePerson,type TimelineCharacterId} from "./timelineCharacters";
import {TimelinePortrait} from "./TimelinePortrait";
import "./timeline.css";
import "./timelineExperience.css";

type Localized={zh:string;en:string};
type Question={id:string;question:Localized;mode:"quotation"|"life-book";answers:Record<string,Localized>};
type Comparison={ages:Age[];characters:Record<TimelineCharacterId,{name:string;questions:Question[]}>};
const catalog=compareData as unknown as Comparison;
const DEFAULT_AGES:Age[]=[16,25,70];
const MAX_AGES=4;
const tr=(v:Localized,en:boolean)=>en?v.en:v.zh;
function parseAges(raw:string|null):Age[]{
 if(!raw)return DEFAULT_AGES;
 const nums=new Set(raw.split(",").map(Number));
 const valid=AGES.filter(age=>nums.has(age));
 return valid.length>=2&&valid.length<=MAX_AGES?valid:DEFAULT_AGES;
}

export function TimelineComparePage(){
 const {i18n}=useTranslation(),en=i18n.language.startsWith("en");
 const [params,setParams]=useSearchParams();
 const [message,setMessage]=useState("");
 const personId=timelineCharacterId(params.get("character"));
 const person=timelinePerson(personId);
 const questions=catalog.characters[personId].questions;
 const rawId=params.get("q");
 // Old Mira-only links are still navigable.
 const mappedId=rawId==="success"||rawId==="camera"?"voice":rawId==="fear"?"challenge":rawId;
 const question=questions.find(q=>q.id===mappedId)||questions[0];
 const selected=parseAges(params.get("ages"));
 const update=(changes:{character?:TimelineCharacterId;q?:string;ages?:Age[]})=>{
  const next=new URLSearchParams(params);
  if(changes.character!==undefined)next.set("character",changes.character);
  if(changes.q!==undefined)next.set("q",changes.q);
  if(changes.ages!==undefined)next.set("ages",changes.ages.join(","));
  setMessage("");setParams(next);
 };
 const toggle=(age:Age)=>{
  if(selected.includes(age)){
   if(selected.length>2)update({ages:selected.filter(a=>a!==age)});
  }else if(selected.length>=MAX_AGES){
   setMessage(en?"Compare up to four ages at once.":"一次最多比較四個年齡。");
  }else update({ages:AGES.filter(a=>a===age||selected.includes(a))});
 };
 const shareUrl=()=>{
  const url=new URL(window.location.href);
  url.searchParams.set("character",personId);
  url.searchParams.set("q",question.id);
  url.searchParams.set("ages",selected.join(","));
  return url.toString();
 };
 const copy=async()=>{
  const lines=selected.map(age=>age+(en?" years":" 歲")+" — "+tr(question.answers[String(age)],en));
  try{
   if(!navigator.clipboard?.writeText)throw Error("Clipboard unavailable");
   await navigator.clipboard.writeText([person.name+" · "+tr(question.question,en),...lines,shareUrl()].join("\n"));
   setMessage(en?"Comparison copied.":"對照內容已複製。");
  }catch{setMessage(en?"Unable to copy; share from the address bar.":"目前無法複製，可直接分享網址列連結。");}
 };
 return <main className="shell timeline-compare">
  <header className="timeline-compare-header">
   <Link className="timeline-compare-back" to={"/timeline?character="+personId}>← {en?"Back to Timeline":"返回人生時間軸"}</Link>
   <span className="kicker">CREW TIMELINE · LIFE COMPARE</span>
   <h1>{en?"One life, twelve perspectives":"同一個人，十二種人生視角"}</h1>
   <p>{en?"Compare canonical fictional lines, challenges and life chapters. These are Life Book excerpts, not previous conversations.":"比較三位虛構人物在不同年紀的心聲、難題與經歷。內容來自正式 Life Book，不是過往對話紀錄。"}</p>
  </header>
  <nav className="timeline-compare-people" aria-label={en?"Character":"選擇人物"}>
   {TIMELINE_IDS.map(id=><button key={id} type="button" aria-pressed={id===personId}
    className={id===personId?"selected":""} onClick={()=>update({character:id})}>
    <TimelinePortrait characterId={id} age={25}/>
    <span>{timelinePerson(id).name}</span>
   </button>)}
  </nav>
  <section className="timeline-compare-controls" aria-label={en?"Comparison options":"人生對照選項"}>
   <h2>{en?"Choose a question":"選擇比較主題"}</h2>
   <div className="timeline-compare-questions">
    {questions.map(q=><button key={q.id} type="button" aria-pressed={q.id===question.id}
     className={q.id===question.id?"selected":""} onClick={()=>update({q:q.id})}>
     {tr(q.question,en)}
    </button>)}
   </div>
   <div className="timeline-compare-selection">
    <strong>{en?"Choose 2–4 of all 12 ages":"完整 12 個年齡，任選 2～4 個比較"}</strong>
    <div className="timeline-compare-age-scroll" role="group" aria-label={en?"Choose ages":"選擇年齡"}>
     <div className="timeline-compare-ages">
      {AGES.map(age=><button key={age} type="button" aria-pressed={selected.includes(age)}
       className={selected.includes(age)?"selected":""} onClick={()=>toggle(age)}>
       {age} {en?"years":"歲"}
      </button>)}
     </div>
    </div>
   </div>
  </section>
  <section className="timeline-compare-results" aria-live="polite" aria-label={en?"Age perspectives":"年齡對照結果"}>
   {selected.map(age=><article key={personId+":"+age} className="timeline-compare-answer">
    <div className="timeline-compare-photo">
     <TimelinePortrait age={age} characterId={personId} alt={person.name+" at age "+age}/>
    </div>
    <div className="timeline-compare-content">
     <span className="kicker">{person.name.toUpperCase()} · {age} {en?"YEARS OLD":"歲"}</span>
     {question.mode==="quotation"
       ?<blockquote>“{tr(question.answers[String(age)],en)}”</blockquote>
       :<p>{tr(question.answers[String(age)],en)}</p>}
     <Link to={"/timeline/live?character="+personId+"&age="+age}>
      {en?"Talk to "+person.name+" at "+age:"和 "+age+" 歲的 "+person.name+" 聊聊"} →
     </Link>
    </div>
   </article>)}
  </section>
  <div className="timeline-compare-footer">
   <button type="button" onClick={()=>void copy()}>{en?"Copy comparison":"複製對照內容"} ↗</button>
   <Link to={"/timeline?character="+personId}>{en?"Explore "+person.name+"'s life":"繼續探索 "+person.name+" 的人生"} →</Link>
   {message&&<p role="status">{message}</p>}
  </div>
 </main>;
}
