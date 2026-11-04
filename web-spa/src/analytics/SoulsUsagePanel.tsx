/** Souls funnel counts are independent event totals, never a joined user cohort. */
type Row={event:string;count:number};
const steps=[
 {event:"explore_entry_click",label:"探索入口點擊",detail:"souls"},
 {event:"souls_open",label:"開啟 Souls"},
 {event:"souls_photo_ready",label:"照片準備完成"},
 {event:"souls_created",label:"成功儲存角色"},
 {event:"souls_live_connected",label:"語音連線成功"},
 {event:"souls_conversation",label:"完成雙向對話"}
] as const;
export function SoulsUsagePanel({rows,unique}:{rows:Array<Row&{detail?:string}>;unique:(event:string)=>number}){
 const count=(event:string,detail?:string)=>rows.reduce((n,r)=>n+(r.event===event&&(detail===undefined||r.detail===detail)?r.count:0),0);
 const max=Math.max(1,...steps.map(step=>count(step.event,"detail" in step?step.detail:undefined)));
 return <section className="panel section" id="souls-usage">
  <div className="section-head"><h2>Crew Souls 使用情況</h2><small>探索 → 建立 → 語音</small></div>
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
   <div className="usage-feature"><span>Live 連線失敗</span><strong>{count("souls_live_failed")} 次</strong></div>
   <div className="usage-feature"><span>去背人工修補套用</span><strong>{count("souls_mask_repaired")} 次</strong></div>
   <div className="usage-feature"><span>開啟 Souls 的匿名瀏覽器</span><strong>{unique("souls_open")} 個</strong></div>
  </div>
  <p className="usage-explain">這是不同事件的總次數，不是同一批使用者的精準轉換率。重連、收藏回訪與隱私設定都可能影響數字。雙向對話代表使用者與 AI 都有文字回合；不記錄照片、名字或實際對話。</p>
 </section>;
}
