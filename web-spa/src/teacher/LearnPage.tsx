import {Arrow} from "../components/Arrow";
import{Link}from"react-router-dom";
import{useTranslation}from"react-i18next";
import{Icon,type IconName}from"../components/Icon";
import{ContinueLearningCard}from"./ContinueLearningCard";
import{LearningSnapshot}from"./LearningSnapshot";
import{TodayLearningCard}from"./TodayLearningCard";
import{threeMinuteSpeakingPath}from"./threeMinuteSpeaking";
import{useClientReady}from"../lib/useClientReady";
import{useRouteNamespace}from"../i18n/useRouteNamespace";
import{textCompletedLessons}from"./courseProgress";

const items:Array<{to:string;icon:IconName;key:string}>=[
 {to:"/teacher/board",icon:"mic",key:"board"},
 {to:"/teacher/textbook",icon:"book",key:"textbook"},
 {to:"/teacher/vocabulary",icon:"cards",key:"vocab"},
 {to:"/teacher/course",icon:"scene",key:"course"},
 {to:"/teacher/pronunciation",icon:"mic",key:"pronunciation"},
 {to:"/teacher/reading-library",icon:"book",key:"library"}
];

export function LearnPage(){const {t}=useTranslation("teacher");const {t:tLesson}=useTranslation("lesson");const stringsReady=useRouteNamespace("lesson");const clientReady=useClientReady();const textCount=clientReady?textCompletedLessons():0;return <>
 <section className="hero"><span className="kicker">Learn</span><h1>{t("learn.title")}</h1><p>{t("learn.intro")}</p></section>
 <section className="section"><TodayLearningCard/></section>
 <section className="section"><ContinueLearningCard compact/></section>
 <LearningSnapshot/>
 <section className="section"><Link className="list-item" to={clientReady?threeMinuteSpeakingPath():"/friend/live?id=zoe&intent=speak"}>
  <span className="list-icon"><Icon name="mic"/></span>
  <span className="list-copy"><strong>{t("learn.threeMinute")}</strong><small>{t("learn.threeMinuteDesc")}</small></span>
  <Arrow className="chevron"/>
 </Link></section>
 <section className="section"><div className="section-head"><h2>{t("learn.method")}</h2></div><div className="list">{items.map(x=><Link className="list-item" to={x.to} key={x.to}><span className="list-icon"><Icon name={x.icon}/></span><span className="list-copy"><strong>{t("learn."+x.key)}</strong><small>{t("learn."+x.key+"Desc")}</small>{x.key==="course"&&stringsReady&&textCount>0&&<small className="crew-course-text-count">{tLesson("live.textCourseCount",{count:textCount})}</small>}</span><Arrow className="chevron"/></Link>)}</div></section>
 </>}
