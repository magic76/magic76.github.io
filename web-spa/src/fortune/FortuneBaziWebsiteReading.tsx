import {Link} from "react-router-dom";
import {buildBaziWebsiteReading} from "./baziWebsiteReading";
import {buildFortuneCardModel} from "./fortuneCardModel";
import {premiumHref} from "./premiumStore";
import type {FortuneReading} from "./types";
import "./fortunePremium.css";

const themes=[
 {id:"personality",desc:["認識自己的性格、天賦與盲點","Personality, strengths and blind spots"],tone:"#e4eee3",ink:"#38634d",path:"M12 21a9 9 0 1 0-9-9M6 12a6 6 0 0 1 12 0c0 5-3 9-4 10M9 12a3 3 0 0 1 6 0c0 4-2 7-3 8M12 12c0 3-1 5-2 7"},
 {id:"career",desc:["工作方向與長期發展","Work and long-term direction"],tone:"#e5eaf4",ink:"#45618a",path:"M4 8h16v12H4zM9 8V5h6v3M4 13h16M10 12v3h4v-3"},
 {id:"wealth",desc:["資源累積與機會取捨","Resources and opportunities"],tone:"#f2e8d4",ink:"#8b692d",path:"M4 7h14a2 2 0 0 1 2 2v10H4zM4 7l12-3v3M20 12h-5v4h5M17 14h.1"},
 {id:"love",desc:["感情需求與相處模式","Relationship needs and patterns"],tone:"#f5e5e9",ink:"#a05c70",path:"M12 20 4.8 13a5 5 0 0 1 7.2-7l.0.1a5 5 0 0 1 7.2 6.9z"},
 {id:"people",desc:["人際互動與家庭角色","People and family roles"],tone:"#ece6f1",ink:"#775e91",path:"M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 20v-2a6 6 0 0 1 12 0v2M4 6a3 3 0 0 0 0 6M20 6a3 3 0 0 1 0 6M2 20v-2a4 4 0 0 1 3-4M22 20v-2a4 4 0 0 0-3-4"},
 {id:"life",desc:["大運與人生階段的變化","Life phases and cycles"],tone:"#e2eeeb",ink:"#3c7773",path:"M5 19c2-4 4-4 7-7s4-6 7-7M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM19 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"},
 {id:"years",desc:["未來五年的逐年主題","Five individual annual themes"],tone:"#f3e9dc",ink:"#946a36",path:"M4 6h16v14H4zM8 3v6M16 3v6M4 11h16M8 15h2M14 15h2"},
 {id:"advice",desc:["適合自己的生活方向","A personal action guide"],tone:"#e7ebdc",ink:"#687b45",path:"M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM16 8l-2 6-6 2 2-6z"}
] as const;
function ThemeIcon({index}:{index:number}){const theme=themes[index];return <span className="fortune-premium-icon" style={{background:theme.tone,color:theme.ink}}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={theme.path}/></svg></span>}
export function FortuneBaziWebsiteReading({reading,locale,chapter,justUnlocked=false}:{reading:FortuneReading;locale:string;chapter:string|null;justUnlocked?:boolean}){
 const zh=/^zh(?:-|$)/i.test(locale),c=(z:string,e:string)=>zh?z:e,pick=(p:readonly [string,string])=>p[zh?0:1];
 const {topics,cycles,years,current}=buildBaziWebsiteReading(reading.result,new Date().getFullYear());
 const card=buildFortuneCardModel("bazi",reading.result,locale);
 const selected=topics.findIndex(t=>t.id===chapter),active=topics[selected];
 const url=(id?:string)=>premiumHref(reading.id,id);
 return <div className="fortune-premium" data-unlocked-animation={justUnlocked&&!active?"true":"false"}>
 <nav className="fortune-premium-breadcrumb" aria-label={c("閱讀導覽","Reading navigation")}>
 <Link to={active?url():"/fortune/reading?history="+encodeURIComponent(reading.id)}>← {active?c("人生解析總覽","Reading overview"):c("返回原命盤","Back to chart")}</Link>
 <Link to={premiumHref()}>{c("我的人生解析","My life readings")}</Link>
 </nav>
 {!active?<><header className="fortune-premium-cover">
 <div className="fortune-premium-cover-copy"><span className="fortune-premium-kicker">KOOLO FORTUNE · PREMIUM</span>
 <span className="fortune-premium-unlocked"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0M12 14v3"/></svg>{c("已解鎖 · 免費體驗","Unlocked · Free trial")}</span>
 <h1 tabIndex={-1} data-premium-focus>{c("你的專屬人生解析","Your personal life reading")}</h1>
 <h2>{card.title}</h2><p>{card.tagline}</p>
 </div>
 {card.artSrc&&<img className="fortune-premium-art" src={card.artSrc} alt="" onError={e=>{e.currentTarget.hidden=true}}/>}
 <div className="fortune-premium-stats">{[[String(topics.length),c("人生主題","Life topics")],[String(topics.reduce((n,t)=>n+t.sections.length,0)),c("深度解析","Insights")],[String(years.length),c("年逐年探索","Years explored")]].map(([n,label])=><div key={label}><strong>{n}</strong><span>{label}</span></div>)}</div>
 </header>
 <section className="fortune-premium-contents"><div className="fortune-premium-section-head"><div><span className="fortune-premium-label">{c("你的專屬報告","Your personal report")}</span><h2>{c("探索你的人生","Explore your life")}</h2></div><small>{c("自由選擇閱讀順序","Read in any order")}</small></div>
 <div className="fortune-premium-grid">{topics.map((t,i)=><Link className="fortune-premium-topic" key={t.id} to={url(t.id)}><div className="fortune-premium-topic-top"><ThemeIcon index={i}/><span>{String(i+1).padStart(2,"0")} <span aria-hidden="true">→</span></span></div><h3>{pick(t.title)}</h3><p>{pick(themes[i].desc)}</p></Link>)}</div>
 </section>
 {cycles.length>0&&<section className="fortune-premium-panel"><div className="fortune-premium-section-head"><div><span className="fortune-premium-label">{c("人生的節奏","Your life rhythm")}</span><h2>{c("你的人生時間軸","Your life timeline")}</h2></div><Link to={url("life")}>{c("完整時間軸","Full timeline")} →</Link></div><div className="fortune-premium-timeline">{cycles.slice(Math.max(0,cycles.findIndex(x=>x.startYear===current?.startYear)-1),Math.max(0,cycles.findIndex(x=>x.startYear===current?.startYear)-1)+4).map(x=><div key={x.startYear} data-current={current?.startYear===x.startYear}><span className="fortune-premium-dot"/><div><strong>{x.startYear}–{x.endYear}</strong><small>{x.ganZhi}{current?.startYear===x.startYear?" · "+c("目前階段","Current phase"):""}</small></div></div>)}</div></section>}
 <Link className="fortune-premium-primary" to={url(topics[0].id)}>{c("從第一章開始閱讀","Start reading chapter one")} <span aria-hidden="true">→</span></Link>
 </>:<><header className="fortune-premium-chapter-head"><ThemeIcon index={selected}/><div><span className="fortune-premium-kicker">{c("專屬人生解析","PERSONAL LIFE READING")} · {String(selected+1).padStart(2,"0")} / {topics.length}</span><h1 tabIndex={-1} data-premium-focus>{pick(active.title)}</h1><p>{pick(themes[selected].desc)}</p></div></header>
 <article className="fortune-premium-panel fortune-premium-article" aria-label={pick(active.title)}>{active.sections.map((s,i)=><section key={i}><span className="fortune-premium-label">{String(i+1).padStart(2,"0")}</span><h2>{pick(s.title)}</h2><p>{pick(s.body)}</p></section>)}
 {active.id==="life"&&<div className="fortune-premium-timeline fortune-website-timeline">{cycles.map(x=><div key={x.startYear} data-current={current?.startYear===x.startYear}><span className="fortune-premium-dot"/><div><strong>{x.startYear}–{x.endYear}</strong><small>{x.ganZhi}{current?.startYear===x.startYear?" · "+c("目前階段","Current phase"):""}</small></div></div>)}{!cycles.length&&<p>{c("尚無大運資料","No cycle data")}</p>}</div>}
 {active.id==="years"&&<div className="fortune-premium-years">{years.map(y=><section key={y.year}><h3>{y.year} · {y.ganZhi}</h3>{y.available&&<small>{pick(y.theme)} · {c("大運","Cycle")} {y.cycle}</small>}<p>{pick(y.body)}</p></section>)}</div>}
 </article><nav className="fortune-premium-pagination" aria-label={c("章節切換","Chapter navigation")}>{selected>0?<Link to={url(topics[selected-1].id)}>← {c("上一章","Previous")}</Link>:<Link to={url()}>← {c("總覽","Overview")}</Link>}<Link to={url()}>{selected+1} / {topics.length}</Link>{selected<topics.length-1?<Link to={url(topics[selected+1].id)}>{c("下一章","Next")} →</Link>:<Link to={url()}>{c("完成閱讀","Finish")} →</Link>}</nav></>}
 <p className="fortune-premium-note">{c("依個人命盤計算資料整理的傳統象徵解讀，不代表確定的人生結果。免費體驗紀錄保存在此瀏覽器，不是付費購買紀錄。","Traditional symbolic interpretations based on your calculated chart, not guaranteed outcomes. Free trial access is saved in this browser and is not a paid purchase.")}</p>
 </div>
}
