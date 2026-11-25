import {total,type Row} from "./usageExport";
export type JourneyCounts={opened:number;clicked:number;started:number;engaged:number;returned:number};
const stages=[
 {key:"opened",label:"開啟網站",hint:"至少開過一個工作階段"},
 {key:"clicked",label:"點擊功能入口",hint:"首頁、探索、Shorts 聊天或試用入口"},
 {key:"started",label:"實際啟動功能",hint:"成功開始對話、遊戲、教材或互動"},
 {key:"engaged",label:"有實際互動",hint:"有效聊天、完成遊戲或其他已記錄行為"},
 {key:"returned",label:"跨日回訪",hint:"曾在不同台灣日期再次使用"}
] as const;
const num=(n:number)=>Math.round(n).toLocaleString("zh-TW");

/** Private usage dashboard only: these independent counts are NOT a joined cohort. */
export function UsageJourneySection({days,journey,rows=[]}:{days:7|30;journey?:JourneyCounts;rows?:Row[]}){
 const maxValue=Math.max(1,...Object.values(journey||{}));
 return <section className="panel section" id="usage-journey">
  <div className="section-head"><h2>匿名使用旅程</h2><small>各階段獨立去重瀏覽器 · 最近 {days} 天</small></div>
  {journey?<div className="usage-funnel usage-journey" role="list" aria-label="匿名使用旅程各階段瀏覽器數">
   {stages.map((stage,i)=>{
    const value=journey[stage.key];
    return <div key={stage.key} className="usage-funnel-step usage-journey-step" role="listitem">
     <div><span>{i+1}. {stage.label}<small>{stage.hint}</small></span><strong>{num(value)} 個瀏覽器</strong></div>
     <div className="usage-funnel-track"><span style={{width:value?Math.max(2,value/maxValue*100)+"%":"0%"}}/></div>
    </div>;
   })}
  </div>:<p className="usage-explain">目前報表尚未提供使用旅程統計，請部署新版 Pages API。</p>}
  <p className="usage-explain">這是各階段分別去重的匿名瀏覽器數，<strong>不是同一批人的精準轉換漏斗或次日留存率</strong>。訪客可能直接進入功能、跳過入口、跨裝置使用，或在觀察期間之前已開始使用，因此後段可能多於前段。新版回訪代表不同台灣日期的事件（舊紀錄仍依 UTC 判定），不代表新訪客隔日必然回來；尊重統計退出設定且不記錄對話內容。</p>
  <div className="section-head"><h2>首頁聊天轉換</h2><small>同一次首頁主按鈕嘗試 · 新版資料</small></div>
  {(["fresh","resume"] as const).map(kind=><div className="usage-funnel usage-journey" key={kind}>
   <strong>{kind==="fresh"?"首次／無聊天紀錄":"曾有雙向聊天紀錄"}</strong>
   {(["pick","verify","reply"] as const).map((stage,i)=>{
    const value=total(rows,"home_friend_journey",kind+"_"+stage);
    const clicked=total(rows,"home_friend_journey",kind+"_pick");
    return <div className="usage-funnel-step" key={stage}><div><span>{i+1}. {["點擊開始聊天","成功連線","首次雙向對話"][i]}</span><strong>{num(value)} 次</strong></div><div className="usage-funnel-track"><span style={{width:clicked?Math.min(100,value/clicked*100)+"%":"0%"}}/></div></div>;
   })}
  </div>)}
  <p className="usage-explain">只追蹤首頁主聊天按鈕後的同一個有效嘗試；其他入口不計入。階段依序、每次最多一次；跨期、匿名統計退出或傳送失敗仍可能造成差異。這是事件次數，不是獨立人數。無舊資料回填。</p>
 </section>;
}
