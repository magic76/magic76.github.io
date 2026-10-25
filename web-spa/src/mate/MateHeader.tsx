import {Link} from "react-router-dom";
import type {MatePhase} from "./mateState";

/** Presentation-only header. History state and permissions remain in MatePage. */
export function MateHeader({phase,en,onHistory}:{phase:MatePhase;en:boolean;onHistory:()=>void}){
 const t=(zh:string,english:string)=>en?english:zh;
 return <header className="mate-title">      <div><Link to="/explore" className="mate-back">← {t("探索","Explore")}</Link>
        <p className="mate-kicker">CREW MATE</p>
        <h1>{t("AI 幫你溝通","Let AI communicate for you")}</h1>
        <p>{t("私下交代，再把手機交給對方。","Brief privately, then hand the phone to the other person.")}</p></div>
      {phase!=="external"&&phase!=="decision"&&<button type="button" className="mate-quiet" onClick={onHistory}>{t("紀錄","History")}</button>}
    </header>
