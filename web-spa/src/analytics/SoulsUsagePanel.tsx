/** All Souls metrics are independent event totals, never a joined user cohort. */
type Row={event:string;count:number};
export const SOULS_USAGE_NAMES:Record<string,string>={
 souls_open:"進入 Souls",souls_photo_ready:"Souls 照片已準備",souls_created:"Souls 角色建立",
 souls_live_attempt:"Souls 開始連線",souls_live_connected:"Souls 連線成功",
 souls_live_failed:"Souls 連線失敗",souls_user_input:"Souls 使用者發話或打字",
 souls_ai_replied:"Souls AI 已回覆",souls_conversation:"Souls 有效雙向對話",
 souls_mask_repaired:"Souls 去背修補"
};
export const SOULS_USAGE_EVENTS=Object.keys(SOULS_USAGE_NAMES);
const steps=[
 {event:"explore_entry_click",label:"探索入口點擊",detail:"souls"},
 {event:"souls_open",label:"開啟 Souls"},
 {event:"souls_photo_ready",label:"照片準備完成"},
 {event:"souls_created",label:"成功儲存角色"},
 {event:"souls_live_attempt",label:"嘗試連線 Live"},
 {event:"souls_live_connected",label:"Live 連線成功"},
 {event:"souls_user_input",label:"使用者發話或打字"},
 {event:"souls_ai_replied",label:"AI 回覆使用者"},
 {event:"souls_conversation",label:"完成有效雙向對話"}
] as const;
export function SoulsUsagePanel({rows,unique}:{rows:Array<Row&{detail?:string}>;unique:(event:string)=>number}){
 const count=(event:string,detail?:string)=>rows.reduce((n,r)=>n+(r.event===event&&(detail===undefined||r.detail===detail)?r.count:0),0);
 const max=Math.max(1,...steps.map(step=>count(step.event,"detail" in step?step.detail:undefined)));
 return <section className="panel section" id="souls-usage">
  <div className="section-head"><h2>Crew Souls 使用情況</h2><small>探索 → 建立 → 真正聊天</small></div>
  <div className="usage-funnel">
   {steps.map((step,i)=>{
    const total=count(step.event,"detail" in step?step.detail:undefined);
    return <div className="usage-funnel-step" key={step.event}>
     <div><span>{i+1}. {step.label}</span><strong>{Math.round(total).toLocaleString("zh-TW")} 次</strong></div>
     <div className="usage-funnel-track"><span style={{width:Math.min(100,total/max*100)+"%"}}/></div>
    </div>;
   })}
  </div>
  <div className="usage-feature-list">
   <div className="usage-feature"><span>建立成功（物品／人物）</span><strong>
    {count("souls_created","object")} ／ {count("souls_created","person")} 次
   </strong></div>
   <div className="usage-feature"><span>語音連線失敗</span><strong>{count("souls_live_failed")} 次</strong></div>
   <div className="usage-feature"><span>去背人工修補套用</span><strong>{count("souls_mask_repaired")} 次</strong></div>
   <div className="usage-feature"><span>開啟 Souls 的匿名瀏覽器</span><strong>{unique("souls_open")} 個</strong></div>
   <div className="usage-feature"><span>完成雙向對話的匿名瀏覽器</span><strong>{unique("souls_conversation")} 個</strong></div>
  </div>
  <p className="usage-explain">事件次數並非同一批使用者的精準轉換率。AI 主動打招呼不算完成對話；連線與真正雙向聊天分開計算。重新連線、再次使用和隱私設定會影響統計；不記錄照片、名字或對話內容。</p>
 </section>;
}
