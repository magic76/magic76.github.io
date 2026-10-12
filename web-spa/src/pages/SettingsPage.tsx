import{useEffect,useState}from"react";
import{personalMemoryEnabled,setPersonalMemoryEnabled}from"../teacher/studentMemory";
import{friendMemoryEnabled,setFriendMemoryEnabled}from"../friends/friendMemory";
import{downloadBackup,importBackup}from"../lib/backup";
import{GeminiConnectionPanel}from"./GeminiConnectionPanel";

export function SettingsPage(){
 const[backupBusy,setBackupBusy]=useState(false),[backupStatus,setBackupStatus]=useState("");
 const[personalMemory,setPersonalMemory]=useState(personalMemoryEnabled),[friendTopicsMemory,setFriendTopicsMemory]=useState(friendMemoryEnabled);
 useEffect(()=>{if(window.location.hash.endsWith("#memory-settings"))document.getElementById("memory-settings")?.scrollIntoView({block:"start"})},[]);
 return <><section className="hero"><span className="kicker">Crew</span><h1>設定</h1><p>Gemini Key、語音體驗與資料備份，都在這裡統一管理。Teacher、Story、Fortune 共用同一組 Key。</p></section>
 <GeminiConnectionPanel/>
 <section id="memory-settings" className="section panel settings-memory-panel">
  <div className="section-head"><h2>記憶</h2><small>預設開啟 · 隨時可關</small></div>
  <p className="meta">Crew 老師和 Crew 朋友會依你的對話延續記憶。資料保存在這台瀏覽器；後續對話可能將相關內容提供給 Gemini。關閉只停止新增與使用記憶，不會直接刪除已保存的資料。</p>
  <label className="row" style={{gap:12,alignItems:"flex-start",marginTop:16}}>
   <input type="checkbox" checked={personalMemory} onChange={e=>{const value=e.target.checked;setPersonalMemoryEnabled(value);setPersonalMemory(value)}}/>
   <span><strong>個人化記憶</strong><small className="meta" style={{display:"block",marginTop:4}}>記住學習目標、興趣與偏好，供 Crew 老師與朋友參考。</small></span>
  </label>
  <label className="row" style={{gap:12,alignItems:"flex-start",marginTop:14}}>
   <input type="checkbox" checked={friendTopicsMemory} onChange={e=>{const value=e.target.checked;setFriendMemoryEnabled(value);setFriendTopicsMemory(value)}}/>
   <span><strong>Crew 朋友的共同話題</strong><small className="meta" style={{display:"block",marginTop:4}}>每位朋友、每種學習語言分開記錄；關閉後不再整理或帶入話題。</small></span>
  </label>
  <p className="meta" style={{marginTop:14}}>以前手動關閉的設定不會被重新開啟。已有記憶可在「老師對我的了解」或每位朋友的「共同回憶」管理與刪除。</p>
 </section>
 <section className="section panel"><div className="section-head"><h2>資料備份</h2><small>僅此瀏覽器</small></div><p className="meta">下載故事、學習進度與命盤紀錄，方便換裝置或清除瀏覽器前備份。備份包含個人內容，請妥善保管；不包含 Gemini API Key。</p><div className="actions"><button className="btn secondary" disabled={backupBusy} onClick={async()=>{setBackupBusy(true);setBackupStatus("");try{const r=await downloadBackup();setBackupStatus("備份已建立："+r.stories+" 本故事，"+r.keys+" 項本機資料。")}catch(_){setBackupStatus("備份失敗，請檢查瀏覽器儲存空間後重試。")}finally{setBackupBusy(false)}}}>匯出備份</button><label className={"btn secondary"+(backupBusy?" disabled":"")}>匯入備份<input type="file" accept=".json,application/json" hidden disabled={backupBusy} onChange={async e=>{const file=e.target.files?.[0];e.currentTarget.value="";if(!file)return;setBackupBusy(true);setBackupStatus("");try{const r=await importBackup(file);setBackupStatus("已匯入 "+r.stories+" 本故事、"+r.entries+" 項資料，略過 "+r.skipped+" 項既有紀錄。重新整理後會更新畫面。")}catch(err){setBackupStatus("匯入失敗："+(err instanceof Error?err.message:"請確認備份檔案。"))}finally{setBackupBusy(false)}}}/></label></div>{backupStatus&&<p className="meta" role="status">{backupStatus}</p>}<p className="meta">匯入只補上尚不存在的資料，不會覆蓋現有故事或 Key。</p></section>
</>;
}
