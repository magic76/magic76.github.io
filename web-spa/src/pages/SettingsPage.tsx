import{useEffect,useState}from"react";
import{useTranslation}from"react-i18next";
import{LanguageSwitcher}from"../i18n/LanguageSwitcher";
import{personalMemoryEnabled,setPersonalMemoryEnabled}from"../teacher/studentMemory";
import{friendMemoryEnabled,setFriendMemoryEnabled}from"../friends/friendMemory";
import{downloadBackup,importBackup}from"../lib/backup";
import{GeminiConnectionPanel}from"./GeminiConnectionPanel";

export function SettingsPage(){
 const {t}=useTranslation("settings");
 const[backupBusy,setBackupBusy]=useState(false),[backupStatus,setBackupStatus]=useState("");
 const[personalMemory,setPersonalMemory]=useState(personalMemoryEnabled),[friendTopicsMemory,setFriendTopicsMemory]=useState(friendMemoryEnabled);
 useEffect(()=>{if(window.location.hash.endsWith("#memory-settings"))document.getElementById("memory-settings")?.scrollIntoView({block:"start"})},[]);
 return <><section className="hero"><span className="kicker">Crew</span><h1>{t("hero.title")}</h1><p>{t("hero.desc")}</p></section>
 <section className="section panel crew-language-settings"><LanguageSwitcher variant="settings"/></section>
 <GeminiConnectionPanel/>
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
</>;
}
