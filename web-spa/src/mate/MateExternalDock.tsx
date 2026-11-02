import {useTranslation} from "react-i18next";
import type {MatePhase} from "./mateState";
export function MateExternalDock({phase,onSupplement,onTakeOver,onComplete,onEnd}:{
 phase:MatePhase;onSupplement:()=>void;onTakeOver:()=>void;
 onComplete:()=>void;onEnd:()=>void;
}){
 const {t}=useTranslation(["mate","home"]);
 return <div className="mate-dock">
  {phase==="external"&&<>
   <button type="button" className="mate-secondary" onClick={onSupplement}>{t("mate.dock.privateUpdate")}</button>
   <button type="button" className="mate-secondary" onClick={onTakeOver}>{t("mate.dock.takeOver")}</button>
   <button type="button" className="mate-primary" onClick={onComplete}>{t("mate.dock.complete")}</button>
   <button type="button" className="mate-quiet" onClick={onEnd}>{t("mate.dock.endCall")}</button>
  </>}
  {phase==="decision"&&<button className="mate-quiet" type="button" onClick={onEnd}>{t("mate.dock.end")}</button>}
 </div>;
}
