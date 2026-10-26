import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import type {MatePhase} from "./mateState";

/** Presentation-only header. History state and permissions remain in MatePage. */
export function MateHeader({phase,onHistory}:{phase:MatePhase;onHistory:()=>void}){
 const {t}=useTranslation("home");
 return <header className="mate-title">      <div><Link to="/explore" className="mate-back">← {t("mate.header.explore")}</Link>
        <p className="mate-kicker">CREW MATE</p>
        <h1>{t("mate.header.title")}</h1>
        <p>{t("mate.header.intro")}</p></div>
      {phase!=="external"&&phase!=="decision"&&<button type="button" className="mate-quiet" onClick={onHistory}>{t("mate.header.history")}</button>}
    </header>;
}
