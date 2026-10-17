import {useEffect,useMemo,useState} from "react";
import {loadScript} from "../lib/runtime";

type GameKind="connect4"|"reversi";
type Props={kind:GameKind;english:boolean;friendName:string;onEvent:(message:string)=>void};
const position=(x:number,y:number)=>String.fromCharCode(65+x)+(y+1);
export function CrewBoardGames({kind,english,friendName,onEvent}:Props){
 const [connect,setConnect]=useState<CrewConnect4State|null>(null);
 const [reversi,setReversi]=useState<CrewReversiState|null>(null);
 const [error,setError]=useState("");
 const [round,setRound]=useState(0);
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
 const restart=()=>{setRound(value=>value+1);onEvent("[GAME RESET] We started a fresh round. Make a short friendly comment, then wait.")};
 const c4Turn=connect?.turn==="player"&&!connect?.winner;
 const c4Play=(column:number)=>{
  if(!connect||!api||!c4Turn)return;
  const next=api.connect4Drop(connect,column,"player");
  if(!next)return;
  setConnect(next);
  if(next.winner)onEvent("[CONNECT FOUR RESULT] The learner won. React briefly and warmly.");
 };
 useEffect(()=>{
  if(kind!=="connect4"||!connect||!api||connect.turn!=="computer"||connect.winner)return;
  const timer=setTimeout(()=>{
   const column=api.connect4AI(connect);
   if(column===null)return;
   const next=api.connect4Drop(connect,column,"computer");
   if(!next)return;
   setConnect(next);
   if(next.winner)onEvent("[CONNECT FOUR RESULT] "+(next.winner==="computer"?"You (the friend) won.":"The game ended in a draw.")+" React briefly in character.");
   else if(next.moves%6===0)onEvent("[CONNECT FOUR] You (the friend) just placed a yellow disc in column "+(column+1)+". The learner plays red. One short playful comment, no coaching or questions.");
  },520);
  return()=>clearTimeout(timer);
 },[connect,kind,api,onEvent]);
 const score=reversi&&api?api.reversiCount(reversi.cells):null;
 const legal=useMemo(()=>reversi&&api?api.reversiMoves(reversi,"black"):[],[reversi,api]);
 const allowed=new Set(legal.map(move=>move.y*8+move.x));
 const revPlay=(x:number,y:number)=>{
  if(!reversi||!api||reversi.turn!=="black"||reversi.winner)return;
  const next=api.reversiPlace(reversi,x,y,"black");
  if(!next)return;
  setReversi(next);
  if(next.winner)onEvent("[REVERSI RESULT] "+(next.winner==="draw"?"It is a draw.":next.winner==="black"?"The learner won.":"You won.")+" React briefly.");
 };
 useEffect(()=>{
  if(kind!=="reversi"||!reversi||!api||reversi.turn!=="white"||reversi.winner)return;
  const timer=setTimeout(()=>{
   const move=api.reversiAI(reversi);
   if(!move)return;
   const next=api.reversiPlace(reversi,move.x,move.y,"white");
   if(!next)return;
   setReversi(next);
   if(next.winner)onEvent("[REVERSI RESULT] "+(next.winner==="draw"?"It is a draw.":next.winner==="white"?"You won.":"The learner won.")+" React briefly.");
   else if(next.moves%6===0)onEvent("[REVERSI] You (the friend) placed white at "+position(move.x,move.y)+" and flipped "+move.flips.length+" discs. Say a quick natural reaction, then pause.");
  },560);
  return()=>clearTimeout(timer);
 },[reversi,kind,api,onEvent]);
 const c4Status=connect?.winner
  ?connect.winner==="draw"?(english?"Draw!":"平手！"):connect.winner==="player"?(english?"You win!":"你贏了！"):(english?friendName+" wins!":friendName+" 贏了！")
  :connect?.turn==="player"?(english?"Your turn · red":"輪到你 · 紅色"):(english?friendName+"'s turn · yellow":"輪到 "+friendName+" · 黃色");
 const revStatus=reversi?.winner
  ?reversi.winner==="draw"?(english?"Draw!":"平手！"):reversi.winner==="black"?(english?"You win!":"你贏了！"):(english?friendName+" wins!":friendName+" 贏了！")
  :reversi?.turn==="black"?(english?"Your turn · black":"輪到你 · 黑棋"):(english?friendName+"'s turn · white":"輪到 "+friendName+" · 白棋");
 return <section className="crew-play-board-panel">
  {error?<p role="alert">{error}</p>:null}
  <div className="crew-play-board-bar"><strong role="status" aria-live="polite">{kind==="connect4"?c4Status:revStatus}</strong><button type="button" onClick={restart}>{english?"New round":"重新開局"}</button></div>
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
     const x=index%8,y=Math.floor(index/8),color=reversi?.cells[index],canPlay=reversi?.turn==="black"&&allowed.has(index)&&!reversi?.winner;
     return <button type="button" key={index} role="gridcell" className={`crew-reversi-cell${canPlay?" can-play":""}`} onClick={()=>revPlay(x,y)} disabled={!canPlay} aria-label={position(x,y)+" "+(color||"empty")}>
      {color?<span className={`crew-reversi-disc ${color}${reversi?.lastMove===index?" last":""}`}/>:canPlay?<span className="crew-reversi-hint"/>:null}
     </button>;
    })}
   </div>
   <small className="crew-play-hint">{english?"Small dots mark legal moves; if no moves remain, the turn passes automatically.":"小圓點是合法落點；無棋可下時會自動跳過回合。"}</small>
  </>:null}
  <small className="crew-play-hint">{english?"Rules and moves are calculated locally. Voice commentary is optional.":"棋步和勝負都在本機計算，語音陪玩可自由開關。"}</small>
 </section>;
}
