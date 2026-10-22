import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Icon,type IconName} from "../components/Icon";
import {FriendAvatar} from "../friends/FriendAvatar";
import {CREW_FRIENDS} from "../friends/friendProfiles";
import type {CrewSection} from "./crewNavigation";
import {ExploreArtwork,type ExploreKind} from "./ExploreArtwork";
import {TodayLearningCard} from "../teacher/TodayLearningCard";
import {ContinueLearningCard} from "../teacher/ContinueLearningCard";
import {threeMinuteSpeakingPath} from "../teacher/threeMinuteSpeaking";
import {useClientReady} from "../lib/useClientReady";
import "./crewExplore.css";
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
  eyebrow:"CREW EXPLORE",title:"探索",intro:"今天想探索什麼？選一件讓你好奇的事，從這裡開始。",
  hero:{title:"命理探索 Fortune",desc:"我的命盤、歷史紀錄、新命盤與 Crew Friend 講解，全部從這裡開始。",to:"/fortune",icon:"fortune",tag:"命盤與人生"},
  items:[
   {title:"人生時光機 Timeline",desc:"遇見角色在不同年紀的生活與選擇。",to:"/timeline",icon:"history"},
   {title:"互動遊戲",desc:"海龜湯、猜詞、1A2B 與更多遊戲。",to:"/games",icon:"play"},
   {title:"互動故事 Story",desc:"創作、閱讀並探索角色的故事。",to:"/story",icon:"story"},
   {title:"研究情報 Briefing",desc:"AI 技術、研究與新發現。",to:"/research",icon:"book"},
   {title:"交流圈",desc:"分享、交換與社群交流。",to:"/circle",icon:"cards"}
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


const englishCopy:typeof copy={
 chat:{
  eyebrow:"CREW FRIENDS",title:"Chat with friends",intro:"This is not a class. Start with a friend's life or something you're curious about.",
  hero:{title:"Meet your Crew Friends",desc:"Sixteen personalities. Pick a friend and the language you want to speak.",to:"/teacher/roles?mode=friends",icon:"chat",tag:"Just talk"},
  items:[
   {title:"Friends' Shorts",desc:"See what happened today before you decide whether to chat.",to:"/teacher/shorts",icon:"image"},
   {title:"Play together",desc:"Find conversation starters through interactive games.",to:"/games",icon:"play"},
   {title:"Friend memories",desc:"Control remembered topics and privacy preferences.",to:"/settings#memory-settings",icon:"history"}
  ]
 },
 explore:{
  eyebrow:"CREW EXPLORE",title:"Explore",intro:"What are you curious about today? Choose something interesting to discover.",
  hero:{title:"Fortune exploration",desc:"Your charts, saved history, new readings and friend explanations in one place.",to:"/fortune",icon:"fortune",tag:"Your charts"},
  items:[
   {title:"Crew Timeline",desc:"Meet the same character at different ages and life stages.",to:"/timeline",icon:"history"},
   {title:"Interactive games",desc:"Mystery stories, Taboo, numbers and more.",to:"/games",icon:"play"},
   {title:"Crew Story",desc:"Write, read and explore interactive stories.",to:"/story",icon:"story"},
   {title:"Crew Briefing",desc:"Explore AI technology and research briefings.",to:"/research",icon:"book"},
   {title:"Community circle",desc:"Browse local exchange and community posts.",to:"/circle",icon:"cards"}
  ]
 },
 learn:{
  eyebrow:"CREW TEACHER",title:"Practice with a teacher",intro:"When you have a learning goal, your Crew Teacher can help you practice and improve.",
  hero:{title:"Start speaking practice",desc:"Choose your Crew Teacher and start a live speaking session.",to:"/teacher/roles?mode=teacher",icon:"mic",tag:"Speaking"},
  items:[
   {title:"Learning center",desc:"Continue lessons, vocabulary and pronunciation.",to:"/teacher/learn",icon:"teacher"},
   {title:"Real-life scenarios",desc:"Speak your way through everyday situations.",to:"/teacher/course",icon:"scene"},
   {title:"Study your textbook",desc:"Learn from pages, notes and photos.",to:"/teacher/textbook",icon:"book"},
   {title:"Pronunciation",desc:"Focus on clearer spoken language.",to:"/teacher/pronunciation",icon:"mic"},
   {title:"Practice reports",desc:"Review your previous learning feedback.",to:"/teacher/reports",icon:"history"}
  ]
 },
 me:{
  eyebrow:"MY CREW",title:"My Crew",intro:"Your progress, saved content and preferences in one place.",
  hero:{title:"My learning progress",desc:"Return to completed practice and learning records.",to:"/teacher/me",icon:"history",tag:"Device records"},
  items:[
   {title:"My readings",desc:"Reopen saved fortune charts.",to:"/fortune/history",icon:"fortune"},
   {title:"My stories",desc:"Return to your story bookshelf and creations.",to:"/story/me",icon:"story"},
   {title:"Learning memories",desc:"Review the study details your tutor remembers.",to:"/teacher/memory",icon:"cards"},
   {title:"Settings and API key",desc:"Language, model, voice and privacy options.",to:"/settings",icon:"settings"},
   {title:"Learning reports",desc:"Review past speaking feedback.",to:"/teacher/reports",icon:"book"}
  ]
 }
};

const exploreKinds:readonly ExploreKind[]=["fortune","timeline","games","story","research","circle"];

export function CrewSectionPage({section}:{section:Exclude<CrewSection,"home">}){
 const {t,i18n}=useTranslation("home");
 const clientReady=useClientReady();
 const en=i18n.language!=="zh-TW";
 const source=en?englishCopy[section]:copy[section];
 // The hero is Fortune; the remaining five cards start at Timeline.
 const kinds=["timeline","games","story","research","circle"] as const;
 // Translate every Explore tile with lazy-loaded resources; links and artwork retain stable IDs.
 const x=section==="explore"?{
  ...source,title:t("sectionExplore.title"),intro:t("sectionExplore.intro"),
  hero:{...source.hero,title:t("sectionExplore.fortune.title"),desc:t("sectionExplore.fortune.desc")},
  items:source.items.map((item,i)=>({...item,title:t("sectionExplore."+kinds[i]+".title"),desc:t("sectionExplore."+kinds[i]+".desc")}))
 }:source;
 return <div className={"crew-section-hub crew-section-"+section}>
  <header className="crew-section-heading">
   <span className="kicker">{x.eyebrow}</span>
   <h1>{x.title}</h1>
   <p>{x.intro}</p>
  </header>
  {section==="explore"?
   <section className="crew-explore-grid" aria-label={t("sectionExplore.destinations")}>
    {[x.hero,...x.items].map((item,i)=><Link className="crew-explore-tile" key={item.to} to={item.to} data-kind={exploreKinds[i]}>
     <div className="crew-explore-art"><ExploreArtwork kind={exploreKinds[i]}/></div>
     <span className="crew-explore-text"><strong>{item.title}</strong><small>{item.desc}</small></span>
     <span className="crew-explore-arrow" aria-hidden="true">↗</span>
    </Link>)}
   </section>:
   <>
  <Link to={x.hero.to} className="crew-section-hero">
   <span className="crew-section-hero-icon"><Icon name={x.hero.icon}/></span>
   <span className="crew-section-hero-copy">
    <span className="crew-section-eyebrow">{x.hero.tag}</span>
    <strong>{x.hero.title}</strong><small>{x.hero.desc}</small>
   </span><span className="crew-section-arrow" aria-hidden="true">→</span>
  </Link>
  {section==="learn"&&<section className="crew-section-learning" aria-label={en?"Learning overview":"學習概覽"}>
   <div className="crew-section-row-title"><h2>{en?"Your learning today":"今天的學習"}</h2>
    <Link to="/teacher/me">{en?"Learning records":"查看學習紀錄"} →</Link></div>
   <TodayLearningCard/>
   <ContinueLearningCard compact/>
   <Link className="crew-section-three-minute" to={clientReady?threeMinuteSpeakingPath():"/friend/live?id=zoe&intent=speak"}>
    <span><strong>{en?"Speak a language for 3 minutes":"隨便聊 3 分鐘外語"}</strong>
     <small>{en?"Practice naturally with a Crew Friend, without a test.":"跟 Crew 朋友自然聊天，不用考試。"}</small></span>
    <span className="arrow" aria-hidden="true">→</span>
   </Link>
  </section>}
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
   </>
  }
  {section==="me"&&<p className="crew-section-footnote">{en?"Some readings and learning records are stored in this browser, not synced across devices.":"部分進度與命盤記錄儲存在目前裝置的瀏覽器，不代表跨裝置同步。"}</p>}
 </div>
}
