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
