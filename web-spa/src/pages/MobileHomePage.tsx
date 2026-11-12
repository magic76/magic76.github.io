import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Icon,type IconName} from "../components/Icon";
import {trackUsageEvent} from "../analytics/usage";
import {HomeShortsPreview} from "../teacher/HomeShortsPreview";
import type {ShortFeed} from "../teacher/shortsFeed";
import {readLatestFriendResume,type FriendResume} from "../live/sessionTranscript";
import {CREW_FRIENDS} from "../friends/friendProfiles";
import {GuideHub} from "../guides/GuideHub";
import {useClientReady} from "../lib/useClientReady";
import {DailyTopicCards} from "./DailyTopicCards";
import {useGuestTrialQuota} from "../lib/useGuestTrialQuota";
import {geminiKey} from "../lib/runtime";
import {GUEST_TEXT_DAILY_TURNS} from "../live/guestAllowance";
import zoePhoto from "../../../assets/friends/crew_friend_zoe.webp";
import {HomeModeRail,type HomeMode} from "./HomeModeRail";
import {readHomeDeepLink,HOME_FRIEND_NAMES} from "./homeDeepLink.mjs";
import {shortsChatUrl,shortsPhotoQuestions} from "../teacher/shortsSocial";
import "./mobileHome.css";
import "./mobileHomeHeroV3.css";
import "./homeLayout2.css";

const ZOE_TEXT="/friend/live?id=zoe&from=home&chat=text";
const ZOE_VOICE="/friend/live?id=zoe&from=home&entry=bubble";
const PREVIEW_HIDDEN_KEY="crew_home_hide_message_preview_v1";
const GAMES=["1a2b","connect4","reversi"] as const;
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
export function MobileHomePage({shortsFeed,shortsStatus}:{shortsFeed:ShortFeed|null;shortsStatus:"loading"|"ready"|"error"}){
 const {i18n,t}=useTranslation("home");
 const ready=useClientReady();
 const hasKey=ready&&Boolean(geminiKey());
 const trial=useGuestTrialQuota(!ready||hasKey);
 const zh=i18n.language.startsWith("zh");
 const copy=(z:string,e:string)=>zh?z:e;
 const [resume,setResume]=useState<FriendResume|null>(null);
 const [previewHidden,setPreviewHidden]=useState(false);
 const [featured,setFeatured]=useState<(typeof GAMES)[number]>("1a2b");
 const [mode,setMode]=useState<HomeMode>("chat");
 const [deepLink,setDeepLink]=useState<ReturnType<typeof readHomeDeepLink>>({tab:null,friend:null,game:null,short:null});
 useEffect(()=>{
  setResume(readLatestFriendResume());
  try{setPreviewHidden(localStorage.getItem(PREVIEW_HIDDEN_KEY)==="1")}catch{/* Optional privacy choice. */}
  const taipeiDay=Math.floor((Date.now()+8*60*60*1000)/86400000);
  setFeatured(GAMES[taipeiDay%GAMES.length]);
  const link=readHomeDeepLink(window.location.search);
  setDeepLink(link);if(link.tab)setMode(link.tab);
 },[]);
 const zoeResume=resume?.friendId==="zoe"?resume:null;
 const otherResume=resume&&resume.friendId!=="zoe"?resume:null;
 const otherFriend=otherResume?CREW_FRIENDS.find(friend=>friend.id===otherResume.friendId):null;
 const excerpt=(value:string)=>value.trim().replace(/\s+/g," ").slice(0,84);
 const recentLine=(line:string)=>previewHidden?t("layout2.previewHidden"):excerpt(line);
 const togglePreview=()=>{
  const next=!previewHidden;setPreviewHidden(next);
  try{localStorage.setItem(PREVIEW_HIDDEN_KEY,next?"1":"0")}catch{/* Optional privacy choice. */}
 };
 const track=(detail:App["event"])=>trackUsageEvent("home_entry_click",detail);
 const exhausted=ready&&!hasKey&&trial.resolved&&trial.enabled&&trial.remaining===0;
 const friendId=deepLink.tab==="chat"&&deepLink.friend?deepLink.friend:"zoe";
 const friendName=HOME_FRIEND_NAMES[friendId]||"Zoe";
 const activeFriend=friendId==="zoe"?null:CREW_FRIENDS.find(friend=>friend.id===friendId);
 const selectedPost=deepLink.short?shortsFeed?.posts.find(post=>post.id===deepLink.short)||null:null;
 const questions=selectedPost?shortsPhotoQuestions(selectedPost,(key,detail)=>t("shorts."+key,{detail})):[];
 const shortsDestination=selectedPost?shortsChatUrl(selectedPost,undefined,questions.length?0:undefined):null;
 const destination=exhausted?"/account#settings-gemini":shortsDestination||
  (friendId==="zoe"?ZOE_TEXT:"/friend/live?id="+encodeURIComponent(friendId)+"&from=home&chat=text");
 const canResume=Boolean(zoeResume&&friendId==="zoe"&&!selectedPost);
 const gameId=deepLink.tab==="play"&&deepLink.game?deepLink.game:featured;
 const destinations={chat:destination,learn:exhausted?"/account#settings-gemini":"/teacher/live?lesson=daily_u1_l1",
  fortune:"/fortune/reading?mode=tarot",play:"/games/"+gameId};
 const onNavigate=(next:HomeMode)=>{
  trackUsageEvent("home_entry_click",exhausted&&(next==="chat"||next==="learn")?"settings":next==="chat"?"friend":next);
  if(next==="chat"&&selectedPost&&!exhausted){
   trackUsageEvent("shorts_hook_click","shorts_home");trackUsageEvent("shorts_chat_click","shorts_home");
  }
 };
 const headline=canResume?t("layout2.resumeTitle"):t("layout2.title",{name:friendName});
 const mainAction=exhausted?t("world.chatExhausted"):canResume?t("layout2.resumeAction"):
  hasKey?t("world.chatWithFriend",{name:friendName}):t("layout2.action",{name:friendName});
 return <div className="crew-mobile-home">
  <section className="cmh-layout2-hero" aria-label={headline}>
   <div className="cmh-layout2-heading">
    <div className="cmh-layout2-copy"><span className="cmh-layout2-eyebrow">ZOE · AI FRIEND</span>
     <h1>{headline}</h1>
     <p className="cmh-layout2-description">{canResume?recentLine(zoeResume!.preview):t("layout2.description")}</p>
    </div>
    <img className="cmh-layout2-avatar" src={activeFriend?.avatar||zoePhoto} alt="" width="100" height="110" loading="eager" decoding="async"/>
   </div>
   <Link to={destination} className="cmh-layout2-primary" onClick={()=>onNavigate("chat")}>
    <Icon name="chat"/><span>{selectedPost&&!exhausted?(questions[0]?.label||t("world.shortsFallback")):mainAction}</span><span aria-hidden="true">↗</span>
   </Link>
   {!hasKey&&<div className="cmh-allowance-slot">
    {ready&&!hasKey&&<p className="cmh-free-allowance" role="status">{trial.resolved&&trial.enabled&&trial.remaining===0
     ?t("world.freeAllowance.voiceUsed",{count:GUEST_TEXT_DAILY_TURNS})
     :trial.resolved&&trial.enabled&&trial.remaining!==null&&trial.remaining>0&&trial.seconds!==null
      ?t("world.freeAllowance.full",{count:GUEST_TEXT_DAILY_TURNS,minutes:trial.seconds/60})
      :t("world.freeAllowance.textOnly",{count:GUEST_TEXT_DAILY_TURNS})}</p>}
   </div>}
   <Link to={ZOE_VOICE} className="cmh-layout2-voice" onClick={()=>trackUsageEvent("home_entry_click","voice")}>{t("layout2.voice")} <span aria-hidden="true">↗</span></Link>
   {canResume&&<button type="button" className="cmh-preview-toggle" onClick={togglePreview}>{previewHidden?t("layout2.showPreview"):t("layout2.hidePreview")}</button>}
  </section>
  <section className="cmh-layout2-other" aria-label={t("layout2.more")}>
   <h2>{t("layout2.more")}</h2>
   <HomeModeRail prefix="cmh-mode" mode={mode} onChange={setMode} destinations={destinations} onNavigate={onNavigate}
    chatName={friendName} chatAction={selectedPost?(questions[0]?.label||t("world.shortsFallback")):undefined}/>
  </section>
  {otherResume&&otherFriend&&<section className="cmh-other-resume" aria-label={copy("續聊","Resume chat")}>
   <img src={otherFriend.avatar} alt="" width="40" height="40" loading="lazy"/>
   <Link to={"/friend/live?id="+encodeURIComponent(otherResume.friendId)+"&from=home&chat=text"} className="cmh-other-resume-link" onClick={()=>trackUsageEvent("home_entry_click","friend")}>
    <strong>{copy("繼續和 "+otherFriend.name+" 聊","Continue with "+otherFriend.name)}</strong>
    <span>{recentLine(otherResume.preview)}</span>
   </Link>
   <button type="button" onClick={togglePreview} className="cmh-other-hide" aria-label={previewHidden?t("layout2.showPreview"):t("layout2.hidePreview")}><Icon name="cards"/></button>
  </section>}
  <DailyTopicCards variant="mobile"/>
  <section className="cmh-apps" aria-labelledby="cmh-apps-title">
   <div className="cmh-section-heading"><h2 id="cmh-apps-title">{copy("想玩什麼？","What sounds fun?")}</h2></div>
   <div className="cmh-app-grid">{APPS.map(app=><Link to={app.to} key={app.id} className="cmh-app" onClick={()=>track(app.event)}>
    <span className={"cmh-app-icon cmh-app-"+app.id}><Icon name={app.icon}/></span><span className="cmh-app-name">{copy(app.zh,app.en)}</span>
   </Link>)}</div>
  </section>
  <div className="cmh-shorts"><HomeShortsPreview maxPosts={8} sharedFeed={shortsFeed} sharedStatus={shortsStatus}/></div>
  <section className="cmh-seo" aria-labelledby="cmh-seo-heading">
   <h2 id="cmh-seo-heading">{copy("Crew：AI 朋友聊天、語言學習、互動遊戲與故事創作","Crew: AI Friends, Language Practice, Games and Stories")}</h2>
   <p>{copy("在 Crew，你可以和不同個性的 AI 朋友自然聊天、用 Crew Teacher 練習外語口說、一起玩猜數字或棋盤遊戲，也能探索命理、創作及閱讀故事。","Talk to AI friends, practice languages, play interactive games, explore fortune readings and create stories together.")}</p>
   <nav aria-label={copy("探索 Crew","Explore Crew")}>
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
