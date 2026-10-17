import {buildAccentPrompt} from "../teacher/teacherAccent";
import {trackUsageEvent,sessionDurationDetail} from "../analytics/usage";
import {normalizeLiveVoice} from "../live/voiceIdentity";
import {useEffect,useMemo,useRef,useState} from "react";
import {DesktopLivePanel} from "../components/DesktopLivePanel";
import {Link,useNavigate,useSearchParams} from "react-router-dom";
import {useTeacherStore} from "../store/teacherStore";
import {useLiveSession} from "../live/useLiveSession";
import {LiveControls} from "../live/LiveControls";
import{useTranslation}from"react-i18next";
import {FriendAvatar} from "./FriendAvatar";
import {getCrewFriend} from "./friendProfiles";
import {nextFriendLifeOpening} from "../characters/lifeBook";
import {friendLanguageReminder,friendLanguageTransition,type FriendChatLanguageMode} from "./friendLanguage";
import {buildFriendSystem,recordFriendChat,rememberFriendConversation} from "./friendMemory";
import {hasMeaningfulLearnerSpeech} from "../teacher/studentMemory";
import {conversationIntent,conversationOpening} from "../teacher/conversationIntent";
import {fetchShortsFeed,buildShortsFriendContext,type ShortPost} from "../teacher/shortsFeed";
import "./friends.css";

/**
 * Resolve a Shorts ID against the published feed before opening Live. The URL
 * cannot inject a caption, persona, or system prompt, and regular chat remains instant.
 */
export function FriendLivePage(){
 const [params]=useSearchParams();
 const postId=params.get("post");
 const friendId=params.get("id");
 const lookupKey=String(friendId||"")+"::"+String(postId||"");
 const [lookup,setLookup]=useState<{key:string;post:ShortPost|null}|null>(null);
 useEffect(()=>{
  if(!postId)return;
  const abort=new AbortController();
  fetchShortsFeed(abort.signal).then(feed=>{
   if(!abort.signal.aborted){
    const found=feed.posts.find(post=>post.id===postId&&post.friendId===friendId)||null;
    setLookup({key:lookupKey,post:found});
   }
  }).catch(()=>{if(!abort.signal.aborted)setLookup({key:lookupKey,post:null})});
  return()=>abort.abort();
 },[postId,friendId,lookupKey]);
 if(postId&&(!lookup||lookup.key!==lookupKey))
  return <main className="session-shell"><p className="spa-loading" role="status">正在準備朋友的照片話題…</p></main>;
 return <FriendLiveConversation shortsPost={postId?lookup?.post||null:null}
  postUnavailable={Boolean(postId&&!lookup?.post)}/>;
}
function FriendLiveConversation({shortsPost,postUnavailable}:{shortsPost:ShortPost|null;postUnavailable:boolean}){
 const {t,i18n:locale}=useTranslation("friends");const english=locale.language==="en";
 const [params]=useSearchParams();
 const navigate=useNavigate(),closingRef=useRef(false),usageSentRef=useRef(false),usageStartedRef=useRef(false),lastCheckpointTurnRef=useRef(0),checkpointCountRef=useRef(0);
 const friend=getCrewFriend(params.get("id"));
 const intent=shortsPost?null:conversationIntent(params.get("intent"),"friend");
 const language=useTeacherStore(s=>s.targetLanguage);
 const nativeLanguage=useTeacherStore(s=>s.nativeLanguage);
 const [friendChatMode,setActiveFriendChatMode]=useState<FriendChatLanguageMode>(()=>{const saved=useTeacherStore.getState().friendChatMode;return intent==="speak"&&saved==="natural"?"bilingual":saved});
 const [modeNote,setModeNote]=useState("");
 const region=useTeacherStore(s=>s.languageStyle),accentStrength=useTeacherStore(s=>s.accentStrength),customAccent=useTeacherStore(s=>s.customAccent);
 const sessionId=friend.id;
 const [lifeOpening]=useState(()=>!shortsPost&&!intent?nextFriendLifeOpening(friend.id):"");
 const system=useMemo(()=>buildFriendSystem(friend,language,nativeLanguage,friendChatMode)+"\n"+buildAccentPrompt(language,region,accentStrength,customAccent)+buildShortsFriendContext(shortsPost),[friend,language,nativeLanguage,friendChatMode,region,accentStrength,customAccent,shortsPost]);
 const languageDirective=useMemo(()=>friendLanguageReminder(language,nativeLanguage,friendChatMode),[language,nativeLanguage,friendChatMode]);
 const live=useLiveSession({
  pageKey:"friend-"+sessionId,title:"Crew 朋友 · "+friend.name,
  system,languageDirective,
  openingPrompt:languageDirective+"\n"+(shortsPost
   ?"[FRIEND POST REACTION] You are continuing your own Crew Shorts fictional photo story. Start with a short, casual comment about the caption from the post context (not a generic greeting). Don't say you saw a real-world photo or claim this happened to the learner. Use one language per reply."
   :"[FRIEND CONVERSATION] Begin the conversation as "+friend.name+
    " with one easy conversational observation that suits your personality. A question is optional; do not interview, teach or lecture. Use just one language throughout this reply.\n"+(lifeOpening||conversationOpening(intent,"friend"))+"\n"+conversationOpening(intent,"friend")),
  voice:normalizeLiveVoice(friend.voice),language,nativeLanguage,teacherReport:false,
  persistHistory:false,sessionKind:"friend",conversationFlow:"friend",
  onTurnComplete:(_turn,completedTurns)=>{
   if(!usageSentRef.current&&completedTurns.some(turn=>Boolean(turn.input?.trim()&&turn.output?.trim()))){
    usageSentRef.current=true;trackUsageEvent("friend_conversation");
     if(shortsPost)trackUsageEvent("shorts_conversation");
   }
   // The Live ref contains the completed exchange before React updates live.turns.
   // Capture the first meaningful turn and every three more (up to three checkpoints).
   const learnerTurns=completedTurns.filter(t=>hasMeaningfulLearnerSpeech(t.input||"")).length;
   if(!learnerTurns||checkpointCountRef.current>=3||learnerTurns<=lastCheckpointTurnRef.current||
      (lastCheckpointTurnRef.current>0&&learnerTurns-lastCheckpointTurnRef.current<3))return;
   lastCheckpointTurnRef.current=learnerTurns;
   checkpointCountRef.current++;
   void rememberFriendConversation(sessionId,language,completedTurns,0);
  },
  onSessionFinished:item=>{
   if(!item)return;
   if(item.durationMs>0)trackUsageEvent("friend_session_end",sessionDurationDetail(item.durationMs));
   recordFriendChat(sessionId,language,item.turns,item.durationMs);
   void rememberFriendConversation(sessionId,language,item.turns,item.durationMs);
  }
 });
 const endAndReturn=async()=>{
  if(closingRef.current)return;
  closingRef.current=true;
  try{await live.stop(true)}finally{navigate(shortsPost?"/teacher/shorts":"/teacher/roles?mode=friends")}
 };
 useEffect(()=>{if((live.state==="listening"||live.state==="speaking")&&!usageStartedRef.current){usageStartedRef.current=true;trackUsageEvent("friend_conversation_start")}},[live.state]);
 // Start once after mounting, without double-starting under React StrictMode.
 useEffect(()=>{const timer=window.setTimeout(()=>{void live.start()},0);return()=>window.clearTimeout(timer)},[live.start]);
 useEffect(()=>{document.body.className="teacher-theme session-page friend-session-page";return()=>{document.body.className=""}},[]);
 const active=["requesting-mic","connecting","listening","speaking","ending","reporting"].includes(live.state);
 const changeFriendChatMode=(chosen:FriendChatLanguageMode)=>{
  if(chosen===friendChatMode)return;
  const connected=["listening","speaking"].includes(live.state);
  const pending=["requesting-mic","connecting"].includes(live.state);
  // Silent control never creates an artificial learner utterance.
  const applied=connected&&live.sendControl(friendLanguageTransition(language,nativeLanguage,chosen));
  useTeacherStore.getState().setFriendChatMode(chosen);
  if(applied||(!connected&&!pending))setActiveFriendChatMode(chosen);
  setModeNote(applied?t("chatModeChanged"):t("chatModeSavedNext"));
 };
 return <>
  <header className="app-header"><div className="shell inner">
   <div className="app-brand"><Link className="back-btn" to={shortsPost?"/teacher/shorts":"/teacher/roles?mode=friends"} onClick={e=>{e.preventDefault();void endAndReturn()}} aria-label="返回 Crew 朋友">‹</Link>
    <div className="app-title"><strong>{friend.name}</strong><small>Crew 朋友 · {language}</small></div>
   </div>
   <span className="status connected"><i className="status-dot"/><span>{live.state==="speaking"?"朋友說話中":live.state==="listening"?"正在聽你說":active?"正在準備對話":"自由聊天"}</span></span>
  </div></header>
  <main className="session-shell friend-live-page">
   <div className="desktop-live-workspace friend-desktop-workspace"><section className="live-stage friend-live-stage" data-state={live.state} aria-label={"和 "+friend.name+" 聊天"}>
    <div className="live-identity">
     <div className={"friend-live-avatar "+(live.state==="speaking"?"speaking":"")}><FriendAvatar friend={friend}/></div>
     <h1>{friend.name}</h1><p>{english?friend.bioEn:friend.bioZh}</p><p className="friend-live-role-promise">{t("liveRolePromise")}</p>
    </div>
    {shortsPost?<section className="friend-live-post" aria-label="Crew Shorts">
      <img src={shortsPost.image} alt={shortsPost.imageAlt} loading="lazy" decoding="async"/>
      <div><small>CREW SHORTS · {shortsPost.publishedAt.slice(0,10)}</small>
       <p lang={shortsPost.language}>{shortsPost.caption}</p></div>
     </section>:null}
    {postUnavailable?<p className="friend-live-post-unavailable" role="status">找不到原本的動態，已改為一般朋友聊天。</p>:null}
    <div className="friend-language-switch" role="group" aria-label={t("chatModeTitle")}>
     <span className="friend-language-switch-title">{t("chatModeTitle")}</span>
     <div className="friend-language-options">
      {([["natural","自然聊天"],["bilingual","輕鬆雙語"],["immersion","完全沉浸"]] as const).map(([value,label])=>
       <button key={value} type="button" className={friendChatMode===value?"selected":""}
        aria-pressed={friendChatMode===value} onClick={()=>changeFriendChatMode(value)}>{t(value==="natural"?"chatModeNatural":value==="bilingual"?"chatModeBilingual":"chatModeImmersion")}</button>)}
     </div>
     <small className="friend-language-mode-hint" role="note">{t(friendChatMode==="natural"?"chatModeHintNatural":friendChatMode==="bilingual"?"chatModeHintBilingual":"chatModeHintImmersion")}</small>
     {modeNote&&<small role="status">{modeNote}</small>}
    </div>
    <LiveControls live={live} onEnd={endAndReturn} prominentInterrupt interruptLabel="換我說 · 打斷朋友"/>
    <div className="live-presets">
     {active?<><button type="button" onClick={()=>live.sendText(languageDirective+"\nChange to a natural everyday topic and ask one brief question. Do not greet again.")}>換個話題</button>
      <button type="button" onClick={()=>live.sendText(languageDirective+"\nSpeak a little more slowly, then continue the same topic.")}>說慢一點</button>
</>:<Link className="live-mode-shortcut" to="/teacher/friends">看看其他朋友</Link>}
    </div>
    <div className="live-transcript" aria-live="polite">
     <div className={"live-line user "+(live.input?"show":"")}><small>你剛剛說</small><span>{live.input}</span></div>
     <div className={"live-line "+(live.output?"show":"")}><small>{friend.name}</small><span>{live.output}</span></div>
    </div>
    {live.turns.length?<details className="friend-chat-history"><summary>這次聊過的內容</summary>
     <div className="friend-chat-history-scroll">{live.turns.map((turn,index)=><div key={index} className="friend-chat-turn">
       {turn.input?<p><strong>你：</strong>{turn.input}</p>:null}
       {turn.output?<p><strong>{friend.name}：</strong>{turn.output}</p>:null}
      </div>)}</div>
    </details>:null}
    <p className="friend-live-footnote">聊天內容僅在這次頁面顯示。最近聊天只記錄日期；話題記憶預設開啟，可隨時在設定關閉。</p>
   </section><DesktopLivePanel kind="friend" label={friend.name} language={language} turns={live.turns} input={live.input} output={live.output} state={live.state}/></div>
  </main>
 </>;
}
