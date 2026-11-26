import {num,total,type Row,type EventUsers} from "./usageExport";

const metrics=[
 {event:"fortune_calculated",label:"命盤計算成功",hint:"八字／塔羅／印度星盤"},
 {event:"fortune_ai_interpreted",label:"AI 解讀成功",hint:"成功取得解讀的事件"},
 {event:"fortune_price_view",label:"八字體驗區塊載入",hint:"歷史與現行方案混合，非獨立價格曝光"},
 {event:"fortune_price_interest",label:"歷史／體驗意願點擊",hint:"含歷史調查，非實際領取或付款"}
] as const;

/** Uses the same existing private aggregate report; no additional tracking or user data. */
export function FortuneUsagePanel({rows,eventUsers}:{rows:Row[];eventUsers:EventUsers[]}){
 const views=total(rows,"fortune_price_view","bazi");
 const interest=total(rows,"fortune_price_interest","bazi");
 const ratio=views>0?(interest/views*100).toFixed(1)+"%":"—";
 const unique=(event:string)=>eventUsers.find(item=>item.event===event)?.users??0;
 const perMode=([["bazi","八字"],["tarot","塔羅"],["vedic","印度星盤"]] as const)
  .map(([id,label])=>({id,label,count:total(rows,"fortune_calculated",id)}));
 const unknown=Math.max(0,total(rows,"fortune_calculated")-perMode.reduce((sum,item)=>sum+item.count,0));
 return <section id="fortune-usage" className="panel section usage-fortune" aria-labelledby="fortune-usage-title">
  <div className="section-head">
   <h2 id="fortune-usage-title">命理與商業轉換</h2>
   <small>與上方期間切換同步 · 匿名事件統計</small>
  </div>
  <div className="usage-fortune-grid">
   {metrics.map(metric=><article key={metric.event} className="usage-fortune-metric">
    <span>{metric.label}</span>
    <strong>{num(total(rows,metric.event))}<small> 次</small></strong>
    <small>{metric.hint}</small>
   </article>)}
  </div>
  <div className="usage-fortune-details">
   <div><strong>命理體驗意願事件比值：{ratio}</strong><span>意願點擊次數 ÷ 價格區塊載入次數（{num(interest)} ÷ {num(views)}）</span></div>
   <div><strong>計算命盤的去重瀏覽器：約 {num(unique("fortune_calculated"))} 個</strong><span>AI 解讀：約 {num(unique("fortune_ai_interpreted"))} 個</span></div>
  </div>
  <p className="usage-fortune-modes">命盤計算分類：{perMode.map(item=>item.label+" "+num(item.count)).join(" · ")}{unknown>0?" · 未分類 "+num(unknown):""}</p>
  <p className="usage-explain">注意：以上為不同事件的期間加總，不是同一批訪客的轉換漏斗。「價格區塊載入」不代表訪客真的滑到該位置；意願點擊並非付款。比值可能受重試、事件缺漏或取樣影響；目前沒有可用的分方案結帳、付款與收入統計；不能用意願事件推算收入。</p>
 </section>;
}
