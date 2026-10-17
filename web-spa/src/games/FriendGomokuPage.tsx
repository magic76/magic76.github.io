import {useCallback,useEffect,useMemo,useRef,useState} from "react";
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
  const [awaitingAIReply,setAwaitingAIReply]=useState(false);
  const [loading,setLoading]=useState(false);
  const [engineError,setEngineError]=useState("");
  const [lastEvent,setLastEvent]=useState("");
  const engineRef=useRef<GomokuEngine|null>(null);
  const aiBusyRef=useRef(false);
  const pendingCueRef=useRef<string|null>(null);
  const pendingAIMoveRef=useRef<{x:number;y:number;cue:string;sent:boolean;turnCompleted:boolean}|null>(null);
  const speechPlayingRef=useRef(false);
  const commitAIMoveRef=useRef<()=>void>(()=>{});
  const onSpeakingChange=useCallback((speaking:boolean)=>{
    speechPlayingRef.current=speaking;
    if(!speaking&&pendingAIMoveRef.current?.sent&&pendingAIMoveRef.current.turnCompleted)
      commitAIMoveRef.current();
  },[]);
  const onVoiceTurnComplete=useCallback((turn:{hasValidOutput?:boolean})=>{
    if(pendingAIMoveRef.current?.sent&&turn.hasValidOutput)
      pendingAIMoveRef.current.turnCompleted=true;
  },[]);
  const friend=getCrewFriend(friendId);
  const languageDirective=useMemo(()=>friendLanguageReminder(language,nativeLanguage,chatMode),[language,nativeLanguage,chatMode]);
  const system=useMemo(()=>buildFriendSystem(friend,language,nativeLanguage,chatMode)+
    "\n[CASUAL GOMOKU GAME] You are playing Gomoku with the learner as their Crew Friend. The learner plays black and you play white. The game engine selects and applies every legal move; you speak as the friend and react to the shared game. Keep each game remark short, natural, and in your established language mode. Never teach, grade, explain rules unless asked, or claim a move that is not in the event you receive. The learner can talk about anything while playing; respond as a friend and then let them continue.",
    [friend,language,nativeLanguage,chatMode]);
  const live=useLiveSession({
    pageKey:"friend-game-"+friend.id,title:"五子棋 · "+friend.name,
    system,openingPrompt:languageDirective+"\n[GAME OPENING] Greet the learner briefly in your usual Crew Friend style and say you are here to play Gomoku together. The board may already be in progress when voice starts, so do not claim this is the first move or that a new round is starting. Then pause; no rules lesson."+
      (engineRef.current?.moveHistory.length?`\n[CURRENT BOARD] This round already has ${engineRef.current.moveHistory.length} moves. Most recent move: ${engineRef.current.lastMove?.color} at ${engineRef.current.lastMove?coordinate(engineRef.current.lastMove):"unknown"}.`:"\n[CURRENT BOARD] The board is empty."),
    voice:normalizeLiveVoice(friend.voice),language,nativeLanguage,languageDirective,
    // Game silence must not trigger the ordinary friend-conversation follow-up timer.
    persistHistory:false,sessionKind:"friend",onSpeakingChange,onTurnComplete:onVoiceTurnComplete
  });
  const liveRef=useRef(live);liveRef.current=live;
  const notifyVoice=useCallback((cue:string)=>{
    const session=liveRef.current;
    // No backlog from silent, keyless games: the learner can start voice at any time.
    if(!["requesting-mic","connecting","listening","speaking"].includes(session.state))return;
    if(session.state==="listening"&&session.sendText(languageDirective+"\n"+cue))return;
    pendingCueRef.current=cue;
  },[languageDirective]);
  const deliverPlannedVoice=useCallback(()=>{
    const planned=pendingAIMoveRef.current,session=liveRef.current;
    if(!planned||planned.sent||session.state!=="listening")return;
    if(session.sendText(languageDirective+"\n"+planned.cue))planned.sent=true;
  },[languageDirective]);
  const finishAIMove=()=>{
    const planned=pendingAIMoveRef.current;
    if(!planned)return;
    pendingAIMoveRef.current=null;
    setAwaitingAIReply(false);
    const current=engineRef.current;
    if(!current||current.turn!=="white"||current.winner||!current.makeMove(planned.x,planned.y)){
      aiBusyRef.current=false;setThinking(false);return;
    }
    const learnerMove=current.moveHistory.at(-2);
    const result=current.winner;
    setLastEvent(result
      ?result==="draw"?(english?"Draw — board is full":"平手，棋盤已滿"):(english?`${friend.name} wins`:`${friend.name} 贏了`)
      :english?`${friend.name}: ${coordinate(planned)} · You: ${learnerMove?coordinate(learnerMove):"—"}`:`${friend.name}：${coordinate(planned)} · 你：${learnerMove?coordinate(learnerMove):"—"}`);
    setThinking(false);aiBusyRef.current=false;setRevision(value=>value+1);
    if(result)notifyVoice(`[GOMOKU RESULT] The game ended. ${result==="draw"?"It is a draw.":result==="white"?"You won.":"The learner won."} React briefly and then pause.`);
  };
  commitAIMoveRef.current=finishAIMove;
  const engine=engineRef.current;
  const board=engine?.board;
  const winning=new Set((engine?.winningLine||[]).map(point=>point.y*15+point.x));

  const startGame=async()=>{
    if(loading)return;
    setLoading(true);setEngineError("");
    // Start the offline board independently of the optional microphone session.
    try{
      await loadScript("/games/gomoku-engine.js");
      if(!window.GomokuEngine)throw new Error("engine unavailable");
      const next=new window.GomokuEngine(15);
      next.reset();engineRef.current=next;aiBusyRef.current=false;pendingCueRef.current=null;pendingAIMoveRef.current=null;speechPlayingRef.current=false;setAwaitingAIReply(false);
      setGameStarted(true);setThinking(false);setLastEvent("");setRevision(value=>value+1);
      localStorage.setItem(SELECTED_FRIEND_KEY,friend.id);
    }catch{
      setEngineError(english?"The Gomoku game could not load. Please refresh and try again.":"五子棋載入失敗，請重新整理後再試。");
    }finally{setLoading(false)}
  };
  const playAt=(x:number,y:number)=>{
    const current=engineRef.current;
    if(!current||!gameStarted||thinking||current.turn!=="black"||!current.makeMove(x,y))return;
    if(current.winner){
      const cue="[GOMOKU RESULT] The learner just won the game. React naturally as their friend in one short sentence, then pause.";
      notifyVoice(cue);
    }
    setRevision(value=>value+1);
  };
  const newGame=()=>{
    const current=engineRef.current;
    if(!current)return;
    const interrupted=Boolean(pendingAIMoveRef.current);
    pendingAIMoveRef.current=null;setAwaitingAIReply(false);
    if(interrupted)live.interrupt();
    current.reset();aiBusyRef.current=false;pendingCueRef.current=null;setThinking(false);setLastEvent("");setRevision(value=>value+1);
    const cue="[NEW GOMOKU GAME] Begin a new round. You play white and the learner plays black. React with one short friendly line, then wait for their first move.";
    notifyVoice(cue);
  };
  const changeFriend=async()=>{
    // A different friend must start with a new voice identity, not inherit the old session.
    pendingAIMoveRef.current=null;setAwaitingAIReply(false);
    await live.stop();
    pendingCueRef.current=null;engineRef.current=null;aiBusyRef.current=false;
    setGameStarted(false);setThinking(false);setLastEvent("");setRevision(value=>value+1);
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
      const voiceState=liveRef.current.state;
      if(!["requesting-mic","connecting","listening","speaking"].includes(voiceState)){
        pendingAIMoveRef.current={...move,cue:"",sent:false,turnCompleted:false};
        commitAIMoveRef.current();
        return;
      }
      // Announce the next move first. Commit it only after the Live audio playback has drained.
      const cue=`[GOMOKU PLANNED MOVE] The learner placed ${learnerMove?coordinate(learnerMove):"their piece"}. Your next move WILL be ${coordinate(move)} (white), but the piece HAS NOT been placed yet. Say ONE short, playful sentence naturally in your Crew Friend voice, mentioning your planned coordinate. Do not claim the piece is already on the board, ask unrelated questions, or give a lesson. After your voice playback fully finishes, the board will place this move automatically.`;
      pendingCueRef.current=null;
      const planned={...move,cue,sent:false,turnCompleted:false};
      pendingAIMoveRef.current=planned;
      setAwaitingAIReply(true);
      deliverPlannedVoice();
      // Recover from missing/failed responses, but never cut off audio that is still playing.
      window.setTimeout(()=>{
        if(pendingAIMoveRef.current===planned&&!speechPlayingRef.current)
          commitAIMoveRef.current();
      },15000);
    },420);
    return()=>window.clearTimeout(timer);
  },[gameStarted,revision,deliverPlannedVoice]);

  useEffect(()=>{
    if(awaitingAIReply)deliverPlannedVoice();
  },[awaitingAIReply,live.state,deliverPlannedVoice]);

  useEffect(()=>{
    if(pendingAIMoveRef.current&&["idle","ending","ended","error","reporting"].includes(live.state))
      commitAIMoveRef.current();
  },[live.state]);

  useEffect(()=>{
    if(awaitingAIReply)return;
    const cue=pendingCueRef.current;
    if(live.state==="listening"&&cue&&live.sendText(languageDirective+"\n"+cue))pendingCueRef.current=null;
  },[live.state,live.sendText,languageDirective,revision,awaitingAIReply]);

  useEffect(()=>{
    document.body.className="teacher-theme";
    return()=>{document.body.className=""};
  },[]);

  const lastCoordinate=engine?.lastMove?coordinate(engine.lastMove):null;
  const turnLabel=engine?.winner
    ?engine.winner==="draw"?(english?"Draw":"平手"):engine.winner==="black"?(english?"You win":"你贏了"): (english?friend.name+" wins":friend.name+" 贏了")
    :awaitingAIReply?(english?`${friend.name} is speaking, then playing ${pendingAIMoveRef.current?coordinate(pendingAIMoveRef.current):""}…`:`${friend.name} 說完話後下 ${pendingAIMoveRef.current?coordinate(pendingAIMoveRef.current):""}…`)
    :thinking?(english?friend.name+" is thinking…":friend.name+" 正在下棋…")
    :engine?.turn==="black"?(english?"Your turn":"輪到你下棋"):english?friend.name+"'s turn":`輪到 ${friend.name}`;

  return <div className="friend-gomoku-page">
    <header className={`friend-gomoku-heading${gameStarted?" is-playing":""}`}>
      <Link to="/teacher/roles?mode=friends" className="friend-gomoku-back">‹ <span>{english?"Crew Friends":"Crew 朋友"}</span></Link>
      <span className="friend-gomoku-kicker">CREW PLAY · GOMOKU</span>
      <h1>{gameStarted?(english?`Gomoku with ${friend.name}`:`和 ${friend.name} 下五子棋`):(english?"A game with a friend":"和朋友下一局")}</h1>
      {!gameStarted?<p>{english?"Play against the familiar Gomoku AI. Add your Crew Friend’s voice whenever you like.":"棋步沿用 Pocket Game 的五子棋 AI，隨時可以開啟 Crew 朋友語音陪玩。"}</p>:null}
    </header>

    {!gameStarted?<section className="friend-gomoku-setup">
      <div className="friend-gomoku-friend-row">
        <FriendAvatar friend={friend} className="friend-gomoku-avatar"/>
        <div><strong>{friend.name}</strong><small>{english?friend.titleEn:friend.titleZh}</small></div>
      </div>
      <label className="friend-gomoku-select-label" htmlFor="gomoku-friend">{english?"Choose a friend":"選一位朋友"}</label>
      <select id="gomoku-friend" className="field" value={friend.id} onChange={event=>setFriendId(event.target.value)} disabled={gameStarted||loading}>
        {CREW_FRIENDS.map(person=><option key={person.id} value={person.id}>{person.name} · {english?person.titleEn:person.titleZh}</option>)}
      </select>
      {!gameStarted?<button className="btn" type="button" disabled={loading} onClick={()=>void startGame()}>{loading?(english?"Loading board…":"正在載入棋盤…"):english?"Start game":"開始下棋"}</button>:null}
      {engineError?<p role="alert" className="friend-gomoku-error">{engineError}</p>:null}
    </section>:null}

    {gameStarted&&engine&&board?<section className="friend-gomoku-play" aria-label={english?"Gomoku game":"五子棋對局"}>
      <div className="friend-gomoku-status"><div role="status" aria-live="polite"><span className="friend-gomoku-live-dot" data-active={live.state==="listening"||live.state==="speaking"}/><strong>{turnLabel}</strong></div><div className="friend-gomoku-actions">{awaitingAIReply?<button type="button" className="friend-gomoku-skip-voice" onClick={()=>{pendingAIMoveRef.current&&live.interrupt();commitAIMoveRef.current()}}>{english?"Skip voice":"略過語音"}</button>:null}<button type="button" className="friend-gomoku-reset" onClick={newGame}>{english?"New game":"重新開局"}</button><button type="button" className="friend-gomoku-reset" onClick={()=>void changeFriend()}>{english?"Change friend":"更換朋友"}</button></div></div>
      <div className="friend-gomoku-coordinate-shell" role="group" aria-label={english?"Gomoku board with coordinates":"附有座標標示的五子棋棋盤"}>
        <div className="friend-gomoku-axis-top" aria-hidden="true">
          {Array.from({length:15},(_,x)=><span key={x} className={`friend-gomoku-axis-label${engine.lastMove?.x===x?" is-last":""}`}>{String.fromCharCode(65+x)}</span>)}
        </div>
        <div className="friend-gomoku-axis-left" aria-hidden="true">
          {Array.from({length:15},(_,y)=><span key={y} className={`friend-gomoku-axis-label${engine.lastMove?.y===y?" is-last":""}`}>{y+1}</span>)}
        </div>
        <div className="friend-gomoku-board" role="grid" aria-label={english?"15 by 15 Gomoku board. Columns A through O from left to right; rows 1 through 15 from top to bottom.":"15 乘 15 五子棋棋盤，橫向 A 到 O，縱向由上至下 1 到 15。"}>
        <svg className="friend-gomoku-grid-lines" viewBox="0 0 15 15" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          {Array.from({length:15},(_,index)=><g key={index}><line x1="0.5" x2="14.5" y1={index+0.5} y2={index+0.5}/><line y1="0.5" y2="14.5" x1={index+0.5} x2={index+0.5}/></g>)}
          {[3,7,11].flatMap(y=>[3,7,11].map(x=><circle key={`${x}-${y}`} cx={x+0.5} cy={y+0.5} r="0.1"/>))}
        </svg>
        {board.flatMap((row,y)=>row.map((cell,x)=>{
          const index=y*15+x;const move=engine.lastMove?.x===x&&engine.lastMove?.y===y;
          return <button key={index} type="button" role="gridcell" className="friend-gomoku-cell" data-coordinate={coordinate({x,y})} aria-label={`${String.fromCharCode(65+x)}${y+1}${cell?`, ${cell}`:""}`} disabled={Boolean(cell)||thinking||engine.turn!=="black"||Boolean(engine.winner)} onClick={()=>playAt(x,y)}>
            {cell?<span className={`friend-gomoku-stone ${cell}${move?" last":""}${winning.has(index)?" winning":""}`}/>:null}
          </button>;
        }))}
        </div>
      </div>
      <p className="friend-gomoku-coordinate-hint">
        <span>{english?"Letters A–O → columns · Numbers 1–15 ↓ rows":"字母 A–O → 欄位 · 數字 1–15 ↓ 列數"}</span>
        {lastCoordinate?<strong>{english?"Last move":"上一手"}：{lastCoordinate}</strong>:null}
      </p>
      <div className="friend-gomoku-companion">
        <FriendAvatar friend={friend} className={`friend-gomoku-avatar ${live.state==="speaking"?"is-speaking":""}`}/>
        <div className="friend-gomoku-companion-copy"><strong>{friend.name}</strong><span>{live.output|| (live.state==="listening"?english?"Listening while you play":"邊玩邊聽你說":english?"Start voice to let your friend join":"開啟語音，讓朋友加入對局")}</span></div>
      </div>
      {live.state==="idle"||live.state==="ended"?<button className="friend-gomoku-start-voice" type="button" onClick={()=>void live.start()}>{english?"Turn on voice chat (optional)":"開啟語音陪玩（選用）"}</button>:<LiveControls live={live} interruptLabel={english?"Your turn · interrupt":"換我說 · 打斷朋友"} prominentInterrupt/>}
      {lastEvent?<p className="friend-gomoku-last-event" aria-live="polite">{lastEvent}</p>:null}
    </section>:null}
    <p className="friend-gomoku-note">{english?"The conversation is used for this game session and is not added to your friend’s chat history or memories.":"這次陪玩對話只用於本局，不會寫入朋友的聊天紀錄或共同回憶。"}</p>
  </div>;
}
