import type {BriefingItem, LocalReview, ReviewMap, ReviewStatus} from "./types";
const KEY="crew_briefing_review_v1";
export function readReviews():ReviewMap {
 try {const value=JSON.parse(localStorage.getItem(KEY)||"{}");return value && typeof value==="object"&&!Array.isArray(value)?value:{};}catch{return {}}
}
export function updateReview(id:string,patch:Partial<LocalReview>):ReviewMap {
 const before=readReviews();
 const after={...before,[id]:{...before[id],...patch,updatedAt:new Date().toISOString()}};
 try {localStorage.setItem(KEY,JSON.stringify(after));window.dispatchEvent(new Event("crew-briefing-updated"));}catch{/* local mode can still read the report */}
 return after;
}
export function importReviews(json:string):number {
 const data:unknown=JSON.parse(json);
 if(!data||typeof data!=="object"||(data as any).version!==1||typeof (data as any).reviews!=="object"||!(data as any).reviews||Array.isArray((data as any).reviews))throw Error("這不是 Crew Briefing 研究狀態備份。");
 const allowed=new Set(["unread","reading","researching","delegated","adopted","dismissed","finished"]);
 const reviews=readReviews();let count=0;
 for(const [id,v] of Object.entries((data as any).reviews)){
  if(!/^[a-zA-Z0-9_-]{3,100}$/.test(id)||!v||typeof v!=="object"||count>5000)continue;
  const item=v as LocalReview;
  const safe:LocalReview={
   saved:item.saved===true,status:allowed.has(item.status||"")?item.status:"unread",
   notes:typeof item.notes==="string"?item.notes.slice(0,5000):"",
   draft:typeof item.draft==="string"?item.draft.slice(0,10000):"",
   updatedAt:new Date().toISOString()
  };
  reviews[id]={...reviews[id],...safe};count++;
 }
 localStorage.setItem(KEY,JSON.stringify(reviews));
 window.dispatchEvent(new Event("crew-briefing-updated"));return count;
}
export function getStatus(review?:LocalReview):ReviewStatus{return review?.status||"unread";}
export function agentPrompt(item:BriefingItem) {
 return ["你是 Crew 專案的研究 Agent。請先核實以下資料，再評估是否值得實作。不要直接改程式或合併。",
 "研究主題："+item.title,"摘要："+item.summary,"關聯專案："+item.projects.join("、"),"採用原因："+item.relevance,
 "建議研究：",...item.actions.map((a,i)=>`${i+1}. ${a}`),"來源：",...item.sources.map(s=>s.title+" — "+s.url),
 "請先檢查目標 repo 最新程式與現有能力。輸出 evidence、差異、成本、風險、測試方案與可執行的小步驟。不要把推測寫成已完成。"].join("\n");
}
export function socialDraft(item:BriefingItem) {
 return [item.title,"",item.summary,"",item.relevance,
 "","我接下來想驗證的是："+(item.actions[0]||"實作後的實際效果。"),
 "","參考來源：",...item.sources.map(s=>s.url),"","（草稿：發布前請確認來源、加入實測結果並檢查私人資訊）"].join("\n");
}
export function downloadText(filename:string,content:string,format="text/plain;charset=utf-8"){
 const blob=new Blob([content],{type:format});const url=URL.createObjectURL(blob);
 const link=document.createElement("a");link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
