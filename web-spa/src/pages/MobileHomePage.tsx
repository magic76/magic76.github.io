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
import zoePhoto from "../../../assets/friends/crew_friend_zoe.webp";
import "./mobileHome.css";

const ZOE_TEXT="/friend/live?id=zoe&from=home&chat=text";
const ZOE_VOICE="/friend/live?id=zoe&from=home&entry=bubble";
const PREVIEW_HIDDEN_KEY="crew_home_hide_message_preview_v1";
const GAMES=["1a2b","connect4","reversi"] as const;
type App={id:string;zh:string;en:string;icon:IconName;to:string;event:"friend"|"learn"|"play"|"story"|"fortune"|"shorts"};
const APPS:readonly App[]=[
 {id:"friends",zh:"AI 朋友",en:"AI Friends",icon:"chat",to:"/teacher/roles?mode=friends",event:"friend"},
 {id:"teacher",zh:"學語言",en:"Learn",icon:"teacher",to:"/learn",event:"learn"},
 {id:"games",zh:"玩遊戲",en:"Games",icon:"play",to:"/games",event:"play"},
 {id:"story",zh:"故事",en:"Stories",icon:"story",to:"/story",event:"story"},
 {id:"fortune",zh:"命理",en:"Fortune",icon:"fortune",to:"/fortune",event:"fortune"},
 {id:"shorts",zh:"朋友動態",en:"Moments",icon:"image",to:"/teacher/shorts",event:"shorts"}
];

/** Mobile-only, first-party home. Client state loads after hydration; SSG has a stable first-visit card. */
export function MobileHomePage({shortsFeed,shortsStatus}:{shortsFeed:ShortFeed|null;shortsStatus:"loading"|"ready"|"error"}){
 const {i18n,t}=useTranslation("home");
 const zh=i18n.language.startsWith("zh");
 const copy=(z:string,e:string)=>zh?z:e;
 const [resume,setResume]=useState<FriendResume|null>(null);
 const [previewHidden,setPreviewHidden]=useState(false);
 const [featured,setFeatured]=useState<(typeof GAMES)[number]>("1a2b");
 useEffect(()=>{
  setResume(readLatestFriendResume());
  try{setPreviewHidden(localStorage.getItem(PREVIEW_HIDDEN_KEY)==="1")}catch{/* Optional privacy choice. */}
  const taipeiDay=Math.floor((Date.now()+8*60*60*1000)/86400000);
  setFeatured(GAMES[taipeiDay%GAMES.length]);
 },[]);
 const zoeResume=resume?.friendId==="zoe"?resume:null;
 const otherResume=resume&&resume.friendId!=="zoe"?resume:null;
 const otherFriend=otherResume?CREW_FRIENDS.find(friend=>friend.id===otherResume.friendId):null;
 const excerpt=(value:string)=>value.trim().replace(/\s+/g," ").slice(0,84);
 const recentLine=(line:string)=>previewHidden?copy("上一則訊息已隱藏","Previous message hidden"):excerpt(line);
 const togglePreview=()=>{
  const next=!previewHidden;setPreviewHidden(next);
  try{localStorage.setItem(PREVIEW_HIDDEN_KEY,next?"1":"0")}catch{/* Optional privacy choice. */}
 };
 const track=(detail:App["event"])=>trackUsageEvent("home_entry_click",detail);
 const todayLink="/games/"+featured;
 return <div className="crew-mobile-home">
  <section className="cmh-zoe" aria-label={copy("和 Zoe 聊天","Talk to Zoe")}>
   <div className="cmh-zoe-copy">
    <span className="cmh-zoe-eyebrow"><i aria-hidden="true"/> ZOE · AI FRIEND</span>
    <h1>{zoeResume?copy("繼續和 Zoe 聊","Continue with Zoe"):copy("一起聊聊吧！","Let's chat!")}</h1>
    {zoeResume?
     <p className="cmh-zoe-preview">{recentLine(zoeResume.preview)}</p>:
     <p>{copy("從一句話開始，探索你的 Crew。","Your Crew starts with a hello.")}</p>}
   </div>
   <img className="cmh-zoe-photo" src={zoePhoto} alt="Zoe" width="100" height="116" loading="eager"/>
   <div className="cmh-zoe-actions">
    <Link to={ZOE_TEXT} className="cmh-zoe-primary" onClick={()=>trackUsageEvent("home_entry_click","friend")}><Icon name="chat"/>{zoeResume?copy("繼續文字聊天","Continue chat"):copy("文字聊天","Text Zoe")}</Link>
    <Link to={ZOE_VOICE} className="cmh-zoe-secondary" onClick={()=>trackUsageEvent("home_entry_click","voice")}><Icon name="mic"/>{copy("語音聊天","Voice")}</Link>
   </div>
   {zoeResume&&<button type="button" className="cmh-preview-toggle" onClick={togglePreview}>{previewHidden?copy("顯示上一句","Show last message"):copy("隱藏上一句","Hide last message")}</button>}
  </section>
  {otherResume&&otherFriend&&<section className="cmh-other-resume" aria-label={copy("續聊","Resume chat")}>
   <img src={otherFriend.avatar} alt="" width="40" height="40" loading="lazy"/>
   <Link to={"/friend/live?id="+encodeURIComponent(otherResume.friendId)+"&from=home&chat=text"} className="cmh-other-resume-link" onClick={()=>trackUsageEvent("home_entry_click","friend")}>
    <strong>{copy("繼續和 "+otherFriend.name+" 聊","Continue with "+otherFriend.name)}</strong>
    <span>{recentLine(otherResume.preview)}</span>
   </Link>
   <button type="button" onClick={togglePreview} className="cmh-other-hide" aria-label={previewHidden?copy("顯示上一句","Show last message"):copy("隱藏上一句","Hide last message")}><Icon name="cards"/></button>
  </section>}
  <section className="cmh-apps" aria-labelledby="cmh-apps-title">
   <div className="cmh-section-heading"><h2 id="cmh-apps-title">{copy("想玩什麼？","What sounds fun?")}</h2></div>
   <div className="cmh-app-grid">{APPS.map(app=><Link to={app.to} key={app.id} className="cmh-app" onClick={()=>track(app.event)}>
    <span className={"cmh-app-icon cmh-app-"+app.id}><Icon name={app.icon}/></span><span className="cmh-app-name">{copy(app.zh,app.en)}</span>
   </Link>)}</div>
  </section>
  <div className="cmh-shorts"><HomeShortsPreview maxPosts={8} sharedFeed={shortsFeed} sharedStatus={shortsStatus}/></div>
  <section className="cmh-featured" aria-label={t("gamePick.label")}>
   <div className="cmh-featured-icon"><Icon name="play"/></div>
   <div className="cmh-featured-copy"><span>{t("gamePick.label")}</span><strong>{t("playHub.games."+featured+".title")}</strong></div>
   <Link to={todayLink} className="cmh-featured-go" onClick={()=>trackUsageEvent("home_entry_click","play")}>{copy("來玩一局","Play now")} <span aria-hidden="true">↗</span></Link>
  </section>
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
