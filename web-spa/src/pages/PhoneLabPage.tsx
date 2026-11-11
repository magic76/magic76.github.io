import {useEffect,useMemo,useState} from "react";
import {Link,useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Icon,type IconName} from "../components/Icon";
import zoePhoto from "../../../assets/friends/crew_friend_zoe.webp";
import "./PhoneLabPage.css";

type AppId="friends"|"teacher"|"games"|"story"|"fortune"|"shorts"|"timeline"|"souls"|"town"|"magic"|"discover"|"research"|"mate";
type View="home"|"all";
type Tab=View|"chat"|"me";
type AppEntry={id:AppId;icon:IconName;zh:string;en:string;descriptionZh:string;descriptionEn:string;to:string;shortcuts?:{zh:string;en:string;to:string}[]};
const APPS:AppEntry[]=[
 {id:"friends",icon:"chat",zh:"AI 朋友",en:"AI Friends",descriptionZh:"認識 16 位朋友，隨時找人聊天。",descriptionEn:"Meet 16 AI friends and start a conversation.",to:"/teacher/roles?mode=friends",shortcuts:[{zh:"找 Zoe 聊天",en:"Chat with Zoe",to:"/friend/live?id=zoe&from=phone&chat=text"},{zh:"認識其他朋友",en:"Meet other friends",to:"/teacher/roles?mode=friends"}]},
 {id:"teacher",icon:"teacher",zh:"學語言",en:"Learn",descriptionZh:"找老師練口說，也能學單字、上課。",descriptionEn:"Practice speaking, vocabulary and lessons.",to:"/learn",shortcuts:[{zh:"選一位老師",en:"Choose a teacher",to:"/teacher/roles?mode=teacher"},{zh:"學習中心",en:"Learning center",to:"/learn"},{zh:"情境課程",en:"Lessons",to:"/teacher/course"}]},
 {id:"games",icon:"play",zh:"玩遊戲",en:"Games",descriptionZh:"和 AI 玩小遊戲，邊玩邊聊天。",descriptionEn:"Play with AI and have fun together.",to:"/games",shortcuts:[{zh:"遊戲大廳",en:"Game hub",to:"/games"},{zh:"1A2B 猜數字",en:"Number guessing",to:"/games/1a2b"}]},
 {id:"story",icon:"story",zh:"故事",en:"Stories",descriptionZh:"讀故事，或創作自己的故事世界。",descriptionEn:"Read and create your own stories.",to:"/story",shortcuts:[{zh:"故事書架",en:"Story shelf",to:"/story"},{zh:"創作故事",en:"Create a story",to:"/story/create"}]},
 {id:"fortune",icon:"fortune",zh:"命理探索",en:"Fortune",descriptionZh:"從八字、塔羅與星盤探索自己。",descriptionEn:"Explore your story through fortune readings.",to:"/fortune"},
 {id:"shorts",icon:"image",zh:"朋友動態",en:"Moments",descriptionZh:"看看 AI 朋友們今天的生活片段。",descriptionEn:"See what your AI friends are up to.",to:"/teacher/shorts"},
 {id:"timeline",icon:"history",zh:"人生時間線",en:"Timeline",descriptionZh:"穿梭不同人生階段，發現新視角。",descriptionEn:"Explore different stages of life.",to:"/timeline"},
 {id:"souls",icon:"sparkles",zh:"物品會說話",en:"Souls",descriptionZh:"讓你身邊的物品活起來。",descriptionEn:"Bring everyday things to life.",to:"/souls"},
 {id:"town",icon:"home",zh:"Crew 小鎮",en:"Crew Town",descriptionZh:"到朋友們的小鎮走走。",descriptionEn:"Visit your friends' little town.",to:"/town"},
 {id:"magic",icon:"sparkles",zh:"魔法探索",en:"Magic",descriptionZh:"用聲音創造想像中的世界。",descriptionEn:"Create imagined worlds with your voice.",to:"/magic"},
 {id:"discover",icon:"cards",zh:"探索世界",en:"Discover",descriptionZh:"從真實生活發現有趣的新知。",descriptionEn:"Discover something new in the real world.",to:"/discover"},
 {id:"research",icon:"book",zh:"研究精選",en:"Research",descriptionZh:"看看 AI 與科技的最新研究。",descriptionEn:"Read selected AI and technology research.",to:"/research"},
 {id:"mate",icon:"mic",zh:"AI 溝通",en:"Crew Mate",descriptionZh:"讓 AI 幫你跨語言溝通。",descriptionEn:"Get AI help talking across languages.",to:"/mate"}
];
const tabs:{id:Tab;icon:IconName;zh:string;en:string}[]=[
 {id:"home",icon:"home",zh:"首頁",en:"Home"},{id:"chat",icon:"chat",zh:"聊天",en:"Chat"},
 {id:"all",icon:"cards",zh:"探索",en:"Explore"},{id:"me",icon:"teacher",zh:"我的",en:"Mine"}
];
const VIEWS=new Set<string>(["home","all"]);
const ZOE_TEXT="/friend/live?id=zoe&from=phone&chat=text";

export function PhoneLabPage(){
 const {i18n}=useTranslation();
 const zh=i18n.language.startsWith("zh");
 const [params,setParams]=useSearchParams();
 const raw=params.get("view")||"home";
 const view:View=VIEWS.has(raw)?raw as View:"home";
 const [search,setSearch]=useState("");
 const label=(zhText:string,enText:string)=>zh?zhText:enText;
 const navigate=(next:View)=>{setSearch("");setParams(next==="home"?{}:{view:next});};
 useEffect(()=>{
  const meta=document.createElement("meta");meta.name="robots";meta.content="noindex,nofollow";meta.dataset.crewPhoneLab="true";document.head.appendChild(meta);
  const title=document.title;document.title="Crew Phone Lab · Crew Web";
  return()=>{meta.remove();document.title=title};
 },[]);
 const filtered=useMemo(()=>APPS.filter(a=>(a.zh+" "+a.en+" "+a.descriptionZh+" "+a.descriptionEn).toLocaleLowerCase().includes(search.toLocaleLowerCase())),[search]);
 const appTile=(item:AppEntry)=><Link key={item.id} to={item.to} className="cpl-app-tile" aria-label={label("開啟","Open")+" "+label(item.zh,item.en)}>
  <span className={"cpl-app-icon cpl-"+item.id}><Icon name={item.icon}/></span>
  <span>{label(item.zh,item.en)}</span>
 </Link>;
 const header=(name:string)=><header className="cpl-detail-head"><button className="cpl-back" type="button" onClick={()=>navigate("home")} aria-label={label("回桌面","Back home")}>‹</button><div><small>CREW / PHONE LAB</small><h1>{name}</h1></div></header>;
 const home=<>
  <header className="cpl-home-head"><div><div className="cpl-wordmark">crew<span>.</span></div><p>{label("嗨，今天想做點什麼？","Hey, what are you up to today?")}</p></div></header>
  <p className="cpl-eyebrow">YOUR LITTLE AI WORLD ✦</p>
  <section className="cpl-hero" aria-label={label("開始和 Zoe 聊天","Chat with Zoe")}>
   <span className="cpl-hero-chip"><i/>{label("Zoe 正在等你","Zoe is here")}</span>
   <h1>{label("一起聊聊吧！","Let's chat!")}</h1>
   <p>{label("不用先認識所有功能，從一句話開始就好。","No need to learn every feature. Start with hello.")}</p>
   <Link className="cpl-hero-cta" to={ZOE_TEXT}>{label("打字和 Zoe 開聊","Text Zoe")} <span aria-hidden="true">↗</span></Link>
   <img className="cpl-zoe" src={zoePhoto} alt="Zoe" width="94" height="112"/>
  </section>
  <div className="cpl-section-title"><h2>{label("想玩什麼？","What sounds fun?")}</h2></div>
  <div className="cpl-app-grid">{APPS.slice(0,6).map(appTile)}</div>

 </>;
 const all=<>{header(label("所有 App","All Apps"))}<p className="cpl-detail-intro">{label("每個功能，都有自己的位置。","Every feature has its place.")}</p>
  <label className="cpl-search-label" htmlFor="cpl-search">{label("搜尋功能","Search apps")}</label><input id="cpl-search" type="search" className="cpl-search" placeholder={label("搜尋：聊天、遊戲、故事…","Search chat, games, stories…")} value={search} onChange={e=>setSearch(e.target.value)}/>
  <div className="cpl-section-title"><h2>{label("所有功能","All apps")}</h2><small>{filtered.length} Apps</small></div>
  <div className="cpl-app-grid cpl-all-grid">{filtered.map(appTile)}</div>
  {filtered.length===0&&<p className="cpl-help">{label("找不到符合的功能。","No matching apps.")}</p>}
 </>;
 const body=view==="home"?home:all;
 return <main return <main className="crew-phone-lab">
  <aside className="cpl-aside cpl-intro" aria-label="Prototype details"><span className="cpl-side-kicker">CREW · EXPERIENCE LAB</span><h2>{label("把所有功能，<br/>放進一個熟悉的世界。","All your experiences,<br/>in a familiar place.").split("<br/>").map((s,i)=><span key={i}>{s}{i===0&&<br/>}</span>)}</h2><p>{label("這是獨立的手機桌面實驗。先讓使用者找到 Zoe，再自然探索老師、遊戲、故事與其他功能。","An independent phone-style experiment. Start with Zoe, then explore lessons, games and stories.")}</p><Link to="/" className="cpl-original-link">← {label("返回原本首頁","Back to original home")}</Link></aside>
  <div className="cpl-device">
   <div className="cpl-screen"><div className="cpl-scroll" key={view}>{body}</div><nav className="cpl-dock" aria-label={label("手機桌面導覽","Phone navigation")}>{tabs.map(t=>
    t.id==="chat"||t.id==="me"?
     <Link key={t.id} to={t.id==="chat"?ZOE_TEXT:"/me"}><Icon name={t.icon}/><span>{label(t.zh,t.en)}</span></Link>:
     <button key={t.id} type="button" className={view===t.id?"active":""} aria-current={view===t.id?"page":undefined} onClick={()=>navigate(t.id as View)}><Icon name={t.icon}/><span>{label(t.zh,t.en)}</span></button>
   )}</nav></div>
  </div>
  <aside className="cpl-aside cpl-notes"><h2>Phone Lab · v2</h2><p>{label("這版是給我們對齊版型的實驗路由，不取代正式首頁。所有 App 最後仍進入 Crew 原本的功能。","A separate route for design review. All app shortcuts lead to existing Crew features.")}</p><ol><li>{label("從 Zoe 開始，最短路徑聊天","Start with Zoe")}</li><li>{label("六個主要 App 一點就開","One-tap access from each app")}</li><li>{label("其他功能收在「探索」","Everything else under Explore")}</li></ol></aside>
 </main>;
}
