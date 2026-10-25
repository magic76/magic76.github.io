import type {RefObject} from "react";

// Guide copy lives in its own presentation component; the parent still owns
// the dialog's open state, focus management, and quest progression.
export function MagicHelpDialog({zh,onClose,onStart,action,helpClose}:{
 zh:boolean;onClose:()=>void;onStart:()=>void;action:string;helpClose:RefObject<HTMLButtonElement|null>;
}){
 const t=(chinese:string,english:string)=>zh?chinese:english;
 return <div className="magic-help-overlay" role="presentation">
   <button type="button" className="magic-help-backdrop" onClick={onClose}
    aria-label={t("關閉玩法說明","Close how-to guide")}/>
   <section className="magic-help-dialog" role="dialog" aria-modal="true" aria-labelledby="magic-help-title">
    <button ref={helpClose} type="button" className="magic-help-close"
     onClick={onClose} aria-label={t("關閉玩法說明","Close guide")}>×</button>
    <small>CREW MAGIC</small>
    <h2 id="magic-help-title">{t("三步完成第一場冒險","Your first adventure in three steps")}</h2>
    <p>{t("不需要 Gemini Key，也能直接體驗第一場魔法冒險。","No Gemini key needed to play your first adventure.")}</p>
    <ol>
     <li>{t("打開傳送門，選擇想探索的新世界。","Open a portal and choose a world to explore.")}</li>
     <li>{t("召喚飛龍，看看牠飛到你面前。","Summon a dragon and watch it arrive.")}</li>
     <li>{t("冰封城堡，發現神祕水晶的線索。","Freeze the castle and uncover a crystal clue.")}</li>
    </ol>
    <p>{t("連線 Lumi 後，還可以用語音或文字自由下魔法指令。","Connect to Lumi for free-form voice or text magic.")}</p>
    <button type="button" className="magic-help-start" onClick={onStart}>
     {action} →</button>
   </section>
  </div>;
}
