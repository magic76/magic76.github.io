import {useEffect,useMemo,useRef,useState,type FormEvent} from "react";
import {type Soul,systemFor,remember,soulSubjectType} from "./soulData";
import {type SoulVisual} from "./soulVisual";
import {useLiveSession} from "../live/useLiveSession";
import {LiveControls} from "../live/LiveControls";
import {GuestLiveStarter} from "../live/GuestLiveStarter";
import {GuestTrialCountdown,GuestTrialFinish} from "../live/GuestTrialExperience";
import {geminiKey} from "../lib/runtime";
import {normalizeLiveVoice} from "../live/voiceIdentity";
import {trackUsageEvent} from "../analytics/usage";

/** Both voice and typed messages travel through the SAME Crew Friends Live session. */
export function SoulChat({soul,en,onChange,onVisual,onAudioLevel,overlay=false,scene=false}:{soul:Soul;en:boolean;onChange:()=>void;onVisual?:(visual:SoulVisual)=>void;onAudioLevel?:(level:number)=>void;overlay?:boolean;scene?:boolean}){
 const [guest,setGuest]=useState(false),[draft,setDraft]=useState(""),[error,setError]=useState("");
 const [typed,setTyped]=useState<string[]>([]);
 const captured=useRef(new Set<string>()),system=useMemo(()=>systemFor(soul,en),[soul,en]);
 // A Live connection or unsolicited AI greeting is not an effective conversation.
 const countedConversation=useRef(false),countedInput=useRef(false),countedReply=useRef(false);
 const recordInput=()=>{
  if(countedInput.current)return;
  countedInput.current=true;trackUsageEvent("souls_user_input");
 };
 const recordExchange=(turns:Array<{input?:string;output?:string}>)=>{
  if(!turns.some(turn=>Boolean(turn.input?.trim()&&turn.output?.trim())))return;
  recordInput();
  if(!countedReply.current){countedReply.current=true;trackUsageEvent("souls_ai_replied")}
  if(!countedConversation.current){countedConversation.current=true;trackUsageEvent("souls_conversation")}
 };
 const capture=(turns:Array<{input?:string;output?:string}>)=>{
  recordExchange(turns);
  const last=[...turns].reverse().find(t=>t.input?.trim()&&t.output?.trim());
  if(!last?.input||captured.current.has(last.input))return;
  captured.current.add(last.input);void remember(soul.id,last.input,onChange);
 };
 const live=useLiveSession({
  pageKey:"friend-soul-"+soul.id,title:"Crew Souls · "+soul.name,system,
  openingPrompt:en?"The user has opened your Soul portrait. Greet them warmly as the saved fictional character in one short sentence.":"使用者剛打開你的角色收藏。以你虛構角色的個性像老朋友一樣簡短打招呼，不要解釋系統。",
  voice:normalizeLiveVoice(soul.voice),language:en?"English":"中文",
  teacherReport:false,persistHistory:false,sessionKind:"friend",conversationFlow:"friend",
  onOutputLevel:level=>onAudioLevel?.(level),
  onTurnComplete:(_turn,turns)=>capture(turns),
  onSessionFinished:item=>{if(item)capture(item.turns)}
 });
 // Follow FriendLivePage: auto-start for BYOK after selection; guest uses the existing trial gate.
 useEffect(()=>{
  if(!geminiKey())return;
  const timer=window.setTimeout(()=>{void live.start()},0);
  return()=>window.clearTimeout(timer);
 },[live.start]);
 const active=["requesting-mic","connecting","listening","speaking","ending","reporting"].includes(live.state);
 const lastSpeech=live.turns.slice().reverse().find(turn=>turn.output?.trim())?.output||"";
 const caption=(live.output?.trim()||lastSpeech).slice(-130);
 const mood:SoulVisual["mood"]=live.state==="requesting-mic"||live.state==="connecting"?"thinking":
  /[!！?？]|哇|天啊|驚|wow|really/i.test(caption)?"surprised":
  /哈哈|開心|喜歡|好耶|太棒|笑|great|love|haha/i.test(caption)?"happy":
  live.voicePhase==="processing"||live.voicePhase==="recovering"?"thinking":"calm";
 useEffect(()=>{onVisual?.({state:live.state,caption,mood,hearing:live.voicePhase==="hearing"})},[onVisual,live.state,caption,mood,live.voicePhase]);
 const ready=live.state==="listening"||live.state==="speaking";
 const wasReady=useRef(false),wasError=useRef(false),wasStarting=useRef(false);
 useEffect(()=>{
  const starting=live.state==="requesting-mic"||live.state==="connecting";
  if(starting&&!wasStarting.current)trackUsageEvent("souls_live_attempt");
  wasStarting.current=starting;
  if(ready&&!wasReady.current)trackUsageEvent("souls_live_connected");
  wasReady.current=ready;
 },[ready]);
 useEffect(()=>{
  // Count a failed Live attempt without collecting microphone errors, prompts or transcripts.
  const failed=live.state==="error";
  if(failed&&!wasError.current)trackUsageEvent("souls_live_failed");
  wasError.current=failed;
 },[live.state]);
 // Guest Live intentionally skips onTurnComplete callbacks, but still publishes
 // confirmed transcript turns. Observe both for the same privacy-safe boolean events.
 useEffect(()=>{
  if(live.input.trim()||live.turns.some(turn=>Boolean(turn.input?.trim())))recordInput();
  recordExchange(live.turns);
 },[live.input,live.turns]);
 function send(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const value=draft.trim().slice(0,1200);if(!value)return;
  if(!ready){setError(en?"Connect Gemini Live first.":"請先連接 Gemini Live。");return}
  if(live.state==="speaking")live.interrupt();
  if(!live.sendText(value)){setError(en?"Live could not accept your message.":"Live 尚未接收這段文字，請再試。");return}
  recordInput();
  setTyped(messages=>[...messages,value].slice(-15));setDraft("");setError("");
  void remember(soul.id,value,onChange);
 }
 return <section className={(scene?"souls-chat-inline":"souls-panel")+(overlay?" souls-ar-chat":"")}>
  {scene?<div className="souls-live-conversation-head">
   <span className={"souls-live-presence"+(ready?" is-active":"")} aria-hidden="true"/>
   <strong>{en?"Talk with ":"和 "}{soul.name}{en?"":" 聊天"}</strong>
   <small>{ready?"LIVE":en?"VOICE CHAT":"語音聊天"}</small>
  </div>:<div className="souls-panel-title"><div><small>CREW FRIENDS · GEMINI LIVE</small>
   <h2>{en?"Talk to ":"和 "}{soul.name}{en?"":" 說說話"}</h2></div></div>}
  {!overlay&&!scene&&<p className="souls-muted">{en?"Speak or type: both use the same Gemini Live conversation. The first connection asks for microphone access.":"直接說話或打字，都是同一段 Gemini Live 對話；首次連線會要求麥克風權限。"}</p>}
  {scene&&<p className="souls-chat-hint">{soulSubjectType(soul)==="person"?
   (en?"Fictional character based on a photo, not the real person.":"以照片創作的虛構角色，不代表照片中的本人。"):
   ready?(en?"Speak naturally — your Soul can hear you.":"直接開口，Soul 就能聽見你。"):
   (en?"Start voice to bring your Soul to life.":"啟動語音，讓它開始跟你聊天。")}</p>}
  <div className="souls-voice">
   <div className="souls-live-console">
    {!geminiKey()&&!guest?<GuestLiveStarter role="friend" onGrant={async grant=>{setGuest(true);await live.start(grant)}}/>:
     guest&&(live.state==="ended"||live.state==="error")?<GuestTrialFinish expired={live.guestExpired} failed={live.state==="error"}/>:
     <LiveControls live={live} compact={active} prominentInterrupt/>}
    {guest&&live.state!=="ended"&&live.state!=="error"&&<GuestTrialCountdown secondsLeft={live.guestSecondsLeft}/>}
   </div>
   {scene&&<form className="souls-live-input souls-live-composer" onSubmit={send}>
    <input value={draft} maxLength={1200} onChange={e=>setDraft(e.target.value)}
     aria-label={en?"Live text":"Live 文字"} disabled={!ready}
     placeholder={ready?(en?"Message "+soul.name+"…":"傳訊息給 "+soul.name+"…"):(en?"Connect voice to type…":"連線後也能用文字聊天…")}/>
    <button disabled={!ready||!draft.trim()}>{en?"Send":"送出"}</button>
   </form>}
   {scene?<details className="souls-chat-history">
    <summary>{en?"Conversation history":"查看對話紀錄"}</summary>
   <div className={"souls-transcript"+(overlay?" souls-ar-transcript":"")} role="log">
    {live.turns.slice(-12).map((turn,i)=><div key={i}>
     {turn.input&&<p className="user"><strong>{en?"You":"你"}：</strong>{turn.input}</p>}
     {turn.output&&<p><strong>{soul.name}：</strong>{turn.output}</p>}
    </div>)}
    {typed.filter(value=>!live.turns.some(turn=>turn.input?.trim()===value)).map((value,i)=><p key={"typed-"+i} className="user"><strong>{en?"Typed":"打字"}：</strong>{value}</p>)}
   </div>
   </details>:<div className={"souls-transcript"+(overlay?" souls-ar-transcript":"")} role="log">
    {live.turns.slice(-12).map((turn,i)=><div key={i}>
     {turn.input&&<p className="user"><strong>{en?"You":"你"}：</strong>{turn.input}</p>}
     {turn.output&&<p><strong>{soul.name}：</strong>{turn.output}</p>}
    </div>)}
    {typed.filter(value=>!live.turns.some(turn=>turn.input?.trim()===value)).map((value,i)=><p key={"typed-"+i} className="user"><strong>{en?"Typed":"打字"}：</strong>{value}</p>)}
   </div>}
   {!scene&&<form className="souls-live-input" onSubmit={send}>
    <input value={draft} maxLength={1200} onChange={e=>setDraft(e.target.value)} aria-label={en?"Live text":"Live 文字"} disabled={!ready} placeholder={ready?(en?"Type into this Live session…":"在這段 Live 對話打字…"):(en?"Connect Live to type…":"連線後即可打字…")}/>
    <button disabled={!ready||!draft.trim()}>{en?"Send":"送出"}</button>
   </form>}
   {error&&<p role="alert" className="souls-error">{error}</p>}
  </div>
  {!geminiKey()&&<p className="souls-muted">{en?"Guest voice trial may be available. Auto-memory extraction requires a Gemini Key.":"可嘗試免費 Live 語音；自動擷取回憶需 Gemini Key。"}</p>}
 </section>;
}
