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
 {id:"number-bomb",icon:"💣"},
 {id:"memory",icon:"🃏"},
 {id:"taboo",icon:"Aa"}
] as const;

type HubFilter="all"|"no-key"|"ai";
const recentGameKey="crew_play_recent_game_v1";
const noKeyGames=new Set<string>(["friend-gomoku","connect4","reversi","1a2b","number-bomb","memory","taboo","arcade-lab","neon-swarm"]);
const extraGames=["neon-swarm","arcade-lab","nonsense","werewolf","crazy-court","truth-news"];
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
  "neon-swarm":zh?["Neon Swarm · 霓虹突圍","30 秒機械蟲群、Boss、閃避連擊與 Zoe 戰術支援。"]:["Neon Swarm · Zero Hour","Polished 2D survival shooter with a boss and Zoe tactical choices."],
  "arcade-lab":zh?["Arcade Lab 四款新遊戲","2D 跑酷、霓虹射擊、RPG 冒險、平台射擊一次玩。"]:["Arcade Lab: Four games","Play a 2D runner, top-down shooter, RPG quest, and platform shooter."],
  nonsense:zh?["荒謬新聞直播","荒謬新聞題材、AI 主播與動態新聞現場。"]:["Absurd News Live","Improvised AI news scenes."],
  werewolf:zh?["AI 狼人殺","夜晚行動、質疑、推理與投票。"]:["AI Werewolf","Debate, bluff and vote."],
  "crazy-court":zh?["荒謬法庭","和 AI 朋友辯論荒謬案件。"]:["Crazy Court","Debate silly cases with an AI friend."],
  "truth-news":zh?["新聞真假猜猜看","從最新新聞中猜出哪則是真的。"]:["Real or Fiction News","Find the one real news headline."]
 } as Record<string,string[]>;
 const titleFor=(id:string)=>id==="number-bomb"?(zh?"終極密碼":"Number Bomb"):id==="memory"?(zh?"翻牌記憶":"Memory Match"):t("playHub.games."+id+".title");
 const descFor=(id:string)=>id==="number-bomb"?(zh?"你來猜數字，AI 朋友當主持人公布提示。":"Guess a secret number while your Crew friend hosts."):
  id==="memory"?(zh?"翻牌找相同圖案，挑戰朋友的記憶力。":"Match pairs and outscore your Crew friend."):t("playHub.games."+id+".desc");
 const titles:Record<string,string>={};
 for(const game of crewGames)titles[game.id]=titleFor(game.id);
 for(const id of extraGames)titles[id]=extraLabels[id][0];
 const shownCount=[...crewGames.map(game=>({
  id:game.id,title:titles[game.id],desc:descFor(game.id)
 })),...extraGames.map(id=>({id,title:extraLabels[id][0],desc:extraLabels[id][1]}))]
  .filter(game=>visible(game.id,game.title,game.desc)).length;
 return <div className="crew-play-page">
  <header className="crew-play-hero">
   <Link to="/" className="crew-play-back">← {t("playHub.back")}</Link>
   <span className="crew-play-eyebrow">{t("playHub.eyebrow")}</span>
   <h1>{t("playHub.heading")}</h1>
   <p>{t("playHub.intro")}</p>
  </header>
  <div className="crew-play-discovery" aria-label={zh?"選擇遊戲":"Find a game"}>
   {recentId?<Link className="crew-play-resume" to={"/games/"+recentId} onClick={()=>remember(recentId)}>
    <span aria-hidden="true">↗</span><span><small>{zh?"再玩上次的遊戲":"Play last game again"}</small><strong>{titles[recentId]}</strong></span>
   </Link>:null}
   <div className="crew-play-filters" role="group" aria-label={zh?"遊戲分類":"Game categories"}>
    {([{id:"all",zh:"全部",en:"All"},{id:"no-key",zh:"免費直接玩",en:"Play free now"},{id:"ai",zh:"AI 互動",en:"AI games"}] as const).map(item=>
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
   <Link className="crew-play-game-card neon-swarm-hub-card" to="/games/neon-swarm" hidden={!visible("neon-swarm",extraLabels["neon-swarm"][0],extraLabels["neon-swarm"][1])} onClick={()=>remember("neon-swarm")}>
    <div className="crew-play-game-art neon-swarm-hub-art" aria-hidden="true"><span>⚡</span></div>
    <div className="crew-play-game-info"><strong>{extraLabels["neon-swarm"][0]}</strong><small>{extraLabels["neon-swarm"][1]}</small><span className="crew-play-game-voice-tag">{zh?"免費可玩 · 可選 Zoe Live 語音":"Free to play · Optional Zoe Live"}</span></div>
    <span className="crew-play-open" aria-hidden="true">↗</span>
   </Link>
   <Link className="crew-play-game-card arcade-lab-hub-card" to="/games/arcade-lab" hidden={!visible("arcade-lab",extraLabels["arcade-lab"][0],extraLabels["arcade-lab"][1])} onClick={()=>remember("arcade-lab")}>
    <div className="crew-play-game-art" aria-hidden="true"><span>🎮</span></div>
    <div className="crew-play-game-info"><strong>{extraLabels["arcade-lab"][0]}</strong><small>{extraLabels["arcade-lab"][1]}</small><span className="crew-play-game-voice-tag">{zh?"四款免費玩 · 可選 Gemini Live 語音":"Four free games · Optional Gemini Live"}</span></div>
    <span className="crew-play-open" aria-hidden="true">↗</span>
   </Link>
   {crewGames.map((game,index)=><Link className="crew-play-game-card" hidden={!visible(game.id,titleFor(game.id),descFor(game.id))} onClick={()=>remember(game.id)} to={"/games/"+game.id} key={game.id}>
    <div className={`crew-play-game-art game-${index}`} aria-hidden="true"><span>{game.icon}</span></div>
    <div className="crew-play-game-info"><strong>{titleFor(game.id)}</strong><small>{descFor(game.id)}</small><span className="crew-play-game-voice-tag">{game.id==="twenty-questions"||game.id==="mystery"?t("playHub.voiceRequired"):game.id==="taboo"?(zh?"打字練習 · 可開 AI 猜詞":"Typing practice · Optional AI guessing"):game.id==="1a2b"?(zh?"免費遊玩 · 每日同題":"Free · Daily challenge"):game.id==="number-bomb"||game.id==="memory"?(zh?"免費玩 · 語音陪玩可選":"Free play · Optional voice"):t("playHub.offlineOptional")}</span></div>
    <span className="crew-play-open" aria-hidden="true">↗</span>
   </Link>)}
   <Link className="crew-play-game-card nonsense-hub-card" to="/games/nonsense" hidden={!visible("nonsense",extraLabels.nonsense[0],extraLabels.nonsense[1])} onClick={()=>remember("nonsense")}>
    <div className="crew-play-game-art nonsense-hub-art" aria-hidden="true"><span>🎙</span></div>
    <div className="crew-play-game-info"><strong>{zh?"荒謬新聞直播":"Absurd News Live"}</strong><small>{zh?"荒謬新聞題材、AI 主播與動態新聞現場。":"150 premises, three improvised rounds, evolving AI news scenes."}</small><span className="crew-play-game-voice-tag">{zh?"AI 互動 · 語音或文字":"AI play · Voice or text"}</span></div>
    <span className="crew-play-open" aria-hidden="true">↗</span>
   </Link>
   <Link className="crew-play-game-card werewolf-hub-card" to="/games/werewolf" hidden={!visible("werewolf",extraLabels.werewolf[0],extraLabels.werewolf[1])} onClick={()=>remember("werewolf")}>
    <div className="crew-play-game-art werewolf-hub-art" aria-hidden="true"><span>☾</span></div>
    <div className="crew-play-game-info"><strong>{zh?"AI 狼人殺":"AI Werewolf"}</strong><small>{zh?"1 真人 + 5 AI。夜晚行動、自由質疑、角色推理與投票。":"One human plus five AI suspects. Investigate, debate, bluff and vote."}</small><span className="crew-play-game-voice-tag">{zh?"免費情境文字 · 可用 AI 語音":"Free text demo · Optional AI voice"}</span></div>
    <span className="crew-play-open" aria-hidden="true">↗</span>
   </Link>
   <Link className="crew-play-game-card" to="/games/truth-news" hidden={!visible("truth-news",extraLabels["truth-news"][0],extraLabels["truth-news"][1])} onClick={()=>remember("truth-news")}>
    <div className="crew-play-game-art" aria-hidden="true"><span>?</span></div><div className="crew-play-game-info"><strong>{extraLabels["truth-news"][0]}</strong><small>{extraLabels["truth-news"][1]}</small><span className="crew-play-game-voice-tag">{zh?"AI 互動 · 附新聞來源":"AI play · News sources"}</span></div><span className="crew-play-open" aria-hidden="true">↗</span>
   </Link>
   <Link className="crew-play-game-card court-hub-card" to="/games/crazy-court" hidden={!visible("crazy-court",extraLabels["crazy-court"][0],extraLabels["crazy-court"][1])} onClick={()=>remember("crazy-court")}>
    <div className="crew-play-game-art court-hub-art" aria-hidden="true"><span>⚖</span></div>
    <div className="crew-play-game-info"><strong>{zh?"荒謬法庭":"Crazy Court"}</strong><small>{zh?"選擇立場、提出證據，和 AI 朋友辯論荒謬案件。":"Take a side, present evidence and debate silly cases with an AI friend."}</small><span className="crew-play-game-voice-tag">{zh?"AI 互動 · 語音選用":"AI play · Optional voice"}</span></div>
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
