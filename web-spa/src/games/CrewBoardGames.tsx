import {useEffect,useMemo,useRef,useState,type CSSProperties} from "react";
import {loadScript} from "../lib/runtime";
import type {ExpectedBoardSpeech} from "./boardVoiceTurn";
import {trackUsageEvent} from "../analytics/usage";

type GameKind="connect4"|"reversi";
type Props={kind:GameKind;english:boolean;friendName:string;
 onEvent:(message:string)=>void;
 onBoardMove:(message:string,expected:ExpectedBoardSpeech)=>Promise<void>;
 onSkipSpeech:()=>void;
 onReaction?:(event:"win"|"lose"|"progress"|"challenge")=>void;
};
const position=(x:number,y:number)=>String.fromCharCode(65+x)+(y+1);
export function CrewBoardGames({kind,english,friendName,onEvent,onBoardMove,onSkipSpeech,onReaction}:Props){
 const [connect,setConnect]=useState<CrewConnect4State|null>(null);
 const [reversi,setReversi]=useState<CrewReversiState|null>(null);
 const [error,setError]=useState("");
 const [round,setRound]=useState(0);
 const [speechPending,setSpeechPending]=useState(false);
 const [flipAnimation,setFlipAnimation]=useState<{id:number;previous:Record<number,"black"|"white">}|null>(null);
 const [connectDrop,setConnectDrop]=useState<{id:number;index:number;duration:number}|null>(null);
 const connectDropSeqRef=useRef(0);
 const connectDropIdRef=useRef<number|null>(null);
 const connectDropTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const connectResultRef=useRef<string|null>(null);
 const flipSequenceRef=useRef(0);
 const flipTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{
  if(flipTimerRef.current!==null)clearTimeout(flipTimerRef.current);
  if(connectDropTimerRef.current!==null)clearTimeout(connectDropTimerRef.current);
  connectDropIdRef.current=null;
 },[]);
 const finishConnectDrop=(id:number)=>{
  if(connectDropIdRef.current!==id)return;
  connectDropIdRef.current=null;
  if(connectDropTimerRef.current!==null)clearTimeout(connectDropTimerRef.current);
  connectDropTimerRef.current=null;
  setConnectDrop(null);
  const result=connectResultRef.current;
  connectResultRef.current=null;
  if(result)onEvent(result);
 };
 const animateConnectDrop=(next:CrewConnect4State)=>{
  const index=next.lastMove;
  if(index===null)return;
  if(connectDropTimerRef.current!==null)clearTimeout(connectDropTimerRef.current);
  const duration=350+(Math.floor(index/7)+1)*65;
  const id=++connectDropSeqRef.current;
  if(typeof window!=="undefined"&&window.matchMedia?.("(prefers-reduced-motion: reduce)").matches){
   connectDropIdRef.current=null;
   setConnectDrop(null);
   const result=connectResultRef.current;
   connectResultRef.current=null;
   if(result)onEvent(result);
   return;
  }
  connectDropIdRef.current=id;
  setConnectDrop({id,index,duration});
  // A fallback timer only releases the turn if animationend is not delivered.
  connectDropTimerRef.current=setTimeout(()=>finishConnectDrop(id),duration+120);
 };
 const applyReversiMove=(previous:CrewReversiState,next:CrewReversiState)=>{
  if(flipTimerRef.current!==null)clearTimeout(flipTimerRef.current);
  flipTimerRef.current=null;
  const before:Record<number,"black"|"white">={};
  for(const index of next.flipped){
   const color=previous.cells[index];
   if(color==="black"||color==="white")before[index]=color;
  }
  if(Object.keys(before).length){
   setFlipAnimation({id:++flipSequenceRef.current,previous:before});
   flipTimerRef.current=setTimeout(()=>{setFlipAnimation(null);flipTimerRef.current=null},700);
  }else setFlipAnimation(null);
  setReversi(next);
 };
 const speechGateRef=useRef(false);
 // A fast double tap can fire twice before React commits the new turn.
 // Lock moves synchronously so one gesture can never place two pieces.
 const playerMoveLockRef=useRef(false);
 useEffect(()=>{
  if(connect?.turn==="player"&&!connectDrop&&!speechPending)playerMoveLockRef.current=false;
  if(reversi?.turn==="black"&&!speechPending)playerMoveLockRef.current=false;
 },[connect?.turn,reversi?.turn,connectDrop,speechPending]);
 const roundEpochRef=useRef(0);
 const playedRef=useRef(false),completedRef=useRef(false);
 const noteMove=()=>{if(!playedRef.current){playedRef.current=true;trackUsageEvent("game_started",kind)}};
 const narrateMove=(cue:string,expected:ExpectedBoardSpeech,placeStone:()=>void)=>{
  const epoch=roundEpochRef.current;
  // The engine decides its next move now, but the board stays unchanged
  // until the verified commentary has actually finished playing.
  speechGateRef.current=true;
  setSpeechPending(true);
  void onBoardMove(cue,expected).catch(()=>{}).finally(()=>{
   if(roundEpochRef.current!==epoch)return; // Reset invalidated this move.
   placeStone();
   speechGateRef.current=false;
   setSpeechPending(false);
  });
 };
 const skipSpeech=()=>onSkipSpeech();
 useEffect(()=>{
  let active=true;setConnect(null);setReversi(null);setError("");
  if(connectDropTimerRef.current!==null)clearTimeout(connectDropTimerRef.current);
  connectDropTimerRef.current=null;
  connectDropIdRef.current=null;
  connectResultRef.current=null;
  setConnectDrop(null);
  playedRef.current=false;completedRef.current=false;
  loadScript("/games/crew-play-engine.js").then(()=>{
   if(!active)return;
   const api=window.CrewPlayEngine;
   if(!api)throw Error("Missing board rules");
   if(kind==="connect4")setConnect(api.connect4New());
   else setReversi(api.reversiNew());
  }).catch(()=>{if(active)setError(english?"Could not load the game engine.":"遊戲載入失敗，請重新整理頁面。")});
  return()=>{active=false};
 },[kind,english,round]);
 const api=typeof window === 'undefined' ? undefined : window.CrewPlayEngine;
 useEffect(()=>{
  const winner=kind==="connect4"?connect?.winner:reversi?.winner;
  if(winner&&!completedRef.current){completedRef.current=true;trackUsageEvent("game_completed",kind);onReaction?.(winner==="draw"?"challenge":kind==="connect4"?(winner==="player"?"win":"lose"):(winner==="black"?"win":"lose"))}
 },[kind,connect?.winner,reversi?.winner]);
 const restart=()=>{
  roundEpochRef.current+=1;
  speechGateRef.current=false;
  playerMoveLockRef.current=false;
  setSpeechPending(false);
  if(flipTimerRef.current!==null)clearTimeout(flipTimerRef.current);
  flipTimerRef.current=null;
  setFlipAnimation(null);
  if(connectDropTimerRef.current!==null)clearTimeout(connectDropTimerRef.current);
  connectDropTimerRef.current=null;
  connectDropIdRef.current=null;
  connectResultRef.current=null;
  setConnectDrop(null);
  onSkipSpeech();
  setRound(value=>value+1);
  onEvent("[GAME RESET] We started a fresh round. Make a short friendly comment, then wait.");
 };
 const c4Turn=connect?.turn==="player"&&!connect?.winner&&!speechPending&&!speechGateRef.current&&!connectDrop&&connectDropIdRef.current===null;
 const c4Play=(column:number)=>{
  if(!connect||!api||!c4Turn||speechGateRef.current||connectDropIdRef.current!==null||playerMoveLockRef.current)return;
  const next=api.connect4Drop(connect,column,"player");
  if(!next)return;
  playerMoveLockRef.current=true;
  noteMove();onReaction?.("progress");
  connectResultRef.current=next.winner?"[CONNECT FOUR RESULT] The learner won. React briefly and warmly.":null;
  setConnect(next);
  animateConnectDrop(next);
 };
 useEffect(()=>{
  if(kind!=="connect4"||!connect||!api||connect.turn!=="computer"||connect.winner||speechPending||speechGateRef.current||connectDrop||connectDropIdRef.current!==null)return;
  const timer=setTimeout(()=>{
   const column=api.connect4AI(connect);
   if(column===null)return;
   const next=api.connect4Drop(connect,column,"computer");
   if(!next)return;
   const outcome=next.winner===null?"":next.winner==="computer"?"You will win.":next.winner==="draw"?"This will end in a draw.":"The learner will win.";
   narrateMove("[CONNECT FOUR BEFORE MOVE] The learner's disc is already on the board. Your NEXT yellow disc has been selected for column "+(column+1)+" but HAS NOT been placed yet. Say 'I'll play column "+(column+1)+"' in one short natural sentence. "+outcome+" Do not claim your disc is already placed. Do not answer older learner move intentions or ask a follow-up question. After your audio finishes, the board will place it.",
    {kind:"connect4",position:String(column+1)},()=>{setConnect(next);animateConnectDrop(next)});
  },60);
  return()=>clearTimeout(timer);
 },[connect,kind,api,onEvent,speechPending,connectDrop]);
 const score=reversi&&api?api.reversiCount(reversi.cells):null;
 const legal=useMemo(()=>reversi&&api?api.reversiMoves(reversi,"black"):[],[reversi,api]);
 const allowed=new Set(legal.map(move=>move.y*8+move.x));
 const revPlay=(x:number,y:number)=>{
  if(!reversi||!api||reversi.turn!=="black"||reversi.winner||speechGateRef.current||speechPending||playerMoveLockRef.current)return;
  const next=api.reversiPlace(reversi,x,y,"black");
  if(!next)return;
  playerMoveLockRef.current=true;
  noteMove();onReaction?.("progress");applyReversiMove(reversi,next);
  if(next.winner)onEvent("[REVERSI RESULT] "+(next.winner==="draw"?"It is a draw.":next.winner==="black"?"The learner won.":"You won.")+" React briefly.");
 };
 useEffect(()=>{
  if(kind!=="reversi"||!reversi||!api||reversi.turn!=="white"||reversi.winner||speechPending||speechGateRef.current)return;
  const timer=setTimeout(()=>{
   const move=api.reversiAI(reversi);
   if(!move)return;
   const next=api.reversiPlace(reversi,move.x,move.y,"white");
   if(!next)return;
   const outcome=next.winner===null?"":next.winner==="draw"?"The game will be a draw.":next.winner==="white"?"This will win the game.":"The learner will win.";
   const pass=next.turn==="white"&&!next.winner?" After placement, the learner has no legal move; you will take another turn.":"";
   narrateMove("[REVERSI BEFORE MOVE] The learner's black move is already on the board. Your NEXT white stone is selected for "+position(move.x,move.y)+" (column "+(move.x+1)+", row "+(move.y+1)+") but HAS NOT been placed yet; "+move.flips.length+" discs will flip afterward. Say the coordinate "+position(move.x,move.y)+" naturally (for example, 'I'll play "+position(move.x,move.y)+"') in one short sentence so the learner can follow the visible column and row labels. "+outcome+pass+" Do not claim you have already played. Do not revisit the learner's earlier intentions. After your audio ends, the board will place the white stone.",
    {kind:"reversi",position:position(move.x,move.y)},()=>applyReversiMove(reversi,next));
  },60);
  return()=>clearTimeout(timer);
 },[reversi,kind,api,onEvent,speechPending]);
 const c4Status=!connect?(error?(english?"Board unavailable":"棋盤無法載入"):(english?"Setting up board…":"棋盤準備中…")):connect.winner
  ?connect.winner==="draw"?(english?"Draw!":"平手！"):connect.winner==="player"?(english?"You win!":"你贏了！"):(english?friendName+" wins!":friendName+" 贏了！")
  :connectDrop?(english?"Disc falling…":"棋子落下中…")
  :speechPending?(english?`Waiting for ${friendName} to finish speaking…`:`等 ${friendName} 說完再下棋…`)
  :connect?.turn==="player"?(english?"Your turn · red":"輪到你 · 紅色"):(english?friendName+"'s turn · yellow":"輪到 "+friendName+" · 黃色");
 const revStatus=!reversi?(error?(english?"Board unavailable":"棋盤無法載入"):(english?"Setting up board…":"棋盤準備中…")):reversi.winner
  ?reversi.winner==="draw"?(english?"Draw!":"平手！"):reversi.winner==="black"?(english?"You win!":"你贏了！"):(english?friendName+" wins!":friendName+" 贏了！")
  :speechPending?(english?`Waiting for ${friendName} to finish speaking…`:`等 ${friendName} 說完再下棋…`)
  :reversi?.turn==="black"?(english?"Your turn · black":"輪到你 · 黑棋"):(english?friendName+"'s turn · white":"輪到 "+friendName+" · 白棋");
 return <section className="crew-play-board-panel">
  {error?<p role="alert">{error}</p>:null}
  <div className="crew-play-board-bar"><strong role="status" aria-live="polite">{kind==="connect4"?c4Status:revStatus}</strong><div className="crew-play-board-actions">{speechPending?<button type="button" className="crew-play-skip-speech" onClick={skipSpeech}>{english?"Skip speech":"跳過語音"}</button>:null}<button type="button" onClick={restart}>{english?"New round":"重新開局"}</button></div></div>
  {kind==="connect4"&&connect?.moves===0?<p className="crew-play-first-move-hint">{english?"Tap any column to drop your first red disc. No setup needed.":"點一下任一欄就能放下第一顆紅棋，不需要先設定。"}</p>:null}
  {kind==="reversi"&&reversi?.moves===0?<p className="crew-play-first-move-hint">{english?"Tap a highlighted square to place your first black disc.":"點選棋盤上提示的合法位置，直接放下第一顆黑棋。"}</p>:null}
  {kind==="connect4"?<>
   <div className="crew-board-coordinate-frame crew-board-coordinate-frame--connect4">
    <div className="crew-board-column-labels" aria-hidden="true">{Array.from({length:7},(_,x)=><span key={x} className={connect?.lastMove!==null&&connect?.lastMove!==undefined&&connect.lastMove%7===x?"is-latest":""}>{x+1}</span>)}</div>
    <div className="crew-board-row-labels" aria-hidden="true">{Array.from({length:6},(_,y)=><span key={y} className={connect?.lastMove!==null&&connect?.lastMove!==undefined&&Math.floor(connect.lastMove/7)===y?"is-latest":""}>{y+1}</span>)}</div>
    <div className="crew-connect-board" role="group" aria-label={english?"Connect Four · columns 1 to 7, rows 1 to 6 from top to bottom":"四子棋 · 上方第 1 到 7 欄，左側第 1 到 6 列，由上往下"}>
     {Array.from({length:42},(_,index)=>{
      const x=index%7,y=Math.floor(index/7),color=connect?.cells[index],last=connect?.lastMove===index,win=connect?.winningLine.includes(index),dropping=connectDrop?.index===index;
      return <button type="button" key={index} className="crew-connect-slot" tabIndex={y===0?0:-1} onClick={()=>c4Play(x)} disabled={!connect||!c4Turn||connect.cells[x]!==null} aria-label={english?`Column ${x+1}, row ${y+1}. ${color||"empty"}`:`第 ${x+1} 欄、第 ${y+1} 列${color===null?"空格":color==="player"?"紅棋":"黃棋"}`}>
       <span key={dropping?`drop-${connectDrop.id}`:`disc-${index}`} className={`crew-connect-disc ${color||"empty"}${last&&!dropping?" last":""}${win?" win":""}${dropping?" is-dropping":""}`} style={dropping?{"--drop-distance":`-${(y+1)*114}%`,"--drop-duration":`${connectDrop.duration}ms`} as CSSProperties:undefined} onAnimationEnd={dropping?(event)=>{if(event.animationName==="crew-connect-disc-drop")finishConnectDrop(connectDrop.id)}:undefined}/>
      </button>;
     })}
    </div>
   </div>
   <small className="crew-play-hint">{english?"Columns 1–7 at the top; rows 1–6 on the left. The latest column and row are highlighted.":"上方 1～7 是欄位，左側 1～6 是列數；最新落子座標會亮起。"}</small>
  </>:null}
  {kind==="reversi"?<><div className="crew-reversi-score"><span>● {english?"You":"你"} {score?.black??2}</span><span>○ {friendName} {score?.white??2}</span></div>
   <div className="crew-board-coordinate-frame crew-board-coordinate-frame--reversi">
    <div className="crew-board-column-labels" aria-hidden="true">{Array.from({length:8},(_,x)=><span key={x} className={reversi?.lastMove!==null&&reversi?.lastMove!==undefined&&reversi.lastMove%8===x?"is-latest":""}><b>{String.fromCharCode(65+x)}</b><small>{x+1}</small></span>)}</div>
    <div className="crew-board-row-labels" aria-hidden="true">{Array.from({length:8},(_,y)=><span key={y} className={reversi?.lastMove!==null&&reversi?.lastMove!==undefined&&Math.floor(reversi.lastMove/8)===y?"is-latest":""}>{y+1}</span>)}</div>
    <div className="crew-reversi-board" role="grid" aria-label={english?"Reversi: columns A–H (1–8), rows 1–8":"黑白棋：上方 A～H 對應第 1～8 欄，左側第 1～8 列"}>
     {Array.from({length:64},(_,index)=>{
      const x=index%8,y=Math.floor(index/8),color=reversi?.cells[index],canPlay=reversi?.turn==="black"&&allowed.has(index)&&!reversi?.winner&&!speechPending&&!speechGateRef.current;
      const previous=flipAnimation?.previous[index];
      const last=reversi?.lastMove===index;
      return <button type="button" key={index} role="gridcell" className={`crew-reversi-cell${canPlay?" can-play":""}`} onClick={()=>revPlay(x,y)} disabled={!canPlay} aria-label={position(x,y)+" "+(color||"empty")}>
       {color?(previous?<span key={`flip-${index}-${flipAnimation?.id}`} className="crew-reversi-disc is-flipping" aria-hidden="true"><span className={`crew-reversi-disc-face previous ${previous}`}/><span className={`crew-reversi-disc-face next ${color}`}/></span>:<span className={`crew-reversi-disc ${color}${last?" last is-entering":""}`}/>):canPlay?<span className="crew-reversi-hint"/>:null}
      </button>;
     })}
    </div>
   </div>
   <small className="crew-play-hint">{english?"A–H identify columns (1–8), numbers 1–8 identify rows. C4 = column 3, row 4; dots mark legal moves.":"上方 A～H 對應第 1～8 欄，左側數字是列數（C4＝第 3 欄、第 4 列）；小圓點是合法落點。"}</small>
  </>:null}
  <small className="crew-play-hint">{english?"Rules and moves are calculated locally. Voice is optional. If it is enabled, your friend announces their move before the piece appears.":"棋步和勝負都在本機計算；開啟語音後，朋友會先說出下一步，說完才落子。"}</small>
 </section>;
}
