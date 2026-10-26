import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import "./crewPlay.css";

export const crewGames=[
 {id:"friend-gomoku",icon:"●"},
 {id:"connect4",icon:"◉"},
 {id:"twenty-questions",icon:"?"},
 {id:"reversi",icon:"◐"},
 {id:"mystery",icon:"✦"},
 {id:"1a2b",icon:"1A2B"},
 {id:"taboo",icon:"Aa"}
] as const;

type HubFilter="all"|"no-key"|"ai";
const recentGameKey="crew_play_recent_game_v1";
const noKeyGames=new Set<string>(["friend-gomoku","connect4","reversi","1a2b","taboo"]);
const extraGames=["nonsense","werewolf","crazy-court"];
const knownGames=new Set<string>([...crewGames.map(game=>game.id),...extraGames]);

export function CrewPlayHubPage(){
 const {t,i18n}=useTranslation("home");
 const zh=i18n.resolvedLanguage?.startsWith("zh");
 const [filter,setFilter]=useState<HubFilter>("all");
 const [search,setSearch]=useState("");
 const [recentId,setRecentId]=useState("");
 useEffect(()=>{
  try{
   const saved=window.localStorage.getItem(recentGameKey);
   if(saved&&knownGames.has(saved))setRecentId(saved);
  }catch{/* Browsing stays available in private mode. */}
 },[]);
 const remember=(id:string)=>{
  setRecentId(id);
  try{window.localStorage.setItem(recentGameKey,id)}catch{/* Optional convenience. */}
 };
 const visible=(id:string,title:string,description:string)=>{
  if(filter==="no-key"&&!noKeyGames.has(id))return false;
  if(filter==="ai"&&noKeyGames.has(id))return false;
  const term=search.trim().toLocaleLowerCase();
  return !term||(title+" "+description+" "+id).toLocaleLowerCase().includes(term);
 };
 const extraLabels={
  nonsense:zh?["荒謬新聞直播","荒謬新聞題材、AI 主播與動態新聞現場。"]:["Absurd News Live","Improvised AI news scenes."],
  werewolf:zh?["AI 狼人殺","夜晚行動、質疑、推理與投票。"]:["AI Werewolf","Debate, bluff and vote."],
  "crazy-court":zh?["荒謬法庭","和 AI 朋友辯論荒謬案件。"]:["Crazy Court","Debate silly cases with an AI friend."]
 } as Record<string,string[]>;
 const titles:Record<string,string>={};
 for(const game of crewGames)titles[game.id]=t("playHub.games."+game.id+".title");
 for(const id of extraGames)titles[id]=extraLabels[id][0];
 const shownCount=[...crewGames.map(game=>({
  id:game.id,title:titles[game.id],desc:t("playHub.games."+game.id+".desc")
 })),...extraGames.map(id=>({id,title:extraLabels[id][0],desc:extraLabels[id][1]}))]
  .filter(game=>visible(game.id,game.title,game.desc)).length;
 return <div className="crew-play-page">
  <header className="crew-play-hero">
   <Link to="/" className="crew-play-back">← {t("playHub.back")}</Link>
   <span className="crew-play-eyebrow">{t("playHub.eyebrow")}</span>
   <h1>{t("playHub.heading")}</h1>
   <p>{t("playHub.intro")}</p>
  </header>
  <p className="crew-play-access-note">{t("playHub.accessNote")}</p>
  <div className="crew-play-discovery" aria-label={zh?"選擇遊戲":"Find a game"}>
   {recentId?<Link className="crew-play-resume" to={"/games/"+recentId} onClick={()=>remember(recentId)}>
    <span aria-hidden="true">↗</span><span><small>{zh?"繼續上次遊戲":"Continue playing"}</small><strong>{titles[recentId]}</strong></span>
   </Link>:null}
   <div className="crew-play-filters" role="group" aria-label={zh?"遊戲分類":"Game categories"}>
    {([{id:"all",zh:"全部",en:"All"},{id:"no-key",zh:"免 Key 就能玩",en:"Play for free"},{id:"ai",zh:"AI 互動",en:"AI games"}] as const).map(item=>
     <button key={item.id} type="button" className={"crew-play-filter"+(filter===item.id?" is-active":"")}
      aria-pressed={filter===item.id} onClick={()=>setFilter(item.id)}>{zh?item.zh:item.en}</button>)}
   </div>
   <div className="crew-play-search-row">
    <label className="crew-play-search">
     <span className="sr-only">{zh?"搜尋遊戲":"Search games"}</span>
     <span aria-hidden="true">⌕</span>
     <input type="search" value={search} onChange={event=>setSearch(event.target.value)}
      placeholder={zh?"搜尋遊戲名稱或玩法":"Search games or activities"} />
    </label>
    <span className="crew-play-result-count" role="status" aria-live="polite">{zh?`找到 ${shownCount} 款遊戲`:`${shownCount} games`}</span>
   </div>
  </div>
  <div className="crew-play-catalog">
   {crewGames.map((game,index)=><Link className="crew-play-game-card" hidden={!visible(game.id,t("playHub.games."+game.id+".title"),t("playHub.games."+game.id+".desc"))} onClick={()=>remember(game.id)} to={"/games/"+game.id} key={game.id}>
    <div className={`crew-play-game-art game-${index}`} aria-hidden="true"><span>{game.icon}</span></div>
    <div className="crew-play-game-info"><strong>{t("playHub.games."+game.id+".title")}</strong><small>{t("playHub.games."+game.id+".desc")}</small><span className="crew-play-game-voice-tag">{game.id==="twenty-questions"||game.id==="mystery"?t("playHub.voiceRequired"):game.id==="taboo"?(zh?"免 Key 練習 · Key 啟用 AI 猜詞":"Offline practice · AI guess with Key"):game.id==="1a2b"?(zh?"免費遊玩 · 每日同題":"Free · Daily challenge"):t("playHub.offlineOptional")}</span></div>
    <span className="crew-play-open" aria-hidden="true">↗</span>
   </Link>)}
   <Link className="crew-play-game-card nonsense-hub-card" to="/games/nonsense" hidden={!visible("nonsense",extraLabels.nonsense[0],extraLabels.nonsense[1])} onClick={()=>remember("nonsense")}>
    <div className="crew-play-game-art nonsense-hub-art" aria-hidden="true"><span>🎙</span></div>
    <div className="crew-play-game-info"><strong>{zh?"荒謬新聞直播":"Absurd News Live"}</strong><small>{zh?"荒謬新聞題材、AI 主播與動態新聞現場。":"150 premises, three improvised rounds, evolving AI news scenes."}</small><span className="crew-play-game-voice-tag">{zh?"Gemini Key · Live 語音或文字互動":"Gemini Key · voice or text play"}</span></div>
    <span className="crew-play-open" aria-hidden="true">↗</span>
   </Link>
   <Link className="crew-play-game-card werewolf-hub-card" to="/games/werewolf" hidden={!visible("werewolf",extraLabels.werewolf[0],extraLabels.werewolf[1])} onClick={()=>remember("werewolf")}>
    <div className="crew-play-game-art werewolf-hub-art" aria-hidden="true"><span>☾</span></div>
    <div className="crew-play-game-info"><strong>{zh?"AI 狼人殺":"AI Werewolf"}</strong><small>{zh?"1 真人 + 5 AI。夜晚行動、自由質疑、角色推理與投票。":"One human plus five AI suspects. Investigate, debate, bluff and vote."}</small><span className="crew-play-game-voice-tag">{zh?"免 Key 情境台詞 · Key 啟用真正 AI / Live":"Free text demo · Optional Gemini Live voice"}</span></div>
    <span className="crew-play-open" aria-hidden="true">↗</span>
   </Link>
   <Link className="crew-play-game-card court-hub-card" to="/games/crazy-court" hidden={!visible("crazy-court",extraLabels["crazy-court"][0],extraLabels["crazy-court"][1])} onClick={()=>remember("crazy-court")}>
    <div className="crew-play-game-art court-hub-art" aria-hidden="true"><span>⚖</span></div>
    <div className="crew-play-game-info"><strong>{zh?"荒謬法庭":"Crazy Court"}</strong><small>{zh?"選擇立場、提出證據，和 AI 朋友辯論荒謬案件。":"Take a side, present evidence and debate silly cases with an AI friend."}</small><span className="crew-play-game-voice-tag">{zh?"需 Gemini Key · 語音選用":"Gemini Key required · Voice optional"}</span></div>
    <span className="crew-play-open" aria-hidden="true">↗</span>
   </Link>
  </div>
  {shownCount===0?<div className="crew-play-empty" role="status">
   <strong>{zh?"沒有找到符合的遊戲":"No games found"}</strong>
   <p>{zh?"換個關鍵字，或查看全部遊戲。":"Try another keyword or show all games."}</p>
   <button type="button" onClick={()=>{setFilter("all");setSearch("")}}>{zh?"顯示全部遊戲":"Show all games"}</button>
  </div>:null}
 </div>;
}
