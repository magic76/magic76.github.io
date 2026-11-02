import {useTranslation} from "react-i18next";
import type {MateSummary} from "./mateSummary";
export function MateResultPanel({outcome,summary,busy,onContinue,onSupplement,onRestart}:{
 outcome:string;summary:MateSummary|null;busy:boolean;onContinue:()=>void;onSupplement:()=>void;onRestart:()=>void;
}){
 const {t}=useTranslation(["mate","home"]);
 return <div className="mate-result" aria-live="polite">
  <strong>{t("mate.summary.title")}</strong>
  {busy?<p role="status">{t("mate.summary.loading")}</p>:<>
   <p>{outcome||t("mate.callEnded")}</p>
   <p className="mate-summary-status">{summary?.achieved===true?t("mate.summary.achieved"):summary?.achieved===false?t("mate.summary.notAchieved"):t("mate.summary.pending")}</p>
   <p><strong>{t("mate.summary.missing")}</strong> {summary?.missing||t(summary?.achieved===true?"mate.summary.none":"mate.summary.unknown")}</p>
   <div className="mate-actions mate-result-actions">
    <button type="button" className="mate-primary" onClick={onContinue}>{t("mate.summary.continue")}</button>
    <button type="button" className="mate-secondary" onClick={onSupplement}>{t("mate.dock.privateUpdate")}</button>
    <button type="button" className="mate-quiet" onClick={onRestart}>{t("mate.dock.newTask")}</button>
   </div>
  </>}
 </div>;
}
