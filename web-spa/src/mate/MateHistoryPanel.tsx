import {useTranslation} from "react-i18next";
import type {MateHistory} from "./mateState";
export function MateHistoryPanel({history,onOpen,onDelete}:{
  history:MateHistory[];onOpen:(item:MateHistory)=>void;onDelete:(id:string)=>void;
}){
  const {t}=useTranslation(["mate","home"]);
  return <section className="mate-panel" aria-label={t("mate.header.history")}>
    <h2>{t("mate.history.title")}</h2>
    <p className="mate-hint">{t("mate.history.saved")}</p>
    {history.length===0&&<p className="mate-hint">{t("mate.history.empty")}</p>}
    {history.map(item=><div className="mate-history" key={item.id}>
      <div><strong>{item.target} · {item.goal}</strong>
        <small>{new Date(item.updatedAt).toLocaleString()} · {item.status==="stopped"?t("mate.history.paused"):t("mate.history.completed")}</small>
        {item.outcome&&<small>{item.outcome}</small>}
      </div>
      <button type="button" onClick={()=>onOpen(item)}>{item.status==="stopped"&&item.consensus?t("mate.history.resume"):t("mate.history.view")}</button>
      <button type="button" onClick={()=>onDelete(item.id)}>{t("mate.history.delete")}</button>
    </div>)}
  </section>;
}
