import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import arcadeHtml from "./crewArcadeLab.html?raw";
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

type GameId="runner"|"shooter"|"rpg"|"blaster";
type Cue={id:number;text:string};
const details:Record<GameId,"sky-sprint"|"neon-swarm"|"tiny-quest"|"robo-escape">={
 runner:"sky-sprint",shooter:"neon-swarm",rpg:"tiny-quest",blaster:"robo-escape"
};
const gameNames:Record<GameId,string>={
 runner:"Sky Sprint",shooter:"Neon Swarm",rpg:"Tiny Quest",blaster:"Robo Escape"
};
const codes=new Set(["game_open","game_start","game_win","game_lose","milestone","hit","combo","collect","talk_to_zoe","talk_to_elder","kills","fall"]);
const friend=getCrewFriend("zoe");

/** Isolated prototype: the iframe owns deterministic gameplay, while the parent owns Live. */
export function CrewArcadeLabPage(){
 const {i18n}=useTranslation("home");
 const zh=Boolean(i18n.resolvedLanguage?.startsWith("zh"));
 const targetLanguage=useTeacherStore(s=>s.targetLanguage);
 const nativeLanguage=useTeacherStore(s=>s.nativeLanguage);
 const friendMode=useTeacherStore(s=>s.friendChatMode);
 const {gameVoice,setGameVoice}=useGameVoice();
 const iframe=useRef<HTMLIFrameElement>(null);
 const [height,setHeight]=useState(820);
 const [mode,setMode]=useState<GameId>("runner");
 const [cue,setCue]=useState<Cue>({id:0,text:""});
 const [lastReply,setLastReply]=useState("");
 const delivered=useRef(0);

 const system=buildFriendSystem(friend,targetLanguage,nativeLanguage,friendMode)+
  "\n[CREW ARCADE LAB] You are Zoe, the player's witty and friendly co-op companion in one of four short video games: Sky Sprint (2D running), Neon Swarm (top-down shooter), Tiny Quest (RPG), or Robo Escape (2D platform shooter). Speak naturally in the player's selected target language. This is fun casual conversation, not classroom tutoring. Keep your spoken reactions short so the user can keep playing. Gameplay is entirely controlled by the local engine. Never invent kills, hits, scores, rewards, collectibles, route choices, NPC actions, or a win/lose outcome. Respond to [VERIFIED GAME] messages only according to the game engine's publicly confirmed event. You cannot move the player, fire, award points, or change the story world. A player may talk freely to you at any time; do not request a response every few seconds. Do not persist gameplay conversation in the Friend memory system.";

 const live=useLiveSession({
  pageKey:"crew-arcade-lab-zoe",
  title:"Crew Arcade Lab · Zoe",
  system,
  openingPrompt:"Invite the player to pick one of the four mini games, in one brief warm sentence, then listen.",
  voice:resolveGameVoice(gameVoice,friend.voice),
  language:targetLanguage,nativeLanguage,
  sessionKind:"friend",persistHistory:false,teacherReport:false,
  onTurnComplete:(turn)=>{
   const output=turn.output?.trim();
   if(!output)return;
   setLastReply(output);
   try{iframe.current?.contentWindow?.postMessage({type:"crew-arcade-ai-reply",text:output},window.location.origin)}catch{/* Optional caption only. */}
  }
 });
 const voiceActive=["requesting-mic","connecting","listening","speaking"].includes(live.state);
 const hasKey=Boolean(geminiKey());

 useEffect(()=>{
  const onEvent=(event:MessageEvent)=>{
   if(event.source!==iframe.current?.contentWindow||event.origin!==window.location.origin)return;
   const data=event.data as {type?:unknown;game?:unknown;code?:unknown;description?:unknown}|null;
   if(!data||data.type!=="crew-arcade-event"||typeof data.game!=="string"||!(data.game in details)||typeof data.code!=="string"||!codes.has(data.code))return;
   const game=data.game as GameId;
   setMode(game);
   if(data.code==="game_open"){trackUsageEvent("game_open",details[game]);return}
   if(data.code==="game_start")trackUsageEvent("game_started",details[game]);
   if(data.code==="game_win"||data.code==="game_lose")trackUsageEvent("game_completed",details[game]);
   // Strict finite vocabulary and bounded event descriptions; no speech transcript.
   const detail=typeof data.description==="string"?data.description.slice(0,180):"";
   setCue(previous=>({id:previous.id+1,text:gameNames[game]+" — "+data.code+". "+detail}));
  };
  window.addEventListener("message",onEvent);
  return()=>window.removeEventListener("message",onEvent);
 },[]);

 useEffect(()=>{
  if(!voiceActive)delivered.current=Math.max(delivered.current,cue.id);
  if(live.state==="listening"&&cue.id>delivered.current&&live.sendText("[VERIFIED GAME] "+cue.text)){
   delivered.current=cue.id;
  }
 },[voiceActive,live.state,live.sendText,cue]);

 useEffect(()=>{document.body.classList.add("teacher-theme");return()=>document.body.classList.remove("teacher-theme")},[]);

 const measure=()=>{
  try{
   const content=iframe.current?.contentDocument;
   const h=content?.documentElement?.scrollHeight||content?.body?.scrollHeight;
   if(h)setHeight(Math.min(1500,Math.max(650,h+4)));
  }catch{/* Fixed-height safe fallback. */}
 };
 return <main className="crew-arcade-route">
  <div className="crew-arcade-head">
   <Link to="/games">← {zh?"所有遊戲":"All games"}</Link>
   <span>4 GAMES · PLAY WITH ZOE</span>
  </div>
  <iframe ref={iframe} title={zh?"四款可玩的 Crew 遊戲原型":"Four playable Crew arcade games"}
   className="crew-arcade-iframe" height={height} srcDoc={arcadeHtml}
   onLoad={()=>{measure();window.requestAnimationFrame(measure)}}
   sandbox="allow-same-origin allow-scripts"/>
  <section className="crew-arcade-voice">
   <div className="crew-arcade-voice-head">
    <FriendAvatar friend={friend}/>
    <div><strong>Zoe · {zh?"真正的 AI 語音陪玩":"Live AI companion"}</strong>
     <p>{zh?"目前遊玩：":"Now playing: "}{gameNames[mode]} · {zh?"可自由聊天":"Free conversation"}</p>
    </div>
   </div>
   {voiceActive&&lastReply?<GameSpeechBubble text={lastReply} english={!zh}/>:null}
   <GameVoicePicker value={gameVoice} onChange={setGameVoice} disabled={voiceActive} english={!zh} defaultVoice={friend.voice}/>
   {voiceActive?<LiveControls live={live} compact prominentInterrupt/>:
    hasKey?<button type="button" className="crew-arcade-connect" onClick={()=>{delivered.current=cue.id;void live.start()}}>{zh?"開啟 Zoe 即時語音":"Connect Zoe Live voice"}</button>:
    <p className="crew-arcade-keyless">{zh?"四款遊戲免 Key 就能玩。真正與 Zoe 自由語音聊天，目前需要自己的 Gemini Key。":"All four games work without a key. Real Gemini Live conversation needs your own key."} <Link to="/settings">{zh?"設定 Key":"Set up key"}</Link></p>}
   {live.state==="error"?<p role="alert" className="crew-arcade-keyless">{zh?"語音未連線，遊戲仍可繼續。":"Voice unavailable, gameplay continues."} <button type="button" onClick={()=>void live.start()}>{zh?"重試":"Retry"}</button></p>:null}
   <small>{zh?"遊戲畫面中的 DEMO 台詞是預設劇情；連接 Live 後才會有真正的 AI 語音回覆。AI 不控制射擊、碰撞或任務結果。":"DEMO captions are scripted; connecting Live enables actual AI responses. AI never decides game outcomes."}</small>
  </section>
 </main>;
}
