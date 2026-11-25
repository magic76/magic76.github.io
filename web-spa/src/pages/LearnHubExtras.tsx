import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Icon,type IconName} from "../components/Icon";
import {useRouteNamespace} from "../i18n/useRouteNamespace";

type Tool={to:string;title:string;desc:string;icon:IconName};
export function LearnHubExtras({tools,speakingPath}:{tools:Tool[];speakingPath:string}){
 const {t}=useTranslation("lesson");
 const {t:tTeacher}=useTranslation("teacher");
 const ready=useRouteNamespace("lesson");
 if(!ready)return null;
 return <section className="crew-learn-tools" aria-label={tTeacher("learn.method")}>
  <Link className="crew-section-card crew-learn-scenario" to="/teacher/course">
   <span className="crew-section-card-icon"><Icon name="scene"/></span>
   <span className="crew-section-card-copy"><strong>{tTeacher("learn.course")}</strong><small>{tTeacher("learn.courseDesc")}</small></span>
  </Link>
  <div className="crew-section-grid crew-learn-tool-grid">
   {tools.map(tool=><Link className="crew-section-card crew-learn-tool" key={tool.to} to={tool.to}>
    <span className="crew-section-card-icon"><Icon name={tool.icon}/></span>
    <span className="crew-section-card-copy"><strong>{tool.title}</strong><small>{tool.desc}</small></span>
   </Link>)}
  </div>
  <nav className="crew-learn-secondary-links" aria-label={t("learnToday.more")}>
   <Link to={speakingPath}><Icon name="mic"/><span>{t("learnToday.threeMinute")}</span></Link>
   <Link to="/teacher/reading-library"><Icon name="book"/><span>{tTeacher("learn.library")}</span></Link>
   <Link to="/teacher/reports"><Icon name="history"/><span>{t("learnToday.records")}</span></Link>
   <Link to="/settings#settings-learning"><Icon name="settings"/><span>{t("learnToday.settings")}</span></Link>
  </nav>
 </section>;
}
