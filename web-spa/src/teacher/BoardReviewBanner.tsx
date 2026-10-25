import {useTranslation} from "react-i18next";
type Props={due:number;total:number;enabled:boolean;blocked:boolean;onStart:()=>void;onClear:()=>void};
/** Due reviews are local device study reminders, not AI-verified ability scores. */
export function BoardReviewBanner({due,total,enabled,blocked,onStart,onClear}:Props){
 const {t}=useTranslation("teacher");
 return <section className="teaching-board-review-banner" aria-label={t("board.review.title")}>
  <div><strong>{t("board.review.title")}</strong>
   <small>{!enabled?t("board.review.memoryOff"):
    due?t("board.review.due",{count:due}):
    total?t("board.review.scheduled",{count:total}):t("board.review.empty")}</small></div>
  {enabled&&due>0&&<button type="button" disabled={blocked} onClick={onStart}>{t("board.review.start")}</button>}
  {enabled&&total>0&&<button className="teaching-board-review-clear" type="button" onClick={onClear}>{t("board.review.clear")}</button>}
 </section>;
}
