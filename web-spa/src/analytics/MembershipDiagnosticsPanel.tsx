import {useEffect,useState} from "react";

type MemberInfo={authenticated?:boolean;plan?:string;status?:string;currentPeriodEnd?:number|null;limits?:{voiceSeconds?:number};error?:string};
export function MembershipDiagnosticsPanel(){
 const [member,setMember]=useState<MemberInfo|null>(null);
 const [memberStatus,setMemberStatus]=useState<number|null>(null);
 const [memberError,setMemberError]=useState("");
 const [memberLoading,setMemberLoading]=useState(false);
 const [memberAttempt,setMemberAttempt]=useState(0);
 useEffect(()=>{
  let cancelled=false;setMemberLoading(true);setMemberError("");
  void fetch("/api/membership",{credentials:"same-origin",cache:"no-store"})
   .then(async response=>{
    const type=response.headers.get("content-type")||"";
    if(!type.includes("application/json"))throw Error("會員 API 沒有回傳 JSON，請檢查部署與路由");
    const body=await response.json() as MemberInfo;
    if(!cancelled){setMemberStatus(response.status);setMember(body)}
   }).catch(e=>{if(!cancelled){setMember(null);setMemberStatus(null);setMemberError(e instanceof Error?e.message:"會員 API 無法連線")}})
   .finally(()=>{if(!cancelled)setMemberLoading(false)});
  return()=>{cancelled=true};
 },[memberAttempt]);
 return <section className="panel section" aria-label="會員測試中心">
  <div className="section-head"><h2>會員測試中心</h2><small>目前瀏覽器 · 唯讀</small></div>
  <p className="usage-explain">這裡使用目前瀏覽器的 Koolo 登入 Cookie 查詢會員 API。Cloudflare Access 管理員登入不等於 Koolo 會員登入。這個測試不會變更方案、扣額或建立付款。</p>
  <div className="usage-feature-list">
   <div className="usage-feature"><span>會員 API</span><strong>{memberLoading?"檢查中…":memberStatus===200?"正常（200）":memberStatus===401?"未登入（401）":memberStatus?"HTTP "+memberStatus:"無法連線"}</strong></div>
   <div className="usage-feature"><span>Koolo 登入狀態</span><strong>{member?.authenticated?"已登入":memberStatus===401?"未登入":"—"}</strong></div>
   <div className="usage-feature"><span>目前方案</span><strong>{member?.authenticated?member.plan||"—":"—"}</strong></div>
   <div className="usage-feature"><span>會員權限狀態</span><strong>{member?.authenticated?member.status||"—":"—"}</strong></div>
   <div className="usage-feature"><span>方案到期日</span><strong>{member?.currentPeriodEnd?new Date(member.currentPeriodEnd*1000).toLocaleString("zh-TW"):"—"}</strong></div>
   <div className="usage-feature"><span>語音方案額度</span><strong>{member?.limits&&typeof member.limits.voiceSeconds==="number"?member.limits.voiceSeconds+" 秒":"—"}</strong></div>
  </div>
  {memberError&&<p role="alert">{memberError}</p>}
  {memberStatus===401&&<p className="usage-explain">這是正常的未登入結果。請先在同一個網域登入 Koolo，再按「重新測試會員 API」。</p>}
  {member?.authenticated&&<p className="usage-explain">目前 API 只提供會員方案投影；實際語音用量、訂閱付款驗證與扣額尚未啟用。額度 0 秒代表尚未開放付費語音權限，不代表已使用完畢。</p>}
  <button type="button" onClick={()=>setMemberAttempt(value=>value+1)} disabled={memberLoading}>重新測試會員 API</button>

 </section>;
}
