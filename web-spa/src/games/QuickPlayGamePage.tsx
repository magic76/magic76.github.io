import {useEffect,useRef,useState,type FormEvent} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {CREW_FRIENDS,getCrewFriend} from "../friends/friendProfiles";
import {FriendAvatar} from "../friends/FriendAvatar";
import {GamePanel} from "./GamePanel";
import {trackUsageEvent} from "../analytics/usage";
import {friendGameReaction} from "./friendGameReaction";
import {bombComputerGuess,bombGuess,flipMemory,memoryComputerPick,newBomb,newMemory,resolveMemory,
 type BombState,type MemoryState} from "./quickPlayEngine";
import "./crewPlay.css";
import "./quickPlay.css";

type Kind="number-bomb"|"memory";
type Friend=ReturnType<typeof getCrewFriend>;
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
 useEffect(()=>{trackUsageEvent("game_open",kind)},[kind]);
 const changeFriend=(next:string)=>{
  if(!CREW_FRIENDS.some(f=>f.id===next)||next===friendId)return;
  setFriendId(next);setRound(value=>value+1);
  try{localStorage.setItem(FRIEND_KEY,next)}catch{/* optional preference */}
 };
 const bomb=kind==="number-bomb";
 return <div className="crew-play-page crew-quick-page">
  <header className="crew-play-game-header crew-play-game-header--compact">
   <Link to="/games" className="crew-play-back">← {t("playHub.allGames")}</Link>
   <span className="crew-play-eyebrow">CREW PLAY · {zh?"免費直接玩":"Play free now"}</span>
   <h1>{bomb?(zh?"終極密碼":"Number Bomb"):(zh?"翻牌記憶":"Memory Match")}</h1>
   <p>{bomb?(zh?"輪流猜 1～100 的秘密數字，跟著提示縮小範圍。":"Take turns guessing a hidden number from 1 to 100."):
     (zh?"翻出相同的圖案，和朋友比比誰記得更多。":"Find matching pairs and outscore your friend.")}</p>
  </header>
  <div className="crew-play-frame">
   <section className="crew-play-friend-bar">
    <div className="crew-play-friend-name"><FriendAvatar friend={friend}/><div><strong>{friend.name}</strong><small>{zh?"和你一起玩 · 不需要 Gemini Key":"Play together · No Gemini key needed"}</small></div></div>
    <GamePanel title={zh?"選擇對手":"Choose a friend"} label={t("playHub.changeFriend")}>
     <label className="crew-play-friend-select">{zh?"對手":"Opponent"}
      <select value={friendId} onChange={e=>changeFriend(e.target.value)}>{CREW_FRIENDS.map(f=><option value={f.id} key={f.id}>{f.name}</option>)}</select>
     </label>
     <p>{zh?"更換朋友會重新開始這一局。":"Changing friends starts a new round."}</p>
    </GamePanel>
   </section>
   {bomb?<NumberBombRound key={friendId+":"+round} friend={friend} zh={zh}/>:
    <MemoryRound key={friendId+":"+round} friend={friend} zh={zh}/>}
  </div>
 </div>;
}

function NumberBombRound({friend,zh}:{friend:Friend;zh:boolean}){
 const [state,setState]=useState<BombState>(newBomb);
 const [input,setInput]=useState("");
 const [error,setError]=useState("");
 const started=useRef(false),completed=useRef(false);
 const begin=()=>{
  if(!started.current){started.current=true;trackUsageEvent("game_started","number-bomb")}
 };
 const choose=(value:number)=>{
  if(state.turn!=="player"||state.winner)return;
  const next=bombGuess(state,value,"player");
  if(!next){setError(zh?"請輸入目前範圍內的整數。":"Enter a whole number within the range.");return}
  begin();setError("");setInput("");setState(next);
 };
 const submit=(e:FormEvent)=>{e.preventDefault();if(input.trim())choose(Number(input));else setError(zh?"先輸入一個數字。":"Enter a number first.")};
 useEffect(()=>{
  if(state.turn!=="friend"||state.winner)return;
  const timer=window.setTimeout(()=>setState(previous=>previous.turn==="friend"&&!previous.winner?
   bombGuess(previous,bombComputerGuess(previous),"friend")||previous:previous),650);
  return()=>window.clearTimeout(timer);
 },[state]);
 useEffect(()=>{
  if(!state.winner||completed.current)return;
  completed.current=true;trackUsageEvent("game_completed","number-bomb");
 },[state.winner]);
 const reset=()=>{started.current=false;completed.current=false;setState(newBomb());setInput("");setError("")};
 const last=state.history[state.history.length-1];
 const result=state.winner==="player"?"win":"lose";
 return <section className="crew-quick-stage" aria-label={zh?"終極密碼棋盤":"Number Bomb game"}>
  <div className="crew-quick-status" role="status" aria-live="polite">
   <strong>{state.winner?(state.winner==="player"?(zh?"你猜中了！":"You found it!"):(zh?friend.name+" 猜中了！":friend.name+" found it!")):
    state.turn==="player"?(zh?"輪到你猜！":"Your turn to guess!"):(zh?friend.name+" 正在猜…":friend.name+" is guessing…")}</strong>
   <span>{zh?"已猜 "+state.history.length+" 次":state.history.length+" guesses"}</span>
  </div>
  <div className="crew-quick-range"><span>{state.low}</span><div><small>{zh?"秘密數字的範圍":"The secret is between"}</small><strong>{state.low} — {state.high}</strong></div><span>{state.high}</span></div>
  {last&&!state.winner?<p className="crew-quick-feedback" role="status"><strong>{last.side==="player"?(zh?"你":"You"):friend.name}：</strong>{last.value} · {last.hint==="higher"?(zh?"太小了，再猜大一點 ↑":"Too low ↑"):(zh?"太大了，再猜小一點 ↓":"Too high ↓")}</p>:
   !last?<p className="crew-quick-feedback">{zh?"直接選中間數開始，或輸入你想猜的數字。":"Tap the middle number or enter your own guess to start."}</p>:null}
  {!state.winner?<form className="crew-quick-guess" onSubmit={submit}>
   <label htmlFor="crew-bomb-guess">{zh?"你的答案":"Your guess"}</label>
   <div className="crew-quick-guess-row">
    <input id="crew-bomb-guess" type="number" inputMode="numeric" min={state.low} max={state.high} step="1" value={input} placeholder={String(bombComputerGuess(state))}
     disabled={state.turn!=="player"} onChange={e=>{setInput(e.target.value);setError("")}}/>
    <button className="crew-mini-primary" type="submit" disabled={state.turn!=="player"}>{zh?"猜這個！":"Guess"}</button>
   </div>
   <button type="button" className="crew-quick-shortcut" disabled={state.turn!=="player"} onClick={()=>choose(bombComputerGuess(state))}>
    {zh?"快速猜中間數 ":"Guess the middle: "}<strong>{bombComputerGuess(state)}</strong>
   </button>
  </form>:null}
  {error?<p role="alert" className="crew-quick-error">{error}</p>:null}
  <ol className="crew-quick-history" aria-label={zh?"本局猜測紀錄":"Guess history"}>
   {state.history.map((item,index)=><li key={index}><span>{item.side==="player"?(zh?"你":"You"):friend.name}</span><strong>{item.value}</strong><small>{item.hint==="correct"?"✓":item.hint==="higher"?"↑":"↓"}</small></li>)}
  </ol>
  {state.winner?<div className="crew-quick-finish" aria-live="polite"><h2>{zh?"答案是 ":"Answer: "}{state.secret}</h2>
   <p>{friendGameReaction(friend.id,result,zh?"zh":"en")}</p>
   <button type="button" className="crew-mini-primary" onClick={reset}>{zh?"再玩一局":"Play again"}</button>
  </div>:null}
  {!state.winner?<button type="button" className="crew-quick-reset" onClick={reset}>{zh?"重新開局":"New round"}</button>:null}
 </section>;
}

function MemoryRound({friend,zh}:{friend:Friend;zh:boolean}){
 const [pairs,setPairs]=useState(6);
 const [state,setState]=useState<MemoryState>(()=>newMemory(6));
 const started=useRef(false),completed=useRef(false);
 const restart=(count=pairs)=>{started.current=false;completed.current=false;setState(newMemory(count))};
 const choose=(index:number)=>{
  if(state.turn!=="player"||state.finished||state.open.length>=2||state.matched.includes(index)||state.open.includes(index))return;
  if(!started.current){started.current=true;trackUsageEvent("game_started","memory")}
  setState(previous=>flipMemory(previous,index)||previous);
 };
 useEffect(()=>{
  if(state.open.length!==2||state.finished)return;
  const timer=window.setTimeout(()=>setState(previous=>resolveMemory(previous)||previous),850);
  return()=>window.clearTimeout(timer);
 },[state]);
 useEffect(()=>{
  if(state.turn!=="friend"||state.finished||state.open.length>=2)return;
  const timer=window.setTimeout(()=>setState(previous=>{
   if(previous.turn!=="friend"||previous.finished||previous.open.length>=2)return previous;
   const index=memoryComputerPick(previous);
   return index===null?previous:flipMemory(previous,index)||previous;
  }),480);
  return()=>window.clearTimeout(timer);
 },[state]);
 useEffect(()=>{
  if(!state.finished||completed.current)return;
  completed.current=true;trackUsageEvent("game_completed","memory");
 },[state.finished]);
 const verdict=state.playerPairs===state.friendPairs?"challenge":state.playerPairs>state.friendPairs?"win":"lose";
 return <section className="crew-quick-stage crew-memory-stage" aria-label={zh?"翻牌記憶遊戲":"Memory Match game"}>
  <div className="crew-quick-status" role="status" aria-live="polite"><strong>{state.finished?(zh?"這局結束！":"Round complete!"):
   state.turn==="player"?(zh?"輪到你翻牌！":"Your turn!"):(zh?friend.name+" 正在翻牌…":friend.name+" is flipping…")}</strong>
   <span>{zh?"第 "+(state.moves+1)+" 回合":"Turn "+(state.moves+1)}</span></div>
  <div className="crew-memory-score"><strong>{zh?"你":"You"} <span>{state.playerPairs}</span></strong><span>{zh?"配對成功":"Matched pairs"}</span><strong>{friend.name} <span>{state.friendPairs}</span></strong></div>
  <div className="crew-memory-level" role="group" aria-label={zh?"卡片難度":"Card difficulty"}>
   {[6,8].map(count=><button type="button" key={count} aria-pressed={pairs===count} onClick={()=>{if(count===pairs)return;setPairs(count);restart(count)}}>
    {count===6?(zh?"輕鬆 · 12 張":"Easy · 12 cards"):(zh?"進階 · 16 張":"Hard · 16 cards")}
   </button>)}
  </div>
  <p className="crew-quick-feedback">{zh?"一次翻兩張，記住圖案的位置。輪到朋友時，看看誰記得更清楚！":"Flip two cards per turn. Remember their places and try to beat your friend!"}</p>
  <div className="crew-memory-grid" role="group" aria-label={zh?"翻牌區":"Cards"}>
   {state.cards.map((value,index)=>{
    const matched=state.matched.includes(index),faceUp=matched||state.open.includes(index);
    return <button type="button" key={index} className={"crew-memory-card"+(faceUp?" is-open":"")+(matched?" is-matched":"")}
     aria-label={zh?"第 "+(index+1)+" 張"+(faceUp?"，"+icons[value]:"，未翻開"):"Card "+(index+1)+(faceUp?", "+icons[value]:", face down")}
     aria-pressed={faceUp} disabled={state.turn!=="player"||state.finished||faceUp||state.open.length>=2} onClick={()=>choose(index)}>
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
