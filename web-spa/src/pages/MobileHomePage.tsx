import {useEffect,useRef,useState,type TouchEvent} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Icon,type IconName} from "../components/Icon";
import {trackUsageEvent} from "../analytics/usage";
import {beginHomeFriendJourney} from "../analytics/homeFriendJourney";
import {useHomeFriendTopic} from "./useHomeFriendTopic";
import {HomeShortsPreview} from "../teacher/HomeShortsPreview";
import type {ShortFeed} from "../teacher/shortsFeed";
import {readLatestFriendActivity,type FriendActivity} from "../live/sessionTranscript";
import {CREW_FRIENDS} from "../friends/friendProfiles";
import {GuideHub} from "../guides/GuideHub";
import {useHomeAmbientMotion} from "../lib/useHomeAmbientMotion";
import {DailyTopicCards} from "./DailyTopicCards";
import {HomeGeminiVerify} from "./HomeGeminiVerify";
import {captureZoePortrait} from "../friends/zoePortraitTransition";
import zoePhoto from "../../../assets/friends/crew_friend_zoe.webp";
import {TeacherAvatar} from "../teacher/TeacherAvatar";
import {useHomeTeacher} from "./useHomeTeacher";
import oliviaPhoto from "../../../assets/teacher/teacher-olivia.jpg";
import "./mobileHome.css";
import "./mobileHomeHeroV3.css";
import "./mobileHomeEffects.css";

const ZOE_VOICE="/friend/live?id=zoe&from=home&entry=bubble";
const GAMES=["1a2b","connect4","reversi"] as const;
const SLIDES=["learn","zoe","friends","game"] as const;
const CAROUSEL_INTERVAL_MS=11000;
type App={id:string;zh:string;en:string;icon:IconName;to:string;event:"friend"|"learn"|"play"|"story"|"fortune"|"shorts"|"timeline"};
const APPS:readonly App[]=[
 {id:"friends",zh:"AI 朋友",en:"AI Friends",icon:"chat",to:"/chat",event:"friend"},
 {id:"teacher",zh:"學語言",en:"Learn",icon:"teacher",to:"/learn",event:"learn"},
 {id:"games",zh:"玩遊戲",en:"Games",icon:"play",to:"/games",event:"play"},
 {id:"fortune",zh:"命理",en:"Fortune",icon:"fortune",to:"/fortune",event:"fortune"},
 {id:"shorts",zh:"朋友動態",en:"Moments",icon:"image",to:"/teacher/shorts",event:"shorts"},
 {id:"scenarios",zh:"情境課程",en:"Scenarios",icon:"scene",to:"/teacher/course",event:"learn"}
];

/** Mobile-only, first-party home. Client state loads after hydration; SSG has a stable first-visit card. */
export function MobileHomePage({shortsFeed,shortsStatus}:{shortsFeed:ShortFeed|null;shortsStatus:"loading"|"ready"|"error"}){
 const {i18n,t}=useTranslation("home");
 const homeMotion=useHomeAmbientMotion(true);
 const teacher=useHomeTeacher(i18n.language);
 const title=teacher?t("showcase29.teacherTitle",teacher):t("showcase29.firstPractice");
 const startPractice=teacher?t("showcase29.practiceWith",teacher):t("showcase29.practiceNow");
 const [activity,setActivity]=useState<FriendActivity|null>(null);
 const [featured,setFeatured]=useState<(typeof GAMES)[number]>("1a2b");
 const [activeSlide,setActiveSlide]=useState(0);
 const [carouselPaused,setCarouselPaused]=useState(false);
 const carouselRef=useRef<HTMLDivElement>(null);
 const startTouch=useRef<{x:number;y:number}|null>(null);
 const ignoreSwipeClick=useRef(false);
 useEffect(()=>{
  setActivity(readLatestFriendActivity());
  const taipeiDay=Math.floor((Date.now()+8*60*60*1000)/86400000);
  setFeatured(GAMES[taipeiDay%GAMES.length]);
 },[]);
 // Rotate only while the mobile hero is visible. User interaction permanently pauses
 // autoplay for this page view, and reduced-motion users never auto-advance.
 useEffect(()=>{
  if(carouselPaused)return;
  if(!homeMotion)return;
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
 },[carouselPaused,homeMotion]);
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
 const resumeFriend=activity?CREW_FRIENDS.find(friend=>friend.id===activity.friendId):null;
 const friendResume=resumeFriend?activity:null;
 const resumeId=friendResume?.friendId;
 const resumeTopic=useHomeFriendTopic(resumeId);
 const voiceDestination=resumeId?"/friend/live?id="+encodeURIComponent(resumeId)+"&from=home&entry=bubble":ZOE_VOICE;
 const track=(detail:App["event"])=>trackUsageEvent("home_entry_click",detail);
 const todayLink="/games/"+featured;
 return <div className="crew-mobile-home" data-home-motion={homeMotion?"on":"off"}>
  <div ref={carouselRef} className="cmh-carousel" data-scene={SLIDES[activeSlide]} role="region" aria-roledescription="carousel"
   aria-label={t("showcase29.carousel")} tabIndex={0}
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
     <section className="cmh-slide cmh-slide-learn" data-active={activeSlide===0} aria-hidden={activeSlide!==0}
      aria-label={t("showcase29.learnAria")}>
      <div className="cmh-slide-glow" aria-hidden="true"/><div className="cmh-art-texture" aria-hidden="true"/><div className="cmh-sparks" aria-hidden="true"><i/><i/><i/><i/></div>
      <div className="cmh-slide-copy">
       <span className="cmh-zoe-eyebrow">✦ Koolo {t("showcase29.badgeLearn")}</span>
       <h1>{title}</h1>
       <p>{t("showcase29.learnDesc")}</p>
      </div>
      <div className="cmh-scene cmh-learn-art" aria-hidden="true">
       <span className="cmh-learn-ring cmh-learn-ring-one"/><span className="cmh-learn-ring cmh-learn-ring-two"/>
       <div className="cmh-learn-portrait">{teacher?<TeacherAvatar profile={teacher.profile} decorative portrait/>:<img src={oliviaPhoto} width="154" height="196" alt="" loading="eager" decoding="async"/>}</div>
       <span className="cmh-learn-word cmh-learn-word-hi">Hello!</span>
       <span className="cmh-learn-word cmh-learn-word-konnichiwa">こんにちは</span>
       <span className="cmh-learn-wave"><i/><i/><i/><i/><i/></span>
      </div>
      <div className="cmh-zoe-actions">
       <Link to="/teacher/live" tabIndex={activeSlide===0?0:-1} className="cmh-zoe-primary" onClick={()=>trackUsageEvent("home_entry_click","learn")}><Icon name="teacher"/>{startPractice}</Link>
       <Link to="/learn" state={{openTeacherPicker:true}} tabIndex={activeSlide===0?0:-1} className="cmh-zoe-secondary" onClick={()=>trackUsageEvent("home_entry_click","learn")}>{t("showcase29.changeTeacher")}</Link>
      </div>
     </section>
     <section className={"cmh-slide cmh-zoe"+(friendResume?" cmh-zoe-return":"")} data-active={activeSlide===1} aria-hidden={activeSlide!==1}
      aria-label={friendResume?t("layout2.resumeTitle",{name:resumeFriend!.name}):t("showcase29.zoeAria")}>
      <div className="cmh-slide-glow" aria-hidden="true"/><div className="cmh-art-texture" aria-hidden="true"/><div className="cmh-sparks" aria-hidden="true"><i/><i/><i/><i/></div>
      <div className={"cmh-zoe-copy cmh-slide-copy"+(friendResume?" cmh-zoe-copy-return":"")}>
       <span className="cmh-zoe-eyebrow"><i aria-hidden="true"/> {friendResume?resumeFriend!.name.toUpperCase():"ZOE"} · {t("showcase29.badgeFriend")}</span>
       <h2>{friendResume?t("layout2.resumeTitle",{name:resumeFriend!.name}):t("mobileHero.title")}</h2>
       <p className={resumeTopic?"cmh-return-topic":undefined}>{resumeTopic?t("chatChoices.resume")+": "+resumeTopic:t(friendResume?"chatChoices.returnPrompt":"chatChoices.prompt")}</p>
      </div>
      <div className="cmh-scene cmh-zoe-scene" aria-hidden="true">
       <div className="cmh-scene-ring cmh-scene-ring-outer"/><div className="cmh-scene-ring cmh-scene-ring-inner"/>
       <span className="cmh-zoe-back-note">HELLO<span>✳</span></span>
       <img className="cmh-zoe-photo" src={resumeFriend?.avatar||zoePhoto} alt="" width="160" height="200" loading="eager" decoding="async"/>
       <span className="cmh-chat-pop cmh-chat-pop-first">Hey! <span aria-hidden="true">✦</span></span>
       <span className="cmh-art-sparkle cmh-art-sparkle-one">✦</span>
      </div>
      <div className="cmh-zoe-actions">
       <Link to={voiceDestination} tabIndex={activeSlide===1?0:-1} className="cmh-zoe-primary" onClick={event=>{if(!resumeId||resumeId==="zoe")captureZoePortrait(event,event.currentTarget.closest(".cmh-zoe")?.querySelector<HTMLImageElement>(".cmh-zoe-photo"));trackUsageEvent("home_entry_click","friend");beginHomeFriendJourney(resumeId||"zoe",Boolean(friendResume))}}><Icon name="chat"/>{t(friendResume?"chatChoices.resume":"showcase29.voice")}</Link>
      </div>
     </section>
     <section className="cmh-slide cmh-slide-friends" data-active={activeSlide===2} aria-hidden={activeSlide!==2}
      aria-label={t("showcase29.friendsAria")}>
      <div className="cmh-slide-glow" aria-hidden="true"/><div className="cmh-art-texture" aria-hidden="true"/><div className="cmh-sparks" aria-hidden="true"><i/><i/><i/><i/></div>
      <div className="cmh-slide-copy">
       <span className="cmh-zoe-eyebrow">✦ {t("showcase29.badgeFriends")}</span>
       <h2>{t("showcase29.friendsTitle")}</h2>
       <p>{t("showcase29.friendsDesc")}</p>
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
       <Link to="/friend/live?id=noah&from=home&chat=text" tabIndex={activeSlide===2?0:-1} className="cmh-zoe-primary" onClick={()=>trackUsageEvent("home_entry_click","friend")}><Icon name="chat"/>{t("showcase29.chatNoah")}</Link>
       <Link to="/chat" tabIndex={activeSlide===2?0:-1} className="cmh-zoe-secondary" onClick={()=>trackUsageEvent("home_entry_click","friend")}>{t("showcase29.allFriends")}</Link>
      </div>
     </section>
     <section className="cmh-slide cmh-slide-game" data-active={activeSlide===3} aria-hidden={activeSlide!==3}
      aria-label={t("showcase29.gameAria")}>
      <div className="cmh-slide-glow" aria-hidden="true"/><div className="cmh-art-texture" aria-hidden="true"/><div className="cmh-sparks" aria-hidden="true"><i/><i/><i/><i/></div>
      <div className="cmh-slide-copy">
       <span className="cmh-zoe-eyebrow">✦ {t("gamePick.label")}</span>
       <h2>{t("playHub.games."+featured+".title")}</h2>
       <p>{t("showcase29.gameDesc")}</p>
      </div>
      <div className="cmh-scene cmh-game-art" aria-hidden="true">
       <div className="cmh-game-platform"/>
       <div className="cmh-game-board" data-game={featured}>
        {Array.from({length:9},(_,index)=><span key={index} className={"cmh-game-tile cmh-game-tile-"+index}>
         {featured==="1a2b"?["1","A","2","B","4","3","7","8","9"][index]:
          <i className={"cmh-game-piece cmh-piece-"+(index%3)}/>}
        </span>)}
       </div>
       <div className="cmh-game-floating-token">✦<span>{t("showcase29.badgePlay")}</span></div>
      </div>
      <div className="cmh-zoe-actions">
       <Link to={todayLink} tabIndex={activeSlide===3?0:-1} className="cmh-zoe-primary" onClick={()=>trackUsageEvent("home_entry_click","play")}><Icon name="play"/>{t("showcase29.playNow")}</Link>
       <Link to="/games" tabIndex={activeSlide===3?0:-1} className="cmh-zoe-secondary" onClick={()=>trackUsageEvent("home_entry_click","play")}>{t("showcase29.allGames")}</Link>
      </div>
     </section>
    </div>
   </div>
   <div className="cmh-carousel-dots" role="group" aria-label={t("showcase29.dots")}>
    {SLIDES.map((slide,index)=><button key={slide} type="button"
     className={index===activeSlide?"is-active":""} aria-current={index===activeSlide?"true":undefined}
     aria-label={t("showcase29.slideGo",{number:index+1,label:slide==="zoe"&&resumeFriend?t("layout2.resumeTitle",{name:resumeFriend.name}):t("showcase29.slide"+slide[0].toUpperCase()+slide.slice(1))})}
     onClick={()=>manualSlide(index)}><span aria-hidden="true"/></button>)}
   </div>
  </div>
  <DailyTopicCards variant="mobile"/>
  <section className="cmh-apps" aria-labelledby="cmh-apps-title">
   <div className="cmh-section-heading"><h2 id="cmh-apps-title">{t("showcase29.heading")}</h2></div>
   <div className="cmh-app-grid">{APPS.map(app=><Link to={app.to} key={app.id} className="cmh-app" onClick={()=>track(app.event)}>
    <span className={"cmh-app-icon cmh-app-"+app.id}><Icon name={app.icon}/></span><span className="cmh-app-name">{t("showcase29.apps."+app.id)}</span>
   </Link>)}</div>
  </section>
  <HomeGeminiVerify variant="mobile"/>
  <div className="cmh-shorts"><HomeShortsPreview maxPosts={6} sharedFeed={shortsFeed} sharedStatus={shortsStatus} compact motionEnabled={homeMotion}/></div>
  <div className="cmh-seo"><GuideHub/></div>
 </div>;
}
