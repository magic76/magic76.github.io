import type {DirectorEvent} from "./nonsenseDirector";
const L=(zh:boolean,a:string,b:string)=>zh?a:b;
const moods={surprised:"😲",angry:"😤",excited:"🤩",serious:"🧐"};
type Props={zh:boolean;events:DirectorEvent[];sceneChoices:string[];choiceDisabled:boolean;onChoice:(value:string)=>void};
export function NonsenseDirectorCards({zh,events,sceneChoices,choiceDisabled,onChoice}:Props){
 const choiceEvent=[...events].reverse().find(e=>e.kind==="choices");
 const choices=(choiceEvent?.choices.length?choiceEvent.choices:sceneChoices).slice(0,3);
 const cards=events.filter(e=>e.kind!=="choices").slice(-2);
 return <>
  {cards.map((event,i)=><div key={event.kind+"-"+i+"-"+event.title} className={"news-director-card director-"+event.kind+(event.kind==="effect"?" effect-"+event.effect:"")} aria-label={L(zh,"AI 動態插播","AI generated cutaway")}>
   {event.kind==="character"&&<>
    <div className="news-call-title"><span className="news-call-dot"/> {L(zh,"緊急插播 · 視訊連線","INTERRUPTION · VIDEO CALL")}</div>
    <div className="news-video-box">
     <div className="news-video-avatar" aria-hidden="true">{moods[event.mood]}</div>
     <div><span className="news-video-name">{event.character||event.title}</span><small>{event.title}</small></div>
     <span className="news-video-live">LIVE</span>
    </div>
    <blockquote>「{event.body}」</blockquote>
    {event.detail&&<p className="news-director-detail">{event.detail}</p>}
   </>}
   {event.kind==="evidence"&&<>
    <div className="news-evidence-label">▣ {L(zh,"最新外流文件 · 虛構","FICTIONAL LEAKED FILE")}</div>
    <div className="news-evidence-paper">
     <small>CREW NEWS / EXCLUSIVE</small><strong>{event.title}</strong><p>{event.body}</p>
     {event.detail&&<span className="news-evidence-foot">{event.detail}</span>}
     <i aria-hidden="true">{L(zh,"獨家","EXCLUSIVE")}</i>
    </div>
   </>}
   {event.kind==="effect"&&<div className="news-effect-banner" role="status">
    <span className="news-effect-symbol" aria-hidden="true">{event.effect==="confetti"?"✦":event.effect==="static"?"▧":event.effect==="spotlight"?"◉":"⚡"}</span>
    <div><strong>{event.title}</strong><p>{event.body||event.detail}</p></div>
   </div>}
  </div>)}
  {choices.length>0&&<div className="news-interactive-choices">
   <span>{L(zh,"你要怎麼回？直接說話，或點一個荒謬決定","WHAT'S YOUR MOVE? Speak or tap an absurd decision")}</span>
   <div>{choices.map((value,i)=><button key={i+"-"+value} type="button" disabled={choiceDisabled} onClick={()=>onChoice(value)}><span aria-hidden="true">{["A","B","C"][i]}</span>{value}</button>)}</div>
  </div>}
 </>;
}
