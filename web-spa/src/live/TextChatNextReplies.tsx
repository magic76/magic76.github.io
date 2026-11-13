import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import {friendFallbackPhrases,modeFromFriendSystem} from "./friendReplyFallback";

const keys=["textChat.followUps.more","textChat.followUps.why","textChat.followUps.change"] as const;
/** In natural mode use the interface; otherwise use the practiced language. */
export function useFriendNextReplyFallback(system:string):string[]{
 const {t}=useTranslation("voice");
 const language=useTeacherStore(state=>state.targetLanguage);
 const storedMode=useTeacherStore(state=>state.friendChatMode);
 const mode=modeFromFriendSystem(system,storedMode);
 const code=TARGET_LANGUAGES.find(item=>item.value===language||item.code===language)?.code||"en";
 return friendFallbackPhrases(code,mode,keys.map(key=>t(key)));
}

export function TextChatNextReplies({replies,onPick}:{replies:string[];onPick:(value:string)=>void}){
 const {t}=useTranslation("voice");
 return <div className="crew-text-starters crew-text-next-replies" aria-label={t("textChat.nextHeading")}>
  <span className="crew-text-starters-heading">{t("textChat.nextHeading")}</span>
  <div className="crew-text-starters-options">{replies.map((reply,index)=><button key={index} type="button" className="crew-text-starter" onClick={()=>onPick(reply)}>{reply}</button>)}</div>
 </div>;
}
