import{Link}from"react-router-dom";
import{useTranslation}from"react-i18next";
import{Icon,type IconName}from"../components/Icon";
import{ContinueLearningCard}from"./ContinueLearningCard";
import{TodayLearningCard}from"./TodayLearningCard";

const items:Array<{to:string;icon:IconName;key:string}>=[
 {to:"/teacher/textbook",icon:"book",key:"textbook"},
 {to:"/teacher/vocabulary",icon:"cards",key:"vocab"},
 {to:"/teacher/course",icon:"scene",key:"course"},
 {to:"/teacher/pronunciation",icon:"mic",key:"pronunciation"},
 {to:"/teacher/reading-library",icon:"book",key:"library"}
];

export function LearnPage(){const {t}=useTranslation("teacher");return <>
 <section className="hero"><span className="kicker">Learn</span><h1>{t("learn.title")}</h1><p>{t("learn.intro")}</p></section>
 <section className="section"><TodayLearningCard/></section>
 <section className="section"><ContinueLearningCard compact/></section>
 <section className="section"><Link className="list-item" to="/friend/live?id=zoe&intent=speak">
  <span className="list-icon"><Icon name="mic"/></span>
  <span className="list-copy"><strong>{t("learn.threeMinute")}</strong><small>{t("learn.threeMinuteDesc")}</small></span>
  <span className="chevron">›</span>
 </Link></section>
 <section className="section"><div className="section-head"><h2>{t("learn.method")}</h2></div><div className="list">{items.map(x=><Link className="list-item" to={x.to} key={x.to}><span className="list-icon"><Icon name={x.icon}/></span><span className="list-copy"><strong>{t("learn."+x.key)}</strong><small>{t("learn."+x.key+"Desc")}</small></span><span className="chevron">›</span></Link>)}</div></section>
 </>}
