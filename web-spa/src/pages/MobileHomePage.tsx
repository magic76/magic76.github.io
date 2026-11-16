import {useEffect,useRef,useState,type TouchEvent} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Icon,type IconName} from "../components/Icon";
import {trackUsageEvent} from "../analytics/usage";
import {HomeShortsPreview} from "../teacher/HomeShortsPreview";
import type {ShortFeed} from "../teacher/shortsFeed";
import {readLatestFriendResume,type FriendResume} from "../live/sessionTranscript";
import {CREW_FRIENDS} from "../friends/friendProfiles";
import {formatResumePreview} from "./formatResumePreview";
import {GuideHub} from "../guides/GuideHub";
import {useClientReady} from "../lib/useClientReady";
import {DailyTopicCards} from "./DailyTopicCards";
import {CreatureLabResume} from "./CreatureLabResume";
import type {CreatureLabProgress} from "./creatureLabProgress";
import {useGuestTrialQuota} from "../lib/useGuestTrialQuota";
import {geminiKey} from "../lib/runtime";
import {GUEST_TEXT_DAILY_TURNS} from "../live/guestAllowance";
import zoePhoto from "../../../assets/friends/crew_friend_zoe.webp";
import oliviaPhoto from "../../../assets/teacher/teacher-olivia.jpg";
import "./mobileHome.css";
import "./mobileHomeHeroV3.css";

const ZOE_TEXT="/friend/live?id=zoe&from=home&chat=text";
const ZOE_VOICE="/friend/live?id=zoe&from=home&entry=bubble";
const PREVIEW_HIDDEN_KEY="crew_home_hide_message_preview_v1";
const GAMES=["1a2b","connect4","reversi"] as const;
const SLIDES=["zoe","friends","game","learn"] as const;
const CAROUSEL_INTERVAL_MS=11000;
type App={id:string;zh:string;en:string;icon:IconName;to:string;event:"friend"|"learn"|"play"|"story"|"fortune"|"shorts"|"timeline"};
const APPS:readonly App[]=[
 {id:"friends",zh:"AI 朋友",en:"AI Friends",icon:"chat",to:"/teacher/roles?mode=friends",event:"friend"},
 {id:"teacher",zh:"學語言",en:"Learn",icon:"teacher",to:"/learn",event:"learn"},
 {id:"games",zh:"玩遊戲",en:"Games",icon:"play",to:"/games",event:"play"},
 {id:"story",zh:"故事",en:"Stories",icon:"story",to:"/story",event:"story"},
 {id:"fortune",zh:"命理",en:"Fortune",icon:"fortune",to:"/fortune",event:"fortune"},
 {id:"shorts",zh:"朋友動態",en:"Moments",icon:"image",to:"/teacher/shorts",event:"shorts"},
 {id:"timeline",zh:"時光機",en:"Timeline",icon:"history",to:"/timeline",event:"timeline"},
 {id:"scenarios",zh:"情境課程",en:"Scenarios",icon:"scene",to:"/teacher/course",event:"learn"}
];

/** Mobile-only, first-party home. Client state loads after hydration; SSG has a stable first-visit card. */
export function MobileHomePage({shortsFeed,shortsStatus,creatureProgress}:{shortsFeed:ShortFeed|null;shortsStatus:"loading"|"ready"|"error";creatureProgress:CreatureLabProgress|null}){
 const {i18n,t}=useTranslation("home");
 const ready=useClientReady();
 const hasKey=ready&&Boolean(geminiKey());
 const trial=useGuestTrialQuota(!ready||hasKey);
 const zh=i18n.language.startsWith("zh");
 const copy=(z:string,e:string)=>zh?z:e;
 const [resume,setResume]=useState<FriendResume|null>(null);
 const [previewHidden,setPreviewHidden]=useState(false);
 const [featured,setFeatured]=useState<(typeof GAMES)[number]>("1a2b");
 const [activeSlide,setActiveSlide]=useState(0);
 const [carouselPaused,setCarouselPaused]=useState(false);
 const carouselRef=useRef<HTMLDivElement>(null);
 const startTouch=useRef<{x:number;y:number}|null>(null);
 const ignoreSwipeClick=useRef(false);
 useEffect(()=>{
  setResume(readLatestFriendResume());
  try{setPreviewHidden(localStorage.getItem(PREVIEW_HIDDEN_KEY)==="1")}catch{/* Optional privacy choice. */}
  const taipeiDay=Math.floor((Date.now()+8*60*60*1000)/86400000);
  setFeatured(GAMES[taipeiDay%GAMES.length]);
 },[]);
 // Rotate only while the mobile hero is visible. User interaction permanently pauses
 // autoplay for this page view, and reduced-motion users never auto-advance.
 useEffect(()=>{
  if(carouselPaused)return;
  const mobile=window.matchMedia("(max-width:767px)");
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  if(!mobile.matches||reduced.matches||typeof IntersectionObserver==="undefined")return;
  const element=carouselRef.current;
  if(!element)return;
  let onscreen=false;
  const observer=new IntersectionObserver(entries=>{
   onscreen=entries.some(entry=>entry.isIntersecting);
  },{threshold:0.35});
  observer.observe(element);
  const timer=window.setInterval(()=>{
   if(onscreen&&document.visibilityState==="visible"&&mobile.matches&&!reduced.matches){
    setActiveSlide(previous=>(previous+1)%SLIDES.length);
   }
  },CAROUSEL_INTERVAL_MS);
  return()=>{observer.disconnect();window.clearInterval(timer)};
 },[carouselPaused]);
 const manualSlide=(index:number)=>{setCarouselPaused(true);setActiveSlide((index+SLIDES.length)%SLIDES.length)};
 const touchBegin=(event:TouchEvent<HTMLDivElement>)=>{
  const touch=event.touches[0];if(!touch)return;
  setCarouselPaused(true);ignoreSwipeClick.current=false;
  startTouch.current={x:touch.clientX,y:touch.clientY};
 };
 const touchFinish=(event:TouchEvent<HTMLDivElement>)=>{
  const start=startTouch.current,touch=event.changedTouches[0];startTouch.current=null;
  if(!start||!touch)return;
  const dx=touch.clientX-start.x,dy=touch.clientY-start.y;
  if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.25){
   ignoreSwipeClick.current=true;
   setActiveSlide(index=>(index+(dx<0?1:-1)+SLIDES.length)%SLIDES.length);
  }
 };
 const resumeFriend=resume?CREW_FRIENDS.find(friend=>friend.id===resume.friendId):null;
 const friendResume=resumeFriend?resume:null;
 const resumeId=friendResume?.friendId;
 const textDestination=resumeId?"/friend/live?id="+encodeURIComponent(resumeId)+"&from=home&chat=text":ZOE_TEXT;
 const voiceDestination=resumeId?"/friend/live?id="+encodeURIComponent(resumeId)+"&from=home&entry=bubble":ZOE_VOICE;
 const togglePreview=()=>{
  const next=!previewHidden;setPreviewHidden(next);
  try{localStorage.setItem(PREVIEW_HIDDEN_KEY,next?"1":"0")}catch{/* Optional privacy choice. */}
 };
 const track=(detail:App["event"])=>trackUsageEvent("home_entry_click",detail);
 const todayLink="/games/"+featured;
 return <div className="crew-mobile-home">
  <div ref={carouselRef} className="cmh-carousel" role="region" aria-roledescription="carousel"
   aria-label={copy("Koolo 特色功能輪播","Koolo highlights carousel")} tabIndex={0}
   onPointerDown={()=>setCarouselPaused(true)} onFocusCapture={()=>setCarouselPaused(true)}
   onKeyDown={event=>{
    if(event.key==="ArrowRight"||event.key==="ArrowLeft"){
     event.preventDefault();manualSlide(activeSlide+(event.key==="ArrowRight"?1:-1));
    }
   }}>
   <div className="cmh-carousel-viewport" onTouchStart={touchBegin} onTouchEnd={touchFinish}
    onTouchCancel={()=>{startTouch.current=null}} onClickCapture={event=>{
     if(ignoreSwipeClick.current){event.preventDefault();event.stopPropagation();ignoreSwipeClick.current=false}
    }}>
    <div className="cmh-carousel-track" style={{transform:`translate3d(-${activeSlide*100}%,0,0)`}}>
     <section className={"cmh-slide cmh-zoe"+(friendResume?" cmh-zoe-return":"")} data-active={activeSlide===0} aria-hidden={activeSlide!==0}
      aria-label={friendResume?t("layout2.resumeTitle",{name:resumeFriend!.name}):copy("和 Zoe 聊天","Talk to Zoe")}>
      <div className="cmh-slide-glow" aria-hidden="true"/><div className="cmh-art-texture" aria-hidden="true"/><div className="cmh-sparks" aria-hidden="true"><i/><i/><i/><i/></div>
      <div className={"cmh-zoe-copy cmh-slide-copy"+(friendResume?" cmh-zoe-copy-return":"")}>
       <span className="cmh-zoe-eyebrow"><i aria-hidden="true"/> {friendResume?resumeFriend!.name.toUpperCase():"ZOE"} · AI FRIEND</span>
       <h1>{friendResume?t("layout2.resumeTitle",{name:resumeFriend!.name}):t("mobileHero.title")}</h1>
       {!friendResume&&<p>{t("mobileHero.subtitle")}</p>}
      </div>
      <div className="cmh-scene cmh-zoe-scene" aria-hidden="true">
       <div className="cmh-scene-ring cmh-scene-ring-outer"/><div className="cmh-scene-ring cmh-scene-ring-inner"/>
       <span className="cmh-zoe-back-note">HELLO<span>✳</span></span>
       <img className="cmh-zoe-photo" src={resumeFriend?.avatar||zoePhoto} alt="" width="160" height="200" loading="eager" decoding="async"/>
       <span className="cmh-chat-pop cmh-chat-pop-first">Hey! <span aria-hidden="true">✦</span></span>
       <span className="cmh-chat-pop cmh-chat-pop-last">{copy("聊聊？","Talk?")} <span aria-hidden="true">♥</span></span>
       <span className="cmh-art-sparkle cmh-art-sparkle-one">✦</span>
      </div>
      {friendResume&&<div className="cmh-resume-preview-row">
       <p className="cmh-zoe-preview" title={previewHidden?undefined:formatResumePreview(friendResume.preview)}>
        {previewHidden?t("layout2.previewHidden"):<><span className="cmh-preview-label">{t("layout2.previewLabel")}</span> {formatResumePreview(friendResume.preview,26)}</>}
       </p>
       <button type="button" tabIndex={activeSlide===0?0:-1} className="cmh-preview-eye" onClick={togglePreview}
        aria-label={t(previewHidden?"layout2.showPreview":"layout2.hidePreview")} aria-pressed={previewHidden}>
        <Icon name={previewHidden?"eye":"eye-off"}/>
       </button>
      </div>}
      <div className="cmh-zoe-actions">
       <Link to={textDestination} tabIndex={activeSlide===0?0:-1} className="cmh-zoe-primary" onClick={()=>trackUsageEvent("home_entry_click","friend")}><Icon name="chat"/>{friendResume?t("layout2.resumeAction"):copy("文字聊天","Text Zoe")}</Link>
       <Link to={voiceDestination} tabIndex={activeSlide===0?0:-1} className="cmh-zoe-secondary" onClick={()=>trackUsageEvent("home_entry_click","voice")}><Icon name="mic"/>{copy("語音聊天","Voice")}</Link>
      </div>
     </section>
     <section className="cmh-slide cmh-slide-friends" data-active={activeSlide===1} aria-hidden={activeSlide!==1}
      aria-label={copy("認識其他 AI 朋友","Meet AI friends")}>
      <div className="cmh-slide-glow" aria-hidden="true"/><div className="cmh-art-texture" aria-hidden="true"/><div className="cmh-sparks" aria-hidden="true"><i/><i/><i/><i/></div>
      <div className="cmh-slide-copy">
       <span className="cmh-zoe-eyebrow">✦ AI FRIENDS</span>
       <h2>{copy("換個朋友聊聊？","Meet someone new")}</h2>
       <p>{copy("三個朋友，三種聊法。","Three friends, three vibes.")}</p>
      </div>
      <div className="cmh-scene cmh-friends-art" aria-hidden="true">
       <div className="cmh-friend-orbit cmh-friend-orbit-back"/>
       <div className="cmh-friend-orbit cmh-friend-orbit-front"/>
       {CREW_FRIENDS.filter(friend=>["noah","iris","bella"].includes(friend.id)).map((friend,index)=>
        <div key={friend.id} className={"cmh-friend-portrait cmh-friend-portrait-"+index}>
         <img src={friend.avatar} width="94" height="108" alt="" loading="lazy" decoding="async"/>
         <span>{friend.name}</span>
        </div>)}
       <span className="cmh-art-sparkle cmh-friend-star">✳</span>
      </div>
      <div className="cmh-zoe-actions">
       <Link to="/friend/live?id=noah&from=home&chat=text" tabIndex={activeSlide===1?0:-1} className="cmh-zoe-primary" onClick={()=>trackUsageEvent("home_entry_click","friend")}><Icon name="chat"/>{copy("和 Noah 聊聊","Chat with Noah")}</Link>
       <Link to="/teacher/roles?mode=friends" tabIndex={activeSlide===1?0:-1} className="cmh-zoe-secondary" onClick={()=>trackUsageEvent("home_entry_click","friend")}>{copy("認識朋友","All friends")}</Link>
      </div>
     </section>
     <section className="cmh-slide cmh-slide-game" data-active={activeSlide===2} aria-hidden={activeSlide!==2}
      aria-label={copy("今日推薦遊戲","Today's game")}>
      <div className="cmh-slide-glow" aria-hidden="true"/><div className="cmh-art-texture" aria-hidden="true"/><div className="cmh-sparks" aria-hidden="true"><i/><i/><i/><i/></div>
      <div className="cmh-slide-copy">
       <span className="cmh-zoe-eyebrow">✦ {t("gamePick.label")}</span>
       <h2>{t("playHub.games."+featured+".title")}</h2>
       <p>{copy("今天玩一局，換個心情。","One round. A fresh mood.")}</p>
      </div>
      <div className="cmh-scene cmh-game-art" aria-hidden="true">
       <div className="cmh-game-platform"/>
       <div className="cmh-game-board" data-game={featured}>
        {Array.from({length:9},(_,index)=><span key={index} className={"cmh-game-tile cmh-game-tile-"+index}>
         {featured==="1a2b"?["1","A","2","B","4","3","7","8","9"][index]:
          <i className={"cmh-game-piece cmh-piece-"+(index%3)}/>}
        </span>)}
       </div>
       <div className="cmh-game-floating-token">✦<span>PLAY</span></div>
      </div>
      <div className="cmh-zoe-actions">
       <Link to={todayLink} tabIndex={activeSlide===2?0:-1} className="cmh-zoe-primary" onClick={()=>trackUsageEvent("home_entry_click","play")}><Icon name="play"/>{copy("開始玩遊戲","Play now")}</Link>
       <Link to="/games" tabIndex={activeSlide===2?0:-1} className="cmh-zoe-secondary" onClick={()=>trackUsageEvent("home_entry_click","play")}>{copy("更多遊戲","All games")}</Link>
      </div>
     </section>
     <section className="cmh-slide cmh-slide-learn" data-active={activeSlide===3} aria-hidden={activeSlide!==3}
      aria-label={copy("和 AI 學語言","Learn with AI")}>
      <div className="cmh-slide-glow" aria-hidden="true"/><div className="cmh-art-texture" aria-hidden="true"/><div className="cmh-sparks" aria-hidden="true"><i/><i/><i/><i/></div>
      <div className="cmh-slide-copy">
       <span className="cmh-zoe-eyebrow">✦ Koolo LEARN</span>
       <h2>{copy("一句話，練出自信","Speak with confidence")}</h2>
       <p>{copy("跟 AI 老師練口說。","Practice speaking with AI.")}</p>
      </div>
      <div className="cmh-scene cmh-learn-art" aria-hidden="true">
       <span className="cmh-learn-ring cmh-learn-ring-one"/><span className="cmh-learn-ring cmh-learn-ring-two"/>
       <div className="cmh-learn-portrait"><img src={oliviaPhoto} width="154" height="196" alt="" loading="lazy" decoding="async"/></div>
       <span className="cmh-learn-word cmh-learn-word-hi">Hello!</span>
       <span className="cmh-learn-word cmh-learn-word-konnichiwa">こんにちは</span>
       <span className="cmh-learn-wave"><i/><i/><i/><i/><i/></span>
      </div>
      <div className="cmh-zoe-actions">
       <Link to="/learn" tabIndex={activeSlide===3?0:-1} className="cmh-zoe-primary" onClick={()=>trackUsageEvent("home_entry_click","learn")}><Icon name="teacher"/>{copy("開始學語言","Start learning")}</Link>
       <Link to="/teacher/roles?mode=teacher" tabIndex={activeSlide===3?0:-1} className="cmh-zoe-secondary" onClick={()=>trackUsageEvent("home_entry_click","learn")}>{copy("找位老師","Pick teacher")}</Link>
      </div>
     </section>
    </div>
   </div>
   <div className="cmh-carousel-dots" role="group" aria-label={copy("選擇輪播項目","Choose carousel slide")}>
    {SLIDES.map((slide,index)=><button key={slide} type="button"
     className={index===activeSlide?"is-active":""} aria-current={index===activeSlide?"true":undefined}
     aria-label={copy("前往第 "+(index+1)+" 張："+["Zoe 聊天","AI 朋友","今日推薦","學語言"][index],
                      "Go to slide "+(index+1)+": "+["Zoe","AI friends","Today's game","Learn"][index])}
     onClick={()=>manualSlide(index)}><span aria-hidden="true"/></button>)}
   </div>
   {!hasKey&&<div className="cmh-allowance-slot">
    {ready&&!hasKey&&<p className="cmh-free-allowance" role="status">{trial.resolved&&trial.enabled&&trial.remaining===0
     ?t("world.freeAllowance.voiceUsed",{count:GUEST_TEXT_DAILY_TURNS})
     :trial.resolved&&trial.enabled&&trial.remaining!==null&&trial.remaining>0&&trial.seconds!==null
      ?t("world.freeAllowance.full",{count:GUEST_TEXT_DAILY_TURNS,minutes:trial.seconds/60})
      :t("world.freeAllowance.textOnly",{count:GUEST_TEXT_DAILY_TURNS})}</p>}
   </div>}
  </div>
  <DailyTopicCards variant="mobile"/>
  <section className="cmh-apps" aria-labelledby="cmh-apps-title">
   <div className="cmh-section-heading"><h2 id="cmh-apps-title">{copy("想玩什麼？","What sounds fun?")}</h2></div>
   <div className="cmh-app-grid">{APPS.map(app=><Link to={app.to} key={app.id} className="cmh-app" onClick={()=>track(app.event)}>
    <span className={"cmh-app-icon cmh-app-"+app.id}><Icon name={app.icon}/></span><span className="cmh-app-name">{copy(app.zh,app.en)}</span>
   </Link>)}</div>
  </section>
  <div className="cmh-shorts"><HomeShortsPreview maxPosts={8} sharedFeed={shortsFeed} sharedStatus={shortsStatus}/></div>
  {creatureProgress&&<CreatureLabResume progress={creatureProgress}/>}
  <section className="cmh-seo" aria-labelledby="cmh-seo-heading">
   <h2 id="cmh-seo-heading">{copy("Crew：AI 朋友聊天、語言學習、互動遊戲與故事創作","Crew: AI Friends, Language Practice, Games and Stories")}</h2>
   <p>{copy("在 Crew，你可以和不同個性的 AI 朋友自然聊天、用 Crew Teacher 練習外語口說、一起玩猜數字或棋盤遊戲，也能探索命理、創作及閱讀故事。","Talk to AI friends, practice languages, play interactive games, explore fortune readings and create stories together.")}</p>
   <nav aria-label={copy("探索 Koolo","Explore Koolo")}>
    <Link to="/teacher/roles?mode=friends">{copy("AI 朋友","AI Friends")}</Link>
    <Link to="/learn">{copy("語言學習","Learn languages")}</Link>
    <Link to="/games">{copy("互動遊戲","Games")}</Link>
    <Link to="/story">{copy("故事創作","Stories")}</Link>
    <Link to="/fortune">{copy("命理探索","Fortune")}</Link>
   </nav>
   <GuideHub/>
  </section>
 </div>;
}
