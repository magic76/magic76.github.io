import {useTranslation} from "react-i18next";
import type {ReturningFriendVisit} from "./sessionTranscript";

type Props={visit:ReturningFriendVisit;name:string;showChoices:boolean;onPick:(message:string)=>void};
/** Visual-only friend greeting; no API turn, transcript write or automatic send. */
export function TextChatWelcomeBack({visit,name,showChoices,onPick}:Props){
 const {t}=useTranslation("voice");
 return <div className="crew-text-welcome-back">
  <div className="crew-text-chat-message assistant crew-text-return-greeting">
   <strong>{name}</strong><p>{t("textChat.resume.greeting",{excerpt:visit.excerpt})}</p>
  </div>
  {showChoices&&<div className="crew-text-return-actions">
   <button type="button" onClick={()=>onPick(t("textChat.resume.continueMessage"))}>{t("textChat.resume.continue")}</button>
   <button type="button" onClick={()=>onPick(t("textChat.resume.newMessage"))}>{t("textChat.resume.newTopic")}</button>
  </div>}
 </div>;
}
