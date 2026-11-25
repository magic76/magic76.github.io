import {Arrow} from "../components/Arrow";
import {useAuxiliaryLiveSession} from "../live/useAuxiliaryLiveSession";
import {useSuggestedReplies,replyHintsLocked} from "../live/useSuggestedReplies";
import {GroundingSources} from "../live/GroundingSources";
import {LiveSearchAction} from "../live/LiveSearchAction";
import {buildAccentPrompt} from "../teacher/teacherAccent";
import {trackUsageEvent,sessionDurationDetail} from "../analytics/usage";
import {advanceHomeFriendJourney} from "../analytics/homeFriendJourney";
import {normalizeLiveVoice} from "../live/voiceIdentity";
import {useEffect,useMemo,useRef,useState} from "react";
import {DesktopLivePanel} from "../components/DesktopLivePanel";
import {Link,useNavigate,useSearchParams} from "react-router-dom";
import {useTeacherStore} from "../store/teacherStore";
import {detectNativeLanguage} from "../teacher/teacherLocale";
import {useLiveSession} from "../live/useLiveSession";
import {inputTranscriptionLanguageCodes} from "../live/inputTranscriptionLanguageCodes";
import {createElementPlayback} from "../live/createElementPlayback";
import {LiveControls} from "../live/LiveControls";
import {FriendCallControls} from "./FriendCallControls";
import {FriendVoiceMute} from "./FriendVoiceMute";
import {FriendCallCaptions} from "./FriendCallCaptions";
import {buildFriendVoiceOpening,CURRENT_FACTS,FORTUNE_HANDOFF} from "../live/friendVoiceOpening";
import {useFriendTextViewport,useFriendBodyTheme,useFriendVoiceTheme} from "./useFriendTextViewport";
import {friendVoiceStatusKey} from "./friendVoiceStatusKey";
import {FriendChatHistory} from "./FriendChatHistory";
import {FriendCallMenu,FriendCallMenuTrigger} from "./FriendCallMenu";
import {FriendCallMenuPreferences} from "./FriendCallMenuPreferences";
import {useCallTranslationPreference} from "./useCallTranslationPreference";
import {GuestLiveStarter} from "../live/GuestLiveStarter";
import{GuestTrialCountdown,GuestTrialFinish}from"../live/GuestTrialExperience";
import {geminiKey} from "../lib/runtime";
import {FriendUnifiedComposer} from "./FriendUnifiedComposer";
import {gameRoundStarter,gameRoundContext} from "../live/gameRoundHandoff";
import{useTranslation}from"react-i18next";
import {FriendAvatar} from "./FriendAvatar";
import {getCrewFriend} from "./friendProfiles";
import {HOME_FRIEND_IDS} from "../pages/homeDeepLink.mjs";
import {getDailyTopic} from "../pages/dailyTopics";
import {getDailyQuote} from "../pages/dailyQuotes";
import {loadQuoteText} from "../pages/quoteCatalog";
import {useFriendDailyFortuneContext} from "./useFriendDailyFortuneContext";
import {nextFriendLifeOpening} from "../characters/lifeBook";
import {friendLanguageReminder,friendLanguageTransition,type FriendChatLanguageMode} from "./friendLanguage";
import {buildFriendSystem,recordFriendChat,recordFriendVoiceExchange,friendVoiceOpeningRecall,getHomeChatTopic,friendMemoryEnabled,friendLiveMemoryConfig,createFriendLiveMemory} from "./friendMemory";
import {recordFriendActivity,clearLegacyFriendChats} from "../live/sessionTranscript";
import {conversationIntent,conversationOpening} from "../teacher/conversationIntent";
import {buildShortsFriendContext,type ShortPost} from "../teacher/shortsFeed";
import {isShortsHook,shortsSelectedQuestion,rememberShortsConversation} from "../teacher/shortsSocial";
import "./friends.css";
import "./friendCall.css";
import "./friendCallFocus.css";

export function FriendLiveConversation({shortsPost,postUnavailable}:{shortsPost:ShortPost|null;postUnavailable:boolean}){
 const [guestStarted,setGuestStarted]=useState(false);
  const [pendingTextStart,setPendingTextStart]=useState(false);
  const [guestVerified,setGuestVerified]=useState(false);
 const [showCallOptions,setShowCallOptions]=useState(false);
 const {enabled:translationEnabled,toggle:toggleTranslation}=useCallTranslationPreference();
 const bubbleEffectiveRef=useRef(false);
 const {t,i18n:locale}=useTranslation(["friends","voice"]);const english=locale.language==="en";
 const [params]=useSearchParams();
 const textFirst=params.get("chat")==="text";
  const voiceParams=new URLSearchParams(params);voiceParams.delete("chat");
  useEffect(()=>{clearLegacyFriendChats()},[]);
 const textStage=useRef<HTMLElement|null>(null);
 const navigate=useNavigate(),closingRef=useRef(false),usageSentRef=useRef(false),usageStartedRef=useRef(false);
 const friend=getCrewFriend(params.get("id"));
 const bubbleEntry=params.get("entry")==="bubble"&&params.get("from")==="home";
 const homeFirstAction=params.get("from")==="home"&&HOME_FRIEND_IDS.includes(params.get("id")||"")&&!shortsPost&&!textFirst&&!geminiKey();
 const intent=shortsPost?null:conversationIntent(params.get("intent"),"friend");
 const urlHook=params.get("hook");
 const shortsHook=shortsPost&&isShortsHook(urlHook)?urlHook:null;
 const selectedQuestion=shortsPost?shortsSelectedQuestion(shortsPost,params.get("q"),
  (key,detail)=>t("home:shorts."+key,{detail})):"";
 const shortsHookText=shortsHook?t("home:shorts."+({details:"hooksDetails",feelings:"hooksFeelings",next:"hooksNext"}[shortsHook])):undefined;
 const shortsStarter=shortsPost?(selectedQuestion||shortsHookText||t("voice:friendLive.postStarter")):undefined;
 const dailyTopic=!shortsPost&&friend.id==="zoe"?getDailyTopic(params.get("topic")):undefined;
 const dailyTopicStarter=dailyTopic?t("textStarters.topics."+dailyTopic.id,{name:friend.name}):undefined;
 const selectedQuote=!shortsPost&&friend.id==="zoe"?getDailyQuote(params.get("quote")):undefined;
 const personalChartHash=!shortsPost&&friend.id==="zoe"&&params.get("quote")==="daily"?params.get("chart"):null;
 const validDailyHash=Boolean(personalChartHash&&/^[a-f0-9]{64}$/.test(personalChartHash));
 const dailyEntry=validDailyHash;
 const dailyHandoff=Boolean(dailyEntry&&params.get("from")==="fortune");
 const dailyKind=params.get("kind")==="bazi"||params.get("kind")==="numerology"?params.get("kind") as "bazi"|"numerology":null;
 const dailyLocale=locale.resolvedLanguage||locale.language;
 const {dailyLookup,dailyFortune,dailyLookupPending}=useFriendDailyFortuneContext({validDailyHash,personalChartHash,dailyLocale,dailyHandoff,dailyKind,language:locale.language});
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
 const fortuneSystem=dailyHandoff?(dailyLookup?.handoff||FORTUNE_HANDOFF):"";
 const shortsReturnTo=shortsPost?"/teacher/shorts?post="+encodeURIComponent(shortsPost.id):null;
 const language=useTeacherStore(s=>s.targetLanguage);
 const fromHome=params.get("from")==="home"&&!shortsPost;
 const nativeLanguage=useTeacherStore(s=>s.nativeLanguage);
 const friendNativeLanguage=dailyEntry?detectNativeLanguage(locale.language):nativeLanguage;
 const [friendChatMode,setActiveFriendChatMode]=useState<FriendChatLanguageMode>(()=>{const saved=useTeacherStore.getState().friendChatMode;return dailyEntry?"natural":(intent==="speak"&&saved==="natural"?"bilingual":saved)});
 const [modeNote,setModeNote]=useState("");
 const region=useTeacherStore(s=>s.languageStyle),accentStrength=useTeacherStore(s=>s.accentStrength),customAccent=useTeacherStore(s=>s.customAccent);
 const sessionId=friend.id;
 const liveMemory=useMemo(()=>createFriendLiveMemory(sessionId,language),[sessionId,language]);
 const [lifeOpening]=useState(()=>!shortsPost&&!intent?nextFriendLifeOpening(friend.id):"");
 const languageDirective=useMemo(()=>friendLanguageReminder(language,friendNativeLanguage,friendChatMode),[language,friendNativeLanguage,friendChatMode]);
 const resolveSessionContext=()=>{
  const openingRecall=friendVoiceOpeningRecall(friend.id,language);
  const system=buildFriendSystem(friend,language,friendNativeLanguage,friendChatMode)+"\n"+buildAccentPrompt(language,region,accentStrength,customAccent)+buildShortsFriendContext(shortsPost);
  const scopedSystem=gameRoundContext(system,"friend:"+friend.id);
  return {
   system:scopedSystem+(dailyFortune?"\n"+dailyFortune.context:"")+(fortuneSystem?"\n"+fortuneSystem:"")+(!shortsPost?CURRENT_FACTS:""),
  openingPrompt:languageDirective+"\n"+buildFriendVoiceOpening({name:friend.name,languageDirective,shortsPost:!!shortsPost,
   shortsHook,selectedQuestion,lifeOpening:openingRecall.returning&&openingRecall.verifiedTopic?"":lifeOpening,conversationHint:fortuneContinue||gameRoundStarter(language,friend.name,window.location.search)||conversationOpening(intent,"friend"),
   conversationStyle:"one easy conversational observation",creatureContext:"",...openingRecall}),
  };
 };
 const replyHints=useSuggestedReplies({allowed:true,language,nativeLanguage});
 // Direct Web Audio avoids Bluetooth distortion; keep mic capture.
 const separatePlayback=false;
 const live=useLiveSession({
  createPlaybackRoute:separatePlayback?createElementPlayback:undefined,
  separateCaptureContext:separatePlayback,
  pageKey:"friend-"+sessionId,title:"Koolo 朋友 · "+friend.name,
  ...resolveSessionContext(),resolveSessionContext,languageDirective,
  voice:normalizeLiveVoice(friend.voice),language,nativeLanguage,teacherReport:false,
  // URL-scoped comparison: the existing voice WS, never a second ASR request.
  // All reply modes receive the same mother-tongue + target-language hints.
  inputLanguageCodes:params.get("asrHints")==="1"?inputTranscriptionLanguageCodes(language,friendNativeLanguage):undefined,
  persistHistory:false,sessionKind:"friend",conversationFlow:"friend",protectOpening:true,
  ...friendLiveMemoryConfig(liveMemory,true),
  onInputSpeech:replyHints.onInputSpeech,
  onObservedExchange:()=>{
   // Confirmed two-sided exchange only, including guest Live and keyboard; store no transcript.
   recordFriendActivity(sessionId,"voice");
   recordFriendVoiceExchange(sessionId,language);
   if(bubbleEntry)advanceHomeFriendJourney(sessionId,"reply");
  },
  onTurnComplete:(_turn,completedTurns)=>{
   if(_turn.hasValidOutput)liveMemory.complete(completedTurns);
   if(_turn.hasValidOutput)replyHints.generate(completedTurns);
   if(!usageSentRef.current&&completedTurns.some(turn=>Boolean(turn.input?.trim()&&turn.output?.trim()))){
    usageSentRef.current=true;trackUsageEvent("friend_conversation");
      if(shortsPost){
      trackUsageEvent("shorts_conversation");
      rememberShortsConversation(shortsPost); // Only after a real two-sided exchange.
     }
   }
  },
  onSessionFinished:item=>{
   replyHints.clear();
   if(!item){liveMemory.reset();return;}
   if(item.durationMs>0)trackUsageEvent("friend_session_end",sessionDurationDetail(item.durationMs));
   recordFriendChat(sessionId,language,item.turns,item.durationMs);
   liveMemory.reset();
  }
 });
 useEffect(()=>{if(live.output.trim())replyHints.clear()},[live.output]);
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
 useEffect(()=>{if((live.state==="listening"||live.state==="speaking")&&!usageStartedRef.current){usageStartedRef.current=true;trackUsageEvent("friend_conversation_start");if(bubbleEntry){trackUsageEvent("home_live_bubble_connected");advanceHomeFriendJourney(sessionId,"verify")}}},[live.state]);
 useEffect(()=>{if(textFirst||!geminiKey()||shortsPost)return;const timer=window.setTimeout(()=>{void live.start()},0);return()=>window.clearTimeout(timer)},[live.start,textFirst,shortsPost]);
 useFriendBodyTheme(false);
 const active=["requesting-mic","connecting","listening","speaking","ending","reporting"].includes(live.state);
 useAuxiliaryLiveSession(active,false);
 useFriendVoiceTheme(!active);
 const needsKey=live.state==="error"&&live.errorKind==="key";
 const friendVisualState=live.state==="listening"&&["processing","recovering","no-transcript","no-reply"].includes(live.voicePhase)?"waiting":live.state==="requesting-mic"?"connecting":live.state==="reporting"?"waiting":needsKey?"idle":live.state;
 const friendVoiceStatus=t(friendVoiceStatusKey(live.state,live.voicePhase,needsKey,active,live.micEnabled,live.muted));
 const voiceMuteProps=live.micEnabled&&(live.state==="listening"||live.state==="speaking")
  ?{muted:live.volume===0,onToggle:()=>live.setVolume(live.volume===0?100:0)}:null;
 useFriendTextViewport(true,textStage);
 const changeFriendChatMode=(chosen:FriendChatLanguageMode)=>{
  if(chosen===friendChatMode)return;
  const connected=["listening","speaking"].includes(live.state);
  const pending=["requesting-mic","connecting"].includes(live.state);
  const applied=connected&&live.sendControl(friendLanguageTransition(language,friendNativeLanguage,chosen));
  useTeacherStore.getState().setFriendChatMode(chosen);
  if(applied||(!connected&&!pending))setActiveFriendChatMode(chosen);
  setModeNote(applied?t("chatModeChanged"):t("chatModeSavedNext"));
 };
 const showHomeStarters=fromHome&&!live.micEnabled&&(textFirst||active)&&live.turns.length===0;
 const homeTopic=showHomeStarters?getHomeChatTopic(friend.id,language):undefined;
 const homeStarters=showHomeStarters?(homeTopic
  ?[t("home:chatChoices.about",{topic:homeTopic.title}),t("home:chatChoices.fresh")]
  :[t("home:chatChoices.funny"),t("home:chatChoices.casual")]):[];
 const voiceStart=<>
  {shortsPost&&geminiKey()&&live.state==="idle"?<p className="friend-shorts-start-hint" role="status">{t("home:shorts.startVoiceHint",{name:friend.name})}</p>:null}
  {!geminiKey()&&!guestStarted?<GuestLiveStarter role="friend" precall friendMemory={undefined} textEntry={textFirst} autoTextOnVerified={textFirst&&(pendingTextStart||Boolean(dailyHandoff&&fortuneContinue))}
    onVerificationChange={setGuestVerified} focusStartOnVerified={homeFirstAction} onGrant={async grant=>{setGuestStarted(true);await live.start(grant)}} onTextGrant={async grant=>{setGuestStarted(true);setPendingTextStart(false);await live.start(grant,true)}}/>
   :guestStarted&&(live.state==="ended"||live.state==="error")?<GuestTrialFinish expired={live.guestExpired} failed={live.state==="error"}/>
   :textFirst&&!active?null:<div className={shortsPost&&live.state==="idle"?"friend-shorts-controls is-ready":"friend-shorts-controls"}>{active?(live.micEnabled?<FriendCallControls live={live} onEnd={endAndReturn}/>:<button type="button" className="friend-unified-end" onClick={()=>void endAndReturn()}>{t("callCaptions.hangUp")}</button>):<LiveControls live={live} onEnd={endAndReturn} prominentInterrupt interruptLabel={t("friendLive.interrupt")}/>}</div>}
 </>;
 return <>
  <header className="app-header"><div className="shell inner">
   <div className="app-brand"><Link className="back-btn" to={shortsReturnTo||(intent==="speak"?"/learn":"/teacher/roles?mode=friends")} onClick={e=>{e.preventDefault();void endAndReturn()}} aria-label={t("friendLive.backAria")}><Arrow direction="left" className="crew-arrow--plain"/></Link>
    <div className="app-title"><strong>{friend.name}</strong><small>{t("friendLive.brand",{language:t("languages."+language,{defaultValue:language})})}</small></div>
   </div>
   <div className="friend-call-header-actions"><span className="status connected" data-setup={needsKey||undefined} data-state={friendVisualState} role="status" aria-live="polite"><i className="status-dot"/><span>{friendVoiceStatus}</span></span>{shortsPost&&voiceMuteProps&&<FriendVoiceMute {...voiceMuteProps} compact/>}<FriendCallMenuTrigger active={true} open={showCallOptions} label={t("callCaptions.more")} onToggle={()=>setShowCallOptions(v=>!v)}/></div>
  </div></header>
  <main className="session-shell friend-live-page">
   <div className="desktop-live-workspace friend-desktop-workspace"><section ref={textStage} className={"live-stage friend-live-stage"+(active?" friend-phone-stage":" friend-precall-stage")+(active&&shortsPost?" friend-shorts-voice-compact":"")+(textFirst?" friend-text-first-stage":"")} data-state={live.state} aria-label={t("friendLive.stageAria",{name:friend.name})}>
    <div className="live-identity">
     <div className="friend-voice-avatar-anchor">
      <div className={"friend-live-avatar "+(live.state==="speaking"?"speaking":"")} data-state={friendVisualState}><FriendAvatar friend={friend}/></div>
      {voiceMuteProps&&<FriendVoiceMute {...voiceMuteProps}/>}
     </div>
     <h1>{friend.name}</h1><p>{english?friend.bioEn:friend.bioZh}</p><p className="friend-live-role-promise">{t("liveRolePromise")}</p>
    </div>
    {textFirst&&!active?<div className="friend-text-first-intro"><h1>{t("friendLive.textChat")}</h1><Link to={"/friend/live?"+voiceParams.toString()}>{t("friendLive.useVoice")}</Link></div>:null}
    {homeFirstAction?<div className="friend-shorts-first-action" aria-label={t("friendLive.stageAria",{name:friend.name})}>{voiceStart}</div>:null}
    {shortsPost?<section className="friend-live-post" aria-label="Koolo Shorts">
      <img src={shortsPost.image} alt={shortsPost.imageAlt} loading="lazy" decoding="async"/>
      <div><small>{t("friendLive.postOrigin")}<span className="friend-live-post-date"> · {shortsPost.publishedAt.slice(0,10)}</span></small>
       <p lang={shortsPost.language}>{shortsPost.caption}</p>
       {selectedQuestion?<small className="friend-live-post-hook">{t("friendLive.hookPrefix")}{selectedQuestion}</small>
        :shortsHook?<small className="friend-live-post-hook">{t("friendLive.hookPrefix")}{shortsHookText}</small>:null}</div>
     </section>:null}
    {postUnavailable?<p className="friend-live-post-unavailable" role="status">{t("friendLive.postUnavailable")}</p>:null}
    {shortsPost?<div className="friend-shorts-first-action" aria-label={t("friendLive.stageAria",{name:friend.name})}>{voiceStart}</div>:null}
    <FriendCallMenu inCall={true} open={showCallOptions} onClose={()=>setShowCallOptions(false)} title={t("callCaptions.more")} closeLabel={t("callCaptions.closeMenu")}><div className="friend-call-settings">
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
    <FriendCallMenuPreferences hintsEnabled={replyHints.enabled} hintsLocked={replyHintsLocked(live.state)} onHintsToggle={replyHints.toggle} translationEnabled={translationEnabled} onTranslationToggle={toggleTranslation}/>
    </div>
    <div className="live-presets">
     {active?<><button type="button" onClick={()=>live.sendText(languageDirective+"\nChange to a natural everyday topic and ask one brief question. Do not greet again.")}>{t("friendLive.changeTopic")}</button>{!guestStarted&&<LiveSearchAction live={live} english={english} label={english?"What's new lately?":"聊聊最近發生的事"}
    query="Find one recent, lighthearted, verifiable news or culture story with a publication date and credible source."
    instruction={"As "+friend.name+", discuss this verified story naturally, in our selected language. No tutoring, no generic greeting, no role change. "+languageDirective}/>}
      <button type="button" onClick={()=>live.sendText(languageDirective+"\nSpeak a little more slowly, then continue the same topic.")}>{t("friendLive.slower")}</button>
</>:<Link className="live-mode-shortcut" to="/teacher/friends">{t("friendLive.otherFriends")}</Link>}
    </div>
    {live.turns.length?<FriendChatHistory turns={live.turns} friendName={friend.name} youLabel={t("friendLive.youLabel")} summary={t("friendLive.historySummary")}/>:null}
    </FriendCallMenu>
    {(textFirst||!shortsPost)&&!homeFirstAction?voiceStart:null}
    {guestStarted&&live.state!=="ended"&&live.state!=="error"&&<GuestTrialCountdown secondsLeft={live.guestSecondsLeft}/>}
    {live.state==="listening"&&(live.voicePhase==="no-transcript"||live.voicePhase==="no-reply")?
     <div className="live-recovery" role="status">
      <span>{live.voicePhase==="no-transcript"?t("friendLive.noTranscript"):t("friendLive.noReply")}</span>
      {live.voicePhase==="no-reply"&&!guestStarted?<button type="button" className="live-btn" onClick={()=>void live.stop().then(()=>live.start())}>{t("controls.reconnect")}</button>:null}
     </div>:null}
    <GroundingSources sources={live.searchSources} searchSuggestions={live.searchSuggestions} english={english}/>
    {active?<FriendCallCaptions name={friend.name} turns={live.turns} input={live.input} output={live.output}
     learningLanguage={language} nativeLanguage={friendNativeLanguage} translationEnabled={translationEnabled}
     speaking={live.state==="speaking"} suggestions={replyHints.groups.at(-1)||[]} suggestionsEnabled={replyHints.enabled}/>:null}
    {/* Keep the sticky keyboard out of voice pre-call; its two gate buttons need the full width and height. */}
    {(textFirst||active)&&<FriendUnifiedComposer live={live} hasKey={!!geminiKey()} focusOnMount={params.get("chat")==="text"}
     verificationReady={guestVerified} onVerificationNeeded={textFirst?()=>setPendingTextStart(true):undefined}
     blocked={dailyLookupPending} autoStarter={dailyHandoff&&textFirst?fortuneContinue:undefined}
     starters={[gameRoundStarter(language,friend.name,window.location.search),shortsStarter,fortuneContinue,dailyFortuneStarter,dailyQuoteStarter,dailyTopicStarter,...(fortuneReplies||[]),...homeStarters].filter((v):v is string=>Boolean(v))}/>}
    <p className="friend-live-footnote">{t("friendLive.footnote")}</p>
   </section>{active&&live.micEnabled&&<DesktopLivePanel kind="friend" label={friend.name} language={language} turns={live.turns} input={live.input} output={live.output} state={live.state}/>}</div>
  </main>
 </>;
}

