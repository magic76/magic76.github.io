import {useEffect,useState} from "react";

type TableStatus={name:string;ready:boolean};
type Diagnostics={database:"ready"|"incomplete"|"unavailable";tables:TableStatus[]};
export function MembershipDiagnosticsPanel(){
 const [data,setData]=useState<Diagnostics|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(false);
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let cancelled=false;
  setLoading(true);setError("");
  void fetch("/api/usage/report?view=membership",{credentials:"same-origin",cache:"no-store"})
   .then(async response=>{
    const body=await response.json() as Diagnostics&{error?:string};
    if(response.status===403)throw Error("Cloudflare Access 管理員驗證未通過");
    if(!body||!Array.isArray(body.tables))throw Error(body.error||"會員資料庫尚未連接");
    return body;
   })
   .then(value=>{if(!cancelled)setData(value)})
   .catch(e=>{if(!cancelled){setData(null);setError(e instanceof Error?e.message:"查詢失敗")}})
   .finally(()=>{if(!cancelled)setLoading(false)});
  return()=>{cancelled=true};
 },[attempt]);
 const count=data?.tables.filter(item=>item.ready).length||0;
 return <section className="panel section" aria-label="會員資料庫檢查">
  <div className="section-head"><h2>會員資料庫檢查</h2><small>管理員限定 · 唯讀</small></div>
  <p className="usage-explain">檢查登入與會員系統的 10 張資料表是否可以讀取，不會修改資料或顯示會員個資。</p>
  <div className="usage-feature-list">
   <div className="usage-feature"><span>資料庫狀態</span><strong>{loading?"檢查中…":error?"無法檢查":data?.database==="ready"?"正常":data?.database==="incomplete"?"尚未完整":"未連接"}</strong></div>
   <div className="usage-feature"><span>通過檢查</span><strong>{data?count+" / "+data.tables.length:"—"}</strong></div>
   {data?.tables.map(item=><div className="usage-feature" key={item.name}><span>{item.name}</span><strong>{item.ready?"正常":"異常"}</strong></div>)}
  </div>
  {error&&<p role="alert">{error}</p>}
  <button type="button" onClick={()=>setAttempt(value=>value+1)} disabled={loading}>重新檢查</button>
 </section>;
}
