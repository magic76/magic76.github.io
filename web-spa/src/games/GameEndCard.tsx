import {useEffect,useRef} from "react";
import {useTranslation} from "react-i18next";
import "./gameEndCard.css";

type Game="connect4"|"gomoku"|"reversi";
type Result="win"|"lose"|"draw";

/** Only completed, local-board outcomes reach this card; moves are total recorded turns. */
export function GameEndCard({result,moves,friendName,onRematch}:{game:Game;result:Result;moves:number;friendName:string;onRematch:()=>void}){
 const {t}=useTranslation("games");
 const cardRef=useRef<HTMLElement>(null);
 useEffect(()=>{
  const isMobile=window.matchMedia?.("(max-width: 620px)").matches;
  // Keep the mobile fixed-dock avoidance unchanged. Desktop only reveals the
  // finished card if it is outside the viewport; never move keyboard focus.
  const frame=window.requestAnimationFrame(()=>{
   const card=cardRef.current;
   if(!card)return;
   if(!isMobile){
    const reduceMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({block:"nearest",inline:"nearest",behavior:reduceMotion?"auto":"smooth"});
    return;
   }
   const dock=card.closest(".crew-play-page,.friend-gomoku-page")?.querySelector<HTMLElement>(".game-voice-dock");
   const bottomLimit=dock&&window.getComputedStyle(dock).position==="fixed"
    ?dock.getBoundingClientRect().top:window.innerHeight;
   const hiddenPixels=card.getBoundingClientRect().bottom-bottomLimit+12;
   if(hiddenPixels>0)window.scrollBy({top:Math.ceil(hiddenPixels),behavior:"auto"});
  });
  return ()=>window.cancelAnimationFrame(frame);
 },[]);
 return <section ref={cardRef} className="crew-game-end" aria-label={t("playHub.gameEnd.heading")} aria-live="polite">
  <strong>{t("playHub.gameEnd."+result,{name:friendName})}</strong>
  <p>{t("playHub.gameEnd.moves",{count:moves})}</p>
  <div className="crew-game-end-actions">
   <button type="button" className="crew-game-end-again" onClick={onRematch}>{t("playHub.gameEnd.again")}</button>
  </div>
 </section>;
}
