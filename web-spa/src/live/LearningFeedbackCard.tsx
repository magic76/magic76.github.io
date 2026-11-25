import {useState} from "react";
import {useTranslation} from "react-i18next";
import {addDeckItem} from "../teacher/learningDeck";
import {normalizeLearningLanguage} from "../teacher/learningSpeech";
import type {LearningFeedback} from "./learningFeedback.mjs";
import "./learningFeedback.css";
export function LearningFeedbackCard({feedback,language}:{feedback:LearningFeedback;language:string}){
 const {t}=useTranslation("voice");
 const [saved,setSaved]=useState(false),[failed,setFailed]=useState(false);
 const label=t("learningFeedback."+feedback.type,{defaultValue:feedback.type==="natural"?"More natural":feedback.type==="grammar"?"Grammar":"Word choice"});
 const save=()=>{try{addDeckItem({category:"correction",originalText:feedback.corrected,translation:"",notes:feedback.original+" → "+feedback.explanation,language:normalizeLearningLanguage(language)});setSaved(true);setFailed(false)}catch{setFailed(true)}};
 return <details className="live-learning-feedback">
  <summary><span>{label}</span><strong dir="auto">{feedback.corrected}</strong></summary>
  <div className="live-learning-feedback-body">
   <p dir="auto">{feedback.type==="natural"?feedback.original:<del>{feedback.original}</del>}</p>
   <p dir="auto">{feedback.explanation}</p>
   <button type="button" disabled={saved} onClick={save}>{t(saved?"learningFeedback.saved":"learningFeedback.save",{defaultValue:saved?"Saved":"Save to phrases"})}</button>
   {failed&&<small role="status">{t("learningFeedback.failed",{defaultValue:"Could not save. Try again."})}</small>}
  </div>
 </details>;
}
