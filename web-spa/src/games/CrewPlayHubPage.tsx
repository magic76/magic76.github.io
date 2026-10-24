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

export function CrewPlayHubPage(){
 const {t,i18n}=useTranslation("home");
 const zh=i18n.resolvedLanguage?.startsWith("zh");
 return <main className="crew-play-page">
  <header className="crew-play-hero">
   <Link to="/" className="crew-play-back">← {t("playHub.back")}</Link>
   <span className="crew-play-eyebrow">CREW PLAY</span>
   <h1>{t("playHub.heading")}</h1>
   <p>{t("playHub.intro")}</p>
  </header>
  <p className="crew-play-access-note">{zh?"免 Key 可玩棋類、1A2B 與部分文字練習；自由 AI 對話及語音遊戲需要 Gemini Key。":"Board games, 1A2B and some practice are free. AI conversations and voice games need a Gemini Key."}</p>
   <div className="crew-play-catalog">
   {crewGames.map((game,index)=><Link className="crew-play-game-card" to={"/games/"+game.id} key={game.id}>
    <div className={`crew-play-game-art game-${index}`} aria-hidden="true"><span>{game.icon}</span></div>
    <div className="crew-play-game-info"><strong>{t("playHub.games."+game.id+".title")}</strong><small>{t("playHub.games."+game.id+".desc")}</small><span className="crew-play-game-voice-tag">{game.id==="twenty-questions"||game.id==="mystery"?t("playHub.voiceRequired"):game.id==="taboo"?(zh?"免 Key 練習 · Key 啟用 AI 猜詞":"Offline practice · AI guess with Key"):game.id==="1a2b"?(zh?"免費遊玩 · 每日同題":"Free · Daily challenge"):(zh?"免費棋局 · Live 選用":"Free board · Optional Live")}</span></div>
    <span className="crew-play-open" aria-hidden="true">↗</span>
   </Link>)}
   <Link className="crew-play-game-card nonsense-hub-card" to="/games/nonsense">
    <div className="crew-play-game-art nonsense-hub-art" aria-hidden="true"><span>🎙</span></div>
    <div className="crew-play-game-info"><strong>{zh?"荒謬新聞直播":"Absurd News Live"}</strong><small>{zh?"荒謬新聞題材、AI 主播與動態新聞現場。":"150 premises, three improvised rounds, evolving AI news scenes."}</small><span className="crew-play-game-voice-tag">{zh?"Gemini Key · Live 語音或文字互動":"Gemini Key · voice or text play"}</span></div>
    <span className="crew-play-open" aria-hidden="true">↗</span>
   </Link>
   <Link className="crew-play-game-card werewolf-hub-card" to="/games/werewolf">
    <div className="crew-play-game-art werewolf-hub-art" aria-hidden="true"><span>☾</span></div>
    <div className="crew-play-game-info"><strong>{zh?"AI 狼人殺":"AI Werewolf"}</strong><small>{zh?"1 真人 + 5 AI。夜晚行動、自由質疑、角色推理與投票。":"One human plus five AI suspects. Investigate, debate, bluff and vote."}</small><span className="crew-play-game-voice-tag">{zh?"免 Key 情境台詞 · Key 啟用真正 AI / Live":"Free text demo · Optional Gemini Live voice"}</span></div>
    <span className="crew-play-open" aria-hidden="true">↗</span>
   </Link>
   <Link className="crew-play-game-card court-hub-card" to="/games/crazy-court">
    <div className="crew-play-game-art court-hub-art" aria-hidden="true"><span>⚖</span></div>
    <div className="crew-play-game-info"><strong>{zh?"荒謬法庭":"Crazy Court"}</strong><small>{zh?"選擇立場、提出證據，和 AI 朋友辯論荒謬案件。":"Take a side, present evidence and debate silly cases with an AI friend."}</small><span className="crew-play-game-voice-tag">{zh?"需 Gemini Key · 語音選用":"Gemini Key required · Voice optional"}</span></div>
    <span className="crew-play-open" aria-hidden="true">↗</span>
   </Link>
  </div>
  <p className="crew-play-footer-note">{t("playHub.footer")}</p>
 </main>;
}
