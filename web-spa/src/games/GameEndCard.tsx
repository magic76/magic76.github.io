import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import "./gameEndCard.css";

type Game="connect4"|"gomoku"|"reversi";
type Result="win"|"lose"|"draw";

/** Only completed, local-board outcomes reach this card; moves are total recorded turns. */
export function GameEndCard({game,result,moves,friendName,onRematch}:{game:Game;result:Result;moves:number;friendName:string;onRematch:()=>void}){
 const {t}=useTranslation("games");
 const href="/friend/live?id=zoe&chat=text&topic=game-"+game+"&result="+result+"&moves="+moves;
 return <section className="crew-game-end" aria-label={t("playHub.gameEnd.heading")} aria-live="polite">
  <strong>{t("playHub.gameEnd."+result,{name:friendName})}</strong>
  <p>{t("playHub.gameEnd.moves",{count:moves})} · {t("playHub.gameEnd.hint")}</p>
  <div className="crew-game-end-actions">
   <Link className="crew-game-end-chat" to={href}>{t("playHub.gameEnd.chat")}</Link>
   <button type="button" className="crew-game-end-again" onClick={onRematch}>{t("playHub.gameEnd.again")}</button>
  </div>
 </section>;
}
