import {Arrow} from "../components/Arrow";
import {useTranslation} from "react-i18next";
import type {MateConsensus} from "./mateState";
import {MATE_LANGUAGES} from "./mateState";
export function MateConsensusFields({consensus,canEdit,edit,showPresets=true,invalidFields=[]}:{
  consensus:MateConsensus;canEdit:boolean;edit:(field:keyof MateConsensus,value:string)=>void;
  showPresets?:boolean;invalidFields?:(keyof MateConsensus)[];
}){
  const {t}=useTranslation(["mate","home"]);
  const invalid=(field:keyof MateConsensus)=>canEdit&&invalidFields.includes(field);
  const details=(field:keyof MateConsensus)=>invalid(field)?<small id={"mate-help-"+field} className="mate-field-error">{t("mate.validation.required"+(field==="constraints"?"Limits":""))}</small>:null;
  const options=(value:string,field:"userLanguage"|"otherLanguage")=>
    <><select data-mate-field={field} value={value} disabled={!canEdit} aria-invalid={invalid(field)} aria-describedby={invalid(field)?"mate-help-"+field:undefined} onChange={event=>edit(field,event.target.value)}>
      {MATE_LANGUAGES.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
    </select>{details(field)}</>;
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
      <Arrow/>
      <label>{t("mate.fields.otherLang")}{options(consensus.otherLanguage,"otherLanguage")}</label>
    </div>
    <div className="mate-fields">
      <label>{t("mate.fields.target")}
        <input data-mate-field="target" disabled={!canEdit} value={consensus.target} aria-invalid={invalid("target")} aria-describedby={invalid("target")?"mate-help-target":undefined} onChange={e=>edit("target",e.target.value)} placeholder={t("mate.fields.targetPh")}/>{details("target")}</label>
      <label>{t("mate.fields.goal")}
        <textarea data-mate-field="goal" disabled={!canEdit} value={consensus.goal} aria-invalid={invalid("goal")} aria-describedby={invalid("goal")?"mate-help-goal":undefined} onChange={e=>edit("goal",e.target.value)} rows={2} placeholder={t("mate.fields.goalPh")}/>{details("goal")}</label>
      <label>{t("mate.fields.limits")}
        <textarea data-mate-field="constraints" disabled={!canEdit} value={consensus.constraints} aria-invalid={invalid("constraints")} aria-describedby={invalid("constraints")?"mate-help-constraints":undefined} onChange={e=>edit("constraints",e.target.value)} rows={2} placeholder={t("mate.fields.limitsPh")}/>{details("constraints")}</label>
      <label>{t("mate.fields.escalation")}
        <textarea data-mate-field="escalation" disabled={!canEdit} value={consensus.escalation} aria-invalid={invalid("escalation")} aria-describedby={invalid("escalation")?"mate-help-escalation":undefined} onChange={e=>edit("escalation",e.target.value)} rows={2}/>{details("escalation")}</label>
    </div>
  </>;
}
