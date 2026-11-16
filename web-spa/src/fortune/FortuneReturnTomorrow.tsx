import {useEffect,useState} from "react";
import {useTranslation} from "react-i18next";
import {CrewInstallInline} from "../components/CrewInstallEntry";
import type {DailyCard} from "./dailyCard";
import {shareDailyReturn} from "./shareCard";

type Props={card:DailyCard};
/** Secondary next-day invitation. Kept separate from Zoe's primary chat action. */
export function FortuneReturnTomorrow({card}:Props){
 const {t}=useTranslation("fortuneDaily");
 const [status,setStatus]=useState<""|"copied"|"failed">("");
 const [busy,setBusy]=useState(false);
 useEffect(()=>{if(!status)return;const timer=window.setTimeout(()=>setStatus(""),4000);return()=>window.clearTimeout(timer);},[status]);
 async function share(){
  if(busy)return;
  setStatus("");setBusy(true);
  try{
   const result=await shareDailyReturn(card,{doLabel:t("doLabel"),avoidLabel:t("avoidLabel"),luckyColor:t("luckyColor"),disclaimer:t("disclaimer"),kindLabel:t(card.kind)});
   if(result==="copied"||result==="failed")setStatus(result);
  }catch{setStatus("failed");}
  finally{setBusy(false);}
 }
 return <aside className="fortune-daily-return" aria-label={t("returnTomorrow.title")}>
  <strong>{t("returnTomorrow.title")}</strong>
  <div className="fortune-daily-return-actions">
   <CrewInstallInline/>
   <button type="button" disabled={busy} onClick={()=>void share()}>{t("returnTomorrow.share")}</button>
  </div>
  <p>{t("returnTomorrow.installed")}</p>
  <span className="fortune-daily-return-status" role="status" aria-live="polite">{status?t("returnTomorrow."+status):""}</span>
 </aside>;
}
