import {useTeacherStore} from "../store/teacherStore";
import{useEffect,useState}from"react";
import{useTranslation}from"react-i18next";
import{LanguageSwitcher}from"../i18n/LanguageSwitcher";
import{personalMemoryEnabled,setPersonalMemoryEnabled}from"../teacher/studentMemory";
import{friendMemoryEnabled,setFriendMemoryEnabled}from"../friends/friendMemory";
import{downloadBackup,importBackup}from"../lib/backup";
import{GeminiConnectionPanel}from"./GeminiConnectionPanel";
import {BuildVersion} from "../components/BuildVersion";
import {Link,useLocation} from "react-router-dom";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import {NATIVE_LANGUAGES} from "../teacher/teacherLocale";
import {DAILY_GOALS,DEFAULT_GOAL_MINUTES,getDailyGoalMinutes,setDailyGoalMinutes} from "../teacher/learningToday";
import {useClientReady} from "../lib/useClientReady";
import {isCrewAndroidShell} from "../lib/platform";
import {getOnboardingCopy} from "../onboarding/copy";
import {REOPEN_ONBOARDING_EVENT} from "../onboarding/OnboardingGate";
import {DeviceAndAppPanel} from "./DeviceAndAppPanel";
import "./settingsGroups.css";

export function SettingsPage(){
 const {t,i18n}=useTranslation("settings");
 // For unlocalized legacy text, use the explicit English fallback for non-Chinese UI locales.
 const english=!i18n.language.startsWith("zh");
 const ready=useClientReady(),{hash}=useLocation();
 const target=useTeacherStore(s=>s.targetLanguage),setTarget=useTeacherStore(s=>s.setTargetLanguage);
 const native=useTeacherStore(s=>s.nativeLanguage),setNative=useTeacherStore(s=>s.setNativeLanguage);
 const speakingLevel=useTeacherStore(s=>s.learnerSpeakingLevel),setSpeakingLevel=useTeacherStore(s=>s.setLearnerSpeakingLevel);
 const[goal,setGoal]=useState(DEFAULT_GOAL_MINUTES);
 useEffect(()=>{if(ready)setGoal(getDailyGoalMinutes())},[ready]);
 const liveModel=useTeacherStore(s=>s.liveModel),setLiveModel=useTeacherStore(s=>s.setLiveModel);
 const[backupBusy,setBackupBusy]=useState(false),[backupStatus,setBackupStatus]=useState("");
 const[personalMemory,setPersonalMemory]=useState(personalMemoryEnabled),[friendTopicsMemory,setFriendTopicsMemory]=useState(friendMemoryEnabled);
 useEffect(()=>{
  const id=hash.slice(1);
  if(!hash.endsWith("#memory-settings")&&!hash.endsWith("#settings-gemini")&&!hash.endsWith("#settings-device"))return;
  // Lazy-mounted settings panels may not exist when the browser first handles the hash.
  const frame=window.requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView?.({block:"start"}));
  return()=>window.cancelAnimationFrame(frame);
 },[hash]);
 return <><section className="hero"><span className="kicker">Crew</span><h1>{t("hero.title")}</h1><p>{t("hero.desc")}</p></section>
 <nav className="crew-settings-nav" aria-label={t("group.navAria")}>
  <a href="#settings-learning">{t("group.navLearning")}</a>
  <a href="#settings-voice">{t("group.navVoice")}</a>
  <a href="#settings-data">{t("group.navMemory")}</a>
  <a href="#settings-device">{t("group.navDevice")}</a>
 </nav>
 <section id="settings-learning" className="section panel crew-settings-category">
  <div className="section-head"><h2>{t("group.learningHeading")}</h2></div>
  <p className="meta">{t("group.learningIntro")}</p>
  <div className="crew-settings-locale"><strong>{t("group.interfaceLanguage")}</strong><LanguageSwitcher variant="settings"/></div>
  <div className="crew-settings-fields">
   <label>{t("group.targetLanguage")}
    <select value={target} onChange={e=>setTarget(e.target.value)}>
     {TARGET_LANGUAGES.map(item=><option key={item.value} value={item.value}>{english?item.spoken:item.value}</option>)}
    </select>
   </label>
   <label>{t("group.nativeLanguage")}
    <select value={native} onChange={e=>setNative(e.target.value as typeof native)}>
     {NATIVE_LANGUAGES.map(([code,label])=><option key={code} value={code}>{label}</option>)}
    </select>
   </label>
   <label>{t("group.speakingLevel")}
    <select value={speakingLevel} onChange={e=>setSpeakingLevel(e.target.value as typeof speakingLevel)}>
     <option value="auto">{t("group.automatic")}</option>
     {(["A1","A2","B1","B2"] as const).map(value=><option value={value} key={value}>{value}</option>)}
    </select>
   </label>
   <label>{t("group.dailyGoal")}
    <select value={goal} disabled={!ready} onChange={e=>{const next=Number(e.target.value);setGoal(next);setDailyGoalMinutes(next)}}>
     {DAILY_GOALS.map(value=><option key={value} value={value}>{value} {t("group.minutes")}</option>)}
    </select>
   </label>
  </div>
  <Link className="crew-settings-quick-link" to="/teacher/learn">{t("group.openLearning")} →</Link>
 </section>
 <div id="settings-voice" className="crew-settings-group">
  <header className="crew-settings-group-heading"><h2>{t("group.voiceHeading")}</h2>
   <p>{t("group.voiceIntro")}</p>
  </header>
  <GeminiConnectionPanel/>
  <section className="section panel crew-settings-voice-links">
   <h3>{t("group.pronunciationHeading")}</h3>
   <p className="meta">{t("group.pronunciationIntro")}</p>
   <Link className="crew-settings-quick-link" to="/teacher/vocabulary">{t("group.pronunciationSettings")} →</Link>
  </section>

 <section className="section panel crew-live-model-settings" id="live-model-settings">
  <div className="section-head"><h2>{t("group.modelHeading")}</h2><small>{t("group.modelShared")}</small></div>
  <label style={{display:"grid",gap:8,maxWidth:440}}>
   <span>{t("group.modelIntro")}</span>
   <select value={liveModel} onChange={e=>setLiveModel(e.target.value as typeof liveModel)} style={{width:"100%",padding:"12px",borderRadius:10,border:"1px solid #cbd5e1",background:"var(--surface,#fff)",color:"inherit"}}>
    <option value="gemini-3.8-live">Gemini 3.8 Live</option>
    <option value="gemini-3.1-flash-live-preview">Gemini 3.1 Flash Live (Preview)</option>
   </select>
  </label>
  <p className="meta" style={{marginTop:10}}>{english
   ?"Takes effect in the next voice session and voice preview. No silent fallback to a different model, so comparisons are reliable. Older preview model availability depends on Google and your API key."
   :"下次開啟老師、朋友的語音對話或角色試聽時生效。不會暗中切換其他模型，方便實際 A/B 比較。舊版預覽模型是否可用，取決於 Google 及你的 API Key。"}</p>
 </section>
 </div>
 <div id="settings-data" className="crew-settings-group">
  <header className="crew-settings-group-heading"><h2>{t("group.memoryHeading")}</h2>
   <p>{t("group.memoryIntro")}</p>
  </header>
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
 {ready&&!isCrewAndroidShell()&&<section className="section panel"><div className="section-head"><h2>{t("backup.title")}</h2><small>{t("backup.tagline")}</small></div><p className="meta">{t("backup.intro")}</p><div className="actions"><button className="btn secondary" disabled={backupBusy} onClick={async()=>{setBackupBusy(true);setBackupStatus("");try{const r=await downloadBackup();setBackupStatus(t("backup.exportSuccess",{stories:r.stories,keys:r.keys}))}catch(_){setBackupStatus(t("backup.exportError"))}finally{setBackupBusy(false)}}}>{t("backup.export")}</button><label className={"btn secondary"+(backupBusy?" disabled":"")}>{t("backup.import")}<input type="file" accept=".json,application/json" hidden disabled={backupBusy} onChange={async e=>{const file=e.target.files?.[0];e.currentTarget.value="";if(!file)return;setBackupBusy(true);setBackupStatus("");try{const r=await importBackup(file);setBackupStatus(t("backup.importSuccess",{stories:r.stories,entries:r.entries,skipped:r.skipped}))}catch(err){setBackupStatus(t("backup.importError",{reason:err instanceof Error?err.message:t("backup.importFallback")}))}finally{setBackupBusy(false)}}}/></label></div>{backupStatus&&<p className="meta" role="status">{backupStatus}</p>}<p className="meta">{t("backup.footnote")}</p></section>}
 <p className="meta" style={{marginTop:16}}><Link to="/privacy">{t("device.privacy")} →</Link></p>
 </div>
 <section id="settings-device" className="section panel crew-settings-category">
  <div className="section-head"><h2>{t("device.heading")}</h2></div>
  <div className="crew-settings-onboarding-card"><button type="button" className="crew-settings-onboarding-replay" onClick={()=>window.dispatchEvent(new Event(REOPEN_ONBOARDING_EVENT))}>{getOnboardingCopy(i18n.resolvedLanguage||i18n.language).replay} →</button><p className="meta">{getOnboardingCopy(i18n.resolvedLanguage||i18n.language).replayDescription}</p></div>
  <p className="meta">{ready&&isCrewAndroidShell()?t("device.android"):t("device.browser")}</p>
  <p className="meta">{t("device.storage")}</p>
  <p className="meta">{t("device.permissions")}</p>
  <DeviceAndAppPanel/>
 </section>
 <BuildVersion/>
</>;
}
