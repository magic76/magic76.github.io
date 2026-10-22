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
 const {t}=useTranslation("home");
 return <main className="crew-play-page">
  <header className="crew-play-hero">
   <Link to="/" className="crew-play-back">← {t("playHub.back")}</Link>
   <span className="crew-play-eyebrow">CREW PLAY</span>
   <h1>{t("playHub.heading")}</h1>
   <p>{t("playHub.intro")}</p>
  </header>
  <div className="crew-play-catalog">
   {crewGames.map((game,index)=><Link className="crew-play-game-card" to={"/games/"+game.id} key={game.id}>
    <div className={`crew-play-game-art game-${index}`} aria-hidden="true"><span>{game.icon}</span></div>
    <div className="crew-play-game-info"><strong>{t("playHub.games."+game.id+".title")}</strong><small>{t("playHub.games."+game.id+".desc")}</small><span className="crew-play-game-voice-tag">{t(game.id==="twenty-questions"||game.id==="mystery"?"playHub.voiceRequired":"playHub.offlineOptional")}</span></div>
    <span className="crew-play-open" aria-hidden="true">↗</span>
   </Link>)}
  </div>
  <p className="crew-play-footer-note">{t("playHub.footer")}</p>
 </main>;
}
