import {Arrow} from "../components/Arrow";
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
import {matchesBoardNarration} from "./boardVoiceTurn";
import {trackUsageEvent} from "../analytics/usage";
import {GamePanel} from "./GamePanel";
import {GameSpeechBubble} from "./GameSpeechBubble";
import {GameVoiceDock} from "./GameVoiceDock";
import {GameEndCard} from "./GameEndCard";
import {friendGameReaction} from "./friendGameReaction";
import "./games.css";

const SELECTED_FRIEND_KEY="crew_web_selected_friend_v1";
const initialFriend=()=>{
  const stored=typeof localStorage!=="undefined"?localStorage.getItem(SELECTED_FRIEND_KEY):null;
  return CREW_FRIENDS.some(friend=>friend.id===stored)?stored!:CREW_FRIENDS[0].id;
};
const coordinate=(point:{x:number;y:number})=>`${String.fromCharCode(65+point.x)}${point.y+1}`;

// Voice-driven turns must never hold a game forever if a Live response stalls.
const MAX_VOICE_TURN_MS=25000;
type WaitingAiMove={
  engine:GomokuEngine;
  move:{x:number;y:number};
  learnerMove:{x:number;y:number}|null;
  sent:boolean;
  completed:boolean;
  heardSpeaking:boolean;
  graceTimer:number|null;
  watchdog:number|null;
};

export function FriendGomokuPage(){
  useEffect(()=>{trackUsageEvent("game_open","gomoku")},[]);
  const {t,i18n}=useTranslation("home");
  const english=i18n.resolvedLanguage?.startsWith("en")||false;
  const language=useTeacherStore(state=>state.targetLanguage);
  const nativeLanguage=useTeacherStore(state=>state.nativeLanguage);
  const chatMode=useTeacherStore(state=>state.friendChatMode);
  const [friendId,setFriendId]=useState(initialFriend);
  const [gameStarted,setGameStarted]=useState(false);
  const [revision,setRevision]=useState(0);
  const [thinking,setThinking]=useState(false);
  const [waitingForVoice,setWaitingForVoice]=useState(false);
  const [loading,setLoading]=useState(false);
  const [engineError,setEngineError]=useState("");
  const [lastEvent,setLastEvent]=useState("");
  const engineRef=useRef<GomokuEngine|null>(null);
  const gameCompletedRef=useRef(false);
  const firstMoveRef=useRef(false);
  const autoStartRef=useRef(false);
  const aiBusyRef=useRef(false);
  const pendingCueRef=useRef<string|null>(null);
  const waitingAiRef=useRef<WaitingAiMove|null>(null);
  const finishAiRef=useRef<()=>void>(()=>{});
  const checkVoiceRef=useRef<()=>void>(()=>{});
  const friend=getCrewFriend(friendId);
  const languageDirective=useMemo(()=>friendLanguageReminder(language,nativeLanguage,chatMode),[language,nativeLanguage,chatMode]);
  const system=useMemo(()=>buildFriendSystem(friend,language,nativeLanguage,chatMode)+
    "\n[CASUAL GOMOKU GAME] You are playing Gomoku with the learner as their Crew Friend. The learner plays black and you play white. The game engine selects and applies every legal move; you speak as the friend and react to the shared game. Keep each game remark short, natural, and in your established language mode. Never teach, grade, explain rules unless asked, or claim a move that is not in the event you receive. The learner may announce a planned coordinate before clicking the board; that is an intention, NOT a confirmed move. Do not reply to move intentions or revisit them later. Wait for the authoritative [GOMOKU BEFORE MOVE] cue with the confirmed black move and your engine-selected white move. Respond to that cue once, then stop. For unrelated conversation, respond naturally. For [GOMOKU BEFORE MOVE] events, deliver exactly one short sentence, then stop speaking so the app can place your stone. Do not continue chatting unprompted after that sentence.",
    [friend,language,nativeLanguage,chatMode]);
  const live=useLiveSession({
    pageKey:"friend-game-"+friend.id,title:"五子棋 · "+friend.name,
    system,openingPrompt:languageDirective+"\n[GAME OPENING] Greet the learner briefly in your usual Crew Friend style and say you are here to play Gomoku together. The board may already be in progress when voice starts, so do not claim this is the first move or that a new round is starting. Then pause; no rules lesson."+
      (engineRef.current?.moveHistory.length?`\n[CURRENT BOARD] This round already has ${engineRef.current.moveHistory.length} moves. Most recent move: ${engineRef.current.lastMove?.color} at ${engineRef.current.lastMove?coordinate(engineRef.current.lastMove):"unknown"}.`:"\n[CURRENT BOARD] The board is empty."),
    voice:normalizeLiveVoice(friend.voice),language,nativeLanguage,languageDirective,
    // Game silence must not trigger the ordinary friend-conversation follow-up timer.
    persistHistory:false,sessionKind:"friend",
    // The runtime reports turn completion BEFORE playback drains. Release the move
    // only after the spoken audio has ended (or an explicit skip/timeout).
    onTurnComplete:(spokenTurn)=>{
      const waiting=waitingAiRef.current;
      if(!waiting||!waiting.sent||!matchesBoardNarration(spokenTurn.output,{kind:"gomoku",position:coordinate(waiting.move)}))return;
      waiting.completed=true;
      checkVoiceRef.current();
    }
  });
  const liveRef=useRef(live);liveRef.current=live;
  const notifyVoice=useCallback((cue:string)=>{
    const session=liveRef.current;
    // No backlog from silent, keyless games: the learner can start voice at any time.
    if(!["requesting-mic","connecting","listening","speaking"].includes(session.state))return;
    if(session.state==="listening"&&session.sendText(languageDirective+"\n"+cue))return;
    pendingCueRef.current=cue;
  },[languageDirective]);
  const clearWaitingAi=useCallback(()=>{
    const pending=waitingAiRef.current;
    if(pending?.graceTimer!==null&&pending?.graceTimer!==undefined)window.clearTimeout(pending.graceTimer);
    if(pending?.watchdog!==null&&pending?.watchdog!==undefined)window.clearTimeout(pending.watchdog);
    waitingAiRef.current=null;
    setWaitingForVoice(false);
  },[]);
  const commitAiMove=useCallback(()=>{
    const pending=waitingAiRef.current;
    if(!pending)return;
    clearWaitingAi();
    const active=engineRef.current;
    if(active!==pending.engine||active.turn!=="white"||active.winner){
      aiBusyRef.current=false;setThinking(false);return;
    }
    if(!active.makeMove(pending.move.x,pending.move.y)){
      aiBusyRef.current=false;setThinking(false);return;
    }
    const result=active.winner;
    const turnNumber=active.moveHistory.length;
    const move=coordinate(pending.move);
    const opponent=pending.learnerMove?coordinate(pending.learnerMove):"—";
    setLastEvent(result
      ?result==="draw"?(english?"Draw — board is full":"平手，棋盤已滿"):(english?`${friend.name} wins`:`${friend.name} 贏了`)
      :english?`${friend.name}: ${move} · You: ${opponent}`:`${friend.name}：${move} · 你：${opponent}`);
    aiBusyRef.current=false;setThinking(false);setRevision(value=>value+1);
    // No routine post-move chatter: one pre-move sentence per turn is enough.
    if(result)notifyVoice(`[GOMOKU RESULT] ${result==="draw"?"The board is full, a draw.":"You won the game."} The game ended after ${turnNumber} moves. Respond briefly, then pause.`);
  },[clearWaitingAi,english,friend.name,notifyVoice]);
  finishAiRef.current=commitAiMove;

  // A Live model turn can finish before the final audio sample is heard.
  // Its "listening" state after speaking means audio has actually drained.
  checkVoiceRef.current=()=>{
    const pending=waitingAiRef.current;
    if(!pending?.sent||!pending.completed||liveRef.current.state!=="listening")return;
    // A matching transcript is not evidence that its audio has started or
    // finished. Only release after onSpeaking(true) and the playback-drained
    // onSpeaking(false). The existing timeout/Skip speech cover silent stalls.
    if(pending.heardSpeaking)commitAiMove();
  };

  useEffect(()=>{
    const pending=waitingAiRef.current;
    if(!waitingForVoice||!pending)return;
    const state=live.state;
    if(["idle","ended","error","ending","reporting"].includes(state)){
      commitAiMove();
      return;
    }
    if(state==="speaking"){
      if(pending.sent)pending.heardSpeaking=true;
      if(pending.graceTimer!==null){window.clearTimeout(pending.graceTimer);pending.graceTimer=null;}
      // While the model is still answering an older learner intention, send
      // the authoritative move cue immediately instead of waiting for silence.
      if(pending.sent)return;
    }
    // The confirmed engine move supersedes an earlier speculative reply to
    // spoken coordinate intentions. Send the canonical cue even if speaking.
    if(state!=="listening"&&state!=="speaking")return;
    if(!pending.sent){
      pending.sent=true;
      const accepted=live.sendText(languageDirective+
        `\n[GOMOKU BEFORE MOVE] The learner just placed black at ${pending.learnerMove?coordinate(pending.learnerMove):"an unknown square"}. Your NEXT white stone is planned for ${coordinate(pending.move)} but is NOT on the board yet. In one brief, natural sentence, react and say where you will play (e.g. "I'll try H10"). Do not claim the white stone has been placed, explain rules, or ask follow-up questions. After you finish speaking, the interface will place the stone.`);
      if(!accepted)pending.sent=false;
      return;
    }
    checkVoiceRef.current();
  },[live.state,live.sendText,waitingForVoice,languageDirective,commitAiMove]);

  useEffect(()=>()=>{const pending=waitingAiRef.current;if(pending?.graceTimer!==null&&pending?.graceTimer!==undefined)window.clearTimeout(pending.graceTimer);if(pending?.watchdog!==null&&pending?.watchdog!==undefined)window.clearTimeout(pending.watchdog);waitingAiRef.current=null;},[]);

  const engine=engineRef.current;
  useEffect(()=>{
   if(engine?.winner&&!gameCompletedRef.current){
    gameCompletedRef.current=true;trackUsageEvent("game_completed","gomoku");
   }
  },[revision,engine?.winner]);
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
      clearWaitingAi();next.reset();engineRef.current=next;aiBusyRef.current=false;pendingCueRef.current=null;
      gameCompletedRef.current=false;firstMoveRef.current=false;
      setGameStarted(true);setThinking(false);setLastEvent("");setRevision(value=>value+1);
      localStorage.setItem(SELECTED_FRIEND_KEY,friend.id);
    }catch{
      setEngineError(english?"The Gomoku game could not load. Please refresh and try again.":"五子棋載入失敗，請重新整理後再試。");
    }finally{setLoading(false)}
  };
  // Prepare a playable board immediately; voice still remains optional.
  useEffect(()=>{if(autoStartRef.current)return;autoStartRef.current=true;void startGame()},[]);
  const playAt=(x:number,y:number)=>{
    const current=engineRef.current;
    if(!current||!gameStarted||thinking||current.turn!=="black"||!current.makeMove(x,y))return;
    if(!firstMoveRef.current){firstMoveRef.current=true;trackUsageEvent("game_started","gomoku")}
    pendingCueRef.current=null; // Retire cues from an earlier board state.
    if(current.winner){
      const cue="[GOMOKU RESULT] The learner just won the game. React naturally as their friend in one short sentence, then pause.";
      notifyVoice(cue);
    }
    setRevision(value=>value+1);
  };
  const newGame=()=>{
    const current=engineRef.current;
    if(!current)return;
    clearWaitingAi();
    if(liveRef.current.state==="speaking")live.interrupt();
    current.reset();gameCompletedRef.current=false;firstMoveRef.current=false;
    aiBusyRef.current=false;pendingCueRef.current=null;setThinking(false);setLastEvent("");setRevision(value=>value+1);
    const cue="[NEW GOMOKU GAME] Begin a new round. You play white and the learner plays black. React with one short friendly line, then wait for their first move.";
    notifyVoice(cue);
  };
  const changeFriend=async()=>{
    // A different friend must start with a new voice identity, not inherit the old session.
    clearWaitingAi();
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
      if(!active||active.turn!=="white"||active.winner){
        aiBusyRef.current=false;setThinking(false);return;
      }
      const learner=active.lastMove;
      const learnerMove=learner?{x:learner.x,y:learner.y}:null;
      const move=active.getAIMove("white");
      const pending:WaitingAiMove={engine:active,move,learnerMove,sent:false,completed:false,heardSpeaking:false,graceTimer:null,watchdog:null};
      waitingAiRef.current=pending;
      const state=liveRef.current.state;
      if(!["requesting-mic","connecting","listening","speaking"].includes(state)){
        // No Live session: preserve the fast offline game.
        finishAiRef.current();
        return;
      }
      pending.watchdog=window.setTimeout(()=>{
        if(waitingAiRef.current!==pending)return;
        // If a voice session hangs, stop its unfinished utterance before
        // placing the planned stone. Manual skip remains available too.
        if(liveRef.current.state==="speaking")liveRef.current.interrupt();
        finishAiRef.current();
      },MAX_VOICE_TURN_MS);
      setWaitingForVoice(true);
    },["listening","speaking"].includes(liveRef.current.state)?60:420);
    return()=>window.clearTimeout(timer);
  },[gameStarted,revision]);

  useEffect(()=>{
    const cue=pendingCueRef.current;
    if(live.state==="listening"&&cue&&live.sendText(languageDirective+"\n"+cue))pendingCueRef.current=null;
  },[live.state,live.sendText,languageDirective,revision]);

  useEffect(()=>{
    document.body.className="teacher-theme";
    return()=>{document.body.className=""};
  },[]);

  const lastCoordinate=engine?.lastMove?coordinate(engine.lastMove):null;
  const turnLabel=engine?.winner
    ?engine.winner==="draw"?(english?"Draw":"平手"):engine.winner==="black"?(english?"You win":"你贏了"): (english?friend.name+" wins":friend.name+" 贏了")
    :waitingForVoice?(english?`Waiting for ${friend.name} to finish speaking…`:`等 ${friend.name} 說完再下棋…`)
    :thinking?(english?friend.name+" is thinking…":friend.name+" 正在下棋…")
    :engine?.turn==="black"?(english?"Your turn":"輪到你下棋"):english?friend.name+"'s turn":`輪到 ${friend.name}`;

  return <div className="friend-gomoku-page">
    <header className={`friend-gomoku-heading${gameStarted?" is-playing":""}`}>
      <Link to="/games" className="friend-gomoku-back"><Arrow direction="left"/> <span>{t("playHub.allGames")}</span></Link>
      <span className="friend-gomoku-kicker">{t("playHub.gomoku.eyebrow")}</span>
      <h1>{gameStarted?(english?`Gomoku with ${friend.name}`:`和 ${friend.name} 下五子棋`):(english?"A game with a friend":"和朋友下一局")}</h1>
      {!gameStarted?<p>{loading?(english?"Preparing your board…":"正在準備棋盤…"):t("playHub.gomoku.intro")}</p>:null}
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
      <div className="friend-gomoku-status"><div role="status" aria-live="polite"><span className="friend-gomoku-live-dot" data-active={live.state==="listening"||live.state==="speaking"}/><strong>{turnLabel}</strong></div><div className="friend-gomoku-actions">{waitingForVoice?<button type="button" className="friend-gomoku-skip" onClick={()=>{if(liveRef.current.state==="speaking")live.interrupt();commitAiMove()}}>{english?"Skip speech":"跳過語音"}</button>:null}<button type="button" className="friend-gomoku-reset" onClick={()=>{if(window.confirm(english?"Start a new game? Current moves will be cleared.":"重新開始？本局棋步將清除。"))newGame()}}>{english?"New game":"重新開局"}</button><GamePanel title={english?"Game settings":"遊戲設定"} label={english?"Settings":"設定"}>
 <p>{english?"Changing your friend ends the current game and voice session. Opening settings does not disconnect voice.":"更換朋友會結束本局與語音連線；單純打開設定不會斷線。"}</p>
 <button type="button" className="friend-gomoku-reset" onClick={()=>void changeFriend()}>{english?"Change friend":"更換朋友"}</button>
 </GamePanel><GamePanel title={english?"How to play":"五子棋規則"} label={english?"Rules":"玩法"} variant="modal">
 <p>{english?"Place five black stones in a row horizontally, vertically, or diagonally to win. Your Crew friend plays white.":"你執黑棋、朋友執白棋，先連成橫向、縱向或斜向五顆棋子的一方獲勝。"}</p>
 </GamePanel></div></div>
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
      {engine.winner?<GameEndCard game="gomoku" result={engine.winner==="draw"?"draw":engine.winner==="black"?"win":"lose"} moves={engine.moveHistory.length} friendName={friend.name} onRematch={newGame}/>:null}
      <GameVoiceDock className="friend-gomoku-voice-dock">
      <div className="friend-gomoku-companion">
        <FriendAvatar friend={friend} className={`friend-gomoku-avatar ${live.state==="speaking"?"is-speaking":""}`}/>
        <div className="friend-gomoku-companion-copy"><strong>{friend.name}</strong><GameSpeechBubble english={english} text={live.output|| (live.state==="listening"?english?"Listening while you play":"邊玩邊聽你說":english?"Start voice to let your friend join":"開啟語音，讓朋友加入對局")}/></div>
      </div>
      {live.state==="idle"||live.state==="ended"?<button className="friend-gomoku-start-voice" type="button" onClick={()=>void live.start()}>{english?"Turn on voice chat (optional)":"開啟語音陪玩（選用）"}</button>:<LiveControls live={live} interruptLabel={english?"Your turn · interrupt":"換我說 · 打斷朋友"} prominentInterrupt compact english={english}/>}
      </GameVoiceDock>
      {lastEvent?<p className="friend-gomoku-last-event" aria-live="polite">{lastEvent}</p>:null}
       {engine.moveHistory.length>0&&!["requesting-mic","connecting","listening","speaking"].includes(live.state)?<p className="friend-gomoku-last-event" aria-live="polite"><strong>{friend.name}：</strong>{friendGameReaction(friend.id,engine.winner?(engine.winner==="black"?"win":engine.winner==="white"?"lose":"challenge"):"progress",english?"en":"zh",engine.moveHistory.length)}</p>:null}
    </section>:null}
    <p className="friend-gomoku-note">{english?"The conversation is used for this game session and is not added to your friend’s chat history or memories.":"這次陪玩對話只用於本局，不會寫入朋友的聊天紀錄或共同回憶。"}</p>
  </div>;
}
