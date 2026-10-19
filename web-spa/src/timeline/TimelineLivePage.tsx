import {useEffect,useMemo,useRef,useState} from "react";
import {Link,useNavigate,useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {useLiveSession} from "../live/useLiveSession";
import {LiveControls} from "../live/LiveControls";
import {DesktopLivePanel} from "../components/DesktopLivePanel";
import {normalizeLiveVoice} from "../live/voiceIdentity";
import {MIRA_LIVE_VOICE,buildTimelineAgeVoicePrompt,timelineVoiceMode} from "./timelineVoice";
import {validAge,stage,buildSystem,saveNote,olderNotes,nextOpening} from "./timeline";
import {TimelinePortrait} from "./TimelinePortrait";
import {recordTimelineEcho} from "./timelineEcho";
import "./timeline.css";
export function TimelineLivePage(){
 const[params]=useSearchParams();const number=Number(params.get("age")),age=validAge(number)?number:25;
 const {i18n}=useTranslation(),en=i18n.language.startsWith("en");
 const navigate=useNavigate(),closing=useRef(false);
 const language=useTeacherStore(s=>s.targetLanguage),nativeLanguage=useTeacherStore(s=>s.nativeLanguage);
 const[saved,setSaved]=useState<number[]>([]),[notice,setNotice]=useState("");
 const known=useMemo(()=>olderNotes(age),[age]);
 const voiceMode=timelineVoiceMode(params.get("voiceStyle"));
 const system=useMemo(()=>buildSystem(age,language)+buildTimelineAgeVoicePrompt(age,voiceMode),[age,language,voiceMode]);
 const [opening]=useState(()=>nextOpening(age));
 const live=useLiveSession({
  pageKey:"timeline-mira-"+age,title:"Crew Timeline · Mira · "+age,
  system,language,nativeLanguage,voice:normalizeLiveVoice(MIRA_LIVE_VOICE),
  openingPrompt:opening,
  persistHistory:false,teacherReport:false,trackSpeakingLevel:false,sessionKind:"timeline",
  onSessionFinished:()=>{/* Timeline never updates teacher or friend memories. */}
 });
 const end=async()=>{if(closing.current)return;closing.current=true;try{await live.stop(true)}finally{navigate("/timeline")}};
 useEffect(()=>{const t=window.setTimeout(()=>{void live.start()},0);return()=>window.clearTimeout(t)},[live.start]);
 useEffect(()=>{document.body.className="teacher-theme session-page timeline-session-page";return()=>{document.body.className=""}},[]);
 const keep=(i:number,text:string)=>{
  if(saved.includes(i))return;
  if(saveNote(age,text)){recordTimelineEcho(age,text);setSaved(a=>[...a,i]);setNotice(en?"Saved; reopen this or a later age to recall.":"回憶已保存；重新進入此年齡或較大的年齡會讀取。");}
  else setNotice(en?"Memory disabled or utterance too short.":"記憶已關閉或內容太短。");
 };
 const active=["connecting","listening","speaking","requesting-mic","ending","reporting"].includes(live.state);
 return <><header className="app-header"><div className="shell inner">
   <div className="app-brand"><Link className="back-btn" to="/timeline" onClick={e=>{e.preventDefault();void end()}}>‹</Link>
    <div className="app-title"><strong>Mira · {age} {en?"years":"歲"}</strong><small>Crew Timeline · {language}</small></div>
   </div><span className="status connected"><i className="status-dot"/><span>{active?(en?"In conversation":"對話中"):(en?"Ready":"準備開始")}</span></span>
  </div></header>
  <main className="session-shell timeline-live"><div className="desktop-live-workspace">
   <section className="live-stage" aria-label={"Mira age "+age}>
    <div className="live-identity"><TimelinePortrait age={age} alt={"Mira at "+age+" years old"} />
     <h1>Mira · {age}</h1><p>{en?stage(age).story:stage(age).storyZh}</p><p className="timeline-life-quote">“{en?stage(age).quoteEn:stage(age).quoteZh}”</p><p>{en?"A fictional life, not a future prediction.":"虛構角色人生，不是真實的未來預測。"}</p>
    </div>
    {known.length>0&&<details className="timeline-known"><summary>{en?"Mira can remember":"Mira 此時能記得"} · {known.length}</summary>
      <ul>{known.map((note,i)=><li key={i}><strong>{note.age} {en?"years":"歲"}</strong> · {note.text}</li>)}</ul>
    </details>}
    <LiveControls live={live} onEnd={end} prominentInterrupt interruptLabel={en?"My turn":"換我說"}/>
    <div className="live-presets">{active&&stage(age).conversationThreads.slice(0,3).map((topic,i)=><button key={i} type="button" onClick={()=>live.sendText("[TIMELINE TOPIC — silent scene nudge] As Mira age "+age+", respond in character to this age-valid moment: "+topic+". Do not pretend the learner asked this, do not spoil the future.")}>{en?topic:stage(age).conversationThreadsZh[i]}</button>)}</div>
    <div className="live-transcript" aria-live="polite">
     <div className={"live-line user "+(live.input?"show":"")}><small>{en?"You":"你"}</small><span>{live.input}</span></div>
     <div className={"live-line "+(live.output?"show":"")}><small>Mira</small><span>{live.output}</span></div>
    </div>
    {live.turns.length>0&&<section className="timeline-turns"><h2>{en?"This conversation":"本次對話"}</h2>
     {live.turns.map((turn,i)=><div className="timeline-turn" key={i}>
      {turn.input&&<div><p><b>{en?"You":"你"}：</b>{turn.input}</p>
       <button type="button" disabled={saved.includes(i)} onClick={()=>keep(i,turn.input||"")}>{saved.includes(i)?(en?"Saved":"已保存"):(en?"Save this memory":"存為人生回憶")}</button>
      </div>}{turn.output&&<p><b>Mira：</b>{turn.output}</p>}
     </div>)}</section>}
    {notice&&<p role="status">{notice}</p>}
    <p className="timeline-caption">{en?"Only user-selected phrases become Timeline memories.":"只有主動保存的話語才會成為人生回憶。"}</p>
   </section>
   <DesktopLivePanel kind="friend" label={"Mira · "+age} language={language} turns={live.turns} input={live.input} output={live.output} state={live.state}/>
  </div></main></>;
}
