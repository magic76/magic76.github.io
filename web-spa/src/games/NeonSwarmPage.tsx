import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {getCrewFriend} from "../friends/friendProfiles";
import {FriendAvatar} from "../friends/FriendAvatar";
import {buildFriendSystem} from "../friends/friendMemory";
import {useTeacherStore} from "../store/teacherStore";
import {useLiveSession} from "../live/useLiveSession";
import {LiveControls} from "../live/LiveControls";
import {GameVoicePicker,useGameVoice,resolveGameVoice} from "./GameVoicePicker";
import {GameSpeechBubble} from "./GameSpeechBubble";
import {geminiKey} from "../lib/runtime";
import {trackUsageEvent} from "../analytics/usage";
import "./crewArcadeLab.css";
import "./neonSwarmPage.css";

type EventCode="game_start"|"game_win"|"game_lose"|"resume"|"dash"|"hit"|"kill"|"combo"|"milestone"|"boss"|"ability"|"choice_offer"|"choice";
const codes=new Set<EventCode>(["game_start","game_win","game_lose","resume","dash","hit","kill","combo","milestone","boss","ability","choice_offer","choice"]);
const important=new Set<EventCode>(["game_start","game_win","game_lose","hit","combo","milestone","boss","ability","choice_offer","choice"]);
const friend=getCrewFriend("zoe");
const choiceIn=(transcript:string):"fire"|"shield"|null=>{
 const normalized=transcript.toLowerCase().trim();
 if(/護盾|盾牌|防護|保護|防御|防禦|shield|defend|protect|シールド|防御/.test(normalized))return "shield";
 if(/火力|攻擊|攻撃|開火|火攻|射擊|fire|support|shoot|attack|ファイア/.test(normalized))return "fire";
 return null;
};

/** Stacked on the Arcade Lab PR: deterministic game inside same-origin iframe, Gemini Live outside it. */
export function NeonSwarmPage(){
 const {i18n}=useTranslation("home");
 const zh=Boolean(i18n.resolvedLanguage?.startsWith("zh"));
 const targetLanguage=useTeacherStore(s=>s.targetLanguage);
 const nativeLanguage=useTeacherStore(s=>s.nativeLanguage);
 const friendMode=useTeacherStore(s=>s.friendChatMode);
 const {gameVoice,setGameVoice}=useGameVoice();
 const iframe=useRef<HTMLIFrameElement>(null);
 const choiceOpen=useRef(false);
 const delivered=useRef(0);
 const [cue,setCue]=useState({id:0,text:""});
 const [lastReply,setLastReply]=useState("");
 const [frameHeight,setFrameHeight]=useState(1020);
 const [message,setMessage]=useState("");

 const post=(payload:{type:string;text?:string;ability?:"fire"|"shield"})=>{
  try{iframe.current?.contentWindow?.postMessage(payload,window.location.origin)}catch{/* Safe fallback: game buttons remain available. */}
 };
 const system=buildFriendSystem(friend,targetLanguage,nativeLanguage,friendMode)+
  "\n[NEON SWARM · ZOE TACTICAL CO-OP] The player is in a bright cyberpunk top-down shooter battling robot swarms. You are Zoe, a friendly, witty tactical co-op teammate. Keep spoken messages extremely short (normally one sentence, ideally under 12 words), natural and encouraging; the user needs to concentrate on playing. Respond only to [VERIFIED GAME] events for score, damage, milestones and outcomes, and never invent hits, kills, upgrades or victory. The local deterministic engine alone owns score, collisions, HP, shields, boss health and win/lose state. At a [VERIFIED GAME] choice_offer, offer precisely two choices: fire support or quantum shield. The player can answer in speech or tap a button. The game pauses until a valid answer; never claim a skill was selected without a [VERIFIED GAME] choice event. Fire support improves rate of fire and activates a turret; shield heals and grants temporary shielding. Do not send commands to control the physical game world. This is a casual game conversation, not a language lesson. Never retain in Friend memory.";

 const live=useLiveSession({
  pageKey:"neon-swarm-v2-zoe",
  title:"Neon Swarm · Zoe Live",
  system,
  openingPrompt:"Give a short energetic hello, then let the player play. Invite them to speak naturally if they want help.",
  voice:resolveGameVoice(gameVoice,friend.voice),
  language:targetLanguage,nativeLanguage,sessionKind:"friend",persistHistory:false,teacherReport:false,
  onTurnComplete:turn=>{
   // The game engine is paused at the choice. This spoken decision may arrive only
   // after a confirmed Live turn, so on-screen buttons remain the guaranteed fallback.
   if(choiceOpen.current&&typeof turn.input==="string"){
    const ability=choiceIn(turn.input);
    if(ability){post({type:"crew-neon-choice",ability});choiceOpen.current=false;}
   }
   if(turn.output?.trim()){const output=turn.output.trim();setLastReply(output);post({type:"crew-neon-ai-reply",text:output});}
  }
 });
 const voiceActive=["requesting-mic","connecting","listening","speaking"].includes(live.state);
 const hasKey=Boolean(geminiKey());

 useEffect(()=>{
  const onMessage=(event:MessageEvent)=>{
   if(event.source!==iframe.current?.contentWindow||event.origin!==window.location.origin)return;
   const data=event.data as {type?:unknown;code?:unknown;description?:unknown}|null;
   if(!data||data.type!=="crew-neon-event"||typeof data.code!=="string"||!codes.has(data.code as EventCode))return;
   const code=data.code as EventCode;
   const detail=typeof data.description==="string"?data.description.slice(0,145):"";
   if(code==="game_start"){choiceOpen.current=false;trackUsageEvent("game_started","neon-swarm");}
   if(code==="game_win"||code==="game_lose"){choiceOpen.current=false;trackUsageEvent("game_completed","neon-swarm");}
   if(code==="choice_offer")choiceOpen.current=true;
   if(code==="choice")choiceOpen.current=false;
   if(important.has(code))setCue(s=>({id:s.id+1,text:"Neon Swarm · "+code+(detail?": "+detail:"")}));
   if(code==="choice_offer")setMessage(zh?"Zoe 正在等你選火力或護盾；可以用說的，也能直接按鈕。":"Choose fire support or shield by voice or button.");
   if(code==="choice")setMessage(zh?"技能已啟動，繼續戰鬥！":"Ability selected. Keep fighting!");
  };
  window.addEventListener("message",onMessage);
  return()=>window.removeEventListener("message",onMessage);
 },[zh]);

 useEffect(()=>{
  if(!voiceActive)delivered.current=Math.max(delivered.current,cue.id);
  if(live.state==="listening"&&cue.id>delivered.current&&live.sendText("[VERIFIED GAME] "+cue.text))delivered.current=cue.id;
 },[voiceActive,live.state,live.sendText,cue]);
 useEffect(()=>{
  if(live.state==="idle"||live.state==="error")post({type:"crew-neon-live-disconnected"});
 },[live.state]);
 useEffect(()=>{
  document.body.classList.add("teacher-theme");
  trackUsageEvent("game_open","neon-swarm");
  return()=>document.body.classList.remove("teacher-theme");
 },[]);
 const resize=()=>{
  try{
   const doc=iframe.current?.contentDocument;
   if(!doc)return;
   const h=Math.max(doc.documentElement.scrollHeight,doc.body.scrollHeight);
   if(Number.isFinite(h))setFrameHeight(Math.min(2300,Math.max(830,h+8)));
  }catch{/* Keep the safe fixed-height fallback. */}
 };
 return <main className="crew-arcade-route crew-neon-route">
  <div className="crew-arcade-head"><Link to="/games">← {zh?"所有遊戲":"All games"}</Link>
   <span>NEON SWARM · PLAYABLE SLICE</span></div>
  <div className="crew-neon-preflight"><strong>⚡ Neon Swarm</strong><span>{zh?"單局約 35–60 秒 · 免費直接玩":"35–60 sec · Free to play"}</span>
   {hasKey&&!voiceActive?<button type="button" onClick={()=>{delivered.current=cue.id;void live.start()}}>{zh?"開啟 Zoe 語音陪玩":"Start Zoe voice"}</button>:voiceActive?<span className="crew-neon-voice-connected">● Zoe Live</span>:null}
  </div>
  <iframe ref={iframe} className="crew-arcade-iframe crew-neon-frame"
   title={zh?"Neon Swarm 霓虹射擊：可玩戰鬥畫面":"Neon Swarm: playable shooter"}
   src="/neon-swarm-v2.html" height={frameHeight}
   sandbox="allow-same-origin allow-scripts"
   onLoad={()=>{resize();window.requestAnimationFrame(resize);window.setTimeout(resize,800)}}/>
  <section className="crew-arcade-voice">
   <div className="crew-arcade-voice-head"><FriendAvatar friend={friend}/><div>
    <strong>Zoe · {zh?"真正的 AI 陪玩":"Real AI co-op voice"}</strong>
    <p>{zh?"本地遊戲判定，Zoe 只負責聊天和戰術選擇。":"Game logic stays local; Zoe can suggest and select upgrades."}</p>
   </div></div>
   {message?<p className="crew-neon-status" role="status">{message}</p>:null}
   {voiceActive&&lastReply?<GameSpeechBubble text={lastReply} english={!zh}/>:null}
   <GameVoicePicker value={gameVoice} onChange={setGameVoice} disabled={voiceActive} english={!zh} defaultVoice={friend.voice}/>
   {voiceActive?<LiveControls live={live} compact prominentInterrupt/>:
    hasKey?<button type="button" className="crew-arcade-connect" onClick={()=>{delivered.current=cue.id;void live.start()}}>{zh?"連線 Zoe Gemini Live":"Connect Zoe Gemini Live"}</button>:
    <p className="crew-arcade-keyless">{zh?"遊戲本體免帳號、免 Key。要與 Zoe 即時說話，需要設定 Gemini Key；不設定也能用選項完成技能決策。":"No account or key needed for gameplay. To talk with Zoe, configure Gemini Key. Buttons always work."} <Link to="/settings">{zh?"設定":"Settings"}</Link></p>}
   {live.state==="error"?<p role="alert" className="crew-arcade-keyless">{zh?"Zoe 語音連線失敗，不影響遊戲。":"Voice failed, gameplay still works."} <button type="button" onClick={()=>void live.start()}>{zh?"重試":"Retry"}</button></p>:null}
   <small>{zh?"離線遊戲內的 Zoe 台詞標為 DEMO，與 Gemini Live 真正對話時才會顯示 LIVE；語音選技能需等辨識完成，按鈕隨時可用。":"Offline dialogue is DEMO. Only confirmed Gemini Live replies are marked LIVE. Buttons work without ASR delay."}</small>
  </section>
 </main>;
}
