import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Icon,type IconName} from "../components/Icon";
import {FriendAvatar} from "../friends/FriendAvatar";
import {CREW_FRIENDS} from "../friends/friendProfiles";
import type {CrewSection} from "./crewNavigation";
import "./crewSections.css";

type Entry={title:string;desc:string;to:string;icon:IconName;tag?:string};
const copy:{
 [K in Exclude<CrewSection,"home">]:{
  eyebrow:string;title:string;intro:string;
  hero:Entry;items:Entry[];
 }
}={
 chat:{
  eyebrow:"CREW FRIENDS",title:"和朋友聊聊",intro:"不是上課，而是從朋友的生活、你的好奇心開始對話。",
  hero:{title:"找一位 Crew Friend",desc:"認識 16 位不同個性的朋友，選擇你想說的語言。",to:"/teacher/roles?mode=friends",icon:"chat",tag:"自然聊天"},
  items:[
   {title:"朋友動態 Shorts",desc:"先看看今天發生什麼，再決定要不要聊天。",to:"/teacher/shorts",icon:"image"},
   {title:"和朋友玩遊戲",desc:"用互動遊戲找話題，不必先想好要說什麼。",to:"/games",icon:"play"},
   {title:"朋友話題與記憶",desc:"管理朋友記住的話題與隱私設定。",to:"/settings#memory-settings",icon:"history"}
  ]
 },
 explore:{
  eyebrow:"CREW EXPLORE",title:"找件有趣的事聊",intro:"從命理、不同人生、故事到遊戲，探索本身就是目的。",
  hero:{title:"命理探索 Fortune",desc:"先算命盤、閱讀解析，再決定要深入聊什麼。",to:"/fortune",icon:"fortune",tag:"命盤與人生"},
  items:[
   {title:"命理聊聊",desc:"使用已有命盤或建立新命盤，延伸成外語對話。",to:"/teacher/fortune",icon:"chat"},
   {title:"人生時光機 Timeline",desc:"遇見角色在不同年紀的生活與選擇。",to:"/timeline",icon:"history"},
   {title:"互動遊戲",desc:"海龜湯、猜詞、1A2B 與更多遊戲。",to:"/games",icon:"play"},
   {title:"互動故事 Story",desc:"創作、閱讀並探索角色的故事。",to:"/story",icon:"story"},
   {title:"Crew Briefing",desc:"讀 AI 技術與研究情報。",to:"/research",icon:"book"},
   {title:"交流圈",desc:"瀏覽社群交流與二手物品資訊。",to:"/circle",icon:"cards"}
  ]
 },
 learn:{
  eyebrow:"CREW TEACHER",title:"想練外語，找老師",intro:"有明確的學習目標時，再由老師帶你練習、回顧和進步。",
  hero:{title:"開始口說練習",desc:"選擇你的 Crew Teacher，直接進入自然語音練習。",to:"/teacher/roles?mode=teacher",icon:"mic",tag:"語音學習"},
  items:[
   {title:"學習中心",desc:"接續進度、單字、課程與發音練習。",to:"/teacher/learn",icon:"teacher"},
   {title:"情境課程",desc:"依照生活場景完成外語對話。",to:"/teacher/course",icon:"scene"},
   {title:"拍教材一起讀",desc:"使用課本、講義和圖片練習。",to:"/teacher/textbook",icon:"book"},
   {title:"發音訓練",desc:"聚焦發音與口語表達。",to:"/teacher/pronunciation",icon:"mic"},
   {title:"練習紀錄",desc:"查看已有的學習報告。",to:"/teacher/reports",icon:"history"}
  ]
 },
 me:{
  eyebrow:"MY CREW",title:"我的 Crew",intro:"把你的紀錄、收藏、個人設定放在一起，首頁不用全部展示。",
  hero:{title:"我的學習與紀錄",desc:"查看已完成的練習、進度與學習資訊。",to:"/teacher/me",icon:"history",tag:"裝置內紀錄"},
  items:[
   {title:"我的命盤",desc:"重新查看先前算過的命盤。",to:"/fortune/history",icon:"fortune"},
   {title:"我的故事",desc:"返回故事書架與個人作品。",to:"/story/me",icon:"story"},
   {title:"個人記憶",desc:"檢視及管理老師記住的學習內容。",to:"/teacher/memory",icon:"cards"},
   {title:"設定與 API Key",desc:"語言、模型、聲音及隱私選項。",to:"/settings",icon:"settings"},
   {title:"學習回顧",desc:"查看老師提供的歷史練習報告。",to:"/teacher/reports",icon:"book"}
  ]
 }
};

export function CrewSectionPage({section}:{section:Exclude<CrewSection,"home">}){
 const {i18n}=useTranslation();
 const en=i18n.language.startsWith("en");
 const labels:Record<Exclude<CrewSection,"home">,{title:string;intro:string}>={
  chat:{title:"Chat with friends",intro:"Real conversations begin with people and things you are curious about."},
  explore:{title:"Explore something interesting",intro:"Discover fortune traditions, lives, stories, games and ideas."},
  learn:{title:"Practice with a teacher",intro:"Get structured help whenever you want to improve your speaking."},
  me:{title:"My Crew",intro:"Your progress, saved content and settings in one place."}
 };
 const x=copy[section];
 return <div className={"crew-section-hub crew-section-"+section}>
  <header className="crew-section-heading">
   <span className="kicker">{x.eyebrow}</span>
   <h1>{en?labels[section].title:x.title}</h1>
   <p>{en?labels[section].intro:x.intro}</p>
  </header>
  <Link to={x.hero.to} className="crew-section-hero">
   <span className="crew-section-hero-icon"><Icon name={x.hero.icon}/></span>
   <span className="crew-section-hero-copy">
    <span className="crew-section-eyebrow">{x.hero.tag}</span>
    <strong>{x.hero.title}</strong><small>{x.hero.desc}</small>
   </span><span className="crew-section-arrow" aria-hidden="true">→</span>
  </Link>
  {section==="chat"&&<section className="crew-section-people" aria-label="Crew Friends">
   <div className="crew-section-row-title"><h2>{en?"Meet the friends":"認識 Crew Friends"}</h2>
    <Link to="/teacher/roles?mode=friends">{en?"All friends":"查看全部"} →</Link></div>
   <div className="crew-section-people-grid">{CREW_FRIENDS.slice(0,6).map(friend=>
    <Link key={friend.id} className="crew-section-friend" to={"/friend/live?id="+encodeURIComponent(friend.id)}>
     <FriendAvatar friend={friend}/><strong>{friend.name}</strong>
     <small>{en?friend.titleEn:friend.titleZh}</small>
    </Link>
   )}</div>
  </section>}
  <section className="crew-section-discover">
   <div className="crew-section-row-title"><h2>{en?"More to explore":"更多入口"}</h2></div>
   <div className="crew-section-grid">{x.items.map(item=>
    <Link className="crew-section-card" to={item.to} key={item.to}>
     <span className="crew-section-card-icon"><Icon name={item.icon}/></span>
     <span className="crew-section-card-copy"><strong>{item.title}</strong><small>{item.desc}</small></span>
     <span className="crew-section-arrow" aria-hidden="true">→</span>
    </Link>)}</div>
  </section>
  {section==="me"&&<p className="crew-section-footnote">部分進度與命盤記錄儲存在目前裝置的瀏覽器，不代表跨裝置同步。</p>}
 </div>
}
