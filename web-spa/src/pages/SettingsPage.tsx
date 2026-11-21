import {Arrow} from "../components/Arrow";
import {useTeacherStore} from "../store/teacherStore";
import{useEffect,useRef,useState}from"react";
import{useTranslation}from"react-i18next";
import{LanguageSwitcher}from"../i18n/LanguageSwitcher";
import{personalMemoryEnabled,setPersonalMemoryEnabled}from"../teacher/studentMemory";
import{friendMemoryEnabled,setFriendMemoryEnabled}from"../friends/friendMemory";
import{downloadBackup,importBackup}from"../lib/backup";
import{GeminiConnectionPanel}from"./GeminiConnectionPanel";
import {BuildVersion} from "../components/BuildVersion";
import {Link,useLocation,useNavigate} from "react-router-dom";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import {NATIVE_LANGUAGES} from "../teacher/teacherLocale";
import {TeacherPinyinSetting} from "../teacher/TeacherPinyinSetting";
import {DAILY_GOALS,DEFAULT_GOAL_MINUTES,getDailyGoalMinutes,setDailyGoalMinutes} from "../teacher/learningToday";
import {useClientReady} from "../lib/useClientReady";
import {isCrewAndroidShell} from "../lib/platform";
import {probeNativeDeviceCapabilities} from "../lib/deviceCapabilities";
import {getOnboardingCopy} from "../onboarding/copy";
import {REOPEN_ONBOARDING_EVENT} from "../onboarding/OnboardingGate";
import {DeviceAndAppPanel} from "./DeviceAndAppPanel";
import {Icon} from "../components/Icon";
import "./settingsGroups.css";

export function SettingsPage(){
 const {t,i18n}=useTranslation("settings");
 // For unlocalized legacy text, use the explicit English fallback for non-Chinese UI locales.
 const english=!i18n.language.startsWith("zh");
 const ready=useClientReady(),location=useLocation(),{hash}=location,navigate=useNavigate();
 const advancedRef=useRef<HTMLDetailsElement>(null);
 const activeCategory=hash==="#memory-settings"?"settings-data":hash==="#live-model-settings"?"settings-advanced":hash.startsWith("#settings-")?hash.slice(1):"";
 const showOverview=!activeCategory;
 const backToOverview=()=>navigate("/settings");
 const target=useTeacherStore(s=>s.targetLanguage),setTarget=useTeacherStore(s=>s.setTargetLanguage);
 const native=useTeacherStore(s=>s.nativeLanguage),setNative=useTeacherStore(s=>s.setNativeLanguage);
 const pinyinMode=useTeacherStore(s=>s.pronunciationAidMode),setPinyinMode=useTeacherStore(s=>s.setPronunciationAidMode);
 const speakingLevel=useTeacherStore(s=>s.learnerSpeakingLevel),setSpeakingLevel=useTeacherStore(s=>s.setLearnerSpeakingLevel);
 const[goal,setGoal]=useState(DEFAULT_GOAL_MINUTES);
 useEffect(()=>{if(ready)setGoal(getDailyGoalMinutes())},[ready]);
 const liveModel=useTeacherStore(s=>s.liveModel),setLiveModel=useTeacherStore(s=>s.setLiveModel);
 const[backupBusy,setBackupBusy]=useState(false),[backupStatus,setBackupStatus]=useState("");
 const[personalMemory,setPersonalMemory]=useState(personalMemoryEnabled),[friendTopicsMemory,setFriendTopicsMemory]=useState(friendMemoryEnabled);
 const[orbAvailable,setOrbAvailable]=useState(false);
 useEffect(()=>{
  if(!ready||!isCrewAndroidShell())return;
  let mounted=true;
  void probeNativeDeviceCapabilities().then(c=>{
   if(mounted)setOrbAvailable(Boolean(c?.cyberOrb));
  }).catch(()=>{if(mounted)setOrbAvailable(false)});
  return()=>{mounted=false};
 },[ready]);
 useEffect(()=>{
  if(hash==="#settings-gemini"){navigate("/account"+location.search+"#settings-gemini",{replace:true});return}
  const id=hash.slice(1);
  if(!["#settings-learning","#settings-interface","#settings-voice","#settings-data","#memory-settings","#settings-gemini","#settings-device","#settings-advanced","#live-model-settings"].includes(hash))return;
  if(hash==="#settings-advanced"||hash==="#live-model-settings"){
   if(advancedRef.current)advancedRef.current.open=true;
  }
  // Lazy-mounted settings panels may not exist when the browser first handles the hash.
  const frame=window.requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView?.({block:"start"}));
  return()=>window.cancelAnimationFrame(frame);
 },[hash,location.search,navigate]);
 return <div className={"crew-settings-page"+(showOverview?" is-overview":" is-category")}><section className="hero"><span className="kicker">Koolo</span><h1>{t("hero.title")}</h1><p>{t("hero.desc")}</p></section>
  {showOverview&&<section className="section panel"><h2>{t("common:auth.title")}</h2><p className="meta">{t("common:auth.intro")}</p><Link className="btn secondary" to="/account">{t("common:auth.account")}</Link></section>}
 {orbAvailable&&<Link to="/orb" className="crew-settings-orb-entry">
  <span className="crew-settings-orb-icon" aria-hidden="true">◉</span>
  <span className="crew-settings-orb-copy"><strong>{t("cyberOrb.title")}</strong><small>{t("cyberOrb.intro")}</small></span>
  <Arrow className="crew-settings-orb-arrow"/>
 </Link>}
 {showOverview&&<nav className="crew-settings-nav" aria-label={t("group.navAria")}>
  <a href="#settings-interface"><span className="crew-settings-nav-icon"><Icon name="settings"/></span><span className="crew-settings-nav-copy"><strong>{english?"Interface language":"介面語言"}</strong><small>{english?"Change display language":"更改顯示語言"}</small></span><Arrow/></a>
  <a href="#settings-learning"><span className="crew-settings-nav-icon"><Icon name="teacher"/></span><span className="crew-settings-nav-copy"><strong>{t("group.navLearning")}</strong><small>{t("group.learningIntro")}</small></span><Arrow/></a>
  <a href="#settings-voice"><span className="crew-settings-nav-icon"><Icon name="mic"/></span><span className="crew-settings-nav-copy"><strong>{t("group.navVoice")}</strong><small>{t("group.voiceIntro")}</small></span><Arrow/></a>
  <a href="#settings-data"><span className="crew-settings-nav-icon"><Icon name="history"/></span><span className="crew-settings-nav-copy"><strong>{t("group.navMemory")}</strong><small>{t("group.memoryIntro")}</small></span><Arrow/></a>
  <a href="#settings-device"><span className="crew-settings-nav-icon"><Icon name="settings"/></span><span className="crew-settings-nav-copy"><strong>{t("group.navDevice")}</strong><small>{t("device.heading")}</small></span><Arrow/></a>
  <a href="#settings-advanced"><span className="crew-settings-nav-icon"><Icon name="sparkles"/></span><span className="crew-settings-nav-copy"><strong>{t("gemini.advanced")}</strong><small>{t("group.modelHeading")}</small></span><Arrow/></a>
 </nav>}
 {!showOverview&&<button type="button" className="crew-settings-back" onClick={backToOverview}><Arrow direction="left" className="crew-arrow--plain"/> {english?"All settings":"所有設定"}</button>}
 <div className={"crew-settings-content"+(activeCategory?" active-"+activeCategory:"")}>
 <section id="settings-learning" className="section panel crew-settings-category">
  <div className="section-head"><h2>{t("group.learningHeading")}</h2></div>
  <p className="meta">{t("group.learningIntro")}</p>
  <div className="crew-settings-fields">
   <label>{t("group.targetLanguage")}
    <select value={target} onChange={e=>setTarget(e.target.value)}>
     {TARGET_LANGUAGES.map(item=><option key={item.value} value={item.value}>{english?item.spoken:item.value}</option>)}
    </select>
    <small className="crew-settings-field-hint">{english?"Language you want to learn with Koolo Teacher.":"老師教你學習的語言；不會更改 App 介面。"}</small>
   </label>
   <TeacherPinyinSetting targetLanguage={target} value={pinyinMode} onChange={setPinyinMode} english={english} showWhenUnavailable/>
   <label>{t("group.nativeLanguage")}
    <select value={native} onChange={e=>setNative(e.target.value as typeof native)}>
     {NATIVE_LANGUAGES.map(([code,label])=><option key={code} value={code}>{label}</option>)}
    </select>
    <small className="crew-settings-field-hint">{english?"Language used to explain lessons to you.":"老師解說時使用的母語。"}</small>
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
  <Link className="crew-settings-quick-link" to="/learn">{t("group.openLearning")} <Arrow/></Link>
 </section>
 <section id="settings-interface" className="section panel crew-settings-category crew-settings-interface">
  <div className="section-head"><h2>{english?"Interface & appearance":"介面與外觀"}</h2></div>
  <p className="meta">{english?"Change the app display language without changing what you learn.":"只調整 App 顯示語言，不會改變老師的教學語言。"}</p>
  <div className="crew-settings-locale"><LanguageSwitcher variant="settings"/></div>
 </section>
 <div id="settings-voice" className="crew-settings-group">
  <header className="crew-settings-group-heading"><h2>{t("group.voiceHeading")}</h2>
   <p>{t("group.voiceIntro")}</p>
  </header>
  <section className="section panel crew-settings-key-link"><p className="meta">{t("group.keyInAccount")}</p><Link className="crew-settings-quick-link" to="/account#settings-gemini">{t("group.manageAi")} <Arrow/></Link></section>
  <GeminiConnectionPanel section="voice"/>
  <section className="section panel crew-settings-voice-links">
   <h3>{t("group.pronunciationHeading")}</h3>
   <p className="meta">{t("group.pronunciationIntro")}</p>
   <Link className="crew-settings-quick-link" to="/teacher/pronunciation">{english?"Open pronunciation practice":"開啟發音訓練"} <Arrow/></Link>
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
 <p className="meta" style={{marginTop:16}}><Link to="/privacy">{t("device.privacy")} <Arrow/></Link></p>
 </div>
 <section id="settings-device" className="section panel crew-settings-category">
  <div className="section-head"><h2>{t("device.heading")}</h2></div>
  <div className="crew-settings-onboarding-card"><button type="button" className="crew-settings-onboarding-replay" onClick={()=>window.dispatchEvent(new Event(REOPEN_ONBOARDING_EVENT))}>{getOnboardingCopy(i18n.resolvedLanguage||i18n.language).replay} <Arrow/></button><p className="meta">{getOnboardingCopy(i18n.resolvedLanguage||i18n.language).replayDescription}</p></div>
  <p className="meta">{ready&&isCrewAndroidShell()?t("device.android"):t("device.browser")}</p>
  <p className="meta">{t("device.storage")}</p>
  <p className="meta">{t("device.permissions")}</p>
  <DeviceAndAppPanel/>
 </section>

 <details id="settings-advanced" className="crew-settings-advanced" ref={advancedRef}>
  <summary className="crew-settings-advanced-summary"><span><strong>{t("gemini.advanced")}</strong><small>{t("group.modelHeading")}</small></span><Arrow direction="down" className="crew-arrow--plain"/></summary>
  <div className="crew-settings-advanced-content">
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
 </details>
 </div>
 {showOverview&&<BuildVersion/>}
</div>;
}
