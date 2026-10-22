import {useEffect,useRef,useState,type ReactNode} from "react";
import {Link} from "react-router-dom";
import {CREW_FRIENDS,getCrewFriend} from "../friends/friendProfiles";
import {FriendAvatar} from "../friends/FriendAvatar";
import {buildFriendSystem} from "../friends/friendMemory";
import {normalizeLiveVoice} from "../live/voiceIdentity";
import {useLiveSession} from "../live/useLiveSession";
import {LiveControls} from "../live/LiveControls";
import {useTeacherStore} from "../store/teacherStore";
import {geminiKey} from "../lib/runtime";
import "./miniGames.css";

export type MiniKind="1a2b"|"taboo";
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
 useEffect(()=>{document.body.classList.add("teacher-theme");return()=>document.body.classList.remove("teacher-theme")},[]);
 return <main className="crew-play-page crew-mini-page">
  <header className="crew-play-game-header">
   <Link to="/games" className="crew-play-back">← 全部遊戲</Link>
   <span className="crew-play-eyebrow">CREW PLAY</span>
   <h1>{taboo?"Taboo 描述猜詞":"1A2B 猜數字"}</h1>
   <p>{taboo?"用英文描述，讓朋友直接猜；時間與難度都能調整。":"數字不重複，靠 A 與 B 的線索找出答案。"}</p>
  </header>
  <div className="crew-play-frame">
   <section className="crew-play-friend-bar">
    <div className="crew-play-friend-name"><FriendAvatar friend={friend}/><div><strong>{friend.name}</strong><small>你的 Crew 朋友</small></div></div>
    <label className="crew-play-friend-select">更換朋友
     <select value={friend.id} onChange={e=>onChange(e.target.value)}>{CREW_FRIENDS.map(f=><option value={f.id} key={f.id}>{f.name}</option>)}</select>
    </label>
   </section>
   {children}
  </div>
 </main>;
}

export type VoiceCue={id:number;text:string};
export function MiniGameVoice({kind,friend,onSpeech,onReply,cue,tabooMode}:{
 kind:MiniKind;friend:MiniFriend;onSpeech:(text:string,liveReply?:string)=>void;onReply?:(text:string)=>void;cue:VoiceCue;tabooMode?:"describe"|"guess";
}){
 const targetLanguage=useTeacherStore(s=>s.targetLanguage);
 const nativeLanguage=useTeacherStore(s=>s.nativeLanguage);
 const friendMode=useTeacherStore(s=>s.friendChatMode);
 const seenRef=useRef(new Set<string>());
 const directGuess=kind==="taboo"&&tabooMode==="describe";
 const system=buildFriendSystem(friend,targetLanguage,nativeLanguage,friendMode)+
  (directGuess
   ?"\n[CREW PLAY TABOO: DIRECT VOICE GUESSER] You are the guesser, not a conversational tutor. Listen to each English description and immediately make ONE English word guess. Your COMPLETE spoken reply must be exactly 'I guess WORD.' where WORD is your best single English word. Do not acknowledge, paraphrase, praise, explain, ask questions, add greetings, or speak a second sentence. Do not repeat an earlier incorrect guess. You cannot see the hidden answer and must never pretend a guess was verified. The game UI alone checks scores and forbidden words. A [VERIFIED GAME] event is a special result; speak its requested short reply only. Never persist memories."
   :"\n[CREW PLAY GAME: "+kind+"] This is a self-contained game, not a normal friend conversation. Respond as "+friend.name+" with short witty English remarks. No tutoring until the final feedback. Gameplay is fully decided by the offline UI engine. Never claim an answer is correct or wrong without a [VERIFIED GAME] event. A voice input can contain a sequence of single English digits or xAyB, or a short Taboo description. If numbers are unclear, ask the player to repeat slowly. React only to [VERIFIED GAME] updates for scoring and never reveal the secret. In Taboo guess mode, read the safe clue exactly without forbidden words. Never persist these conversations as friend memories.");
 const live=useLiveSession({
  pageKey:directGuess?"crew-play-mini-taboo-direct-"+friend.id:"crew-play-mini-"+kind+"-"+friend.id,
  title:(kind==="1a2b"?"1A2B":"Taboo")+" · "+friend.name,
  system,openingPrompt:directGuess?"Say only: Describe the secret word and I will guess.":"Say one short English welcome to the game. Do not invent a score or answer.",
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
   <div className="crew-mini-voice-copy"><strong>{friend.name} · {directGuess?"直接猜詞":"語音陪玩（選用）"}</strong>
    <small aria-live="polite">{active?live.state==="speaking"?"朋友正在說話":live.state==="listening"?(directGuess?"正在聽你描述":"正在聽英文"):"語音連接中":hasKey?"打字也能玩，不必開麥克風":"無 Key 也能完整打字玩"}</small>
   </div>
  </div>
  {live.output&&active?<p className="crew-mini-speech" role="status">{live.output}</p>:null}
  {active?<LiveControls live={live} prominentInterrupt interruptLabel="換我說 · 打斷朋友"/>:
   hasKey?<button className="crew-mini-primary" onClick={()=>{seenRef.current.clear();void live.start()}} type="button">開啟與 {friend.name} 的語音</button>:
   <Link className="crew-mini-key-link" to="/settings">要開啟 Live 語音？先到設定填入 Gemini Key（選用）</Link>}
  {live.state==="error"?<p className="crew-mini-error" role="alert">{live.status}，可改用文字繼續遊戲。</p>:null}
  <small>{directGuess?"描述一次，朋友直接猜一次；分數由遊戲判定。":"Live 只處理語音與角色回覆；分數由離線規則決定，不寫入朋友聊天紀錄。"}</small>
 </section>;
}
