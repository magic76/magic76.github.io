import {useEffect,useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import {ensureLive,geminiKey,type LiveSession,type LiveTurn} from "../lib/runtime";
import {
  EMPTY_CONSENSUS,applyMateConsensusPatch,deleteMateHistory,
  mateConsensusReady,mateToolAllowed,mateToolDeclarations,parseMateToolArgs,
  readMateHistory,storeMateHistory,mateHistoryResumable,type MateAudience,type MateConsensus,
  type MateDecision,type MateHistory,type MatePhase,type MateTurn
} from "./mateState";
import {externalInstruction,externalOpening,externalContinuation,privateInstruction} from "./matePrompts";
import {translateMateText} from "./mateTranslation";
import {finalizeMateBriefing} from "./mateBriefing";
import {MateTranscript} from "./MateTranscript";
import {MateHeader} from "./MateHeader";
import {MateHistoryPanel} from "./MateHistoryPanel";
import {MateConsensusFields} from "./MateConsensusFields";
import {MateExternalDock} from "./MateExternalDock";
import "./mate.css";

const timestampId = () => String(Date.now())+"-"+Math.random().toString(36).slice(2,8);
const textValue = (v:unknown) => typeof v==="string"?v.trim().slice(0,800):"";
export function MatePage(){
  const {t,i18n}=useTranslation(["mate","home"]);
  const en=i18n.language!=="zh-TW";
  const [phase,setPhase]=useState<MatePhase>("setup");
  const [consensus,setConsensus]=useState<MateConsensus>({...EMPTY_CONSENSUS});
  const consensusRef=useRef(consensus);
  const [note,setNote]=useState("");
  const [privateInput,setPrivateInput]=useState("");
  const [privateOutput,setPrivateOutput]=useState("");
  const [privateQuestion,setPrivateQuestion]=useState("");
  const [briefingBusy,setBriefingBusy]=useState(false);
  const briefingPending=useRef(false);
  const privateStatements=useRef<string[]>([]);
  const privateInputRef=useRef("");
  const [liveStatus,setLiveStatus]=useState("");
  const [connected,setConnected]=useState(false);
  const [speaking,setSpeaking]=useState(false);
  const [mateGreeted,setMateGreeted]=useState(false);
  const [turns,setTurns]=useState<MateTurn[]>([]);
  const [translationView,setTranslationView]=useState<"bilingual"|"translated"|"original">("bilingual");
  const translationViewRef=useRef<"bilingual"|"translated"|"original">("bilingual");
  const translationPending=useRef(new Set<string>());
  const [decision,setDecision]=useState<MateDecision>(null);
  const [outcome,setOutcome]=useState("");
  const [history,setHistory]=useState<MateHistory[]>(()=>readMateHistory());
  const [showHistory,setShowHistory]=useState(false);
  const [error,setError]=useState("");
  const [confirmOwner,setConfirmOwner]=useState(false);
  const [startedExternal,setStartedExternal]=useState(false);
  const phaseRef=useRef<MatePhase>("setup");
  const audienceRef=useRef<MateAudience>("IDLE");
  const connectionRef=useRef<LiveSession|null>(null);
  const connectionSeq=useRef(0);
  const externalInputSeen=useRef(false);
  const externalOutputSeen=useRef(false);
  const continuingSessionRef=useRef(false);
  const mutedByMate=useRef(false);
  const ownerDecisionForExternal=useRef("");
  const unmuteTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const turnsRef=useRef<MateTurn[]>([]);
  const taskId=useRef(timestampId());
  useEffect(()=>{trackUsageEvent("mate_open")},[]);

  function advance(next:MatePhase,audience:MateAudience){
    phaseRef.current=next;audienceRef.current=audience;setPhase(next);
  }
  function updateConsensus(value:MateConsensus){
    consensusRef.current=value;
    setConsensus(value);
    setConfirmOwner(false);
  }
  function edit(field:keyof MateConsensus,value:string){
    updateConsensus({...consensusRef.current,[field]:value});
  }
  function appendTurn(sender:MateTurn["sender"],original:string){
    if(!original.trim())return;
    const latest:MateTurn={id:timestampId(),sender,original:original.trim(),time:Date.now()};
    turnsRef.current=[...turnsRef.current,latest];
    setTurns(turnsRef.current);
    if(translationViewRef.current!=="original")void translateTurn(latest);
    saveResult(false,t("mate.outcome.inProgress"));
  }
  async function translateTurn(entry:MateTurn){
    if(translationPending.current.has(entry.id)||entry.translated)return;
    const c=consensusRef.current;
    if(c.userLanguage===c.otherLanguage){
      turnsRef.current=turnsRef.current.map(x=>x.id===entry.id?{...x,translated:x.original}:x);
      setTurns(turnsRef.current);return;
    }
    translationPending.current.add(entry.id);
    const thisTask=taskId.current;
    try{
      const translated=await translateMateText(entry.original,c.userLanguage);
      if(thisTask!==taskId.current||typeof translated!=="string"||!translated.trim())return;
      turnsRef.current=turnsRef.current.map(x=>x.id===entry.id?{...x,translated:translated.trim()}:x);
      setTurns(turnsRef.current);
    }catch{/* Show the genuine original transcript if translation fails. */}
    finally{translationPending.current.delete(entry.id)}
  }
  function setView(value:"bilingual"|"translated"|"original"){
    setTranslationView(value);translationViewRef.current=value;
    if(value!=="original")turnsRef.current.filter(entry=>!entry.translated).forEach(entry=>void translateTurn(entry));
  }
  function clearUnmuteTimer(){
    if(unmuteTimer.current!==null){clearTimeout(unmuteTimer.current);unmuteTimer.current=null}
  }
  async function stopConnection(){
    ++connectionSeq.current;
    clearUnmuteTimer();
    const active=connectionRef.current;
    connectionRef.current=null;
    setConnected(false);setSpeaking(false);
    if(active){try{await active.stop({reason:"mate-audience-change",silentStatus:true,emitTerminal:false})}catch{/* already ended */}}
  }
  useEffect(()=>()=> {
    ++connectionSeq.current;
    if(unmuteTimer.current!==null)clearTimeout(unmuteTimer.current);
    const active=connectionRef.current;connectionRef.current=null;
    if(active)void active.stop({reason:"page-leave",silentStatus:true,emitTerminal:false}).catch(()=>{});
  },[]);

  function saveResult(completed:boolean,result:string){
    const c=consensusRef.current;
    const record:MateHistory={id:taskId.current,status:completed?"completed":"stopped",
      target:c.target,goal:c.goal,userLanguage:c.userLanguage,
      otherLanguage:c.otherLanguage,turns:turnsRef.current.slice(),outcome:result,updatedAt:Date.now(),
      consensus:{...c}};
    storeMateHistory(record);setHistory(readMateHistory());
  }
  async function closeTask(completed:boolean,summary:string){
    advance("finished","IDLE");
    if(completed)trackUsageEvent("mate_handoff_completed");
    setOutcome(summary);saveResult(completed,summary);
    await stopConnection();
  }
  async function startVoice(mode:"private"|"external"){
    if(mode==="external"&&(!mateConsensusReady(consensusRef.current)||!confirmOwner)){
      setError(t("mate.err.reviewFirst"));return;
    }
    if(!geminiKey()){setError(t("mate.err.noKey"));return}
    setError("");setLiveStatus(t("mate.connecting"));
    await stopConnection();
    const sequence=++connectionSeq.current;
    const c=consensusRef.current;
    const continuing=mode==="external"&&startedExternal;
    if(mode==="external")continuingSessionRef.current=continuing;
    const scopedOwnerDecision=mode==="external"?ownerDecisionForExternal.current:"";
    if(mode==="external")ownerDecisionForExternal.current=""; // authorization is single-handoff only
    externalInputSeen.current=false;externalOutputSeen.current=false;mutedByMate.current=false;
    if(mode==="external")setMateGreeted(false);
    if(mode==="private"){
      if(note.trim()){privateStatements.current.push(note.trim());setNote("");}
      privateInputRef.current="";
      advance("private","PRIVATE_TO_MATE");
      setPrivateInput("");setPrivateOutput("");setPrivateQuestion("");
    }else{
      advance("external","EXTERNAL_WITH_MATE");
      setShowHistory(false);setStartedExternal(true);
      saveResult(false,t("mate.outcome.resumable"));
    }
    try{
      await ensureLive();
      if(connectionSeq.current!==sequence||!window.CrewLive)return;
      const voiceOptions={
        system:mode==="private"?privateInstruction(c,startedExternal,turnsRef.current.slice(-12)):externalInstruction(c,scopedOwnerDecision,turnsRef.current.slice(-16),continuing),
        openingPrompt:mode==="private"
          ? (note.trim()||(startedExternal?(en?"Help me update the ongoing task without restarting the conversation.":"請聽我補充剛剛的任務，原本談好的內容不要重來。"):(en?"Ask what is missing and help me clarify this task.":"請詢問我需要哪些資訊，再幫我整理任務。")))
          : (continuing?externalContinuation(c,turnsRef.current.slice(-16)):externalOpening(c)),
        voice:"Aoede",volume:100,
        maxResumeAttempts:1,maxLiveAttempts:1,manualInterruptOnly:true,
        tools:mateToolDeclarations(mode),
        onStatus:(message:string)=>{if(connectionSeq.current===sequence)setLiveStatus(message)},
        onState:(state:string)=>{
          if(connectionSeq.current!==sequence)return;
          setConnected(state==="ready");
          if(state==="error"){
            if(mode==="external")trackUsageEvent("mate_handoff_failed");
            setError(t("mate.err.dropped"));
          }
        },
        onSpeaking:(now:boolean)=>{
          if(connectionSeq.current!==sequence)return;
          setSpeaking(now);
          if(mode==="external"&&phaseRef.current==="external"){
            const session=connectionRef.current;
            if(!session)return;
            clearUnmuteTimer();
            if(now){
              if(!session.micMuted){session.toggleMic();mutedByMate.current=true}
            }else if(mutedByMate.current){
              unmuteTimer.current=setTimeout(()=>{
                if(connectionSeq.current!==sequence||phaseRef.current!=="external")return;
                if(session.micMuted)session.toggleMic();
                mutedByMate.current=false;unmuteTimer.current=null;
              },450);
            }
          }
        },
        onInputTranscript:(value:string)=>{
          if(connectionSeq.current!==sequence||!value.trim())return;
          if(mode==="private"){privateInputRef.current=value;setPrivateInput(value)}
          else if(phaseRef.current==="external" && audienceRef.current==="EXTERNAL_WITH_MATE"){
            externalInputSeen.current=true;
          }
        },
        onOutputTranscript:(value:string)=>{
          if(connectionSeq.current!==sequence)return;
          if(mode==="private")setPrivateOutput(value);
          else if(value.trim()){externalOutputSeen.current=true;setMateGreeted(true)}
        },
        onTranscriptTurn:(turn:LiveTurn)=>{
          if(connectionSeq.current!==sequence)return;
          if(mode==="external"&&phaseRef.current==="external"){
            // The transcript is evidence-based: never create imaginary other-person speech.
            if(turn.input?.trim())appendTurn("other",turn.input);
            // A genuine AI greeting can precede any external speech. It is NOT a third-party turn.
            if(turn.output?.trim())appendTurn("mate",turn.output);
          }
          if(mode==="private"){
            if(turn.input?.trim())privateStatements.current.push(turn.input.trim());
            privateInputRef.current="";
            setPrivateInput("");setPrivateOutput("");
          }
        },
        onRecovered:()=>{
          if(connectionSeq.current!==sequence)return;
          if(mode==="external"){
            externalInputSeen.current=false;externalOutputSeen.current=false;
            connectionRef.current?.setVolume(100);
          }
        },
        onToolCall:(call:{name:string;args?:unknown})=>{
          const args=parseMateToolArgs(call.args);
          if(connectionSeq.current!==sequence || !mateToolAllowed(
            phaseRef.current,audienceRef.current,call.name,
            externalInputSeen.current,externalOutputSeen.current
          ))return {ok:false,error:"audience-or-evidence-rejected"};
          if(call.name==="update_task_consensus"){
            updateConsensus(applyMateConsensusPatch(consensusRef.current,args));
            return {ok:true,requires_owner_review:true};
          }
          if(call.name==="request_user_input"){
            const question=textValue(args.question);
            if(!question)return {ok:false,error:"missing-question"};
            if(mode==="private"){setPrivateQuestion(question);return {ok:true,waiting_for_owner:true}}
            // Block output immediately; disconnect outside the provider callback.
            const session=connectionRef.current;
            if(session){session.setVolume(0);if(!session.micMuted)session.toggleMic()}
            advance("decision","MATE_HANDLING");
            setDecision({question,reason:textValue(args.reason)});
            Promise.resolve().then(()=>void stopConnection());
            return {ok:true,waiting_for_owner:true};
          }
          if(call.name==="complete_task"){
            const result=textValue(args.outcome);
            if(!result)return {ok:false,error:"missing-outcome"};
            advance("finished","IDLE");
            setOutcome(result);
            saveResult(true,result);
            trackUsageEvent("mate_handoff_completed");
            connectionRef.current?.setVolume(0);
            Promise.resolve().then(()=>void stopConnection());
            return {ok:true};
          }
          return {ok:false,error:"unknown-tool"};
        },
        onError:(failure:Error)=>{
          if(connectionSeq.current!==sequence)return;
          if(mode==="external")trackUsageEvent("mate_handoff_failed");
          setConnected(false);setError(t("mate.err.failedReconnect"));
        },
        onTerminal:()=>{
          if(connectionSeq.current!==sequence)return;
          connectionRef.current=null;setConnected(false);
          if(phaseRef.current==="external")setLiveStatus(t("mate.disconnected"));
        }
      };
      const session=new window.CrewLive.Session(voiceOptions);
      if(connectionSeq.current!==sequence)return;
      connectionRef.current=session;
      await session.start();
      if(connectionSeq.current!==sequence){await session.stop({reason:"stale",emitTerminal:false});return}
      setConnected(Boolean(session.ready&&session.running));
      if(mode==="external"){
        if(session.ready&&session.running)trackUsageEvent("mate_handoff_started");
        session.setVolume(100);
      }
    }catch(failure){
      if(connectionSeq.current!==sequence)return;
      connectionRef.current=null;setConnected(false);
      if(mode==="external")trackUsageEvent("mate_handoff_failed");
      setError(t("mate.err.failedCheck"));
    }
  }
  async function reviewBrief(){
    setConfirmOwner(false);
    advance("review","IDLE");
    await stopConnection();
  }
  async function finishBriefing(){
    if(briefingPending.current)return;
    briefingPending.current=true;
    setBriefingBusy(true);setError("");
    const raw=note.trim();
    // Include the last (still streaming) spoken sentence before stopping Live.
    const pendingSpeech=privateInputRef.current.trim();
    const statements=[...privateStatements.current,...(pendingSpeech?[pendingSpeech]:[]),...(raw?[raw]:[])];
    advance("private","MATE_HANDLING");
    await stopConnection();
    try{
      if(statements.length){
        const resolved=await finalizeMateBriefing(consensusRef.current,statements,startedExternal?"supplement":"initial");
        updateConsensus(resolved.consensus);
        trackUsageEvent("mate_briefing_ready");
        setPrivateQuestion(resolved.question);
        privateStatements.current=[];privateInputRef.current="";
        setNote("");
      }
    }catch{
      setError(t("mate.err.organize"));
    }finally{
      advance("review","IDLE");
      briefingPending.current=false;
      setBriefingBusy(false);
    }
  }
  async function editSupplement(){
    // Disconnect the public microphone before revealing private briefing controls.
    advance("supplement","USER_DIRECT");setConfirmOwner(false);setPrivateQuestion("");setNote("");
    await stopConnection();
  }
  function restart(){
    void stopConnection();advance("setup","IDLE");setShowHistory(false);
    taskId.current=timestampId();translationPending.current.clear();ownerDecisionForExternal.current="";continuingSessionRef.current=false;privateStatements.current=[];privateInputRef.current="";
    updateConsensus({...EMPTY_CONSENSUS});
    setTurns([]);turnsRef.current=[];
    setOutcome("");setDecision(null);setStartedExternal(false);setMateGreeted(false);setError("");setNote("");
  }
  function applyDecision(approved:boolean){
    const d=decision;
    setDecision(null);
    // Never mistake an answer for a third-party turn; require a new explicit handoff.
    if(d){
      const suffix=(approved?"已由使用者同意：":"使用者拒絕：")+d.question;
      ownerDecisionForExternal.current=suffix;
      edit("constraints",consensusRef.current.constraints+"\n"+suffix);
    }
    advance("review","USER_DIRECT");
  }
  const ready=mateConsensusReady(consensus);
  const reviewing=phase==="setup"||phase==="supplement"||phase==="review"||phase==="private";
  const canEdit=phase==="setup"||phase==="supplement"||phase==="review";
  return <div className="mate-page">
    <MateHeader phase={phase} onHistory={()=>setShowHistory(v=>!v)}/>
    {showHistory&&phase!=="external"&&phase!=="decision"&&<MateHistoryPanel history={history}
      onOpen={item=>{
        void stopConnection();
        taskId.current=item.id;
        turnsRef.current=item.turns.slice();setTurns(turnsRef.current);setOutcome(item.outcome);
        setStartedExternal(true);setError("");
        if(mateHistoryResumable(item)&&item.consensus){
          updateConsensus({...item.consensus});advance("review","USER_DIRECT");
        }else{
          updateConsensus({...EMPTY_CONSENSUS,target:item.target,goal:item.goal,userLanguage:item.userLanguage,otherLanguage:item.otherLanguage});
          advance("finished","IDLE");
        }
        setShowHistory(false);
      }}
      onDelete={id=>{
        if(window.confirm(t("mate.confirmDelete"))){
          deleteMateHistory(id);setHistory(readMateHistory());
          if(taskId.current===id)restart();
        }
      }}/>}

    {(reviewing||phase==="finished")&&<div className="mate-steps" aria-label={t("mate.steps.aria")}>
      <span className={reviewing?"active":""}>1 {startedExternal?t("mate.steps.update"):t("mate.steps.brief")}</span>
      <span>2 {startedExternal?t("mate.steps.continue"):t("mate.steps.handoff")}</span>
      <span className={phase==="finished"?"active":""}>3 {t("mate.steps.result")}</span>
    </div>}
    {error&&<p role="alert" className="mate-error">{error}</p>}
    {reviewing&&<>
      <section className="mate-panel">
        <h2>{startedExternal?(phase==="supplement"?t("mate.title.update"):phase==="private"?t("mate.title.privateUpdate"):t("mate.title.reviewContinue")):phase==="review"?t("mate.title.confirm"):t("mate.title.brief")}</h2>
        <p className="mate-hint">{startedExternal?t("mate.hint.continuing"):t("mate.hint.handoff")}</p>
        {startedExternal&&turns.length>0&&phase!=="private"&&<details className="mate-prior-dialogue">
          <summary>{t("mate.earlier")} ({turns.length})</summary>
          <MateTranscript turns={turns} view={translationView} target={consensus.target||t("mate.otherPerson")}/>
        </details>}
        {phase!=="private"&&<MateConsensusFields consensus={consensus} canEdit={canEdit} edit={edit} showPresets={!startedExternal}/>} 
        {phase==="private"&&<div className="mate-private-live" aria-live="polite">
          <strong>{connected?t("mate.privateListening"):liveStatus}</strong>
          {privateInput&&<p>{t("mate.youPrefix")}{privateInput}</p>}
          {privateOutput&&<p>{t("mate.matePrefix")}{privateOutput}</p>}
          {privateQuestion&&<p className="mate-question">{privateQuestion}</p>}
        </div>}
        {phase!=="review"&&<label className="mate-brief-label">{startedExternal?t("mate.note.update"):t("mate.note.brief")}
          <textarea rows={2} value={note} onChange={e=>setNote(e.target.value)} placeholder={t("mate.note.placeholder")}/></label>}
        {phase==="review"&&privateQuestion&&<p className="mate-question mate-clarification">{privateQuestion}</p>}
        <div className="mate-actions">
          {phase==="private"?<>
            <button type="button" className="mate-primary" disabled={briefingBusy} onClick={()=>void finishBriefing()}>{briefingBusy?t("mate.organizing"):t("mate.finishBrief")}</button>
            <button type="button" className="mate-secondary" disabled={!connected||!note.trim()} onClick={()=>{if(connectionRef.current?.sendText(note)){privateStatements.current.push(note.trim());setNote("")}}}>{t("mate.sendNote")}</button>
          </>:phase==="setup"||phase==="supplement"?<>
            <button type="button" className="mate-secondary" onClick={()=>void startVoice("private")}>{startedExternal?t("mate.speakUpdate"):t("mate.speakPrivate")}</button>
            <button type="button" className="mate-primary" disabled={briefingBusy} onClick={()=>void finishBriefing()}>{briefingBusy?t("mate.organizing"):startedExternal?t("mate.reviewUpdate"):t("mate.summarize")}</button>
          </>:<>
            <button type="button" className="mate-secondary" onClick={()=>advance(startedExternal?"supplement":"setup","USER_DIRECT")}>{startedExternal?t("mate.addMore"):t("mate.editBrief")}</button>
            <button type="button" className="mate-primary" disabled={!ready||!confirmOwner} onClick={()=>void startVoice("external")}>{startedExternal?t("mate.continueConversation"):t("mate.startHandoff")}</button>
          </>}
        </div>
        {phase==="review"&&<label className="mate-check"><input type="checkbox" checked={confirmOwner} onChange={e=>setConfirmOwner(e.target.checked)}/>{startedExternal?t("mate.approve.update"):t("mate.approve.handoff")}</label>}
        {phase==="review"&&!ready&&<p className="mate-hint">{t("mate.incomplete")}</p>}
      </section>
    </>}
    {(phase==="external"||phase==="decision"||phase==="finished")&&<section className="mate-external">
      <div className="mate-external-top"><div><small>{phase==="external"?t("mate.status.live"):phase==="decision"?t("mate.status.decision"):t("mate.status.ended")}</small>
        <h2>{consensus.target||t("mate.communication")}</h2><p>{consensus.goal}</p></div>
        {phase==="external"&&<span className={"mate-live-dot"+(connected?" online":"")}>{connected?t("mate.connected"):liveStatus}</span>}
      </div>
      <div className="mate-translate-toggle">
        <label>{t("mate.subtitles")} <select value={translationView} onChange={event=>setView(event.target.value as "bilingual"|"translated"|"original")}>
          <option value="bilingual">{t("mate.bilingual")}</option>
          <option value="translated">{t("mate.translation")}</option>
          <option value="original">{t("mate.original")}</option>
        </select></label>
      </div>
      <MateTranscript turns={turns} view={translationView} target={consensus.target||t("mate.otherPerson")}/>
      {phase==="external"&&!connected&&<button type="button" className="mate-reconnect" onClick={()=>void reviewBrief()}>{t("mate.reviewReconnect")}</button>}
      {phase==="external"&&connected&&!mateGreeted&&!speaking&&<button type="button" className="mate-reconnect" onClick={()=>{
        if(!connectionRef.current?.sendText(continuingSessionRef.current?externalContinuation(consensusRef.current,turnsRef.current.slice(-16)):externalOpening(consensusRef.current)))setError(t("mate.err.sendFailed"));
      }}>{t("mate.askStart")}</button>}
      {phase==="external"&&<div className="mate-callstatus" role="status">{speaking?t("mate.mateSpeaking"):connected?(externalInputSeen.current?t("mate.listeningOther"):t("mate.mateInitiating")):liveStatus}</div>}
      {phase==="decision"&&decision&&<div className="mate-decision" role="alert">
        <strong>{t("mate.decision.title")}</strong>
        <p>{decision.question}</p><small>{decision.reason}</small>
        <div className="mate-actions"><button type="button" className="mate-primary" onClick={()=>applyDecision(true)}>{t("mate.decision.approve")}</button>
          <button type="button" className="mate-secondary" onClick={()=>applyDecision(false)}>{t("mate.decision.reject")}</button></div>
        <p className="mate-hint">{t("mate.decision.note")}</p>
      </div>}
      {phase==="finished"&&<div className="mate-result"><strong>{t("mate.result")}</strong><p>{outcome||t("mate.callEnded")}</p></div>}
      <MateExternalDock phase={phase}
        onSupplement={()=>void editSupplement()} onTakeOver={()=>void reviewBrief()}
        onComplete={()=>void closeTask(true,t("mate.outcome.completed"))}
        onEnd={()=>void closeTask(false,t("mate.outcome.ended"))}
        onRestart={restart}/>
    </section>}
    <p className="mate-disclaimer">{t("mate.disclaimer")}</p>
  </div>;
}
