/** New anonymous-browser cohorts, separate from the non-cohort journey. */
export type RetentionSummary={
 d1:{eligible:number;returned:number};
 d7:{eligible:number;returned:number}
};
const num=(value:number)=>Math.round(value).toLocaleString("zh-TW");
const percentage=(returned:number,eligible:number)=>eligible>0
 ?Math.min(100,Math.round(returned/eligible*1000)/10).toFixed(1)+"%":"—";

export function RetentionUsagePanel({retention,returned,engagedReturned,days}:{
 retention?:RetentionSummary;returned:number;engagedReturned:number;days:7|30
}){
 const values=[
  {label:"D1 次日留存",value:retention?.d1,description:"首次造訪隔天再回來"},
  {label:"D7 第七日留存",value:retention?.d7,description:"首次造訪後第 7 個日曆日再回來"}
 ];
 return <section className="panel section" id="usage-retention">
  <div className="section-head"><h2>跨日留存</h2><small>台灣日期 · 最近 {days} 個完整回訪日</small></div>
  <div className="usage-retention-grid">
   {values.map(item=><article className="usage-retention-metric" key={item.label}>
    <span>{item.label}</span>
    <strong>{item.value?percentage(item.value.returned,item.value.eligible):"—"}</strong>
    <small>{item.description}</small>
    <small>{item.value&&item.value.eligible>0?num(item.value.returned)+" / "+num(item.value.eligible)+" 個新匿名瀏覽器":"尚無已成熟的新訪客樣本"}</small>
   </article>)}
   <article className="usage-retention-metric">
    <span>有效回訪</span>
    <strong>{num(engagedReturned)} <small>個</small></strong>
    <small>跨日回來且有聊天、學習、遊戲等有效互動</small>
    <small>跨日回訪 {num(returned)} 個 · 有效比例 {percentage(engagedReturned,returned)}</small>
   </article>
  </div>
  <p className="usage-explain">D1／D7 只追蹤新版上線後首次產生 UUID 的匿名瀏覽器，並以完整台灣日期建立 cohort；不含今日未結束的資料。舊用戶不重新算新訪客，過去資料不回填。有效回訪是不同瀏覽器去重估計，跟 D1／D7 不是同一批 cohort；抽樣、隱私退出與換裝置都可能影響數字。</p>
 </section>;
}
