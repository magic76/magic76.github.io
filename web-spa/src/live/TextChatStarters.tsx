import {useTranslation} from "react-i18next";
import {useTeacherStore} from "../store/teacherStore";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import {friendStarterTopics,targetStarterPhrase} from "../friends/targetStarters";
import {gameRoundStarter} from "./gameRoundHandoff";
import "./quoteTextStarter.css";

/** A starter uses the same verified send path as the composer submit button. */
export function TextChatStarters({onPick,speaker,firstStarter,starters,firstOnly=false}:{onPick:(sentence:string)=>void;speaker:string;firstStarter?:string;starters?:string[];firstOnly?:boolean}){
 const {t,i18n}=useTranslation("friends");
 const targetLanguage=useTeacherStore(s=>s.targetLanguage);
 const friendChatMode=useTeacherStore(s=>s.friendChatMode);
 const targetCode=TARGET_LANGUAGES.find(item=>item.value===targetLanguage||item.code===targetLanguage)?.code||"en";
 const uiCode=(i18n.language||i18n.resolvedLanguage||"").split("-")[0].toLowerCase();
 const hasTargetStarters=!firstOnly&&!starters;
 const showMeaning=hasTargetStarters&&uiCode!==targetCode;
 const gameStarter=typeof window==="undefined"?undefined:gameRoundStarter(targetLanguage,speaker,window.location.search);
 return <div className={"crew-text-starters"+(firstOnly?" crew-quote-resume-starters":"")} aria-label={t("textStarters.heading")}>
  <span className="crew-text-starters-heading">{t("textStarters.heading")}</span>
  {!firstOnly&&<p className="crew-text-starters-target-hint">{t(friendChatMode==="immersion"?"textStarters.tapToBegin":"textStarters.openingHelp")}</p>}
  <div className="crew-text-starters-options">
   {(gameStarter||firstStarter)&&<button type="button" className="crew-text-starter" onClick={()=>onPick((gameStarter||firstStarter)!)}>{gameStarter||firstStarter}</button>}
   {!firstOnly&&starters?.map((sentence,index)=><button key={index} type="button"
    className="crew-text-starter" onClick={()=>onPick(sentence)}>{sentence}</button>)}
   {!firstOnly&&!starters&&friendStarterTopics(speaker).map(key=>{
    const phrase=targetStarterPhrase(targetCode,key,speaker);
    return <button key={key} type="button" className="crew-text-starter crew-text-starter-target" onClick={()=>onPick(phrase)}>
     <span className="crew-text-starter-phrase">{phrase}</span>
     {showMeaning&&<span className="crew-text-starter-meaning">{t("textStarters.meaning."+key,{name:speaker})}</span>}
    </button>;
   })}
  </div>
 </div>;
}
