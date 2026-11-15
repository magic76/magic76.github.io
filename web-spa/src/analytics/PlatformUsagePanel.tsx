/** First-party Web events segmented by launch surface; never add these to Firebase. */
export type PlatformUsage={platform:"web"|"pwa"|"android_shell";opened:number;active:number;chat:number;returned:number;gamesCompleted:number};
const names:Record<PlatformUsage["platform"],string>={
 web:"一般瀏覽器",pwa:"已安裝 PWA",android_shell:"Android App（WebView）"
};
const metrics=[
 {key:"opened",label:"開啟"},
 {key:"active",label:"有效使用"},
 {key:"chat",label:"完成雙向聊天"},
 {key:"gamesCompleted",label:"完成遊戲"},
 {key:"returned",label:"跨日回訪"}
] as const;
export function PlatformUsagePanel({rows}:{rows?:PlatformUsage[]}){
 const known=new Map((rows||[]).filter(row=>Object.prototype.hasOwnProperty.call(names,row.platform)).map(row=>[row.platform,row]));
 return <section className="panel section usage-platform-section" aria-label="使用平台分布">
  <div className="section-head"><h2>使用平台</h2><small>最近期間 · 匿名瀏覽器去重估計</small></div>
  <div className="usage-platform-grid">
   {(["web","pwa","android_shell"] as const).map(platform=>{
    const row=known.get(platform);
    return <article className="usage-platform-card" key={platform}>
     <h3>{names[platform]}</h3>
     <dl>{metrics.map(metric=><div key={metric.key}><dt>{metric.label}</dt><dd>{row?Math.round(row[metric.key]).toLocaleString("zh-TW"):"—"}</dd></div>)}</dl>
    </article>;
   })}
  </div>
  <p className="usage-explain">僅計入新版追蹤上線後帶有平台標記的事件；舊紀錄不回填，不能拿這些數字直接與上方全期間總數比較。Android App 欄只代表帶有 Crew Android Shell 標記、且成功送出 Web 事件的 WebView；<strong>不包含 Android Firebase 原生事件</strong>。同一瀏覽器可能跨平台使用，各平台不可相加成真人數。跨日回訪不等於次日留存率。</p>
 </section>;
}
