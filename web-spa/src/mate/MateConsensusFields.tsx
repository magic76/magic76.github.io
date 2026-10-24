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
  const presets=[
    {id:"hotel",zh:"飯店入住",en:"Hotel",target:en?"Hotel front desk":"飯店櫃檯",goal:en?"Ask whether early check-in is possible":"詢問能否提早入住",limits:en?"No extra payment without my approval":"不接受未經我同意的額外費用"},
    {id:"restaurant",zh:"餐廳點餐",en:"Restaurant",target:en?"Restaurant staff":"餐廳服務人員",goal:en?"Ask about available dishes and place an order":"詢問菜色並協助點餐",limits:en?"Confirm prices and any food restrictions first":"先確認餐點價格及我的飲食限制"},
    {id:"directions",zh:"問路交通",en:"Directions",target:en?"Transport staff":"交通服務人員",goal:en?"Ask for the correct route and platform":"確認路線、方向與月台",limits:en?"Do not buy tickets or agree to extra charges":"不能自行購票或接受額外費用"},
    {id:"shopping",zh:"購物詢價",en:"Shopping",target:en?"Shop clerk":"商店店員",goal:en?"Ask about prices and availability":"詢問價格與是否有貨",limits:en?"Do not buy or reserve anything without asking me":"不得自行購買或預訂"}
  ];
  const applyPreset=(preset:typeof presets[number])=>{
    if((consensus.target||consensus.goal)&&!window.confirm(t("要以範例替換目前的溝通對象與目標嗎？","Replace current person and goal with this example?")))return;
    edit("target",preset.target);edit("goal",preset.goal);edit("constraints",preset.limits);
  };
  return <>
        {canEdit&&<div className="mate-presets" aria-label={t("快速建立任務","Task examples")}>
          {presets.map(preset=><button type="button" key={preset.id} onClick={()=>applyPreset(preset)}>{en?preset.en:preset.zh}</button>)}
        </div>}
        <div className="mate-languages"><label>{t("我使用的語言","My language")}{options(consensus.userLanguage,"userLanguage")}</label>
          <span aria-hidden="true">→</span>
          <label>{t("對方使用的語言","Other person's language")}{options(consensus.otherLanguage,"otherLanguage")}</label>
        </div>
        <div className="mate-fields">
          <label>{t("我要跟誰溝通？","Who am I speaking to?")}
            <input disabled={!canEdit} value={consensus.target} onChange={e=>edit("target",e.target.value)} placeholder={t("例如：飯店櫃檯","e.g. hotel reception")}/></label>
          <label>{t("希望達成的目標（可能會對外說明）","Public communication goal")}
            <textarea disabled={!canEdit} value={consensus.goal} onChange={e=>edit("goal",e.target.value)} rows={2} placeholder={t("例如：詢問能否提早入住","e.g. Request an early check-in")}/></label>
          <label>{t("私人限制（Mate 會遵守，不主動說給對方聽）","Private limits (Mate follows these without revealing them)")}
            <textarea disabled={!canEdit} value={consensus.constraints} onChange={e=>edit("constraints",e.target.value)} rows={2} placeholder={t("例如：不接受任何額外收費；若無限制，請填『無』","e.g. No extra fees; type 'none' if none")}/></label>
          <label>{t("哪些情況必須先問我？","When must Mate ask me?")}
            <textarea disabled={!canEdit} value={consensus.escalation} onChange={e=>edit("escalation",e.target.value)} rows={2}/></label>
        </div>

  </>;
}
