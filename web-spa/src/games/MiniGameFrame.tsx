import {useCallback,useEffect,useRef,useState,type ReactNode} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {CREW_FRIENDS,getCrewFriend} from "../friends/friendProfiles";
import {FriendAvatar} from "../friends/FriendAvatar";
import {buildFriendSystem} from "../friends/friendMemory";
import {normalizeLiveVoice} from "../live/voiceIdentity";
import {GameVoicePicker,useGameVoice,resolveGameVoice} from "./GameVoicePicker";
import {useLiveSession} from "../live/useLiveSession";
import {LiveControls} from "../live/LiveControls";
import {liveStatusText} from "../live/liveStatusText";
import {useTeacherStore} from "../store/teacherStore";
import {geminiKey} from "../lib/runtime";
import {GamePanel} from "./GamePanel";
import {GameSpeechBubble} from "./GameSpeechBubble";
import {GameVoiceDock} from "./GameVoiceDock";
import "./crewPlay.css";
import "./miniGames.css";

export type MiniKind="1a2b"|"taboo"|"court"|"number-bomb"|"memory";
export type MiniFriend=ReturnType<typeof getCrewFriend>;
const FRIEND_KEY="crew_web_selected_friend_v1";
function initialFriend(){
 if(typeof window==="undefined")return CREW_FRIENDS[0].id;
 const saved=localStorage.getItem(FRIEND_KEY);
 return CREW_FRIENDS.some(friend=>friend.id===saved)?saved!:CREW_FRIENDS[0].id;
}
export function useMiniFriend(){
 const [id,setId]=useState(initialFriend);
 const friend=getCrewFriend(id);
 const choose=(next:string)=>{setId(next);if(typeof window!=="undefined")localStorage.setItem(FRIEND_KEY,next)};
 return {friend,choose};
}
export function MiniShell({kind,friend,onChange,children}:{kind:MiniKind;friend:MiniFriend;onChange:(id:string)=>void;children:ReactNode}){
 const taboo=kind==="taboo";
 const targetLanguage=useTeacherStore(s=>s.targetLanguage);
 const chinese=/(中文|華語|國語|chinese|mandarin|^zh)/i.test(targetLanguage);
 const {t}=useTranslation("home");
 useEffect(()=>{document.body.classList.add("teacher-theme");return()=>document.body.classList.remove("teacher-theme")},[]);
 return <div className="crew-play-page crew-mini-page">
  <header className="crew-play-game-header crew-play-game-header--compact">
   <Link to="/games" className="crew-play-back">← {t("playHub.allGames")}</Link>
   <span className="crew-play-eyebrow">{t("playHub.eyebrow")}</span>
   <h1>{taboo?t("playHub.games.taboo.title"):kind==="court"?t("playHub.mini.courtTitle"):t("playHub.games.1a2b.title")}</h1>
   <p>{taboo?(geminiKey()?(chinese?t("playHub.mini.tabooDescChinese"):t("playHub.mini.tabooDescEnglish")):t("playHub.mini.tabooDescNoKey")):kind==="court"?t("playHub.mini.courtDesc"):t("playHub.mini.numberDesc")}</p>
  </header>
  <div className="crew-play-frame">
   <section className="crew-play-friend-bar crew-mini-friend-bar">
    <div className="crew-play-friend-name"><FriendAvatar friend={friend}/><div><strong>{friend.name}</strong><small>{t("playHub.yourFriend")}</small></div></div>
    <GamePanel title="選擇 Crew 朋友" label={t("playHub.changeFriend")}>
     <label className="crew-play-friend-select">{t("playHub.mini.friendSelect")}
      <select value={friend.id} onChange={e=>onChange(e.target.value)}>{CREW_FRIENDS.map(f=><option value={f.id} key={f.id}>{f.name}</option>)}</select>
     </label>
     <p>{t("playHub.mini.switchNote")}</p>
    </GamePanel>
   </section>
   {children}
  </div>
 </div>;
}

export type VoiceCue={id:number;text:string};
export function MiniGameVoice({kind,friend,onSpeech,onReply,cue,tabooMode,courtRole,onVoiceActiveChange,onCueSettled}:{
 kind:MiniKind;friend:MiniFriend;onSpeech:(text:string,liveReply?:string)=>void;onReply?:(text:string)=>void;cue:VoiceCue;tabooMode?:"describe"|"guess";courtRole?:"defense"|"prosecution";
 onVoiceActiveChange?:(active:boolean)=>void;onCueSettled?:(id:number)=>void;
}){
 const targetLanguage=useTeacherStore(s=>s.targetLanguage);
 const {gameVoice,setGameVoice}=useGameVoice();
 const {t,i18n}=useTranslation("home");
 const english=Boolean(i18n.resolvedLanguage?.startsWith("en"));
 const nativeLanguage=useTeacherStore(s=>s.nativeLanguage);
 const friendMode=useTeacherStore(s=>s.friendChatMode);
 const seenRef=useRef(new Set<string>());
 const directGuess=kind==="taboo"&&tabooMode==="describe";
 const chinese=/(中文|華語|國語|chinese|mandarin|^zh)/i.test(targetLanguage);
 const gameTongue=chinese?"Traditional Chinese":"English";
 const court=kind==="court";
 const quick=kind==="number-bomb"||kind==="memory";
 const counsel=courtRole==="prosecution"?"defense attorney":"prosecutor";
 const system=buildFriendSystem(friend,targetLanguage,nativeLanguage,friendMode)+
  (directGuess
    ?"\n[CREW PLAY TABOO: DIRECT VOICE GUESSER] You are a quick, expressive friend playing Taboo, not a conversational tutor. After each description, immediately reply with ONE short, natural sentence in "+gameTongue+" containing exactly ONE concrete single-word guess. Keep your personality and vary the wording and intonation naturally. Examples (not a script): "+(chinese?"「會不會是雨傘？」、「我猜是貓咪！」、「可能是披薩？」":"Could it be a banana? Sounds like a banana! Maybe an apple?")+" Do NOT use the same opening every turn or always say 'I guess'. No acknowledgement before the guess, no paraphrase, explanation, praise, extra question, second candidate or second sentence. Do not repeat an earlier incorrect guess. You cannot see the hidden answer and must never claim verification or announce scoring. The game UI alone checks correctness and forbidden words. For a [VERIFIED GAME] cue, follow that result with a single brief natural reply. Never persist memories."
   :court?"\n[CREW PLAY CRAZY COURT] You are "+friend.name+", acting as the player\'s opposing "+counsel+" in a fictional comedy trial. Keep your personality and selected spoken language. The game UI owns evidence, legal rulings, objections, score and verdict. NEVER invent a new fact or evidence or claim to alter the outcome. When the user speaks, listen but do not offer a ruling; wait until a [VERIFIED GAME] cue. On a verified cue, deliver one short playful lawyer response, then listen. Be respectful and do not treat this as real legal advice. Do not persist conversation memory."
   :quick?"\n[CREW PLAY TURN-VERIFIED VOICE: "+kind+"] You are "+friend.name+". "+(kind==="number-bomb"?"You are the HOST of Number Bomb, NEVER a contestant. The player alone submits guesses and the offline game engine determines higher, lower, or correct; you do not choose or submit numbers.":"You are the opposing friend in Memory Match. You cannot see face-down cards and must not invent their contents. A successful pair gives that player another turn.")+" GAMEPLAY PACING IS MANDATORY: A number on the wheel, a spoken guess, a card-flip request, or a player intention is NOT a confirmed outcome. Do NOT speak, acknowledge, guess, judge, narrate or react to a gameplay intention. Wait silently for the authoritative [VERIFIED GAME] update after the player commits a number or after BOTH cards are flipped, the match resolved, and the board updated. Only THEN say ONE short natural, expressive sentence in "+gameTongue+" based exclusively on verified public results, and stop without follow-up questions. Do not speak while cards are being revealed or while the wheel is moving. For unrelated conversation you may answer normally, but never reveal an unrevealed number/card, invent results or persist friend memories."
   :"\n[CREW PLAY GAME: "+kind+"] This is a self-contained game, not a normal friend conversation. Respond as "+friend.name+" with short witty remarks in "+gameTongue+". No tutoring until the final feedback. Gameplay is fully decided by the offline UI engine. Never claim an answer is correct or wrong without a [VERIFIED GAME] event. A voice input can contain digits or xAyB, or a short description in the selected learning language. If numbers are unclear, ask the player to repeat slowly in "+gameTongue+". React only to [VERIFIED GAME] updates for scoring and never reveal the secret. In Taboo guess mode, read the safe clue exactly without forbidden words. Never persist these conversations as friend memories.");
 const live=useLiveSession({
  pageKey:directGuess?"crew-play-mini-taboo-direct-"+friend.id:"crew-play-mini-"+kind+"-"+friend.id,
  title:(kind==="1a2b"?"1A2B":court?"Crazy Court":kind==="number-bomb"?"Number Bomb":kind==="memory"?"Memory Match":"Taboo")+" · "+friend.name,
  system,openingPrompt:directGuess?"Invite the player briefly to describe something in "+gameTongue+". Use your own friendly wording once, then listen.":court?"As opposing counsel, give a short, friendly in-character courtroom greeting. Do not claim any verdict or change the rules.":quick?"Welcome the player briefly as "+(kind==="number-bomb"?"the Number Bomb host. Only the player guesses; announce higher/lower exclusively after they CONFIRM a number":"a Memory Match friend. Wait until BOTH cards finish revealing and the pair is resolved before commenting")+" in "+gameTongue+". After the greeting, wait quietly for confirmed [VERIFIED GAME] updates and do not speak about tentative moves.":"Say one short welcome in "+gameTongue+" to the game. Do not invent a score or answer.",
  voice:resolveGameVoice(gameVoice,normalizeLiveVoice(friend.voice)),language:targetLanguage,nativeLanguage,
  sessionKind:"friend",persistHistory:false,teacherReport:false,
  onTurnComplete:(turn,completed)=>{
   let lastIndex=-1;
   for(let i=completed.length-1;i>=0;i--){if(completed[i].input?.trim()){lastIndex=i;break;}}
   if(lastIndex>=0){
    const input=completed[lastIndex].input!.trim();
    const id=lastIndex+":"+input;
    if(!seenRef.current.has(id)){
     seenRef.current.add(id);
     onSpeech(input,turn.output?.trim()||"");
    }
   }
   if(turn.output?.trim())onReply?.(turn.output.trim());
  }
 });
 const active=["requesting-mic","connecting","listening","speaking","ending","reporting"].includes(live.state);
 const deliveredRef=useRef(0);
 const pendingNarrationRef=useRef<{id:number;heardSpeaking:boolean;watchdog:number}|null>(null);
 const settleNarration=useCallback(()=>{
  const pending=pendingNarrationRef.current;
  if(!pending)return;
  pendingNarrationRef.current=null;
  window.clearTimeout(pending.watchdog);
  onCueSettled?.(pending.id);
 },[onCueSettled]);
 const voiceActive=["requesting-mic","connecting","listening","speaking"].includes(live.state);
 useEffect(()=>{onVoiceActiveChange?.(voiceActive)},[voiceActive,onVoiceActiveChange]);
 useEffect(()=>{
  const pending=pendingNarrationRef.current;
  if(!pending)return;
  if(live.state==="speaking")pending.heardSpeaking=true;
  // Unlike a complete transcript, listening after actual speech means playback drained.
  if((live.state==="listening"&&pending.heardSpeaking)||["idle","ended","error","ending"].includes(live.state))settleNarration();
 },[live.state,settleNarration]);
 useEffect(()=>()=>{if(pendingNarrationRef.current)window.clearTimeout(pendingNarrationRef.current.watchdog)},[]);
 // Verified game cues are emitted only after the UI commits a completed action.
 useEffect(()=>{
  if(!cue.id||cue.id===deliveredRef.current||live.state!=="listening")return;
  if(!live.sendText("[VERIFIED GAME] "+cue.text))return;
  deliveredRef.current=cue.id;
  if(quick&&onCueSettled){
   // No stale utterance is allowed to keep a friend's next turn locked.
   settleNarration();
   pendingNarrationRef.current={id:cue.id,heardSpeaking:false,watchdog:window.setTimeout(settleNarration,11000)};
  }
 },[cue,live.state,live.sendText,quick,onCueSettled,settleNarration]);
 const hasKey=typeof window!=="undefined"&&Boolean(geminiKey());
 return <GameVoiceDock className="crew-mini-voice" label={t("playHub.mini.voiceRegion")}>
  <div className="crew-mini-voice-settings"><GamePanel label={t("playHub.mini.voiceSettings")} title={t("playHub.mini.voiceSettings")}><GameVoicePicker value={gameVoice} onChange={setGameVoice} defaultVoice={normalizeLiveVoice(friend.voice)} english={english} disabled={active}/></GamePanel></div>
  <div className="crew-mini-voice-header">
   <FriendAvatar friend={friend} className={live.state==="speaking"?"is-speaking":""}/>
   <div className="crew-mini-voice-copy"><strong>{friend.name} · {directGuess?t("playHub.mini.modeDirect"):court?t("playHub.mini.modeCourt"):t("playHub.mini.modeCompanion")}</strong>
    <small aria-live="polite">{active?live.state==="speaking"?t("playHub.mini.statusSpeaking"):live.state==="listening"?(directGuess?t("playHub.mini.statusDescribe"):t("playHub.mini.statusListening")):t("playHub.mini.statusConnecting"):hasKey?t("playHub.mini.hintTyping"):kind==="taboo"?t("playHub.mini.hintTabooNoKey"):t("playHub.mini.hintNoKey")}</small>
   </div>
  </div>
  {live.output&&active?<GameSpeechBubble text={live.output} english={english}/>:null}
  {active?<LiveControls live={live} prominentInterrupt interruptLabel={t("playHub.mini.interrupt")} compact english={english}/>:
   hasKey?<button className="crew-mini-primary" onClick={()=>{seenRef.current.clear();void live.start()}} type="button">{t("playHub.mini.startVoice",{name:friend.name})}</button>:
   <Link className="crew-mini-key-link" to="/settings">{t("playHub.mini.keyLink")}</Link>}
  {live.state==="error"?<p className="crew-mini-error" role="alert">{t("playHub.mini.voiceError",{status:liveStatusText(live.status)})}</p>:null}
  <small>{directGuess?(hasKey?t("playHub.mini.noteDirectKey"):t("playHub.mini.noteDirectNoKey")):t("playHub.mini.noteLive")}</small>
 </GameVoiceDock>;
}
