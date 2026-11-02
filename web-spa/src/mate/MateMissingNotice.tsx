import {useTranslation} from "react-i18next";
import type {MateConsensus} from "./mateState";

export function MateMissingNotice({fields,needsApproval}:{fields:(keyof MateConsensus)[];needsApproval:boolean}){
 const {t}=useTranslation(["mate","home"]);
 if(!fields.length&&!needsApproval)return null;
 return <div className="mate-missing" role="alert">
  <strong>{t("mate.validation.missing")}</strong>
  <ul>{fields.map(field=><li key={field}>{t("mate.validation.labels."+field)}</li>)}
   {needsApproval&&<li>{t("mate.validation.confirm")}</li>}</ul>
 </div>;
}
