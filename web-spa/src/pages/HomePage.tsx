import{Link}from"react-router-dom";import{Icon}from"../components/Icon";import{PlayStoreLink}from"../components/PlayStoreLink";import{geminiKey,geminiVerified,history}from"../lib/runtime";

function recentLink(x:any){
 if(x.kind==="teacher")return"/teacher/live?history="+encodeURIComponent(String(x.id));
 if(x.kind==="story"){
  if(x.surface==="reader"&&x.bookId)return"/story/read/"+encodeURIComponent(String(x.bookId))+"?page="+encodeURIComponent(String(Number(x.currentPage)||0));
  return x.id?"/story/live?history="+encodeURIComponent(String(x.id)):"/story";
 }
 if(x.kind==="fortune"&&x.historyId)return"/fortune/reading?history="+encodeURIComponent(String(x.historyId));
 return"/fortune";
}

export function HomePage(){
 const all=["teacher","story","fortune"].flatMap(kind=>history(kind).slice(0,4).map((x:any)=>({...x,kind}))).sort((a:any,b:any)=>new Date(b.ts).getTime()-new Date(a.ts).getTime()).slice(0,6);
 const meta:any={teacher:["Teacher","teacher"],story:["Story","story"],fortune:["Fortune","fortune"]};
 const configured=Boolean(geminiKey()),verified=geminiVerified();
 return <><section className="hero"><span className="kicker">Crew</span><h1>你要做什麼？</h1><p>語言陪讀、說故事、命盤解讀，一個入口搞定。用自己的 Gemini Key，免註冊 Crew 帳號。</p></section>
 {!configured?<Link className="home-key-banner" to="/settings"><span><strong>先花 1 分鐘設定 Gemini Key</strong><small>設定一次，Teacher、Story、Fortune 共用。</small></span><b>開始設定 ›</b></Link>:!verified?<Link className="home-key-banner pending" to="/settings"><span><strong>Gemini Key 尚未驗證</strong><small>測試一次語音連線，確認這個 Key 可以正常使用。</small></span><b>測試連線 ›</b></Link>:null}
 <section className="section"><div className="hub-grid">
  <Link className="hub-card teacher" to="/teacher/practice"><span className="feature-icon"><Icon name="teacher"/></span><h2>Crew Teacher</h2><p>語言學習、教材陪讀與真人感口說練習。</p><span className="hub-go">開始學習 →</span></Link>
  <Link className="hub-card story" to="/story"><span className="feature-icon"><Icon name="story"/></span><h2>Crew Story</h2><p>從照片與靈感建立故事，再和阿奇一起講。</p><span className="hub-go">打開故事 →</span></Link>
  <Link className="hub-card fortune" to="/fortune"><span className="feature-icon"><Icon name="fortune"/></span><h2>Crew Fortune</h2><p>先看固定計算結果，再用白話理解現在的節奏。</p><span className="hub-go">開始探索 →</span></Link>
 </div></section>
 <section className="section"><div className="section-head"><h2>繼續上次</h2><small>保存在這台裝置</small></div><div className="list">{all.length?all.map((x:any,i:number)=>{const m=meta[x.kind];return <Link className="recent-item" to={recentLink(x)} key={(x.ts||i)+x.kind}><span className="list-icon"><Icon name={m[1]}/></span><span><strong>{m[0]} · {x.title||"最近使用"}</strong><small>{x.preview||x.summary||"回到上次進度"}</small></span><span className="chevron">繼續 ›</span></Link>}):<div className="recent-empty"><div><b>從第一件事開始</b><p>還沒有使用紀錄。先選一個你現在最想做的。</p></div><div className="recent-empty-actions"><Link to="/teacher/practice">練語言</Link><Link to="/story">說故事</Link><Link to="/fortune">看命盤</Link></div></div>}</div></section>
 <section className="section android-promo"><div className="section-head"><h2>Android 版</h2><small>想在手機上直接使用時</small></div><div className="play-store-grid"><PlayStoreLink product="teacher"/><PlayStoreLink product="story"/><PlayStoreLink product="fortune"/></div></section></>;
}
