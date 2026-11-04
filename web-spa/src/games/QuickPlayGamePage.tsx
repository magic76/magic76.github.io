import {useCallback,useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {CREW_FRIENDS,getCrewFriend} from "../friends/friendProfiles";
import {FriendAvatar} from "../friends/FriendAvatar";
import {GamePanel} from "./GamePanel";
import {MiniGameVoice,type VoiceCue} from "./MiniGameFrame";
import {NumberWheel} from "./NumberWheel";
import {trackUsageEvent} from "../analytics/usage";
import {friendGameReaction} from "./friendGameReaction";
import {bombComputerGuess,bombGuess,flipMemory,memoryComputerPick,newBomb,newMemory,
 parseBombSpeech,parseMemorySpeech,resolveMemory,type BombState,type MemoryState} from "./quickPlayEngine";
import "./crewPlay.css";
import "./quickPlay.css";

type Kind="number-bomb"|"memory";
type Friend=ReturnType<typeof getCrewFriend>;
type RoundProps={friend:Friend;zh:boolean;onCue:(text:string)=>number;registerSpeech:(handler:(text:string)=>void)=>void;voiceActive:boolean;settledCueId:number};
const FRIEND_KEY="crew_web_selected_friend_v1";
const icons=["🍎","🌙","🐱","🌻","🍓","⭐","🦋","🎈","🍕","🐼","🚀","🎵"];
const initialFriend=()=>{
 if(typeof localStorage==="undefined")return CREW_FRIENDS[0].id;
 try{const id=localStorage.getItem(FRIEND_KEY);return CREW_FRIENDS.some(f=>f.id===id)?id!:CREW_FRIENDS[0].id}
 catch{return CREW_FRIENDS[0].id}
};

export function QuickPlayGamePage({kind}:{kind:Kind}){
 const {t,i18n}=useTranslation("home");
 const zh=Boolean(i18n.resolvedLanguage?.startsWith("zh"));
 const [friendId,setFriendId]=useState(initialFriend);
 const friend=getCrewFriend(friendId);
 const [round,setRound]=useState(0);
 const [cue,setCue]=useState<VoiceCue>({id:0,text:""});
 const [voiceActive,setVoiceActive]=useState(false);
 const [settledCueId,setSettledCueId]=useState(0);
 const cueCounter=useRef(0);
 const speechRef=useRef<(text:string)=>void>(()=>{});
 const onCue=useCallback((text:string)=>{const id=++cueCounter.current;setCue({id,text});return id},[]);
 const onCueSettled=useCallback((id:number)=>setSettledCueId(prev=>Math.max(prev,id)),[]);
 const registerSpeech=useCallback((handler:(text:string)=>void)=>{speechRef.current=handler},[]);
 useEffect(()=>{trackUsageEvent("game_open",kind)},[kind]);
 useEffect(()=>{document.body.classList.add("teacher-theme");return()=>document.body.classList.remove("teacher-theme")},[]);
 const changeFriend=(next:string)=>{
  if(!CREW_FRIENDS.some(f=>f.id===next)||next===friendId)return;
  setFriendId(next);setRound(value=>value+1);
  try{localStorage.setItem(FRIEND_KEY,next)}catch{/* optional preference */}
 };
 const bomb=kind==="number-bomb";
 return <div className="crew-play-page crew-mini-page crew-quick-page">
  <header className="crew-play-game-header crew-play-game-header--compact">
   <Link to="/games" className="crew-play-back">← {t("playHub.allGames")}</Link>
   <span className="crew-play-eyebrow">CREW PLAY · {zh?"免費直接玩":"Play free now"}</span>
   <h1>{bomb?(zh?"終極密碼":"Number Bomb"):(zh?"翻牌記憶":"Memory Match")}</h1>
   <p>{bomb?(zh?"你來猜秘密數字，AI 朋友當主持人公布高低提示。":"Choose a number and let your AI friend host the game."):
     (zh?"翻出相同圖案就繼續翻，翻錯才換朋友。":"Match two cards to earn another turn; a miss passes play.")}</p>
  </header>
  <div className="crew-play-frame">
   <section className="crew-play-friend-bar">
    <div className="crew-play-friend-name"><FriendAvatar friend={friend}/><div><strong>{friend.name}</strong><small>{zh?"免費可玩 · 開啟語音陪玩需 Gemini Key":"Free to play · Gemini Key needed for voice"}</small></div></div>
    <GamePanel title={zh?"選擇對手":"Choose a friend"} label={t("playHub.changeFriend")}>
     <label className="crew-play-friend-select">{zh?"對手":"Opponent"}
      <select value={friendId} onChange={e=>changeFriend(e.target.value)}>{CREW_FRIENDS.map(f=><option value={f.id} key={f.id}>{f.name}</option>)}</select>
     </label>
     <p>{zh?"更換朋友會重新開始這一局。":"Changing friends starts a new round."}</p>
    </GamePanel>
   </section>
   {bomb?<NumberBombRound key={friendId+":"+round} friend={friend} zh={zh} onCue={onCue} registerSpeech={registerSpeech} voiceActive={voiceActive} settledCueId={settledCueId}/>:
    <MemoryRound key={friendId+":"+round} friend={friend} zh={zh} onCue={onCue} registerSpeech={registerSpeech} voiceActive={voiceActive} settledCueId={settledCueId}/>}
   <MiniGameVoice key={kind+":"+friendId} kind={kind} friend={friend} cue={cue} onSpeech={text=>speechRef.current(text)} onVoiceActiveChange={setVoiceActive} onCueSettled={onCueSettled}/>
  </div>
 </div>;
}

function NumberBombRound({friend,zh,onCue,registerSpeech,voiceActive,settledCueId}:RoundProps){
 const [state,setState]=useState<BombState>(newBomb);
 const [selected,setSelected]=useState(50);
 const [error,setError]=useState("");
 const [waitingCueId,setWaitingCueId]=useState<number|null>(null);
 const started=useRef(false),completed=useRef(false);
 const pendingNarration=useRef<{move:number;text:string}|null>(null);
 const current=Math.max(state.low,Math.min(state.high,selected));
 const waitingHost=voiceActive&&waitingCueId!==null;
 const begin=()=>{
  if(!started.current){started.current=true;trackUsageEvent("game_started","number-bomb")}
 };
 const choose=(value:number)=>{
  if(state.turn!=="player"||state.winner||waitingHost)return;
  const next=bombGuess(state,value,"player");
  if(!next){setError(zh?"請選目前範圍內的整數。":"Select a whole number within the range.");return}
  begin();setError("");setState(next);
  const last=next.history[next.history.length-1];
  pendingNarration.current={move:next.history.length,text:
   "Number Bomb HOST: The player CONFIRMED guess "+value+". Official result: "+
   (last.hint==="correct"?"Correct! Player wins; the secret was "+next.secret+".":last.hint==="higher"?"Too low.":"Too high.")+
   (next.winner?"":" Updated public range: "+next.low+" to "+next.high+". The player may guess again.")+
   " The result is already on screen. Announce this verified hint in ONE short natural sentence as the host, then stay quiet."};
 };
 useEffect(()=>{setSelected(bombComputerGuess(state))},[state.low,state.high]);
 useEffect(()=>{
  registerSpeech(text=>{const guess=parseBombSpeech(text);if(guess!==null)choose(guess)});
 },[registerSpeech,state,zh]);
 // Speak only after the selected guess has been committed and the new range rendered.
 useEffect(()=>{
  const pending=pendingNarration.current;
  if(!pending||pending.move!==state.history.length)return;
  pendingNarration.current=null;
  const timer=window.setTimeout(()=>{
   const id=onCue(pending.text);
   if(voiceActive)setWaitingCueId(id);
  },140);
  return()=>window.clearTimeout(timer);
 },[state.history.length,onCue,voiceActive]);
 useEffect(()=>{
  if(waitingCueId!==null&&(settledCueId>=waitingCueId||!voiceActive))setWaitingCueId(null);
 },[waitingCueId,settledCueId,voiceActive]);
 useEffect(()=>{
  if(waitingCueId===null)return;
  const timer=window.setTimeout(()=>setWaitingCueId(null),11500);
  return()=>window.clearTimeout(timer);
 },[waitingCueId]);
 useEffect(()=>{
  if(!state.winner||completed.current)return;
  completed.current=true;trackUsageEvent("game_completed","number-bomb");
 },[state.winner]);
 const reset=()=>{
  started.current=false;completed.current=false;setState(newBomb());setSelected(50);setError("");
  pendingNarration.current=null;setWaitingCueId(null);
 };
 const last=state.history[state.history.length-1];
 const result=state.winner==="player"?"win":"lose";
 return <section className="crew-quick-stage" aria-label={zh?"終極密碼遊戲":"Number Bomb game"}>
  <div className="crew-quick-status" role="status" aria-live="polite">
   <strong>{state.winner?(zh?"你猜中了！":"You found it!"):waitingHost?(zh?friend.name+" 正在公布提示…":friend.name+" is announcing the hint…"):(zh?"你猜，"+friend.name+" 主持":"You guess · "+friend.name+" hosts")}</strong>
   <span>{zh?"已猜 "+state.history.length+" 次":state.history.length+" guesses"}</span>
  </div>
  <div className="crew-quick-range"><span>{state.low}</span><div><small>{zh?"秘密數字的範圍":"The secret is between"}</small><strong>{state.low} — {state.high}</strong></div><span>{state.high}</span></div>
  {last&&!state.winner?<p className="crew-quick-feedback" role="status"><strong>{last.side==="player"?(zh?"你":"You"):friend.name}：</strong>{last.value} · {last.hint==="higher"?(zh?"太小了，再猜大一點 ↑":"Too low ↑"):(zh?"太大了，再猜小一點 ↓":"Too high ↓")}</p>:
   !last?<p className="crew-quick-feedback">{zh?"滑動滾輪選數字，按「猜這個」就開始。":"Swipe to a number and tap Guess to start."}</p>:null}
  {!state.winner?<div className="crew-quick-guess">
    <NumberWheel min={state.low} max={state.high} value={current} onChange={setSelected} disabled={state.turn!=="player"||waitingHost} zh={zh}/>
    <div className="crew-number-wheel-actions">
     <button type="button" className="crew-number-wheel-step" disabled={state.turn!=="player"||waitingHost||current<=state.low} onClick={()=>setSelected(current-1)} aria-label={zh?"減一":"Decrease by one"}>−</button>
     <button type="button" className="crew-mini-primary crew-number-wheel-submit" disabled={state.turn!=="player"||waitingHost} onClick={()=>choose(current)}>
      {zh?"猜 ":"Guess "}<strong>{current}</strong>
     </button>
     <button type="button" className="crew-number-wheel-step" disabled={state.turn!=="player"||waitingHost||current>=state.high} onClick={()=>setSelected(current+1)} aria-label={zh?"加一":"Increase by one"}>+</button>
    </div>
  </div>:null}
  {error?<p role="alert" className="crew-quick-error">{error}</p>:null}
  <ol className="crew-quick-history" aria-label={zh?"本局猜測紀錄":"Guess history"}>
   {state.history.map((item,index)=><li key={index}><span>{zh?"你":"You"}</span><strong>{item.value}</strong><small>{item.hint==="correct"?"✓":item.hint==="higher"?"↑":"↓"}</small></li>)}
  </ol>
  {state.winner?<div className="crew-quick-finish" aria-live="polite"><h2>{zh?"答案是 ":"Answer: "}{state.secret}</h2>
   <p>{friendGameReaction(friend.id,result,zh?"zh":"en")}</p>
   <button type="button" className="crew-mini-primary" onClick={reset}>{zh?"再玩一局":"Play again"}</button>
  </div>:null}
  {!state.winner?<button type="button" className="crew-quick-reset" onClick={reset}>{zh?"重新開局":"New round"}</button>:null}
 </section>;
}

function MemoryRound({friend,zh,onCue,registerSpeech,voiceActive,settledCueId}:RoundProps){
 const [pairs,setPairs]=useState(6);
 const [state,setState]=useState<MemoryState>(()=>newMemory(6));
 const started=useRef(false),completed=useRef(false);
 const [waitingCueId,setWaitingCueId]=useState<number|null>(null);
 const resolvedNarration=useRef<{move:number;text:string;holdFriend:boolean}|null>(null);
 const restart=(count=pairs)=>{
  started.current=false;completed.current=false;resolvedNarration.current=null;
  setWaitingCueId(null);setState(newMemory(count));
 };
 const choose=(index:number)=>{
  if(state.turn!=="player"||state.finished||state.open.length>=2||state.matched.includes(index)||state.open.includes(index))return;
  if(!started.current){started.current=true;trackUsageEvent("game_started","memory")}
  setState(previous=>flipMemory(previous,index)||previous);
 };
 useEffect(()=>{
  registerSpeech(text=>{const card=parseMemorySpeech(text);if(card!==null)choose(card-1)});
 },[registerSpeech,state,zh]);
 useEffect(()=>{
  if(state.open.length!==2||state.finished)return;
  const timer=window.setTimeout(()=>{
   const next=resolveMemory(state);if(!next)return;
   const first=state.open[0],second=state.open[1],match=Boolean(next.lastMatch);
   // Commit the resolved pair first: narration waits until after the DOM updates.
   resolvedNarration.current={move:next.moves,holdFriend:state.turn==="friend"&&match&&!next.finished,
    text:"Memory Match PAIR COMPLETED AND BOARD UPDATED. "+(state.turn==="player"?"The player":friend.name)+
    " finished revealing card "+(first+1)+" and card "+(second+1)+
    ". Both PUBLIC faces were "+icons[state.cards[first]]+" and "+icons[state.cards[second]]+". "+
    (match?"The two cards match. The same player gets another turn.":"They do not match. The turn passes to the other player.")+
    " Verified score: player "+next.playerPairs+", "+friend.name+" "+next.friendPairs+"."+
    (next.finished?" The round is complete.":"")+" Only now say ONE brief playful sentence. Be silent during the flips."};
   setState(next);
  },850);
  return()=>window.clearTimeout(timer);
 },[state,friend.name,onCue]);
 // Deliver only after the resolved pair has been rendered, not on either individual flip.
 useEffect(()=>{
  const pending=resolvedNarration.current;
  if(!pending||pending.move!==state.moves)return;
  resolvedNarration.current=null;
  const timer=window.setTimeout(()=>{
   const id=onCue(pending.text);
   if(pending.holdFriend&&voiceActive)setWaitingCueId(id);
  },140);
  return()=>window.clearTimeout(timer);
 },[state.moves,onCue,voiceActive]);
 // As in Gomoku, a matched friend turn waits until the spoken reply is drained.
 useEffect(()=>{
  if(waitingCueId===null)return;
  if(settledCueId>=waitingCueId||!voiceActive)setWaitingCueId(null);
 },[waitingCueId,settledCueId,voiceActive]);
 useEffect(()=>{
  if(waitingCueId===null)return;
  const timer=window.setTimeout(()=>setWaitingCueId(null),11500);
  return()=>window.clearTimeout(timer);
 },[waitingCueId]);
 useEffect(()=>{
  if(state.turn!=="friend"||state.finished||state.open.length>=2||waitingCueId!==null)return;
  const timer=window.setTimeout(()=>{
   const index=memoryComputerPick(state);
   if(index!==null)setState(previous=>flipMemory(previous,index)||previous);
  },480);
  return()=>window.clearTimeout(timer);
 },[state,waitingCueId]);
 useEffect(()=>{
  if(!state.finished||completed.current)return;
  completed.current=true;trackUsageEvent("game_completed","memory");
 },[state.finished]);
 const verdict=state.playerPairs===state.friendPairs?"challenge":state.playerPairs>state.friendPairs?"win":"lose";
 const status=state.finished?(zh?"這局結束！":"Round complete!"):
  waitingCueId!==null?(zh?friend.name+" 說完再繼續翻牌…":friend.name+" is finishing a reply…"):
  state.open.length===1?(zh?"再翻一張！":"Flip one more card!"):
  state.turn==="player"?
   (state.lastMatch&&state.lastSide==="player"?(zh?"配對成功！你可以繼續翻！":"Match! You get another turn!"):(zh?"輪到你翻牌！":"Your turn!")):
   (state.lastMatch&&state.lastSide==="friend"?(zh?friend.name+" 配對成功，繼續翻！":friend.name+" matched and goes again!"):(zh?friend.name+" 正在翻牌…":friend.name+" is flipping…"));
 return <section className="crew-quick-stage crew-memory-stage" aria-label={zh?"翻牌記憶遊戲":"Memory Match game"}>
  <div className="crew-quick-status" role="status" aria-live="polite"><strong>{status}</strong>
   <span>{zh?"第 "+(state.moves+1)+" 回合":"Turn "+(state.moves+1)}</span></div>
  <div className="crew-memory-score"><strong>{zh?"你":"You"} <span>{state.playerPairs}</span></strong><span>{zh?"配對成功":"Matched pairs"}</span><strong>{friend.name} <span>{state.friendPairs}</span></strong></div>
  <div className="crew-memory-level" role="group" aria-label={zh?"卡片難度":"Card difficulty"}>
   {[6,8].map(count=><button type="button" key={count} aria-pressed={pairs===count} onClick={()=>{if(count===pairs)return;setPairs(count);restart(count)}}>
    {count===6?(zh?"輕鬆 · 12 張":"Easy · 12 cards"):(zh?"進階 · 16 張":"Hard · 16 cards")}
   </button>)}
  </div>
  <p className="crew-quick-feedback">{zh?"翻中相同圖案就繼續翻；不同才換人。也可以說「翻第 3 張」。":"Match a pair to keep your turn; miss to pass. You can also say 'flip card 3'."}</p>
  <div className="crew-memory-grid" role="group" aria-label={zh?"翻牌區":"Cards"}>
   {state.cards.map((value,index)=>{
    const matched=state.matched.includes(index),faceUp=matched||state.open.includes(index);
    return <button type="button" key={index} className={"crew-memory-card"+(faceUp?" is-open":"")+(matched?" is-matched":"")}
     aria-label={zh?"第 "+(index+1)+" 張"+(faceUp?"，"+icons[value]:"，未翻開"):"Card "+(index+1)+(faceUp?", "+icons[value]:", face down")}
     aria-pressed={faceUp} disabled={state.turn!=="player"||state.finished||faceUp||state.open.length>=2} onClick={()=>choose(index)}>
     <span className="crew-memory-card-number" aria-hidden="true">{index+1}</span>
     <span aria-hidden="true">{faceUp?icons[value]:"✦"}</span>
    </button>;
   })}
  </div>
  {state.finished?<div className="crew-quick-finish" aria-live="polite">
   <h2>{state.playerPairs===state.friendPairs?(zh?"平手！":"Draw!"):(state.playerPairs>state.friendPairs?(zh?"你贏了！":"You win!"):(zh?friend.name+" 贏了！":friend.name+" wins!"))}</h2>
   <p>{friendGameReaction(friend.id,verdict,zh?"zh":"en")}</p>
   <button type="button" className="crew-mini-primary" onClick={()=>restart()}>{zh?"再玩一局":"Play again"}</button>
  </div>:<button type="button" className="crew-quick-reset" onClick={()=>restart()}>{zh?"重新洗牌":"Shuffle & restart"}</button>}
 </section>;
}
