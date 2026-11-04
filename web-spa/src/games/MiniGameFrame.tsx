import {useEffect,useRef,useState,type ReactNode} from "react";
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
export function MiniGameVoice({kind,friend,onSpeech,onReply,cue,tabooMode,courtRole}:{
 kind:MiniKind;friend:MiniFriend;onSpeech:(text:string,liveReply?:string)=>void;onReply?:(text:string)=>void;cue:VoiceCue;tabooMode?:"describe"|"guess";courtRole?:"defense"|"prosecution";
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
   :quick?"\n[CREW PLAY QUICK GAME: "+kind+"] You are "+friend.name+", a conversational and playful friend. Chat naturally in "+gameTongue+" when the user talks to you, including non-game chat. Gameplay is controlled exclusively by the offline game UI; do not invent, claim, or execute an unverified move, score, turn, clue, or result. The UI parses spoken game instructions and only a [VERIFIED GAME] cue authorizes you to mention the resulting move. Never imply a spoken number was accepted before the UI verifies it. For Number Bomb, the secret answer is private and not visible to you. Do not guess it or claim to know it. For Memory Match, you can discuss only publicly flipped cards and scores; never claim to see hidden cards. A matching pair earns another turn for that player. When you get [VERIFIED GAME], respond briefly in character, without repetitive greetings or questions. Do not persist friend memories."
   :"\n[CREW PLAY GAME: "+kind+"] This is a self-contained game, not a normal friend conversation. Respond as "+friend.name+" with short witty remarks in "+gameTongue+". No tutoring until the final feedback. Gameplay is fully decided by the offline UI engine. Never claim an answer is correct or wrong without a [VERIFIED GAME] event. A voice input can contain digits or xAyB, or a short description in the selected learning language. If numbers are unclear, ask the player to repeat slowly in "+gameTongue+". React only to [VERIFIED GAME] updates for scoring and never reveal the secret. In Taboo guess mode, read the safe clue exactly without forbidden words. Never persist these conversations as friend memories.");
 const live=useLiveSession({
  pageKey:directGuess?"crew-play-mini-taboo-direct-"+friend.id:"crew-play-mini-"+kind+"-"+friend.id,
  title:(kind==="1a2b"?"1A2B":court?"Crazy Court":kind==="number-bomb"?"Number Bomb":kind==="memory"?"Memory Match":"Taboo")+" · "+friend.name,
  system,openingPrompt:directGuess?"Invite the player briefly to describe something in "+gameTongue+". Use your own friendly wording once, then listen.":court?"As opposing counsel, give a short, friendly in-character courtroom greeting. Do not claim any verdict or change the rules.":quick?"Welcome the player to "+(kind==="number-bomb"?"Number Bomb: swipe the number wheel to choose a guess":"Memory Match: flip two cards to find pairs")+" in one short in-character sentence in "+gameTongue+". They may chat or speak their moves. Do not invent board results, then listen.":"Say one short welcome in "+gameTongue+" to the game. Do not invent a score or answer.",
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
 // A cue may be created during playback. Send only after the transport listens again.
 useEffect(()=>{
  if(!cue.id||cue.id===deliveredRef.current||live.state!=="listening")return;
  if(live.sendText("[VERIFIED GAME] "+cue.text))deliveredRef.current=cue.id;
 },[cue,live.state,live.sendText]);
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
