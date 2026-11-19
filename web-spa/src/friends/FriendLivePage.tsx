import {SuggestedReplies} from "../live/SuggestedReplies";
import {useSuggestedReplies,replyHintsLocked} from "../live/useSuggestedReplies";
import {GroundingSources} from "../live/GroundingSources";
import {LiveSearchAction} from "../live/LiveSearchAction";
import {buildAccentPrompt} from "../teacher/teacherAccent";
import {awardCreatureChatEnergy} from "../pages/creatureChatRewards.mjs";
import {trackUsageEvent,sessionDurationDetail} from "../analytics/usage";
import {normalizeLiveVoice} from "../live/voiceIdentity";
import {useEffect,useMemo,useRef,useState} from "react";
import {DesktopLivePanel} from "../components/DesktopLivePanel";
import {Link,useNavigate,useSearchParams} from "react-router-dom";
import {useTeacherStore} from "../store/teacherStore";
import {detectNativeLanguage} from "../teacher/teacherLocale";
import {useLiveSession} from "../live/useLiveSession";
import {useCreatureStageSync,useCreatureVoiceBridge} from "./useCreatureVoiceBridge";
import {creatureVoiceInstruction} from "./creatureVoiceBridge.mjs";
import {CreatureVoicePanel} from "./CreatureVoicePanel";
import {LiveControls} from "../live/LiveControls";
import {FriendCallControls} from "./FriendCallControls";
import {FriendCallCaptions} from "./FriendCallCaptions";
import {VoiceTextRecap,useVoiceTextRecap,buildFriendVoiceOpening,voiceTextContext} from "../live/VoiceTextRecap";
import {useFriendTextViewport,useFriendBodyTheme,useFriendVoiceTheme} from "./useFriendTextViewport";
import {friendVoiceStatusKey} from "./friendVoiceStatusKey";
import {FriendChatHistory} from "./FriendChatHistory";
import {FriendCallMenu,FriendCallMenuTrigger} from "./FriendCallMenu";
import {GuestLiveStarter} from "../live/GuestLiveStarter";
import{GuestTrialCountdown,GuestTrialFinish}from"../live/GuestTrialExperience";
import {geminiKey} from "../lib/runtime";
import {TextChatPanel} from "../live/TextChatPanel";
import{useTranslation}from"react-i18next";
import {FriendAvatar} from "./FriendAvatar";
import {getCrewFriend} from "./friendProfiles";
import {HOME_FRIEND_IDS} from "../pages/homeDeepLink.mjs";
import {getDailyTopic} from "../pages/dailyTopics";
import {getDailyQuote} from "../pages/dailyQuotes";
import {loadQuoteText} from "../pages/quoteCatalog";
import {nextFriendLifeOpening} from "../characters/lifeBook";
import {friendLanguageReminder,friendLanguageTransition,friendBeginnerTextStart,type FriendChatLanguageMode} from "./friendLanguage";
import {buildFriendSystem,recordFriendChat,rememberFriendConversation} from "./friendMemory";
import {hasMeaningfulLearnerSpeech} from "../teacher/studentMemory";
import {conversationIntent,conversationOpening} from "../teacher/conversationIntent";
import {fetchShortsPost,buildShortsFriendContext,type ShortPost} from "../teacher/shortsFeed";
import {isShortsHook,shortsSelectedQuestion,rememberShortsConversation} from "../teacher/shortsSocial";
import "./friends.css";
import "./friendCall.css";
import "./friendCallFocus.css";

export function FriendLivePage(){
 const {t}=useTranslation("voice");
 const [params]=useSearchParams();
 const postId=params.get("post");
 const friendId=params.get("id");
 const lookupKey=String(friendId||"")+"::"+String(postId||"");
 const [lookup,setLookup]=useState<{key:string;post:ShortPost|null}|null>(null);
 useEffect(()=>{
  if(!postId)return;
  const abort=new AbortController();
  fetchShortsPost(postId,friendId||"",abort.signal).then(found=>{
   if(!abort.signal.aborted)setLookup({key:lookupKey,post:found});
  }).catch(()=>{if(!abort.signal.aborted)setLookup({key:lookupKey,post:null})});
  return()=>abort.abort();
 },[postId,friendId,lookupKey]);
 if(postId&&(!lookup||lookup.key!==lookupKey))
  return <main className="session-shell"><p className="spa-loading" role="status">{t("friendLive.preparingPost")}</p></main>;
 return <FriendLiveConversation shortsPost={postId?lookup?.post||null:null}
  postUnavailable={Boolean(postId&&!lookup?.post)}/>;
}
function FriendLiveConversation({shortsPost,postUnavailable}:{shortsPost:ShortPost|null;postUnavailable:boolean}){
 const [guestStarted,setGuestStarted]=useState(false);
 const [showCallOptions,setShowCallOptions]=useState(false);
 const bubbleEffectiveRef=useRef(false);
 const creatureRewardSession=useRef("v"+Date.now().toString(36)+Math.random().toString(36).slice(2));
 const {t,i18n:locale}=useTranslation(["friends","voice"]);const english=locale.language==="en";
 const [params]=useSearchParams();
 const textMode=params.get("chat")==="text";
 const creatureEmbed=!textMode&&params.get("id")==="zoe"&&params.get("from")==="creature"&&params.get("embed")==="1"&&window.parent!==window;
 const creatureBridge=useCreatureVoiceBridge(creatureEmbed);
 const creatureContext=creatureBridge.creature?"\n"+creatureVoiceInstruction(creatureBridge.creature):"";
 const textStage=useRef<HTMLElement|null>(null);
 const navigate=useNavigate(),closingRef=useRef(false),usageSentRef=useRef(false),usageStartedRef=useRef(false),lastCheckpointTurnRef=useRef(0),checkpointCountRef=useRef(0);
 const friend=getCrewFriend(params.get("id"));
 const bubbleEntry=params.get("entry")==="bubble"&&params.get("from")==="home";
 const homeFirstAction=params.get("from")==="home"&&HOME_FRIEND_IDS.includes(params.get("id")||"")&&!shortsPost&&!textMode&&!geminiKey();
 const intent=shortsPost?null:conversationIntent(params.get("intent"),"friend");
 const urlHook=params.get("hook");
 const shortsHook=shortsPost&&isShortsHook(urlHook)?urlHook:null;
 const selectedQuestion=shortsPost?shortsSelectedQuestion(shortsPost,params.get("q"),
  (key,detail)=>t("home:shorts."+key,{detail})):"";
 const shortsHookText=shortsHook?t("home:shorts."+({details:"hooksDetails",feelings:"hooksFeelings",next:"hooksNext"}[shortsHook])):undefined;
 const shortsStarter=shortsPost?(selectedQuestion||shortsHookText||t("voice:friendLive.postStarter")):undefined;
 // Only known IDs can resolve a starter; Shorts always retains its own priority.
 const dailyTopic=!shortsPost&&friend.id==="zoe"?getDailyTopic(params.get("topic")):undefined;
 const dailyTopicStarter=dailyTopic?t("textStarters.topics."+dailyTopic.id,{name:friend.name}):undefined;
 const selectedQuote=!shortsPost&&friend.id==="zoe"?getDailyQuote(params.get("quote")):undefined;
 // A special allowlisted token is resolved from a hash that must exist on this device.
 // No birth details or generated fortune text ever travel in the URL.
 const personalChartHash=!shortsPost&&friend.id==="zoe"&&textMode&&params.get("quote")==="daily"?params.get("chart"):null;
 const validDailyHash=Boolean(personalChartHash&&/^[a-f0-9]{64}$/.test(personalChartHash));
 const dailyEntry=validDailyHash;
 const dailyHandoff=Boolean(dailyEntry&&params.get("from")==="fortune");
 const dailyKind=params.get("kind")==="bazi"||params.get("kind")==="numerology"?params.get("kind") as "bazi"|"numerology":null;
 const dailyLocale=locale.resolvedLanguage||locale.language;
 const dailyLookupKey=validDailyHash?dailyLocale+":"+personalChartHash+":"+String(dailyKind)+":"+String(dailyHandoff):"";
 const [dailyLookup,setDailyLookup]=useState<{key:string;context:string;hash:string;handoff?:string}|null>(null);
 useEffect(()=>{
  if(!dailyLookupKey)return;
  let active=true;
  setDailyLookup(null);
  void Promise.all([import("../pages/personalDailyLine"),import("../pages/dailyFortuneReader")])
   .then(async ([{personalDailyLine},{buildDailyFortuneContext}])=>{
    const line=await personalDailyLine(dailyLocale,undefined,personalChartHash).catch(()=>null);
    const matching=!!line&&(!dailyHandoff||!dailyKind||line.card.kind===dailyKind);
    const handoff=dailyHandoff?(await import("../fortune/fortuneChatHandoff")).buildFortuneChatHandoff(matching?line!.card:null,personalChartHash!,dailyKind,dailyLocale,locale.language):null;
    const handoffContext=handoff?await handoff:"";
    if(active)setDailyLookup({key:dailyLookupKey,hash:line?.hash||"",context:matching?buildDailyFortuneContext(line!.card):"",handoff:handoffContext});
   }).catch(()=>{if(active)setDailyLookup({key:dailyLookupKey,hash:"",context:""})});
  return()=>{active=false};
 },[dailyLookupKey,personalChartHash,dailyLocale,locale.language,dailyHandoff,dailyKind]);
 const dailyFortune=dailyLookup?.key===dailyLookupKey&&dailyLookup.hash===personalChartHash&&dailyLookup.context?dailyLookup:null;
 const dailyLookupPending=Boolean(dailyLookupKey&&dailyLookup?.key!==dailyLookupKey);
 const [quoteText,setQuoteText]=useState<{id:string;language:string;text:string}|null>(null);
 useEffect(()=>{
  let active=true;
  if(selectedQuote){
   void loadQuoteText(locale.language,selectedQuote.id).then(text=>{
    if(active)setQuoteText(text?{id:selectedQuote.id,language:locale.language,text}:null);
   });
  }
  return()=>{active=false};
 },[selectedQuote?.id,locale.language]);
 const dailyQuoteStarter=selectedQuote&&quoteText?.id===selectedQuote.id&&quoteText.language===locale.language
  ?t("dailyQuoteStarter",{quote:quoteText.text}):undefined;
 const dailyFortuneStarter=dailyFortune?t("dailyFortuneStarter"):undefined;
 const fortuneContinue=dailyHandoff?t("dailyFortuneContinue"):undefined;
 const fortuneReplies=dailyHandoff?[t("dailyFortuneStarters.goodFor"),t("dailyFortuneStarters.watchOut")]:undefined;
 const day=new Date(),dayKey=[day.getFullYear(),String(day.getMonth()+1).padStart(2,"0"),String(day.getDate()).padStart(2,"0")].join("-");
 const fortuneSystem=dailyHandoff?(dailyLookup?.handoff||"[ZOE DAILY FORTUNE HANDOFF — FIRST REPLY]\nContinue discussing TODAY fortune with the user; do not greet or switch topics. Ask fortune follow-ups only.\n[/ZOE DAILY FORTUNE HANDOFF]"):"";
 const shortsReturnTo=shortsPost?"/teacher/shorts?post="+encodeURIComponent(shortsPost.id):null;
 const language=useTeacherStore(s=>s.targetLanguage);
 const nativeLanguage=useTeacherStore(s=>s.nativeLanguage);
 const friendNativeLanguage=dailyEntry?detectNativeLanguage(locale.language):nativeLanguage;
 const [friendChatMode,setActiveFriendChatMode]=useState<FriendChatLanguageMode>(()=>{const saved=useTeacherStore.getState().friendChatMode;return dailyEntry?"natural":(intent==="speak"&&saved==="natural"?"bilingual":saved)});
 const [modeNote,setModeNote]=useState("");
 const region=useTeacherStore(s=>s.languageStyle),accentStrength=useTeacherStore(s=>s.accentStrength),customAccent=useTeacherStore(s=>s.customAccent);
 const sessionId=friend.id;
 const [lifeOpening]=useState(()=>!shortsPost&&!intent?nextFriendLifeOpening(friend.id):"");
 const system=useMemo(()=>buildFriendSystem(friend,language,friendNativeLanguage,friendChatMode)+"\n"+buildAccentPrompt(language,region,accentStrength,customAccent)+buildShortsFriendContext(shortsPost),[friend,language,friendNativeLanguage,friendChatMode,region,accentStrength,customAccent,shortsPost]);
 const languageDirective=useMemo(()=>friendLanguageReminder(language,friendNativeLanguage,friendChatMode),[language,friendNativeLanguage,friendChatMode]);
 const {ready:voiceRecapReady,messages:voiceRecap}=useVoiceTextRecap(!textMode,"friend:"+friend.id+(shortsPost?":"+shortsPost.id:""),friend.id);
 const beginnerTextStart=textMode&&!shortsPost&&!dailyEntry?friendBeginnerTextStart(language,detectNativeLanguage(locale.language),friendChatMode):"";
 const replyHints=useSuggestedReplies({allowed:true,language:language});
 const live=useLiveSession({
  pageKey:"friend-"+sessionId,title:"Crew 朋友 · "+friend.name,
   system:system+replyHints.prompt+voiceTextContext(voiceRecap)+(!shortsPost?"\n[CURRENT FACTS] Never claim to have live search in this audio session. Only discuss recent facts when verified context has been supplied. If none is supplied, say you cannot confirm the latest news. Stay a natural friend, not a tutor.":"")+creatureContext,languageDirective,
  openingPrompt:languageDirective+"\n"+buildFriendVoiceOpening({name:friend.name,languageDirective,shortsPost:!!shortsPost,
   shortsHook,selectedQuestion,lifeOpening,conversationHint:conversationOpening(intent,"friend"),
   conversationStyle:"one easy conversational observation",creatureContext,messages:voiceRecap}),
  voice:normalizeLiveVoice(friend.voice),language,nativeLanguage,teacherReport:false,
  persistHistory:false,sessionKind:"friend",conversationFlow:"friend",
  tools:replyHints.tools,
  onToolCall:replyHints.onToolCall,
  onToolsUnavailable:replyHints.onToolsUnavailable,
  onInputSpeech:replyHints.onInputSpeech,
  onMissingReplyHints:replyHints.takeMissingTurn,
  onObservedExchange:turn=>{
   // Embedded creature voice already awards via its parent; count it once only.
   if(creatureEmbed){creatureBridge.reportTurn(turn);return;}
   if(turn.id)try{awardCreatureChatEnergy("friend-voice",creatureRewardSession.current+":"+turn.id)}catch{}
  },
  onRecovered:creatureEmbed?creatureBridge.onRecovered:undefined,
  onTurnComplete:(_turn,completedTurns)=>{
   replyHints.clear();
   if(!usageSentRef.current&&completedTurns.some(turn=>Boolean(turn.input?.trim()&&turn.output?.trim()))){
    usageSentRef.current=true;trackUsageEvent("friend_conversation");
      if(shortsPost){
      trackUsageEvent("shorts_conversation");
      rememberShortsConversation(shortsPost); // Only after a real two-sided exchange.
     }
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
   replyHints.clear();
   if(!item)return;
   if(item.durationMs>0)trackUsageEvent("friend_session_end",sessionDurationDetail(item.durationMs));
   recordFriendChat(sessionId,language,item.turns,item.durationMs);
   void rememberFriendConversation(sessionId,language,item.turns,item.durationMs);
  }
 });
 creatureBridge.bind(live);
 useCreatureStageSync(creatureEmbed,creatureBridge.creature,live.sendControl);
 useEffect(()=>{
  if(!bubbleEntry||bubbleEffectiveRef.current)return;
  if(live.turns.some(turn=>Boolean(turn.input?.trim()&&turn.output?.trim()))){
   bubbleEffectiveRef.current=true;
   trackUsageEvent("home_live_bubble_conversation");
  }
 },[bubbleEntry,live.turns]);
 const endAndReturn=async()=>{
  if(closingRef.current)return;
  closingRef.current=true;
  try{await live.stop(true)}finally{navigate(shortsReturnTo|| (intent==="speak"?"/learn":"/teacher/roles?mode=friends"))}
 };
 useEffect(()=>{if((live.state==="listening"||live.state==="speaking")&&!usageStartedRef.current){usageStartedRef.current=true;trackUsageEvent("friend_conversation_start");if(bubbleEntry)trackUsageEvent("home_live_bubble_connected")}},[live.state]);
 useEffect(()=>{if(textMode||!voiceRecapReady||creatureEmbed||!geminiKey()||shortsPost)return;const timer=window.setTimeout(()=>{void live.start()},0);return()=>window.clearTimeout(timer)},[live.start,textMode,shortsPost,creatureEmbed,voiceRecapReady]);
 useFriendBodyTheme(creatureEmbed);
 const active=["requesting-mic","connecting","listening","speaking","ending","reporting"].includes(live.state);
 useFriendVoiceTheme(!textMode&&!creatureEmbed&&!active);
 const needsKey=live.state==="error"&&live.errorKind==="key";
 const friendVisualState=live.state==="listening"&&["processing","recovering","no-transcript","no-reply"].includes(live.voicePhase)?"waiting":live.state==="requesting-mic"?"connecting":live.state==="reporting"?"waiting":needsKey?"idle":live.state;
 const friendVoiceStatus=t(friendVoiceStatusKey(live.state,live.voicePhase,needsKey,active));
 useFriendTextViewport(textMode,textStage);
 const changeFriendChatMode=(chosen:FriendChatLanguageMode)=>{
  if(chosen===friendChatMode)return;
  const connected=["listening","speaking"].includes(live.state);
  const pending=["requesting-mic","connecting"].includes(live.state);
  const applied=connected&&live.sendControl(friendLanguageTransition(language,friendNativeLanguage,chosen));
  useTeacherStore.getState().setFriendChatMode(chosen);
  if(applied||(!connected&&!pending))setActiveFriendChatMode(chosen);
  setModeNote(applied?t("chatModeChanged"):t("chatModeSavedNext"));
 };
 const alternateParams=new URLSearchParams(params);
 if(textMode)alternateParams.delete("chat");else alternateParams.set("chat","text");
 const alternateHref="/friend/live?"+alternateParams.toString();
 if(creatureEmbed)return <CreatureVoicePanel live={live} ready={!!creatureBridge.creature} status={friendVoiceStatus} guestStarted={guestStarted} setGuestStarted={setGuestStarted}/>;
 const voiceStart=<>
  {shortsPost&&geminiKey()&&live.state==="idle"?<p className="friend-shorts-start-hint" role="status">{t("home:shorts.startVoiceHint",{name:friend.name})}</p>:null}
  {!voiceRecapReady?<p className="spa-loading" role="status">{t("friendLive.preparingPost")}</p>:!geminiKey()&&!guestStarted?<GuestLiveStarter role="friend" precall focusStartOnVerified={homeFirstAction} textFallback={{href:alternateHref,name:friend.name}} onGrant={async grant=>{setGuestStarted(true);await live.start(grant)}}/>
   :guestStarted&&(live.state==="ended"||live.state==="error")?<GuestTrialFinish expired={live.guestExpired} failed={live.state==="error"}/>
   :<div className={shortsPost&&live.state==="idle"?"friend-shorts-controls is-ready":"friend-shorts-controls"}>{active?<FriendCallControls live={live} onEnd={endAndReturn}/>:<LiveControls live={live} onEnd={endAndReturn} prominentInterrupt interruptLabel={t("friendLive.interrupt")}/>}</div>}
 </>;
 return <>
  <header className="app-header"><div className="shell inner">
   <div className="app-brand"><Link className="back-btn" to={shortsReturnTo||(intent==="speak"?"/learn":"/teacher/roles?mode=friends")} onClick={e=>{e.preventDefault();void endAndReturn()}} aria-label={t("friendLive.backAria")}>‹</Link>
    <div className="app-title"><strong>{friend.name}</strong><small>{t("friendLive.brand",{language:t("languages."+language,{defaultValue:language})})}</small></div>
   </div>
   <div className="friend-call-header-actions"><span className="status connected" data-setup={needsKey||undefined} data-state={friendVisualState} role="status" aria-live="polite"><i className="status-dot"/><span>{friendVoiceStatus}</span></span><FriendCallMenuTrigger active={!textMode} open={showCallOptions} label={t("callCaptions.more")} onToggle={()=>setShowCallOptions(v=>!v)}/></div>
  </div></header>
  <main className="session-shell friend-live-page">
   <div className="desktop-live-workspace friend-desktop-workspace"><section ref={textStage} className={"live-stage friend-live-stage"+(textMode?" friend-text-stage":active?" friend-phone-stage":" friend-precall-stage")+(textMode&&shortsPost?" friend-text-short-post":"")+(!textMode&&active&&shortsPost?" friend-shorts-voice-compact":"")} data-state={live.state} aria-label={t("friendLive.stageAria",{name:friend.name})}>
    <div className="live-identity">
     <div className={"friend-live-avatar "+(live.state==="speaking"?"speaking":"")} data-state={friendVisualState}><FriendAvatar friend={friend}/></div>
     <h1>{friend.name}</h1><p>{english?friend.bioEn:friend.bioZh}</p><p className="friend-live-role-promise">{t("liveRolePromise")}</p>
    </div>
    {!textMode?<VoiceTextRecap messages={voiceRecap} name={friend.name}/>:null}
    {!textMode&&<SuggestedReplies replies={replyHints.replies} enabled={replyHints.enabled} onToggle={replyHints.toggle} disabled={replyHintsLocked(live.state)} unavailable={replyHints.unavailable} language={language}/>}
    {homeFirstAction?<div className="friend-shorts-first-action" aria-label={t("friendLive.stageAria",{name:friend.name})}>{voiceStart}</div>:null}
    {shortsPost?<section className="friend-live-post" aria-label="Crew Shorts">
      <img src={shortsPost.image} alt={shortsPost.imageAlt} loading="lazy" decoding="async"/>
      <div><small>{t("friendLive.postOrigin")}<span className="friend-live-post-date"> · {shortsPost.publishedAt.slice(0,10)}</span></small>
       <p lang={shortsPost.language}>{shortsPost.caption}</p>
       {selectedQuestion?<small className="friend-live-post-hook">{t("friendLive.hookPrefix")}{selectedQuestion}</small>
        :shortsHook?<small className="friend-live-post-hook">{t("friendLive.hookPrefix")}{shortsHookText}</small>:null}</div>
     </section>:null}
    {postUnavailable?<p className="friend-live-post-unavailable" role="status">{t("friendLive.postUnavailable")}</p>:null}
    {shortsPost&&!textMode?<div className="friend-shorts-first-action" aria-label={t("friendLive.stageAria",{name:friend.name})}>{voiceStart}</div>:null}
    <FriendCallMenu inCall={!textMode} open={showCallOptions} onClose={()=>setShowCallOptions(false)} title={t("callCaptions.more")} closeLabel={t("callCaptions.closeMenu")}><div className="friend-call-settings">
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
    <div className="crew-chat-mode-switch"><span>{textMode?t("friendLive.textChat"):t("friendLive.voiceChat")}</span><Link className="btn secondary small" to={alternateHref} onClick={event=>{if(textMode)return;event.preventDefault();void live.stop(true).finally(()=>navigate(alternateHref))}}>{textMode?t("friendLive.useVoice"):t("friendLive.useText")}</Link></div>
    </div>
    {!textMode?<>
    <div className="live-presets">
     {active?<><button type="button" onClick={()=>live.sendText(languageDirective+"\nChange to a natural everyday topic and ask one brief question. Do not greet again.")}>{t("friendLive.changeTopic")}</button>{!guestStarted&&<LiveSearchAction live={live} english={english} label={english?"What's new lately?":"聊聊最近發生的事"}
    query="Find one recent, lighthearted, verifiable news or culture story with a publication date and credible source."
    instruction={"As "+friend.name+", discuss this verified story naturally, in our selected language. No tutoring, no generic greeting, no role change. "+languageDirective}/>}
      <button type="button" onClick={()=>live.sendText(languageDirective+"\nSpeak a little more slowly, then continue the same topic.")}>{t("friendLive.slower")}</button>
</>:<Link className="live-mode-shortcut" to="/teacher/friends">{t("friendLive.otherFriends")}</Link>}
    </div>
    {live.turns.length?<FriendChatHistory turns={live.turns} friendName={friend.name} youLabel={t("friendLive.youLabel")} summary={t("friendLive.historySummary")}/>:null}
    </>:null}</FriendCallMenu>
    {textMode?(dailyLookupPending?<p className="spa-loading" role="status">{t("friendLive.preparingPost")}</p>:<TextChatPanel sessionScope={"friend:"+friend.id+(shortsPost?":"+shortsPost.id:dailyHandoff?":fortune:"+dailyKind+":"+personalChartHash+":"+dayKey:dailyFortune?":daily:"+dailyFortune.hash:"")} searchEnabled={!shortsPost} system={system+(dailyFortune?"\n"+dailyFortune.context:"")+(fortuneSystem?"\n"+fortuneSystem:"")+"\n"+languageDirective+(beginnerTextStart?"\n"+beginnerTextStart:"")} shortsContext={shortsPost?buildShortsFriendContext(shortsPost):undefined} speaker={friend.name} english={english}
     firstStarter={shortsStarter||fortuneContinue||dailyFortuneStarter||dailyQuoteStarter||dailyTopicStarter}
     autoStarter={fortuneContinue} replyFallback={fortuneReplies}
     starters={dailyEntry?[t("dailyFortuneStarters.goodFor"),t("dailyFortuneStarters.watchOut")]:undefined}
     showStarterWithHistory={Boolean(dailyFortuneStarter||dailyQuoteStarter)&&!dailyHandoff}
     onExchange={shortsPost?()=>{if(usageSentRef.current)return;usageSentRef.current=true;trackUsageEvent("friend_conversation");trackUsageEvent("shorts_conversation");rememberShortsConversation(shortsPost)}:undefined}/>):<>
    {!shortsPost&&!homeFirstAction?voiceStart:null}
    {guestStarted&&live.state!=="ended"&&live.state!=="error"&&<GuestTrialCountdown secondsLeft={live.guestSecondsLeft}/>}
    {live.state==="listening"&&(live.voicePhase==="no-transcript"||live.voicePhase==="no-reply")?
     <div className="live-recovery" role="status">
      <span>{live.voicePhase==="no-transcript"?t("friendLive.noTranscript"):t("friendLive.noReply")}</span>
      {live.voicePhase==="no-reply"&&!guestStarted?<button type="button" className="live-btn" onClick={()=>void live.stop().then(()=>live.start())}>{t("controls.reconnect")}</button>:null}
     </div>:null}

    <GroundingSources sources={live.searchSources} searchSuggestions={live.searchSuggestions} english={english}/>{active?<FriendCallCaptions name={friend.name} turns={live.turns} input={live.input} output={live.output} learningLanguage={language} nativeLanguage={friendNativeLanguage} speaking={live.state==="speaking"}/>:null}
    </>}
    <p className="friend-live-footnote">{t("friendLive.footnote")}</p>
   </section>{!textMode&&active&&<DesktopLivePanel kind="friend" label={friend.name} language={language} turns={live.turns} input={live.input} output={live.output} state={live.state}/>}</div>
  </main>
 </>;
}

