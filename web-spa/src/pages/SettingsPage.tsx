import {useTeacherStore} from "../store/teacherStore";
import{useEffect,useState}from"react";
import{useTranslation}from"react-i18next";
import{LanguageSwitcher}from"../i18n/LanguageSwitcher";
import{personalMemoryEnabled,setPersonalMemoryEnabled}from"../teacher/studentMemory";
import{friendMemoryEnabled,setFriendMemoryEnabled}from"../friends/friendMemory";
import{downloadBackup,importBackup}from"../lib/backup";
import{GeminiConnectionPanel}from"./GeminiConnectionPanel";
import {BuildVersion} from "../components/BuildVersion";
import {Link} from "react-router-dom";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";
import {NATIVE_LANGUAGES} from "../teacher/teacherLocale";
import {DAILY_GOALS,DEFAULT_GOAL_MINUTES,getDailyGoalMinutes,setDailyGoalMinutes} from "../teacher/learningToday";
import {useClientReady} from "../lib/useClientReady";
import {isCrewAndroidShell} from "../lib/platform";
import "./settingsGroups.css";

export function SettingsPage(){
 const {t,i18n}=useTranslation("settings");
 const english=i18n.language.startsWith("en");
 const ready=useClientReady();
 const target=useTeacherStore(s=>s.targetLanguage),setTarget=useTeacherStore(s=>s.setTargetLanguage);
 const native=useTeacherStore(s=>s.nativeLanguage),setNative=useTeacherStore(s=>s.setNativeLanguage);
 const speakingLevel=useTeacherStore(s=>s.learnerSpeakingLevel),setSpeakingLevel=useTeacherStore(s=>s.setLearnerSpeakingLevel);
 const[goal,setGoal]=useState(DEFAULT_GOAL_MINUTES);
 useEffect(()=>{if(ready)setGoal(getDailyGoalMinutes())},[ready]);
 const liveModel=useTeacherStore(s=>s.liveModel),setLiveModel=useTeacherStore(s=>s.setLiveModel);
 const[backupBusy,setBackupBusy]=useState(false),[backupStatus,setBackupStatus]=useState("");
 const[personalMemory,setPersonalMemory]=useState(personalMemoryEnabled),[friendTopicsMemory,setFriendTopicsMemory]=useState(friendMemoryEnabled);
 useEffect(()=>{if(window.location.hash.endsWith("#memory-settings"))document.getElementById("memory-settings")?.scrollIntoView({block:"start"})},[]);
 return <><section className="hero"><span className="kicker">Crew</span><h1>{t("hero.title")}</h1><p>{t("hero.desc")}</p></section>
 <nav className="crew-settings-nav" aria-label={english?"Settings categories":"設定分類"}>
  <a href="#settings-learning">{english?"Learning":"語言與學習"}</a>
  <a href="#settings-voice">{english?"Voice":"聲音與發音"}</a>
  <a href="#settings-data">{english?"Memory":"記憶與資料"}</a>
  <a href="#settings-device">{english?"Device":"App 與裝置"}</a>
 </nav>
 <section id="settings-learning" className="section panel crew-settings-category">
  <div className="section-head"><h2>{english?"Language & learning":"語言與學習"}</h2></div>
  <p className="meta">{english?"These settings apply to your teacher and practice sessions on this device.":"以下設定會套用到這台裝置上的老師與語言練習。"}</p>
  <div className="crew-settings-locale"><strong>{english?"Interface language":"介面語言"}</strong><LanguageSwitcher variant="settings"/></div>
  <div className="crew-settings-fields">
   <label>{english?"Language to learn":"學習語言"}
    <select value={target} onChange={e=>setTarget(e.target.value)}>
     {TARGET_LANGUAGES.map(item=><option key={item.value} value={item.value}>{english?item.spoken:item.value}</option>)}
    </select>
   </label>
   <label>{english?"My native language":"我的母語"}
    <select value={native} onChange={e=>setNative(e.target.value as typeof native)}>
     {NATIVE_LANGUAGES.map(([code,label])=><option key={code} value={code}>{label}</option>)}
    </select>
   </label>
   <label>{english?"Speaking level":"口說程度"}
    <select value={speakingLevel} onChange={e=>setSpeakingLevel(e.target.value as typeof speakingLevel)}>
     <option value="auto">{english?"Automatic":"自動判斷"}</option>
     {(["A1","A2","B1","B2"] as const).map(value=><option value={value} key={value}>{value}</option>)}
    </select>
   </label>
   <label>{english?"Daily speaking goal":"每日口說目標"}
    <select value={goal} disabled={!ready} onChange={e=>{const next=Number(e.target.value);setGoal(next);setDailyGoalMinutes(next)}}>
     {DAILY_GOALS.map(value=><option key={value} value={value}>{value} {english?"min":"分鐘"}</option>)}
    </select>
   </label>
  </div>
  <Link className="crew-settings-quick-link" to="/teacher/learn">{english?"Open learning center":"前往學習中心"} →</Link>
 </section>
 <div id="settings-voice" className="crew-settings-group">
  <header className="crew-settings-group-heading"><h2>{english?"Voice & pronunciation":"聲音與發音"}</h2>
   <p>{english?"Gemini Live is for conversations. Word pronunciation uses your device's speech engine.":"Gemini Live 用於對話；單字發音使用裝置的系統語音，不會連線到 Gemini Live。"}</p>
  </header>
  <GeminiConnectionPanel/>
  <section className="section panel crew-settings-voice-links">
   <h3>{english?"Word pronunciation":"單字英文發音"}</h3>
   <p className="meta">{english?"Choose an on-device English voice, speed, and preview on the vocabulary page.":"在單字練習頁選擇本機英文發音人、速度並試聽。"}</p>
   <Link className="crew-settings-quick-link" to="/teacher/vocabulary">{english?"Open pronunciation settings":"前往單字發音設定"} →</Link>
  </section>

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
 </div>
 <div id="settings-data" className="crew-settings-group">
  <header className="crew-settings-group-heading"><h2>{english?"Memory & data":"記憶與資料"}</h2>
   <p>{english?"Review memory use and records stored in this browser or WebView.":"管理此瀏覽器／WebView 內的記憶與學習資料。"}</p>
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
 <section className="section panel"><div className="section-head"><h2>{t("backup.title")}</h2><small>{t("backup.tagline")}</small></div><p className="meta">{t("backup.intro")}</p><div className="actions"><button className="btn secondary" disabled={backupBusy} onClick={async()=>{setBackupBusy(true);setBackupStatus("");try{const r=await downloadBackup();setBackupStatus(t("backup.exportSuccess",{stories:r.stories,keys:r.keys}))}catch(_){setBackupStatus(t("backup.exportError"))}finally{setBackupBusy(false)}}}>{t("backup.export")}</button><label className={"btn secondary"+(backupBusy?" disabled":"")}>{t("backup.import")}<input type="file" accept=".json,application/json" hidden disabled={backupBusy} onChange={async e=>{const file=e.target.files?.[0];e.currentTarget.value="";if(!file)return;setBackupBusy(true);setBackupStatus("");try{const r=await importBackup(file);setBackupStatus(t("backup.importSuccess",{stories:r.stories,entries:r.entries,skipped:r.skipped}))}catch(err){setBackupStatus(t("backup.importError",{reason:err instanceof Error?err.message:t("backup.importFallback")}))}finally{setBackupBusy(false)}}}/></label></div>{backupStatus&&<p className="meta" role="status">{backupStatus}</p>}<p className="meta">{t("backup.footnote")}</p></section>
 <p className="meta" style={{marginTop:16}}><Link to="/privacy">{english?"Privacy & data preferences":"隱私與資料偏好"} →</Link></p>
 </div>
 <section id="settings-device" className="section panel crew-settings-category">
  <div className="section-head"><h2>{english?"App & device":"App 與裝置"}</h2></div>
  <p className="meta">{ready&&isCrewAndroidShell()
   ?(english?"Crew Android Web Preview: photo inputs can use the device camera or gallery. This does not change audio permissions.":"Crew Android Web 預覽版：拍教材等圖片輸入可使用相機或相簿，不影響語音權限。")
   :(english?"Using Crew in a browser. Camera and gallery access depend on the browser's permissions.":"目前使用瀏覽器版 Crew。相機與相簿能否使用，取決於瀏覽器權限。")}</p>
  <p className="meta">{english
   ?"Learning data and Gemini API keys are currently stored separately by native Android, the app WebView and each browser. They are not automatically synchronized."
   :"原生 Android、App WebView 與各瀏覽器目前各自保存 Gemini Key 和學習紀錄，不會自動同步。切換版本前不會覆蓋舊資料。"}</p>
  <p className="meta">{english
   ?"For camera or microphone problems, check Android Settings → Apps → Crew Teacher → Permissions. Permissions are requested only when needed."
   :"拍照或麥克風不能使用時，請檢查 Android 設定 → 應用程式 → Crew Teacher → 權限；功能使用時才會提出權限要求。"}</p>
 </section>
 <BuildVersion/>
</>;
}
