/** Souls usage counts are independent events, not a single-user cohort funnel. */
type Row={event:string;count:number};
export const SOULS_USAGE_NAMES:Record<string,string>={
 souls_open:"進入 Souls",souls_photo_ready:"Souls 照片已準備",souls_created:"Souls 角色建立",
 souls_live_attempt:"Souls 嘗試連線",souls_live_connected:"Souls 連線成功",
 souls_live_failed:"Souls 連線失敗",souls_user_input:"Souls 使用者發話或打字",
 souls_ai_replied:"Souls AI 已回覆",souls_conversation:"Souls 有效雙向對話",
 souls_mask_repaired:"Souls 去背修補"
};
export const SOULS_USAGE_EVENTS=Object.keys(SOULS_USAGE_NAMES);
const stages=[
 {event:"explore_entry_click",label:"探索入口點擊",detail:"souls"},
 {event:"souls_open",label:"開啟 Souls"},
 {event:"souls_photo_ready",label:"照片準備完成"},
 {event:"souls_created",label:"成功儲存角色"},
 {event:"souls_live_attempt",label:"嘗試 Live 連線"},
 {event:"souls_live_connected",label:"Live 連線成功"},
 {event:"souls_user_input",label:"使用者發話或打字"},
 {event:"souls_ai_replied",label:"AI 回覆使用者"},
 {event:"souls_conversation",label:"完成有效雙向對話"}
] as const;
export function SoulsUsagePanel({rows,unique}:{rows:Array<Row&{detail?:string}>;unique:(event:string)=>number}){
 const count=(event:string,detail?:string)=>rows.reduce((n,r)=>n+(r.event===event&&(detail===undefined||r.detail===detail)?r.count:0),0);
 const max=Math.max(1,...stages.map(stage=>count(stage.event,"detail" in stage?stage.detail:undefined)));
 return <section className="panel section" id="souls-usage">
  <div className="section-head"><h2>Crew Souls 使用情況</h2><small>探索 → 建立 → 真正聊天</small></div>
  <div className="usage-funnel">
   {stages.map((stage,i)=>{
    const total=count(stage.event,"detail" in stage?stage.detail:undefined);
    return <div className="usage-funnel-step" key={stage.event}>
     <div><span>{i+1}. {stage.label}</span><strong>{Math.round(total).toLocaleString("zh-TW")} 次</strong></div>
     <div className="usage-funnel-track"><span style={{width:Math.min(100,total/max*100)+"%"}}/></div>
    </div>;
   })}
  </div>
  <div className="usage-feature-list">
   <div className="usage-feature"><span>建立成功（物品／人物）</span><strong>{count("souls_created","object")} ／ {count("souls_created","person")} 次</strong></div>
   <div className="usage-feature"><span>Live 連線失敗</span><strong>{count("souls_live_failed")} 次</strong></div>
   <div className="usage-feature"><span>去背人工修補套用</span><strong>{count("souls_mask_repaired")} 次</strong></div>
   <div className="usage-feature"><span>開啟 Souls 的匿名瀏覽器</span><strong>{unique("souls_open")} 個</strong></div>
   <div className="usage-feature"><span>完成雙向對話的匿名瀏覽器</span><strong>{unique("souls_conversation")} 個</strong></div>
  </div>
  <p className="usage-explain">這是不同事件的總次數，不是同一批使用者的精準轉換率。AI 主動打招呼不算成功對話；只有確認使用者與 AI 同一回合都有文字的對話才計入。重連、收藏回訪與隱私設定都可能影響數字；不記錄照片、名字或實際對話。</p>
 </section>;
}
