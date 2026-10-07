import{Link}from"react-router-dom";
import{Icon,type IconName}from"../components/Icon";
import{ContinueLearningCard}from"./ContinueLearningCard";

const items:Array<{to:string;icon:IconName;title:string;note:string}>=[
 {to:"/teacher/textbook",icon:"book",title:"教材陪讀",note:"拿手邊教材或照片，讓老師直接帶你讀"},
 {to:"/teacher/vocabulary",icon:"cards",title:"單字練習",note:"記住你不熟的字，在適合的時候帶你複習"},
 {to:"/teacher/course",icon:"scene",title:"情境課程",note:"從生活到工作場合，一步步練到能自然開口"},
 {to:"/teacher/pronunciation",icon:"mic",title:"朗讀糾音",note:"開口讀一段，老師抓最值得改善的發音"},
 {to:"/teacher/reading-library",icon:"book",title:"閱讀素材庫",note:"挑一篇短文閱讀，再接著做朗讀練習"}
];

export function LearnPage(){return <>
 <section className="hero"><span className="kicker">Learn</span><h1>學習</h1><p>選一種現在最想練的方式。</p></section>
 <section className="section"><ContinueLearningCard compact/></section>
 <section className="section"><div className="section-head"><h2>學習方式</h2></div><div className="list">{items.map(x=><Link className="list-item" to={x.to} key={x.to}><span className="list-icon"><Icon name={x.icon}/></span><span className="list-copy"><strong>{x.title}</strong><small>{x.note}</small></span><span className="chevron">›</span></Link>)}</div></section>
 </>}
