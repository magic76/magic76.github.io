import {useTeacherStore} from "../store/teacherStore";
import{useEffect,useState}from"react";
import{useTranslation}from"react-i18next";
import{LanguageSwitcher}from"../i18n/LanguageSwitcher";
import{personalMemoryEnabled,setPersonalMemoryEnabled}from"../teacher/studentMemory";
import{friendMemoryEnabled,setFriendMemoryEnabled}from"../friends/friendMemory";
import{downloadBackup,importBackup}from"../lib/backup";
import{GeminiConnectionPanel}from"./GeminiConnectionPanel";
import {BuildVersion} from "../components/BuildVersion";

export function SettingsPage(){
 const {t,i18n}=useTranslation("settings");
 const english=i18n.language.startsWith("en");
 const liveModel=useTeacherStore(s=>s.liveModel),setLiveModel=useTeacherStore(s=>s.setLiveModel);
 const[backupBusy,setBackupBusy]=useState(false),[backupStatus,setBackupStatus]=useState("");
 const[personalMemory,setPersonalMemory]=useState(personalMemoryEnabled),[friendTopicsMemory,setFriendTopicsMemory]=useState(friendMemoryEnabled);
 useEffect(()=>{if(window.location.hash.endsWith("#memory-settings"))document.getElementById("memory-settings")?.scrollIntoView({block:"start"})},[]);
 return <><section className="hero"><span className="kicker">Crew</span><h1>{t("hero.title")}</h1><p>{t("hero.desc")}</p></section>
 <section className="section panel crew-language-settings"><LanguageSwitcher variant="settings"/></section>
 <GeminiConnectionPanel/>
 <section className="section panel crew-live-model-settings" id="live-model-settings">
  <div className="section-head"><h2>{english?"Gemini Live voice model":"Gemini Live 語音模型"}</h2><small>{english?"Teachers and Friends":"老師與朋友共用"}</small></div>
  <label style={{display:"grid",gap:8,maxWidth:440}}>
   <span>{english?"Choose a model to compare voice pronunciation":"選擇模型，比較語音與口音表現"}</span>
   <select value={liveModel} onChange={e=>setLiveModel(e.target.value as typeof liveModel)} style={{width:"100%",padding:"12px",borderRadius:10,border:"1px solid #cbd5e1",background:"var(--surface,#fff)",color:"inherit"}}>
    <option value="gemini-3.8-live">Gemini 3.8 Live</option>
    <option value="gemini-3.1-flash-live-preview">Gemini 3.1 Flash Live (Preview)</option>
   </select>
  </label>
  <p className="meta" style={{marginTop:10}}>{english
   ?"Takes effect in the next voice session and voice preview. No silent fallback to a different model, so comparisons are reliable. Older preview model availability depends on Google and your API key."
   :"下次開啟老師、朋友的語音對話或角色試聽時生效。不會暗中切換其他模型，方便實際 A/B 比較。舊版預覽模型是否可用，取決於 Google 及你的 API Key。"}</p>
 </section>
 <section id="memory-settings" className="section panel settings-memory-panel">
  <div className="section-head"><h2>{t("memory.title")}</h2><small>{t("memory.tagline")}</small></div>
  <p className="meta">{t("memory.intro")}</p>
  <label className="row" style={{gap:12,alignItems:"flex-start",marginTop:16}}>
   <input type="checkbox" checked={personalMemory} onChange={e=>{const value=e.target.checked;setPersonalMemoryEnabled(value);setPersonalMemory(value)}}/>
   <span><strong>{t("memory.personal")}</strong><small className="meta" style={{display:"block",marginTop:4}}>{t("memory.personalDesc")}</small></span>
  </label>
  <label className="row" style={{gap:12,alignItems:"flex-start",marginTop:14}}>
   <input type="checkbox" checked={friendTopicsMemory} onChange={e=>{const value=e.target.checked;setFriendMemoryEnabled(value);setFriendTopicsMemory(value)}}/>
   <span><strong>{t("memory.friend")}</strong><small className="meta" style={{display:"block",marginTop:4}}>{t("memory.friendDesc")}</small></span>
  </label>
  <p className="meta" style={{marginTop:14}}>{t("memory.footnote")}</p>
 </section>
 <section className="section panel"><div className="section-head"><h2>{t("backup.title")}</h2><small>{t("backup.tagline")}</small></div><p className="meta">{t("backup.intro")}</p><div className="actions"><button className="btn secondary" disabled={backupBusy} onClick={async()=>{setBackupBusy(true);setBackupStatus("");try{const r=await downloadBackup();setBackupStatus(t("backup.exportSuccess",{stories:r.stories,keys:r.keys}))}catch(_){setBackupStatus(t("backup.exportError"))}finally{setBackupBusy(false)}}}>{t("backup.export")}</button><label className={"btn secondary"+(backupBusy?" disabled":"")}>{t("backup.import")}<input type="file" accept=".json,application/json" hidden disabled={backupBusy} onChange={async e=>{const file=e.target.files?.[0];e.currentTarget.value="";if(!file)return;setBackupBusy(true);setBackupStatus("");try{const r=await importBackup(file);setBackupStatus(t("backup.importSuccess",{stories:r.stories,entries:r.entries,skipped:r.skipped}))}catch(err){setBackupStatus(t("backup.importError",{reason:err instanceof Error?err.message:t("backup.importFallback")}))}finally{setBackupBusy(false)}}}/></label></div>{backupStatus&&<p className="meta" role="status">{backupStatus}</p>}<p className="meta">{t("backup.footnote")}</p></section>
 <BuildVersion/>
</>;
}
