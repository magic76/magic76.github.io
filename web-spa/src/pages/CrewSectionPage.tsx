import {useRef,useState} from "react";
import {Link} from "react-router-dom";
import {trackUsageEvent} from "../analytics/usage";
import {useTranslation} from "react-i18next";
import {Icon,type IconName} from "../components/Icon";
import {CREW_FRIENDS} from "../friends/friendProfiles";
import type {CrewSection} from "./crewNavigation";
import {ExploreArtwork,type ExploreKind} from "./ExploreArtwork";
import {creatureLabHref} from "./creatureLabProgress";
import {CurrentTeacherCard} from "../teacher/CurrentTeacherCard";
import {LearningFocusCard} from "../teacher/LearningFocusCard";
import {LearnHubExtras} from "./LearnHubExtras";
import {FriendIntentCards} from "../friends/FriendIntentCards";
import {HomeShortsPreview} from "../teacher/HomeShortsPreview";
import {threeMinuteSpeakingPath} from "../teacher/threeMinuteSpeaking";
import {useClientReady} from "../lib/useClientReady";
import {useTeacherStore} from "../store/teacherStore";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import {localizedNativeName} from "../teacher/teacherLocale";
import {teacherLanguageHomeHint} from "../teacher/teacherLanguageUx";
import {friendSpokenLanguage} from "../friends/friendLanguage";
import "./crewExplore.css";
import "./crewSections.css";
import {history} from "../lib/runtime";
import {completedLessons} from "../teacher/courseProgress";
import {learningDeck} from "../teacher/learningDeck";

// Only the product category is sent; the actual destination, query and identifiers stay local.
function recordExploreEntry(to:string){
 const root=to.split(/[?#]/,1)[0].split("/")[1];
 const category={
  fortune:"fortune",timeline:"timeline",games:"play",story:"story",research:"briefing",
  circle:"circle",town:"town",magic:"magic",mate:"mate",teacher:"learn"
 } as const;
 const detail=category[root as keyof typeof category];
 if(detail)trackUsageEvent("explore_entry_click",detail);
}
type Entry={title:string;desc:string;to:string;icon:IconName;tag?:string};
const copy:{
 [K in Exclude<CrewSection,"home">]:{
  eyebrow:string;title:string;intro:string;
  hero:Entry;items:Entry[];
 }
}={
 chat:{
  eyebrow:"Koolo FRIENDS",title:"和朋友聊聊",intro:"不是上課，而是從朋友的生活、你的好奇心開始對話。",
  hero:{title:"找一位 Koolo Friend",desc:"認識 16 位不同個性的朋友，選擇你想說的語言。",to:"/teacher/roles?mode=friends",icon:"chat",tag:"自然聊天"},
  items:[
   {title:"朋友動態 Shorts",desc:"先看看今天發生什麼，再決定要不要聊天。",to:"/teacher/shorts",icon:"image"},
   {title:"和朋友玩遊戲",desc:"用互動遊戲找話題，不必先想好要說什麼。",to:"/games",icon:"play"},
   {title:"朋友話題與記憶",desc:"管理朋友記住的話題與隱私設定。",to:"/settings#memory-settings",icon:"history"}
  ]
 },
 explore:{
  eyebrow:"Koolo EXPLORE",title:"探索",intro:"今天想探索什麼？選一件讓你好奇的事，從這裡開始。",
  hero:{title:"命理探索 Fortune",desc:"我的命盤、歷史紀錄、新命盤與 Koolo Friend 講解，全部從這裡開始。",to:"/fortune",icon:"fortune",tag:"命盤與人生"},
  items:[
   {title:"人生時光機 Timeline",desc:"遇見角色在不同年紀的生活與選擇。",to:"/timeline",icon:"history"},
   {title:"互動遊戲",desc:"海龜湯、猜詞、1A2B 與更多遊戲。",to:"/games",icon:"play"},
   {title:"互動故事 Story",desc:"創作、閱讀並探索角色的故事。",to:"/story",icon:"story"},
   {title:"研究情報 Briefing",desc:"AI 技術、研究與新發現。",to:"/research",icon:"book"},
   {title:"交流圈",desc:"分享、交換與社群交流。",to:"/circle",icon:"cards"}
  ]
 },
 learn:{
  eyebrow:"Koolo TEACHER",title:"想練外語，找老師",intro:"有明確的學習目標時，再由老師帶你練習、回顧和進步。",
  hero:{title:"開始口說練習",desc:"選擇你的 Koolo Teacher，直接進入自然語音練習。",to:"/teacher/roles?mode=teacher",icon:"mic",tag:"語音學習"},
  items:[
   {title:"學習中心",desc:"接續進度、單字、課程與發音練習。",to:"/teacher/learn",icon:"teacher"},
   {title:"情境課程",desc:"依照生活場景完成外語對話。",to:"/teacher/course",icon:"scene"},
   {title:"拍教材一起讀",desc:"使用課本、講義和圖片練習。",to:"/teacher/textbook",icon:"book"},
   {title:"發音訓練",desc:"聚焦發音與口語表達。",to:"/teacher/pronunciation",icon:"mic"},
   {title:"練習紀錄",desc:"查看已有的學習報告。",to:"/teacher/reports",icon:"history"}
  ]
 },
 me:{
  eyebrow:"MY Koolo",title:"我的 Koolo",intro:"把你的紀錄、收藏、個人設定放在一起，首頁不用全部展示。",
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
  eyebrow:"Koolo FRIENDS",title:"Chat with friends",intro:"This is not a class. Start with a friend's life or something you're curious about.",
  hero:{title:"Meet your Koolo Friends",desc:"Sixteen personalities. Pick a friend and the language you want to speak.",to:"/teacher/roles?mode=friends",icon:"chat",tag:"Just talk"},
  items:[
   {title:"Friends' Shorts",desc:"See what happened today before you decide whether to chat.",to:"/teacher/shorts",icon:"image"},
   {title:"Play together",desc:"Find conversation starters through interactive games.",to:"/games",icon:"play"},
   {title:"Friend memories",desc:"Control remembered topics and privacy preferences.",to:"/settings#memory-settings",icon:"history"}
  ]
 },
 explore:{
  eyebrow:"Koolo EXPLORE",title:"Explore",intro:"What are you curious about today? Choose something interesting to discover.",
  hero:{title:"Fortune exploration",desc:"Your charts, saved history, new readings and friend explanations in one place.",to:"/fortune",icon:"fortune",tag:"Your charts"},
  items:[
   {title:"Koolo Timeline",desc:"Meet the same character at different ages and life stages.",to:"/timeline",icon:"history"},
   {title:"Interactive games",desc:"Mystery stories, Taboo, numbers and more.",to:"/games",icon:"play"},
   {title:"Koolo Story",desc:"Write, read and explore interactive stories.",to:"/story",icon:"story"},
   {title:"Koolo Briefing",desc:"Explore AI technology and research briefings.",to:"/research",icon:"book"},
   {title:"Community circle",desc:"Browse local exchange and community posts.",to:"/circle",icon:"cards"}
  ]
 },
 learn:{
  eyebrow:"Koolo TEACHER",title:"Practice with a teacher",intro:"When you have a learning goal, your Koolo Teacher can help you practice and improve.",
  hero:{title:"Start speaking practice",desc:"Choose your Koolo Teacher and start a live speaking session.",to:"/teacher/roles?mode=teacher",icon:"mic",tag:"Speaking"},
  items:[
   {title:"Learning center",desc:"Continue lessons, vocabulary and pronunciation.",to:"/teacher/learn",icon:"teacher"},
   {title:"Real-life scenarios",desc:"Speak your way through everyday situations.",to:"/teacher/course",icon:"scene"},
   {title:"Study your textbook",desc:"Learn from pages, notes and photos.",to:"/teacher/textbook",icon:"book"},
   {title:"Pronunciation",desc:"Focus on clearer spoken language.",to:"/teacher/pronunciation",icon:"mic"},
   {title:"Practice reports",desc:"Review your previous learning feedback.",to:"/teacher/reports",icon:"history"}
  ]
 },
 me:{
  eyebrow:"MY Koolo",title:"My Koolo",intro:"Your progress, saved content and preferences in one place.",
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

function DeviceSettingsShortcut(){
 const {t}=useTranslation("settings");
 return <Link className="crew-section-card" to="/settings#settings-device">
  <span className="crew-section-card-icon"><Icon name="settings"/></span>
  <span className="crew-section-card-copy">
   <strong>{t("deviceApp.title")}</strong><small>{t("deviceApp.description")}</small>
  </span>
  <span className="crew-section-arrow" aria-hidden="true">→</span>
 </Link>;
}

const exploreKinds:readonly ExploreKind[]=["fortune","timeline","games","story","research","circle"];
// Hide only the Explore entry during the Circle pilot; keep its route and content intact.
const showCircleInExplore=false;
// Translation keys are separate from the stable navigation targets.
const sectionItemKeys={
 chat:["shorts","games","memory"],
 learn:["center","scenarios","textbook","pronunciation","reports"],
 me:["readings","stories","memory","settings","reports"]
} as const;

export function CrewSectionPage({section}:{section:Exclude<CrewSection,"home">}){
 const friendsSliderRef=useRef<HTMLDivElement|null>(null);
 const [friendsPosition,setFriendsPosition]=useState({start:true,end:false});
 const syncFriends=()=>{
  const el=friendsSliderRef.current;if(!el)return;
  setFriendsPosition({start:el.scrollLeft<=3,end:el.scrollLeft+el.clientWidth>=el.scrollWidth-3});
 };
 const browseFriends=(direction:-1|1)=>{
  const el=friendsSliderRef.current;if(!el)return;
  const card=el.querySelector<HTMLElement>(".crew-section-friend");
  el.scrollBy({left:((card?.getBoundingClientRect().width||250)+13)*direction,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
 };

 const {t,i18n}=useTranslation("home");
 const {t:tTeacher}=useTranslation("teacher");
 const {t:tCommon}=useTranslation("common");
 const {t:tSettings}=useTranslation("settings");
 const clientReady=useClientReady();
 const targetLanguage=useTeacherStore(s=>s.targetLanguage);
 const nativeLanguage=useTeacherStore(s=>s.nativeLanguage);
 const teachingMode=useTeacherStore(s=>s.teachingMode);
 const learnerSpeakingLevel=useTeacherStore(s=>s.learnerSpeakingLevel);
 const setTargetLanguage=useTeacherStore(s=>s.setTargetLanguage);
 // Keep the first hydration render aligned with the SSG default values.
 const shownTarget=clientReady?targetLanguage:"英文",shownNative=clientReady?nativeLanguage:"zh-TW";
 const uiLanguage=i18n.resolvedLanguage||i18n.language;
 const shownTargetName=t("friends:languages."+shownTarget,{defaultValue:friendSpokenLanguage(shownTarget)});
 const shownNativeName=localizedNativeName(shownNative,uiLanguage);
 const shownHint=section==="learn"?teacherLanguageHomeHint(teachingMode,learnerSpeakingLevel,shownNativeName,shownTargetName,uiLanguage==="en",uiLanguage,key=>t("teacher:languageHint."+key,{native:shownNativeName,target:shownTargetName})):"";
 const en=i18n.language!=="zh-TW";
 const source=en?englishCopy[section]:copy[section];
 // The hero is Fortune; the remaining five cards start at Timeline.
 const kinds=["timeline","games","story","research","circle"] as const;
 // Translate every Explore tile with lazy-loaded resources; links and artwork retain stable IDs.
 const x=section==="explore"?{
  ...source,title:t("sectionExplore.title"),intro:t("sectionExplore.intro"),
  hero:{...source.hero,title:t("sectionExplore.fortune.title"),desc:t("sectionExplore.fortune.desc")},
  items:source.items.map((item,i)=>({...item,title:t("sectionExplore."+kinds[i]+".title"),desc:t("sectionExplore."+kinds[i]+".desc")}))
   .filter(item=>showCircleInExplore||item.to!=="/circle")
 }:(()=>{
  const sectionKey=section as keyof typeof sectionItemKeys;
  const prefix="sectionHubs."+sectionKey+".";
  return {
   ...source,title:t(prefix+"title"),intro:t(prefix+"intro"),
   hero:{...source.hero,title:t(prefix+"hero.title"),desc:t(prefix+"hero.desc"),tag:t(prefix+"hero.tag")},
   items:source.items.map((item,i)=>{
    const vocabulary=section==="learn"&&i===0;
    return {...item,
     ...(vocabulary?{to:"/teacher/vocabulary",icon:"cards" as IconName}:{}),
     title:vocabulary?tTeacher("learn.vocab"):t(prefix+"items."+sectionItemKeys[sectionKey][i]+".title"),
     desc:vocabulary?tTeacher("learn.vocabDesc"):t(prefix+"items."+sectionItemKeys[sectionKey][i]+".desc")
    };
   })
  };
 })();

 const learnTools=[
  {to:"/teacher/vocabulary",icon:"cards" as IconName,title:tTeacher("learn.vocab"),desc:tTeacher("learn.vocabDesc")},
  {to:"/teacher/pronunciation",icon:"mic" as IconName,title:tTeacher("learn.pronunciation"),desc:tTeacher("learn.pronunciationDesc")},
  {to:"/teacher/textbook",icon:"book" as IconName,title:tTeacher("learn.textbook"),desc:tTeacher("learn.textbookDesc")},
  {to:"/teacher/board",icon:"teacher" as IconName,title:tTeacher("board.entryTitle"),desc:tTeacher("board.entryDesc")}
 ];
 const meStats=section==="me"&&clientReady?{sessions:history("teacher").length,lessons:completedLessons(),saved:learningDeck().length}:null;
 const speakingPath=clientReady?threeMinuteSpeakingPath():"/friend/live?id=zoe&intent=speak";
 return <div className={"crew-section-hub crew-section-"+section}>
  <header className={"crew-section-heading"+(section==="learn"?" crew-learn-heading":"")}>
   {section==="learn"?
    <>
    <div className="crew-learn-heading-row">
     <div className="crew-learn-heading-copy"><span className="kicker">{x.eyebrow}</span><h1>{tCommon("nav.learn")}</h1></div>
     <label className="crew-learn-language"><span>{tSettings("group.targetLanguage")}</span>
      <select aria-label={tSettings("group.targetLanguage")} value={shownTarget} onChange={event=>setTargetLanguage(event.target.value)}>
       {TARGET_LANGUAGES.map(({value})=><option key={value} value={value}>{t("friends:languages."+value,{defaultValue:value})}</option>)}
      </select>
     </label>
    </div>
     <p className="meta crew-learn-native-help" role="note">{tSettings("group.nativeLanguage")}：{shownNativeName} · {tSettings("group.targetLanguage")}：{shownTargetName}。{shownHint}</p>
    </>
    :section==="chat"?<h1>{x.title}</h1>:<><span className="kicker">{x.eyebrow}</span><h1>{x.title}</h1><p>{x.intro}</p></>}
  </header>
  {false&&section==="me"&&<Link className="crew-section-card crew-me-language-shortcut" to="/settings#settings-learning">
   <span className="crew-section-card-icon"><Icon name="settings"/></span>
   <span className="crew-section-card-copy"><strong>{en?"Language & learning settings":"語言與學習設定"}</strong><small>{en?"Learning language, mother tongue and Chinese Pinyin":"學習語言、母語、中文拼音輔助"}</small></span>
   <span className="crew-section-arrow" aria-hidden="true">→</span>
  </Link>}
  {section==="explore"?
   <section className="crew-explore-grid" aria-label={t("sectionExplore.destinations")}>
    {[x.hero,...x.items].map((item,i)=><Link className="crew-explore-tile" key={item.to} to={item.to} onClick={()=>recordExploreEntry(item.to)} data-kind={exploreKinds[i]}>
     <div className="crew-explore-art"><ExploreArtwork kind={exploreKinds[i]}/></div>
     <span className="crew-explore-text"><strong>{item.title}</strong><small>{item.desc}</small></span>
     <span className="crew-explore-arrow" aria-hidden="true">↗</span>
    </Link>)}
    <a className="crew-explore-tile" data-kind="creature" href={creatureLabHref()} onClick={()=>trackUsageEvent("explore_entry_click","play")}>
     <div className="crew-explore-art" aria-hidden="true"><img className="crew-explore-creature-art" src={creatureLabHref()+"art/creatures/moonfox-egg.webp"} width="180" height="240" alt="" loading="lazy" decoding="async"/></div>
     <span className="crew-explore-text"><strong>{t("creatureLab.discover")}</strong><small>{t("creatureLab.intro")}</small></span>
     <span className="crew-explore-arrow" aria-hidden="true">↗</span>
    </a>
    <Link className="crew-explore-tile crew-explore-mate" data-kind="mate" onClick={()=>trackUsageEvent("explore_entry_click","mate")} to="/mate">
     <div className="crew-explore-art"><ExploreArtwork kind="mate"/></div>
     <span className="crew-explore-text">
      <strong>{en?"Koolo Mate · Speak for me":"Koolo Mate · AI 幫你溝通"}</strong>
      <small>{en?"Brief privately, then let Mate talk to someone in another language.":"私下交代任務，再交給 Mate 用對方的語言溝通。"}</small>
     </span>
     <span className="crew-explore-arrow" aria-hidden="true">↗</span>
    </Link>
    <Link className="crew-explore-tile crew-explore-souls" data-kind="souls" to="/souls" onClick={()=>trackUsageEvent("explore_entry_click","souls")}>
     <div className="crew-explore-art"><ExploreArtwork kind="souls"/></div>
     <span className="crew-explore-text">
      <strong>{en?"Koolo Souls · Bring photos to life":"Koolo Souls · 讓照片活過來"}</strong>
      <small>{en?"Give an object or portrait a personality, then talk to it with AI.":"拍下物品或人物，打造有個性的角色，直接用 AI 語音聊天。"}</small>
     </span>
     <span className="crew-explore-arrow" aria-hidden="true">↗</span>
    </Link>
    <Link className="crew-explore-tile crew-explore-town" data-kind="town" onClick={()=>trackUsageEvent("explore_entry_click","town")} to="/town">
     <div className="crew-explore-art"><ExploreArtwork kind="town"/></div>
     <span className="crew-explore-text">
      <strong>{en?"Koolo Town · A living little world":"Koolo Town · 朋友生活小鎮"}</strong>
      <small>{en?"Explore a 3D town with 16 AI friends.":"走進 3D 小鎮，探索街區並與 16 位 AI 朋友互動。"}</small>
     </span>
     <span className="crew-explore-arrow" aria-hidden="true">↗</span>
    </Link>
    <Link className="crew-explore-tile crew-explore-magic" data-kind="magic" onClick={()=>trackUsageEvent("explore_entry_click","magic")} to="/magic">
     <div className="crew-explore-art"><ExploreArtwork kind="magic"/></div>
     <span className="crew-explore-text">
      <strong>{en?"Koolo Magic · Speak worlds into life":"Koolo Magic · 用聲音創造世界"}</strong>
      <small>{en?"Summon dragons, change the sky and create live adventures with an AI guide.":"召喚飛龍、改變天空，和 AI 嚮導一起創造即時冒險。"}</small>
     </span>
     <span className="crew-explore-arrow" aria-hidden="true">↗</span>
    </Link>
    <Link className="crew-explore-tile crew-explore-discover" data-kind="discover" to="/discover" onClick={()=>trackUsageEvent("explore_entry_click","briefing")}>
      <div className="crew-explore-art" aria-hidden="true" style={{display:"grid",placeItems:"center",fontSize:"clamp(48px,7vw,90px)",background:"linear-gradient(135deg,#e8d6f4,#b9d9de)"}}>✦</div>
      <span className="crew-explore-text"><strong>{en?"Koolo Discover · Explore real life":"Koolo Discover · 探索真實世界"}</strong><small>{en?"Search real news by text or voice.":"搜尋真實新聞、文化與新知，和 AI 用文字或語音一起探索。"}</small></span><span className="crew-explore-arrow" aria-hidden="true">↗</span>
    </Link>
   </section>:
   <>
    {section==="chat"?
     <>
      <section className="crew-section-people" aria-label={t("sectionHubs.chat.meetFriends")}>
       <div className="crew-section-row-title"><h2>{t("sectionHubs.chat.meetFriends")}</h2>
        <div className="crew-section-people-toolbar">
         <Link to="/teacher/roles?mode=friends">{t("sectionHubs.chat.allFriends")} →</Link>
         <div className="crew-section-carousel-actions">
          <button type="button" onClick={()=>browseFriends(-1)} disabled={friendsPosition.start} aria-label={t("sectionHubs.chat.previous",{defaultValue:"Previous friends"})}>←</button>
          <button type="button" onClick={()=>browseFriends(1)} disabled={friendsPosition.end} aria-label={t("sectionHubs.chat.next",{defaultValue:"Next friends"})}>→</button>
         </div>
        </div>
       </div>
       <div className="crew-section-people-strip" ref={friendsSliderRef} onScroll={syncFriends} role="group" aria-label={t("sectionHubs.chat.meetFriends")}>
        {CREW_FRIENDS.slice(0,6).map(friend=>
         <Link key={friend.id} className="crew-section-friend" to={"/friend/live?id="+encodeURIComponent(friend.id)}>
          <span className="crew-section-friend-photo" aria-hidden="true">
           <span>{friend.name.charAt(0)}</span>
           <img className="crew-friend-avatar" src={friend.avatar} alt="" loading="lazy" decoding="async" onError={event=>{event.currentTarget.style.display="none"}}/>
          </span>
          <span className="crew-section-friend-copy">
           <strong>{friend.name}</strong>
           <small>{t("sectionHubs.chat.friendTitles."+friend.id,{defaultValue:en?friend.titleEn:friend.titleZh})}</small>
           <span className="crew-section-friend-bio">{t("sectionHubs.chat.friendBios."+friend.id,{defaultValue:en?friend.bioEn:friend.bioZh})}</span>
           <span className="crew-section-friend-cta">{t("sectionHubs.chat.chatWith",{name:friend.name,defaultValue:"Chat with "+friend.name})} →</span>
          </span>
         </Link>
        )}
       </div>
      </section>
      <FriendIntentCards/>
      <div className="crew-section-chat-life"><HomeShortsPreview maxPosts={3} excludeFriendIds={CREW_FRIENDS.slice(0,6).map(friend=>friend.id)}/></div>
     </>:
     section==="learn"?
      <>
       <CurrentTeacherCard/>
       <LearningFocusCard/>
       <div className="crew-learn-tool-grid-host"><LearnHubExtras tools={learnTools} speakingPath={speakingPath}/></div>
      </>:
      <>{section==="me"&&<section className="section panel" aria-label={en?"My learning snapshot":"我的學習摘要"}><div className="teacher-stats"><div><strong>{meStats?.sessions??"—"}</strong><span>{en?"Practices":"練習次數"}</span></div><div><strong>{meStats?.lessons??"—"}</strong><span>{en?"Lessons":"完成課程"}</span></div><div><strong>{meStats?.saved??"—"}</strong><span>{en?"Saved phrases":"收藏片語"}</span></div></div><Link className="btn secondary small" to="/teacher/me">{en?"View learning records":"查看完整學習紀錄"} →</Link></section>}<Link to={section==="me"?"/teacher/roles?mode=teacher":x.hero.to} className="crew-section-hero">
       <span className="crew-section-hero-icon"><Icon name={x.hero.icon}/></span>
       <span className="crew-section-hero-copy"><span className="crew-section-eyebrow">{x.hero.tag}</span>
        <strong>{section==="me"?(en?"Continue learning":"繼續學習"):x.hero.title}</strong><small>{section==="me"?(en?"Pick up a lesson or start another practice.":"回到課程或開始下一次練習。"):x.hero.desc}</small></span>
       <span className="crew-section-arrow" aria-hidden="true">→</span>
      </Link></>
    }
    {section!=="learn"&&<section className="crew-section-discover">
     <div className="crew-section-row-title"><h2>{t("sectionHubs.more")}</h2></div>
     <div className="crew-section-grid">
      {section==="me"&&<Link className="crew-section-card" to="/account" aria-label={tCommon("auth.accountAi")}>
       <span className="crew-section-card-icon"><Icon name="teacher"/></span>
       <span className="crew-section-card-copy"><strong>{tCommon("auth.account")}</strong><small>{tCommon("auth.intro")}</small></span>
       <span className="crew-section-arrow" aria-hidden="true">→</span>
      </Link>}
      {x.items.filter(item=>(section!=="chat"||item.to!=="/teacher/shorts")&&(section!=="me"||item.to!=="/teacher/reports")).map(item=>
      <Link className="crew-section-card" to={item.to} key={item.to}>
       <span className="crew-section-card-icon"><Icon name={item.icon}/></span>
       <span className="crew-section-card-copy"><strong>{item.title}</strong><small>{item.desc}</small></span>
       <span className="crew-section-arrow" aria-hidden="true">→</span>
      </Link>)}</div>
    </section>}
   </>
  }
  {section==="me"&&<p className="crew-section-footnote">{t("sectionHubs.me.footnote")}</p>}
 </div>;
}
