import {useCallback,useEffect,useRef,useState} from "react";
import type {ReactNode} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {LanguageSwitcher} from "../i18n/LanguageSwitcher";
import {useTeacherStore} from "../store/teacherStore";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import {getOnboardingCopy} from "./copy";
import {markLearningLanguageConfirmed} from "./learningLanguagePreference";
import "./onboarding.css";

export const REOPEN_ONBOARDING_EVENT="crew:reopen-onboarding";
export const ONBOARDING_DONE_KEY="crew_onboarding_web_v1";
const DRAFT_KEY="crew_onboarding_draft_v1";
const REPLAY_SESSION_KEY="crew_onboarding_replay_active_v1";
type Goal="chat"|"learn"|"play"|"explore";
const goals:readonly Goal[]=["chat","learn","play","explore"];
// Send the visitor to a usable first experience, not a feature index.
const destinations:Record<Goal,string>={chat:"/friend/live?id=zoe&from=home&chat=text",learn:"/teacher/live?lesson=daily_u1_l1",play:"/games/number-bomb",explore:"/timeline"};

function previousCrewActivity():boolean{
 // The UI locale preference is initialized even on a new visit: it is NOT a
 // signal that someone already used Crew. Existing actual data is.
 const prefixes=["crew_teacher_","crew_story_","crew_fortune_","crew_friend_","crew_home_last_activity_","crew_gemini_"];
 for(let index=0;index<localStorage.length;index++){
  const key=localStorage.key(index)||"";
  if(prefixes.some(prefix=>key.startsWith(prefix)))return true;
 }
 return false;
}

function readDraft():{step:number;goal:Goal}{
 try{
  const value=JSON.parse(sessionStorage.getItem(DRAFT_KEY)||"null") as {step?:unknown;goal?:unknown}|null;
  const step=value?.step;
  const goal=value?.goal;
  return {
   step:typeof step==="number"&&Number.isInteger(step)&&step>=0&&step<=2?step:0,
   goal:typeof goal==="string"&&goals.includes(goal as Goal)?goal as Goal:"chat"
  };
 }catch{return {step:0,goal:"chat"}}
}
function writeDraft(step:number,goal:Goal){
 try{sessionStorage.setItem(DRAFT_KEY,JSON.stringify({step,goal}))}catch{/* Keep the guide functional without session storage. */}
}

function Tile({children,selected,onClick}:{children:ReactNode;selected:boolean;onClick:()=>void}){
 return <button type="button" className={"crew-onboarding-tile"+(selected?" is-selected":"")}
  aria-pressed={selected} onClick={onClick}>{children}<span className="crew-onboarding-tile-check" aria-hidden="true">{selected?"✓":"→"}</span></button>;
}

/** Shared first-run experience for browser and official Android WebView shell. */
export function OnboardingGate({pathname}:{pathname:string}){
 const {i18n}=useTranslation();
 const c=getOnboardingCopy(i18n.resolvedLanguage||i18n.language);
 const navigate=useNavigate();
 const dialog=useRef<HTMLDialogElement>(null);
 const [open,setOpen]=useState(false);
 const [step,setStep]=useState(0);
 const [goal,setGoal]=useState<Goal>("chat");
 const firstAction={chat:c.firstChat,learn:c.firstLearn,play:c.firstPlay,explore:c.firstExplore}[goal];
 const target=useTeacherStore(state=>state.targetLanguage);
 const setTarget=useTeacherStore(state=>state.setTargetLanguage);

 const openGuide=useCallback((replay:boolean)=>{
  if(replay){try{sessionStorage.removeItem(DRAFT_KEY);sessionStorage.setItem(REPLAY_SESSION_KEY,"1")}catch{/* optional */}}
  const draft=replay?{step:0,goal:"chat" as Goal}:readDraft();
  setStep(draft.step);setGoal(draft.goal);setOpen(true);
 },[]);

 useEffect(()=>{
  // Only the Settings replay button may request a modal guide.
  const onReplay=()=>{if(pathname==="/settings")openGuide(true)};
  window.addEventListener(REOPEN_ONBOARDING_EVENT,onReplay);
  return()=>window.removeEventListener(REOPEN_ONBOARDING_EVENT,onReplay);
 },[pathname,openGuide]);

 useEffect(()=>{
  // A locale switch can remount the actively replayed Settings guide.
  if(pathname!=="/settings")return;
  try{
   if(sessionStorage.getItem(REPLAY_SESSION_KEY)==="1"&&sessionStorage.getItem(DRAFT_KEY))openGuide(false);
  }catch{/* Private/blocked session storage: leave the guide optional. */}
 },[pathname,openGuide]);

 useEffect(()=>{
  // Home never launches the guide or takes focus, regardless of viewport width.
  if(pathname!=="/")return;
  dialog.current?.close();setOpen(false);
  try{
   if(localStorage.getItem(ONBOARDING_DONE_KEY))return;
   if(previousCrewActivity())localStorage.setItem(ONBOARDING_DONE_KEY,"existing");
  }catch{/* Private/blocked storage: leave the homepage usable. */}
 },[pathname]);

 useEffect(()=>{
  const current=dialog.current;
  if(!current)return;
  if(open&&!current.open)current.showModal();
  if(!open&&current.open)current.close();
 },[open]);

 function finish(begin:boolean,chosenGoal:Goal=goal){
  try{localStorage.setItem(ONBOARDING_DONE_KEY,begin?"completed":"skipped")}catch{/* Optional persistence. */}
  try{sessionStorage.removeItem(DRAFT_KEY);sessionStorage.removeItem(REPLAY_SESSION_KEY)}catch{/* Optional persistence. */}
  // Only the final learning-preference step counts as explicit confirmation.
  // The welcome shortcut intentionally reaches the Learn gate for first-time visitors.
  if(begin&&chosenGoal==="learn"&&step===2)markLearningLanguageConfirmed(localStorage);
  dialog.current?.close();setOpen(false);
  if(begin)navigate(destinations[chosenGoal]);
 }
 function next(){
  const value=Math.min(2,step+1);
  setStep(value);writeDraft(value,goal);
 }
 function back(){
  const value=Math.max(0,step-1);
  setStep(value);writeDraft(value,goal);
 }
 function choose(value:Goal){
  setGoal(value);writeDraft(step,value);
 }
 const goalCards=[
  {id:"chat" as const,symbol:"✦",title:c.chat,description:c.chatDesc},
  {id:"learn" as const,symbol:"文",title:c.learn,description:c.learnDesc},
  {id:"play" as const,symbol:"◇",title:c.play,description:c.playDesc},
  {id:"explore" as const,symbol:"◎",title:c.explore,description:c.exploreDesc}
 ];
 return <dialog ref={dialog} className="crew-onboarding-dialog"
  aria-labelledby="crew-onboarding-title"
  onCancel={event=>{event.preventDefault();finish(false)}}
  onClose={()=>setOpen(false)}>
  <div className="crew-onboarding-panel">
   <header className="crew-onboarding-header">
    <span className="crew-onboarding-brand"><span className="crew-onboarding-brand-icon">✳</span> CREW</span>
    <span className="crew-onboarding-progress">{c.step} {step+1} / 3</span>
   </header>
   <div className="crew-onboarding-track" aria-hidden="true">
    {[0,1,2].map(index=><i key={index} className={index<=step?"is-active":""}/>)}
   </div>
   <div className="crew-onboarding-content">
    {step===0?<section className="crew-onboarding-step">
     <div className="crew-onboarding-hero" aria-hidden="true"><span>✧</span><strong>Crew</strong><span>✦</span></div>
     <h2 id="crew-onboarding-title">{c.welcomeTitle}</h2>
     <p className="crew-onboarding-lead">{c.welcomeDesc}</p>
     <div className="crew-onboarding-preview">
      {goalCards.map(item=><button type="button" className="crew-onboarding-preview-item" key={item.id} onClick={()=>finish(true,item.id)}><span aria-hidden="true">{item.symbol}</span><strong>{item.title}</strong><span className="crew-onboarding-preview-arrow" aria-hidden="true">→</span></button>)}
     </div>
     <p className="crew-onboarding-note">{c.welcomeNote}</p>
    </section>:null}
    {step===1?<section className="crew-onboarding-step">
     <h2 id="crew-onboarding-title">{c.goalTitle}</h2>
     <p className="crew-onboarding-lead">{c.goalDesc}</p>
     <div className="crew-onboarding-tiles">
      {goalCards.map(item=><Tile key={item.id} selected={goal===item.id} onClick={()=>choose(item.id)}>
       <span className="crew-onboarding-tile-symbol" aria-hidden="true">{item.symbol}</span>
       <span className="crew-onboarding-tile-copy"><strong>{item.title}</strong><small>{item.description}</small></span>
      </Tile>)}
     </div>
    </section>:null}
    {step===2?<section className="crew-onboarding-step">
     <h2 id="crew-onboarding-title">{c.preferencesTitle}</h2>
     <p className="crew-onboarding-lead">{c.preferencesDesc}</p>
     <div className="crew-onboarding-settings">
      <div className="crew-onboarding-setting">
       <span className="crew-onboarding-field-label">{c.uiLanguage}</span>
       <LanguageSwitcher variant="settings"/>
      </div>
      {goal==="learn"?<label className="crew-onboarding-setting">
       <span className="crew-onboarding-field-label">{c.learnLanguage}</span>
       <select value={target} onChange={event=>setTarget(event.target.value)}>
        {TARGET_LANGUAGES.map(language=><option key={language.code} value={language.value}>
         {(i18n.resolvedLanguage||i18n.language)==="zh-TW"?language.value:language.spoken}
        </option>)}
       </select>
      </label>:null}
     </div>
     <p className="crew-onboarding-note">{c.keyNote}</p>
    </section>:null}
   </div>
   <footer className="crew-onboarding-footer">
    <div className="crew-onboarding-actions">
     {step>0?<button type="button" className="crew-onboarding-back" onClick={back}>{c.back}</button>:null}
     <button type="button" className="crew-onboarding-primary" onClick={()=>step===2?finish(true):next()}>
      {step===2?firstAction:c.next}<span aria-hidden="true">→</span>
     </button>
    </div>
    <button type="button" className="crew-onboarding-skip crew-onboarding-guide-skip" onClick={()=>finish(false)}>{c.skip}</button>
   </footer>
  </div>
 </dialog>;
}
