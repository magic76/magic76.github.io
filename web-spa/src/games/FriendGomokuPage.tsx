import {useEffect,useMemo,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {CREW_FRIENDS,getCrewFriend} from "../friends/friendProfiles";
import {FriendAvatar} from "../friends/FriendAvatar";
import {buildFriendSystem} from "../friends/friendMemory";
import {friendLanguageReminder} from "../friends/friendLanguage";
import {normalizeLiveVoice} from "../live/voiceIdentity";
import {LiveControls} from "../live/LiveControls";
import {useLiveSession} from "../live/useLiveSession";
import {useTeacherStore} from "../store/teacherStore";
import {loadScript} from "../lib/runtime";
import "./games.css";

const SELECTED_FRIEND_KEY="crew_web_selected_friend_v1";
const initialFriend=()=>{
  const stored=typeof localStorage!=="undefined"?localStorage.getItem(SELECTED_FRIEND_KEY):null;
  return CREW_FRIENDS.some(friend=>friend.id===stored)?stored!:CREW_FRIENDS[0].id;
};
const coordinate=(point:{x:number;y:number})=>`${String.fromCharCode(65+point.x)}${point.y+1}`;

export function FriendGomokuPage(){
  const {i18n}=useTranslation();
  const english=i18n.resolvedLanguage?.startsWith("en")||false;
  const language=useTeacherStore(state=>state.targetLanguage);
  const nativeLanguage=useTeacherStore(state=>state.nativeLanguage);
  const chatMode=useTeacherStore(state=>state.friendChatMode);
  const [friendId,setFriendId]=useState(initialFriend);
  const [gameStarted,setGameStarted]=useState(false);
  const [revision,setRevision]=useState(0);
  const [thinking,setThinking]=useState(false);
  const [engineError,setEngineError]=useState("");
  const [lastEvent,setLastEvent]=useState("");
  const engineRef=useRef<GomokuEngine|null>(null);
  const aiBusyRef=useRef(false);
  const friend=getCrewFriend(friendId);
  const languageDirective=useMemo(()=>friendLanguageReminder(language,nativeLanguage,chatMode),[language,nativeLanguage,chatMode]);
  const system=useMemo(()=>buildFriendSystem(friend,language,nativeLanguage,chatMode)+
    "\n[CASUAL GOMOKU GAME] You are playing Gomoku with the learner as their Crew Friend. The learner plays black and you play white. The game engine selects and applies every legal move; you speak as the friend and react to the shared game. Keep each game remark short, natural, and in your established language mode. Never teach, grade, explain rules unless asked, or claim a move that is not in the event you receive. The learner can talk about anything while playing; respond as a friend and then let them continue.",
    [friend,language,nativeLanguage,chatMode]);
  const live=useLiveSession({
    pageKey:"friend-game-"+friend.id,title:"五子棋 · "+friend.name,
    system,openingPrompt:languageDirective+"\n[GAME OPENING] Greet the learner in your usual Crew Friend style, say you are ready for a relaxed game of Gomoku, then pause so they can make the first move. Do not explain rules or start a lesson.",
    voice:normalizeLiveVoice(friend.voice),language,nativeLanguage,languageDirective,
    persistHistory:false,sessionKind:"friend",conversationFlow:"friend"
  });
  const liveRef=useRef(live);liveRef.current=live;
  const engine=engineRef.current;
  const board=engine?.board;
  const winning=new Set((engine?.winningLine||[]).map(point=>point.y*15+point.x));

  const startGame=async()=>{
    setEngineError("");
    // Start Live from the user gesture before loading the lazy game engine so
    // the browser can present its microphone permission prompt reliably.
    if(live.state==="ended"||live.state==="error"||live.state==="idle")void live.start();
    try{
      await loadScript("/games/gomoku-engine.js");
      if(!window.GomokuEngine)throw new Error("engine unavailable");
      const next=new window.GomokuEngine(15);
      next.reset();engineRef.current=next;aiBusyRef.current=false;
      setGameStarted(true);setThinking(false);setLastEvent("");setRevision(value=>value+1);
      localStorage.setItem(SELECTED_FRIEND_KEY,friend.id);
      if(live.state==="listening")live.sendText(languageDirective+"\n[NEW GOMOKU GAME] Start a fresh, relaxed round with the learner. They play black and move first. Say one brief friendly line, then wait.");
    }catch{
      setEngineError(english?"The Gomoku game could not load. Please refresh and try again.":"五子棋載入失敗，請重新整理後再試。");
    }
  };
  const playAt=(x:number,y:number)=>{
    const current=engineRef.current;
    if(!current||!gameStarted||thinking||current.turn!=="black"||!current.makeMove(x,y))return;
    if(current.winner&&liveRef.current.state==="listening")liveRef.current.sendText(languageDirective+"\n[GOMOKU RESULT] The learner just won the game. React naturally as their friend in one short sentence, then pause.");
    setRevision(value=>value+1);
  };
  const newGame=()=>{
    const current=engineRef.current;
    if(!current)return;
    current.reset();aiBusyRef.current=false;setThinking(false);setLastEvent("");setRevision(value=>value+1);
    if(live.state==="listening")live.sendText(languageDirective+"\n[NEW GOMOKU GAME] Begin a new round. You play white and the learner plays black. Welcome them back briefly, then wait for their first move.");
  };

  useEffect(()=>{
    const current=engineRef.current;
    if(!gameStarted||!current||current.turn!=="white"||current.winner||aiBusyRef.current)return;
    aiBusyRef.current=true;setThinking(true);
    const timer=window.setTimeout(()=>{
      const active=engineRef.current;
      if(!active||active.turn!=="white"||active.winner){aiBusyRef.current=false;setThinking(false);return;}
      const learnerMove=active.lastMove;
      const move=active.getAIMove("white");
      active.makeMove(move.x,move.y);
      const turnNumber=active.moveHistory.length;
      const result=active.winner;
      const summary=result
        ? result==="draw"?"The board is full and the game is a draw.":result==="white"?"You won the game.":"The learner won the game."
        :`You just played ${coordinate(move)} after the learner played ${learnerMove?coordinate(learnerMove):"their move"}.`;
      setLastEvent(summary);setThinking(false);aiBusyRef.current=false;setRevision(value=>value+1);
      if(liveRef.current.state==="listening"){
        const cue=result
          ?`[GOMOKU RESULT] ${summary} The game ended after ${turnNumber} moves. React naturally in character with one short sentence, then pause. Do not explain strategy or ask several questions.`
          :`[GOMOKU MOVE] ${summary} Say one short, natural in-character reaction to the game moment, then pause for the learner. Avoid explaining strategy or making every turn a lesson. This is turn ${turnNumber}.`;
        liveRef.current.sendText(languageDirective+"\n"+cue);
      }
    },420);
    return()=>window.clearTimeout(timer);
  },[gameStarted,revision,languageDirective]);

  useEffect(()=>{
    document.body.className="teacher-theme";
    return()=>{document.body.className=""};
  },[]);

  const turnLabel=engine?.winner
    ?engine.winner==="draw"?(english?"Draw":"平手"):engine.winner==="black"?(english?"You win":"你贏了"): (english?friend.name+" wins":friend.name+" 贏了")
    :thinking?(english?friend.name+" is thinking…":friend.name+" 正在下棋…")
    :engine?.turn==="black"?(english?"Your turn":"輪到你下棋"):english?friend.name+"'s turn":`輪到 ${friend.name}`;

  return <div className="friend-gomoku-page">
    <header className="friend-gomoku-heading">
      <Link to="/teacher/roles?mode=friends" className="friend-gomoku-back">‹ <span>{english?"Crew Friends":"Crew 朋友"}</span></Link>
      <span className="friend-gomoku-kicker">CREW PLAY · GOMOKU</span>
      <h1>{english?"A game with a friend":"和朋友下一局"}</h1>
      <p>{english?"The same Gomoku AI plays. Your Crew Friend brings the voice and conversation.":"棋步沿用 Pocket Game 的五子棋 AI，Crew 朋友用自己的聲音陪你玩。"}</p>
    </header>

    <section className="friend-gomoku-setup">
      <div className="friend-gomoku-friend-row">
        <FriendAvatar friend={friend} className="friend-gomoku-avatar"/>
        <div><strong>{friend.name}</strong><small>{english?friend.titleEn:friend.titleZh}</small></div>
      </div>
      <label className="friend-gomoku-select-label" htmlFor="gomoku-friend">{english?"Choose a friend":"選一位朋友"}</label>
      <select id="gomoku-friend" className="field" value={friend.id} onChange={event=>setFriendId(event.target.value)} disabled={gameStarted}>
        {CREW_FRIENDS.map(person=><option key={person.id} value={person.id}>{person.name} · {english?person.titleEn:person.titleZh}</option>)}
      </select>
      {!gameStarted?<button className="btn" type="button" onClick={()=>void startGame()}>{english?"Start game and voice chat":"開始遊戲並開啟語音"}</button>:null}
      {engineError?<p role="alert" className="friend-gomoku-error">{engineError}</p>:null}
    </section>

    {gameStarted&&engine&&board?<section className="friend-gomoku-play" aria-label={english?"Gomoku game":"五子棋對局"}>
      <div className="friend-gomoku-status"><div><span className="friend-gomoku-live-dot" data-active={live.state==="listening"||live.state==="speaking"}/><strong>{turnLabel}</strong></div><button type="button" className="friend-gomoku-reset" onClick={newGame}>{english?"New game":"重新開局"}</button></div>
      <div className="friend-gomoku-board" role="grid" aria-label={english?"15 by 15 Gomoku board":"15 乘 15 五子棋棋盤"}>
        {board.flatMap((row,y)=>row.map((cell,x)=>{
          const index=y*15+x;const move=engine.lastMove?.x===x&&engine.lastMove?.y===y;
          return <button key={index} type="button" role="gridcell" className="friend-gomoku-cell" aria-label={`${String.fromCharCode(65+x)}${y+1}${cell?`, ${cell}`:""}`} disabled={Boolean(cell)||thinking||engine.turn!=="black"||Boolean(engine.winner)} onClick={()=>playAt(x,y)}>
            {cell?<span className={`friend-gomoku-stone ${cell}${move?" last":""}${winning.has(index)?" winning":""}`}/>:null}
          </button>;
        }))}
      </div>
      <div className="friend-gomoku-companion">
        <FriendAvatar friend={friend} className={`friend-gomoku-avatar ${live.state==="speaking"?"is-speaking":""}`}/>
        <div className="friend-gomoku-companion-copy"><strong>{friend.name}</strong><span>{live.output|| (live.state==="listening"?english?"Listening while you play":"邊玩邊聽你說":english?"Start voice to let your friend join":"開啟語音，讓朋友加入對局")}</span></div>
      </div>
      <LiveControls live={live} interruptLabel={english?"Your turn · interrupt":"換我說 · 打斷朋友"} prominentInterrupt/>
      {lastEvent?<p className="friend-gomoku-last-event" aria-live="polite">{lastEvent}</p>:null}
    </section>:null}
    <p className="friend-gomoku-note">{english?"The conversation is used for this game session and is not added to your friend’s chat history or memories.":"這次陪玩對話只用於本局，不會寫入朋友的聊天紀錄或共同回憶。"}</p>
  </div>;
}
