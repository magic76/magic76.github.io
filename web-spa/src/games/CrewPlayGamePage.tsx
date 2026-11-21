import {Arrow} from "../components/Arrow";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {Link,useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {CREW_FRIENDS,getCrewFriend} from "../friends/friendProfiles";
import {FriendAvatar} from "../friends/FriendAvatar";
import {buildFriendSystem} from "../friends/friendMemory";
import {friendLanguageReminder} from "../friends/friendLanguage";
import {normalizeLiveVoice} from "../live/voiceIdentity";
import {GameVoicePicker,useGameVoice,resolveGameVoice} from "./GameVoicePicker";
import {useLiveSession} from "../live/useLiveSession";
import {LiveControls} from "../live/LiveControls";
import {liveStatusText} from "../live/liveStatusText";
import {useTeacherStore} from "../store/teacherStore";
import {CrewBoardGames} from "./CrewBoardGames";
import {matchesBoardNarration,type ExpectedBoardSpeech} from "./boardVoiceTurn";
import {CrewWordGames} from "./CrewWordGames";
import {copy,mysteryCases,twentyItems,twentyQuestions,type MysteryCase,type TwentyItem} from "./playPuzzles";
import {generateCrewMystery,rememberGeneratedMystery} from "./generateMystery";
import {generateTwentyItem,rememberGeneratedTwentyItem} from "./generateTwentyItem";
import {chooseFallbackPuzzle} from "./puzzleDiversity";
import {geminiKey} from "../lib/runtime";
import {GeminiSetupNotice} from "../components/GeminiSetupNotice";
import {crewGames} from "./CrewPlayHubPage";
import {GamePanel} from "./GamePanel";
import {GameSpeechBubble} from "./GameSpeechBubble";
import {trackUsageEvent} from "../analytics/usage";
import {friendGameReaction} from "./friendGameReaction";
import {CrewPlaySamplePreview} from "./CrewPlaySamplePreview";
import {GameVoiceDock} from "./GameVoiceDock";
import "./crewPlay.css";

type GameKind="connect4"|"reversi"|"twenty-questions"|"mystery";
const isGame=(value:string|undefined):value is GameKind=>["connect4","reversi","twenty-questions","mystery"].includes(value||"");
const FRIEND_KEY="crew_web_selected_friend_v1";
function savedFriend(){
 if(typeof localStorage==="undefined")return CREW_FRIENDS[0].id;
 const id=localStorage.getItem(FRIEND_KEY);
 return CREW_FRIENDS.find(f=>f.id===id)?.id||CREW_FRIENDS[0].id;
}
export function CrewPlayGamePage(){
 const {gameId}=useParams();
 const {t,i18n}=useTranslation("home");const english=Boolean(i18n.resolvedLanguage?.startsWith("en"));
 const [friendId,setFriendId]=useState(savedFriend);
 const [round,setRound]=useState(()=>Math.floor(Math.random()*100));
 const friend=getCrewFriend(friendId);
 useEffect(()=>{if(isGame(gameId))trackUsageEvent("game_open",gameId)},[gameId]);
 if(!isGame(gameId))return <div className="crew-play-page crew-play-not-found">
  <div className="panel"><span className="crew-play-eyebrow">CREW PLAY · 404</span>
   <h1>找不到這個遊戲</h1><p>網址可能已變更，請從遊戲中心選擇目前提供的遊戲。</p>
   <Link className="btn primary" to="/games">返回遊戲中心</Link></div></div>;
 const game=crewGames.find(g=>g.id===gameId)!;
 const wordGame=gameId==="twenty-questions"||gameId==="mystery";
 const changeFriend=(id:string)=>{localStorage.setItem(FRIEND_KEY,id);setFriendId(id);setRound(x=>x+1)};
 return <div className={"crew-play-page"+(wordGame?" crew-play-page--voice-required":"")+(gameId==="twenty-questions"?" crew-play-page--twenty":"")}>
  <header className="crew-play-game-header">
   <Link to="/games" className="crew-play-back"><Arrow direction="left"/> {t("playHub.allGames")}</Link>
   <span className="crew-play-eyebrow">{t("playHub.eyebrow")}</span>
   <h1>{t("playHub.games."+game.id+".title")}</h1>
   <p>{t("playHub.games."+game.id+".desc")}</p>
  </header>
  <div className="crew-play-frame">
   {!wordGame?<section className="crew-play-friend-bar">
    <div className="crew-play-friend-name"><FriendAvatar friend={friend}/><div><strong>{friend.name}</strong><small>{t("playHub.yourFriend")}</small></div></div>
    <GamePanel label={t("playHub.changeFriend")} title={t("playHub.changeFriend")}>
     <label className="crew-play-friend-select">{t("playHub.yourFriend")}
      <select value={friend.id} onChange={e=>changeFriend(e.target.value)}>{CREW_FRIENDS.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select>
     </label>
     <p>{english?"Changing your friend restarts this game.":"更換朋友會重新開始本局；開啟面板不會中斷語音。"}</p>
    </GamePanel>
   </section>:null}
   <CrewPlaySession key={gameId+":"+friend.id} kind={gameId} friend={friend} english={english} round={round} nextRound={()=>setRound(x=>x+1)} onChangeFriend={changeFriend}/>
  </div>
 </div>;
}
type Friend=ReturnType<typeof getCrewFriend>;
type BoardVoiceTurn={
 message:string;expected:ExpectedBoardSpeech;resolve:()=>void;sent:boolean;completed:boolean;heardSpeaking:boolean;
 graceTimer:number|null;watchdog:number|null;
};
const BOARD_VOICE_TIMEOUT_MS=25000;
const MYSTERY_GENERATION_TIMEOUT_MS=20000;
function CrewPlaySession({kind,friend,english,round,nextRound,onChangeFriend}:{kind:GameKind;friend:Friend;english:boolean;round:number;nextRound:()=>void;onChangeFriend:(id:string)=>void}){
 const {t}=useTranslation("voice");
 const language=useTeacherStore(s=>s.targetLanguage);
 const nativeLanguage=useTeacherStore(s=>s.nativeLanguage);
 const mode=useTeacherStore(s=>s.friendChatMode);
 const {gameVoice,setGameVoice}=useGameVoice();
 const [loadedRound,setLoadedRound]=useState(round);
 const [offlineReaction,setOfflineReaction]=useState("");
 const reactionStep=useRef(0);
 const [roundEnded,setRoundEnded]=useState(false);
 const fallbackQuestion=twentyItems[round%twentyItems.length];
 const selectTwentyFallback=()=>chooseFallbackPuzzle("twenty",twentyItems,item=>({
  name:item.name.en,key:item.name.en,summary:item.name.zh+" / "+item.name.en
 }));
 const [question,setQuestion]=useState<TwentyItem>(fallbackQuestion);
 const [questionStatus,setQuestionStatus]=useState<"generating"|"generated"|"fallback"|"local">(
  ()=>kind==="twenty-questions"&&typeof window!=="undefined"&&Boolean(geminiKey())?"generating":"local"
 );
 const [voiceTurns,setVoiceTurns]=useState<{id:number;text:string;round:number}[]>([]);
 const syncedRoundRef=useRef(round);
 const voiceSequence=useRef(0);
 useEffect(()=>{
  if(kind!=="twenty-questions")return;
  let active=true;
  setQuestion(fallbackQuestion);
  if(!geminiKey()){setQuestion(fallbackQuestion);setQuestionStatus("local");setLoadedRound(round);return()=>{active=false};}
  setQuestionStatus("generating");
  void generateTwentyItem().then(item=>{
   if(!active)return;
   rememberGeneratedTwentyItem(item);setQuestion(item);setQuestionStatus("generated");setLoadedRound(round);
  }).catch(()=>{
   if(!active)return;
   setQuestion(selectTwentyFallback());setQuestionStatus("fallback");setLoadedRound(round);
  });
  return()=>{active=false};
 },[kind,round,friend.id]);
 const fallbackMystery=mysteryCases[round%mysteryCases.length];
 const selectMysteryFallback=()=>chooseFallbackPuzzle("mystery",mysteryCases,item=>({
  name:item.story.en,key:item.solution.en,summary:item.solution.en
 }));
 const [mysteryCase,setMysteryCase]=useState<MysteryCase>(fallbackMystery);
 const [mysteryStatus,setMysteryStatus]=useState<"generating"|"generated"|"fallback"|"local">(
  ()=>kind==="mystery"&&typeof window!=="undefined"&&Boolean(geminiKey())?"generating":"local"
 );
 useEffect(()=>{
  if(kind!=="mystery")return;
  let active=true,settled=false;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const clearTimer=()=>{if(timer!==undefined){clearTimeout(timer);timer=undefined}};
  const useFallback=()=>{
   if(!active||settled)return;
   settled=true;clearTimer();
   setMysteryCase(selectMysteryFallback());setMysteryStatus("fallback");setLoadedRound(round);
  };
  setMysteryCase(fallbackMystery);
  if(!geminiKey()){setMysteryCase(fallbackMystery);setMysteryStatus("local");setLoadedRound(round);return()=>{active=false};}
  setMysteryStatus("generating");
  timer=setTimeout(useFallback,MYSTERY_GENERATION_TIMEOUT_MS);
  void generateCrewMystery(friend.name).then(result=>{
   if(!active)return;
   if(settled)return;
   settled=true;clearTimer();
   rememberGeneratedMystery(result);setMysteryCase(result);setMysteryStatus("generated");setLoadedRound(round);
  }).catch(useFallback);
  return()=>{active=false;clearTimer()};
 },[kind,round,friend.id,friend.name]);
 const mystery=mysteryCase;
 const directive=useMemo(()=>friendLanguageReminder(language,nativeLanguage,mode),[language,nativeLanguage,mode]);
 const isWord=kind==="twenty-questions"||kind==="mystery";
 const gameLabel={connect4:"Connect Four",reversi:"Reversi","twenty-questions":"20 Questions",mystery:"lateral-thinking mystery"}[kind];
 const facts=kind==="twenty-questions"
  ?"SECRET (do not reveal until guessed/revealed): "+question.name.en+". Verified yes/no facts: "+twentyQuestions.map(q=>q.label.en+" = "+(question.traits.includes(q.id)?"YES":"NO")).concat((question.facts||[]).map(f=>f.question.en+" = "+(f.answer?"YES":"NO"))).join("; ")+". Treat spoken questions and guesses as game actions. The UI records these using a separate authoritative adjudicator. Do NOT independently answer YES or NO to spoken guesses or gameplay questions. Wait until a [20 QUESTIONS VERIFIED ANSWER] or [20 QUESTIONS GUESS] cue provides the verified reply, then respond with exactly the cue's answer. Do not reveal the object until a verified win or end. Do not correct grammar unless asked."
  :kind==="mystery"?"CASE: "+mystery.story.en+" SOLUTION (secret until reveal): "+mystery.solution.en+" VERIFIED CLUES: "+mystery.clues.map(c=>c.question.en+" = "+(c.answer?"YES":"NO")).join("; ")+". Do not invent additional case details. Do NOT independently answer spoken case questions; await the [MYSTERY VERIFIED ANSWER] cue with the verified result before saying Yes or No. Only reveal after the UI reports [MYSTERY SOLVED], [MYSTERY REVEAL], or the question limit is reached."
  :"The board engine alone applies legal moves. A learner saying they plan to place a piece is NOT an actual move: do not answer announced coordinates or revisit those intentions later. React ONLY to the freshest [CONNECT FOUR BEFORE MOVE] or [REVERSI BEFORE MOVE] engine-selected cue. Your next move is PLANNED but not yet visible: say where you WILL play in one brief sentence and stop. Only AFTER your audio finishes will the engine put the piece on the board. Never claim it was already placed. You cannot place pieces by voice.";
 const system=useMemo(()=>buildFriendSystem(friend,language,nativeLanguage,mode)+
  "\n[CREW PLAY: "+gameLabel+"] You are playing alongside the learner. Keep the same personality and the current chosen language mode. Be a natural friend, never a teacher. Say at most one short remark per game event. Avoid frequent questions and unsolicited instruction. Game event messages are system-like data cues, NOT new user statements. Never make up board positions, score, guesses or outcomes. Speech alone never places a piece or increments the UI counter. "+facts,
  [friend,language,nativeLanguage,mode,gameLabel,facts]);
 const boardVoiceRef=useRef<BoardVoiceTurn|null>(null);
 const boardDrainCheckRef=useRef<()=>void>(()=>{});
 const finishBoardVoice=useCallback(()=>{
  const turn=boardVoiceRef.current;
  if(!turn)return;
  boardVoiceRef.current=null;
  if(turn.graceTimer!==null)window.clearTimeout(turn.graceTimer);
  if(turn.watchdog!==null)window.clearTimeout(turn.watchdog);
  turn.resolve();
 },[]);
 const live=useLiveSession({
  pageKey:"crew-play-"+kind+"-"+friend.id,title:gameLabel+" · "+friend.name,
  system,openingPrompt:directive+"\n[GAME OPENING] Say one short, relaxed in-character greeting about "+gameLabel+". Don't give away any secret or solution. Then let the user play.",
  voice:resolveGameVoice(gameVoice,normalizeLiveVoice(friend.voice)),language,nativeLanguage,languageDirective:directive,
  persistHistory:false,sessionKind:"friend",
  // A model turn can finish before its audio stops playing.
  onTurnComplete:(spokenTurn)=>{
   if(isWord&&!(kind==="twenty-questions"&&questionStatus==="generating")&&!(kind==="mystery"&&mysteryStatus==="generating")&&syncedRoundRef.current===round){
    const transcript=String((spokenTurn as {input?:string}).input||"").trim();
    if(transcript){
     const id=++voiceSequence.current;
     setVoiceTurns(prev=>[...prev.slice(-24),{id,text:transcript,round}]);
    }
   }
   const turn=boardVoiceRef.current;
   // A completed user-chat response is not necessarily the board-move cue.
   // Only the narrator actually saying the current AI move can release it.
   if(!turn?.sent||!matchesBoardNarration(spokenTurn.output,turn.expected))return;
   turn.completed=true;
   boardDrainCheckRef.current();
  }
 });
 const wordReady=isWord&&(live.state==="listening"||live.state==="speaking");
 const [wordEverReady,setWordEverReady]=useState(false);
 useEffect(()=>{if(wordReady)setWordEverReady(true)},[wordReady]);
 const liveRef=useRef(live);liveRef.current=live;
 const pending=useRef<string|null>(null);
 const skipBoardSpeech=useCallback(()=>{
  if(boardVoiceRef.current&&liveRef.current.state==="speaking")liveRef.current.interrupt();
  finishBoardVoice();
 },[finishBoardVoice]);
 const speakAfterBoardMove=useCallback((cue:string,expected:ExpectedBoardSpeech)=>new Promise<void>(resolve=>{
  const session=liveRef.current;
  if(!["requesting-mic","connecting","listening","speaking"].includes(session.state)){
   resolve();return;
  }
  // Any previous board narration belongs to an obsolete turn.
  finishBoardVoice();
  const turn:BoardVoiceTurn={
   message:directive+"\n"+cue,expected,resolve,sent:false,completed:false,heardSpeaking:false,
   graceTimer:null,watchdog:null
  };
  boardVoiceRef.current=turn;
  turn.watchdog=window.setTimeout(()=>{
   if(boardVoiceRef.current!==turn)return;
   if(liveRef.current.state==="speaking")liveRef.current.interrupt();
   finishBoardVoice();
  },BOARD_VOICE_TIMEOUT_MS);
  // An authoritative clientContent event supersedes any delayed reply to a
  // proposed user move. Do not wait for that obsolete audio to finish.
  if(session.state==="listening"||session.state==="speaking"){
   turn.sent=session.sendText(turn.message);
  }
 }),[directive,finishBoardVoice]);
 boardDrainCheckRef.current=()=>{
  const turn=boardVoiceRef.current;
  if(!turn?.sent||!turn.completed||liveRef.current.state!=="listening")return;
  // Never infer playback completion from a transcript-only turn. A spoken
  // move must report speaking=true and then the audio-drained listening state.
  // Skip speech and the watchdog remain the only fallback for silence.
  if(turn.heardSpeaking)finishBoardVoice();
 };
 useEffect(()=>{
  const turn=boardVoiceRef.current;
  if(!turn)return;
  if(["idle","ended","error","ending","reporting"].includes(live.state)){
   finishBoardVoice();return;
  }
  if(live.state==="speaking"){
   if(turn.sent)turn.heardSpeaking=true;
   if(turn.graceTimer!==null){window.clearTimeout(turn.graceTimer);turn.graceTimer=null;}
   return;
  }
  if(live.state!=="listening")return;
  if(!turn.sent){
   turn.sent=live.sendText(turn.message);
   return;
  }
  boardDrainCheckRef.current();
 },[live.state,live.sendText,finishBoardVoice]);
 useEffect(()=>()=>{const turn=boardVoiceRef.current;if(!turn)return;
  boardVoiceRef.current=null;
  if(turn.graceTimer!==null)window.clearTimeout(turn.graceTimer);
  if(turn.watchdog!==null)window.clearTimeout(turn.watchdog);
  turn.resolve();
 },[]);

 const onEvent=useCallback((event:string)=>{
  const current=liveRef.current;
  if(!["requesting-mic","connecting","listening","speaking"].includes(current.state))return;
  const message=directive+"\n"+event;
  if(current.state==="listening"&&current.sendText(message))return;
  pending.current=message;
 },[directive]);
 useEffect(()=>{
  if(live.state==="listening"&&!boardVoiceRef.current&&pending.current&&live.sendText(pending.current))pending.current=null;
 },[live.state,live.sendText]);
 // One Live transport lasts through successive word-game rounds. Its original
 // system prompt is immutable, so explicitly supersede the old case facts
 // through a silent realtime control before inviting the next response.
 useEffect(()=>{
  if(!isWord||loadedRound!==round||!wordReady||syncedRoundRef.current===round)return;
  const updated=kind==="twenty-questions"
   ?"[20 QUESTIONS ROUND UPDATE] All previous secrets are retired. The ONLY current answer is "+question.name.en+" / "+question.name.zh+". Verified facts: "+facts+". Ignore any earlier secret. For a question, wait for the verified game cue before saying YES or NO. Stay silent until the next game turn."
   :"[MYSTERY ROUND UPDATE] Previous story and solution are retired. Current story: "+mystery.story.en+". ONLY current solution: "+mystery.solution.en+". Clues: "+facts+". Never use earlier story clues. Stay silent until the next game turn.";
  if(!live.sendControl(updated))return;
  syncedRoundRef.current=round;
  onEvent("[CREW PLAY NEXT ROUND] A brand new "+gameLabel+" round is ready. React with one short welcoming sentence, without revealing the new secret or solution.");
 },[isWord,loadedRound,round,wordReady,kind,question,mystery,facts,live.sendControl,onEvent,gameLabel]);

 useEffect(()=>{
  document.body.classList.add("teacher-theme");
  return()=>document.body.classList.remove("teacher-theme");
 },[]);
 const twenty=kind==="twenty-questions";
 const voicePreparing=loadedRound!==round||(kind==="mystery"&&mysteryStatus==="generating")||(twenty&&questionStatus==="generating");
 const voiceActive=["requesting-mic","connecting","listening","speaking","ending","reporting"].includes(live.state);
 const voiceStatus=live.state==="speaking"?(english?"Speaking":"正在說話"):
  live.state==="listening"?(english?"Listening to you":"正在聽你說話"):
  live.state==="connecting"||live.state==="requesting-mic"?(english?"Connecting":"連線中"):
  live.state==="error"?(english?"Connection issue":"語音連線異常"):
  voiceActive?(english?"In a voice session":"語音進行中"):
  english?"Ready to play":"準備開始";
 const hasKey=typeof window!=="undefined"&&Boolean(geminiKey());
 const wordCanStart=isWord&&hasKey&&!voicePreparing;
 const wordStarting=isWord&&(live.state==="requesting-mic"||live.state==="connecting");
 const wordError=isWord&&live.state==="error";
 const voiceStartLabel=english?(isWord?"Start speaking with ":"Turn on voice with ")+friend.name:
  (isWord?"開始與 ":"開啟 ")+friend.name+(isWord?" 語音遊戲":" 的語音陪玩");
 const voiceActions=live.state==="idle"||live.state==="ended"?
  <button type="button" className="crew-play-voice-start" disabled={voicePreparing||isWord&&!hasKey} onClick={()=>void live.start()}>{voicePreparing?(english?"Preparing the mystery…":"正在準備新題目…"):voiceStartLabel}</button>:
  <LiveControls live={live} interruptLabel={t("friendLive.interrupt")} prominentInterrupt compact english={english}/>;
 return <div className={"crew-play-session"+(isWord?" crew-play-session--word":"")+(twenty?" crew-play-session--twenty":"")}>
  <div className="crew-play-voice-pref"><GamePanel label={english?"Voice settings":"語音設定"} title={english?"Game voice settings":"遊戲語音設定"}><GameVoicePicker value={gameVoice} onChange={setGameVoice} defaultVoice={normalizeLiveVoice(friend.voice)} english={english} disabled={voiceActive}/></GamePanel></div>
  {isWord?<section className="crew-play-voice-presence" aria-label={english?"Your Crew Friend and latest reply":"Crew 朋友與最新回覆"}>
   <div className="crew-play-voice-presence-header">
    <FriendAvatar friend={friend} className={live.state==="speaking"?"is-speaking":""}/>
    <div className="crew-play-voice-presence-name"><strong>{friend.name}</strong>
     <small className={"crew-play-voice-presence-state"+(voiceActive?" active":"")} aria-live="polite">{voiceStatus}</small>
    </div>
    <GamePanel label={english?"Settings":"設定"} title={english?"Game settings":"遊戲設定"}>
     <label className="crew-play-friend-select">{english?"Crew Friend":"Crew 朋友"}
      <select value={friend.id} onChange={e=>onChangeFriend(e.target.value)}>{CREW_FRIENDS.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select>
     </label>
     <p>{english?"Changing your friend restarts the conversation for this game.":"變更朋友會重新開始本局對話。"}</p>
    </GamePanel>
   </div>
   <div className={"crew-play-voice-waves"+(live.state==="speaking"?" is-speaking":live.state==="listening"?" is-listening":"")} aria-hidden="true"><i/><i/><i/><i/><i/></div>
   <GameSpeechBubble className="crew-play-voice-presence-reply" english={english} text={live.output||(kind==="mystery"?
    (english?"Let's solve a strange story together.":"一起破解這個離奇的故事吧！"):
    (english?"I've picked something. Ask me a question!":"我已經想好一個東西了，直接開口問我吧！"))}/>
   {!voiceActive?<div className="crew-play-voice-entrance">
    <strong>{english?"Start voice to unlock this game":"開啟語音，才能開始遊戲"}</strong>
    <p>{english?"Gemini Key and microphone required.":"需要 Gemini Key 與麥克風。"}</p>
    <CrewPlaySamplePreview english={english} twenty={twenty} friendName={friend.name}/>
     {!hasKey?<GeminiSetupNotice/>:null}
    {voicePreparing?<div className="crew-play-generation-state" role="status"><span className="crew-play-mystery-spinner" aria-hidden="true"/><span>{english?"Preparing story and clues…":"準備題目與線索中。"}</span></div>:null}
    {wordError?<div className="crew-play-voice-recovery" role="alert">
      <p>{liveStatusText(live.status)|| (english?"Voice connection failed.":"語音連線失敗，請檢查麥克風或網路。")}</p>
      {live.errorKind==="key"?<GeminiSetupNotice force/>:
       <button type="button" className="crew-play-voice-start" onClick={()=>void live.start()}>{english?"Retry voice connection":"重新連線語音"}</button>}
     </div>:
      <button type="button" className="crew-play-voice-start" disabled={!wordCanStart}
       onClick={()=>void live.start()}>{english?"Start voice game with "+friend.name:"開始與 "+friend.name+" 語音遊戲"}</button>}
   </div>:null}
   {wordStarting?<p className="crew-play-voice-connecting" role="status">{english?"Connecting the microphone and your friend…":"正在連接麥克風與 Crew 朋友…"}</p>:null}
  </section>:null}
  {isWord&&voiceActive?<section className="crew-play-voice-dock-shell" aria-label={english?"Voice controls":"語音控制"}>
   {voiceActions}
   <small>{english?"Voice is not saved to friend memory.":"語音不寫入朋友記憶。"}</small>
  </section>:null}
  {isWord&&wordEverReady&&!wordReady?<section className="crew-play-voice-paused" role="status">
   <strong>{roundEnded?(english?"Round completed":"本局已結束"):(english?"Game paused — voice connection needed":"語音暫停，遊戲已暫停")}</strong>
   <p>{roundEnded?(english?"Choose the next round below.":"按下方「下一題」再玩。"):(english?"Reconnect to resume this round.":"重新連線即可繼續本局。")}</p>
  </section>:null}
  {kind==="connect4"||kind==="reversi"?<CrewBoardGames kind={kind} english={english} friendName={friend.name} onEvent={onEvent} onBoardMove={speakAfterBoardMove} onSkipSpeech={skipBoardSpeech} onReaction={event=>setOfflineReaction(friendGameReaction(friend.id,event,english?"en":"zh",++reactionStep.current))}/>:null}
  {!isWord&&offlineReaction?<p className="crew-play-reaction" aria-live="polite"><strong>{friend.name}：</strong>{offlineReaction}</p>:null}
   {isWord&&voiceActive&&kind==="mystery"&&mysteryStatus==="generating"?
   <section className="crew-play-mystery-loading" role="status" aria-live="polite">
    <span className="crew-play-mystery-spinner" aria-hidden="true"/>
    <strong>{english?"Creating a new mystery…":"正在創作全新海龜湯…"}</strong>
    <p>{english?"Generating verified clues…":"正在生成故事與線索。"}</p>
   </section>:null}
  {isWord&&voiceActive&&kind==="twenty-questions"&&questionStatus==="generating"?
   <section className="crew-play-mystery-loading" role="status" aria-live="polite">
    <span className="crew-play-mystery-spinner" aria-hidden="true"/>
    <strong>{english?"Picking a new secret object…":"正在挑選全新的神秘物品…"}</strong>
    <p>{english?"Preparing a bilingual word…":"正在生成雙語題目。"}</p>
   </section>:null}
  {isWord&&wordEverReady&&!voicePreparing?
   <div className={"crew-play-word-stage"+(!wordReady&&!roundEnded?" is-paused":"")} inert={!wordReady&&!roundEnded} aria-disabled={!wordReady&&!roundEnded}>
    <CrewWordGames key={round} kind={kind as "twenty-questions"|"mystery"} english={english} friendName={friend.name} item={question} caseFile={mystery} onEvent={onEvent} onNext={()=>{pending.current=null;setRoundEnded(false);setVoiceTurns([]);nextRound()}} onFinished={()=>setRoundEnded(true)} mysterySource={mysteryStatus} itemSource={questionStatus} voiceTurns={voiceTurns.filter(turn=>turn.round===round)}/>
   </div>:null}
  {!isWord?<GameVoiceDock className="crew-play-voice">
   <div className="crew-play-voice-person"><FriendAvatar friend={friend} className={live.state==="speaking"?"is-speaking":""}/><div><strong>{friend.name}</strong><GameSpeechBubble text={live.output||(english?"Let's play. Voice chat is optional.":"來玩吧！語音聊天可以自由開啟。")} english={english}/></div></div>
   {voiceActions}
   <small>{english?"You can play without a Gemini Key. Voice is only used during this game and is not saved to chat history or friend memories.":"不用 Gemini Key 也能玩；語音只用於這一局，不儲存到聊天歷史或朋友記憶。"}</small>
  </GameVoiceDock>:null}
 </div>;
}
