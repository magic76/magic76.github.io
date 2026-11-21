import {useEffect,useState} from "react";
type AccountStats={total:number;new7:number;new30:number;activeSessions:number;generatedAt:string};
export function AccountStatsPanel(){
 const [data,setData]=useState<AccountStats|null>(null);
 const [error,setError]=useState("");
 useEffect(()=>{
  const controller=new AbortController();
  fetch("/api/usage/report?view=accounts",{credentials:"same-origin",cache:"no-store",signal:controller.signal})
   .then(async response=>{if(!response.ok)throw new Error(response.status===503?"尚未設定 CREW_AUTH_DB 資料庫綁定":"會員統計暫時無法取得（HTTP "+response.status+"）");return response.json() as Promise<AccountStats>})
   .then(result=>{if(!controller.signal.aborted)setData(result)})
   .catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"查詢失敗")});
  return()=>controller.abort();
 },[]);
 return <section className="panel section" aria-label="會員統計">
  <div className="section-head"><h2>Koolo 會員統計</h2><small>Cloudflare D1 · 註冊帳號</small></div>
  {error?<p role="status">{error}</p>:!data?<p role="status">正在讀取會員統計…</p>:
   <div className="usage-feature-list">
    <div className="usage-feature"><span>註冊帳號總數</span><strong>{data.total.toLocaleString("zh-TW")}</strong></div>
    <div className="usage-feature"><span>近 7 天新增</span><strong>{data.new7.toLocaleString("zh-TW")}</strong></div>
    <div className="usage-feature"><span>近 30 天新增</span><strong>{data.new30.toLocaleString("zh-TW")}</strong></div>
    <div className="usage-feature"><span>目前有效登入 Session 的不同帳號</span><strong>{data.activeSessions.toLocaleString("zh-TW")}</strong></div>
   </div>}
  <p className="usage-explain">帳號依 D1 使用者 ID 去重。有效登入 Session 不等於近 7／30 天活躍會員；Google 與 GitHub 若未綁定，可能分別計為兩個帳號。此區僅提供彙總，不顯示會員個資。</p>
 </section>;
}
