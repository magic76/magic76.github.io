import {useEffect,useRef,useState,type ReactNode} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {CREW_FRIENDS,getCrewFriend} from "../friends/friendProfiles";
import {FriendAvatar} from "../friends/FriendAvatar";
import {buildFriendSystem} from "../friends/friendMemory";
import {normalizeLiveVoice} from "../live/voiceIdentity";
import {useLiveSession} from "../live/useLiveSession";
import {LiveControls} from "../live/LiveControls";
import {useTeacherStore} from "../store/teacherStore";
import {geminiKey} from "../lib/runtime";
import {GamePanel} from "./GamePanel";
import {GameSpeechBubble} from "./GameSpeechBubble";
import "./miniGames.css";

export type MiniKind="1a2b"|"taboo"|"court";
export type MiniFriend=ReturnType<typeof getCrewFriend>;
const FRIEND_KEY="crew_web_selected_friend_v1";
function initialFriend(){
 if(typeof window==="undefined")return CREW_FRIENDS[0].id;
 const saved=localStorage.getItem(FRIEND_KEY);
 return CREW_FRIENDS.some(friend=>friend.id===saved)?saved!:CREW_FRIENDS[0].id;
}
export function useMiniFriend(){
 const [id,setId]=useState(initialFriend);
 const friend=getCrewFriend(id);
 const choose=(next:string)=>{setId(next);if(typeof window!=="undefined")localStorage.setItem(FRIEND_KEY,next)};
 return {friend,choose};
}
export function MiniShell({kind,friend,onChange,children}:{kind:MiniKind;friend:MiniFriend;onChange:(id:string)=>void;children:ReactNode}){
 const taboo=kind==="taboo";
 const targetLanguage=useTeacherStore(s=>s.targetLanguage);
 const chinese=/(中文|華語|國語|chinese|mandarin|^zh)/i.test(targetLanguage);
 useEffect(()=>{document.body.classList.add("teacher-theme");return()=>document.body.classList.remove("teacher-theme")},[]);
 return <main className="crew-play-page crew-mini-page">
  <header className="crew-play-game-header crew-play-game-header--compact">
   <Link to="/games" className="crew-play-back">← 全部遊戲</Link>
   <span className="crew-play-eyebrow">CREW PLAY</span>
   <h1>{taboo?"Taboo 描述猜詞":"1A2B 猜數字"}</h1>
   <p>{taboo?(chinese?"用中文描述，讓朋友直接猜；時間與難度都能調整。":"用英文描述，讓朋友直接猜；時間與難度都能調整。"):"數字不重複，靠 A 與 B 的線索找出答案。"}</p>
  </header>
  <div className="crew-play-frame">
   <section className="crew-play-friend-bar crew-mini-friend-bar">
    <div className="crew-play-friend-name"><FriendAvatar friend={friend}/><div><strong>{friend.name}</strong><small>你的 Crew 朋友</small></div></div>
    <GamePanel title="選擇 Crew 朋友" label="更換朋友">
     <label className="crew-play-friend-select">對話角色
      <select value={friend.id} onChange={e=>onChange(e.target.value)}>{CREW_FRIENDS.map(f=><option value={f.id} key={f.id}>{f.name}</option>)}</select>
     </label>
     <p>切換朋友將重新開始這局遊戲；開啟設定本身不影響語音連線。</p>
    </GamePanel>
   </section>
   {children}
  </div>
 </main>;
}

export type VoiceCue={id:number;text:string};
export function MiniGameVoice({kind,friend,onSpeech,onReply,cue,tabooMode,courtRole}:{
 kind:MiniKind;friend:MiniFriend;onSpeech:(text:string,liveReply?:string)=>void;onReply?:(text:string)=>void;cue:VoiceCue;tabooMode?:"describe"|"guess";courtRole?:"defense"|"prosecution";
}){
 const targetLanguage=useTeacherStore(s=>s.targetLanguage);
 const {i18n}=useTranslation("home");
 const english=Boolean(i18n.resolvedLanguage?.startsWith("en"));
 const nativeLanguage=useTeacherStore(s=>s.nativeLanguage);
 const friendMode=useTeacherStore(s=>s.friendChatMode);
 const seenRef=useRef(new Set<string>());
 const directGuess=kind==="taboo"&&tabooMode==="describe";
 const chinese=/(中文|華語|國語|chinese|mandarin|^zh)/i.test(targetLanguage);
 const gameTongue=chinese?"Traditional Chinese":"English";
 const court=kind==="court";
 const counsel=courtRole==="prosecution"?"defense attorney":"prosecutor";
 const system=buildFriendSystem(friend,targetLanguage,nativeLanguage,friendMode)+
  (directGuess
    ?"\n[CREW PLAY TABOO: DIRECT VOICE GUESSER] You are a quick, expressive friend playing Taboo, not a conversational tutor. After each description, immediately reply with ONE short, natural sentence in "+gameTongue+" containing exactly ONE concrete single-word guess. Keep your personality and vary the wording and intonation naturally. Examples (not a script): "+(chinese?"「會不會是雨傘？」、「我猜是貓咪！」、「可能是披薩？」":"Could it be a banana? Sounds like a banana! Maybe an apple?")+" Do NOT use the same opening every turn or always say 'I guess'. No acknowledgement before the guess, no paraphrase, explanation, praise, extra question, second candidate or second sentence. Do not repeat an earlier incorrect guess. You cannot see the hidden answer and must never claim verification or announce scoring. The game UI alone checks correctness and forbidden words. For a [VERIFIED GAME] cue, follow that result with a single brief natural reply. Never persist memories."
   :court?"\n[CREW PLAY CRAZY COURT] You are "+friend.name+", acting as the player\'s opposing "+counsel+" in a fictional comedy trial. Keep your personality and selected spoken language. The game UI owns evidence, legal rulings, objections, score and verdict. NEVER invent a new fact or evidence or claim to alter the outcome. When the user speaks, listen but do not offer a ruling; wait until a [VERIFIED GAME] cue. On a verified cue, deliver one short playful lawyer response, then listen. Be respectful and do not treat this as real legal advice. Do not persist conversation memory."
   :"\n[CREW PLAY GAME: "+kind+"] This is a self-contained game, not a normal friend conversation. Respond as "+friend.name+" with short witty remarks in "+gameTongue+". No tutoring until the final feedback. Gameplay is fully decided by the offline UI engine. Never claim an answer is correct or wrong without a [VERIFIED GAME] event. A voice input can contain digits or xAyB, or a short description in the selected learning language. If numbers are unclear, ask the player to repeat slowly in "+gameTongue+". React only to [VERIFIED GAME] updates for scoring and never reveal the secret. In Taboo guess mode, read the safe clue exactly without forbidden words. Never persist these conversations as friend memories.");
 const live=useLiveSession({
  pageKey:directGuess?"crew-play-mini-taboo-direct-"+friend.id:"crew-play-mini-"+kind+"-"+friend.id,
  title:(kind==="1a2b"?"1A2B":court?"Crazy Court":"Taboo")+" · "+friend.name,
  system,openingPrompt:directGuess?"Invite the player briefly to describe something in "+gameTongue+". Use your own friendly wording once, then listen.":court?"As opposing counsel, give a short, friendly in-character courtroom greeting. Do not claim any verdict or change the rules.":"Say one short welcome in "+gameTongue+" to the game. Do not invent a score or answer.",
  voice:normalizeLiveVoice(friend.voice),language:targetLanguage,nativeLanguage,
  sessionKind:"friend",persistHistory:false,teacherReport:false,
  onTurnComplete:(turn,completed)=>{
   let lastIndex=-1;
   for(let i=completed.length-1;i>=0;i--){if(completed[i].input?.trim()){lastIndex=i;break;}}
   if(lastIndex>=0){
    const input=completed[lastIndex].input!.trim();
    const id=lastIndex+":"+input;
    if(!seenRef.current.has(id)){
     seenRef.current.add(id);
     onSpeech(input,turn.output?.trim()||"");
    }
   }
   if(turn.output?.trim())onReply?.(turn.output.trim());
  }
 });
 const active=["requesting-mic","connecting","listening","speaking","ending","reporting"].includes(live.state);
 const deliveredRef=useRef(0);
 // A cue may be created during playback. Send only after the transport listens again.
 useEffect(()=>{
  if(!cue.id||cue.id===deliveredRef.current||live.state!=="listening")return;
  if(live.sendText("[VERIFIED GAME] "+cue.text))deliveredRef.current=cue.id;
 },[cue,live.state,live.sendText]);
 const hasKey=typeof window!=="undefined"&&Boolean(geminiKey());
 return <section className="crew-mini-voice" aria-label="朋友語音">
  <div className="crew-mini-voice-header">
   <FriendAvatar friend={friend} className={live.state==="speaking"?"is-speaking":""}/>
   <div className="crew-mini-voice-copy"><strong>{friend.name} · {directGuess?"直接猜詞":court?"法庭語音（選用）":"語音陪玩（選用）"}</strong>
    <small aria-live="polite">{active?live.state==="speaking"?"朋友正在說話":live.state==="listening"?(directGuess?"正在聽你描述":chinese?"正在聽中文":"正在聽"+targetLanguage):"語音連接中":hasKey?"打字也能玩，不必開麥克風":"無 Key 也能完整打字玩"}</small>
   </div>
  </div>
  {live.output&&active?<GameSpeechBubble text={live.output} english={english}/>:null}
  {active?<LiveControls live={live} prominentInterrupt interruptLabel="換我說 · 打斷朋友" compact/>:
   hasKey?<button className="crew-mini-primary" onClick={()=>{seenRef.current.clear();void live.start()}} type="button">開啟與 {friend.name} 的語音</button>:
   <Link className="crew-mini-key-link" to="/settings">要開啟 Live 語音？先到設定填入 Gemini Key（選用）</Link>}
  {live.state==="error"?<p className="crew-mini-error" role="alert">{live.status}，可改用文字繼續遊戲。</p>:null}
  <small>{directGuess?"描述一次，朋友直接猜一次；分數由遊戲判定。":"Live 只處理語音與角色回覆；分數由離線規則決定，不寫入朋友聊天紀錄。"}</small>
 </section>;
}
