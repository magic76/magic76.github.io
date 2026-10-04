import{Link}from"react-router-dom";import{Icon}from"../components/Icon";import{history}from"../lib/runtime";
export function HomePage(){
 const all=["teacher","story","fortune"].flatMap(kind=>history(kind).slice(0,4).map((x:any)=>({...x,kind}))).sort((a:any,b:any)=>new Date(b.ts).getTime()-new Date(a.ts).getTime()).slice(0,6);
 const meta:any={teacher:["Teacher","teacher","/teacher/practice"],story:["Story","story","/story"],fortune:["Fortune","fortune","/fortune"]};
 return <><section className="hero"><span className="kicker">Crew</span><h1>你要做什麼？</h1><p>Teacher、Story、Fortune 都在同一個 Web App 裡，切換不再重新載入不同頁面。</p></section>
 <section className="section"><div className="hub-grid">
  <Link className="hub-card teacher" to="/teacher/practice"><span className="feature-icon"><Icon name="teacher"/></span><h2>Crew Teacher</h2><p>語言學習、教材陪讀與真人感口說練習。</p><span className="hub-go">開始學習 →</span></Link>
  <Link className="hub-card story" to="/story"><span className="feature-icon"><Icon name="story"/></span><h2>Crew Story</h2><p>從照片與靈感建立故事，再和阿奇一起講。</p><span className="hub-go">打開故事 →</span></Link>
  <Link className="hub-card fortune" to="/fortune"><span className="feature-icon"><Icon name="fortune"/></span><h2>Crew Fortune</h2><p>固定算法先算，再做白話解讀與追問。</p><span className="hub-go">開始探索 →</span></Link>
 </div></section>
 <section className="section"><div className="section-head"><h2>最近使用</h2><small>保存在這台裝置</small></div><div className="list">{all.length?all.map((x:any,i:number)=>{const m=meta[x.kind];return <Link className="recent-item" to={m[2]} key={(x.ts||i)+x.kind}><span className="list-icon"><Icon name={m[1]}/></span><span><strong>{m[0]} · {x.title||"最近使用"}</strong><small>{x.preview||x.summary||""}</small></span><span className="chevron">›</span></Link>}):<div className="notice"><div><b>還沒有使用紀錄</b><p>完成一次學習、故事或解讀後會出現在這裡。</p></div></div>}</div></section></>;
}
