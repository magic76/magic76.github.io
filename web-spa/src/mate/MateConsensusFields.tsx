import {useTranslation} from "react-i18next";
import type {MateConsensus} from "./mateState";
import {MATE_LANGUAGES} from "./mateState";
export function MateConsensusFields({consensus,canEdit,edit,showPresets=true}:{
  consensus:MateConsensus;canEdit:boolean;edit:(field:keyof MateConsensus,value:string)=>void;showPresets?:boolean;
}){
  const {t}=useTranslation("home");
  const options=(value:string,field:"userLanguage"|"otherLanguage")=>
    <select value={value} disabled={!canEdit} onChange={event=>edit(field,event.target.value)}>
      {MATE_LANGUAGES.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
    </select>;
  const presets=["hotel","restaurant","directions","shopping"].map(id=>{
    const p=(f:string)=>t("mate.presets."+id+"."+f);
    return {id,label:p("label"),target:p("target"),goal:p("goal"),limits:p("limits")};
  });
  const applyPreset=(preset:typeof presets[number])=>{
    if((consensus.target||consensus.goal)&&!window.confirm(t("mate.presets.confirm")))return;
    edit("target",preset.target);edit("goal",preset.goal);edit("constraints",preset.limits);
  };
  return <>
        {canEdit&&showPresets&&<div className="mate-presets" aria-label={t("mate.presets.aria")}>
          {presets.map(preset=><button type="button" key={preset.id} onClick={()=>applyPreset(preset)}>{preset.label}</button>)}
        </div>}
        <div className="mate-languages"><label>{t("mate.fields.myLang")}{options(consensus.userLanguage,"userLanguage")}</label>
          <span aria-hidden="true">→</span>
          <label>{t("mate.fields.otherLang")}{options(consensus.otherLanguage,"otherLanguage")}</label>
        </div>
        <div className="mate-fields">
          <label>{t("mate.fields.target")}
            <input disabled={!canEdit} value={consensus.target} onChange={e=>edit("target",e.target.value)} placeholder={t("mate.fields.targetPh")}/></label>
          <label>{t("mate.fields.goal")}
            <textarea disabled={!canEdit} value={consensus.goal} onChange={e=>edit("goal",e.target.value)} rows={2} placeholder={t("mate.fields.goalPh")}/></label>
          <label>{t("mate.fields.limits")}
            <textarea disabled={!canEdit} value={consensus.constraints} onChange={e=>edit("constraints",e.target.value)} rows={2} placeholder={t("mate.fields.limitsPh")}/></label>
          <label>{t("mate.fields.escalation")}
            <textarea disabled={!canEdit} value={consensus.escalation} onChange={e=>edit("escalation",e.target.value)} rows={2}/></label>
        </div>

  </>;
}
