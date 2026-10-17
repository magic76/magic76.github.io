import {useEffect,useMemo,useRef,useState} from "react";
import {loadScript} from "../lib/runtime";
import type {ExpectedBoardSpeech} from "./boardVoiceTurn";

type GameKind="connect4"|"reversi";
type Props={kind:GameKind;english:boolean;friendName:string;
 onEvent:(message:string)=>void;
 onBoardMove:(message:string,expected:ExpectedBoardSpeech)=>Promise<void>;
 onSkipSpeech:()=>void;
};
const position=(x:number,y:number)=>String.fromCharCode(65+x)+(y+1);
export function CrewBoardGames({kind,english,friendName,onEvent,onBoardMove,onSkipSpeech}:Props){
 const [connect,setConnect]=useState<CrewConnect4State|null>(null);
 const [reversi,setReversi]=useState<CrewReversiState|null>(null);
 const [error,setError]=useState("");
 const [round,setRound]=useState(0);
 const [speechPending,setSpeechPending]=useState(false);
 const speechGateRef=useRef(false);
 const roundEpochRef=useRef(0);
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
  loadScript("/games/crew-play-engine.js").then(()=>{
   if(!active)return;
   const api=window.CrewPlayEngine;
   if(!api)throw Error("Missing board rules");
   if(kind==="connect4")setConnect(api.connect4New());
   else setReversi(api.reversiNew());
  }).catch(()=>{if(active)setError(english?"Could not load the game engine.":"遊戲載入失敗，請重新整理頁面。")});
  return()=>{active=false};
 },[kind,english,round]);
 const api=window.CrewPlayEngine;
 const restart=()=>{
  roundEpochRef.current+=1;
  speechGateRef.current=false;
  setSpeechPending(false);
  onSkipSpeech();
  setRound(value=>value+1);
  onEvent("[GAME RESET] We started a fresh round. Make a short friendly comment, then wait.");
 };
 const c4Turn=connect?.turn==="player"&&!connect?.winner&&!speechPending&&!speechGateRef.current;
 const c4Play=(column:number)=>{
  if(!connect||!api||!c4Turn||speechGateRef.current)return;
  const next=api.connect4Drop(connect,column,"player");
  if(!next)return;
  setConnect(next);
  if(next.winner)onEvent("[CONNECT FOUR RESULT] The learner won. React briefly and warmly.");
 };
 useEffect(()=>{
  if(kind!=="connect4"||!connect||!api||connect.turn!=="computer"||connect.winner||speechPending||speechGateRef.current)return;
  const timer=setTimeout(()=>{
   const column=api.connect4AI(connect);
   if(column===null)return;
   const next=api.connect4Drop(connect,column,"computer");
   if(!next)return;
   const outcome=next.winner===null?"":next.winner==="computer"?"You will win.":next.winner==="draw"?"This will end in a draw.":"The learner will win.";
   narrateMove("[CONNECT FOUR BEFORE MOVE] The learner's disc is already on the board. Your NEXT yellow disc has been selected for column "+(column+1)+" but HAS NOT been placed yet. Say 'I'll play column "+(column+1)+"' in one short natural sentence. "+outcome+" Do not claim your disc is already placed. Do not answer older learner move intentions or ask a follow-up question. After your audio finishes, the board will place it.",
    {kind:"connect4",position:String(column+1)},()=>setConnect(next));
  },60);
  return()=>clearTimeout(timer);
 },[connect,kind,api,onEvent,speechPending]);
 const score=reversi&&api?api.reversiCount(reversi.cells):null;
 const legal=useMemo(()=>reversi&&api?api.reversiMoves(reversi,"black"):[],[reversi,api]);
 const allowed=new Set(legal.map(move=>move.y*8+move.x));
 const revPlay=(x:number,y:number)=>{
  if(!reversi||!api||reversi.turn!=="black"||reversi.winner||speechGateRef.current||speechPending)return;
  const next=api.reversiPlace(reversi,x,y,"black");
  if(!next)return;
  setReversi(next);
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
   narrateMove("[REVERSI BEFORE MOVE] The learner's black move is already on the board. Your NEXT white stone is selected for "+position(move.x,move.y)+" but HAS NOT been placed yet; "+move.flips.length+" discs will flip afterward. Say 'I'll play "+position(move.x,move.y)+"' in one short natural sentence. "+outcome+pass+" Do not claim you have already played. Do not revisit the learner's earlier intentions. After your audio ends, the board will place the white stone.",
    {kind:"reversi",position:position(move.x,move.y)},()=>setReversi(next));
  },60);
  return()=>clearTimeout(timer);
 },[reversi,kind,api,onEvent,speechPending]);
 const c4Status=connect?.winner
  ?connect.winner==="draw"?(english?"Draw!":"平手！"):connect.winner==="player"?(english?"You win!":"你贏了！"):(english?friendName+" wins!":friendName+" 贏了！")
  :speechPending?(english?`Waiting for ${friendName} to finish speaking…`:`等 ${friendName} 說完再下棋…`)
  :connect?.turn==="player"?(english?"Your turn · red":"輪到你 · 紅色"):(english?friendName+"'s turn · yellow":"輪到 "+friendName+" · 黃色");
 const revStatus=reversi?.winner
  ?reversi.winner==="draw"?(english?"Draw!":"平手！"):reversi.winner==="black"?(english?"You win!":"你贏了！"):(english?friendName+" wins!":friendName+" 贏了！")
  :speechPending?(english?`Waiting for ${friendName} to finish speaking…`:`等 ${friendName} 說完再下棋…`)
  :reversi?.turn==="black"?(english?"Your turn · black":"輪到你 · 黑棋"):(english?friendName+"'s turn · white":"輪到 "+friendName+" · 白棋");
 return <section className="crew-play-board-panel">
  {error?<p role="alert">{error}</p>:null}
  <div className="crew-play-board-bar"><strong role="status" aria-live="polite">{kind==="connect4"?c4Status:revStatus}</strong><div className="crew-play-board-actions">{speechPending?<button type="button" className="crew-play-skip-speech" onClick={skipSpeech}>{english?"Skip speech":"跳過語音"}</button>:null}<button type="button" onClick={restart}>{english?"New round":"重新開局"}</button></div></div>
  {kind==="connect4"?<div className="crew-connect-board" role="group" aria-label="Connect Four · 7 columns × 6 rows">
   {Array.from({length:42},(_,index)=>{
    const x=index%7,y=Math.floor(index/7),color=connect?.cells[index],last=connect?.lastMove===index,win=connect?.winningLine.includes(index);
    return <button type="button" key={index} className="crew-connect-slot" onClick={()=>c4Play(x)} disabled={!connect||!c4Turn||connect.cells[x]!==null} aria-label={english?`Column ${x+1}, row ${y+1}. ${color||"empty"}`:`第 ${x+1} 欄、第 ${y+1} 排${color===null?"空格":color==="player"?"紅棋":"黃棋"}`}>
     <span className={`crew-connect-disc ${color||"empty"}${last?" last":""}${win?" win":""}`}/>
    </button>;
   })}
  </div>:null}
  {kind==="reversi"?<><div className="crew-reversi-score"><span>● {english?"You":"你"} {score?.black??2}</span><span>○ {friendName} {score?.white??2}</span></div>
   <div className="crew-reversi-board" role="grid" aria-label="Reversi 8 by 8">
    {Array.from({length:64},(_,index)=>{
     const x=index%8,y=Math.floor(index/8),color=reversi?.cells[index],canPlay=reversi?.turn==="black"&&allowed.has(index)&&!reversi?.winner&&!speechPending&&!speechGateRef.current;
     return <button type="button" key={index} role="gridcell" className={`crew-reversi-cell${canPlay?" can-play":""}`} onClick={()=>revPlay(x,y)} disabled={!canPlay} aria-label={position(x,y)+" "+(color||"empty")}>
      {color?<span className={`crew-reversi-disc ${color}${reversi?.lastMove===index?" last":""}`}/>:canPlay?<span className="crew-reversi-hint"/>:null}
     </button>;
    })}
   </div>
   <small className="crew-play-hint">{english?"Small dots mark legal moves; if no moves remain, the turn passes automatically.":"小圓點是合法落點；無棋可下時會自動跳過回合。"}</small>
  </>:null}
  <small className="crew-play-hint">{english?"Rules and moves are calculated locally. Voice is optional. If it is enabled, your friend announces their move before the piece appears.":"棋步和勝負都在本機計算；開啟語音後，朋友會先說出下一步，說完才落子。"}</small>
 </section>;
}
