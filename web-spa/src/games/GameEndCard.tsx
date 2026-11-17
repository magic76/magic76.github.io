import {useEffect,useRef} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import "./gameEndCard.css";

type Game="connect4"|"gomoku"|"reversi";
type Result="win"|"lose"|"draw";

/** Only completed, local-board outcomes reach this card; moves are total recorded turns. */
export function GameEndCard({game,result,moves,friendName,onRematch}:{game:Game;result:Result;moves:number;friendName:string;onRematch:()=>void}){
 const {t}=useTranslation("games");
 const cardRef=useRef<HTMLElement>(null);
 useEffect(()=>{
  if(!window.matchMedia?.("(max-width: 620px)").matches)return;
  // The text-chat dock is fixed above mobile navigation, outside normal flow.
  // On completion bring the entire card above it; do not scroll during play.
  const frame=window.requestAnimationFrame(()=>{
   const card=cardRef.current;
   if(!card)return;
   const dock=card.closest(".crew-play-page,.friend-gomoku-page")?.querySelector<HTMLElement>(".game-voice-dock");
   const bottomLimit=dock&&window.getComputedStyle(dock).position==="fixed"
    ?dock.getBoundingClientRect().top:window.innerHeight;
   const hiddenPixels=card.getBoundingClientRect().bottom-bottomLimit+12;
   if(hiddenPixels>0)window.scrollBy({top:Math.ceil(hiddenPixels),behavior:"auto"});
  });
  return ()=>window.cancelAnimationFrame(frame);
 },[]);
 const href="/friend/live?id=zoe&chat=text&topic=game-"+game+"&result="+result+"&moves="+moves;
 return <section ref={cardRef} className="crew-game-end" aria-label={t("playHub.gameEnd.heading")} aria-live="polite">
  <strong>{t("playHub.gameEnd."+result,{name:friendName})}</strong>
  <p>{t("playHub.gameEnd.moves",{count:moves})} · {t("playHub.gameEnd.hint")}</p>
  <div className="crew-game-end-actions">
   <Link className="crew-game-end-chat" to={href}>{t("playHub.gameEnd.chat")}</Link>
   <button type="button" className="crew-game-end-again" onClick={onRematch}>{t("playHub.gameEnd.again")}</button>
  </div>
 </section>;
}
