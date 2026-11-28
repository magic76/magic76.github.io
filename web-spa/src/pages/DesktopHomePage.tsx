import {Arrow} from "../components/Arrow";
import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Icon,type IconName} from "../components/Icon";
import {trackUsageEvent} from "../analytics/usage";
import {beginHomeFriendJourney} from "../analytics/homeFriendJourney";
import {useHomeFriendTopic} from "./useHomeFriendTopic";
import {HomeShortsPreview} from "../teacher/HomeShortsPreview";
import {CREW_FRIENDS} from "../friends/friendProfiles";
import {readLatestFriendActivity,type FriendActivity} from "../live/sessionTranscript";
import {DailyTopicCards} from "./DailyTopicCards";
import type {ShortFeed} from "../teacher/shortsFeed";
import {GuideHub} from "../guides/GuideHub";
import {HomeGeminiVerify} from "./HomeGeminiVerify";
import {captureZoePortrait} from "../friends/zoePortraitTransition";
import zoePhoto from "../../../assets/friends/crew_friend_zoe.webp";
import {TeacherAvatar} from "../teacher/TeacherAvatar";
import {useHomeTeacher} from "./useHomeTeacher";
import oliviaPhoto from "../../../assets/teacher/teacher-olivia.jpg";
import "./desktopHome.css";

const ZOE_VOICE="/friend/live?id=zoe&from=home&entry=bubble";
type Recent={key:string;kind:"teacher"|"story"|"fortune"|"play"|"friend";title:string;description:string;to:string;cover?:string};
type Shortcut={id:string;zh:string;en:string;icon:IconName;to:string;event:"friend"|"learn"|"play"|"story"|"fortune"|"shorts"|"timeline"};
const SHORTCUTS:readonly Shortcut[]=[
 {id:"friends",zh:"AI 朋友",en:"AI Friends",icon:"chat",to:"/chat",event:"friend"},
 {id:"teacher",zh:"學語言",en:"Learn",icon:"teacher",to:"/learn",event:"learn"},
 {id:"games",zh:"玩遊戲",en:"Games",icon:"play",to:"/games",event:"play"},
 {id:"fortune",zh:"命理",en:"Fortune",icon:"fortune",to:"/fortune",event:"fortune"},
 {id:"shorts",zh:"朋友動態",en:"Moments",icon:"image",to:"/teacher/shorts",event:"shorts"},
 {id:"scenarios",zh:"情境課程",en:"Scenarios",icon:"scene",to:"/teacher/course",event:"learn"}
];
const FEATURE_FRIENDS=["noah","iris","bella"] as const;

export function DesktopHomePage({recents,shortsFeed,shortsStatus,featuredGame}:{
 recents:readonly Recent[];
 shortsFeed:ShortFeed|null;
 shortsStatus:"loading"|"ready"|"error";
 featuredGame:"1a2b"|"connect4"|"reversi";
}){
 const {i18n,t}=useTranslation("home");
 const teacher=useHomeTeacher(i18n.language);
 const title=teacher?t("showcase29.teacherTitle",teacher):t("showcase29.firstPractice");
 const startPractice=teacher?t("showcase29.practiceWith",teacher):t("showcase29.practiceNow");
 const [activity,setActivity]=useState<FriendActivity|null>(null);
 useEffect(()=>{
  setActivity(readLatestFriendActivity());
 },[]);
 const friend=activity?CREW_FRIENDS.find(person=>person.id===activity.friendId):null;
 const id=friend?.id;
 const resumeTopic=useHomeFriendTopic(id);
 const voiceTo=id?"/friend/live?id="+encodeURIComponent(id)+"&from=home&entry=bubble":ZOE_VOICE;
 const track=(detail:Shortcut["event"])=>trackUsageEvent("home_entry_click",detail);
 return <div className="koolo-desktop-home">
  <section className="kdh-stage" aria-label={t("showcase29.desktop.stage")}>
   <div className="kdh-zoe">
    <div className="kdh-zoe-content">
     <span className="kdh-eyebrow"><span className="kdh-status-dot"/> {friend?friend.name.toUpperCase():"ZOE"} · {t("showcase29.badgeFriend")}</span>
     <h1>{friend?t("layout2.resumeTitle",{name:friend.name}):t("mobileHero.title")}</h1>
     <p className={resumeTopic?"kdh-return-topic":undefined}>{resumeTopic?t("chatChoices.resume")+": "+resumeTopic:t(friend?"chatChoices.returnPrompt":"chatChoices.prompt")}</p>
     <div className="kdh-zoe-actions">
      <Link className="kdh-primary" to={voiceTo} onClick={event=>{if(!id||id==="zoe")captureZoePortrait(event,event.currentTarget.closest(".kdh-zoe")?.querySelector<HTMLImageElement>(".kdh-zoe-visual img"));track("friend");beginHomeFriendJourney(id||"zoe",Boolean(friend))}}><Icon name="chat"/>{t(friend?"chatChoices.resume":"showcase29.desktop.voice")}</Link>
     </div>
    </div>
    <div className="kdh-zoe-visual" aria-hidden="true">
     <div className="kdh-orbit kdh-orbit-a"/><div className="kdh-orbit kdh-orbit-b"/>
     <span className="kdh-floating-hello">HELLO ✳</span>
     <img src={friend?.avatar||zoePhoto} width="312" height="350" alt="" loading="eager" decoding="async"/>
     <span className="kdh-chat-bubble">Hey! ✦</span>
    </div>
   </div>
   <div className="kdh-feature-column">
    <Link to="/chat" className="kdh-feature kdh-feature-friends" onClick={()=>track("friend")}>
     <span className="kdh-feature-copy"><small>{t("showcase29.badgeFriends")}</small><strong>{t("showcase29.friendsTitle")}</strong><span>{t("showcase29.desktop.friendsDesc")}</span></span>
     <span className="kdh-feature-faces" aria-hidden="true">{FEATURE_FRIENDS.map(id=>{const person=CREW_FRIENDS.find(p=>p.id===id);return person?<img src={person.avatar} width="78" height="94" loading="lazy" decoding="async" alt="" key={id}/>:null})}</span>
     <Arrow direction="right" className="kdh-feature-arrow"/>
    </Link>
    <Link to={"/games/"+featuredGame} className="kdh-feature kdh-feature-game" onClick={()=>track("play")}>
     <span className="kdh-feature-copy"><small>{t("gamePick.label")}</small><strong>{t("playHub.games."+featuredGame+".title")}</strong><span>{t("showcase29.desktop.gameDesc")}</span></span>
     <span className="kdh-game-art" aria-hidden="true"><b>1</b><b>A</b><b>2</b><b>B</b></span>
     <Arrow direction="right" className="kdh-feature-arrow"/>
    </Link>
    <Link to="/teacher/live" className="kdh-feature kdh-feature-learn" onClick={()=>track("learn")}>
     <span className="kdh-feature-copy"><small>{t("showcase29.desktop.learnBadge")}</small><strong>{title}</strong><span>{startPractice}</span></span>
     {teacher?<TeacherAvatar className="kdh-teacher-image" profile={teacher.profile} decorative portrait/>:<img className="kdh-teacher-image" src={oliviaPhoto} width="85" height="110" alt="" loading="lazy" decoding="async"/>}
     <Arrow direction="right" className="kdh-feature-arrow"/>
    </Link>
   </div>
  </section>
  <HomeGeminiVerify variant="desktop"/>
  {(recents.length>0)&&<section className="kdh-resume-section" aria-label={t("continue")}>
   <div className="kdh-section-title"><h2>{t("continue")}</h2><span>{t("localOnly")}</span></div>
   <div className="kdh-resume-grid">
    {recents.map(recent=><Link key={recent.key} className="kdh-resume-card" to={recent.to}>
     <span className="kdh-resume-icon">{recent.cover?<img src={recent.cover} alt=""/>:<Icon name={recent.kind==="friend"?"chat":recent.kind}/>}</span>
     <span className="kdh-resume-copy"><strong>{recent.title}</strong><small>{recent.description}</small></span>
     <Arrow/>
    </Link>)}
   </div>
  </section>}
  <section className="kdh-shortcuts-section" aria-label={t("showcase29.desktop.quick")}>
   <div className="kdh-section-title"><h2>{t("showcase29.desktop.heading")}</h2><Link to="/explore">{t("showcase29.desktop.all")} <Arrow/></Link></div>
   <div className="kdh-shortcuts">{SHORTCUTS.map(item=><Link className={"kdh-shortcut kdh-shortcut-"+item.id} key={item.id} to={item.to} onClick={()=>track(item.event)}>
    <span className="kdh-shortcut-icon"><Icon name={item.icon}/></span>
    <strong>{t("showcase29.apps."+item.id)}</strong>
   </Link>)}</div>
  </section>
  <section className="kdh-moments">
   <HomeShortsPreview maxPosts={10} sharedFeed={shortsFeed} sharedStatus={shortsStatus} compact/>
  </section>
  <section className="kdh-daily"><DailyTopicCards variant="desktop"/></section>
  <section className="kdh-more"><GuideHub/></section>
 </div>;
}
