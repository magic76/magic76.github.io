import {useEffect,useMemo,useState} from "react";
import {ensureCore,geminiKey} from "../lib/runtime";

type Turn={input?:string;output?:string};
type Props={
 kind:"teacher"|"story";label:string;language:string;state:string;
 turns:ReadonlyArray<Turn>;input:string;output:string;
};
function readNotes(key:string){
 try{return localStorage.getItem(key)||""}catch{return ""}
}

/** Desktop-only presentation over the existing Live state; never starts a second session. */
export function DesktopLivePanel({kind,label,language,state,turns,input,output}:Props){
 const noteKey="crew_"+kind+"_workspace_notes_v1";
 const[tab,setTab]=useState<"transcript"|"notes">("transcript");
 const[notes,setNotes]=useState(()=>readNotes(noteKey));
 const[copyStatus,setCopyStatus]=useState("");
 const[busy,setBusy]=useState(false);
 const[translation,setTranslation]=useState<{source:string;text:string}|null>(null);
 const[translateError,setTranslateError]=useState("");
 useEffect(()=>{try{localStorage.setItem(noteKey,notes)}catch{/* storage may be disabled */}},[noteKey,notes]);
 const text=useMemo(()=>turns.map(t=>[
  t.input?"你："+t.input:"",
  t.output?label+"："+t.output:""
 ].filter(Boolean).join("\n")).filter(Boolean).join("\n\n"),[turns,label]);
 const last=turns[turns.length-1];
 const pendingInput=input.trim()&&input.trim()!==last?.input?.trim()?input.trim():"";
 const pendingOutput=output.trim()&&output.trim()!==last?.output?.trim()?output.trim():"";
 const recent=output.trim()||[...turns].reverse().find(t=>t.output?.trim())?.output?.trim()||"";
 const fullText=[text,pendingInput?"你："+pendingInput:"",pendingOutput?label+"："+pendingOutput:""].filter(Boolean).join("\n\n");
 async function copyTranscript(){
  if(!fullText)return;
  try{await navigator.clipboard.writeText(fullText);setCopyStatus("已複製")}catch{setCopyStatus("無法複製，請檢查瀏覽器權限")}
 }
 async function translate(){
  if(!recent||busy)return;
  setTranslateError("");
  if(!geminiKey()){setTranslateError("請先在設定頁新增 Gemini Key。");return}
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
  }catch{setTranslateError("翻譯暫時失敗，可以再試一次。")}
  finally{setBusy(false)}
 }
 return <aside className="desktop-live-panel" aria-label={kind==="teacher"?"學習工作台":"故事互動工作台"}>
  <header className="workspace-panel-header">
   <div><span className="kicker">{kind==="teacher"?"Crew Teacher":"Crew Story"} · Workspace</span>
    <h2>{kind==="teacher"?"對話與學習筆記":"故事互動與筆記"}</h2>
    <p>{kind==="teacher"?"練口說時不需要離開老師畫面。":"一邊聽故事，一邊留下想法。"}</p></div>
   <span className="workspace-state" data-state={state}>{state==="speaking"?"說話中":state==="listening"?"聆聽中":state==="connecting"?"連線中":state==="ended"?"已結束":"待開始"}</span>
  </header>
  <div className="workspace-tabs" aria-label="切換工作台內容">
   <button type="button" aria-pressed={tab==="transcript"} className={tab==="transcript"?"active":""} onClick={()=>setTab("transcript")}>逐字稿</button>
   <button type="button" aria-pressed={tab==="notes"} className={tab==="notes"?"active":""} onClick={()=>setTab("notes")}>{kind==="teacher"?"學習筆記":"故事筆記"}{notes.trim()?" · 已記錄":""}</button>
  </div>
  {tab==="transcript"?<>
   <div className="workspace-dialogue" tabIndex={0} aria-label="完整對話紀錄">
    {!fullText&&<div className="workspace-empty"><strong>對話從這裡開始</strong><p>按左側開始，即可看到對話內容。</p></div>}
    {turns.map((turn,i)=><div className="workspace-turn" key={i}>
      {turn.input&&<p className="workspace-bubble from-user"><small>你</small><span>{turn.input}</span></p>}
      {turn.output&&<p className="workspace-bubble"><small>{label}</small><span>{turn.output}</span></p>}
    </div>)}
    {(pendingInput||pendingOutput)&&<div className="workspace-turn current" aria-label="最新對話">
     {pendingInput&&<p className="workspace-bubble from-user"><small>你 · 即時</small><span>{pendingInput}</span></p>}
     {pendingOutput&&<p className="workspace-bubble"><small>{label} · 即時</small><span>{pendingOutput}</span></p>}
    </div>}
   </div>
   <div className="workspace-bottom">
    <div className="workspace-actions">
     <button type="button" disabled={!fullText} onClick={()=>void copyTranscript()}>複製對話</button>
     {kind==="teacher"&&<button type="button" disabled={!recent||busy} onClick={()=>void translate()}>{busy?"翻譯中…":"翻譯老師最近一句"}</button>}
    </div>
    {copyStatus&&<small className="workspace-feedback" role="status">{copyStatus}</small>}
    {kind==="teacher"&&translation?.source===recent&&<div className="workspace-translation"><strong>繁體中文翻譯</strong><p>{translation.text}</p></div>}
    {translateError&&<small className="workspace-feedback error" role="alert">{translateError}</small>}
   </div>
  </>:<div className="workspace-note-area">
   <label htmlFor={"workspace-notes-"+kind}>隨手記下重點</label>
   <textarea id={"workspace-notes-"+kind} value={notes} onChange={e=>setNotes(e.target.value)} maxLength={12000} placeholder={kind==="teacher"?"今天學到的說法、單字、下次想練的句子…":"喜歡的角色、故事靈感、想問阿奇的問題…"} />
   <small>自動儲存在這個瀏覽器，可在 Crew 設定中備份；不會傳給老師或阿奇。</small>
  </div>}
 </aside>;
}
