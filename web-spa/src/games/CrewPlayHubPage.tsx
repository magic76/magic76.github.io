import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import "./crewPlay.css";

export const crewGames=[
 {id:"friend-gomoku",icon:"●",title:{zh:"五子棋",en:"Gomoku"},desc:{zh:"經典五連線對決",en:"Classic five-in-a-row"}},
 {id:"connect4",icon:"◉",title:{zh:"四子棋",en:"Connect Four"},desc:{zh:"放下棋子，搶先連成四顆",en:"Drop discs and connect four"}},
 {id:"twenty-questions",icon:"?",title:{zh:"20 Questions",en:"20 Questions"},desc:{zh:"用 20 次提問猜出秘密",en:"Find the secret in 20 questions"}},
 {id:"reversi",icon:"◐",title:{zh:"黑白棋",en:"Reversi"},desc:{zh:"翻轉棋子，逆轉局勢",en:"Flip discs and take the board"}},
 {id:"mystery",icon:"✦",title:{zh:"海龜湯",en:"Mystery Stories"},desc:{zh:"問對問題，揭開故事真相",en:"Solve curious lateral-thinking cases"}}
] as const;

export function CrewPlayHubPage(){
 const {i18n}=useTranslation();const en=Boolean(i18n.resolvedLanguage?.startsWith("en"));
 return <main className="crew-play-page">
  <header className="crew-play-hero">
   <Link to="/" className="crew-play-back">← {en?"Home":"首頁"}</Link>
   <span className="crew-play-eyebrow">CREW PLAY</span>
   <h1>{en?"Play with your Crew Friends":"今天和朋友玩什麼？"}</h1>
   <p>{en?"Same friends, same voices. Choose a game, then bring a friend along. Board rules run locally; voice is optional.":"熟悉的朋友、熟悉的聲音。選個遊戲一起玩；棋盤規則離線執行，語音可自由開關。"}</p>
  </header>
  <div className="crew-play-catalog">
   {crewGames.map((game,index)=><Link className="crew-play-game-card" to={"/games/"+game.id} key={game.id}>
    <div className={`crew-play-game-art game-${index}`} aria-hidden="true"><span>{game.icon}</span></div>
    <div className="crew-play-game-info"><strong>{game.title[en?"en":"zh"]}</strong><small>{game.desc[en?"en":"zh"]}</small></div>
    <span className="crew-play-open" aria-hidden="true">↗</span>
   </Link>)}
  </div>
  <p className="crew-play-footer-note">{en?"No multiplayer server or account required. Speech requires your Gemini Key and microphone permission.":"不需要連線對戰或遊戲帳號；開啟語音才需要 Gemini Key 和麥克風權限。"}</p>
 </main>;
}
