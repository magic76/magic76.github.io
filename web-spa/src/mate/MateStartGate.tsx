import {useTranslation} from "react-i18next";
export function MateStartGate({onStart}:{onStart:()=>void}){
 const {t}=useTranslation(["mate","home"]);
 return <div className="mate-start-gate">
  <p>{t("mate.startGate.description")}</p>
  <button className="mate-primary mate-start-button" type="button" onClick={onStart}>{t("mate.startGate.start")}</button>
 </div>;
}
