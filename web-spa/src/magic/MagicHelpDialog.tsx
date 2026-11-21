import {Arrow} from "../components/Arrow";
import {useMagicT} from "./useMagicT";
import type {RefObject} from "react";

// Guide copy lives in its own presentation component; the parent still owns
// the dialog's open state, focus management, and quest progression.
export function MagicHelpDialog({zh,onClose,onStart,action,helpClose}:{
 zh:boolean;onClose:()=>void;onStart:()=>void;action:string;helpClose:RefObject<HTMLButtonElement|null>;
}){
 void zh;
 const {t:tr}=useMagicT();
 return <div className="magic-help-overlay" role="presentation">
   <button type="button" className="magic-help-backdrop" onClick={onClose}
    aria-label={tr("Close how-to guide")}/>
   <section className="magic-help-dialog" role="dialog" aria-modal="true" aria-labelledby="magic-help-title">
    <button ref={helpClose} type="button" className="magic-help-close"
     onClick={onClose} aria-label={tr("Close guide")}>×</button>
    <small>CREW MAGIC</small>
    <h2 id="magic-help-title">{tr("Your first adventure in three steps")}</h2>
    <p>{tr("No Gemini key needed to play your first adventure.")}</p>
    <ol>
     <li>{tr("Open a portal and choose a world to explore.")}</li>
     <li>{tr("Summon a dragon and watch it arrive.")}</li>
     <li>{tr("Freeze the castle and uncover a crystal clue.")}</li>
    </ol>
    <p>{tr("Connect to Lumi for free-form voice or text magic.")}</p>
    <button type="button" className="magic-help-start" onClick={onStart}>
     {action} <Arrow/></button>
   </section>
  </div>;
}
