import {useTranslation} from "react-i18next";
export function FriendCallMenuPreferences({hintsEnabled,hintsLocked,onHintsToggle,translationEnabled,onTranslationToggle}:{hintsEnabled:boolean;hintsLocked:boolean;onHintsToggle:()=>void;translationEnabled:boolean;onTranslationToggle:()=>void}){
 const {t}=useTranslation("voice");
 return <div className="friend-call-menu-preferences">
  <button type="button" aria-pressed={hintsEnabled} disabled={hintsLocked} onClick={onHintsToggle}>{t("suggestReplies.label")} {t(hintsEnabled?"suggestReplies.on":"suggestReplies.off")}</button>
  {hintsLocked?<small>{t("suggestReplies.nextCall")}</small>:null}
  <button type="button" aria-pressed={translationEnabled} onClick={onTranslationToggle}>{t(translationEnabled?"callCaptions.hideTranslation":"callCaptions.showTranslation")}</button>
 </div>;
}
