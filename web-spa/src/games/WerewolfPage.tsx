import {Arrow} from "../components/Arrow";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {getCrewFriend} from "../friends/friendProfiles";
import {FriendAvatar} from "../friends/FriendAvatar";
import {trackUsageEvent} from "../analytics/usage";
import {geminiKey} from "../lib/runtime";
import {generateWolfReply} from "./werewolfAI";
import {startWerewolfLive,type WolfVoiceController,type WolfVoiceCommand} from "./werewolfLive";
import {GameVoicePicker,useGameVoice,resolveGameVoice} from "./GameVoicePicker";
import {makeWolfGame,takeNightAction,recordSpeech,startWolfVote,castWolfVote,expectedNightActions,humanRole,
 type WolfGame,type WolfRole,type WolfLanguage,type WolfAction} from "./werewolfEngine";
import {TR,L,localEvent,openingSpeeches} from "./werewolfPresentation";
import "./crewPlay.css";
import "./werewolf.css";

export function WerewolfPage(){
 const {i18n}=useTranslation("home");
 const zh=i18n.resolvedLanguage?.startsWith("zh")??true;
 const [language,setLanguage]=useState<WolfLanguage>(zh?"zh":"en");
 const [roleChoice,setRoleChoice]=useState<WolfRole|"random">("random");
 const [game,setGame]=useState<WolfGame|null>(null);
 const currentRef=useRef<WolfGame|null>(null);
 const [selected,setSelected]=useState("");
 const [addressed,setAddressed]=useState("");
 const [draft,setDraft]=useState("");
 const [busy,setBusy]=useState(false);
 const busyRef=useRef(false);
 const [notice,setNotice]=useState("");
 const [error,setError]=useState("");
 const [voiceStatus,setVoiceStatus]=useState<"off"|"connecting"|"ready">("off");
 const [speaking,setSpeaking]=useState(false);
 const [muted,setMuted]=useState(false);
 const [liveCaption,setLiveCaption]=useState("");
 const [hostSpeech,setHostSpeech]=useState("");
 const {gameVoice,setGameVoice}=useGameVoice();
 const [micPhase,setMicPhase]=useState<"speaking"|"waiting">("waiting");
 const [audioIssue,setAudioIssue]=useState("");
 const liveRef=useRef<WolfVoiceController|null>(null);
 const requestRef=useRef(0);
 const voiceGenerationRef=useRef(0);
 const mountedRef=useRef(true);
 const [showHistory,setShowHistory]=useState(true);
 const transcriptRef=useRef<HTMLDivElement|null>(null);
 const composeRef=useRef<HTMLTextAreaElement|null>(null);
 const followHistoryRef=useRef(true);
 const isZh=language==="zh";
 const keyReady=typeof window!=="undefined"&&Boolean(geminiKey());
 useEffect(()=>{
  const log=transcriptRef.current;
  if(showHistory&&log&&followHistoryRef.current)log.scrollTop=log.scrollHeight;
 },[game?.entries.length,game?.phase,showHistory]);
 const handleHistoryScroll=()=>{
  const log=transcriptRef.current;
  if(log)followHistoryRef.current=log.scrollHeight-log.scrollTop-log.clientHeight<30;
 };
 const toggleHistory=()=>{
  if(!showHistory)followHistoryRef.current=true;
  setShowHistory(current=>!current);
 };
 useEffect(()=>{mountedRef.current=true;trackUsageEvent("game_open","werewolf");document.body.classList.add("teacher-theme");return()=>{
  mountedRef.current=false;requestRef.current++;voiceGenerationRef.current++;liveRef.current?.stop();document.body.classList.remove("teacher-theme");
 }},[]);
 const commit=(next:WolfGame,announcement="",speaker?:string)=>{
  const previous=currentRef.current;
  currentRef.current=next;setGame(next);
  if(previous?.phase!=="finished"&&next.phase==="finished")trackUsageEvent("game_completed","werewolf");
  if(announcement&&liveRef.current){
   // Let the Live function tool response finish before sending the authoritative phase update.
   window.setTimeout(()=>{if(currentRef.current===next)liveRef.current?.update(next,announcement,speaker)},60);
  }
 };
 const endVoice=()=>{
  voiceGenerationRef.current++;
  liveRef.current?.stop();liveRef.current=null;setVoiceStatus("off");setSpeaking(false);setMuted(false);setLiveCaption("");setHostSpeech("");setMicPhase("waiting");setAudioIssue("");
 };
 const reset=()=>{requestRef.current++;endVoice();currentRef.current=null;setGame(null);setDraft("");setSelected("");setAddressed("");setNotice("");setError("");busyRef.current=false;setBusy(false)};
 const start=()=>{
  reset();
  const next=makeWolfGame(Math.random,roleChoice);
  currentRef.current=next;setGame(next);
  trackUsageEvent("game_started","werewolf");
 };
 const night=(action:WolfAction)=>{
  const current=currentRef.current;
  if(!current||current.phase!=="night")return {ok:false,error:"Night is over"};
  try{
   let next=takeNightAction(current,action);
   next=openingSpeeches(next,isZh);
   setSelected("");setAddressed("");setNotice("");
   commit(next,localEvent(next.entries.slice().reverse().find(e=>e.kind==="system")!,isZh));
   return {ok:true};
  }catch(err){const message=err instanceof Error?err.message:"Invalid night action";setError(message);return {ok:false,error:message}}
 };
 const openVote=()=>{
  const current=currentRef.current;
  if(!current||current.phase!=="day"||busyRef.current)return {ok:false,error:"Finish the discussion first"};
  const next=startWolfVote(current);setSelected("");setError("");commit(next,L(isZh,"開始公投，請選擇一位存活玩家。","Voting has begun. Choose a living player."));return {ok:true};
 };
 const vote=(id:string|null)=>{
  const current=currentRef.current;
  if(!current||current.phase!=="vote")return {ok:false,error:"Voting is closed"};
  try{
   const next=castWolfVote(current,id);
   commit(next,next.winner?L(isZh,"遊戲結束！","Game over!"):"Vote counted. A new night begins.");
   setSelected("");setError("");setNotice("");
   return {ok:true};
  }catch(err){const message=err instanceof Error?err.message:"Invalid vote";setError(message);return {ok:false,error:message}}
 };
 const speak=(spoken:string,to?:string)=>{
  const current=currentRef.current;
  if(!current||current.phase!=="day"||!current.players[0].alive||busyRef.current)return {ok:false,error:"Discussion is unavailable"};
  const text=spoken.trim();
  if(!text)return {ok:false,error:"Please say something"};
  busyRef.current=true;setBusy(true);setError("");setNotice("");
  const stamp=++requestRef.current;
  const next=recordSpeech(current,"you",text);
  commit(next);
  setDraft("");
  const aliveNpcs=next.players.filter(p=>p.alive&&!p.human);
  // Plain typing "Zoe, why..." should address Zoe even without selecting the dropdown.
  const named=aliveNpcs.find(p=>new RegExp("\\b"+p.name+"\\b","i").test(text));
  const npc=aliveNpcs.find(p=>p.id===to)||named||
   aliveNpcs[(next.entries.filter(e=>e.speaker==="you").length-1)%aliveNpcs.length];
  if(!npc){busyRef.current=false;setBusy(false);return {ok:true}}
  void (async()=>{
   const answer=await generateWolfReply(next,npc.id,text,language);
   if(!mountedRef.current||stamp!==requestRef.current||currentRef.current?.phase!=="day")return;
   try{const updated=recordSpeech(currentRef.current,npc.id,answer);commit(updated,answer,npc.name);}catch{/* Game phase changed while waiting. */}
   busyRef.current=false;setBusy(false);
  })();
  return {ok:true};
 };
 // Live can only request a command. All state checks and mutations stay in the rules engine.
 const dispatchVoice=(command:WolfVoiceCommand):{ok:boolean;error?:string}=>{
  const current=currentRef.current;
  if(!current)return {ok:false,error:"Game not started"};
  switch(command.kind){
   case "statement":return speak(command.text,command.to);
   case "open_vote":return openVote();
   case "vote":return vote(command.target);
   case "night":return night({kind:command.action,target:command.target});
  }
 };
 const connectVoice=async()=>{
  const current=currentRef.current;
  if(!current||voiceStatus!=="off")return;
  if(!geminiKey()){setError(L(isZh,"請先在設定填入 Gemini Key。","Add a Gemini Key in Settings to enable Live."));return}
  const stamp=++voiceGenerationRef.current;
  setVoiceStatus("connecting");setError("");setAudioIssue("");setMicPhase("waiting");
  try{
   const control=await startWerewolfLive(current,language,dispatchVoice,{
    onReady:()=>{if(mountedRef.current&&voiceGenerationRef.current===stamp)setVoiceStatus("ready")},
    onSpeaking:setSpeaking,
    onTranscript:value=>{setLiveCaption(value);if(value.trim())setAudioIssue("")},
    onMicPhase:phase=>{setMicPhase(phase);if(phase==="speaking")setAudioIssue("")},
    onAudioIssue:()=>setAudioIssue(L(isZh,"尚未收到語音辨識結果。請確認麥克風權限與音訊輸入，或再說一次。","Speech transcription did not arrive. Check your microphone/audio input or try again.")),
    onHostSpeech:setHostSpeech,
    onError:message=>{if(mountedRef.current&&voiceGenerationRef.current===stamp){liveRef.current=null;setVoiceStatus("off");setSpeaking(false);setError(message)}}
   },resolveGameVoice(gameVoice,"Puck"));
   if(!mountedRef.current||voiceGenerationRef.current!==stamp){control.stop();return}
   liveRef.current=control;setVoiceStatus("ready");
  }catch(err){
   if(voiceGenerationRef.current!==stamp)return;
   setVoiceStatus("off");setError(L(isZh,"Live 無法連線，可繼續文字模式。","Live unavailable. Text mode is still playable.")+" "+(err instanceof Error?err.message:""));
  }
 };
 const submit=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();speak(draft,addressed||undefined)};
 const human=game?.players[0];
 const nightKinds=game?expectedNightActions(game):[];
 const pickTargets=game?.players.filter(p=>p.alive&&!p.human)||[];
 const phaseTitle=game?.phase==="night"?L(isZh,"黑夜降臨","Night falls"):
  game?.phase==="day"?L(isZh,"白天討論","Day discussion"):
  game?.phase==="vote"?L(isZh,"公投時間","Voting time"):L(isZh,"本局結束","Game over");
 const lastNotes=game?.privateNotes.slice(-4)||[];
 const latestNpc=game?.entries.slice().reverse().find(entry=>entry.kind==="speech"&&entry.speaker!=="you"&&entry.speaker!=="system");
 const latestNpcName=latestNpc?game?.players.find(player=>player.id===latestNpc.speaker)?.name||latestNpc.speaker:"";
 const quickLines=isZh?[
  "昨晚的線索有什麼矛盾？",
  "你為什麼懷疑其他人？",
  "誰能替你的說法作證？"
 ]:[
  "What doesn't add up about last night?",
  "Why do you suspect someone else?",
  "Who can back up your story?"
 ];
 const useQuickLine=(line:string)=>{
  setDraft(current=>current.trim()?current.trim()+" "+line:line);
  composeRef.current?.focus();
 };
 return <div className="crew-play-page wolf-page">
  <header className="wolf-header">
   <Link to="/games" className="crew-play-back"><Arrow direction="left"/> {L(zh,"全部遊戲","All games")}</Link>
   <span className="crew-play-eyebrow">CREW PLAY / SOCIAL DEDUCTION</span>
   <h1>{L(zh,"AI 狼人殺","AI Werewolf")}</h1>
   <p>{L(zh,"1 位真人 + 5 位 AI 朋友。推理、質疑與投票；免 Key 提供文字單機模式。","One human, five AI friends. Bluff, deduce, debate and vote your way to victory.")}</p>
  </header>
  {!game?<section className="wolf-setup">
   <div className="wolf-setup-stage"><span className="wolf-moon">☾</span><div><strong>{L(zh,"迷霧村莊正在等你","The village is waiting")}</strong><small>{L(zh,"6 人快速局 · 1 狼人、1 預言家、1 女巫、3 村民","6 seats · 1 wolf, 1 seer, 1 witch, 3 villagers")}</small></div></div>
   <div className="wolf-field"><label htmlFor="wolf-language">{L(zh,"遊戲對話語言","Game language")}</label><select id="wolf-language" value={language} onChange={e=>setLanguage(e.target.value as WolfLanguage)}><option value="zh">繁體中文</option><option value="en">English</option></select></div>
   <div className="wolf-field"><label htmlFor="wolf-role">{L(zh,"你的角色（測試版可指定）","Your role (test edition)")}</label><select id="wolf-role" value={roleChoice} onChange={e=>setRoleChoice(e.target.value as WolfRole|"random")}><option value="random">{L(isZh,"隨機身分 · 推薦","Random · recommended")}</option>{Object.entries(TR).map(([id,r])=><option key={id} value={id}>{r[language]}</option>)}</select></div>
   <div className="wolf-rules"><strong>{L(isZh,"遊戲規則","Rules")}</strong><p>{L(isZh,"黑夜由狼人襲擊、預言家查驗、女巫用藥；白天自由討論後公投。狼人全部出局則村民勝；狼人達到存活人數的一半則狼勝。","At night, the wolf attacks, the seer checks, and the witch can use a potion. Discuss and vote by day. The village wins when the wolf dies; the wolf wins at parity.")}</p></div>
   <button type="button" className="wolf-primary" onClick={start}>{L(isZh,"開始第一晚","Start night one")} <Arrow/></button>
   <p className="wolf-footnote">{L(isZh,"免 Key 是情境台詞的文字單機演練，不具自由理解能力。Gemini Key 才有真正的 AI 角色回應與 Live 語音。","Without a key, text replies are scripted for each situation. Use a Gemini Key for real AI replies and Live voice.")}</p>
  </section>:<div className="wolf-shell">
   <div className={"wolf-world "+(game.phase==="night"?"is-night":game.phase==="finished"?"is-finished":"is-day")}>
    <div className="wolf-world-top"><span>✦ {L(isZh,"第","Day ")}{game.day}{isZh?" 天":""}</span><span>{game.phase==="night"?"☾":"☀"} {phaseTitle}</span><button type="button" onClick={reset}>{L(isZh,"重新開局","New game")}</button></div>
    <div className="wolf-world-icon" aria-hidden="true">{game.phase==="night"?"☾":game.phase==="finished"?(game.winner==="village"?"✦":"♜"):"☀"}</div>
    <strong>{phaseTitle}</strong>
    <small>{game.phase==="finished"?L(isZh,game.winner==="village"?"村民陣營獲勝":"狼人陣營獲勝",game.winner==="village"?"The village wins":"The wolf wins"):L(isZh,"所有行動由遊戲規則引擎驗證","Every move is verified by the rules engine")}</small>
   </div>
   <section className="wolf-identity" aria-label={L(isZh,"你的祕密身分","Your secret role")}>
    <div><small>{L(isZh,"你的祕密身分 · 不會公開給 AI 村民","YOUR SECRET ROLE · HIDDEN FROM NPCS")}</small><strong>{TR[human!.role][language]}</strong><p>{language==="zh"?TR[human!.role].hintZh:TR[human!.role].hintEn}</p></div>
    <span aria-hidden="true">{human!.role==="wolf"?"♜":human!.role==="seer"?"◉":human!.role==="witch"?"✧":"♙"}</span>
   </section>
   <section className="wolf-seats" aria-label={L(isZh,"玩家狀態","Players")}>
    {game.players.map(p=><div key={p.id} className={"wolf-seat "+(!p.alive?"is-dead":"")+(p.human?" is-you":"")}>
      {p.human?<span className="wolf-human-icon" aria-hidden="true">你</span>:<FriendAvatar friend={getCrewFriend(p.id)}/>}
      <strong>{p.human?L(isZh,"你","You"):p.name}</strong>
      <small>{p.alive?L(isZh,"存活","Alive"):L(isZh,"出局","Out")}</small>
      {game.phase==="finished"?<small className="wolf-role-reveal">{TR[p.role][language]}</small>:null}
     </div>)}
   </section>
   {lastNotes.length?<section className="wolf-secret" aria-label={L(isZh,"只有你知道的夜間情報","Your private information")}><strong>◉ {L(isZh,"你的秘密情報","Your private notes")}</strong>
    {lastNotes.map((note,i)=><p key={i}>{isZh?note.replace(" is a wolf."," 是狼人。").replace(" is not a wolf."," 不是狼人。").replace("You saved tonight's target.","你成功救下昨晚的目標。").replace("You used your poison.","你已使用毒藥。"):note}</p>)}
   </section>:null}
   <section className={"wolf-voice"+(voiceStatus==="ready"?" is-connected":"")}>
    <div><strong>🎙 {L(isZh,"Gemini Live 語音對話","Gemini Live voice chat")}</strong><small>{voiceStatus==="ready"?(speaking?L(isZh,"主持人正在說話","Host is speaking"):muted?L(isZh,"麥克風已靜音","Mic muted"):micPhase==="speaking"?L(isZh,"正在收音…","Hearing your voice…"):L(isZh,"正在聆聽，可直接與 NPC 對話或投票","Listening — talk directly to an NPC or vote")):voiceStatus==="connecting"?L(isZh,"正在連接語音模型與麥克風…","Connecting voice and microphone…"):L(isZh,"點開始後直接說話，AI 將念出 NPC 的回覆","Start Live to speak and hear NPC replies.")}</small></div>
    {voiceStatus==="off"?<button type="button" className="wolf-secondary" disabled={!keyReady||game.phase==="finished"} onClick={()=>{void connectVoice()}}>{L(isZh,"開啟語音對話","Start voice chat")}</button>:
     voiceStatus==="connecting"?<button type="button" className="wolf-secondary" onClick={endVoice}>{L(isZh,"取消連線","Cancel")}</button>:
     <div className="wolf-voice-buttons"><button type="button" className="wolf-secondary" onClick={()=>setMuted(liveRef.current?.mute()??false)}>{muted?L(isZh,"開麥克風","Unmute"):L(isZh,"靜音","Mute")}</button><button type="button" className="wolf-secondary" onClick={endVoice}>{L(isZh,"結束語音","Stop voice")}</button></div>}
    <details className="wolf-voice-options">
     <summary>{L(isZh,"語音音色","Voice settings")}</summary>
     <GameVoicePicker value={gameVoice} onChange={setGameVoice} defaultVoice="Puck" disabled={voiceStatus!=="off"} english={!isZh}/>
    </details>
    {!keyReady?<Link to="/settings" className="wolf-key-link">{L(isZh,"設定 Gemini Key","Set up Gemini Key")}</Link>:null}
    {voiceStatus==="ready"?<div className="wolf-live-transcript" aria-live="polite">
     <span className="wolf-live-connected">● {L(isZh,"語音已連線","Voice connected")}</span>
     {liveCaption?<p><strong>{L(isZh,"你說：","You: ")}</strong>{liveCaption.slice(-180)}</p>:null}
     {hostSpeech?<p><strong>{L(isZh,"旁觀主持：","Referee: ")}</strong>{hostSpeech.slice(-200)}</p>:null}
     {!liveCaption&&!hostSpeech?<p>{L(isZh,"例如：「Zoe，妳為什麼懷疑 Max？」","Try: Zoe, why are you suspicious of Max?")}</p>:null}
     {audioIssue?<p className="wolf-audio-issue" role="status">{audioIssue}</p>:null}
    </div>:null}
   </section>
   <section className="wolf-history">
    <button type="button" className="wolf-history-toggle" aria-expanded={showHistory} onClick={toggleHistory}><strong>{L(isZh,"最新對話","Latest conversation")} · {game.entries.length}</strong><Arrow direction={showHistory?"up":"down"} className="crew-arrow--plain"/></button>
    {showHistory?<div className="wolf-log" role="log" aria-label={L(isZh,"最新對話","Latest conversation")} ref={transcriptRef} onScroll={handleHistoryScroll}>{game.entries.slice(-24).map((entry,index)=><div key={game.entries.length-24+index} className={"wolf-log-entry kind-"+entry.kind}>
     <strong>{entry.speaker==="system"?L(isZh,"主持人","Moderator"):entry.speaker==="you"?L(isZh,"你","You"):game.players.find(p=>p.id===entry.speaker)?.name||entry.speaker}</strong>
     <p>{localEvent(entry,isZh)}</p></div>)}{busy?<p className="wolf-chat-typing" role="status">{L(isZh,"AI 角色正在回覆…","NPC is replying…")}</p>:null}</div>:null}
   </section>
   {game.phase==="night"?<section className="wolf-control" aria-label={L(isZh,"夜晚行動","Night action")}>
    <h2>{L(isZh,"夜晚行動","Night action")}</h2>
    <p>{!human!.alive?L(isZh,"你已出局，按下方按鈕觀戰。","You have been eliminated. Continue as a spectator."):
     human!.role==="wolf"?L(isZh,"選擇今晚要襲擊的人。","Choose a player to attack tonight."):
     human!.role==="seer"?L(isZh,"選一個人查驗他的身分，結果只有你看得到。","Inspect a player. Only you see the result."):
     human!.role==="witch"?L(isZh,"解藥可以救下今晚的目標；毒藥能淘汰一人。每晚只能用一瓶。","You can save tonight's victim or poison someone. Only one potion per night."):
     L(isZh,"村民今晚先睡覺，等待天亮。","The villager sleeps until morning.")}</p>
    {human!.alive&&human!.role==="witch"&&game.pendingKill?<div className="wolf-night-threat">{L(isZh,"今晚預定遇害：","Tonight's victim: ")}<strong>{game.players.find(p=>p.id===game.pendingKill)?.name||"?"}</strong></div>:null}
    {nightKinds.some(kind=>["kill","check","poison"].includes(kind))?<div className="wolf-targets">{pickTargets.map(p=><button type="button" key={p.id} aria-pressed={selected===p.id} className={selected===p.id?"selected":""} onClick={()=>setSelected(p.id)}><FriendAvatar friend={getCrewFriend(p.id)}/>{p.name}</button>)}</div>:null}
    <div className="wolf-actions">
     {nightKinds.includes("kill")?<button type="button" className="wolf-primary" disabled={!selected} onClick={()=>night({kind:"kill",target:selected})}>{L(isZh,"襲擊目標","Attack target")}</button>:null}
     {nightKinds.includes("check")?<button type="button" className="wolf-primary" disabled={!selected} onClick={()=>night({kind:"check",target:selected})}>{L(isZh,"查驗身分","Inspect identity")}</button>:null}
     {nightKinds.includes("save")?<button type="button" className="wolf-primary" onClick={()=>night({kind:"save"})}>{L(isZh,"使用解藥","Use heal")}</button>:null}
     {nightKinds.includes("poison")?<button type="button" className="wolf-primary" disabled={!selected} onClick={()=>night({kind:"poison",target:selected})}>{L(isZh,"使用毒藥","Use poison")}</button>:null}
     {nightKinds.includes("skip")?<button type="button" className="wolf-secondary" onClick={()=>night({kind:"skip"})}>{L(isZh,"天亮／不用藥","Continue to dawn")}</button>:null}
    </div>
   </section>:null}
   {game.phase==="day"?<section className="wolf-control">
    <div className="wolf-control-title"><h2>{L(isZh,"村莊討論","Village debate")}</h2><button type="button" className="wolf-secondary" disabled={busy} onClick={openVote}>{L(isZh,"結束討論，投票","Start voting")} <Arrow/></button></div>
    {human!.alive?<form onSubmit={submit} className="wolf-compose">
     {latestNpc?<div className="wolf-latest-reply" role="status" aria-live="polite">
      <div className="wolf-latest-reply-top"><strong>{latestNpcName} · {L(isZh,"最新回覆","Latest reply")}</strong>
       <button type="button" onClick={()=>{followHistoryRef.current=true;setShowHistory(true);window.requestAnimationFrame(()=>{const log=transcriptRef.current;if(!log)return;log.scrollTop=log.scrollHeight;log.scrollIntoView({behavior:"auto",block:"nearest"})})}}>{L(isZh,"查看對話","View chat")}</button></div>
      <p>{localEvent(latestNpc,isZh)}</p>
     </div>:null}
     <div className="wolf-quick-lines" role="group" aria-label={L(isZh,"發言靈感","Conversation starters")}>
      {quickLines.map(line=><button type="button" key={line} disabled={busy} onClick={()=>useQuickLine(line)}>{line}</button>)}
     </div>
     <label htmlFor="wolf-address">{L(isZh,"想指定誰回答？","Ask a specific NPC")}</label>
     <select id="wolf-address" value={addressed} onChange={e=>setAddressed(e.target.value)}><option value="">{L(isZh,"自由發言，由角色接話","Open discussion")}</option>{pickTargets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
     <label htmlFor="wolf-text">{L(isZh,"說出懷疑或提出問題","Accuse, defend or ask")}</label>
     <textarea ref={composeRef} id="wolf-text" maxLength={260} rows={3} value={draft} onChange={e=>setDraft(e.target.value)} placeholder={L(isZh,"例如：Zoe，為什麼妳一直替 Max 說話？","Zoe, why do you keep defending Max?")} />
     <button type="submit" className="wolf-primary" disabled={!draft.trim()||busy}>{busy?L(isZh,"AI 正在思考…","NPC is thinking…"):L(isZh,"發言／質疑","Speak / challenge")}</button>
    </form>:<p>{L(isZh,"你已出局，可以觀戰並等待下一回合。","You're eliminated. You can watch the debate.")}</p>}
   </section>:null}
   {game.phase==="vote"?<section className="wolf-control">
    <h2>{L(isZh,"你要投給誰？","Who gets your vote?")}</h2>
    <p>{L(isZh,"只能投存活玩家。AI 角色各自投票，平票則本日無人出局。","Vote for any living player. NPCs vote independently; ties eliminate nobody.")}</p>
    {human!.alive?<div className="wolf-targets">{game.players.filter(p=>p.alive).map(p=><button key={p.id} type="button" aria-pressed={selected===p.id} className={selected===p.id?"selected":""} onClick={()=>setSelected(p.id)}>{p.human?<span className="wolf-human-icon">你</span>:<FriendAvatar friend={getCrewFriend(p.id)}/>}<span>{p.human?L(isZh,"你","You"):p.name}</span></button>)}</div>:null}
    <div className="wolf-actions"><button type="button" className="wolf-primary" disabled={human!.alive&&!selected} onClick={()=>vote(human!.alive?selected:null)}>{human!.alive?L(isZh,"確認投票","Cast vote"):L(isZh,"觀看投票結果","View votes")}</button>{human!.alive?<button type="button" className="wolf-secondary" onClick={()=>vote(null)}>{L(isZh,"棄票","Abstain")}</button>:null}</div>
   </section>:null}
   {game.phase==="finished"?<section className="wolf-control wolf-finale">
    <h2>{game.winner==="village"?L(isZh,"村莊恢復和平","The village is safe"):L(isZh,"狼人佔領了村莊","The wolf takes over")}</h2>
    <p>{L(isZh,"這局所有角色已公開。再玩一局，試試不同身分！","All roles are revealed. Play again with a new identity!")}</p>
    <button type="button" className="wolf-primary" onClick={reset}>{L(isZh,"再玩一次","Play again")}</button>
   </section>:null}
   {notice?<p className="wolf-notice" role="status">{notice}</p>:null}
   {error?<p className="wolf-error" role="alert">{error}</p>:null}
   <p className="wolf-footnote">{L(isZh,"單機測試版：AI 角色不知道其他人的身分；身分與勝負由前端規則驗證。正式多人對戰需要改為伺服器保存秘密。","Single-player prototype: AI roles receive only private knowledge. A server is required to keep secrets secure in multiplayer.")}</p>
  </div>}
 </div>;
}
