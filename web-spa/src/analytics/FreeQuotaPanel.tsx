import {useEffect,useState} from "react";
type Report={day:string;enabled:boolean;textCap:number;voiceCap:number;voiceUsed:number;textUsed:number;guestVoiceUsed:number;memberVoiceUsed:number};
const endpoint="/api/usage/report?view=free-quota";
export function FreeQuotaPanel(){
 const [data,setData]=useState<Report|null>(null),[enabled,setEnabled]=useState(true);
 const [textCap,setTextCap]=useState("1500"),[voiceCap,setVoiceCap]=useState("100");
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 function apply(value:Report){setData(value);setEnabled(value.enabled);setTextCap(String(value.textCap));setVoiceCap(String(value.voiceCap))}
 async function load(){
  setBusy(true);setMessage("");
  try{
   const res=await fetch(endpoint,{credentials:"same-origin",cache:"no-store"});
   if(!res.ok)throw Error("查詢失敗（HTTP "+res.status+"）");
   apply(await res.json());
  }catch(e){setData(null);setMessage(e instanceof Error?e.message:"無法讀取額度")}
  finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[]);
 async function save(){
  if(!data||busy)return;
  if(!window.confirm("確定更新全站免費額度？調低上限可能立即停止今日新請求。"))return;
  setBusy(true);setMessage("");
  try{
   const res=await fetch(endpoint,{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({enabled,textCap:Number(textCap),voiceCap:Number(voiceCap)})});
   if(!res.ok)throw Error("儲存失敗（HTTP "+res.status+"）");
   apply(await res.json());setMessage("已儲存；新免費請求使用新設定。");
  }catch(e){setMessage(e instanceof Error?e.message:"更新失敗")}
  finally{setBusy(false)}
 }
 const valid=Number.isInteger(Number(textCap))&&Number(textCap)>=1&&Number(textCap)<=10000&&Number.isInteger(Number(voiceCap))&&Number(voiceCap)>=1&&Number(voiceCap)<=1000;
 return <section id="free-quota" className="panel section" aria-label="免費額度管理">
  <div className="section-head"><h2>免費額度管理</h2><small>台灣時間每日 00:00 恢復</small></div>
  <p className="usage-explain">訪客每日 12 則文字／1 次五分鐘語音；免費會員每日 50 則文字／3 次五分鐘語音。全站上限包含兩者，不影響自備 Key、已核發憑證或命書。</p>
  {data&&<>
   <div className="usage-feature-list">
    <div className="usage-feature"><span>{data.day} 全站文字</span><strong>{data.textUsed} / {data.textCap} 則</strong></div>
    <div className="usage-feature"><span>全站語音核發（新機制）</span><strong>{data.voiceUsed} / {data.voiceCap} 次</strong></div>
    <div className="usage-feature"><span>訪客／會員語音今日已用（含舊機制）</span><strong>{data.guestVoiceUsed} / {data.memberVoiceUsed} 次</strong></div>
   </div>
   <form onSubmit={e=>{e.preventDefault();void save()}} style={{display:"grid",gap:12,maxWidth:480}}>
    <label><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} disabled={busy}/> 開放全站免費聊天</label>
    <label>全站每日文字上限（則）<input type="number" min="1" max="10000" step="1" value={textCap} onChange={e=>setTextCap(e.target.value)} required disabled={busy}/></label>
    <label>全站每日語音上限（次）<input type="number" min="1" max="1000" step="1" value={voiceCap} onChange={e=>setVoiceCap(e.target.value)} required disabled={busy}/></label>
    <button type="submit" className="btn" disabled={busy||!valid}>儲存設定</button>
   </form>
  </>}
  {message&&<p role="status">{message}</p>}
  <button type="button" className="btn secondary" onClick={()=>void load()} disabled={busy}>{busy?"處理中…":"重新整理"}</button>
  <p className="usage-explain">這是核發／生成次數，不是實際聊天分鐘或金額硬上限。暫停只限制新免費請求；已建立的語音連線仍可使用至原到期時間。</p>
 </section>
}
