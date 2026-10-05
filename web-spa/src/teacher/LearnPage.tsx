import{Link}from"react-router-dom";
import{Icon,type IconName}from"../components/Icon";
import{ContinueLearningCard}from"./ContinueLearningCard";

const items:Array<{to:string;icon:IconName;title:string;note:string}>=[
 {to:"/teacher/textbook",icon:"book",title:"教材陪讀",note:"1–4 張教材或照片，AI 備課後逐頁陪讀"},
 {to:"/teacher/vocabulary",icon:"cards",title:"單字練習",note:"到期複習優先 · 自動難度 · 間隔複習"},
 {to:"/teacher/course",icon:"scene",title:"情境課程",note:"3 個 Track · 10 個 Unit · 31 堂 App 同步課程"},
 {to:"/teacher/pronunciation",icon:"mic",title:"朗讀糾音",note:"選文章 · 開口朗讀 · 抓重點糾音 · 再練一次"},
 {to:"/teacher/reading-library",icon:"book",title:"閱讀素材庫",note:"從經典短文挑一篇，再帶進朗讀糾音"}
];

export function LearnPage(){return <>
 <section className="hero"><span className="kicker">Learn</span><h1>學習</h1><p>教材、單字、情境與朗讀都集中在這裡。</p></section>
 <section className="section"><ContinueLearningCard compact/></section>
 <section className="section"><div className="section-head"><h2>選一種學習方式</h2><small>與 App 同步</small></div><div className="list">{items.map(x=><Link className="list-item" to={x.to} key={x.to}><span className="list-icon"><Icon name={x.icon}/></span><span className="list-copy"><strong>{x.title}</strong><small>{x.note}</small></span><span className="chevron">›</span></Link>)}</div></section>
 </>}
