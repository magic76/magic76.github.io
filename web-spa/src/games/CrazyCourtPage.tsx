import {useEffect,useRef,useState,type FormEvent} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {CREW_FRIENDS,getCrewFriend} from "../friends/friendProfiles";
import {FriendAvatar} from "../friends/FriendAvatar";
import {trackUsageEvent} from "../analytics/usage";
import {ensureCore,geminiKey} from "../lib/runtime";
import {GamePanel} from "./GamePanel";
import {MiniGameVoice,useMiniFriend,type VoiceCue} from "./MiniGameFrame";
import {courtCases,courtPhases,courtReasons,evaluateCourtAction,
 type CourtAction,type CourtRole,type CourtLanguage,type CourtCase} from "./crazyCourtEngine";
import {judgeCourtTurn,judgeCourtFinal,courtOpponentReply,type CourtJudgeFinal} from "./courtJudge";
import "./crazyCourt.css";

type Phase="setup"|"trial"|"verdict";
type Entry={speaker:"judge"|"opponent"|"player";text:string;kind?:"objection"|"evidence"|"normal"};
const choice=(zh:boolean,a:string,b:string)=>zh?a:b;
const get=(value:{zh:string;en:string},language:CourtLanguage)=>value[language];
const maxTurns=4;
function currentClaim(court:CourtCase,turn:number,role:CourtRole,language:CourtLanguage){
 return get(court.claims[turn][role==="defense"?"prosecution":"defense"],language);
}
export function CrazyCourtPage(){
 const {friend,choose}=useMiniFriend();
 const {i18n}=useTranslation("home");
 const language:CourtLanguage=i18n.resolvedLanguage?.startsWith("zh")?"zh":"en";
 const zh=language==="zh";
 const [caseId,setCaseId]=useState("pizza");
 const [role,setRole]=useState<CourtRole>("defense");
 const [phase,setPhase]=useState<Phase>("setup");
 const [turn,setTurn]=useState(0),[score,setScore]=useState(0),[objections,setObjections]=useState(3);
 const [usedIds,setUsedIds]=useState<string[]>([]);
 const [roundPoints,setRoundPoints]=useState<number[]>([]);
 const [finalJudgment,setFinalJudgment]=useState<CourtJudgeFinal|null>(null);
 const [verdictError,setVerdictError]=useState("");
 const [previewEvidence,setPreviewEvidence]=useState<string|null>(null);
 const [entries,setEntries]=useState<Entry[]>([]);
 const [text,setText]=useState(""),[notice,setNotice]=useState("");
 const [objectionOpen,setObjectionOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [cue,setCue]=useState<VoiceCue>({id:0,text:""});
 const [acceptedObjections,setAcceptedObjections]=useState(0);
 const busyRef=useRef(false),aliveRef=useRef(true);
 const court=courtCases.find(item=>item.id===caseId)||courtCases[0];
 const judge=getCrewFriend(friend.id==="maya"?"iris":"maya");
 const opponent=role==="defense"?choice(zh,"檢察官","Prosecutor"):choice(zh,"辯護律師","Defense attorney");
 const preview=court.evidence.find(item=>item.id===previewEvidence);
 useEffect(()=>{aliveRef.current=true;trackUsageEvent("game_open","crazy-court");document.body.classList.add("teacher-theme");return()=>{aliveRef.current=false;document.body.classList.remove("teacher-theme")};},[]);
 const emit=(message:string)=>setCue(prev=>({id:prev.id+1,text:message}));
 const openTrial=()=>{
  if(!geminiKey()){setNotice(choice(zh,"請先在設定中填入 Gemini Key。","Set your Gemini Key in Settings before playing."));return;}
  trackUsageEvent("game_started","crazy-court");
  setTurn(0);setScore(0);setObjections(3);setAcceptedObjections(0);setUsedIds([]);setRoundPoints([]);setFinalJudgment(null);setVerdictError("");
  setEntries([
   {speaker:"judge",text:choice(zh,"現在開庭！雙方請尊重證據，但不必壓抑幽默感。","Court is now in session! Respect the evidence, but don't suppress the jokes.")},
   {speaker:"opponent",text:currentClaim(court,0,role,language)}
  ]);
  setText("");setNotice("");setObjectionOpen(false);setPreviewEvidence(null);setPhase("trial");
  emit("The court is open. As "+opponent+", say one brief spirited greeting. The next move is the player's.");
 };
 const conclude=async(history:Entry[],points:number[])=>{
  try{
   const result=await judgeCourtFinal(court,role,language,history,points);
   if(!aliveRef.current)return;
   setFinalJudgment(result);setVerdictError("");
   trackUsageEvent("game_completed","crazy-court");
  }catch{
   if(!aliveRef.current)return;
   setVerdictError(choice(zh,"AI 法官尚未完成判決，請重試。這不會算你輸。","The AI judge could not finish. Retry without losing your case."));
  }finally{
   if(aliveRef.current){busyRef.current=false;setBusy(false);}
  }
 };
 const handleAction=async(action:CourtAction)=>{
  if(phase!=="trial"||busyRef.current)return;
  if(!geminiKey()){setNotice(choice(zh,"Gemini Key 已移除，請回設定重新填入。","Gemini Key is missing. Please update Settings."));return;}
  const eligibility=evaluateCourtAction(court,role,turn,action,usedIds,objections);
  if(!eligibility.valid){setNotice(get(eligibility.summary,language));return;}
  busyRef.current=true;setBusy(true);setObjectionOpen(false);
  const evidence=action.kind==="evidence"?court.evidence.find(item=>item.id===action.evidenceId):undefined;
  const reason=action.kind==="objection"?courtReasons.find(item=>item.id===action.reason):undefined;
  const spoken=action.kind==="statement"?action.text.trim():
    evidence?get(evidence.title,language)+"："+get(evidence.detail,language):
    reason?choice(zh,"異議！","Objection! ")+get(reason.label,language):
    choice(zh,"本回合沒有補充。","No further remarks.");
  const playerLine:Entry={speaker:"player",text:spoken,kind:action.kind==="objection"?"objection":action.kind==="evidence"?"evidence":"normal"};
  let evaluated;
  try{
   evaluated=await judgeCourtTurn(court,role,language,turn,action,currentClaim(court,turn,role,language),[...entries,playerLine]);
  }catch{
   // Never consume an objection, evidence or round when Gemini failed to judge.
   if(aliveRef.current){
    setNotice(choice(zh,"AI 法官未能判定。請確認 Key 或網路後重試，本回合尚未扣分。","AI judge unavailable. Check your Key or network and retry; no points or moves were lost."));
    busyRef.current=false;setBusy(false);
   }
   return;
  }
  if(!aliveRef.current)return;
  const judgeLine:Entry={speaker:"judge",text:evaluated.reason};
  const history=[...entries,playerLine,judgeLine],points=[...roundPoints,evaluated.points];
  setEntries(history);setRoundPoints(points);
  setScore(prev=>prev+evaluated.points);
  if(action.kind==="objection"){
   setObjections(prev=>prev-1);
   if(evaluated.accepted)setAcceptedObjections(prev=>prev+1);
  }
  if(eligibility.usedEvidenceId)setUsedIds(prev=>[...prev,eligibility.usedEvidenceId!]);
  setText("");setPreviewEvidence(null);
  setNotice(evaluated.reason+(evaluated.points>0?" (+":" (")+(evaluated.points>0?evaluated.points:""+evaluated.points)+")");
  const next=turn+1;
  if(next===maxTurns){
   setPhase("verdict");
   await conclude(history,points);
   return;
  }
  const counter=await courtOpponentReply(court,role,language,spoken);
  if(!aliveRef.current)return;
  setEntries(prev=>[...prev,{speaker:"opponent",text:counter},{speaker:"opponent",text:currentClaim(court,next,role,language)}]);
  setTurn(next);
  // Never ask Live to re-judge or narrate the verdict; it only performs the opponent line.
  emit("GAME EVENT. You are opposing counsel, not judge. Say exactly this one brief rebuttal then listen: "+JSON.stringify(counter));
  busyRef.current=false;setBusy(false);
 };
 const retryFinal=()=>{
  if(busyRef.current||!geminiKey())return;
  busyRef.current=true;setBusy(true);setVerdictError("");
  void conclude(entries,roundPoints);
 };
 const submit=(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  if(text.trim())void handleAction({kind:"statement",text});
 };
 const reset=()=>{
  setPhase("setup");setNotice("");setEntries([]);setText("");
  setCue({id:0,text:""});setObjectionOpen(false);setPreviewEvidence(null);setBusy(false);busyRef.current=false;
  setFinalJudgment(null);setVerdictError("");setRoundPoints([]);
 };
 const hasKey=Boolean(geminiKey());
 const won=finalJudgment?.winner==="player";
 return <main className="crew-play-page court-page">
  <header className="court-header">
   <Link to="/games" className="court-back">← {choice(zh,"全部遊戲","All games")}</Link>
   <div className="court-eyebrow">CREW PLAY / CRAZY COURT</div>
   <h1>{choice(zh,"荒謬法庭","Crazy Court")}</h1>
   <p>{choice(zh,"認真辯論最荒謬的小事，和 AI 朋友一起把法庭鬧翻。","Debate the silliest cases with your AI friend.")}</p>
  </header>
  {phase==="setup"?<section className="court-setup">
   <div className="court-setup-art" aria-hidden="true"><div className="court-arch"><span>⚖</span><i/><i/><i/></div><span className="court-setup-art-label">THE COURT IS READY</span></div>
   <div className="court-paper">
    <span className="court-stamp">CASE / 00{courtCases.findIndex(c=>c.id===caseId)+1}</span>
    <h2>{get(court.title,language)}</h2>
    <p>{get(court.description,language)}</p>
    <label htmlFor="court-case">{choice(zh,"選擇案件","Choose a case")}</label>
    <select id="court-case" value={caseId} onChange={e=>setCaseId(e.target.value)}>
     {courtCases.map(item=><option value={item.id} key={item.id}>{get(item.title,language)}</option>)}
    </select>
   </div>
   <div className="court-setup-config">
    <h3>{choice(zh,"你的法庭身分","Choose your role")}</h3>
    <div className="court-role-choices">
     <button type="button" aria-pressed={role==="defense"} onClick={()=>setRole("defense")}><span>♙</span><strong>{choice(zh,"辯護律師","Defense")}</strong><small>{choice(zh,"替被告辯護","Defend the accused")}</small></button>
     <button type="button" aria-pressed={role==="prosecution"} onClick={()=>setRole("prosecution")}><span>⚖</span><strong>{choice(zh,"檢察官","Prosecutor")}</strong><small>{choice(zh,"提出指控","Press the case")}</small></button>
    </div>
    <div className="court-choose-friend">
     <FriendAvatar friend={friend}/>
     <div><strong>{friend.name}</strong><small>{choice(zh,"你的 AI 對手","Your AI opponent")}</small></div>
     <label htmlFor="court-friend" className="court-sr-only">{choice(zh,"選擇 AI 朋友","Choose AI friend")}</label>
     <select id="court-friend" value={friend.id} onChange={e=>choose(e.target.value)}>
      {CREW_FRIENDS.map(f=><option value={f.id} key={f.id}>{f.name}</option>)}
     </select>
    </div>
    <p className="court-rules">{choice(zh,"4 個回合 · AI 法官逐回合評分與最終裁決 · 可用文字或語音辯論","4 turns · AI judge scores each action and final verdict · Text or voice")}</p>
    {!hasKey?<div className="court-key-notice" role="status"><strong>{choice(zh,"開庭需要 Gemini Key","Gemini Key required")}</strong><p>{choice(zh,"可以先查看案件和選擇角色。請到設定填入 Key，才能和 AI 對手辯論並由 AI 法官判決。","You can preview cases and roles. Add your Gemini Key in Settings to debate and receive an AI verdict.")}</p><Link to="/settings">{choice(zh,"前往設定 Gemini Key →","Set up Gemini Key →")}</Link></div>:null}
    {notice&&phase==="setup"?<p className="court-notice" role="status">{notice}</p>:null}
    <button className="court-primary" type="button" disabled={!hasKey} onClick={openTrial}>{choice(zh,"開庭！","Open court!")} <span>→</span></button>
   </div>
  </section>:phase==="verdict"?<section className="court-verdict" aria-live="polite">
   <div className="court-verdict-icon" aria-hidden="true">⚖</div>
   <span className="court-stamp">{choice(zh,"AI 法官判決書","AI JUDGE VERDICT")}</span>
   {finalJudgment?<>
    <h2>{won?choice(zh,"勝訴！","Case won!"):choice(zh,"敗訴！","Case lost!")}</h2>
    <p>{finalJudgment.reason}</p>
    <div className="court-verdict-stats">
     <div><strong>{finalJudgment.total}</strong><small>{choice(zh,"綜合分數 / 100","Final score / 100")}</small></div>
     <div><strong>{score}</strong><small>{choice(zh,"回合積分","Turn points")}</small></div>
     <div><strong>{acceptedObjections}</strong><small>{choice(zh,"異議成立","Valid objections")}</small></div>
    </div>
    <p className="court-rules">{choice(zh,"論點 30% · 證據 30% · 反駁 25% · 創意 15%；綜合達 60 分勝訴。","Logic 30% · Evidence 30% · Rebuttal 25% · Creativity 15%. Win at 60.")}</p>
   </>:<>
    <h2>{busy?choice(zh,"AI 法官正在評議","The AI judge is deliberating"):choice(zh,"判決尚未完成","Verdict pending")}</h2>
    <p>{verdictError||choice(zh,"正在根據完整庭審紀錄評分，不會預先判定輸贏。","Reviewing the full transcript. No result will be assumed.")}</p>
    {!busy?<button type="button" className="court-primary" disabled={!hasKey} onClick={retryFinal}>{choice(zh,"重新取得判決","Retry AI verdict")}</button>:null}
    {!hasKey?<Link to="/settings">{choice(zh,"前往設定 Gemini Key","Set up Gemini Key")}</Link>:null}
   </>}
   <GamePanel label={choice(zh,"查看庭審紀錄","Read transcript")} title={choice(zh,"庭審紀錄","Court transcript")}><Transcript entries={entries} friend={friend.name} language={language}/></GamePanel>
   {finalJudgment?<button type="button" className="court-primary" onClick={reset}>{choice(zh,"下一個案件","Next case")} →</button>:null}
  </section>:<section className="court-trial" aria-label={choice(zh,"法庭庭審","Court trial")}>
   <div className="court-trial-top">
    <div><span className="court-stamp">CASE 00{courtCases.findIndex(c=>c.id===caseId)+1}</span><h2>{get(court.title,language)}</h2></div>
    <GamePanel label={choice(zh,"完整紀錄","Transcript")} title={choice(zh,"庭審紀錄","Court transcript")}><Transcript entries={entries} friend={friend.name} language={language}/></GamePanel>
   </div>
   <div className="court-progress" aria-label={choice(zh,"庭審進度","Trial progress")}>
    {courtPhases.map((item,i)=><div key={i} className={i===turn?"is-current":i<turn?"is-done":""}><span/><small>{get(item,language)}</small></div>)}
   </div>
   <div className="court-stage">
    <div className="court-judge">
     <div className="court-judge-avatar"><FriendAvatar friend={judge}/><span aria-hidden="true">⚖</span></div>
     <strong>{choice(zh,"法官","Judge")} · {judge.name}</strong>
    </div>
    <div className="court-parties">
     <div className="court-party"><div className="court-party-face court-party-player">♙</div><strong>{choice(zh,"你","You")}</strong><small>{role==="defense"?choice(zh,"辯方","Defense"):choice(zh,"檢方","Prosecution")}</small></div>
     <div className="court-desk" aria-hidden="true"><span>⚖</span></div>
     <div className="court-party"><FriendAvatar friend={friend}/><strong>{friend.name}</strong><small>{opponent}</small></div>
    </div>
   </div>
   <div className="court-latest" aria-live="polite">
    <span className="court-live-dot"/><strong>{opponent} · {friend.name}</strong>
    {entries.filter(entry=>entry.speaker==="opponent").slice(-2).map((entry,i)=><p key={turn+":"+i} className={i===0?"court-opponent-previous":undefined}>{entry.text}</p>)}
    {busy?<small>{choice(zh,"AI 正在整理下一段庭審…","Preparing the next exchange…")}</small>:null}
   </div>
   {notice?<p className="court-notice" role="status">{notice}</p>:null}
   <div className="court-actions-heading"><strong>{choice(zh,"提出物證","Present evidence")}</strong><span>{choice(zh,"每張僅能使用一次","One use per card")}</span></div>
   <div className="court-evidence">
    {court.evidence.map(item=><button key={item.id} type="button" disabled={busy||usedIds.includes(item.id)} aria-pressed={previewEvidence===item.id}
      onClick={()=>setPreviewEvidence(previous=>previous===item.id?null:item.id)} title={get(item.detail,language)}>
     <span className="court-evidence-icon">{item.icon}</span><strong>{get(item.title,language)}</strong>
     <small>{usedIds.includes(item.id)?choice(zh,"已採納","Filed"):choice(zh,"查看證據","Inspect")}</small>
    </button>)}
   </div>
   {preview?<div className="court-evidence-preview" aria-live="polite">
    <strong>{get(preview.title,language)}</strong><p>{get(preview.detail,language)}</p>
    <div><button type="button" disabled={busy} onClick={()=>void handleAction({kind:"evidence",evidenceId:preview.id})}>{choice(zh,"提交這張物證","File this evidence")}</button>
    <button type="button" onClick={()=>setPreviewEvidence(null)}>{choice(zh,"取消","Cancel")}</button></div>
   </div>:null}
   {objectionOpen?<div className="court-objection-panel" role="group" aria-label={choice(zh,"選擇異議理由","Choose objection reason")}>
    <div className="court-objection-head"><strong>{choice(zh,"你為什麼異議？","What's your objection?")}</strong><button type="button" onClick={()=>setObjectionOpen(false)}>{choice(zh,"取消","Cancel")}</button></div>
    <div className="court-reasons">{courtReasons.map(reason=><button key={reason.id} type="button" onClick={()=>void handleAction({kind:"objection",reason:reason.id})}>{get(reason.label,language)}</button>)}</div>
   </div>:null}
   <form className="court-statement" onSubmit={submit}>
    <label htmlFor="court-statement">{choice(zh,"換你發言","Your argument")}</label>
    <div><input id="court-statement" value={text} maxLength={500} onChange={event=>setText(event.target.value)} disabled={busy}
     placeholder={choice(zh,"說出你的反駁，或使用下方語音…","Make your point, or use voice below…")}/>
     <button type="submit" disabled={busy||text.trim().length<3}>{choice(zh,"送出","Send")}</button></div>
   </form>
   <div className="court-bottom-actions">
    <button type="button" className="court-object-button" disabled={busy||objections===0} aria-expanded={objectionOpen} onClick={()=>setObjectionOpen(value=>!value)}>
     <span aria-hidden="true">!</span> {choice(zh,"異議！","Objection!")} <small>({objections})</small>
    </button>
    <button type="button" disabled={busy} className="court-pass-button" onClick={()=>void handleAction({kind:"pass"})}>{choice(zh,"略過這回合","Pass turn")}</button>
   </div>
  </section>}
  {phase!=="setup"?<div className="court-voice-wrap">
   <MiniGameVoice kind="court" friend={friend} courtRole={role} cue={cue} onSpeech={speech=>{
    if(phase==="trial"&&!busyRef.current)void handleAction({kind:"statement",text:speech});
   }}/>
  </div>:null}
 </main>;
}
function Transcript({entries,friend,language}:{entries:Entry[];friend:string;language:CourtLanguage}){
 return <ol className="court-transcript">{entries.map((entry,i)=><li key={i}>
  <strong>{entry.speaker==="judge"?(language==="zh"?"法官":"Judge"):entry.speaker==="player"?(language==="zh"?"你":"You"):friend}</strong>
  <p>{entry.text}</p>
 </li>)}</ol>;
}
