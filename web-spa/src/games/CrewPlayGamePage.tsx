import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {Link,Navigate,useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {CREW_FRIENDS,getCrewFriend} from "../friends/friendProfiles";
import {FriendAvatar} from "../friends/FriendAvatar";
import {buildFriendSystem} from "../friends/friendMemory";
import {friendLanguageReminder} from "../friends/friendLanguage";
import {normalizeLiveVoice} from "../live/voiceIdentity";
import {useLiveSession} from "../live/useLiveSession";
import {LiveControls} from "../live/LiveControls";
import {useTeacherStore} from "../store/teacherStore";
import {CrewBoardGames} from "./CrewBoardGames";
import {CrewWordGames} from "./CrewWordGames";
import {copy,mysteryCases,twentyItems,twentyQuestions} from "./playPuzzles";
import {crewGames} from "./CrewPlayHubPage";
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
 const {i18n}=useTranslation();const english=Boolean(i18n.resolvedLanguage?.startsWith("en"));
 const [friendId,setFriendId]=useState(savedFriend);
 const [round,setRound]=useState(()=>Math.floor(Math.random()*100));
 const friend=getCrewFriend(friendId);
 if(!isGame(gameId))return <Navigate to="/games" replace/>;
 const game=crewGames.find(g=>g.id===gameId)!;
 const changeFriend=(id:string)=>{localStorage.setItem(FRIEND_KEY,id);setFriendId(id);setRound(x=>x+1)};
 return <main className="crew-play-page">
  <header className="crew-play-game-header">
   <Link to="/games" className="crew-play-back">← {english?"All games":"全部遊戲"}</Link>
   <span className="crew-play-eyebrow">CREW PLAY</span>
   <h1>{game.title[english?"en":"zh"]}</h1>
   <p>{game.desc[english?"en":"zh"]}</p>
  </header>
  <div className="crew-play-frame">
   <section className="crew-play-friend-bar">
    <div className="crew-play-friend-name"><FriendAvatar friend={friend}/><div><strong>{friend.name}</strong><small>{english?"Your Crew Friend":"你的 Crew 朋友"}</small></div></div>
    <label className="crew-play-friend-select">{english?"Change friend":"更換朋友"}
     <select value={friend.id} onChange={e=>changeFriend(e.target.value)}>{CREW_FRIENDS.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select>
    </label>
   </section>
   <CrewPlaySession key={gameId+":"+friend.id+":"+round} kind={gameId} friend={friend} english={english} round={round} nextRound={()=>setRound(x=>x+1)}/>
  </div>
 </main>;
}
type Friend=ReturnType<typeof getCrewFriend>;
type BoardVoiceTurn={
 message:string;resolve:()=>void;sent:boolean;completed:boolean;heardSpeaking:boolean;
 graceTimer:number|null;watchdog:number|null;
};
const BOARD_VOICE_TIMEOUT_MS=25000;
function CrewPlaySession({kind,friend,english,round,nextRound}:{kind:GameKind;friend:Friend;english:boolean;round:number;nextRound:()=>void}){
 const language=useTeacherStore(s=>s.targetLanguage);
 const nativeLanguage=useTeacherStore(s=>s.nativeLanguage);
 const mode=useTeacherStore(s=>s.friendChatMode);
 const question=twentyItems[round%twentyItems.length];
 const mystery=mysteryCases[round%mysteryCases.length];
 const directive=useMemo(()=>friendLanguageReminder(language,nativeLanguage,mode),[language,nativeLanguage,mode]);
 const isWord=kind==="twenty-questions"||kind==="mystery";
 const gameLabel={connect4:"Connect Four",reversi:"Reversi","twenty-questions":"20 Questions",mystery:"lateral-thinking mystery"}[kind];
 const facts=kind==="twenty-questions"
  ?"SECRET (do not reveal until guessed/revealed): "+question.name.en+". Verified yes/no facts: "+twentyQuestions.map(q=>q.label.en+" = "+(question.traits.includes(q.id)?"YES":"NO")).join("; ")+". For other questions, only answer if certain and be brief."
  :kind==="mystery"?"CASE: "+mystery.story.en+" SOLUTION (secret until reveal): "+mystery.solution.en+" VERIFIED CLUES: "+mystery.clues.map(c=>c.question.en+" = "+(c.answer?"YES":"NO")).join("; ")+". Do not invent additional case details."
  :"The rules and legal moves are exclusively managed by the on-screen game engine. You cannot place pieces through voice. After each computer move is visibly placed, react in ONE brief sentence, then stop speaking; the learner must wait until audio finishes before playing again. Do not claim a move that was not reported in the cue.";
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
  voice:normalizeLiveVoice(friend.voice),language,nativeLanguage,languageDirective:directive,
  persistHistory:false,sessionKind:"friend",
  // A model turn can finish before its audio stops playing.
  onTurnComplete:()=>{
   const turn=boardVoiceRef.current;
   if(!turn?.sent)return;
   turn.completed=true;
   boardDrainCheckRef.current();
  }
 });
 const liveRef=useRef(live);liveRef.current=live;
 const pending=useRef<string|null>(null);
 const skipBoardSpeech=useCallback(()=>{
  if(boardVoiceRef.current&&liveRef.current.state==="speaking")liveRef.current.interrupt();
  finishBoardVoice();
 },[finishBoardVoice]);
 const speakAfterBoardMove=useCallback((cue:string)=>new Promise<void>(resolve=>{
  const session=liveRef.current;
  if(!["requesting-mic","connecting","listening","speaking"].includes(session.state)){
   resolve();return;
  }
  // Any previous board narration belongs to an obsolete turn.
  finishBoardVoice();
  const turn:BoardVoiceTurn={
   message:directive+"\n"+cue,resolve,sent:false,completed:false,heardSpeaking:false,
   graceTimer:null,watchdog:null
  };
  boardVoiceRef.current=turn;
  turn.watchdog=window.setTimeout(()=>{
   if(boardVoiceRef.current!==turn)return;
   if(liveRef.current.state==="speaking")liveRef.current.interrupt();
   finishBoardVoice();
  },BOARD_VOICE_TIMEOUT_MS);
  if(session.state==="listening"){
   turn.sent=session.sendText(turn.message);
  }
 }),[directive,finishBoardVoice]);
 boardDrainCheckRef.current=()=>{
  const turn=boardVoiceRef.current;
  if(!turn?.sent||!turn.completed||liveRef.current.state!=="listening")return;
  if(turn.heardSpeaking){finishBoardVoice();return;}
  // Give the audio worklet one moment to report playback starting.
  if(turn.graceTimer===null){
   turn.graceTimer=window.setTimeout(()=>{
    if(boardVoiceRef.current!==turn)return;
    turn.graceTimer=null;
    if(liveRef.current.state==="listening"&&turn.completed)finishBoardVoice();
   },450);
  }
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
 useEffect(()=>{
  document.body.classList.add("teacher-theme");
  return()=>document.body.classList.remove("teacher-theme");
 },[]);
 return <div className="crew-play-session">
  {kind==="connect4"||kind==="reversi"?<CrewBoardGames kind={kind} english={english} friendName={friend.name} onEvent={onEvent} onBoardMove={speakAfterBoardMove} onSkipSpeech={skipBoardSpeech}/>:null}
  {isWord?<CrewWordGames kind={kind as "twenty-questions"|"mystery"} english={english} friendName={friend.name} item={question} caseFile={mystery} onEvent={onEvent} onNext={nextRound}/>:null}
  <section className="crew-play-voice">
   <div className="crew-play-voice-person"><FriendAvatar friend={friend} className={live.state==="speaking"?"is-speaking":""}/><div><strong>{friend.name}</strong><p>{live.output||(english?"Let's play. Voice chat is optional.":"來玩吧！語音聊天可以自由開啟。")}</p></div></div>
   {live.state==="idle"||live.state==="ended"?<button type="button" className="crew-play-voice-start" onClick={()=>void live.start()}>{english?"Turn on voice with "+friend.name:"開啟 "+friend.name+" 的語音陪玩"}</button>
    :<LiveControls live={live} interruptLabel={english?"Interrupt friend":"換我說 · 打斷朋友"} prominentInterrupt/>}
   <small>{english?"You can play without a Gemini Key. Voice is only used during this game and is not saved to chat history or friend memories.":"不用 Gemini Key 也能玩；語音只用於這一局，不儲存到聊天歷史或朋友記憶。"}</small>
  </section>
 </div>;
}
