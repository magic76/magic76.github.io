import {useEffect,useMemo,useState} from "react";
import {useTranslation} from "react-i18next";
import {useRouteNamespace} from "../i18n/useRouteNamespace";
import {ensureCore,geminiKey} from "../lib/runtime";
import {PinyinHint} from "../teacher/PinyinHint";
import type {PinyinAidMode} from "../teacher/pinyinAid";
import type {TeachingMode} from "../store/teacherStore";

type Turn={input?:string;output?:string};
type Props={
 kind:"teacher"|"story"|"friend";label:string;language:string;state:string;
 turns:ReadonlyArray<Turn>;input:string;output:string;pinyinMode?:PinyinAidMode;teachingMode?:TeachingMode;
};
function readNotes(key:string){
 try{return localStorage.getItem(key)||""}catch{return ""}
}

/** Desktop-only presentation over the existing Live state; never starts a second session. */
export function DesktopLivePanel({kind,label,language,state,turns,input,output,pinyinMode="auto",teachingMode="bilingual"}:Props){
 const {t}=useTranslation("voice");
 const voiceReady=useRouteNamespace("voice");
 const noteKey="crew_"+kind+"_workspace_notes_v1";
 const you=t("workspace.you"),line=(who:string,text:string)=>t("workspace.line",{who,text});
 const[tab,setTab]=useState<"transcript"|"notes">("transcript");
 const[notes,setNotes]=useState(()=>readNotes(noteKey));
 const[copyStatus,setCopyStatus]=useState("");
 const[busy,setBusy]=useState(false);
 const[translation,setTranslation]=useState<{source:string;text:string}|null>(null);
 const[translateError,setTranslateError]=useState("");
 useEffect(()=>{try{localStorage.setItem(noteKey,notes)}catch{/* storage may be disabled */}},[noteKey,notes]);
 const text=useMemo(()=>turns.map(turn=>[
  turn.input?line(you,turn.input):"",
  turn.output?line(label,turn.output):""
 ].filter(Boolean).join("\n")).filter(Boolean).join("\n\n"),[turns,label,you,t]);
 const last=turns[turns.length-1];
 const pendingInput=input.trim()&&input.trim()!==last?.input?.trim()?input.trim():"";
 const pendingOutput=output.trim()&&output.trim()!==last?.output?.trim()?output.trim():"";
 const recent=output.trim()||[...turns].reverse().find(t=>t.output?.trim())?.output?.trim()||"";
 const fullText=[text,pendingInput?line(you,pendingInput):"",pendingOutput?line(label,pendingOutput):""].filter(Boolean).join("\n\n");
 async function copyTranscript(){
  if(!fullText)return;
  try{await navigator.clipboard.writeText(fullText);setCopyStatus(t("workspace.copied"))}catch{setCopyStatus(t("workspace.copyFailed"))}
 }
 async function translate(){
  if(!recent||busy)return;
  setTranslateError("");
  if(!geminiKey()){setTranslateError(t("workspace.noKey"));return}
  setBusy(true);
  const source=recent;
  try{
   await ensureCore();
   if(!window.CrewAI?.call)throw new Error("AI 服務未準備好");
   const response=await window.CrewAI.call(
    "將以下"+language+"對話翻譯成自然、準確的繁體中文。只輸出翻譯，不加說明：\n"+source,
    {preferLive:false,temperature:0,maxOutputTokens:450}
   );
   setTranslation({source,text:String(response).trim()});
  }catch{setTranslateError(t("workspace.translateFailed"))}
  finally{setBusy(false)}
 }
 if(!voiceReady)return null;
 return <aside className="desktop-live-panel" aria-label={t("workspace.aria."+kind)}>
  <header className="workspace-panel-header">
   <div><span className="kicker">{kind==="teacher"?"Crew Teacher":kind==="friend"?"Koolo Friends":"Crew Story"} · Workspace</span>
    <h2>{t("workspace.title."+kind)}</h2>
    <p>{t("workspace.desc."+kind)}</p></div>
   <span className="workspace-state" data-state={state}>{t("workspace.state."+(["speaking","listening","connecting","ended"].includes(state)?state:"idle"))}</span>
  </header>
  <div className="workspace-tabs" aria-label={t("workspace.tabsAria")}>
   <button type="button" aria-pressed={tab==="transcript"} className={tab==="transcript"?"active":""} onClick={()=>setTab("transcript")}>{t("workspace.transcript")}</button>
   <button type="button" aria-pressed={tab==="notes"} className={tab==="notes"?"active":""} onClick={()=>setTab("notes")}>{t("workspace.notes."+kind)}{notes.trim()?" · "+t("workspace.saved"):""}</button>
  </div>
  {tab==="transcript"?<>
   <div className="workspace-dialogue" tabIndex={0} aria-label={t("workspace.dialogueAria")}>
    {!fullText&&<div className="workspace-empty"><strong>{t("workspace.emptyTitle")}</strong><p>{t("workspace.emptyBody")}</p></div>}
    {turns.map((turn,i)=><div className="workspace-turn" key={i}>
      {turn.input&&<p className="workspace-bubble from-user"><small>{you}</small><span>{turn.input}</span></p>}
      {turn.output&&<p className="workspace-bubble"><small>{label}</small><span>{turn.output}</span>{kind==="teacher"&&<PinyinHint text={turn.output} targetLanguage={language} mode={pinyinMode} teachingMode={teachingMode}/>}</p>}
    </div>)}
    {(pendingInput||pendingOutput)&&<div className="workspace-turn current" aria-label={t("workspace.latestAria")}>
     {pendingInput&&<p className="workspace-bubble from-user"><small>{you} · {t("workspace.live")}</small><span>{pendingInput}</span></p>}
     {pendingOutput&&<p className="workspace-bubble"><small>{label} · {t("workspace.live")}</small><span>{pendingOutput}</span>{kind==="teacher"&&<PinyinHint text={pendingOutput} targetLanguage={language} mode={pinyinMode} teachingMode={teachingMode}/>}</p>}
    </div>}
   </div>
   <div className="workspace-bottom">
    <div className="workspace-actions">
     <button type="button" disabled={!fullText} onClick={()=>void copyTranscript()}>{t("workspace.copy")}</button>
     {kind==="teacher"&&<button type="button" disabled={!recent||busy} onClick={()=>void translate()}>{busy?t("workspace.translating"):t("workspace.translateLast")}</button>}
    </div>
    {copyStatus&&<small className="workspace-feedback" role="status">{copyStatus}</small>}
    {kind==="teacher"&&translation?.source===recent&&<div className="workspace-translation"><strong>{t("workspace.translationTitle")}</strong><p>{translation.text}</p></div>}
    {translateError&&<small className="workspace-feedback error" role="alert">{translateError}</small>}
   </div>
  </>:<div className="workspace-note-area">
   <label htmlFor={"workspace-notes-"+kind}>{t("workspace.notesLabel")}</label>
   <textarea id={"workspace-notes-"+kind} value={notes} onChange={e=>setNotes(e.target.value)} maxLength={12000} placeholder={t("workspace.placeholder."+kind)} />
   <small>{t("workspace.notesHint")}</small>
  </div>}
 </aside>;
}
