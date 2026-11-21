import {Arrow} from "../components/Arrow";
import {useEffect,useMemo,useRef,useState} from "react";
import {Link,useNavigate,useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {useLiveSession} from "../live/useLiveSession";
import {LiveControls} from "../live/LiveControls";
import {GuestLiveStarter} from "../live/GuestLiveStarter";
import {GuestTrialCountdown,GuestTrialFinish} from "../live/GuestTrialExperience";
import {geminiKey} from "../lib/runtime";
import {DesktopLivePanel} from "../components/DesktopLivePanel";
import {normalizeLiveVoice} from "../live/voiceIdentity";
import {MIRA_LIVE_VOICE,buildTimelineAgeVoicePrompt,timelineVoiceMode} from "./timelineVoice";
import {validAge} from "./timeline";
import {timelineCharacterId,timelinePerson,timelineStage,timelineBuildSystem,timelineSaveNote,timelineOlderNotes,timelineNextOpening} from "./timelineCharacters";
import {TimelinePortrait} from "./TimelinePortrait";
import {recordTimelineEcho} from "./timelineEcho";
import {trackUsageEvent,sessionDurationDetail} from "../analytics/usage";
import "./timeline.css";
export function TimelineLivePage(){
 const[params]=useSearchParams();const number=Number(params.get("age")),age=validAge(number)?number:25;
  const characterId=timelineCharacterId(params.get("character")),person=timelinePerson(characterId),current=timelineStage(age,characterId);
  const back="/timeline?character="+characterId;
 const {t,i18n}=useTranslation("home"),en=!i18n.language.startsWith("zh");
 const navigate=useNavigate(),closing=useRef(false);
 const usageStarted=useRef(false),usageCompleted=useRef(false);
 const language=useTeacherStore(s=>s.targetLanguage),nativeLanguage=useTeacherStore(s=>s.nativeLanguage);
 const[saved,setSaved]=useState<number[]>([]),[notice,setNotice]=useState("");
 const[guestStarted,setGuestStarted]=useState(false);
 const known=useMemo(()=>timelineOlderNotes(age,characterId),[age,characterId]);
 const voiceMode=timelineVoiceMode(params.get("voiceStyle"));
 const system=useMemo(()=>timelineBuildSystem(age,language,characterId)+buildTimelineAgeVoicePrompt(age,voiceMode,characterId),[age,language,voiceMode,characterId]);
 const opening=useMemo(()=>timelineNextOpening(age,characterId),[age,characterId]);
 const live=useLiveSession({
  pageKey:"timeline-"+characterId+"-"+age,title:"Crew Timeline · "+person.name+" · "+age,
  system,language,nativeLanguage,voice:normalizeLiveVoice(characterId==="ethan"?"Orus":characterId==="hana"?"Leda":MIRA_LIVE_VOICE),
  openingPrompt:opening,
  persistHistory:false,teacherReport:false,trackSpeakingLevel:false,sessionKind:"timeline",
  onTurnComplete:(_turn,completedTurns)=>{
   if(!usageCompleted.current&&completedTurns.some(t=>Boolean(t.input?.trim()&&t.output?.trim()))){
    usageCompleted.current=true;trackUsageEvent("timeline_conversation");
   }
  },
  onSessionFinished:item=>{
   // Timeline never updates teacher or friend memories.
   if(item&&item.durationMs>0)trackUsageEvent("timeline_session_end",sessionDurationDetail(item.durationMs));
  }
 });
 useEffect(()=>{if((live.state==="listening"||live.state==="speaking")&&!usageStarted.current){
  usageStarted.current=true;trackUsageEvent("timeline_conversation_start");
 }},[live.state]);
 const end=async()=>{if(closing.current)return;closing.current=true;try{await live.stop(true)}finally{navigate(back)}};
 // Keyed visitors keep automatic startup. Guests need one explicit trial grant;
 // openingPrompt is delivered by useLiveSession.start(grant) after connection.
 useEffect(()=>{if(!geminiKey())return;const timer=window.setTimeout(()=>{void live.start()},0);return()=>window.clearTimeout(timer)},[live.start]);
 useEffect(()=>{document.body.className="teacher-theme session-page timeline-session-page";return()=>{document.body.className=""}},[]);
 const keep=(i:number,text:string)=>{
  if(saved.includes(i))return;
  if(timelineSaveNote(age,text,characterId)){recordTimelineEcho(age,text,characterId);setSaved(a=>[...a,i]);setNotice(t("timeline.memorySaved"));}
  else setNotice(t("timeline.memoryDisabled"));
 };
 const active=["connecting","listening","speaking","requesting-mic","ending","reporting"].includes(live.state);
 return <><header className="app-header"><div className="shell inner">
   <div className="app-brand"><Link className="back-btn" to={back} onClick={e=>{e.preventDefault();void end()}}><Arrow direction="left" className="crew-arrow--plain"/></Link>
    <div className="app-title"><strong>{person.name} · {age} {t("timeline.years")}</strong><small>{t("timeline.liveContext")} · {language}</small></div>
   </div><span className="status connected"><i className="status-dot"/><span>{t(active?"timeline.inConversation":"timeline.ready")}</span></span>
  </div></header>
  <main className="session-shell timeline-live"><div className="desktop-live-workspace">
   <section className="live-stage" aria-label={person.name+" age "+age}>
    <div className="live-identity"><TimelinePortrait characterId={characterId} age={age} alt={t("timeline.photoAlt",{name:person.name,age})} />
     <h1>{person.name} · {age}</h1><p>{en?current.story:current.storyZh}</p><p className="timeline-life-quote">“{en?current.quoteEn:current.quoteZh}”</p><p>{t("timeline.fiction")}</p>
    </div>
    {known.length>0&&<details className="timeline-known"><summary>{t("timeline.remember",{name:person.name})} · {known.length}</summary>
      <ul>{known.map((note,i)=><li key={i}><strong>{note.age} {t("timeline.years")}</strong> · {note.text}</li>)}</ul>
    </details>}
    {!geminiKey()&&!guestStarted?<GuestLiveStarter role="friend" onGrant={async grant=>{setGuestStarted(true);await live.start(grant)}}/>
     :guestStarted&&(live.state==="ended"||live.state==="error")?<GuestTrialFinish name={person.name} expired={live.guestExpired} failed={live.state==="error"}/>
     :<LiveControls live={live} onEnd={end} prominentInterrupt interruptLabel={t("timeline.myTurn")}/>}
    {guestStarted&&live.state!=="ended"&&live.state!=="error"&&<GuestTrialCountdown secondsLeft={live.guestSecondsLeft}/>}
    <div className="live-presets">{active&&current.conversationThreads.slice(0,3).map((topic,i)=><button key={i} type="button" onClick={()=>live.sendText("[TIMELINE TOPIC — silent scene nudge] As "+person.name+" age "+age+", respond in character to this age-valid moment: "+topic+". Do not pretend the learner asked this, do not spoil the future.")}>{en?topic:current.conversationThreadsZh[i]}</button>)}</div>
    <div className="live-transcript" aria-live="polite">
     <div className={"live-line user "+(live.input?"show":"")}><small>{t("timeline.you")}</small><span>{live.input}</span></div>
     <div className={"live-line "+(live.output?"show":"")}><small>{person.name}</small><span>{live.output}</span></div>
    </div>
    {live.turns.length>0&&<section className="timeline-turns"><h2>{t("timeline.thisConversation")}</h2>
     {live.turns.map((turn,i)=><div className="timeline-turn" key={i}>
      {turn.input&&<div><p><b>{t("timeline.you")}：</b>{turn.input}</p>
       <button type="button" disabled={saved.includes(i)} onClick={()=>keep(i,turn.input||"")}>{t(saved.includes(i)?"timeline.saved":"timeline.saveMemory")}</button>
      </div>}{turn.output&&<p><b>{person.name}：</b>{turn.output}</p>}
     </div>)}</section>}
    {notice&&<p role="status">{notice}</p>}
    <p className="timeline-caption">{t("timeline.memoryCaption")}</p>
   </section>
   <DesktopLivePanel kind="friend" label={person.name+" · "+age} language={language} turns={live.turns} input={live.input} output={live.output} state={live.state}/>
  </div></main></>;
}

