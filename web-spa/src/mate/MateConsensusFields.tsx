import type {MateConsensus} from "./mateState";
import {MATE_LANGUAGES} from "./mateState";
export function MateConsensusFields({consensus,canEdit,edit,en}:{
  consensus:MateConsensus;canEdit:boolean;edit:(field:keyof MateConsensus,value:string)=>void;en:boolean;
}){
  const t=(zh:string,english:string)=>en?english:zh;
  const options=(value:string,field:"userLanguage"|"otherLanguage")=>
    <select value={value} disabled={!canEdit} onChange={event=>edit(field,event.target.value)}>
      {MATE_LANGUAGES.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
    </select>;
  return <>
        <div className="mate-languages"><label>{t("我使用的語言","My language")}{options(consensus.userLanguage,"userLanguage")}</label>
          <span aria-hidden="true">→</span>
          <label>{t("對方使用的語言","Other person's language")}{options(consensus.otherLanguage,"otherLanguage")}</label>
        </div>
        <div className="mate-fields">
          <label>{t("我要跟誰溝通？","Who am I speaking to?")}
            <input disabled={!canEdit} value={consensus.target} onChange={e=>edit("target",e.target.value)} placeholder={t("例如：飯店櫃檯","e.g. hotel reception")}/></label>
          <label>{t("希望達成的目標（可能會對外說明）","Public communication goal")}
            <textarea disabled={!canEdit} value={consensus.goal} onChange={e=>edit("goal",e.target.value)} rows={2} placeholder={t("例如：詢問能否提早入住","e.g. Request an early check-in")}/></label>
          <label>{t("私人限制（不交給對方或對外 AI）","Private limits (not sent to external AI)")}
            <textarea disabled={!canEdit} value={consensus.constraints} onChange={e=>edit("constraints",e.target.value)} rows={2} placeholder={t("例如：不接受任何額外收費；若無限制，請填『無』","e.g. No extra fees; type 'none' if none")}/></label>
          <label>{t("哪些情況必須先問我？","When must Mate ask me?")}
            <textarea disabled={!canEdit} value={consensus.escalation} onChange={e=>edit("escalation",e.target.value)} rows={2}/></label>
        </div>

  </>;
}
