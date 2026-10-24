import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {ensureLive,geminiKey,type LiveSession,type LiveTurn} from "../lib/runtime";
import {
  EMPTY_CONSENSUS,applyMateConsensusPatch,deleteMateHistory,
  mateConsensusReady,mateToolAllowed,mateToolDeclarations,parseMateToolArgs,
  readMateHistory,storeMateHistory,mateHistoryResumable,type MateAudience,type MateConsensus,
  type MateDecision,type MateHistory,type MatePhase,type MateTurn
} from "./mateState";
import {externalInstruction,externalOpening,privateInstruction} from "./matePrompts";
import {translateMateText} from "./mateTranslation";
import {finalizeMateBriefing} from "./mateBriefing";
import {MateTranscript} from "./MateTranscript";
import {MateHistoryPanel} from "./MateHistoryPanel";
import {MateConsensusFields} from "./MateConsensusFields";
import {MateExternalDock} from "./MateExternalDock";
import "./mate.css";

const timestampId = () => String(Date.now())+"-"+Math.random().toString(36).slice(2,8);
const textValue = (v:unknown) => typeof v==="string"?v.trim().slice(0,800):"";
export function MatePage(){
  const {i18n}=useTranslation();
  const en=i18n.language!=="zh-TW";
  const t=(zh:string,english:string)=>en?english:zh;
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
  const mutedByMate=useRef(false);
  const ownerDecisionForExternal=useRef("");
  const unmuteTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const turnsRef=useRef<MateTurn[]>([]);
  const taskId=useRef(timestampId());

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
    saveResult(false,t("對話進行中","Conversation in progress"));
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
    setOutcome(summary);saveResult(completed,summary);
    await stopConnection();
  }
  async function startVoice(mode:"private"|"external"){
    if(mode==="external"&&(!mateConsensusReady(consensusRef.current)||!confirmOwner)){
      setError(t("請先確認任務共識，再交給對方。","Review and approve the task before handoff."));return;
    }
    if(!geminiKey()){setError(t("請先至設定頁加入 Gemini API Key。","Set your Gemini API key in Settings first."));return}
    setError("");setLiveStatus(t("正在連線…","Connecting…"));
    await stopConnection();
    const sequence=++connectionSeq.current;
    const c=consensusRef.current;
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
      saveResult(false,t("任務可繼續","Task can be resumed"));
    }
    try{
      await ensureLive();
      if(connectionSeq.current!==sequence||!window.CrewLive)return;
      const voiceOptions={
        system:mode==="private"?privateInstruction(c):externalInstruction(c,scopedOwnerDecision,turnsRef.current.slice(-8)),
        openingPrompt:mode==="private"
          ? (note.trim()||t("請詢問我需要哪些資訊，再幫我整理任務。","Ask what is missing and help me clarify this task."))
          : externalOpening(c),
        voice:"Aoede",volume:100,
        maxResumeAttempts:1,maxLiveAttempts:1,manualInterruptOnly:true,
        tools:mateToolDeclarations(mode),
        onStatus:(message:string)=>{if(connectionSeq.current===sequence)setLiveStatus(message)},
        onState:(state:string)=>{
          if(connectionSeq.current!==sequence)return;
          setConnected(state==="ready");
          if(state==="error")setError(t("語音連線中斷，請重試。","Voice connection failed. Please retry."));
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
            connectionRef.current?.setVolume(0);
            Promise.resolve().then(()=>void stopConnection());
            return {ok:true};
          }
          return {ok:false,error:"unknown-tool"};
        },
        onError:(failure:Error)=>{
          if(connectionSeq.current!==sequence)return;
          setConnected(false);setError(t("語音連線失敗，請重新連線。","Voice connection failed. Please reconnect."));
        },
        onTerminal:()=>{
          if(connectionSeq.current!==sequence)return;
          connectionRef.current=null;setConnected(false);
          if(phaseRef.current==="external")setLiveStatus(t("連線已結束，可重新開始。","Disconnected. You can reconnect."));
        }
      };
      const session=new window.CrewLive.Session(voiceOptions);
      if(connectionSeq.current!==sequence)return;
      connectionRef.current=session;
      await session.start();
      if(connectionSeq.current!==sequence){await session.stop({reason:"stale",emitTerminal:false});return}
      setConnected(Boolean(session.ready&&session.running));
      if(mode==="external")session.setVolume(100);
    }catch(failure){
      if(connectionSeq.current!==sequence)return;
      connectionRef.current=null;setConnected(false);
      setError(t("語音連線失敗，請檢查 Gemini Key、麥克風權限或網路。","Voice connection failed. Check your Gemini key, microphone permission and network."));
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
        const resolved=await finalizeMateBriefing(consensusRef.current,statements);
        updateConsensus(resolved.consensus);
        setPrivateQuestion(resolved.question);
        privateStatements.current=[];privateInputRef.current="";
        setNote("");
      }
    }catch{
      setError(t("自動整理失敗，請直接修改下方欄位後再交接。","Could not organize the briefing. Review and edit the fields manually."));
    }finally{
      advance("review","IDLE");
      briefingPending.current=false;
      setBriefingBusy(false);
    }
  }
  async function editSupplement(){
    advance("setup","USER_DIRECT");setConfirmOwner(false);
    await stopConnection();
  }
  function restart(){
    void stopConnection();advance("setup","IDLE");setShowHistory(false);
    taskId.current=timestampId();translationPending.current.clear();ownerDecisionForExternal.current="";privateStatements.current=[];privateInputRef.current="";
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
  const reviewing=phase==="setup"||phase==="review"||phase==="private";
  const canEdit=phase==="setup"||phase==="review";
  return <div className="mate-page">
    <header className="mate-title">
      <div><Link to="/explore" className="mate-back">← {t("探索","Explore")}</Link>
        <p className="mate-kicker">CREW MATE</p>
        <h1>{t("AI 幫你溝通","Let AI communicate for you")}</h1>
        <p>{t("私下交代，再把手機交給對方。","Brief privately, then hand the phone to the other person.")}</p></div>
      {phase!=="external"&&phase!=="decision"&&<button type="button" className="mate-quiet" onClick={()=>setShowHistory(v=>!v)}>{t("紀錄","History")}</button>}
    </header>
    {showHistory&&phase!=="external"&&phase!=="decision"&&<MateHistoryPanel english={en} history={history}
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
        if(window.confirm(t("刪除此筆紀錄？","Delete this record?"))){
          deleteMateHistory(id);setHistory(readMateHistory());
          if(taskId.current===id)restart();
        }
      }}/>}

    {(reviewing||phase==="finished")&&<div className="mate-steps" aria-label={t("任務進度","Task progress")}>
      <span className={reviewing?"active":""}>1 {t("私下交代","Brief")}</span>
      <span>2 {t("對外溝通","Handoff")}</span>
      <span className={phase==="finished"?"active":""}>3 {t("結果","Result")}</span>
    </div>}
    {error&&<p role="alert" className="mate-error">{error}</p>}
    {reviewing&&<>
      <section className="mate-panel">
        <h2>{phase==="review"?t("請確認交接內容","Confirm handoff"):t("私下交代任務","Private briefing")}</h2>
        <p className="mate-hint">{t("交接前請確認：Mate 會依這些指示幫你溝通。私人限制只供 Mate 判斷，不會主動告訴對方。","Review before handoff: Mate uses these instructions to help you. Private limits guide Mate and are not meant to be shared with the other person.")}</p>
        {phase!=="private"&&<MateConsensusFields consensus={consensus} canEdit={canEdit} edit={edit} en={en}/>}
        {phase==="private"&&<div className="mate-private-live" aria-live="polite">
          <strong>{connected?t("Mate 正在私下聽你說","Mate is listening privately"):liveStatus}</strong>
          {privateInput&&<p>{t("你：","You: ")}{privateInput}</p>}
          {privateOutput&&<p>{t("Mate：","Mate: ")}{privateOutput}</p>}
          {privateQuestion&&<p className="mate-question">{privateQuestion}</p>}
        </div>}
        {phase!=="review"&&<label className="mate-brief-label">{t("補充文字（只傳給私下 Mate）","Private note to Mate")}
          <textarea rows={2} value={note} onChange={e=>setNote(e.target.value)} placeholder={t("可輸入其他需求，或按下面的麥克風直接說","Type more details or use the microphone")}/></label>}
        {phase==="review"&&privateQuestion&&<p className="mate-question mate-clarification">{privateQuestion}</p>}
        <div className="mate-actions">
          {phase==="private"?<>
            <button type="button" className="mate-primary" disabled={briefingBusy} onClick={()=>void finishBriefing()}>{briefingBusy?t("正在整理…","Organizing…"):t("交代完畢 · Mate 整理","Finish briefing · Summarize")}</button>
            <button type="button" className="mate-secondary" disabled={!connected||!note.trim()} onClick={()=>{if(connectionRef.current?.sendText(note)){privateStatements.current.push(note.trim());setNote("")}}}>{t("送出補充","Send note")}</button>
          </>:phase==="setup"?<>
            <button type="button" className="mate-secondary" onClick={()=>void startVoice("private")}>{t("與 Mate 私下語音討論","Talk privately with Mate")}</button>
            <button type="button" className="mate-primary" disabled={briefingBusy} onClick={()=>void finishBriefing()}>{briefingBusy?t("正在整理…","Organizing…"):t("Mate 整理並確認","Summarize & review")}</button>
          </>:<>
            <button type="button" className="mate-secondary" onClick={()=>advance("setup","USER_DIRECT")}>{t("修改內容","Edit briefing")}</button>
            <button type="button" className="mate-primary" disabled={!ready||!confirmOwner} onClick={()=>void startVoice("external")}>{startedExternal?t("重新交給 Mate","Resume handoff"):t("交給 Mate 溝通","Start handoff")}</button>
          </>}
        </div>
        {phase==="review"&&<label className="mate-check"><input type="checkbox" checked={confirmOwner} onChange={e=>setConfirmOwner(e.target.checked)}/>{t("我已確認對外目標與私人限制，允許 Mate 開始對話。","I reviewed the public goal and private limits and authorize the handoff.")}</label>}
        {phase==="review"&&!ready&&<p className="mate-hint">{t("請填妥對象、目標、限制和需確認的決策。","Complete the person, goal, limits and approval boundaries.")}</p>}
      </section>
    </>}
    {(phase==="external"||phase==="decision"||phase==="finished")&&<section className="mate-external">
      <div className="mate-external-top"><div><small>{phase==="external"?t("AI 對話中","AI conversation"):phase==="decision"?t("需你決定","Decision required"):t("任務結束","Task ended")}</small>
        <h2>{consensus.target||t("溝通任務","Communication")}</h2><p>{consensus.goal}</p></div>
        {phase==="external"&&<span className={"mate-live-dot"+(connected?" online":"")}>{connected?t("已連線","Connected"):liveStatus}</span>}
      </div>
      <div className="mate-translate-toggle">
        <label>{t("字幕","Subtitles")} <select value={translationView} onChange={event=>setView(event.target.value as "bilingual"|"translated"|"original")}>
          <option value="bilingual">{t("雙語","Bilingual")}</option>
          <option value="translated">{t("譯文","Translation")}</option>
          <option value="original">{t("原文","Original")}</option>
        </select></label>
      </div>
      <MateTranscript turns={turns} view={translationView} english={en} target={consensus.target||t("對方","Other person")}/>
      {phase==="external"&&!connected&&<button type="button" className="mate-reconnect" onClick={()=>void reviewBrief()}>{t("重新確認並連線","Review and reconnect")}</button>}
      {phase==="external"&&connected&&!mateGreeted&&!speaking&&<button type="button" className="mate-reconnect" onClick={()=>{
        if(!connectionRef.current?.sendText(externalOpening(consensusRef.current)))setError(t("無法送出，請重新連線。","Could not start speaking. Please reconnect."));
      }}>{t("請 Mate 主動開口","Ask Mate to start speaking")}</button>}
      {phase==="external"&&<div className="mate-callstatus" role="status">{speaking?t("Mate 正在說話","Mate is speaking"):connected?(externalInputSeen.current?t("正在聽對方說話","Listening to the other person"):t("Mate 已開始協助溝通","Mate is initiating the conversation")):liveStatus}</div>}
      {phase==="decision"&&decision&&<div className="mate-decision" role="alert">
        <strong>{t("Mate 需要你的決定","Mate needs your approval")}</strong>
        <p>{decision.question}</p><small>{decision.reason}</small>
        <div className="mate-actions"><button type="button" className="mate-primary" onClick={()=>applyDecision(true)}>{t("同意，再次確認交接","Approve and review")}</button>
          <button type="button" className="mate-secondary" onClick={()=>applyDecision(false)}>{t("拒絕，重新交代","Reject and review")}</button></div>
        <p className="mate-hint">{t("不會自動替你答應任何付款或其他承諾。","Mate will not automatically accept payments or commitments.")}</p>
      </div>}
      {phase==="finished"&&<div className="mate-result"><strong>{t("溝通結果","Communication result")}</strong><p>{outcome||t("通話已結束","Conversation ended")}</p></div>}
      <MateExternalDock phase={phase} english={en}
        onSupplement={()=>void editSupplement()} onTakeOver={()=>void reviewBrief()}
        onComplete={()=>void closeTask(true,t("使用者確認任務完成","Owner confirmed completion"))}
        onEnd={()=>void closeTask(false,t("只結束通話，任務未確認完成","Call ended without completion"))}
        onRestart={restart}/>
    </section>}
    <p className="mate-disclaimer">{t("現場溝通需徵得對方同意。Mate 不會傳送 LINE、Email 或其他遠端訊息。切換私下補充時會安全地重建語音連線。","Ask for consent before using live transcription. Mate does not send remote messages. Switching between private and external modes safely reconnects voice.")}</p>
  </div>;
}
